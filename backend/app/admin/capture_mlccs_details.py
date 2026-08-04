"""Capture MLCCS Details — MMS Admin.

Persists to Oracle table MMS_MLCCS_EQUIPMENT_MASTER.
"""

from __future__ import annotations

import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.deps import get_db_session, get_principal
from app.models import DomainValue, MlccsEquipmentMaster, PrfGrpMstr
from app.auth.principal import Principal
from app.utils.ids import next_int_id

# COS Section format: letter A–Z, hyphen, number 01–99 (e.g. A-01, C-08, Z-99)
_COS_SEC_RE = re.compile(r"^[A-Z]-(0[1-9]|[1-9][0-9])$")


def _normalize_cos_section(value: str) -> str:
    return value.strip().upper()


def _validate_cos_section(value: str) -> str:
    cos = _normalize_cos_section(value)
    if not _COS_SEC_RE.match(cos):
        raise HTTPException(
            status_code=400,
            detail="COS Section must be like A-01 (letter A–Z, hyphen, 01–99)",
        )
    return cos

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
    accounting_unit: str | None = None
    brief_description: str | None = None
    item_status: str | None = None
    item_category: str | None = None
    class_of_eqpt: str | None = None
    country_of_origin: str | None = None
    nodal_dte: str | None = None
    eqpt_category: str | None = None
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


def _next_census_seq_no(session: Session) -> float:
    """Global CENSUS_SEQ_NO counter for MMS_MLCCS_EQUIPMENT_MASTER."""
    current = session.scalar(select(func.max(MlccsEquipmentMaster.census_seq_no)))
    return float(current or 0) + 1.0


def _next_item_seq_no(session: Session) -> str:
    """Global ITEM_SEQ_NO counter for MMS_MLCCS_EQUIPMENT_MASTER."""
    values = session.scalars(
        select(MlccsEquipmentMaster.item_seq_no).where(
            MlccsEquipmentMaster.item_seq_no.is_not(None)
        )
    ).all()
    max_seq = 0
    for raw in values:
        s = str(raw).strip()
        if s.isdigit():
            max_seq = max(max_seq, int(s))
    return str(max_seq + 1)


def _resolve_prf_code(
    session: Session,
    cos_section: str | None,
    prf_group: str | None,
) -> str | None:
    """Derive PRF_CODE from MMS_PRF_GRP_MSTR for the selected COS + PRF Group."""
    cos = (cos_section or "").strip().upper()
    grp = (prf_group or "").strip()
    if not cos or not grp:
        return None
    code = session.scalar(
        select(PrfGrpMstr.prf_code)
        .where(
            func.upper(PrfGrpMstr.cos_sec) == cos,
            func.upper(PrfGrpMstr.prf_grp) == grp.upper(),
        )
        .limit(1)
    )
    if code is None:
        return None
    return str(code)[:8]


def _domain_rows(session: Session, domain: str) -> list[DomainValue]:
    return list(
        session.scalars(
            select(DomainValue).where(
                func.replace(func.upper(DomainValue.domain_name), "_", "")
                == domain.replace("_", "").upper()
            )
        ).all()
    )


def _domain_code(
    session: Session,
    domain: str,
    submitted: str | None,
    *,
    max_len: int | None = None,
) -> str | None:
    """Resolve submitted UI value to CODE_VALUE (accepts code or label)."""
    if submitted is None:
        return None
    val = submitted.strip()
    if not val:
        return None
    rows = _domain_rows(session, domain)
    upper = val.upper()
    for r in rows:
        code = (r.code_value or "").strip()
        if code and code.upper() == upper:
            return code[:max_len] if max_len else code
    for r in rows:
        code = (r.code_value or "").strip()
        if not code:
            continue
        if (r.label_name or "").strip().upper() == upper:
            return code[:max_len] if max_len else code
        if (r.label_short or "").strip().upper() == upper:
            return code[:max_len] if max_len else code
    # Unknown to domain master — keep as typed (trimmed)
    return val[:max_len] if max_len else val


def _domain_code_by_label(
    session: Session,
    domain: str,
    preferred_label: str,
) -> str | None:
    """Default CODE_VALUE for a preferred LABEL_NAME (e.g. NOS / CUR)."""
    want = preferred_label.strip().upper()
    if not want:
        return None
    for r in _domain_rows(session, domain):
        code = (r.code_value or "").strip()
        if not code:
            continue
        if (r.label_name or "").strip().upper() == want:
            return code
        if (r.label_short or "").strip().upper() == want:
            return code
        # Also allow preferred text to already be the code
        if code.upper() == want:
            return code
    return None


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
        accounting_unit=row.au,
        brief_description=row.brief_desc,
        item_status=row.item_status,
        item_category=row.item_category,
        class_of_eqpt=row.class_category,
        country_of_origin=row.origin_country,
        nodal_dte=row.dte_category,
        eqpt_category=row.dte_eqpt_category,
        year_of_induction=row.induc_year,
        digest_category=row.digest_category,
        cost_rs=str(row.cost) if row.cost is not None else None,
        manufacturing_agency=row.manuf_agency,
        ahsp_agency=row.ahsp_agency,
        nato_stock_no=row.nato_stk_no,
        def_catalogue_no=row.def_cat_no_dcan,
        material_no=row.material_no,
        remarks=row.spl_remarks or row.remarks,
    )


def _apply_body(
    row: MlccsEquipmentMaster,
    body: MlccsRecord,
    *,
    is_new: bool,
    actor: str,
    session: Session,
) -> None:
    now = datetime.now()
    cos = (body.cos_section or "")[:10] or None
    prf_group = body.prf_group

    row.req_tr_id = None
    row.auth_lett_no = body.auth_letter_no
    row.auth_date = (
        datetime.combine(body.auth_date, datetime.min.time()) if body.auth_date else None
    )
    row.cos_sec = cos
    row.prf_code = _resolve_prf_code(session, cos, prf_group)
    row.prf_group = prf_group
    row.cat_part_no = body.cat_part_no
    row.census_no = (body.census_no or "")[:9] or None
    row.nomen = body.nomenclature
    row.brief_desc = body.brief_description
    row.au = _domain_code(session, "ACCOUNTINGUNITS", body.accounting_unit)
    row.item_status = _domain_code(
        session, "ITEMSTATUS", body.item_status or "CUR", max_len=3
    )
    row.item_category = _domain_code(session, "TYPEOFEQPT", body.item_category)
    row.origin_country = body.country_of_origin
    row.manuf_agency = body.manufacturing_agency
    row.ahsp_agency = body.ahsp_agency
    row.induc_year = body.year_of_induction
    row.nato_stk_no = body.nato_stock_no
    row.def_cat_no_dcan = body.def_catalogue_no
    row.ces_no = None
    row.upload_file_name = None
    row.spl_remarks = body.remarks
    row.remarks = None
    row.op_status = "1"
    row.class_category = _domain_code(session, "MMSCLASSA", body.class_of_eqpt)
    row.dte_category = _domain_code(session, "SPONSERDTE", body.nodal_dte)
    row.active_status = "1"
    row.item_code = body.item_code
    row.digest_category = _domain_code(session, "DIGESTCATEGORY", body.digest_category)
    row.eqpt_priority = None
    row.spl_dte = None
    row.roleid = None
    row.dte_eqpt_category = _domain_code(
        session, "DTEEQPTCATEGORY", body.eqpt_category
    )
    row.cost = _parse_cost(body.cost_rs)
    row.material_no = (body.material_no or "")[:15] or None

    if is_new:
        row.census_seq_no = _next_census_seq_no(session)
        row.item_seq_no = _next_item_seq_no(session)
        row.data_cr_by = actor[:25]
        row.data_cr_date = now
        row.data_upd_by = None
        row.data_upd_date = None
    else:
        row.data_upd_by = actor[:25]
        row.data_upd_date = now


def _encode_cos_sec(cos_section: str) -> str:
    """Map COS_SEC to 4 digits: A-01→0101, B-01→0201, A-03→0103 (A=01 … Z=26)."""
    letter, num = cos_section.split("-", 1)
    return f"{ord(letter) - ord('A') + 1:02d}{num}"


def _next_sequence_for_cos(session: Session, cos_prefix: str) -> int:
    """Next 4-digit sequence for this COS prefix from MMS_MLCCS_EQUIPMENT_MASTER (starts at 0001)."""
    rows = session.scalars(
        select(MlccsEquipmentMaster.census_no).where(
            MlccsEquipmentMaster.census_no.is_not(None),
            func.upper(MlccsEquipmentMaster.census_no).like(f"{cos_prefix}%"),
        )
    ).all()
    max_seq = 0
    for raw in rows:
        c = (raw or "").strip().upper()
        if len(c) < 8 or c[:4] != cos_prefix:
            continue
        seq_part = c[4:8]
        if seq_part.isdigit():
            max_seq = max(max_seq, int(seq_part))
    nxt = max_seq + 1  # first under a COS is 0001
    if nxt > 9999:
        raise HTTPException(
            status_code=400,
            detail=f"Sequence exhausted for COS prefix {cos_prefix}",
        )
    return nxt


def _weighted_remainder(eight_digits: str) -> int:
    """Sum digit×weight (9..2), then remainder mod 11."""
    if len(eight_digits) != 8 or not eight_digits.isdigit():
        raise HTTPException(status_code=500, detail="Invalid census body for check digit")
    weights = (9, 8, 7, 6, 5, 4, 3, 2)
    total = sum(int(d) * w for d, w in zip(eight_digits, weights, strict=True))
    return total % 11


def _check_digit_letter(session: Session, remainder: int) -> str:
    """Resolve check letter from MMS_DOMAIN_VALUES (DOMAIN_NAME=MMSCHECKDIGIT) via CODE_VALUE → LABEL_NAME."""
    rows = session.scalars(
        select(DomainValue).where(
            func.upper(DomainValue.domain_name) == "MMSCHECKDIGIT"
        )
    ).all()
    for row in rows:
        code = (row.code_value or "").strip()
        if not code:
            continue
        try:
            matched = int(code) == remainder
        except ValueError:
            matched = code == str(remainder)
        if not matched:
            continue
        label = (row.label_name or "").strip()
        if not label:
            raise HTTPException(
                status_code=500,
                detail=f"MMSCHECKDIGIT code_value '{code}' has empty LABEL_NAME",
            )
        # 9th census char is a single alphabet
        return label[0].upper()

    raise HTTPException(
        status_code=500,
        detail=(
            f"No MMSCHECKDIGIT mapping for remainder {remainder} "
            "(DOMAIN_NAME=MMSCHECKDIGIT, CODE_VALUE → LABEL_NAME)"
        ),
    )


def _next_census_no(session: Session, cos_section: str) -> str:
    """Build 9-char census: COS(4) + sequence(4) + check letter(1).

    Sequence is the next value under this COS in MMS_MLCCS_EQUIPMENT_MASTER (first = 0001).
    Check letter = LABEL_NAME from MMS_DOMAIN_VALUES where DOMAIN_NAME=MMSCHECKDIGIT
    and CODE_VALUE matches the weighted-sum remainder ÷ 11.
    """
    cos_prefix = _encode_cos_sec(cos_section)
    seq = _next_sequence_for_cos(session, cos_prefix)
    eight = f"{cos_prefix}{seq:04d}"
    remainder = _weighted_remainder(eight)
    check = _check_digit_letter(session, remainder)
    return f"{eight}{check}"


@router.post("/generate", response_model=MlccsRecord)
def generate_census(
    body: GenerateCensusRequest,
    session: Session = Depends(get_db_session),
) -> MlccsRecord:
    """Add New Eqpt — generate a new census number and return a blank detail draft."""
    cos_section = _validate_cos_section(body.cos_section)
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
    census_no = _next_census_no(session, cos_section)
    au_code = _domain_code_by_label(session, "ACCOUNTINGUNITS", "NOS")
    status_code = _domain_code_by_label(session, "ITEMSTATUS", "CUR")
    return MlccsRecord(
        cos_section=cos_section,
        nomenclature=body.nomenclature.strip(),
        census_no=census_no,
        accounting_unit=au_code,
        item_status=status_code,
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
    if body.cos_section:
        body.cos_section = _validate_cos_section(body.cos_section)

    actor = principal.username
    key = body.census_no.strip().upper()
    row = session.scalar(
        select(MlccsEquipmentMaster).where(
            func.upper(MlccsEquipmentMaster.census_no) == key
        )
    )
    if row is None:
        row = MlccsEquipmentMaster(id=str(next_int_id(session, MlccsEquipmentMaster)))
        _apply_body(row, body, is_new=True, actor=actor, session=session)
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
        _apply_body(row, body, is_new=False, actor=actor, session=session)

    session.flush()
    return _to_record(row)


def _option_list(session: Session, domain: str) -> list[dict[str, str]]:
    """Options from MMS_DOMAIN_VALUES: value=CODE_VALUE, label=LABEL_NAME."""
    rows = session.scalars(
        select(DomainValue)
        .where(
            func.replace(func.upper(DomainValue.domain_name), "_", "")
            == domain.replace("_", "").upper()
        )
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
    """Typeahead for COS Section — distinct COS_SEC from MMS_PRF_GRP_MSTR."""
    term = q.strip().upper()
    stmt = (
        select(PrfGrpMstr.cos_sec)
        .where(PrfGrpMstr.cos_sec.is_not(None))
        .distinct()
        .order_by(PrfGrpMstr.cos_sec)
    )
    if term:
        stmt = stmt.where(func.upper(PrfGrpMstr.cos_sec).like(f"%{term}%"))
    values = session.scalars(stmt.limit(50)).all()
    return [str(v) for v in values if v and str(v).strip()]


class OptionItem(BaseModel):
    value: str
    label: str


@router.get("/prf-groups", response_model=list[OptionItem])
def list_prf_groups(
    cos_section: str,
    session: Session = Depends(get_db_session),
) -> list[OptionItem]:
    """PRF groups under a COS Section from MMS_PRF_GRP_MSTR."""
    cos = _validate_cos_section(cos_section)
    rows = session.execute(
        select(PrfGrpMstr.prf_code, PrfGrpMstr.prf_grp)
        .where(func.upper(PrfGrpMstr.cos_sec) == cos)
        .distinct()
        .order_by(PrfGrpMstr.prf_code, PrfGrpMstr.prf_grp)
    ).all()
    seen: set[str] = set()
    out: list[OptionItem] = []
    for prf_code, prf_grp in rows:
        name = (prf_grp or "").strip()
        if not name or name in seen:
            continue
        seen.add(name)
        code = str(prf_code) if prf_code is not None else ""
        label = f"{code} — {name}" if code else name
        out.append(OptionItem(value=name, label=label))
    return out


@router.get("/item-codes", response_model=list[OptionItem])
def list_item_codes(
    cos_section: str,
    prf_group: str,
    session: Session = Depends(get_db_session),
) -> list[OptionItem]:
    """Item codes under a COS Section + PRF Group from MMS_PRF_GRP_MSTR."""
    cos = _validate_cos_section(cos_section)
    grp = prf_group.strip()
    if not grp:
        raise HTTPException(status_code=400, detail="prf_group is required")
    rows = session.execute(
        select(PrfGrpMstr.item_code, PrfGrpMstr.item_name)
        .where(
            func.upper(PrfGrpMstr.cos_sec) == cos,
            func.upper(PrfGrpMstr.prf_grp) == grp.upper(),
        )
        .distinct()
        .order_by(PrfGrpMstr.item_code)
    ).all()
    out: list[OptionItem] = []
    for item_code, item_name in rows:
        if item_code is None:
            continue
        code = str(item_code)
        name = (item_name or "").strip()
        label = f"{code} — {name}" if name else code
        out.append(OptionItem(value=code, label=label))
    return out


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
    """Dropdown option lists — domain LABEL_NAME shown, CODE_VALUE stored on save."""
    return {
        "cos_section": _distinct_column(session, PrfGrpMstr.cos_sec),
        "accounting_unit": _option_list(session, "ACCOUNTINGUNITS"),
        "item_status": _option_list(session, "ITEMSTATUS"),
        "item_category": _option_list(session, "TYPEOFEQPT"),
        "class_of_eqpt": _option_list(session, "MMSCLASSA"),
        "country_of_origin": _distinct_column(session, MlccsEquipmentMaster.origin_country),
        "nodal_dte": _option_list(session, "SPONSERDTE"),
        "eqpt_category": _option_list(session, "DTEEQPTCATEGORY"),
        "digest_category": _option_list(session, "DIGESTCATEGORY"),
        "type_of_hldg": _option_list(session, "TYPE_OF_HOLDING"),
        "type_of_eqpt": _option_list(session, "TYPEOFEQPT"),
        "service_status": _option_list(session, "SERVICE_STATUS"),
        "op_status": _option_list(session, "OPSTATUS"),
    }
