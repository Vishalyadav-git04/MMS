"""Gen EP Census — allocate census numbers and persist MMS_EP_MSTR using Native SQL."""

from __future__ import annotations

import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.deps import get_db_session, get_principal
from app.auth.principal import Principal
from app.db.native_utils import execute_sql, fetch_all, fetch_one
from app.utils.ids import get_by_id, next_int_id

router = APIRouter(
    prefix="/ep/gen-census",
    tags=["ep: gen census"],
)


class OptionOut(BaseModel):
    value: str
    label: str


def _option_list(session: Session, *domains: str) -> list[OptionOut]:
    for domain in domains:
        sql = """
            SELECT code_value, label_name
            FROM MMS_DOMAIN_VALUES
            WHERE REPLACE(UPPER(domain_name), '_', '') = :dname
            ORDER BY LPAD(NVL(disp_order, '9999'), 10, '0'), label_name
        """
        rows = fetch_all(session, sql, {"dname": domain.replace("_", "").upper()})
        options = [
            OptionOut(
                value=str(r.get("code_value") or ""),
                label=str(r.get("label_name") or r.get("code_value") or ""),
            )
            for r in rows
            if r.get("code_value")
        ]
        if options:
            return options
    return []


class GenerateCensusIn(BaseModel):
    sub_domain_id: str | int = Field(...)


class GenerateCensusOut(BaseModel):
    census_no: str
    sub_domain_id: str | int
    sub_domain_name: str
    domain_id: str | int


class EpCensusIn(BaseModel):
    sub_domain_id: str | int = Field(...)
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
    id: str | int
    census_no: str
    sub_domain_id: str | int
    domain_id: str | int
    status: str | None = None


def _next_census_no(
    session: Session,
    domain: dict,
    sub_domain: dict,
) -> str:
    dom_id_val = str(domain.get("domain_id") if domain.get("domain_id") is not None else "1")
    sub_id_val = str(sub_domain.get("sub_domain_id") if sub_domain.get("sub_domain_id") is not None else "1")
    dom_num = int(dom_id_val) if dom_id_val.isdigit() else 1
    sub_num = int(sub_id_val) if sub_id_val.isdigit() else 1

    prefix = f"EP{dom_num:02d}{sub_num:02d}"
    census_re = re.compile(rf"^{re.escape(prefix)}(\d{{4}})$", re.IGNORECASE)

    sql = """
        SELECT census_no FROM MMS_EP_MSTR
        WHERE (domain_id = :did OR TO_CHAR(domain_id) = :did)
        AND (sub_domain_id = :sid OR TO_CHAR(sub_domain_id) = :sid)
    """
    rows = fetch_all(
        session,
        sql,
        {
            "did": str(sub_domain.get("equipment_domain_id")),
            "sid": str(sub_domain.get("id")),
        },
    )
    max_sequence = 0
    for r in rows:
        raw = r.get("census_no")
        if not raw:
            continue
        m = census_re.match(str(raw).strip())
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
        "item_category": _option_list(session, "MMSITEMSCATEGORY", "TYPEOFEQPT"),
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
    sub = get_by_id(session, "MMS_EP_SUB_DOMAIN", body.sub_domain_id)
    if sub is None:
        raise HTTPException(status_code=400, detail="Invalid Sub Domain selected")

    domain = get_by_id(session, "MMS_EP_DOMAIN_MASTER", sub.get("equipment_domain_id"))
    if domain is None:
        raise HTTPException(status_code=400, detail="Sub Domain has no valid Domain")

    return GenerateCensusOut(
        census_no=_next_census_no(session, domain, sub),
        sub_domain_id=str(sub.get("id")),
        sub_domain_name=str(sub.get("sub_domain_name")),
        domain_id=str(sub.get("equipment_domain_id")),
    )


@router.post("/", response_model=EpCensusOut)
def save_census(
    body: EpCensusIn,
    session: Session = Depends(get_db_session),
    principal: Principal = Depends(get_principal),
) -> EpCensusOut:
    sub = get_by_id(session, "MMS_EP_SUB_DOMAIN", body.sub_domain_id)
    if sub is None:
        raise HTTPException(status_code=400, detail="Invalid Sub Domain selected")

    census_no = body.census_no.strip().upper()
    clash = fetch_one(session, "SELECT id FROM MMS_EP_MSTR WHERE UPPER(census_no) = :c", {"c": census_no})
    if clash is not None:
        raise HTTPException(
            status_code=409,
            detail=f"Census No '{census_no}' already exists",
        )

    opstatus_approved = fetch_one(
        session,
        """
        SELECT code_value FROM MMS_DOMAIN_VALUES
        WHERE UPPER(domain_name) = 'OPSTATUS'
        AND (UPPER(TRIM(code_value)) = 'APPROVED' OR UPPER(TRIM(label_name)) = 'APPROVED')
        """,
    )
    code_val = opstatus_approved.get("code_value") if opstatus_approved else None
    if not code_val:
        raise HTTPException(
            status_code=400,
            detail="OPSTATUS domain has no APPROVED value configured",
        )

    next_id = next_int_id(session, "MMS_EP_MSTR")

    now = datetime.now()
    params = {
        "id": str(next_id),
        "domain_id": str(sub.get("equipment_domain_id")),
        "sub_domain_id": str(sub.get("id")),
        "census_no": census_no,
        "auth_letter_no": body.auth_letter_no.strip(),
        "auth_date": datetime.combine(_parse_auth_date(body.auth_date), datetime.min.time()),
        "cat_part_no": body.cat_part_no.strip(),
        "brief_description": body.brief_description.strip(),
        "accounting_unit": body.accounting_unit.strip()[:2000],
        "item_status": body.item_status.strip()[:10],
        "item_category": body.item_category.strip()[:10],
        "class_of_equipment": body.class_of_equipment.strip()[:10],
        "nodal_directorate": (body.nodal_directorate or "").strip()[:10] or None,
        "digest_category": (body.digest_category or "").strip()[:10] or None,
        "equipment_category": (body.equipment_category or "").strip()[:10] or None,
        "country": (body.country or "").strip()[:100] or None,
        "year_of_induction": _parse_year(body.year_of_induction),
        "cost": _parse_cost(body.cost),
        "manufacturing_agency": (body.manufacturing_agency or "").strip()[:255] or None,
        "ahsp_agency": (body.ahsp_agency or "").strip()[:255] or None,
        "nato_stock_no": (body.nato_stock_no or "").strip()[:100] or None,
        "defence_catalogue_no": (body.defence_catalogue_no or "").strip()[:100] or None,
        "status": str(code_val).strip()[:10],
        "remarks": (body.remarks or "").strip()[:1000] or None,
        "created_by": principal.username,
        "created_date": now,
    }

    insert_sql = """
        INSERT INTO MMS_EP_MSTR (
            id, domain_id, sub_domain_id, census_no, auth_letter_no, auth_date,
            cat_part_no, brief_description, accounting_unit, item_status, item_category,
            class_of_equipment, nodal_directorate, digest_category, equipment_category,
            country, year_of_induction, cost, manufacturing_agency, ahsp_agency,
            nato_stock_no, defence_catalogue_no, status, remarks, created_by, created_date
        ) VALUES (
            :id, :domain_id, :sub_domain_id, :census_no, :auth_letter_no, :auth_date,
            :cat_part_no, :brief_description, :accounting_unit, :item_status, :item_category,
            :class_of_equipment, :nodal_directorate, :digest_category, :equipment_category,
            :country, :year_of_induction, :cost, :manufacturing_agency, :ahsp_agency,
            :nato_stock_no, :defence_catalogue_no, :status, :remarks, :created_by, :created_date
        )
    """
    execute_sql(session, insert_sql, params)

    return EpCensusOut(
        id=params["id"],
        census_no=params["census_no"],
        sub_domain_id=params["sub_domain_id"],
        domain_id=params["domain_id"],
        status=params["status"],
    )
