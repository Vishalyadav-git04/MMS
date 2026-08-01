"""Link Census No with Item Code — update ITEM_CODE on MMS_MLCCS_EQUIPMENT_MASTER."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.deps import get_db_session
from app.models import MlccsEquipmentMaster

router = APIRouter(
    prefix="/admin/link-census-no-with-item-code",
    tags=["admin: link census no with item code"],
)


class LinkRequest(BaseModel):
    census_no: str = Field(..., min_length=1)
    item_code: str = Field(..., min_length=1)


class LinkResult(BaseModel):
    id: str
    census_no: str | None
    nomenclature: str | None
    item_code: str | None
    cat_part_no: str | None = None
    prf_group: str | None = None


class CensusSuggestion(BaseModel):
    census_no: str
    nomenclature: str | None = None
    cat_part_no: str | None = None
    prf_group: str | None = None
    item_code: str | None = None


def _to_result(row: MlccsEquipmentMaster) -> LinkResult:
    return LinkResult(
        id=row.id,
        census_no=row.census_no,
        nomenclature=row.nomen,
        item_code=row.item_code,
        cat_part_no=row.cat_part_no,
        prf_group=row.prf_group,
    )


@router.get("/suggest-census", response_model=list[CensusSuggestion])
def suggest_census(
    q: str = Query(""),
    session: Session = Depends(get_db_session),
) -> list[CensusSuggestion]:
    """Typeahead for Census No — returns census + nomenclature for auto-fill."""
    term = q.strip().upper()
    stmt = (
        select(MlccsEquipmentMaster)
        .where(MlccsEquipmentMaster.census_no.is_not(None))
        .order_by(MlccsEquipmentMaster.census_no)
    )
    if term:
        stmt = stmt.where(
            or_(
                func.upper(MlccsEquipmentMaster.census_no).like(f"%{term}%"),
                func.upper(func.coalesce(MlccsEquipmentMaster.nomen, "")).like(
                    f"%{term}%"
                ),
            )
        )
    rows = session.scalars(stmt.limit(50)).all()
    return [
        CensusSuggestion(
            census_no=r.census_no or "",
            nomenclature=r.nomen,
            cat_part_no=r.cat_part_no,
            prf_group=r.prf_group,
            item_code=r.item_code,
        )
        for r in rows
        if r.census_no
    ]


@router.post("/link", response_model=LinkResult)
def link_item_code(
    body: LinkRequest,
    session: Session = Depends(get_db_session),
) -> LinkResult:
    row = session.scalar(
        select(MlccsEquipmentMaster).where(
            func.upper(MlccsEquipmentMaster.census_no) == body.census_no.strip().upper()
        )
    )
    if row is None:
        raise HTTPException(
            status_code=404,
            detail=f"No MLCCS record for census no '{body.census_no}'",
        )
    row.item_code = body.item_code.strip()
    row.data_upd_by = "dev"
    row.data_upd_date = datetime.now()
    session.flush()
    return _to_result(row)


@router.get("/lookup/{census_no}", response_model=LinkResult)
def lookup_by_census(
    census_no: str,
    session: Session = Depends(get_db_session),
) -> LinkResult:
    row = session.scalar(
        select(MlccsEquipmentMaster).where(
            func.upper(MlccsEquipmentMaster.census_no) == census_no.strip().upper()
        )
    )
    if row is None:
        raise HTTPException(status_code=404, detail=f"No MLCCS record for '{census_no}'")
    return _to_result(row)
