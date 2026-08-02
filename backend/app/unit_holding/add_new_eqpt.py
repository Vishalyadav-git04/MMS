"""Add New Eqpt — Weapon → Unit Holding.

Lookups + generate registration rows + persist UNIT HOLDING to MMS_UNIT_MSTR_DETL.
Other holding-type save mappings are added later.
"""

from __future__ import annotations

import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.auth.principal import Principal
from app.deps import get_db_session, require_unit_or_admin
from app.models import (
    DepotMaster,
    DomainValue,
    MlccsEquipmentMaster,
    OrbatUnitDetl,
    OthMaster,
    UnitMasterDetail,
)
from app.utils.ids import next_int_id

router = APIRouter(
    prefix="/unit-holding/add-new-eqpt",
    tags=["unit-holding: add new eqpt"],
)

_OP_STATUS_PENDING = "0"
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
    id: str
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
    material_no: str = Field(..., min_length=1, max_length=50)
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
    ids: list[str]
    count: int
    target_table: str


def _option_list(session: Session, domain: str) -> list[OptionOut]:
    rows = session.scalars(
        select(DomainValue)
        .where(func.upper(DomainValue.domain_name) == domain.upper())
        .order_by(
            func.lpad(func.nvl(DomainValue.disp_order, "9999"), 10, "0"),
            DomainValue.label_name,
        )
    ).all()
    return [
        OptionOut(value=r.code_value or "", label=r.label_name or r.code_value or "")
        for r in rows
        if r.code_value
    ]


def _domain_label(session: Session, domain: str, code: str) -> str | None:
    row = session.scalar(
        select(DomainValue).where(
            func.upper(DomainValue.domain_name) == domain.upper(),
            func.upper(func.trim(DomainValue.code_value)) == code.strip().upper(),
        )
    )
    if row is None:
        return None
    return (row.label_name or row.code_value or "").strip()


def _holding_bucket(session: Session, type_of_hldg_code: str) -> str:
    """Return unit | oth | depot based on TYPE_OF_HLDG label."""
    label = (_domain_label(session, "TYPE_OF_HLDG", type_of_hldg_code) or "").upper()
    if label == _UNIT_HOLDING_LABEL:
        return "unit"
    if label in _OTH_HOLDING_LABELS:
        return "oth"
    return "depot"


def _seq_model(bucket: str) -> type[Any]:
    if bucket == "unit":
        return UnitMasterDetail
    if bucket == "oth":
        return OthMaster
    return DepotMaster


def _orbat_by_sus(session: Session, sus_no: str) -> OrbatUnitDetl | None:
    return session.scalar(
        select(OrbatUnitDetl).where(
            func.upper(OrbatUnitDetl.sus_no) == sus_no.strip().upper(),
            func.upper(OrbatUnitDetl.status) == "ACTIVE",
        )
    )


def _max_eqpt_regn_seq(
    session: Session,
    model: type[Any],
    pending: list[str],
) -> int:
    """Highest 4-digit EQPT_REGN_NO tail matching T+5sus+6date+4seq; else 0."""
    values = list(session.scalars(select(model.eqpt_regn_no)).all())
    values.extend(pending)
    highest = 0
    for raw in values:
        if not raw:
            continue
        m = _EQPT_REGN_RE.match(str(raw).strip())
        if m:
            highest = max(highest, int(m.group(1)))
    return highest


def _max_regn_seq(
    session: Session,
    model: type[Any],
    prf_code: str,
    pending: list[str],
) -> int:
    """Highest 8-digit REGN_SEQ_NO for this PRF_CODE; else 0."""
    prefix = f"{prf_code.strip().upper()}N"
    values = list(session.scalars(select(model.regn_seq_no)).all())
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
    model: type[Any],
    pending: list[int],
) -> int:
    if not hasattr(model, "census_seq_no"):
        # Oth master has no census_seq_no — use 0 so generated rows start at 1 for display.
        return max(pending) if pending else 0
    db_max = session.scalar(select(func.max(model.census_seq_no))) or 0
    pending_max = max(pending) if pending else 0
    return max(int(db_max), pending_max)


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
        "type_of_hldg": _option_list(session, "TYPE_OF_HLDG"),
        "type_of_eqpt": _option_list(session, "TYPE_OF_EQPT"),
    }


@router.get("/orbat-units", response_model=list[OrbatUnitOut])
def search_orbat_units(
    q: str = Query(""),
    session: Session = Depends(get_db_session),
) -> list[OrbatUnitOut]:
    stmt = (
        select(OrbatUnitDetl)
        .where(func.upper(OrbatUnitDetl.status) == "ACTIVE")
        .order_by(OrbatUnitDetl.unit_name)
    )
    term = q.strip().upper()
    if term:
        like = f"%{term}%"
        stmt = stmt.where(
            or_(
                func.upper(OrbatUnitDetl.unit_name).like(like),
                func.upper(OrbatUnitDetl.sus_no).like(like),
                func.upper(func.coalesce(OrbatUnitDetl.form_code, "")).like(like),
            )
        )
    return [
        OrbatUnitOut(
            id=r.id,
            unit_name=r.unit_name,
            sus_no=r.sus_no,
            form_code=r.form_code,
            status=r.status,
        )
        for r in session.scalars(stmt.limit(40)).all()
    ]


@router.get("/prf-groups", response_model=list[PrfGroupOut])
def search_prf_groups(
    q: str = Query(""),
    session: Session = Depends(get_db_session),
) -> list[PrfGroupOut]:
    stmt = (
        select(MlccsEquipmentMaster.prf_group)
        .where(MlccsEquipmentMaster.prf_group.is_not(None))
        .distinct()
        .order_by(MlccsEquipmentMaster.prf_group)
    )
    term = q.strip().upper()
    if term:
        stmt = stmt.where(func.upper(MlccsEquipmentMaster.prf_group).like(f"%{term}%"))
    return [
        PrfGroupOut(prf_group=g)
        for g in session.scalars(stmt.limit(50)).all()
        if g and str(g).strip()
    ]


@router.get("/census-items", response_model=list[CensusItemOut])
def search_census_items(
    prf_group: str = Query(..., min_length=1),
    q: str = Query(""),
    session: Session = Depends(get_db_session),
) -> list[CensusItemOut]:
    stmt = (
        select(MlccsEquipmentMaster)
        .where(
            func.upper(func.trim(MlccsEquipmentMaster.prf_group))
            == prf_group.strip().upper(),
            MlccsEquipmentMaster.census_no.is_not(None),
        )
        .order_by(MlccsEquipmentMaster.census_no)
    )
    term = q.strip().upper()
    if term:
        like = f"%{term}%"
        stmt = stmt.where(
            or_(
                func.upper(MlccsEquipmentMaster.census_no).like(like),
                func.upper(func.coalesce(MlccsEquipmentMaster.nomen, "")).like(like),
            )
        )
    return [
        CensusItemOut(
            census_no=r.census_no or "",
            nomenclature=r.nomen,
            prf_group=r.prf_group,
            prf_code=r.prf_code,
            material_no=r.material_no,
        )
        for r in session.scalars(stmt.limit(80)).all()
        if r.census_no
    ]


@router.post("/build-items", response_model=list[GeneratedItemOut])
def build_items(
    body: BuildItemsIn,
    session: Session = Depends(get_db_session),
    _: Principal = Depends(require_unit_or_admin),
) -> list[GeneratedItemOut]:
    if _domain_label(session, "TYPE_OF_HLDG", body.type_of_hldg) is None:
        raise HTTPException(status_code=400, detail="Invalid Type of Holding")
    if _domain_label(session, "TYPE_OF_EQPT", body.type_of_eqpt) is None:
        raise HTTPException(status_code=400, detail="Invalid Type of Eqpt")

    issuer = _orbat_by_sus(session, body.issuing_depot_sus)
    if issuer is None:
        raise HTTPException(status_code=400, detail="Issuing Depot not found in ORBAT")
    to_unit = _orbat_by_sus(session, body.to_unit_sus)
    if to_unit is None:
        raise HTTPException(status_code=400, detail="To Unit not found in ORBAT")

    mlccs = session.scalar(
        select(MlccsEquipmentMaster).where(
            func.upper(func.trim(MlccsEquipmentMaster.census_no))
            == body.census_no.strip().upper(),
            func.upper(func.trim(MlccsEquipmentMaster.prf_group))
            == body.prf_group.strip().upper(),
        )
    )
    if mlccs is None:
        raise HTTPException(
            status_code=400,
            detail="Census No not found under the selected PRF Group",
        )
    if not body.prf_code.strip():
        raise HTTPException(status_code=400, detail="PRF Code is required")

    bucket = _holding_bucket(session, body.type_of_hldg)
    model = _seq_model(bucket)

    next_regn = _max_eqpt_regn_seq(session, model, body.pending_eqpt_regn_nos) + 1
    next_seq = _max_regn_seq(
        session, model, body.prf_code, body.pending_regn_seq_nos
    ) + 1
    if next_seq < 1:
        next_seq = 1
    next_census = _max_census_seq(session, model, body.pending_census_seq_nos) + 1

    out: list[GeneratedItemOut] = []
    for i in range(body.issued_qty):
        regn_no = _build_eqpt_regn(body.to_unit_sus, body.iv_date, next_regn + i)
        regn_seq = _build_regn_seq(body.prf_code, next_seq + i)
        out.append(
            GeneratedItemOut(
                issuing_depot_name=issuer.unit_name,
                to_unit_name=to_unit.unit_name,
                prf_group=body.prf_group,
                prf_code=body.prf_code.strip().upper(),
                sus_no=to_unit.sus_no,
                census_no=body.census_no.strip().upper(),
                material_no=body.material_no.strip(),
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
    if bucket == "oth":
        raise HTTPException(
            status_code=400,
            detail=(
                "Save mapping for SECTOR / LOAN / ACSFP STORE "
                "(MMS_OTH_MASTER) is not configured yet."
            ),
        )
    if bucket not in ("unit", "depot"):
        raise HTTPException(status_code=400, detail="Unsupported Type of Holding")

    if _domain_label(session, "TYPE_OF_HLDG", body.type_of_hldg) is None:
        raise HTTPException(status_code=400, detail="Invalid Type of Holding")
    if _domain_label(session, "TYPE_OF_EQPT", body.type_of_eqpt) is None:
        raise HTTPException(status_code=400, detail="Invalid Type of Eqpt")

    issuer = _orbat_by_sus(session, body.issuing_depot_sus)
    if issuer is None:
        raise HTTPException(status_code=400, detail="Issuing Depot not found in ORBAT")
    to_unit = _orbat_by_sus(session, body.to_unit_sus)
    if to_unit is None:
        raise HTTPException(status_code=400, detail="To Unit not found in ORBAT")

    model: type[Any] = UnitMasterDetail if bucket == "unit" else DepotMaster
    target_table = "MMS_UNIT_MSTR_DETL" if bucket == "unit" else "MMS_DEPOT_MASTER"

    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    now = datetime.utcnow()
    actor = (principal.username or "system")[:25]
    depres = _parse_depres(body.depres_dur_year)
    upload_name = (body.upload_iv or "").strip()[:100] or None

    ids: list[str] = []
    last_id: int | None = None
    for item in body.items:
        existing = session.scalar(
            select(model.id).where(
                func.upper(model.eqpt_regn_no) == item.eqpt_regn_no.strip().upper()
            )
        )
        if existing is not None:
            raise HTTPException(
                status_code=409,
                detail=f"Registration No '{item.eqpt_regn_no}' already exists",
            )

        next_id = next_int_id(session, model, start_after=last_id)
        last_id = next_id
        row_id = str(next_id)
        session.add(
            model(
                id=row_id,
                sus_no=to_unit.sus_no[:9],
                census_seq_no=item.census_seq_no,
                census_no=item.census_no.strip().upper()[:9],
                type_of_hldg=body.type_of_hldg.strip().upper()[:15],
                type_of_eqpt=body.type_of_eqpt.strip().upper()[:3],
                eqpt_regn_no=item.eqpt_regn_no.strip().upper()[:25],
                regn_seq_no=item.regn_seq_no.strip().upper()[:20],
                from_sus_no=issuer.sus_no[:8],
                from_form_code=(issuer.form_code or "")[:15] or None,
                from_tr_date=today,
                to_sus_no=to_unit.sus_no[:8],
                to_form_code=(to_unit.form_code or "")[:15] or None,
                to_tr_date=today,
                barrel1_detl=None,
                barrel2_detl=None,
                barrel3_detl=None,
                barrel4_detl=None,
                service_status=_SERVICE_STATUS_DEFAULT,
                spl_remarks=None,
                remarks=None,
                created_by=actor,
                created_date=now,
                upload_by=actor if upload_name else None,
                upload_date=now if upload_name else None,
                approved_by=None,
                approved_date=None,
                op_status=_OP_STATUS_PENDING,
                tfr_status=_TFR_STATUS_PENDING,
                iv_no=body.iv_no.strip()[:25],
                iv_date=datetime.combine(body.iv_date, datetime.min.time()),
                prf_code=item.prf_code.strip().upper()[:8],
                depres_dur_year=depres,
                upload_iv=upload_name,
            )
        )
        ids.append(row_id)

    return SubmitOut(ids=ids, count=len(ids), target_table=target_table)
