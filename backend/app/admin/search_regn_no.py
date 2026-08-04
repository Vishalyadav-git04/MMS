"""Search Regn No — lookup EQPT_REGN_NO across unit / depot / other holdings."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.deps import get_db_session
from app.models import DepotMaster, DomainValue, OthMaster, UnitMasterDetail

router = APIRouter(
    prefix="/admin/search-regn-no",
    tags=["admin: search regn no"],
)

_SOURCE_UNIT = "unit"
_SOURCE_DEPOT = "depot"
_SOURCE_OTH = "oth"

_SOURCE_LABEL = {
    _SOURCE_UNIT: "Unit",
    _SOURCE_DEPOT: "Depot",
    _SOURCE_OTH: "Other",
}


class SearchRegnRequest(BaseModel):
    regn_no: str = Field(..., min_length=1)
    census_no: str | None = None
    prf_code: str | None = None


class RegnRecord(BaseModel):
    id: str
    source_table: str
    source_label: str
    eqpt_regn_no: str | None = None
    census_no: str | None = None
    prf_code: str | None = None
    sus_no: str | None = None
    type_of_hldg: str | None = None
    type_of_eqpt: str | None = None
    service_status: str | None = None
    service_status_label: str | None = None
    op_status: str | None = None
    from_sus_no: str | None = None
    to_sus_no: str | None = None
    iv_no: str | None = None
    iv_date: datetime | None = None
    remarks: str | None = None


class OptionOut(BaseModel):
    value: str
    label: str


class OptionsOut(BaseModel):
    service_status: list[OptionOut]


class UpdateRegnRequest(BaseModel):
    id: str = Field(..., min_length=1, max_length=36)
    source_table: str = Field(..., min_length=1, max_length=10)
    eqpt_regn_no: str = Field(..., min_length=1, max_length=25)
    service_status: str = Field(..., min_length=1, max_length=10)


class UpdateRegnOut(BaseModel):
    id: str
    source_table: str
    updated: bool


class LookupOut(BaseModel):
    eqpt_regn_no: str | None = None
    census_no: str | None = None
    prf_code: str | None = None


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


def _domain_map(session: Session, domain: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for opt in _option_list(session, domain):
        out[opt.value.strip().upper()] = opt.label
    return out


def _model_for_source(source: str) -> type[Any]:
    if source == _SOURCE_UNIT:
        return UnitMasterDetail
    if source == _SOURCE_DEPOT:
        return DepotMaster
    if source == _SOURCE_OTH:
        return OthMaster
    raise HTTPException(status_code=400, detail=f"Unknown source_table '{source}'")


def _row_to_record(
    source: str,
    row: Any,
    svc_labels: dict[str, str],
) -> RegnRecord:
    svc = (row.service_status or "").strip()
    sus = getattr(row, "sus_no", None) or getattr(row, "to_sus_no", None)
    return RegnRecord(
        id=row.id,
        source_table=source,
        source_label=_SOURCE_LABEL.get(source, source),
        eqpt_regn_no=row.eqpt_regn_no,
        census_no=row.census_no,
        prf_code=row.prf_code,
        sus_no=sus,
        type_of_hldg=row.type_of_hldg,
        type_of_eqpt=row.type_of_eqpt,
        service_status=row.service_status,
        service_status_label=svc_labels.get(svc.upper(), svc) if svc else None,
        op_status=row.op_status,
        from_sus_no=row.from_sus_no,
        to_sus_no=row.to_sus_no,
        iv_no=row.iv_no,
        iv_date=row.iv_date,
        remarks=row.remarks,
    )


def _apply_filters(stmt: Any, model: type[Any], body: SearchRegnRequest) -> Any:
    stmt = stmt.where(
        func.upper(model.eqpt_regn_no) == body.regn_no.strip().upper()
    )
    if body.census_no and body.census_no.strip():
        stmt = stmt.where(
            func.upper(model.census_no) == body.census_no.strip().upper()
        )
    if body.prf_code and body.prf_code.strip():
        stmt = stmt.where(
            func.upper(model.prf_code) == body.prf_code.strip().upper()
        )
    return stmt


def _regn_exists_elsewhere(
    session: Session,
    *,
    regn_no: str,
    exclude_id: str,
    exclude_source: str,
) -> bool:
    """True if another holding row already uses this registration number."""
    upper = regn_no.strip().upper()
    for source, model in (
        (_SOURCE_UNIT, UnitMasterDetail),
        (_SOURCE_DEPOT, DepotMaster),
        (_SOURCE_OTH, OthMaster),
    ):
        stmt = select(model.id).where(func.upper(model.eqpt_regn_no) == upper)
        if source == exclude_source:
            stmt = stmt.where(model.id != exclude_id)
        if session.scalar(stmt) is not None:
            return True
    return False


@router.get("/options", response_model=OptionsOut)
def get_options(session: Session = Depends(get_db_session)) -> OptionsOut:
    return OptionsOut(service_status=_option_list(session, "SERVICEABLITY"))


@router.get("/lookup", response_model=LookupOut)
def lookup_regn(
    regn_no: str,
    session: Session = Depends(get_db_session),
) -> LookupOut:
    """Resolve Census No / PRF Code for a registration across holding tables."""
    upper = regn_no.strip().upper()
    if not upper:
        raise HTTPException(status_code=400, detail="Regn No is required")

    for model in (UnitMasterDetail, DepotMaster, OthMaster):
        row = session.scalars(
            select(model).where(func.upper(model.eqpt_regn_no) == upper).limit(1)
        ).first()
        if row is not None:
            return LookupOut(
                eqpt_regn_no=row.eqpt_regn_no,
                census_no=row.census_no,
                prf_code=row.prf_code,
            )

    raise HTTPException(
        status_code=404,
        detail=f"No registration found for regn no '{regn_no}'",
    )


@router.post("/search", response_model=list[RegnRecord])
def search_regn(
    body: SearchRegnRequest,
    session: Session = Depends(get_db_session),
) -> list[RegnRecord]:
    svc_labels = _domain_map(session, "SERVICEABLITY")
    out: list[RegnRecord] = []

    for source, model in (
        (_SOURCE_UNIT, UnitMasterDetail),
        (_SOURCE_DEPOT, DepotMaster),
        (_SOURCE_OTH, OthMaster),
    ):
        stmt = _apply_filters(select(model), model, body)
        for row in session.scalars(stmt.order_by(model.eqpt_regn_no)).all():
            out.append(_row_to_record(source, row, svc_labels))

    if not out:
        raise HTTPException(
            status_code=404,
            detail=f"No registration found for regn no '{body.regn_no}'",
        )
    return out


@router.put("/update", response_model=UpdateRegnOut)
def update_regn(
    body: UpdateRegnRequest,
    session: Session = Depends(get_db_session),
) -> UpdateRegnOut:
    source = body.source_table.strip().lower()
    model = _model_for_source(source)
    row = session.get(model, body.id)
    if row is None:
        raise HTTPException(status_code=404, detail="Equipment record not found")

    new_regn = body.eqpt_regn_no.strip().upper()[:25]
    new_svc = body.service_status.strip().upper()[:10]

    known = {o.value.upper() for o in _option_list(session, "SERVICEABLITY")}
    if known and new_svc not in known:
        raise HTTPException(status_code=400, detail="Invalid Serviceability status")

    current_regn = (row.eqpt_regn_no or "").strip().upper()
    if new_regn != current_regn and _regn_exists_elsewhere(
        session,
        regn_no=new_regn,
        exclude_id=body.id,
        exclude_source=source,
    ):
        raise HTTPException(
            status_code=409,
            detail=f"Registration No '{new_regn}' already exists",
        )

    row.eqpt_regn_no = new_regn
    row.service_status = new_svc
    session.commit()
    return UpdateRegnOut(id=body.id, source_table=source, updated=True)
