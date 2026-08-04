"""Approve New Eqpt — Weapon → Unit Holding.

Search pending/approved/rejected holdings across:
  MMS_UNIT_MSTR_DETL, MMS_DEPOT_MASTER, MMS_OTH_MASTER
by current holding unit TO_SUS_NO (same value as SUS_NO on unit/depot),
resolved via MMS_ORBAT_UNIT_DETL, filtered by OP_STATUS and IV date range.
"""

from __future__ import annotations

from datetime import date, datetime
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

router = APIRouter(
    prefix="/unit-holding/approve-new-eqpt",
    tags=["unit-holding: approve new eqpt"],
)

# Domain OP_STATUS: 0=Pending, 1=Approved, 2=REJECTED.
# Legacy seed rows also use P/A/R — accept both on search.
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
_PENDING_CODES = frozenset({"0", "P"})

_SOURCE_UNIT = "unit"
_SOURCE_DEPOT = "depot"
_SOURCE_OTH = "oth"


class OrbatUnitOut(BaseModel):
    id: str
    unit_name: str
    sus_no: str
    form_code: str | None = None
    status: str


class SearchIn(BaseModel):
    sus_no: str = Field(..., min_length=1, max_length=50)
    unit_name: str = Field(..., min_length=1, max_length=255)
    status: str = Field(..., min_length=1)  # Pending | Approved | Rejected
    date_from: date
    date_to: date | None = None


class NewEqptOut(BaseModel):
    id: str
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


class ApproveIn(BaseModel):
    items: list[dict[str, str]] = Field(..., min_length=1)
    # each: { "id": "...", "source_table": "unit"|"depot"|"oth" }


class ApproveOut(BaseModel):
    approved_ids: list[str]
    count: int


def _fmt_date(value: datetime | None) -> str | None:
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
    rows = session.scalars(
        select(DomainValue).where(
            func.upper(DomainValue.domain_name) == "TYPE_OF_HLDG"
        )
    ).all()
    return {
        (r.code_value or "").strip().upper(): (r.label_name or r.code_value or "").strip()
        for r in rows
        if r.code_value
    }


@router.get("/status")
def status() -> dict[str, str]:
    return {"module": "unit-holding", "feature": "approve-new-eqpt", "status": "ready"}


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
    rows = session.scalars(stmt.limit(40)).all()
    return [
        OrbatUnitOut(
            id=r.id,
            unit_name=r.unit_name,
            sus_no=r.sus_no,
            form_code=r.form_code,
            status=r.status,
        )
        for r in rows
    ]


def _resolve_unit(
    session: Session, sus_no: str, unit_name: str
) -> OrbatUnitDetl:
    """Match ORBAT by exact SUS + unit name (case-insensitive / contains)."""
    sus = sus_no.strip().upper()
    name = unit_name.strip().upper()
    row = session.scalar(
        select(OrbatUnitDetl).where(
            func.upper(OrbatUnitDetl.sus_no) == sus,
            func.upper(OrbatUnitDetl.status) == "ACTIVE",
            or_(
                func.upper(OrbatUnitDetl.unit_name) == name,
                func.upper(OrbatUnitDetl.unit_name).like(f"%{name}%"),
            ),
        )
    )
    if row is None:
        # allow SUS-only match when typed name is the same unit's name mismatch
        by_sus = session.scalar(
            select(OrbatUnitDetl).where(
                func.upper(OrbatUnitDetl.sus_no) == sus,
                func.upper(OrbatUnitDetl.status) == "ACTIVE",
            )
        )
        if by_sus is None:
            raise HTTPException(
                status_code=404,
                detail=f"No active ORBAT unit for SUS No '{sus_no.strip()}'",
            )
        if name not in (by_sus.unit_name or "").upper():
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Unit's Name does not match SUS No "
                    f"(expected '{by_sus.unit_name}')"
                ),
            )
        return by_sus
    return row


def _material_for_census(session: Session, census_nos: set[str]) -> dict[str, str]:
    if not census_nos:
        return {}
    upper = {c.upper() for c in census_nos if c}
    rows = session.execute(
        select(MlccsEquipmentMaster.census_no, MlccsEquipmentMaster.material_no).where(
            func.upper(MlccsEquipmentMaster.census_no).in_(upper)
        )
    ).all()
    out: dict[str, str] = {}
    for census, material in rows:
        if census and material:
            out[str(census).strip().upper()] = str(material).strip()
    return out


@router.post("/search", response_model=list[NewEqptOut])
def search_new_eqpt(
    body: SearchIn,
    session: Session = Depends(get_db_session),
    _: Principal = Depends(require_unit_or_admin),
) -> list[NewEqptOut]:
    status_key = body.status.strip().lower()
    if status_key not in _STATUS_CODES:
        raise HTTPException(
            status_code=400,
            detail="Status must be Pending, Approved, or Rejected",
        )
    status_codes = _STATUS_CODES[status_key]

    unit = _resolve_unit(session, body.sus_no, body.unit_name)
    sus = unit.sus_no.strip().upper()

    date_from = datetime.combine(body.date_from, datetime.min.time())
    date_to = (
        datetime.combine(body.date_to, datetime.max.time())
        if body.date_to is not None
        else None
    )

    results: list[tuple[str, Any, str | None]] = []
    # (source, row, unit_name)
    # Holding unit is TO_SUS_NO on all three tables (same value as SUS_NO on unit/depot).

    # --- Unit master ---
    unit_stmt = select(UnitMasterDetail).where(
        func.upper(UnitMasterDetail.to_sus_no) == sus,
        func.upper(func.coalesce(UnitMasterDetail.op_status, "")).in_(status_codes),
        UnitMasterDetail.iv_date >= date_from,
    )
    if date_to is not None:
        unit_stmt = unit_stmt.where(UnitMasterDetail.iv_date <= date_to)
    for row in session.scalars(unit_stmt.order_by(UnitMasterDetail.iv_date.desc())).all():
        results.append((_SOURCE_UNIT, row, unit.unit_name))

    # --- Depot master ---
    depot_stmt = select(DepotMaster).where(
        func.upper(DepotMaster.to_sus_no) == sus,
        func.upper(func.coalesce(DepotMaster.op_status, "")).in_(status_codes),
        DepotMaster.iv_date >= date_from,
    )
    if date_to is not None:
        depot_stmt = depot_stmt.where(DepotMaster.iv_date <= date_to)
    for row in session.scalars(depot_stmt.order_by(DepotMaster.iv_date.desc())).all():
        results.append((_SOURCE_DEPOT, row, unit.unit_name))

    # --- Oth master ---
    oth_stmt = select(OthMaster).where(
        func.upper(OthMaster.to_sus_no) == sus,
        func.upper(func.coalesce(OthMaster.op_status, "")).in_(status_codes),
        OthMaster.iv_date >= date_from,
    )
    if date_to is not None:
        oth_stmt = oth_stmt.where(OthMaster.iv_date <= date_to)
    for row in session.scalars(oth_stmt.order_by(OthMaster.iv_date.desc())).all():
        results.append((_SOURCE_OTH, row, unit.unit_name))

    census_nos = {
        str(getattr(row, "census_no") or "").strip()
        for _, row, _ in results
        if getattr(row, "census_no", None)
    }
    materials = _material_for_census(session, census_nos)
    hldg_labels = _holding_label_map(session)

    out: list[NewEqptOut] = []
    for source, row, unit_name in results:
        census = (row.census_no or "").strip()
        op = (row.op_status or "").strip().upper() or None
        hldg = (row.type_of_hldg or "").strip() or None
        holding_sus = (row.to_sus_no or sus).strip()
        out.append(
            NewEqptOut(
                id=str(row.id),
                source_table=source,
                iv_no=row.iv_no,
                iv_date=_fmt_date(row.iv_date),
                unit_name=unit_name,
                sus_no=holding_sus,
                material_no=materials.get(census.upper()) if census else None,
                census_no=census or None,
                type_of_hldg=hldg,
                type_of_hldg_label=(
                    hldg_labels.get(hldg.upper(), hldg) if hldg else None
                ),
                status=_status_label(op),
                op_status=op,
            )
        )
    return out


def _model_for_source(source: str) -> type[Any]:
    if source == _SOURCE_UNIT:
        return UnitMasterDetail
    if source == _SOURCE_DEPOT:
        return DepotMaster
    if source == _SOURCE_OTH:
        return OthMaster
    raise HTTPException(status_code=400, detail=f"Unknown source_table '{source}'")


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
        model = _model_for_source(source)
        row = session.get(model, row_id)
        if row is None:
            raise HTTPException(
                status_code=404,
                detail=f"Record '{row_id}' not found in {source}",
            )
        current = (row.op_status or "").strip().upper()
        if current == _APPROVED_CODE or current == "A":
            continue
        if current not in _PENDING_CODES and current not in ("", "2", "R"):
            raise HTTPException(
                status_code=400,
                detail=f"Record '{row_id}' cannot be approved (status={row.op_status})",
            )
        row.op_status = _APPROVED_CODE
        row.approved_by = actor
        row.approved_date = now
        approved.append(f"{source}:{row_id}")

    session.flush()
    return ApproveOut(approved_ids=approved, count=len(approved))
