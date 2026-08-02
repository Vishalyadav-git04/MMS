"""Link Census No with Item Code — update ITEM_CODE on MMS_MLCCS_EQUIPMENT_MASTER."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.deps import get_db_session, get_principal
from app.auth.principal import Principal
from app.models import MlccsEquipmentMaster, PrfGrpMstr

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
    cos_section: str | None = None


class CensusSuggestion(BaseModel):
    census_no: str
    nomenclature: str | None = None
    cat_part_no: str | None = None
    prf_group: str | None = None
    item_code: str | None = None
    cos_section: str | None = None


class OptionItem(BaseModel):
    value: str
    label: str


def _to_result(row: MlccsEquipmentMaster) -> LinkResult:
    return LinkResult(
        id=row.id,
        census_no=row.census_no,
        nomenclature=row.nomen,
        item_code=row.item_code,
        cat_part_no=row.cat_part_no,
        prf_group=row.prf_group,
        cos_section=row.cos_sec,
    )


@router.get("/suggest-census", response_model=list[CensusSuggestion])
def suggest_census(
    q: str = Query(""),
    session: Session = Depends(get_db_session),
) -> list[CensusSuggestion]:
    """Typeahead for Census No / Nomenclature from MMS_MLCCS_EQUIPMENT_MASTER."""
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
            cos_section=r.cos_sec,
        )
        for r in rows
        if r.census_no
    ]


@router.get("/item-codes", response_model=list[OptionItem])
def list_item_codes(
    prf_group: str = Query(..., min_length=1),
    cos_section: str | None = Query(None),
    session: Session = Depends(get_db_session),
) -> list[OptionItem]:
    """Item codes + names under a PRF from MMS_PRF_GRP_MSTR (optionally scoped by COS)."""
    grp = prf_group.strip()
    if not grp:
        raise HTTPException(status_code=400, detail="prf_group is required")

    conditions = [func.upper(PrfGrpMstr.prf_grp) == grp.upper()]
    cos = (cos_section or "").strip().upper()
    if cos:
        conditions.append(func.upper(PrfGrpMstr.cos_sec) == cos)

    rows = session.execute(
        select(PrfGrpMstr.item_code, PrfGrpMstr.item_name)
        .where(*conditions)
        .distinct()
        .order_by(PrfGrpMstr.item_code)
    ).all()

    out: list[OptionItem] = []
    seen: set[str] = set()
    for item_code, item_name in rows:
        if item_code is None:
            continue
        code = str(item_code)
        if code in seen:
            continue
        seen.add(code)
        name = (item_name or "").strip()
        label = f"{code} — {name}" if name else code
        out.append(OptionItem(value=code, label=label))
    return out


@router.post("/link", response_model=LinkResult)
def link_item_code(
    body: LinkRequest,
    session: Session = Depends(get_db_session),
    principal: Principal = Depends(get_principal),
) -> LinkResult:
    """Update ITEM_CODE on MMS_MLCCS_EQUIPMENT_MASTER for the given census no."""
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
    row.data_upd_by = principal.username
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
