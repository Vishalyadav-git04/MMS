"""Capture MLCCS Details — MMS Admin using Native SQL.

Persists to Oracle table MMS_MLCCS_EQUIPMENT_MASTER.
"""

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
    prf_code: str | None = None
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
    row = fetch_one(session, "SELECT NVL(MAX(census_seq_no), 0) AS max_val FROM MMS_MLCCS_EQUIPMENT_MASTER")
    return float(row.get("max_val") if row else 0) + 1.0


def _next_item_seq_no(session: Session) -> str:
    rows = fetch_all(session, "SELECT item_seq_no FROM MMS_MLCCS_EQUIPMENT_MASTER WHERE item_seq_no IS NOT NULL")
    max_seq = 0
    for r in rows:
        s = str(r.get("item_seq_no") or "").strip()
        if s.isdigit():
            max_seq = max(max_seq, int(s))
    return str(max_seq + 1)


def _resolve_prf_code(
    session: Session,
    cos_section: str | None,
    prf_group: str | None,
    item_code: str | None = None,
) -> str | None:
    cos = (cos_section or "").strip().upper()
    grp = (prf_group or "").strip()
    icode = (item_code or "").strip().upper()

    if icode:
        row = fetch_one(
            session,
            "SELECT prf_code FROM MMS_PRF_GRP_MSTR WHERE UPPER(item_code) = :icode AND prf_code IS NOT NULL AND ROWNUM = 1",
            {"icode": icode},
        )
        if row and row.get("prf_code"):
            return str(row["prf_code"]).strip()[:8]

    if not grp:
        return None

    grp_clean = grp
    if "—" in grp:
        grp_clean = grp.split("—", 1)[1].strip()
    elif " - " in grp:
        grp_clean = grp.split(" - ", 1)[1].strip()

    if cos:
        row = fetch_one(
            session,
            """SELECT prf_code FROM MMS_PRF_GRP_MSTR 
               WHERE (UPPER(cos_sec) = :cos OR REPLACE(UPPER(cos_sec), '-', '') = REPLACE(:cos, '-', '')) 
                 AND (UPPER(prf_grp) = :grp OR UPPER(prf_grp) = :grp_clean) 
                 AND prf_code IS NOT NULL AND ROWNUM = 1""",
            {"cos": cos, "grp": grp.upper(), "grp_clean": grp_clean.upper()},
        )
        if row and row.get("prf_code"):
            return str(row["prf_code"]).strip()[:8]

    row = fetch_one(
        session,
        """SELECT prf_code FROM MMS_PRF_GRP_MSTR 
           WHERE (UPPER(prf_grp) = :grp OR UPPER(prf_grp) = :grp_clean) 
             AND prf_code IS NOT NULL AND ROWNUM = 1""",
        {"grp": grp.upper(), "grp_clean": grp_clean.upper()},
    )
    if row and row.get("prf_code"):
        return str(row["prf_code"]).strip()[:8]

    row = fetch_one(
        session,
        """SELECT prf_code FROM MMS_PRF_GRP_MSTR 
           WHERE (UPPER(prf_code) = :grp OR UPPER(prf_code) = :grp_clean) 
             AND prf_code IS NOT NULL AND ROWNUM = 1""",
        {"grp": grp.upper(), "grp_clean": grp_clean.upper()},
    )
    if row and row.get("prf_code"):
        return str(row["prf_code"]).strip()[:8]

    return None


def _backfill_missing_prf_codes(session: Session) -> None:
    try:
        rows = fetch_all(
            session,
            "SELECT id, cos_sec, prf_group, item_code FROM MMS_MLCCS_EQUIPMENT_MASTER WHERE prf_code IS NULL",
        )
        for r in rows:
            rec_id = r.get("id")
            if rec_id is None:
                continue
            resolved = _resolve_prf_code(
                session,
                r.get("cos_sec"),
                r.get("prf_group"),
                r.get("item_code"),
            )
            if resolved:
                execute_sql(
                    session,
                    "UPDATE MMS_MLCCS_EQUIPMENT_MASTER SET prf_code = :pcode WHERE id = :rid OR TO_CHAR(id) = :rid_str",
                    {"pcode": resolved, "rid": rec_id, "rid_str": str(rec_id)},
                )
    except Exception:
        pass


def _domain_rows(session: Session, domain: str) -> list[dict]:
    sql = """
        SELECT code_value, label_name, label_short
        FROM MMS_DOMAIN_VALUES
        WHERE REPLACE(UPPER(domain_name), '_', '') = :dname
    """
    return fetch_all(session, sql, {"dname": domain.replace("_", "").upper()})


def _domain_code(
    session: Session,
    domain: str,
    submitted: str | None,
    *,
    max_len: int | None = None,
) -> str | None:
    val = (submitted or "").strip()
    if not val:
        return None
    rows = _domain_rows(session, domain)
    upper = val.upper()
    for r in rows:
        code = str(r.get("code_value") or "").strip()
        if code and code.upper() == upper:
            return code[:max_len] if max_len else code
    for r in rows:
        code = str(r.get("code_value") or "").strip()
        if not code:
            continue
        if str(r.get("label_name") or "").strip().upper() == upper:
            return code[:max_len] if max_len else code
        if str(r.get("label_short") or "").strip().upper() == upper:
            return code[:max_len] if max_len else code
    return val[:max_len] if max_len else val


def _domain_code_by_label(
    session: Session,
    domain: str,
    preferred_label: str,
) -> str | None:
    want = preferred_label.strip().upper()
    if not want:
        return None
    for r in _domain_rows(session, domain):
        code = str(r.get("code_value") or "").strip()
        if not code:
            continue
        if str(r.get("label_name") or "").strip().upper() == want:
            return code
        if str(r.get("label_short") or "").strip().upper() == want:
            return code
        if code.upper() == want:
            return code
    return None


def _to_record(row: dict) -> MlccsRecord:
    auth_dt = row.get("auth_date")
    if isinstance(auth_dt, datetime):
        parsed_dt = auth_dt.date()
    elif isinstance(auth_dt, date):
        parsed_dt = auth_dt
    else:
        parsed_dt = None

    return MlccsRecord(
        id=str(row.get("id") or ""),
        cos_section=row.get("cos_sec"),
        census_no=row.get("census_no"),
        nomenclature=row.get("nomen"),
        auth_letter_no=row.get("auth_lett_no"),
        auth_date=parsed_dt,
        prf_code=row.get("prf_code"),
        prf_group=row.get("prf_group"),
        item_code=row.get("item_code"),
        cat_part_no=row.get("cat_part_no"),
        accounting_unit=row.get("au"),
        brief_description=row.get("brief_desc"),
        item_status=row.get("item_status"),
        item_category=row.get("item_category"),
        class_of_eqpt=row.get("class_category"),
        country_of_origin=row.get("origin_country"),
        nodal_dte=row.get("dte_category"),
        eqpt_category=row.get("dte_eqpt_category"),
        year_of_induction=row.get("induc_year"),
        digest_category=row.get("digest_category"),
        cost_rs=str(row.get("cost")) if row.get("cost") is not None else None,
        manufacturing_agency=row.get("manuf_agency"),
        ahsp_agency=row.get("ahsp_agency"),
        nato_stock_no=row.get("nato_stk_no"),
        def_catalogue_no=row.get("def_cat_no_dcan"),
        material_no=row.get("material_no"),
        remarks=row.get("spl_remarks") or row.get("remarks"),
    )


def _encode_cos_sec(cos_section: str) -> str:
    letter, num = cos_section.split("-", 1)
    return f"{ord(letter) - ord('A') + 1:02d}{num}"


def _next_sequence_for_cos(session: Session, cos_prefix: str) -> int:
    rows = fetch_all(
        session,
        "SELECT census_no FROM MMS_MLCCS_EQUIPMENT_MASTER WHERE census_no IS NOT NULL AND UPPER(census_no) LIKE :pre",
        {"pre": f"{cos_prefix}%"},
    )
    max_seq = 0
    for r in rows:
        c = str(r.get("census_no") or "").strip().upper()
        if len(c) < 8 or c[:4] != cos_prefix:
            continue
        seq_part = c[4:8]
        if seq_part.isdigit():
            max_seq = max(max_seq, int(seq_part))
    nxt = max_seq + 1
    if nxt > 9999:
        raise HTTPException(
            status_code=400,
            detail=f"Sequence exhausted for COS prefix {cos_prefix}",
        )
    return nxt


def _weighted_remainder(eight_digits: str) -> int:
    if len(eight_digits) != 8 or not eight_digits.isdigit():
        raise HTTPException(status_code=500, detail="Invalid census body for check digit")
    weights = (9, 8, 7, 6, 5, 4, 3, 2)
    total = sum(int(d) * w for d, w in zip(eight_digits, weights, strict=True))
    return total % 11


def _check_digit_letter(session: Session, remainder: int) -> str:
    rows = fetch_all(session, "SELECT code_value, label_name FROM MMS_DOMAIN_VALUES WHERE UPPER(domain_name) = 'MMSCHECKDIGIT'")
    for r in rows:
        code = str(r.get("code_value") or "").strip()
        if not code:
            continue
        try:
            matched = int(code) == remainder
        except ValueError:
            matched = code == str(remainder)
        if not matched:
            continue
        label = str(r.get("label_name") or "").strip()
        if not label:
            raise HTTPException(
                status_code=500,
                detail=f"MMSCHECKDIGIT code_value '{code}' has empty LABEL_NAME",
            )
        return label[0].upper()

    raise HTTPException(
        status_code=500,
        detail=f"No MMSCHECKDIGIT mapping for remainder {remainder}",
    )


def _next_census_no(session: Session, cos_section: str) -> str:
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
    cos_section = _validate_cos_section(body.cos_section)
    existing = fetch_one(
        session,
        "SELECT census_no FROM MMS_MLCCS_EQUIPMENT_MASTER WHERE UPPER(nomen) = :nomen",
        {"nomen": body.nomenclature.strip().upper()},
    )
    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail=f"Nomenclature already exists with census no '{existing.get('census_no')}'",
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
    key = body.census_no.strip().upper()
    row = fetch_one(
        session,
        "SELECT * FROM MMS_MLCCS_EQUIPMENT_MASTER WHERE UPPER(census_no) = :key",
        {"key": key},
    )
    if row is None:
        raise HTTPException(
            status_code=404,
            detail=f"No MLCCS record found for census no '{body.census_no}'",
        )
    nomen = str(row.get("nomen") or "")
    if body.nomenclature and nomen:
        if nomen.strip().upper() != body.nomenclature.strip().upper():
            raise HTTPException(
                status_code=404,
                detail="Census no and nomenclature do not match",
            )

    if not row.get("prf_code"):
        _backfill_missing_prf_codes(session)
        row = fetch_one(
            session,
            "SELECT * FROM MMS_MLCCS_EQUIPMENT_MASTER WHERE UPPER(census_no) = :key",
            {"key": key},
        ) or row

    return _to_record(row)


@router.post("/", response_model=MlccsRecord)
def save_mlccs(
    body: MlccsRecord,
    session: Session = Depends(get_db_session),
    principal: Principal = Depends(get_principal),
) -> MlccsRecord:
    if not body.cos_section or not body.cos_section.strip():
        raise HTTPException(status_code=400, detail="COS Section is required")
    if not body.census_no or not body.census_no.strip():
        raise HTTPException(status_code=400, detail="Census No is required")
    if not body.nomenclature or not body.nomenclature.strip():
        raise HTTPException(status_code=400, detail="Nomenclature is required")
    if not body.auth_letter_no or not body.auth_letter_no.strip():
        raise HTTPException(status_code=400, detail="Auth/Letter No is required")
    if not body.auth_date:
        raise HTTPException(status_code=400, detail="Date is required")
    if not body.prf_group or not body.prf_group.strip():
        raise HTTPException(status_code=400, detail="PRF Group is required")
    if not body.item_code or not body.item_code.strip():
        raise HTTPException(status_code=400, detail="Item Code is required")
    if not body.cat_part_no or not body.cat_part_no.strip():
        raise HTTPException(status_code=400, detail="Cat/Part No is required")
    if not body.accounting_unit or not body.accounting_unit.strip():
        raise HTTPException(status_code=400, detail="Accounting Unit is required")
    if not body.item_status or not body.item_status.strip():
        raise HTTPException(status_code=400, detail="Item Status is required")
    if not body.item_category or not body.item_category.strip():
        raise HTTPException(status_code=400, detail="Item Category is required")
    if not body.class_of_eqpt or not body.class_of_eqpt.strip():
        raise HTTPException(status_code=400, detail="Class of Eqpt is required")
    if not body.brief_description or not body.brief_description.strip():
        raise HTTPException(status_code=400, detail="Brief Description is required")
    body.cos_section = _validate_cos_section(body.cos_section)

    actor = principal.username
    key = body.census_no.strip().upper()
    row = fetch_one(
        session,
        "SELECT * FROM MMS_MLCCS_EQUIPMENT_MASTER WHERE UPPER(census_no) = :key",
        {"key": key},
    )
    now = datetime.now()
    cos = (body.cos_section or "")[:10] or None
    prf_group = body.prf_group
    auth_dt = datetime.combine(body.auth_date, datetime.min.time()) if body.auth_date else None

    params = {
        "auth_lett_no": body.auth_letter_no,
        "auth_date": auth_dt,
        "cos_sec": cos,
        "prf_code": body.prf_code or _resolve_prf_code(session, cos, prf_group, body.item_code),
        "prf_group": prf_group,
        "cat_part_no": body.cat_part_no,
        "census_no": (body.census_no or "")[:9] or None,
        "nomen": body.nomenclature,
        "brief_desc": body.brief_description,
        "au": _domain_code(session, "ACCOUNTINGUNITS", body.accounting_unit),
        "item_status": _domain_code(session, "ITEMSTATUS", body.item_status or "CUR", max_len=3),
        "item_category": _domain_code(session, "TYPEOFEQPT", body.item_category),
        "origin_country": body.country_of_origin,
        "manuf_agency": body.manufacturing_agency,
        "ahsp_agency": body.ahsp_agency,
        "induc_year": body.year_of_induction,
        "nato_stk_no": body.nato_stock_no,
        "def_cat_no_dcan": body.def_catalogue_no,
        "spl_remarks": body.remarks,
        "op_status": "1",
        "class_category": _domain_code(session, "MMSCLASSA", body.class_of_eqpt),
        "dte_category": _domain_code(session, "SPONSERDTE", body.nodal_dte),
        "active_status": "1",
        "item_code": body.item_code,
        "digest_category": _domain_code(session, "DIGESTCATEGORY", body.digest_category),
        "dte_eqpt_category": _domain_code(session, "DTEEQPTCATEGORY", body.eqpt_category),
        "cost": _parse_cost(body.cost_rs),
        "material_no": (body.material_no or "")[:15] or None,
    }

    if row is None:
        rec_id = str(next_int_id(session, "MMS_MLCCS_EQUIPMENT_MASTER"))
        params.update({
            "id": rec_id,
            "census_seq_no": _next_census_seq_no(session),
            "item_seq_no": _next_item_seq_no(session),
            "data_cr_by": actor[:25],
            "data_cr_date": now,
        })
        insert_sql = """
            INSERT INTO MMS_MLCCS_EQUIPMENT_MASTER (
                id, auth_lett_no, auth_date, cos_sec, prf_code, prf_group, cat_part_no,
                census_no, nomen, brief_desc, au, item_status, item_category, origin_country,
                manuf_agency, ahsp_agency, induc_year, nato_stk_no, def_cat_no_dcan, spl_remarks,
                op_status, class_category, dte_category, active_status, item_code, digest_category,
                dte_eqpt_category, cost, material_no, census_seq_no, item_seq_no, data_cr_by, data_cr_date
            ) VALUES (
                :id, :auth_lett_no, :auth_date, :cos_sec, :prf_code, :prf_group, :cat_part_no,
                :census_no, :nomen, :brief_desc, :au, :item_status, :item_category, :origin_country,
                :manuf_agency, :ahsp_agency, :induc_year, :nato_stk_no, :def_cat_no_dcan, :spl_remarks,
                :op_status, :class_category, :dte_category, :active_status, :item_code, :digest_category,
                :dte_eqpt_category, :cost, :material_no, :census_seq_no, :item_seq_no, :data_cr_by, :data_cr_date
            )
        """
        execute_sql(session, insert_sql, params)
    else:
        rec_id = str(row["id"])
        clash = fetch_one(
            session,
            "SELECT census_no FROM MMS_MLCCS_EQUIPMENT_MASTER WHERE UPPER(nomen) = :nomen AND id != :rid AND TO_CHAR(id) != :rid_str",
            {"nomen": body.nomenclature.strip().upper(), "rid": rec_id, "rid_str": rec_id},
        )
        if clash is not None:
            raise HTTPException(
                status_code=409,
                detail=f"Nomenclature already used by census '{clash.get('census_no')}'",
            )

        params.update({
            "rid": rec_id,
            "rid_str": rec_id,
            "data_upd_by": actor[:25],
            "data_upd_date": now,
        })
        update_sql = """
            UPDATE MMS_MLCCS_EQUIPMENT_MASTER SET
                auth_lett_no = :auth_lett_no, auth_date = :auth_date, cos_sec = :cos_sec,
                prf_code = :prf_code, prf_group = :prf_group, cat_part_no = :cat_part_no,
                census_no = :census_no, nomen = :nomen, brief_desc = :brief_desc, au = :au,
                item_status = :item_status, item_category = :item_category, origin_country = :origin_country,
                manuf_agency = :manuf_agency, ahsp_agency = :ahsp_agency, induc_year = :induc_year,
                nato_stk_no = :nato_stk_no, def_cat_no_dcan = :def_cat_no_dcan, spl_remarks = :spl_remarks,
                op_status = :op_status, class_category = :class_category, dte_category = :dte_category,
                active_status = :active_status, item_code = :item_code, digest_category = :digest_category,
                dte_eqpt_category = :dte_eqpt_category, cost = :cost, material_no = :material_no,
                data_upd_by = :data_upd_by, data_upd_date = :data_upd_date
            WHERE id = :rid OR TO_CHAR(id) = :rid_str
        """
        execute_sql(session, update_sql, params)

    _backfill_missing_prf_codes(session)

    saved_row = fetch_one(session, "SELECT * FROM MMS_MLCCS_EQUIPMENT_MASTER WHERE id = :rid OR TO_CHAR(id) = :rid_str", {"rid": rec_id, "rid_str": rec_id})
    return _to_record(saved_row or {})


def _option_list(session: Session, domain: str) -> list[dict[str, str]]:
    sql = """
        SELECT code_value, label_name
        FROM MMS_DOMAIN_VALUES
        WHERE REPLACE(UPPER(domain_name), '_', '') = :dname
        ORDER BY LPAD(NVL(disp_order, '9999'), 10, '0'), label_name
    """
    rows = fetch_all(session, sql, {"dname": domain.replace("_", "").upper()})
    return [
        {"value": str(r.get("code_value") or ""), "label": str(r.get("label_name") or r.get("code_value") or "")}
        for r in rows
        if r.get("code_value")
    ]


def _distinct_column(session: Session, table: str, column: str) -> list[dict[str, str]]:
    col_key = column.lower()
    sql = f"SELECT DISTINCT {column} FROM {table} WHERE {column} IS NOT NULL ORDER BY {column}"
    rows = fetch_all(session, sql)
    out: list[dict[str, str]] = []
    for r in rows:
        val = str(r.get(col_key) or "").strip()
        if val:
            out.append({"value": val, "label": val})
    return out


@router.get("/suggest-cos", response_model=list[str])
def suggest_cos_section(
    q: str = "",
    session: Session = Depends(get_db_session),
) -> list[str]:
    term = q.strip().upper()
    sql = "SELECT DISTINCT cos_sec FROM MMS_PRF_GRP_MSTR WHERE cos_sec IS NOT NULL"
    params: dict = {}
    if term:
        sql += " AND UPPER(cos_sec) LIKE :term"
        params["term"] = f"%{term}%"
    sql += " ORDER BY cos_sec"
    rows = fetch_all(session, sql, params)[:50]
    return [str(r["cos_sec"]) for r in rows if r.get("cos_sec") and str(r["cos_sec"]).strip()]


class OptionItem(BaseModel):
    value: str
    label: str


@router.get("/prf-groups", response_model=list[OptionItem])
def list_prf_groups(
    cos_section: str,
    session: Session = Depends(get_db_session),
) -> list[OptionItem]:
    cos = _validate_cos_section(cos_section)
    sql = "SELECT DISTINCT prf_code, prf_grp FROM MMS_PRF_GRP_MSTR WHERE UPPER(cos_sec) = :cos ORDER BY prf_code, prf_grp"
    rows = fetch_all(session, sql, {"cos": cos})
    seen: set[str] = set()
    out: list[OptionItem] = []
    for r in rows:
        name = str(r.get("prf_grp") or "").strip()
        if not name or name in seen:
            continue
        seen.add(name)
        code = str(r["prf_code"]) if r.get("prf_code") is not None else ""
        label = f"{code} — {name}" if code else name
        out.append(OptionItem(value=name, label=label))
    return out


@router.get("/item-codes", response_model=list[OptionItem])
def list_item_codes(
    cos_section: str,
    prf_group: str,
    session: Session = Depends(get_db_session),
) -> list[OptionItem]:
    cos = _validate_cos_section(cos_section)
    grp = prf_group.strip()
    if not grp:
        raise HTTPException(status_code=400, detail="prf_group is required")
    sql = "SELECT DISTINCT item_code, item_name FROM MMS_PRF_GRP_MSTR WHERE UPPER(cos_sec) = :cos AND UPPER(prf_grp) = :grp ORDER BY item_code"
    rows = fetch_all(session, sql, {"cos": cos, "grp": grp.upper()})
    out: list[OptionItem] = []
    for r in rows:
        if r.get("item_code") is None:
            continue
        code = str(r["item_code"])
        name = str(r.get("item_name") or "").strip()
        label = f"{code} — {name}" if name else code
        out.append(OptionItem(value=code, label=label))
    return out


@router.get("/suggest-census", response_model=list[CensusSuggestion])
def suggest_census(
    q: str = "",
    session: Session = Depends(get_db_session),
) -> list[CensusSuggestion]:
    term = q.strip().upper()
    sql = "SELECT census_no, nomen, cos_sec FROM MMS_MLCCS_EQUIPMENT_MASTER WHERE census_no IS NOT NULL"
    params: dict = {}
    if term:
        sql += " AND (UPPER(census_no) LIKE :term OR UPPER(COALESCE(nomen, '')) LIKE :term)"
        params["term"] = f"%{term}%"
    sql += " ORDER BY census_no"
    rows = fetch_all(session, sql, params)[:50]
    return [
        CensusSuggestion(
            census_no=str(r["census_no"]),
            nomenclature=r.get("nomen"),
            cos_section=r.get("cos_sec"),
        )
        for r in rows
        if r.get("census_no")
    ]


@router.get("/options")
def list_options(session: Session = Depends(get_db_session)) -> dict[str, list[dict[str, str]]]:
    return {
        "cos_section": _distinct_column(session, "MMS_PRF_GRP_MSTR", "cos_sec"),
        "accounting_unit": _option_list(session, "ACCOUNTINGUNITS"),
        "item_status": _option_list(session, "ITEMSTATUS"),
        "item_category": _option_list(session, "TYPEOFEQPT"),
        "class_of_eqpt": _option_list(session, "MMSCLASSA"),
        "country_of_origin": _distinct_column(session, "MMS_MLCCS_EQUIPMENT_MASTER", "origin_country"),
        "nodal_dte": _option_list(session, "SPONSERDTE"),
        "eqpt_category": _option_list(session, "DTEEQPTCATEGORY"),
        "digest_category": _option_list(session, "DIGESTCATEGORY"),
        "type_of_hldg": _option_list(session, "TYPE_OF_HOLDING"),
        "type_of_eqpt": _option_list(session, "TYPEOFEQPT"),
        "service_status": _option_list(session, "SERVICE_STATUS"),
        "op_status": _option_list(session, "OPSTATUS"),
    }
