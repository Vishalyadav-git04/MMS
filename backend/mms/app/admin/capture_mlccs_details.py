"""Capture MLCCS Details — MMS Admin.

Master List of Controlled and Census Stores. Supports Add New Eqpt
(generate census) and Modify Census (lookup + update) flows.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

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


class MlccsRecord(BaseModel):
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
    remarks: str | None = None


# In-memory sample store until Oracle models/services are wired.
_SAMPLE: dict[str, dict[str, Any]] = {
    "CN-2026-0001": {
        "cos_section": "COS-01",
        "census_no": "CN-2026-0001",
        "nomenclature": "Rifle 5.56 mm",
        "auth_letter_no": "AUTH/2024/112",
        "auth_date": date(2024, 6, 15),
        "prf_group": "GRP-A",
        "item_code": "IC-1001",
        "cat_part_no": "CP-556-01",
        "accounting_unit": "NOS",
        "brief_description": "Standard issue infantry rifle",
        "item_status": "CUR",
        "item_category": "CAT-1",
        "class_of_eqpt": "A",
        "country_of_origin": "IND",
        "nodal_dte": "DTE-1",
        "eqpt_category": "EQ-1",
        "incl_in_aih": "Y",
        "year_of_induction": "2024",
        "digest_category": "DIG-1",
        "cost_rs": "45000",
        "manufacturing_agency": "OFB",
        "ahsp_agency": "AHSP-North",
        "nato_stock_no": "1005-00-000-0001",
        "def_catalogue_no": "DCAN-556",
        "remarks": "Sample prefilled record for modify flow",
    }
}


@router.post("/generate", response_model=MlccsRecord)
def generate_census(body: GenerateCensusRequest) -> MlccsRecord:
    """Add New Eqpt — generate a new census number and return a blank detail draft."""
    year = datetime.now().year
    seq = f"{datetime.now().strftime('%H%M%S')}"
    census_no = f"CN-{year}-{seq}"
    return MlccsRecord(
        cos_section=body.cos_section,
        nomenclature=body.nomenclature,
        census_no=census_no,
        accounting_unit="NOS",
        item_status="CUR",
        year_of_induction=str(year),
    )


@router.post("/lookup", response_model=MlccsRecord)
def lookup_census(body: LookupCensusRequest) -> MlccsRecord:
    """Modify Census — load an existing record by census number."""
    key = body.census_no.strip().upper()
    record = _SAMPLE.get(key)
    if record is None:
        raise HTTPException(
            status_code=404,
            detail=f"No MLCCS record found for census no '{body.census_no}'",
        )
    data = dict(record)
    if body.nomenclature:
        data["nomenclature"] = body.nomenclature
    return MlccsRecord(**data)


@router.post("/", response_model=MlccsRecord)
def save_mlccs(body: MlccsRecord) -> MlccsRecord:
    """Create or update an MLCCS record (stub — persists to in-memory sample)."""
    if not body.census_no:
        raise HTTPException(status_code=400, detail="census_no is required")
    key = body.census_no.strip().upper()
    _SAMPLE[key] = body.model_dump()
    return body


@router.get("/options")
def list_options() -> dict[str, list[dict[str, str]]]:
    """Dropdown option lists for the MLCCS detail form."""
    return {
        "prf_group": [
            {"value": "GRP-A", "label": "Group A"},
            {"value": "GRP-B", "label": "Group B"},
            {"value": "GRP-C", "label": "Group C"},
        ],
        "item_code": [
            {"value": "IC-1001", "label": "IC-1001"},
            {"value": "IC-1002", "label": "IC-1002"},
            {"value": "IC-2001", "label": "IC-2001"},
        ],
        "accounting_unit": [
            {"value": "NOS", "label": "NOS"},
            {"value": "SET", "label": "SET"},
            {"value": "KG", "label": "KG"},
        ],
        "item_status": [
            {"value": "CUR", "label": "CUR"},
            {"value": "OBS", "label": "OBS"},
            {"value": "NEW", "label": "NEW"},
        ],
        "item_category": [
            {"value": "CAT-1", "label": "Category 1"},
            {"value": "CAT-2", "label": "Category 2"},
        ],
        "class_of_eqpt": [
            {"value": "A", "label": "Class A"},
            {"value": "B", "label": "Class B"},
            {"value": "C", "label": "Class C"},
        ],
        "country_of_origin": [
            {"value": "IND", "label": "India"},
            {"value": "USA", "label": "USA"},
            {"value": "RUS", "label": "Russia"},
            {"value": "FRA", "label": "France"},
        ],
        "nodal_dte": [
            {"value": "DTE-1", "label": "Nodal Dte 1"},
            {"value": "DTE-2", "label": "Nodal Dte 2"},
        ],
        "eqpt_category": [
            {"value": "EQ-1", "label": "Equipment Cat 1"},
            {"value": "EQ-2", "label": "Equipment Cat 2"},
        ],
        "incl_in_aih": [
            {"value": "Y", "label": "Yes"},
            {"value": "N", "label": "No"},
        ],
        "digest_category": [
            {"value": "DIG-1", "label": "Digest 1"},
            {"value": "DIG-2", "label": "Digest 2"},
        ],
    }
