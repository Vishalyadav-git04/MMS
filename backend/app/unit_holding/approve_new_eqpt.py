"""Approve New Eqpt — Weapon → Unit Holding using Native SQL."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.principal import Principal
from app.deps import get_db_session, require_unit_or_admin
from app.db.native_utils import execute_sql, fetch_all, fetch_one

router = APIRouter(
    prefix="/unit-holding/approve-new-eqpt",
    tags=["unit-holding: approve new eqpt"],
)

_STATUS_CODES: dict[str, tuple[str, ...]] = {
    "pending": ("0", "P"),
    "approved": ("1", "A"),
    "rejected": ("2", "R"),
}

_STATUS_LABEL: dict[str, str] = {
    "0": "Pending",
    "P": "Pending",
    "1": "Approved",
    "A": "Approved",
    "2": "Rejected",
    "R": "Rejected",
}

_APPROVED_CODE = "1"
_REJECTED_CODE = "2"
_PENDING_CODES = frozenset({"0", "P"})

_SOURCE_UNIT = "unit"
_SOURCE_DEPOT = "depot"
_SOURCE_OTH = "oth"

_TABLE_MAP = {
    _SOURCE_UNIT: "MMS_UNIT_MSTR_DETL",
    _SOURCE_DEPOT: "MMS_DEPOT_MASTER",
    _SOURCE_OTH: "MMS_OTH_MASTER",
}


class OrbatUnitOut(BaseModel):
    id: str | int
    unit_name: str
    sus_no: str
    form_code: str | None = None
    status: str


class SearchIn(BaseModel):
    sus_no: str = Field("", max_length=50)
    unit_name: str = Field("", max_length=255)
    status: str = Field("", max_length=50)  # Pending | Approved | Rejected | empty for All
    date_from: date
    date_to: date | None = None


class NewEqptOut(BaseModel):
    id: str | int
    source_table: str
    iv_no: str | None = None
    iv_date: str | None = None
    unit_name: str | None = None
    sus_no: str | None = None
    material_no: str | None = None
    census_no: str | None = None
    type_of_hldg: str | None = None
    type_of_hldg_label: str | None = None
    status: str
    op_status: str | None = None
    eqpt_regn_no: str | None = None
    regn_seq_no: str | None = None
    census_seq_no: str | int | None = None
    prf_code: str | None = None
    prf_group: str | None = None
    nomenclature: str | None = None
    type_of_eqpt: str | None = None
    type_of_eqpt_label: str | None = None
    from_sus_no: str | None = None
    from_unit_name: str | None = None
    depres_dur_year: str | None = None
    upload_iv: str | None = None
    eqpt_make: str | None = None
    eqpt_model: str | None = None
    unit_price: str | None = None
    life_of_asset: str | None = None


class ApproveIn(BaseModel):
    items: list[dict[str, Any]] = Field(..., min_length=1)


class ApproveOut(BaseModel):
    approved_ids: list[str | int]
    count: int


def _fmt_date(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    return str(value)


def _status_label(code: str | None) -> str:
    if not code:
        return ""
    return _STATUS_LABEL.get(code.strip().upper(), code)


def _holding_label_map(session: Session) -> dict[str, str]:
    rows = fetch_all(
        session,
        "SELECT code_value, label_name FROM MMS_DOMAIN_VALUES WHERE REPLACE(UPPER(domain_name), '_', '') = 'TYPEOFHOLDING'",
    )
    return {
        str(r.get("code_value") or "").strip().upper(): str(r.get("label_name") or r.get("code_value") or "").strip()
        for r in rows
        if r.get("code_value")
    }


def _eqpt_type_label_map(session: Session) -> dict[str, str]:
    rows = fetch_all(
        session,
        "SELECT code_value, label_name FROM MMS_DOMAIN_VALUES WHERE REPLACE(UPPER(domain_name), '_', '') = 'TYPEOFEQPT'",
    )
    return {
        str(r.get("code_value") or "").strip().upper(): str(r.get("label_name") or r.get("code_value") or "").strip()
        for r in rows
        if r.get("code_value")
    }


def _orbat_names_map(session: Session, sus_nos: set[str]) -> dict[str, str]:
    if not sus_nos:
        return {}
    in_clause = ", ".join(f":s_{i}" for i in range(len(sus_nos)))
    params = {f"s_{i}": s.upper() for i, s in enumerate(sus_nos) if s}
    rows = fetch_all(
        session,
        f"SELECT sus_no, unit_name FROM MMS_ORBAT_UNIT_DETL WHERE UPPER(sus_no) IN ({in_clause}) AND UPPER(status) = 'ACTIVE'",
        params,
    )
    return {
        str(r["sus_no"]).strip().upper(): str(r["unit_name"]).strip()
        for r in rows
        if r.get("sus_no") and r.get("unit_name")
    }


def _mlccs_details_for_census(session: Session, census_nos: set[str]) -> dict[str, dict[str, str]]:
    if not census_nos:
        return {}
    in_clause = ", ".join(f":c_{i}" for i in range(len(census_nos)))
    params = {f"c_{i}": c.upper() for i, c in enumerate(census_nos) if c}
    rows = fetch_all(
        session,
        f"SELECT census_no, material_no, nomen, prf_group, prf_code FROM MMS_MLCCS_EQUIPMENT_MASTER WHERE UPPER(census_no) IN ({in_clause})",
        params,
    )
    out: dict[str, dict[str, str]] = {}
    for r in rows:
        if r.get("census_no"):
            out[str(r["census_no"]).strip().upper()] = {
                "material_no": str(r.get("material_no") or "").strip(),
                "nomen": str(r.get("nomen") or "").strip(),
                "prf_group": str(r.get("prf_group") or "").strip(),
                "prf_code": str(r.get("prf_code") or "").strip(),
            }
    return out


@router.get("/status")
def status() -> dict[str, str]:
    return {"module": "unit-holding", "feature": "approve-new-eqpt", "status": "ready"}


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
    rows = fetch_all(session, sql, params)[:10]
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


def _resolve_unit_optional(
    session: Session, sus_no: str, unit_name: str
) -> dict | None:
    sus = sus_no.strip().upper()
    name = unit_name.strip().upper()
    if sus and name:
        row = fetch_one(
            session,
            """
            SELECT id, unit_name, sus_no, form_code, status FROM MMS_ORBAT_UNIT_DETL
            WHERE UPPER(sus_no) = :sus AND UPPER(status) = 'ACTIVE'
            AND (UPPER(unit_name) = :uname OR UPPER(unit_name) LIKE :uname_like)
            """,
            {"sus": sus, "uname": name, "uname_like": f"%{name}%"},
        )
        if row is not None:
            return row
    if sus:
        by_sus = fetch_one(
            session,
            "SELECT id, unit_name, sus_no, form_code, status FROM MMS_ORBAT_UNIT_DETL WHERE UPPER(sus_no) = :sus AND UPPER(status) = 'ACTIVE'",
            {"sus": sus},
        )
        if by_sus is not None:
            return by_sus
    if name:
        by_name = fetch_one(
            session,
            "SELECT id, unit_name, sus_no, form_code, status FROM MMS_ORBAT_UNIT_DETL WHERE (UPPER(unit_name) = :name OR UPPER(unit_name) LIKE :name_like) AND UPPER(status) = 'ACTIVE'",
            {"name": name, "name_like": f"%{name}%"},
        )
        if by_name is not None:
            return by_name
    return None


@router.post("/search", response_model=list[NewEqptOut])
def search_new_eqpt(
    body: SearchIn,
    session: Session = Depends(get_db_session),
    _: Principal = Depends(require_unit_or_admin),
) -> list[NewEqptOut]:
    status_key = body.status.strip().lower()
    if not status_key or status_key in ("all", "all status", "--select the value--"):
        status_codes = ("0", "P", "1", "A", "2", "R")
    elif status_key in _STATUS_CODES:
        status_codes = _STATUS_CODES[status_key]
    else:
        raise HTTPException(
            status_code=400,
            detail="Status must be Pending, Approved, or Rejected",
        )

    sus_input = body.sus_no.strip()
    uname_input = body.unit_name.strip()
    sus_filter = None

    if sus_input or uname_input:
        unit = _resolve_unit_optional(session, sus_input, uname_input)
        if unit:
            sus_filter = str(unit["sus_no"]).strip().upper()
        elif sus_input:
            sus_filter = sus_input.upper()

    date_from = datetime.combine(body.date_from, datetime.min.time())
    date_to = (
        datetime.combine(body.date_to, datetime.max.time())
        if body.date_to is not None
        else None
    )

    results: list[tuple[str, dict]] = []
    st_clause = ", ".join(f":s_{i}" for i in range(len(status_codes)))
    base_params: dict[str, Any] = {f"s_{i}": s for i, s in enumerate(status_codes)}
    base_params["dfrom"] = date_from

    sql_where = f"WHERE UPPER(TRIM(COALESCE(op_status, ''))) IN ({st_clause}) AND iv_date >= :dfrom"
    if sus_filter:
        sql_where += " AND UPPER(to_sus_no) = :sus"
        base_params["sus"] = sus_filter

    if date_to is not None:
        sql_where += " AND iv_date <= :dto"
        base_params["dto"] = date_to

    for source, table_name in _TABLE_MAP.items():
        sql = f"""
            SELECT * FROM {table_name}
            {sql_where}
            ORDER BY iv_date DESC
        """
        rows = fetch_all(session, sql, base_params)
        for r in rows:
            results.append((source, r))

    def _sort_key(item: tuple[str, dict]):
        row = item[1]
        iv_dt = row.get("iv_date")
        if isinstance(iv_dt, datetime):
            dt_val = iv_dt
        elif isinstance(iv_dt, date):
            dt_val = datetime.combine(iv_dt, datetime.min.time())
        else:
            dt_val = datetime.min
        raw_id = row.get("id")
        try:
            id_val = int(raw_id) if raw_id is not None else 0
        except (ValueError, TypeError):
            id_val = 0
        return (dt_val, id_val)

    results.sort(key=_sort_key, reverse=True)

    census_nos = {
        str(r.get("census_no")).strip()
        for _, r in results
        if r.get("census_no")
    }
    to_sus_nos = {
        str(r.get("to_sus_no") or "").strip()
        for _, r in results
        if r.get("to_sus_no")
    }
    from_sus_nos = {
        str(r.get("from_sus_no") or r.get("issued_from") or "").strip()
        for _, r in results
        if (r.get("from_sus_no") or r.get("issued_from"))
    }
    all_sus_nos = to_sus_nos | from_sus_nos

    mlccs_map = _mlccs_details_for_census(session, census_nos)
    unit_map = _orbat_names_map(session, all_sus_nos)
    hldg_labels = _holding_label_map(session)
    eqpt_labels = _eqpt_type_label_map(session)

    out: list[NewEqptOut] = []
    for source, row in results:
        census = str(row.get("census_no") or "").strip()
        op = str(row.get("op_status") or "").strip().upper() or None
        hldg = str(row.get("type_of_hldg") or "").strip() or None
        eqpt_type = str(row.get("type_of_eqpt") or "").strip() or None
        from_sus = str(row.get("from_sus_no") or row.get("issued_from") or "").strip() or None
        holding_sus = str(row.get("to_sus_no") or "").strip()

        mlccs_info = mlccs_map.get(census.upper(), {})
        mat_no = str(row.get("material_no") or mlccs_info.get("material_no") or "").strip() or None
        nomen = mlccs_info.get("nomen") or None
        prf_grp = mlccs_info.get("prf_group") or None
        pcode = str(row.get("prf_code") or mlccs_info.get("prf_code") or "").strip() or None

        to_unit_name = unit_map.get(holding_sus.upper()) if holding_sus else None

        out.append(
            NewEqptOut(
                id=str(row["id"]),
                source_table=source,
                iv_no=row.get("iv_no"),
                iv_date=_fmt_date(row.get("iv_date")),
                unit_name=to_unit_name,
                sus_no=holding_sus or None,
                material_no=mat_no,
                census_no=census or None,
                type_of_hldg=hldg,
                type_of_hldg_label=(
                    hldg_labels.get(hldg.upper(), hldg) if hldg else None
                ),
                status=_status_label(op),
                op_status=op,
                eqpt_regn_no=row.get("eqpt_regn_no"),
                regn_seq_no=row.get("regn_seq_no"),
                census_seq_no=row.get("census_seq_no"),
                prf_code=pcode,
                prf_group=prf_grp,
                nomenclature=nomen,
                type_of_eqpt=eqpt_type,
                type_of_eqpt_label=(
                    eqpt_labels.get(eqpt_type.upper(), eqpt_type) if eqpt_type else None
                ),
                from_sus_no=from_sus,
                from_unit_name=(unit_map.get(from_sus.upper()) if from_sus else None),
                depres_dur_year=(
                    str(row.get("depres_dur_year")) if row.get("depres_dur_year") is not None else None
                ),
                upload_iv=(row.get("upload_iv") or row.get("upload_voucher")),
                eqpt_make=row.get("eqpt_make"),
                eqpt_model=row.get("eqpt_model"),
                unit_price=(
                    str(row.get("unit_price")) if row.get("unit_price") is not None else None
                ),
                life_of_asset=(
                    str(row.get("life_of_asset")) if row.get("life_of_asset") is not None else None
                ),
            )
        )
    return out


@router.post("/approve", response_model=ApproveOut)
def approve_new_eqpt(
    body: ApproveIn,
    session: Session = Depends(get_db_session),
    principal: Principal = Depends(require_unit_or_admin),
) -> ApproveOut:
    now = datetime.utcnow()
    actor = (principal.username or "system")[:25]
    approved: list[str] = []

    for item in body.items:
        row_id = (item.get("id") or "").strip()
        source = (item.get("source_table") or "").strip().lower()
        if not row_id or not source:
            raise HTTPException(
                status_code=400,
                detail="Each item requires id and source_table",
            )
        table_name = _TABLE_MAP.get(source)
        if not table_name:
            raise HTTPException(status_code=400, detail=f"Unknown source_table '{source}'")

        row = fetch_one(session, f"SELECT id, op_status FROM {table_name} WHERE id = :rid OR TO_CHAR(id) = :rid_str", {"rid": row_id, "rid_str": row_id})
        if row is None:
            raise HTTPException(
                status_code=404,
                detail=f"Record '{row_id}' not found in {source}",
            )
        current = str(row.get("op_status") or "").strip().upper()
        if current == _APPROVED_CODE or current == "A":
            continue
        if current not in _PENDING_CODES and current not in ("", "2", "R"):
            raise HTTPException(
                status_code=400,
                detail=f"Record '{row_id}' cannot be approved (status={current})",
            )

        execute_sql(
            session,
            f"UPDATE {table_name} SET op_status = :st, approved_by = :app_by, approved_date = :app_dt WHERE id = :rid OR TO_CHAR(id) = :rid_str",
            {"st": _APPROVED_CODE, "app_by": actor, "app_dt": now, "rid": row_id, "rid_str": row_id},
        )
        approved.append(f"{source}:{row_id}")

    return ApproveOut(approved_ids=approved, count=len(approved))


@router.post("/reject", response_model=ApproveOut)
def reject_new_eqpt(
    body: ApproveIn,
    session: Session = Depends(get_db_session),
    principal: Principal = Depends(require_unit_or_admin),
) -> ApproveOut:
    now = datetime.utcnow()
    actor = (principal.username or "system")[:25]
    rejected: list[str] = []

    for item in body.items:
        row_id = (item.get("id") or "").strip()
        source = (item.get("source_table") or "").strip().lower()
        if not row_id or not source:
            raise HTTPException(
                status_code=400,
                detail="Each item requires id and source_table",
            )
        table_name = _TABLE_MAP.get(source)
        if not table_name:
            raise HTTPException(status_code=400, detail=f"Unknown source_table '{source}'")

        execute_sql(
            session,
            f"UPDATE {table_name} SET op_status = :st, approved_by = :app_by, approved_date = :app_dt WHERE id = :rid OR TO_CHAR(id) = :rid_str",
            {"st": _REJECTED_CODE, "app_by": actor, "app_dt": now, "rid": row_id, "rid_str": row_id},
        )
        rejected.append(f"{source}:{row_id}")

    return ApproveOut(approved_ids=rejected, count=len(rejected))

