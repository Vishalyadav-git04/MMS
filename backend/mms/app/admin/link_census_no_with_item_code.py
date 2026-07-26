"""Link Census No with Item Code — update ITEM_CODE on MMS_MLCCS_EQUIPMENT_MASTER."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
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
    return LinkResult(
        id=row.id,
        census_no=row.census_no,
        nomenclature=row.nomen,
        item_code=row.item_code,
    )


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
    return LinkResult(
        id=row.id,
        census_no=row.census_no,
        nomenclature=row.nomen,
        item_code=row.item_code,
    )
