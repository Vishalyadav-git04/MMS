"""Search Regn No — query MMS_UNIT_MSTR_DETL by registration / census / PRF."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.deps import get_db_session
from app.models import UnitMasterDetail

router = APIRouter(
    prefix="/admin/search-regn-no",
    tags=["admin: search regn no"],
)


class SearchRegnRequest(BaseModel):
    regn_no: str = Field(..., min_length=1)
    census_no: str | None = None
    prf_code: str | None = None


class RegnRecord(BaseModel):
    id: str
    eqpt_regn_no: str | None = None
    census_no: str | None = None
    prf_code: str | None = None
    sus_no: str | None = None
    type_of_hldg: str | None = None
    type_of_eqpt: str | None = None
    service_status: str | None = None
    op_status: str | None = None
    from_sus_no: str | None = None
    to_sus_no: str | None = None
    iv_no: str | None = None
    iv_date: datetime | None = None
    remarks: str | None = None


@router.post("/search", response_model=list[RegnRecord])
def search_regn(
    body: SearchRegnRequest,
    session: Session = Depends(get_db_session),
) -> list[RegnRecord]:
    stmt = select(UnitMasterDetail).where(
        func.upper(UnitMasterDetail.eqpt_regn_no) == body.regn_no.strip().upper()
    )
    if body.census_no and body.census_no.strip():
        stmt = stmt.where(
            func.upper(UnitMasterDetail.census_no) == body.census_no.strip().upper()
        )
    if body.prf_code and body.prf_code.strip():
        stmt = stmt.where(
            func.upper(UnitMasterDetail.prf_code) == body.prf_code.strip().upper()
        )

    rows = session.scalars(stmt).all()
    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"No registration found for regn no '{body.regn_no}'",
        )
    return [
        RegnRecord(
            id=r.id,
            eqpt_regn_no=r.eqpt_regn_no,
            census_no=r.census_no,
            prf_code=r.prf_code,
            sus_no=r.sus_no,
            type_of_hldg=r.type_of_hldg,
            type_of_eqpt=r.type_of_eqpt,
            service_status=r.service_status,
            op_status=r.op_status,
            from_sus_no=r.from_sus_no,
            to_sus_no=r.to_sus_no,
            iv_no=r.iv_no,
            iv_date=r.iv_date,
            remarks=r.remarks,
        )
        for r in rows
    ]
