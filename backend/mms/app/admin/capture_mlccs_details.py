"""Capture MLCCS Details — MMS Admin.

Persists to Oracle table MMS_MLCCS_EQUIPMENT_MASTER.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.deps import get_db_session, get_principal
from app.models import DomainValue, MlccsEquipmentMaster
from app.auth.principal import Principal
from app.utils.ids import next_int_id

router = APIRouter(
    prefix="/admin/capture-mlccs-details",
    tags=["admin: capture mlccs details"],
)


class GenerateCensusRequest(BaseModel):
    cos_section: str = Field(..., min_length=1)
    nomenclature: str = Field(..., min_length=1)


class LookupCensusRequest(BaseModel):
    census_no: str = Field(..., min_length=1)
    nomenclature: str | None = None


class CensusSuggestion(BaseModel):
    census_no: str
    nomenclature: str | None = None
    cos_section: str | None = None


class MlccsRecord(BaseModel):
    id: str | None = None
    cos_section: str | None = None
    census_no: str | None = None
    nomenclature: str | None = None
    auth_letter_no: str | None = None
    auth_date: date | None = None
    prf_group: str | None = None
    item_code: str | None = None
    cat_part_no: str | None = None
    accounting_unit: str | None = "NOS"
    brief_description: str | None = None
    item_status: str | None = "CUR"
    item_category: str | None = None
    class_of_eqpt: str | None = None
    country_of_origin: str | None = None
    nodal_dte: str | None = None
    eqpt_category: str | None = None
    incl_in_aih: str | None = None
    year_of_induction: str | None = None
    digest_category: str | None = None
    cost_rs: str | None = None
    manufacturing_agency: str | None = None
    ahsp_agency: str | None = None
    nato_stock_no: str | None = None
    def_catalogue_no: str | None = None
    material_no: str | None = None
    remarks: str | None = None


def _parse_cost(value: str | None) -> Decimal | None:
    if value is None or str(value).strip() == "":
        return None
    try:
        return Decimal(str(value).replace(",", "").strip())
    except (InvalidOperation, ValueError):
        raise HTTPException(status_code=400, detail=f"Invalid cost value: {value}")


def _to_record(row: MlccsEquipmentMaster) -> MlccsRecord:
    auth_date = row.auth_date.date() if isinstance(row.auth_date, datetime) else row.auth_date
    return MlccsRecord(
        id=row.id,
        cos_section=row.cos_sec,
        census_no=row.census_no,
        nomenclature=row.nomen,
        auth_letter_no=row.auth_lett_no,
        auth_date=auth_date,
        prf_group=row.prf_group,
        item_code=row.item_code,
        cat_part_no=row.cat_part_no,
        accounting_unit=row.au or "NOS",
        brief_description=row.brief_desc,
        item_status=row.item_status or "CUR",
        item_category=row.item_category,
        class_of_eqpt=row.class_category,
        country_of_origin=row.origin_country,
        nodal_dte=row.dte_category,
        eqpt_category=row.dte_eqpt_category,
        incl_in_aih=row.active_status,
        year_of_induction=row.induc_year,
        digest_category=row.digest_category,
        cost_rs=str(row.cost) if row.cost is not None else None,
        manufacturing_agency=row.manuf_agency,
        ahsp_agency=row.ahsp_agency,
        nato_stock_no=row.nato_stk_no,
        def_catalogue_no=row.def_cat_no_dcan,
        material_no=row.material_no,
        remarks=row.remarks,
    )


def _apply_body(
    row: MlccsEquipmentMaster,
    body: MlccsRecord,
    *,
    is_new: bool,
    actor: str,
) -> None:
    now = datetime.now()
    row.cos_sec = (body.cos_section or "")[:10] or None
    row.census_no = (body.census_no or "")[:9] or None
    row.nomen = body.nomenclature
    row.auth_lett_no = body.auth_letter_no
    row.auth_date = datetime.combine(body.auth_date, datetime.min.time()) if body.auth_date else None
    row.prf_group = body.prf_group
    row.item_code = body.item_code
    row.cat_part_no = body.cat_part_no
    row.au = body.accounting_unit
    row.brief_desc = body.brief_description
    row.item_status = (body.item_status or "CUR")[:3]
    row.item_category = body.item_category
    row.class_category = body.class_of_eqpt
    row.origin_country = body.country_of_origin
    row.dte_category = body.nodal_dte
    row.dte_eqpt_category = body.eqpt_category
    row.active_status = body.incl_in_aih
    row.induc_year = body.year_of_induction
    row.digest_category = body.digest_category
    row.cost = _parse_cost(body.cost_rs)
    row.manuf_agency = body.manufacturing_agency
    row.ahsp_agency = body.ahsp_agency
    row.nato_stk_no = body.nato_stock_no
    row.def_cat_no_dcan = body.def_catalogue_no
    row.material_no = (body.material_no or "")[:15] or None
    row.remarks = body.remarks
    if is_new:
        row.data_cr_by = actor[:25]
        row.data_cr_date = now
        row.op_status = "NEW"
    else:
        row.data_upd_by = actor[:25]
        row.data_upd_date = now


def _next_census_no(session: Session) -> str:
    """Allocate a 9-char census no like C900010 based on existing C9xxxxx values."""
    rows = session.scalars(
        select(MlccsEquipmentMaster.census_no).where(
            MlccsEquipmentMaster.census_no.is_not(None)
        )
    ).all()
    max_n = 899999
    for c in rows:
        if not c:
            continue
        digits = "".join(ch for ch in c if ch.isdigit())
        if digits:
            max_n = max(max_n, int(digits))
    nxt = max_n + 1
    candidate = f"C{nxt}"[:9]
    return candidate


@router.post("/generate", response_model=MlccsRecord)
def generate_census(
    body: GenerateCensusRequest,
    session: Session = Depends(get_db_session),
) -> MlccsRecord:
    """Add New Eqpt — generate a new census number and return a blank detail draft."""
    existing = session.scalar(
        select(MlccsEquipmentMaster).where(
            func.upper(MlccsEquipmentMaster.nomen) == body.nomenclature.strip().upper()
        )
    )
    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail=f"Nomenclature already exists with census no '{existing.census_no}'",
        )

    year = datetime.now().year
    census_no = _next_census_no(session)
    return MlccsRecord(
        cos_section=body.cos_section.strip()[:10],
        nomenclature=body.nomenclature.strip(),
        census_no=census_no,
        accounting_unit="NOS",
        item_status="CUR",
        year_of_induction=str(year),
    )


@router.post("/lookup", response_model=MlccsRecord)
def lookup_census(
    body: LookupCensusRequest,
    session: Session = Depends(get_db_session),
) -> MlccsRecord:
    """Modify Census — load an existing record by census number."""
    key = body.census_no.strip().upper()
    row = session.scalar(
        select(MlccsEquipmentMaster).where(
            func.upper(MlccsEquipmentMaster.census_no) == key
        )
    )
    if row is None:
        raise HTTPException(
            status_code=404,
            detail=f"No MLCCS record found for census no '{body.census_no}'",
        )
    if body.nomenclature and row.nomen:
        if row.nomen.strip().upper() != body.nomenclature.strip().upper():
            raise HTTPException(
                status_code=404,
                detail="Census no and nomenclature do not match",
            )
    return _to_record(row)


@router.post("/", response_model=MlccsRecord)
def save_mlccs(
    body: MlccsRecord,
    session: Session = Depends(get_db_session),
    principal: Principal = Depends(get_principal),
) -> MlccsRecord:
    """Create or update an MLCCS record in Oracle."""
    if not body.census_no:
        raise HTTPException(status_code=400, detail="census_no is required")
    if not body.nomenclature:
        raise HTTPException(status_code=400, detail="nomenclature is required")

    actor = principal.username
    key = body.census_no.strip().upper()
    row = session.scalar(
        select(MlccsEquipmentMaster).where(
            func.upper(MlccsEquipmentMaster.census_no) == key
        )
    )
    if row is None:
        row = MlccsEquipmentMaster(id=str(next_int_id(session, MlccsEquipmentMaster)))
        _apply_body(row, body, is_new=True, actor=actor)
        session.add(row)
    else:
        # Unique nomen: reject if another row already has this name
        clash = session.scalar(
            select(MlccsEquipmentMaster).where(
                func.upper(MlccsEquipmentMaster.nomen) == body.nomenclature.strip().upper(),
                MlccsEquipmentMaster.id != row.id,
            )
        )
        if clash is not None:
            raise HTTPException(
                status_code=409,
                detail=f"Nomenclature already used by census '{clash.census_no}'",
            )
        _apply_body(row, body, is_new=False, actor=actor)

    session.flush()
    return _to_record(row)


def _option_list(session: Session, domain: str) -> list[dict[str, str]]:
    # Display Order controls sequence within a domain (numeric-ish via LPAD).
    rows = session.scalars(
        select(DomainValue)
        .where(DomainValue.domain_name == domain)
        .order_by(
            func.lpad(func.nvl(DomainValue.disp_order, "9999"), 10, "0"),
            DomainValue.label_name,
        )
    ).all()
    return [
        {"value": r.code_value or "", "label": r.label_name or r.code_value or ""}
        for r in rows
        if r.code_value
    ]


def _distinct_column(session: Session, column: Any) -> list[dict[str, str]]:
    values = session.scalars(
        select(column).where(column.is_not(None)).distinct().order_by(column)
    ).all()
    return [{"value": str(v), "label": str(v)} for v in values if str(v).strip()]


@router.get("/suggest-cos", response_model=list[str])
def suggest_cos_section(
    q: str = "",
    session: Session = Depends(get_db_session),
) -> list[str]:
    """Typeahead for COS Section — distinct COS_SEC from MLCCS master."""
    term = q.strip().upper()
    stmt = (
        select(MlccsEquipmentMaster.cos_sec)
        .where(MlccsEquipmentMaster.cos_sec.is_not(None))
        .distinct()
        .order_by(MlccsEquipmentMaster.cos_sec)
    )
    if term:
        stmt = stmt.where(func.upper(MlccsEquipmentMaster.cos_sec).like(f"%{term}%"))
    values = session.scalars(stmt.limit(50)).all()
    return [str(v) for v in values if v and str(v).strip()]


@router.get("/suggest-census", response_model=list[CensusSuggestion])
def suggest_census(
    q: str = "",
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
            cos_section=r.cos_sec,
        )
        for r in rows
        if r.census_no
    ]


@router.get("/options")
def list_options(session: Session = Depends(get_db_session)) -> dict[str, list[dict[str, str]]]:
    """Dropdown option lists — domain values + distinct MLCCS columns."""
    return {
        "cos_section": _distinct_column(session, MlccsEquipmentMaster.cos_sec),
        "prf_group": _distinct_column(session, MlccsEquipmentMaster.prf_group),
        "item_code": _distinct_column(session, MlccsEquipmentMaster.item_code),
        "accounting_unit": _distinct_column(session, MlccsEquipmentMaster.au)
        or [{"value": "NOS", "label": "NOS"}, {"value": "EA", "label": "EA"}],
        "item_status": _distinct_column(session, MlccsEquipmentMaster.item_status)
        or [
            {"value": "CUR", "label": "CUR"},
            {"value": "ACT", "label": "ACT"},
            {"value": "OBS", "label": "OBS"},
        ],
        "item_category": _distinct_column(session, MlccsEquipmentMaster.item_category),
        "class_of_eqpt": _distinct_column(session, MlccsEquipmentMaster.class_category),
        "country_of_origin": _distinct_column(session, MlccsEquipmentMaster.origin_country),
        "nodal_dte": _distinct_column(session, MlccsEquipmentMaster.dte_category),
        "eqpt_category": _distinct_column(session, MlccsEquipmentMaster.dte_eqpt_category),
        "incl_in_aih": [
            {"value": "Y", "label": "Yes"},
            {"value": "N", "label": "No"},
        ],
        "digest_category": _distinct_column(session, MlccsEquipmentMaster.digest_category),
        "type_of_hldg": _option_list(session, "TYPE_OF_HLDG"),
        "type_of_eqpt": _option_list(session, "TYPE_OF_EQPT"),
        "service_status": _option_list(session, "SERVICE_STATUS"),
        "op_status": _option_list(session, "OP_STATUS"),
    }
