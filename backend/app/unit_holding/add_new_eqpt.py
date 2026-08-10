"""Add New Eqpt — Weapon → Unit Holding using Native SQL."""

from __future__ import annotations

import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.principal import Principal
from app.deps import get_db_session, require_unit_or_admin
from app.db.native_utils import execute_sql, fetch_all, fetch_one, get_opstatus_code_value
from app.utils.ids import next_int_id

router = APIRouter(
    prefix="/unit-holding/add-new-eqpt",
    tags=["unit-holding: add new eqpt"],
)

_TFR_STATUS_PENDING = "PTFR"
_SERVICE_STATUS_DEFAULT = "1"

_UNIT_HOLDING_LABEL = "UNIT HOLDING"
_OTH_HOLDING_LABELS = frozenset({"SECTOR STORE", "LOAN STORE", "ACSFP STORE"})

_EQPT_REGN_RE = re.compile(r"^T\d{5}\d{6}(\d{4})$", re.IGNORECASE)
_REGN_SEQ_RE = re.compile(r"^(.+?)N(\d{8})$", re.IGNORECASE)


class OptionOut(BaseModel):
    value: str
    label: str


class OrbatUnitOut(BaseModel):
    id: str | int
    unit_name: str
    sus_no: str
    form_code: str | None = None
    status: str


class PrfGroupOut(BaseModel):
    prf_group: str


class CensusItemOut(BaseModel):
    census_no: str
    nomenclature: str | None = None
    prf_group: str | None = None
    prf_code: str | None = None
    material_no: str | None = None


class GeneratedItemOut(BaseModel):
    issuing_depot_name: str
    to_unit_name: str
    prf_group: str
    prf_code: str
    sus_no: str
    census_no: str
    material_no: str
    eqpt_regn_no: str
    regn_seq_no: str
    census_seq_no: int
    issued_qty: int = 1


class BuildItemsIn(BaseModel):
    iv_no: str = Field(..., min_length=1, max_length=25)
    iv_date: date
    issuing_depot_sus: str = Field(..., min_length=1, max_length=50)
    to_unit_sus: str = Field(..., min_length=1, max_length=50)
    type_of_hldg: str = Field(..., min_length=1, max_length=15)
    type_of_eqpt: str = Field(..., min_length=1, max_length=3)
    prf_group: str = Field(..., min_length=1, max_length=150)
    prf_code: str = Field(..., min_length=1, max_length=8)
    census_no: str = Field(..., min_length=1, max_length=9)
    material_no: str = Field("", max_length=50)
    issued_qty: int = Field(..., ge=1, le=9999)
    pending_eqpt_regn_nos: list[str] = Field(default_factory=list)
    pending_regn_seq_nos: list[str] = Field(default_factory=list)
    pending_census_seq_nos: list[int] = Field(default_factory=list)


class SubmitItemIn(BaseModel):
    eqpt_regn_no: str = Field(..., min_length=1, max_length=25)
    regn_seq_no: str = Field(..., min_length=1, max_length=20)
    census_seq_no: int = Field(..., ge=1)
    census_no: str = Field(..., min_length=1, max_length=9)
    material_no: str | None = None
    prf_code: str = Field(..., min_length=1, max_length=8)
    prf_group: str | None = None


class SubmitIn(BaseModel):
    iv_no: str = Field(..., min_length=1, max_length=25)
    iv_date: date
    issuing_depot_sus: str = Field(..., min_length=1, max_length=50)
    to_unit_sus: str = Field(..., min_length=1, max_length=50)
    type_of_hldg: str = Field(..., min_length=1, max_length=15)
    type_of_eqpt: str = Field(..., min_length=1, max_length=3)
    depres_dur_year: str | None = None
    upload_iv: str | None = Field(None, max_length=100)
    items: list[SubmitItemIn] = Field(..., min_length=1)


class SubmitOut(BaseModel):
    ids: list[str | int]
    count: int
    target_table: str


def _option_list(
    session: Session, domain: str, version_nos: tuple[str, ...] | None = None
) -> list[OptionOut]:
    sql = """
        SELECT code_value, label_name
        FROM MMS_DOMAIN_VALUES
        WHERE REPLACE(UPPER(domain_name), '_', '') = :dname
    """
    params: dict = {"dname": domain.replace("_", "").upper()}
    if version_nos:
        in_clause = ", ".join(f":v_{i}" for i in range(len(version_nos)))
        sql += f" AND TRIM(version_no) IN ({in_clause})"
        for i, v in enumerate(version_nos):
            params[f"v_{i}"] = v.strip()

    sql += " ORDER BY LPAD(NVL(disp_order, '9999'), 10, '0'), label_name"
    rows = fetch_all(session, sql, params)
    return [
        OptionOut(value=str(r.get("code_value") or ""), label=str(r.get("label_name") or r.get("code_value") or ""))
        for r in rows
        if r.get("code_value")
    ]


def _domain_label(
    session: Session, domain: str, code: str, version_nos: tuple[str, ...] | None = None
) -> str | None:
    sql = """
        SELECT code_value, label_name
        FROM MMS_DOMAIN_VALUES
        WHERE REPLACE(UPPER(domain_name), '_', '') = :dname
        AND UPPER(TRIM(code_value)) = :code
    """
    params: dict = {"dname": domain.replace("_", "").upper(), "code": code.strip().upper()}
    if version_nos:
        in_clause = ", ".join(f":v_{i}" for i in range(len(version_nos)))
        sql += f" AND TRIM(version_no) IN ({in_clause})"
        for i, v in enumerate(version_nos):
            params[f"v_{i}"] = v.strip()

    row = fetch_one(session, sql, params)
    if row is None:
        return None
    return str(row.get("label_name") or row.get("code_value") or "").strip()


def _holding_bucket(session: Session, type_of_hldg_code: str) -> str:
    label = (_domain_label(session, "TYPE_OF_HOLDING", type_of_hldg_code) or "").upper()
    if label == _UNIT_HOLDING_LABEL:
        return "unit"
    if label in _OTH_HOLDING_LABELS:
        return "oth"
    return "depot"


def _table_for_bucket(bucket: str) -> str:
    if bucket == "unit":
        return "MMS_UNIT_MSTR_DETL"
    if bucket == "oth":
        return "MMS_OTH_MASTER"
    return "MMS_DEPOT_MASTER"


def _orbat_by_sus(session: Session, sus_no: str) -> dict | None:
    return fetch_one(
        session,
        "SELECT id, unit_name, sus_no, form_code, status FROM MMS_ORBAT_UNIT_DETL WHERE UPPER(sus_no) = :sus AND UPPER(status) = 'ACTIVE'",
        {"sus": sus_no.strip().upper()},
    )


def _max_eqpt_regn_seq(
    session: Session,
    table_name: str,
    iv_date: date,
    pending: list[str],
) -> int:
    date_str = iv_date.strftime("%d%m%y")
    pattern = re.compile(rf"^T\d{{5}}{date_str}(\d{{4}})$", re.IGNORECASE)
    rows = fetch_all(session, f"SELECT eqpt_regn_no FROM {table_name} WHERE eqpt_regn_no IS NOT NULL")
    values = [r["eqpt_regn_no"] for r in rows if r.get("eqpt_regn_no")]
    values.extend(pending)
    highest = 0
    for raw in values:
        if not raw:
            continue
        m = pattern.match(str(raw).strip())
        if m:
            highest = max(highest, int(m.group(1)))
    return highest


def _max_regn_seq(
    session: Session,
    table_name: str,
    prf_code: str,
    pending: list[str],
) -> int:
    prefix = f"{prf_code.strip().upper()}N"
    rows = fetch_all(session, f"SELECT regn_seq_no FROM {table_name} WHERE regn_seq_no IS NOT NULL")
    values = [r["regn_seq_no"] for r in rows if r.get("regn_seq_no")]
    values.extend(pending)
    highest = 0
    for raw in values:
        if not raw:
            continue
        text = str(raw).strip().upper()
        if not text.startswith(prefix):
            continue
        m = _REGN_SEQ_RE.match(text)
        if m:
            highest = max(highest, int(m.group(2)))
    return highest


def _max_census_seq(
    session: Session,
    table_name: str,
    pending: list[int],
) -> int:
    if table_name == "MMS_OTH_MASTER":
        return max(pending) if pending else 0
    row = fetch_one(session, f"SELECT NVL(MAX(census_seq_no), 0) AS max_val FROM {table_name}")
    db_max = int(row.get("max_val") if row else 0)
    pending_max = max(pending) if pending else 0
    return max(db_max, pending_max)


def _parse_depres(raw: str | None) -> Decimal | None:
    if raw is None or not str(raw).strip():
        return None
    try:
        return Decimal(str(raw).strip())
    except (InvalidOperation, ValueError):
        raise HTTPException(status_code=400, detail="Invalid Depreciation %") from None


def _iv_date_token(iv_date: date) -> str:
    return iv_date.strftime("%d%m%y")


def _build_eqpt_regn(to_sus: str, iv_date: date, seq: int) -> str:
    digits = re.sub(r"\D", "", to_sus)
    if len(digits) < 5:
        raise HTTPException(
            status_code=400,
            detail="To Unit SUS must have at least 5 digits for registration number",
        )
    return f"T{digits[-5:]}{_iv_date_token(iv_date)}{seq:04d}"


def _build_regn_seq(prf_code: str, seq: int) -> str:
    return f"{prf_code.strip().upper()}N{seq:08d}"


@router.get("/status")
def status() -> dict[str, str]:
    return {"module": "unit-holding", "feature": "add-new-eqpt", "status": "ready"}


@router.get("/options")
def list_options(session: Session = Depends(get_db_session)) -> dict[str, list[OptionOut]]:
    return {
        "type_of_hldg": _option_list(session, "TYPEOFHOLDING", version_nos=("1", "2")),
        "type_of_eqpt": _option_list(session, "TYPEOFEQPT"),
    }


@router.get("/orbat-units", response_model=list[OrbatUnitOut])
def search_orbat_units(
    q: str = Query(""),
    session: Session = Depends(get_db_session),
) -> list[OrbatUnitOut]:
    sql = "SELECT id, unit_name, sus_no, form_code, status FROM MMS_ORBAT_UNIT_DETL WHERE UPPER(status) = 'ACTIVE'"
    params: dict = {}
    term = q.strip().upper()
    if term:
        like = f"%{term}%"
        sql += " AND (UPPER(unit_name) LIKE :term OR UPPER(sus_no) LIKE :term OR UPPER(COALESCE(form_code, '')) LIKE :term)"
        params["term"] = like

    sql += " ORDER BY unit_name"
    rows = fetch_all(session, sql, params)[:40]
    return [
        OrbatUnitOut(
            id=str(r.get("id") or ""),
            unit_name=str(r.get("unit_name") or ""),
            sus_no=str(r.get("sus_no") or ""),
            form_code=r.get("form_code"),
            status=str(r.get("status") or "ACTIVE"),
        )
        for r in rows
    ]


@router.get("/prf-groups", response_model=list[PrfGroupOut])
def search_prf_groups(
    q: str = Query(""),
    session: Session = Depends(get_db_session),
) -> list[PrfGroupOut]:
    sql = "SELECT DISTINCT prf_group FROM MMS_MLCCS_EQUIPMENT_MASTER WHERE prf_group IS NOT NULL"
    params: dict = {}
    term = q.strip().upper()
    if term:
        sql += " AND UPPER(prf_group) LIKE :term"
        params["term"] = f"%{term}%"

    sql += " ORDER BY prf_group"
    rows = fetch_all(session, sql, params)
    return [
        PrfGroupOut(prf_group=str(g.get("prf_group") or ""))
        for g in rows
        if g.get("prf_group") and str(g.get("prf_group")).strip()
    ]


@router.get("/census-items", response_model=list[CensusItemOut])
def search_census_items(
    prf_group: str = Query(..., min_length=1),
    q: str = Query(""),
    session: Session = Depends(get_db_session),
) -> list[CensusItemOut]:
    sql = """
        SELECT census_no, nomen, prf_group, prf_code, material_no
        FROM MMS_MLCCS_EQUIPMENT_MASTER
        WHERE UPPER(TRIM(prf_group)) = :grp
        AND census_no IS NOT NULL
    """
    params: dict = {"grp": prf_group.strip().upper()}
    term = q.strip().upper()
    if term:
        like = f"%{term}%"
        sql += " AND (UPPER(census_no) LIKE :term OR UPPER(COALESCE(nomen, '')) LIKE :term)"
        params["term"] = like

    sql += " ORDER BY census_no"
    rows = fetch_all(session, sql, params)[:80]
    return [
        CensusItemOut(
            census_no=str(r.get("census_no") or ""),
            nomenclature=r.get("nomen"),
            prf_group=r.get("prf_group"),
            prf_code=r.get("prf_code"),
            material_no=r.get("material_no"),
        )
        for r in rows
        if r.get("census_no")
    ]


@router.post("/build-items", response_model=list[GeneratedItemOut])
def build_items(
    body: BuildItemsIn,
    session: Session = Depends(get_db_session),
    _: Principal = Depends(require_unit_or_admin),
) -> list[GeneratedItemOut]:
    if _domain_label(session, "TYPE_OF_HOLDING", body.type_of_hldg) is None:
        raise HTTPException(status_code=400, detail="Invalid Type of Holding")
    if _domain_label(session, "TYPEOFEQPT", body.type_of_eqpt) is None:
        raise HTTPException(status_code=400, detail="Invalid Type of Eqpt")

    issuer = _orbat_by_sus(session, body.issuing_depot_sus)
    if issuer is None:
        raise HTTPException(status_code=400, detail="Issuing Depot not found in ORBAT")
    to_unit = _orbat_by_sus(session, body.to_unit_sus)
    if to_unit is None:
        raise HTTPException(status_code=400, detail="To Unit not found in ORBAT")

    mlccs = fetch_one(
        session,
        "SELECT id FROM MMS_MLCCS_EQUIPMENT_MASTER WHERE UPPER(TRIM(census_no)) = :cno AND UPPER(TRIM(prf_group)) = :pgrp",
        {"cno": body.census_no.strip().upper(), "pgrp": body.prf_group.strip().upper()},
    )
    if mlccs is None:
        raise HTTPException(
            status_code=400,
            detail="Census No not found under the selected PRF Group",
        )
    if not body.prf_code.strip():
        raise HTTPException(status_code=400, detail="PRF Code is required")

    bucket = _holding_bucket(session, body.type_of_hldg)
    table_name = _table_for_bucket(bucket)

    next_regn = (
        _max_eqpt_regn_seq(session, table_name, body.iv_date, body.pending_eqpt_regn_nos)
        + 1
    )
    next_seq = _max_regn_seq(
        session, table_name, body.prf_code, body.pending_regn_seq_nos
    ) + 1
    if next_seq < 1:
        next_seq = 1
    next_census = _max_census_seq(session, table_name, body.pending_census_seq_nos) + 1

    out: list[GeneratedItemOut] = []
    for i in range(body.issued_qty):
        regn_no = _build_eqpt_regn(body.to_unit_sus, body.iv_date, next_regn + i)
        regn_seq = _build_regn_seq(body.prf_code, next_seq + i)
        out.append(
            GeneratedItemOut(
                issuing_depot_name=str(issuer["unit_name"]),
                to_unit_name=str(to_unit["unit_name"]),
                prf_group=body.prf_group,
                prf_code=body.prf_code.strip().upper(),
                sus_no=str(to_unit["sus_no"]),
                census_no=body.census_no.strip().upper(),
                material_no=(body.material_no or "").strip(),
                eqpt_regn_no=regn_no,
                regn_seq_no=regn_seq,
                census_seq_no=next_census + i,
                issued_qty=1,
            )
        )
    return out


@router.post("/submit", response_model=SubmitOut)
def submit_items(
    body: SubmitIn,
    session: Session = Depends(get_db_session),
    principal: Principal = Depends(require_unit_or_admin),
) -> SubmitOut:
    bucket = _holding_bucket(session, body.type_of_hldg)
    if bucket not in ("unit", "depot", "oth"):
        raise HTTPException(status_code=400, detail="Unsupported Type of Holding")

    if _domain_label(session, "TYPE_OF_HOLDING", body.type_of_hldg) is None:
        raise HTTPException(status_code=400, detail="Invalid Type of Holding")
    if _domain_label(session, "TYPEOFEQPT", body.type_of_eqpt) is None:
        raise HTTPException(status_code=400, detail="Invalid Type of Eqpt")

    issuer = _orbat_by_sus(session, body.issuing_depot_sus)
    if issuer is None:
        raise HTTPException(status_code=400, detail="Issuing Depot not found in ORBAT")
    to_unit = _orbat_by_sus(session, body.to_unit_sus)
    if to_unit is None:
        raise HTTPException(status_code=400, detail="To Unit not found in ORBAT")

    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    now = datetime.utcnow()
    actor = (principal.username or "system")[:25]
    depres = _parse_depres(body.depres_dur_year)
    upload_name = (body.upload_iv or "").strip()[:100] or None

    target_table = _table_for_bucket(bucket)
    pending_op_status = get_opstatus_code_value(session, "PENDING", "0")

    ids: list[str] = []
    last_id: int | None = None
    for item in body.items:
        rno = item.eqpt_regn_no.strip().upper()
        existing = fetch_one(
            session,
            f"SELECT id FROM {target_table} WHERE UPPER(eqpt_regn_no) = :rno",
            {"rno": rno},
        )
        if existing is not None:
            raise HTTPException(
                status_code=409,
                detail=f"Registration No '{item.eqpt_regn_no}' already exists",
            )

        next_id = next_int_id(session, target_table, start_after=last_id)
        last_id = next_id
        row_id = str(next_id)

        if bucket == "oth":
            params = {
                "id": row_id,
                "issued_from": str(issuer["sus_no"])[:10],
                "iv_sus_no": str(to_unit["sus_no"])[:9],
                "iv_no": body.iv_no.strip()[:50],
                "iv_date": datetime.combine(body.iv_date, datetime.min.time()),
                "prf_code": item.prf_code.strip().upper()[:8],
                "census_no": item.census_no.strip().upper()[:9],
                "type_of_hldg": body.type_of_hldg.strip().upper()[:3],
                "type_of_eqpt": body.type_of_eqpt.strip().upper()[:2],
                "eqpt_regn_no": item.eqpt_regn_no.strip().upper()[:25],
                "regn_seq_no": item.regn_seq_no.strip().upper()[:20],
                "from_sus_no": str(issuer["sus_no"])[:8],
                "from_form_code": str(issuer.get("form_code") or "")[:10] or None,
                "from_tr_date": today,
                "to_sus_no": str(to_unit["sus_no"])[:8],
                "to_form_code": str(to_unit.get("form_code") or "")[:10] or None,
                "to_tr_date": today,
                "service_status": _SERVICE_STATUS_DEFAULT,
                "created_by": actor,
                "created_date": now,
                "upload_by": actor if upload_name else None,
                "upload_date": now if upload_name else None,
                "op_status": pending_op_status,
                "tfr_status": _TFR_STATUS_PENDING,
                "upload_voucher": (upload_name[:50] if upload_name else None),
            }
            insert_sql = """
                INSERT INTO MMS_OTH_MASTER (
                    id, issued_from, iv_sus_no, iv_no, iv_date, prf_code, census_no,
                    type_of_hldg, type_of_eqpt, eqpt_regn_no, regn_seq_no, from_sus_no,
                    from_form_code, from_tr_date, to_sus_no, to_form_code, to_tr_date,
                    service_status, created_by, created_date, upload_by, upload_date,
                    op_status, tfr_status, upload_voucher
                ) VALUES (
                    :id, :issued_from, :iv_sus_no, :iv_no, :iv_date, :prf_code, :census_no,
                    :type_of_hldg, :type_of_eqpt, :eqpt_regn_no, :regn_seq_no, :from_sus_no,
                    :from_form_code, :from_tr_date, :to_sus_no, :to_form_code, :to_tr_date,
                    :service_status, :created_by, :created_date, :upload_by, :upload_date,
                    :op_status, :tfr_status, :upload_voucher
                )
            """
            execute_sql(session, insert_sql, params)
        else:
            params = {
                "id": row_id,
                "sus_no": str(to_unit["sus_no"])[:9],
                "census_seq_no": item.census_seq_no,
                "census_no": item.census_no.strip().upper()[:9],
                "type_of_hldg": body.type_of_hldg.strip().upper()[:15],
                "type_of_eqpt": body.type_of_eqpt.strip().upper()[:3],
                "eqpt_regn_no": item.eqpt_regn_no.strip().upper()[:25],
                "regn_seq_no": item.regn_seq_no.strip().upper()[:20],
                "from_sus_no": str(issuer["sus_no"])[:8],
                "from_form_code": str(issuer.get("form_code") or "")[:15] or None,
                "from_tr_date": today,
                "to_sus_no": str(to_unit["sus_no"])[:8],
                "to_form_code": str(to_unit.get("form_code") or "")[:15] or None,
                "to_tr_date": today,
                "service_status": _SERVICE_STATUS_DEFAULT,
                "created_by": actor,
                "created_date": now,
                "upload_by": actor if upload_name else None,
                "upload_date": now if upload_name else None,
                "op_status": pending_op_status,
                "tfr_status": _TFR_STATUS_PENDING,
                "iv_no": body.iv_no.strip()[:25],
                "iv_date": datetime.combine(body.iv_date, datetime.min.time()),
                "prf_code": item.prf_code.strip().upper()[:8],
                "depres_dur_year": depres,
                "upload_iv": upload_name,
            }
            insert_sql = f"""
                INSERT INTO {target_table} (
                    id, sus_no, census_seq_no, census_no, type_of_hldg, type_of_eqpt,
                    eqpt_regn_no, regn_seq_no, from_sus_no, from_form_code, from_tr_date,
                    to_sus_no, to_form_code, to_tr_date, service_status, created_by,
                    created_date, upload_by, upload_date, op_status, tfr_status, iv_no,
                    iv_date, prf_code, depres_dur_year, upload_iv
                ) VALUES (
                    :id, :sus_no, :census_seq_no, :census_no, :type_of_hldg, :type_of_eqpt,
                    :eqpt_regn_no, :regn_seq_no, :from_sus_no, :from_form_code, :from_tr_date,
                    :to_sus_no, :to_form_code, :to_tr_date, :service_status, :created_by,
                    :created_date, :upload_by, :upload_date, :op_status, :tfr_status, :iv_no,
                    :iv_date, :prf_code, :depres_dur_year, :upload_iv
                )
            """
            execute_sql(session, insert_sql, params)

        ids.append(row_id)

    return SubmitOut(ids=ids, count=len(ids), target_table=target_table)
