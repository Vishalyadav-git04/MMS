"""Unit Obsn Status — query MMS_OBSN_DETL."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.deps import get_db_session
from app.models import ObsnDetail

router = APIRouter(
    prefix="/admin/unit-obsn-status",
    tags=["admin: unit obsn status"],
)


class ObsnSearchRequest(BaseModel):
    unit_name: str | None = None  # matched against SUS_NO / DEO
    period: str | None = None  # YYYY-MM → yr + mth
    status: str | None = "all"  # all | open | closed | pending


class ObsnRecord(BaseModel):
    id: str
    sus_no: str | None = None
    deo: str | None = None
    mth: str | None = None
    yr: str | None = None
    census_no: str | None = None
    obsn_status: str | None = None
    type_of_hldg: str | None = None
    type_of_eqpt: str | None = None
    unit_remarks: str | None = None
    obsn1: str | None = None
    obsn2: str | None = None


_MONTHS = {
    "01": "Jan",
    "02": "Feb",
    "03": "Mar",
    "04": "Apr",
    "05": "May",
    "06": "Jun",
    "07": "Jul",
    "08": "Aug",
    "09": "Sep",
    "10": "Oct",
    "11": "Nov",
    "12": "Dec",
}


@router.post("/search", response_model=list[ObsnRecord])
def search_obsn(
    body: ObsnSearchRequest,
    session: Session = Depends(get_db_session),
) -> list[ObsnRecord]:
    stmt = select(ObsnDetail)

    if body.unit_name and body.unit_name.strip():
        q = f"%{body.unit_name.strip().upper()}%"
        stmt = stmt.where(
            (func.upper(ObsnDetail.sus_no).like(q))
            | (func.upper(ObsnDetail.deo).like(q))
        )

    if body.period and "-" in body.period:
        year, month = body.period.split("-", 1)
        stmt = stmt.where(ObsnDetail.yr == year)
        mth = _MONTHS.get(month)
        if mth:
            stmt = stmt.where(func.upper(ObsnDetail.mth) == mth.upper())

    status = (body.status or "all").lower()
    if status == "open":
        stmt = stmt.where(func.upper(ObsnDetail.obsn_status) == "O")
    elif status == "closed":
        stmt = stmt.where(func.upper(ObsnDetail.obsn_status) == "C")
    elif status == "pending":
        stmt = stmt.where(func.upper(ObsnDetail.obsn_status) == "P")

    rows = session.scalars(stmt.order_by(ObsnDetail.yr.desc(), ObsnDetail.mth)).all()
    return [
        ObsnRecord(
            id=r.id,
            sus_no=r.sus_no,
            deo=r.deo,
            mth=r.mth,
            yr=r.yr,
            census_no=r.census_no,
            obsn_status=r.obsn_status,
            type_of_hldg=r.type_of_hldg,
            type_of_eqpt=r.type_of_eqpt,
            unit_remarks=r.unit_remarks,
            obsn1=r.obsn1,
            obsn2=r.obsn2,
        )
        for r in rows
    ]
