"""View MLCCS — Weapon → MLCCS.

Search / list / class-of-eqpt options against MMS_MLCCS_EQUIPMENT_MASTER.
Mirrors frontend src/components/mlccs/ViewMlccs.tsx.

Uses column-only selects + server-side OFFSET/LIMIT pagination so the
screen can open quickly even when the master table is large.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import ColumnElement, Select, func, or_, select
from sqlalchemy.orm import Session

from app.deps import get_db_session
from app.models import MlccsEquipmentMaster

router = APIRouter(
    prefix="/mlccs",
    tags=["mlccs: view mlccs"],
)

# Columns required by the View MLCCS grid only (avoids SELECT *).
_LIST_COLUMNS = (
    MlccsEquipmentMaster.id,
    MlccsEquipmentMaster.material_no,
    MlccsEquipmentMaster.census_no,
    MlccsEquipmentMaster.nomen,
    MlccsEquipmentMaster.class_category,
    MlccsEquipmentMaster.cat_part_no,
    MlccsEquipmentMaster.au,
    MlccsEquipmentMaster.op_status,
    MlccsEquipmentMaster.item_status,
)


class MlccsSearchRequest(BaseModel):
    text: str | None = None
    field: str = Field(
        default="Nomenclature",
        description="Nomenclature | Census No | Material No | Cat Part No",
    )
    class_of_eqpt: str | None = None
    result_q: str | None = Field(
        default=None,
        description="Optional secondary filter across visible result columns",
    )
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=5000)


class MlccsListItem(BaseModel):
    id: str
    material_no: str | None = None
    census_no: str | None = None
    nomenclature: str | None = None
    class_of_eqpt: str | None = None
    cat_part_no: str | None = None
    au: str | None = None
    status: str | None = None


class MlccsSearchResponse(BaseModel):
    items: list[MlccsListItem]
    total: int
    page: int
    page_size: int


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


def _like(col: Any, pattern: str) -> ColumnElement[bool]:
    return func.upper(col).like(pattern)


def _apply_filters(stmt: Select[Any], body: MlccsSearchRequest) -> Select[Any]:
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
            stmt = stmt.where(_like(col, q))
        else:
            stmt = stmt.where(
                or_(
                    _like(MlccsEquipmentMaster.nomen, q),
                    _like(MlccsEquipmentMaster.census_no, q),
                    _like(MlccsEquipmentMaster.material_no, q),
                    _like(MlccsEquipmentMaster.cat_part_no, q),
                )
            )

    result_q = (body.result_q or "").strip()
    if result_q:
        rq = f"%{result_q.upper()}%"
        stmt = stmt.where(
            or_(
                _like(MlccsEquipmentMaster.material_no, rq),
                _like(MlccsEquipmentMaster.census_no, rq),
                _like(MlccsEquipmentMaster.nomen, rq),
                _like(MlccsEquipmentMaster.class_category, rq),
                _like(MlccsEquipmentMaster.cat_part_no, rq),
                _like(MlccsEquipmentMaster.au, rq),
                _like(MlccsEquipmentMaster.op_status, rq),
                _like(MlccsEquipmentMaster.item_status, rq),
            )
        )

    return stmt


def _row_to_item(row: Any) -> MlccsListItem:
    return MlccsListItem(
        id=row.id,
        material_no=row.material_no,
        census_no=row.census_no,
        nomenclature=row.nomen,
        class_of_eqpt=row.class_category,
        cat_part_no=row.cat_part_no,
        au=row.au,
        status=row.op_status or row.item_status,
    )


@router.post("/search", response_model=MlccsSearchResponse)
def search_mlccs(
    body: MlccsSearchRequest,
    session: Session = Depends(get_db_session),
) -> MlccsSearchResponse:
    """Paginated search of MMS_MLCCS_EQUIPMENT_MASTER for View MLCCS.

    Empty text + no class filter returns the full table page-by-page
    (used on screen open). Only grid columns are selected.
    """
    base = _apply_filters(select(*_LIST_COLUMNS), body)
    count_stmt = _apply_filters(
        select(func.count(MlccsEquipmentMaster.id)),
        body,
    )
    total = int(session.scalar(count_stmt) or 0)

    offset = (body.page - 1) * body.page_size
    stmt = (
        base.order_by(
            MlccsEquipmentMaster.census_no.asc(),
            MlccsEquipmentMaster.nomen.asc(),
        )
        .offset(offset)
        .limit(body.page_size)
    )
    rows = session.execute(stmt).all()
    return MlccsSearchResponse(
        items=[_row_to_item(r) for r in rows],
        total=total,
        page=body.page,
        page_size=body.page_size,
    )
