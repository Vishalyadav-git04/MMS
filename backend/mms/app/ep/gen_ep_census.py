"""Gen EP Census — allocate census numbers and persist MMS_EP_MSTR."""

from __future__ import annotations

import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.deps import get_db_session, get_principal
from app.models import EpMstr, EpSubDomain
from core.auth.principal import Principal

router = APIRouter(
    prefix="/ep/gen-census",
    tags=["ep: gen census"],
)

_CENSUS_RE = re.compile(r"^EPC(\d+)$", re.IGNORECASE)


class GenerateCensusIn(BaseModel):
    sub_domain_id: str = Field(..., min_length=1, max_length=36)


class GenerateCensusOut(BaseModel):
    census_no: str
    sub_domain_id: str
    sub_domain_name: str
    domain_id: str


class EpCensusIn(BaseModel):
    sub_domain_id: str = Field(..., min_length=1, max_length=36)
    census_no: str = Field(..., min_length=1, max_length=30)
    auth_letter_no: str = Field(..., min_length=1, max_length=100)
    auth_date: date
    cat_part_no: str = Field(..., min_length=1, max_length=100)
    accounting_unit: str = Field(..., min_length=1, max_length=2000)
    brief_description: str = Field(..., min_length=1, max_length=2000)
    item_status: str = Field(..., min_length=1, max_length=10)
    item_category: str = Field(..., min_length=1, max_length=10)
    class_of_equipment: str = Field(..., min_length=1, max_length=10)
    country: str | None = Field(None, max_length=100)
    nodal_directorate: str | None = Field(None, max_length=10)
    equipment_category: str | None = Field(None, max_length=10)
    year_of_induction: str | None = None
    digest_category: str | None = Field(None, max_length=10)
    cost: str | None = None
    manufacturing_agency: str | None = Field(None, max_length=255)
    ahsp_agency: str | None = Field(None, max_length=255)
    nato_stock_no: str | None = Field(None, max_length=100)
    defence_catalogue_no: str | None = Field(None, max_length=100)
    remarks: str | None = Field(None, max_length=1000)


class EpCensusOut(BaseModel):
    id: str
    census_no: str
    sub_domain_id: str
    domain_id: str
    status: str | None = None


def _next_census_no(session: Session) -> str:
    rows = session.scalars(select(EpMstr.census_no)).all()
    max_n = 399999
    for raw in rows:
        if not raw:
            continue
        m = _CENSUS_RE.match(raw.strip())
        if m:
            max_n = max(max_n, int(m.group(1)))
    return f"EPC{max_n + 1}"


def _parse_cost(value: str | None) -> Decimal | None:
    if value is None or str(value).strip() == "":
        return None
    try:
        return Decimal(str(value).replace(",", "").strip())
    except (InvalidOperation, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid cost value: {value}") from exc


def _parse_year(value: str | None) -> int | None:
    if value is None or str(value).strip() == "":
        return None
    try:
        return int(str(value).strip())
    except ValueError as exc:
        raise HTTPException(
            status_code=400, detail=f"Invalid year of induction: {value}"
        ) from exc


@router.post("/generate", response_model=GenerateCensusOut)
def generate_census(
    body: GenerateCensusIn,
    session: Session = Depends(get_db_session),
) -> GenerateCensusOut:
    sub = session.get(EpSubDomain, body.sub_domain_id.strip())
    if sub is None:
        raise HTTPException(status_code=400, detail="Invalid Sub Domain selected")

    return GenerateCensusOut(
        census_no=_next_census_no(session),
        sub_domain_id=sub.id,
        sub_domain_name=sub.sub_domain_name,
        domain_id=sub.equipment_domain_id,
    )


@router.post("/", response_model=EpCensusOut)
def save_census(
    body: EpCensusIn,
    session: Session = Depends(get_db_session),
    principal: Principal = Depends(get_principal),
) -> EpCensusOut:
    sub = session.get(EpSubDomain, body.sub_domain_id.strip())
    if sub is None:
        raise HTTPException(status_code=400, detail="Invalid Sub Domain selected")

    census_no = body.census_no.strip().upper()
    clash = session.scalar(select(EpMstr).where(func.upper(EpMstr.census_no) == census_no))
    if clash is not None:
        raise HTTPException(
            status_code=409,
            detail=f"Census No '{census_no}' already exists",
        )

    ids = session.scalars(select(EpMstr.id)).all()
    next_id = (
        max((int(i) for i in ids if i is not None and str(i).isdigit()), default=0) + 1
    )

    now = datetime.now()
    row = EpMstr(
        id=str(next_id),
        domain_id=sub.equipment_domain_id,
        sub_domain_id=sub.id,
        census_no=census_no,
        auth_letter_no=body.auth_letter_no.strip(),
        auth_date=datetime.combine(body.auth_date, datetime.min.time()),
        cat_part_no=body.cat_part_no.strip(),
        brief_description=body.brief_description.strip(),
        accounting_unit=body.accounting_unit.strip()[:2000],
        item_status=body.item_status.strip()[:10],
        item_category=body.item_category.strip()[:10],
        class_of_equipment=body.class_of_equipment.strip()[:10],
        nodal_directorate=(body.nodal_directorate or "").strip()[:10] or None,
        digest_category=(body.digest_category or "").strip()[:10] or None,
        equipment_category=(body.equipment_category or "").strip()[:10] or None,
        country=(body.country or "").strip()[:100] or None,
        year_of_induction=_parse_year(body.year_of_induction),
        cost=_parse_cost(body.cost),
        manufacturing_agency=(body.manufacturing_agency or "").strip()[:255] or None,
        ahsp_agency=(body.ahsp_agency or "").strip()[:255] or None,
        nato_stock_no=(body.nato_stock_no or "").strip()[:100] or None,
        defence_catalogue_no=(body.defence_catalogue_no or "").strip()[:100] or None,
        status="ACTIVE",
        remarks=(body.remarks or "").strip()[:1000] or None,
        created_by=principal.username,
        created_date=now,
    )
    session.add(row)
    session.flush()
    return EpCensusOut(
        id=row.id,
        census_no=row.census_no,
        sub_domain_id=row.sub_domain_id,
        domain_id=row.domain_id,
        status=row.status,
    )
