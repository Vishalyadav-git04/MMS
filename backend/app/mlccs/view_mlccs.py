"""View MLCCS — Weapon → MLCCS.

Search / list / class-of-eqpt options against MMS_MLCCS_EQUIPMENT_MASTER.
Mirrors frontend src/components/mlccs/ViewMlccs.tsx.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.deps import get_db_session
from app.models import MlccsEquipmentMaster

router = APIRouter(
    prefix="/mlccs",
    tags=["mlccs: view mlccs"],
)


class MlccsSearchRequest(BaseModel):
    text: str | None = None
    field: str = Field(
        default="Nomenclature",
        description="Nomenclature | Census No | Material No | Cat Part No",
    )
    class_of_eqpt: str | None = None
    limit: int = Field(default=500, ge=1, le=2000)


class MlccsListItem(BaseModel):
    id: str
    material_no: str | None = None
    census_no: str | None = None
    nomenclature: str | None = None
    class_of_eqpt: str | None = None
    cat_part_no: str | None = None
    au: str | None = None
    status: str | None = None


@router.get("/status")
def mlccs_status() -> dict[str, str]:
    return {"module": "mlccs", "status": "ok"}


@router.get("/options")
def mlccs_options(session: Session = Depends(get_db_session)) -> dict[str, list[dict[str, str]]]:
    """Class-of-eqpt (and related) dropdown values from the master table."""
    values = session.scalars(
        select(MlccsEquipmentMaster.class_category)
        .where(MlccsEquipmentMaster.class_category.is_not(None))
        .distinct()
        .order_by(MlccsEquipmentMaster.class_category)
    ).all()
    class_of_eqpt = [
        {"value": str(v), "label": str(v)} for v in values if str(v).strip()
    ]
    return {"class_of_eqpt": class_of_eqpt}


@router.post("/search", response_model=list[MlccsListItem])
def search_mlccs(
    body: MlccsSearchRequest,
    session: Session = Depends(get_db_session),
) -> list[MlccsListItem]:
    """Search MMS_MLCCS_EQUIPMENT_MASTER for the View MLCCS screen."""
    stmt = select(MlccsEquipmentMaster)

    if body.class_of_eqpt and body.class_of_eqpt.strip():
        stmt = stmt.where(
            func.upper(MlccsEquipmentMaster.class_category)
            == body.class_of_eqpt.strip().upper()
        )

    text = (body.text or "").strip()
    if text:
        q = f"%{text.upper()}%"
        field = (body.field or "Nomenclature").strip()
        column_map: dict[str, Any] = {
            "Nomenclature": MlccsEquipmentMaster.nomen,
            "Census No": MlccsEquipmentMaster.census_no,
            "Material No": MlccsEquipmentMaster.material_no,
            "Cat Part No": MlccsEquipmentMaster.cat_part_no,
        }
        col = column_map.get(field)
        if col is not None:
            stmt = stmt.where(func.upper(col).like(q))
        else:
            stmt = stmt.where(
                or_(
                    func.upper(MlccsEquipmentMaster.nomen).like(q),
                    func.upper(MlccsEquipmentMaster.census_no).like(q),
                    func.upper(MlccsEquipmentMaster.material_no).like(q),
                    func.upper(MlccsEquipmentMaster.cat_part_no).like(q),
                )
            )

    stmt = stmt.order_by(
        MlccsEquipmentMaster.census_no.asc(),
        MlccsEquipmentMaster.nomen.asc(),
    ).limit(body.limit)

    rows = session.scalars(stmt).all()
    return [
        MlccsListItem(
            id=r.id,
            material_no=r.material_no,
            census_no=r.census_no,
            nomenclature=r.nomen,
            class_of_eqpt=r.class_category,
            cat_part_no=r.cat_part_no,
            au=r.au,
            status=r.op_status or r.item_status,
        )
        for r in rows
    ]
