"""Gen EP Census — allocate census numbers and persist MMS_EP_MSTR."""

from __future__ import annotations

import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.deps import get_db_session, get_principal
from app.models import DomainValue, EpDomainMaster, EpMstr, EpSubDomain
from app.auth.principal import Principal
from app.utils.ids import next_int_id

router = APIRouter(
    prefix="/ep/gen-census",
    tags=["ep: gen census"],
)


class OptionOut(BaseModel):
    value: str
    label: str


def _option_list(session: Session, *domains: str) -> list[OptionOut]:
    for domain in domains:
        rows = session.scalars(
            select(DomainValue)
            .where(func.upper(DomainValue.domain_name) == domain.upper())
            .order_by(
                func.lpad(func.nvl(DomainValue.disp_order, "9999"), 10, "0"),
                DomainValue.label_name,
            )
        ).all()
        options = [
            OptionOut(value=r.code_value or "", label=r.label_name or r.code_value or "")
            for r in rows
            if r.code_value
        ]
        if options:
            return options
    return []



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
    auth_date: str = Field(..., min_length=1, max_length=10, description="DD-MM-YYYY")
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


def _next_census_no(
    session: Session,
    domain: EpDomainMaster,
    sub_domain: EpSubDomain,
) -> str:
    if not 0 <= domain.domain_id <= 99 or not 0 <= sub_domain.sub_domain_id <= 99:
        raise HTTPException(
            status_code=400,
            detail="Domain and Sub Domain IDs must be between 0 and 99",
        )

    prefix = f"EP{domain.domain_id:02d}{sub_domain.sub_domain_id:02d}"
    census_re = re.compile(rf"^{re.escape(prefix)}(\d{{4}})$", re.IGNORECASE)
    rows = session.scalars(
        select(EpMstr.census_no).where(
            EpMstr.domain_id == sub_domain.equipment_domain_id,
            EpMstr.sub_domain_id == sub_domain.id,
        )
    ).all()
    max_sequence = 0
    for raw in rows:
        if not raw:
            continue
        m = census_re.match(raw.strip())
        if m:
            max_sequence = max(max_sequence, int(m.group(1)))

    next_sequence = max_sequence + 1
    if next_sequence > 9999:
        raise HTTPException(
            status_code=409,
            detail=f"Census number sequence exhausted for {prefix}",
        )
    return f"{prefix}{next_sequence:04d}"


def _parse_auth_date(value: str) -> date:
    raw = value.strip()
    try:
        return datetime.strptime(raw, "%d-%m-%Y").date()
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid auth date '{value}'. Expected DD-MM-YYYY",
        ) from exc


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


@router.get("/options")
def list_options(
    session: Session = Depends(get_db_session),
) -> dict[str, list[OptionOut]]:
    return {
        "accounting_unit": _option_list(session, "ACCOUNTINGUNITS"),
        "item_status": _option_list(session, "ITEMSTATUS"),
        "item_category": _option_list(session, "MMSITEMSCATEGORY", "TYPE_OF_EQPT"),
        "class_of_equipment": _option_list(session, "MMSCLASSA"),
        "nodal_directorate": _option_list(session, "SPONSERDTE"),
        "digest_category": _option_list(session, "DIGESTCATEGORY"),
        "equipment_category": _option_list(session, "DTEEQPTCATEGORY"),
    }


@router.post("/generate", response_model=GenerateCensusOut)
def generate_census(
    body: GenerateCensusIn,
    session: Session = Depends(get_db_session),
) -> GenerateCensusOut:
    sub = session.get(EpSubDomain, body.sub_domain_id.strip())
    if sub is None:
        raise HTTPException(status_code=400, detail="Invalid Sub Domain selected")

    domain = session.get(EpDomainMaster, sub.equipment_domain_id)
    if domain is None:
        raise HTTPException(status_code=400, detail="Sub Domain has no valid Domain")

    return GenerateCensusOut(
        census_no=_next_census_no(session, domain, sub),
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

    opstatus_approved = session.scalar(
        select(DomainValue).where(
            func.upper(DomainValue.domain_name).in_(["OPSTATUS", "OP_STATUS"]),
            or_(
                func.upper(func.trim(DomainValue.code_value)) == "APPROVED",
                func.upper(func.trim(DomainValue.label_name)) == "APPROVED",
            ),
        )
    )
    if opstatus_approved is None or not opstatus_approved.code_value:
        raise HTTPException(
            status_code=400,
            detail="OPSTATUS domain has no APPROVED value configured",
        )

    next_id = next_int_id(session, EpMstr)

    now = datetime.now()
    row = EpMstr(
        id=str(next_id),
        domain_id=sub.equipment_domain_id,
        sub_domain_id=sub.id,
        census_no=census_no,
        auth_letter_no=body.auth_letter_no.strip(),
        auth_date=datetime.combine(_parse_auth_date(body.auth_date), datetime.min.time()),
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
        status=opstatus_approved.code_value.strip()[:10],
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

