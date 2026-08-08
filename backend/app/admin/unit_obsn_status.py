"""Unit Obsn Status — query MMS_OBSN_DETAIL using Native SQL."""

from __future__ import annotations

from datetime import datetime

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.deps import get_db_session
from app.db.native_utils import fetch_all

router = APIRouter(
    prefix="/admin/unit-obsn-status",
    tags=["admin: unit obsn status"],
)


class ObsnSearchRequest(BaseModel):
    unit_name: str | None = None  # matched against SUS_NO / DEO
    period: str | None = None  # YYYY-MM → yr + mth
    status: str | None = "all"  # all | open | closed | pending


class ObsnRecord(BaseModel):
    id: str | int
    unit_name: str | None = None
    uploaded_doc: str | None = None
    obsn_id: str | int | None = None
    observation: str | None = None
    obsn_date: datetime | None = None
    date_of_completion: datetime | None = None
    completion_by: str | None = None
    miso_reply: str | None = None
    sus_no: str | None = None
    deo: str | None = None
    mth: str | None = None
    yr: str | None = None
    census_no: str | None = None
    obsn_status: str | None = None


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


def _first(*values: Any) -> str | None:
    for v in values:
        if v and str(v).strip():
            return str(v).strip()
    return None


def _unit_name(row: dict) -> str | None:
    parts = [str(p).strip() for p in (row.get("sus_no"), row.get("deo")) if p and str(p).strip()]
    return " / ".join(parts) if parts else None


@router.post("/search", response_model=list[ObsnRecord])
def search_obsn(
    body: ObsnSearchRequest,
    session: Session = Depends(get_db_session),
) -> list[ObsnRecord]:
    sql = "SELECT * FROM MMS_OBSN_DETAIL WHERE 1=1"
    params: dict = {}

    if body.unit_name and body.unit_name.strip():
        q = f"%{body.unit_name.strip().upper()}%"
        sql += " AND (UPPER(sus_no) LIKE :q OR UPPER(deo) LIKE :q)"
        params["q"] = q

    if body.period and "-" in body.period:
        year, month = body.period.split("-", 1)
        sql += " AND yr = :yr"
        params["yr"] = year
        mth = _MONTHS.get(month)
        if mth:
            sql += " AND UPPER(mth) = :mth"
            params["mth"] = mth.upper()

    status = (body.status or "all").lower()
    if status == "open":
        sql += " AND UPPER(obsn_status) = 'O'"
    elif status == "closed":
        sql += " AND UPPER(obsn_status) = 'C'"
    elif status == "pending":
        sql += " AND UPPER(obsn_status) = 'P'"

    sql += " ORDER BY yr DESC, mth"
    rows = fetch_all(session, sql, params)
    return [
        ObsnRecord(
            id=str(r.get("id") or ""),
            unit_name=_unit_name(r),
            uploaded_doc=r.get("unit_upload_document"),
            obsn_id=r.get("tr_id"),
            observation=_first(r.get("obsn1"), r.get("obsn2"), r.get("obsn3"), r.get("obsn4"), r.get("obsn5")),
            obsn_date=r.get("data_cr_date") if isinstance(r.get("data_cr_date"), datetime) else None,
            date_of_completion=(
                r.get("data_chk_date") if isinstance(r.get("data_chk_date"), datetime)
                else (r.get("data_upd_date") if isinstance(r.get("data_upd_date"), datetime) else None)
            ),
            completion_by=_first(r.get("data_chk_by"), r.get("data_upd_by")),
            miso_reply=_first(r.get("obsn1_res"), r.get("obsn2_res"), r.get("obsn3_res"), r.get("obsn4_res"), r.get("obsn5_res")),
            sus_no=r.get("sus_no"),
            deo=r.get("deo"),
            mth=r.get("mth"),
            yr=r.get("yr"),
            census_no=r.get("census_no"),
            obsn_status=r.get("obsn_status"),
        )
        for r in rows
    ]
