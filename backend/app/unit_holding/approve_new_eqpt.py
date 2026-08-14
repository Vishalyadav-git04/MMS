"""Approve New Eqpt — Weapon → Unit Holding using Native SQL."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.principal import Principal
from app.deps import get_db_session, require_unit_or_admin
from app.db.native_utils import execute_sql, fetch_all, fetch_one, get_opstatus_code_value

router = APIRouter(
    prefix="/unit-holding/approve-new-eqpt",
    tags=["unit-holding: approve new eqpt"],
)

# Fallback codes used only when MMS_DOMAIN_VALUES has no OPSTATUS entry for a
# given label — mirrors the default_fallback values app.unit_holding.add_new_eqpt
# uses via get_opstatus_code_value() when it writes op_status on insert.
_STATUS_FALLBACK_CODES: dict[str, tuple[str, ...]] = {
    "pending": ("0", "P"),
    "approved": ("1", "A"),
    "rejected": ("2", "R"),
}

_STATUS_FALLBACK_LABEL: dict[str, str] = {
    "0": "Pending",
    "P": "Pending",
    "1": "Approved",
    "A": "Approved",
    "2": "Rejected",
    "R": "Rejected",
}

_SOURCE_UNIT = "unit"
_SOURCE_DEPOT = "depot"
_SOURCE_OTH = "oth"

_TABLE_MAP = {
    _SOURCE_UNIT: "MMS_UNIT_MASTER",
    _SOURCE_DEPOT: "MMS_DEPOT_MASTER",
    _SOURCE_OTH: "MMS_OTH_MASTER",
}


class OrbatUnitOut(BaseModel):
    id: str | int
    unit_name: str
    sus_no: str
    form_code: str | None = None
    status: str


class SearchIn(BaseModel):
    sus_no: str = Field("", max_length=50)
    unit_name: str = Field("", max_length=255)
    status: str = Field("", max_length=50)  # Pending | Approved | Rejected | empty for All
    date_from: date | None = None
    date_to: date | None = None


class NewEqptOut(BaseModel):
    id: str | int
    source_table: str
    iv_no: str | None = None
    iv_date: str | None = None
    unit_name: str | None = None
    sus_no: str | None = None
    material_no: str | None = None
    census_no: str | None = None
    type_of_hldg: str | None = None
    type_of_hldg_label: str | None = None
    status: str
    op_status: str | None = None
    eqpt_regn_no: str | None = None
    regn_seq_no: str | None = None
    census_seq_no: str | int | None = None
    prf_code: str | None = None
    prf_group: str | None = None
    nomenclature: str | None = None
    type_of_eqpt: str | None = None
    type_of_eqpt_label: str | None = None
    from_sus_no: str | None = None
    from_unit_name: str | None = None
    depres_dur_year: str | None = None
    upload_iv: str | None = None
    eqpt_make: str | None = None
    eqpt_model: str | None = None
    unit_price: str | None = None
    life_of_asset: str | None = None


class ApproveIn(BaseModel):
    items: list[dict[str, Any]] = Field(..., min_length=1)


class ApproveOut(BaseModel):
    approved_ids: list[str | int]
    count: int


def _fmt_date(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    return str(value)


def _opstatus_domain_map(session: Session) -> dict[str, str]:
    """code_value(upper) -> label_name for the OPSTATUS domain, as configured in
    MMS Admin > Domain Master. Empty if nothing has been configured there."""
    rows = fetch_all(
        session,
        "SELECT code_value, label_name FROM MMS_DOMAIN_VALUES WHERE REPLACE(UPPER(domain_name), '_', '') = 'OPSTATUS'",
    )
    return {
        str(r.get("code_value") or "").strip().upper(): str(r.get("label_name") or r.get("code_value") or "").strip()
        for r in rows
        if r.get("code_value")
    }


def _codes_for_status_label(domain_map: dict[str, str], label: str) -> tuple[str, ...]:
    """All OPSTATUS codes configured with this label, as well as fallback codes."""
    label_lower = label.lower()
    fallback = _STATUS_FALLBACK_CODES.get(label_lower, ())
    matches = [code for code, lbl in domain_map.items() if lbl.strip().upper() == label.upper()]
    return tuple(sorted(set(matches + list(fallback))))


def _status_label(domain_map: dict[str, str], code: str | None) -> str:
    if not code:
        return ""
    key = code.strip().upper()
    return domain_map.get(key) or _STATUS_FALLBACK_LABEL.get(key, code)


def _holding_label_map(session: Session) -> dict[str, str]:
    rows = fetch_all(
        session,
        "SELECT code_value, label_name FROM MMS_DOMAIN_VALUES WHERE REPLACE(UPPER(domain_name), '_', '') = 'TYPEOFHOLDING'",
    )
    return {
        str(r.get("code_value") or "").strip().upper(): str(r.get("label_name") or r.get("code_value") or "").strip()
        for r in rows
        if r.get("code_value")
    }


def _eqpt_type_label_map(session: Session) -> dict[str, str]:
    rows = fetch_all(
        session,
        "SELECT code_value, label_name FROM MMS_DOMAIN_VALUES WHERE REPLACE(UPPER(domain_name), '_', '') = 'TYPEOFEQPT'",
    )
    return {
        str(r.get("code_value") or "").strip().upper(): str(r.get("label_name") or r.get("code_value") or "").strip()
        for r in rows
        if r.get("code_value")
    }


def _unit_map_by_suses(session: Session, sus_list: set[str]) -> dict[str, str]:
    if not sus_list:
        return {}
    in_clause = ", ".join(f":s_{i}" for i in range(len(sus_list)))
    params = {f"s_{i}": s.strip().upper() for i, s in enumerate(sus_list) if s.strip()}
    rows = fetch_all(
        session,
        f"SELECT sus_no, unit_name FROM MMS_ORBAT_UNIT_DETL WHERE UPPER(sus_no) IN ({in_clause}) AND UPPER(status) = 'ACTIVE'",
        params,
    )
    return {
        str(r["sus_no"]).strip().upper(): str(r["unit_name"]).strip()
        for r in rows
        if r.get("sus_no") and r.get("unit_name")
    }


def _mlccs_details_for_census(session: Session, census_nos: set[str]) -> dict[str, dict[str, str]]:
    if not census_nos:
        return {}
    in_clause = ", ".join(f":c_{i}" for i in range(len(census_nos)))
    params = {f"c_{i}": c.upper() for i, c in enumerate(census_nos) if c}
    rows = fetch_all(
        session,
        f"SELECT census_no, material_no, nomen, prf_group, prf_code FROM MMS_MLCCS_EQPT_MASTER WHERE UPPER(census_no) IN ({in_clause})",
        params,
    )
    out: dict[str, dict[str, str]] = {}
    for r in rows:
        if r.get("census_no"):
            out[str(r["census_no"]).strip().upper()] = {
                "material_no": str(r.get("material_no") or "").strip(),
                "nomen": str(r.get("nomen") or "").strip(),
                "prf_group": str(r.get("prf_group") or "").strip(),
                "prf_code": str(r.get("prf_code") or "").strip(),
            }
    return out


@router.get("/status")
def status() -> dict[str, str]:
    return {"module": "unit-holding", "feature": "approve-new-eqpt", "status": "ready"}


@router.get("/orbat-units", response_model=list[OrbatUnitOut])
def search_orbat_units(
    q: str = Query(""),
    session: Session = Depends(get_db_session),
) -> list[OrbatUnitOut]:
    sql = "SELECT id, unit_name, sus_no, form_code, status FROM MMS_ORBAT_UNIT_DETL WHERE UPPER(status) = 'ACTIVE'"
    params: dict = {}
    term = q.strip().upper()
    if term:
        like = f"%{term}%"
        sql += " AND (UPPER(unit_name) LIKE :term OR UPPER(sus_no) LIKE :term OR UPPER(COALESCE(form_code, '')) LIKE :term)"
        params["term"] = like

    sql += " ORDER BY unit_name"
    rows = fetch_all(session, sql, params)[:10]
    return [
        OrbatUnitOut(
            id=str(r.get("id") or ""),
            unit_name=str(r.get("unit_name") or ""),
            sus_no=str(r.get("sus_no") or ""),
            form_code=r.get("form_code"),
            status=str(r.get("status") or "ACTIVE"),
        )
        for r in rows
    ]


def _resolve_unit_optional(
    session: Session, sus_no: str, unit_name: str
) -> dict | None:
    sus = sus_no.strip().upper()
    name = unit_name.strip().upper()
    if sus and name:
        row = fetch_one(
            session,
            """
            SELECT id, unit_name, sus_no, form_code, status FROM MMS_ORBAT_UNIT_DETL
            WHERE UPPER(sus_no) = :sus AND UPPER(status) = 'ACTIVE'
            AND (UPPER(unit_name) = :uname OR UPPER(unit_name) LIKE :uname_like)
            """,
            {"sus": sus, "uname": name, "uname_like": f"%{name}%"},
        )
        if row is not None:
            return row
    if sus:
        by_sus = fetch_one(
            session,
            "SELECT id, unit_name, sus_no, form_code, status FROM MMS_ORBAT_UNIT_DETL WHERE UPPER(sus_no) = :sus AND UPPER(status) = 'ACTIVE'",
            {"sus": sus},
        )
        if by_sus is not None:
            return by_sus
    if name:
        by_name = fetch_one(
            session,
            "SELECT id, unit_name, sus_no, form_code, status FROM MMS_ORBAT_UNIT_DETL WHERE (UPPER(unit_name) = :name OR UPPER(unit_name) LIKE :name_like) AND UPPER(status) = 'ACTIVE'",
            {"name": name, "name_like": f"%{name}%"},
        )
        if by_name is not None:
            return by_name
    return None


@router.post("/search", response_model=list[NewEqptOut])
def search_new_eqpt(
    body: SearchIn,
    session: Session = Depends(get_db_session),
) -> list[NewEqptOut]:
    st_key = body.status.strip().lower() if body.status else ""
    if st_key and st_key not in _STATUS_FALLBACK_CODES and st_key != "all":
        raise HTTPException(
            status_code=400,
            detail="Status must be Pending, Approved, Rejected, All, or empty for All",
        )

    opstatus_map = _opstatus_domain_map(session)

    target_statuses: tuple[str, ...]
    if st_key and st_key != "all":
        target_statuses = _codes_for_status_label(opstatus_map, st_key.capitalize())
    else:
        target_statuses = tuple(
            sorted(
                set(
                    [
                        *_codes_for_status_label(opstatus_map, "Pending"),
                        *_codes_for_status_label(opstatus_map, "Approved"),
                        *_codes_for_status_label(opstatus_map, "Rejected"),
                        "0", "1", "2", "P", "A", "R"
                    ]
                )
            )
        )

    unit_found = _resolve_unit_optional(session, body.sus_no, body.unit_name)
    filter_sus = ""
    filter_unit_name = ""
    if unit_found is not None:
        filter_sus = str(unit_found.get("sus_no") or "").strip().upper()
        filter_unit_name = str(unit_found.get("unit_name") or "").strip().upper()
    elif body.sus_no.strip():
        filter_sus = body.sus_no.strip().upper()
    elif body.unit_name.strip():
        filter_unit_name = body.unit_name.strip().upper()

    hldg_labels = _holding_label_map(session)
    eqpt_labels = _eqpt_type_label_map(session)

    raw_rows: list[dict[str, Any]] = []

    st_clause = ", ".join(f":st_{i}" for i in range(len(target_statuses)))
    base_params: dict[str, Any] = {}
    for i, s in enumerate(target_statuses):
        base_params[f"st_{i}"] = s.strip().upper()

    where_parts: list[str] = [f"UPPER(TRIM(COALESCE(op_status, ''))) IN ({st_clause})"]
    if body.date_from is not None:
        base_params["dfrom"] = datetime.combine(body.date_from, datetime.min.time())
        if body.date_to is not None:
            base_params["dto"] = datetime.combine(body.date_to, datetime.max.time())
            where_parts.append("iv_date BETWEEN :dfrom AND :dto")
        else:
            where_parts.append("iv_date >= :dfrom")
    elif body.date_to is not None:
        base_params["dto"] = datetime.combine(body.date_to, datetime.max.time())
        where_parts.append("iv_date <= :dto")

    sql_where_base = "WHERE " + " AND ".join(where_parts)

    for src, tname in _TABLE_MAP.items():
        sus_params = dict(base_params)
        if filter_sus:
            sus_params["fsus"] = filter_sus
            if src == _SOURCE_OTH:
                sql_where = sql_where_base + " AND (UPPER(to_sus_no) = :fsus OR UPPER(COALESCE(iv_sus_no, '')) = :fsus)"
            else:
                sql_where = sql_where_base + " AND (UPPER(to_sus_no) = :fsus OR UPPER(COALESCE(sus_no, '')) = :fsus)"
        elif filter_unit_name:
            sus_params["funame"] = f"%{filter_unit_name}%"
            if src == _SOURCE_OTH:
                sql_where = sql_where_base + " AND (UPPER(to_sus_no) IN (SELECT UPPER(sus_no) FROM MMS_ORBAT_UNIT_DETL WHERE UPPER(unit_name) LIKE :funame) OR UPPER(COALESCE(iv_sus_no, '')) IN (SELECT UPPER(sus_no) FROM MMS_ORBAT_UNIT_DETL WHERE UPPER(unit_name) LIKE :funame))"
            else:
                sql_where = sql_where_base + " AND (UPPER(to_sus_no) IN (SELECT UPPER(sus_no) FROM MMS_ORBAT_UNIT_DETL WHERE UPPER(unit_name) LIKE :funame) OR UPPER(COALESCE(sus_no, '')) IN (SELECT UPPER(sus_no) FROM MMS_ORBAT_UNIT_DETL WHERE UPPER(unit_name) LIKE :funame))"
        else:
            sql_where = sql_where_base

        sql = f"SELECT t.* FROM {tname} t {sql_where}"
        try:
            r = fetch_all(session, sql, sus_params)
            for row in r:
                row_copy = dict(row)
                row_copy["source_table"] = src
                raw_rows.append(row_copy)
        except Exception:
            continue

    raw_rows.sort(
        key=lambda r: (
            str(r.get("iv_date") or ""),
            str(r.get("created_date") or ""),
            str(r.get("id") or ""),
        ),
        reverse=True,
    )

    needed_suses: set[str] = set()
    needed_census: set[str] = set()
    for r in raw_rows:
        to_s = str(r.get("to_sus_no") or r.get("sus_no") or r.get("iv_sus_no") or "").strip()
        from_s = str(r.get("from_sus_no") or r.get("issued_from") or "").strip()
        if to_s:
            needed_suses.add(to_s)
        if from_s:
            needed_suses.add(from_s)
        cno = str(r.get("census_no") or "").strip()
        if cno:
            needed_census.add(cno)

    unit_map = _unit_map_by_suses(session, needed_suses)
    mlccs_map = _mlccs_details_for_census(session, needed_census)

    out: list[NewEqptOut] = []
    for row in raw_rows:
        src = str(row.get("source_table") or "unit")
        to_sus = str(row.get("to_sus_no") or row.get("sus_no") or row.get("iv_sus_no") or "").strip()
        from_sus = str(row.get("from_sus_no") or row.get("issued_from") or "").strip()
        cno = str(row.get("census_no") or "").strip()
        m_info = mlccs_map.get(cno.upper(), {})

        hldg = str(row.get("type_of_hldg") or "").strip()
        eqpt_type = str(row.get("type_of_eqpt") or "").strip()
        op = str(row.get("op_status") or "").strip().upper() or None

        pcode = (
            row.get("prf_code")
            or m_info.get("prf_code")
            or None
        )
        prf_grp = (
            row.get("prf_group")
            or m_info.get("prf_group")
            or None
        )
        nomen = m_info.get("nomen") or None
        mat = row.get("material_no") or m_info.get("material_no") or None

        out.append(
            NewEqptOut(
                id=str(row.get("id") or ""),
                source_table=src,
                iv_no=row.get("iv_no"),
                iv_date=_fmt_date(row.get("iv_date")),
                unit_name=(unit_map.get(to_sus.upper()) if to_sus else None),
                sus_no=to_sus or None,
                material_no=mat,
                census_no=cno or None,
                type_of_hldg=hldg,
                type_of_hldg_label=(
                    hldg_labels.get(hldg.upper(), hldg) if hldg else None
                ),
                status=_status_label(opstatus_map, op),
                op_status=op,
                eqpt_regn_no=row.get("eqpt_regn_no"),
                regn_seq_no=row.get("regn_seq_no"),
                census_seq_no=row.get("census_seq_no"),
                prf_code=pcode,
                prf_group=prf_grp,
                nomenclature=nomen,
                type_of_eqpt=eqpt_type,
                type_of_eqpt_label=(
                    eqpt_labels.get(eqpt_type.upper(), eqpt_type) if eqpt_type else None
                ),
                from_sus_no=from_sus,
                from_unit_name=(unit_map.get(from_sus.upper()) if from_sus else None),
                depres_dur_year=(
                    str(row.get("depres_dur_year")) if row.get("depres_dur_year") is not None else None
                ),
                upload_iv=(row.get("upload_iv") or row.get("upload_voucher")),
                eqpt_make=row.get("eqpt_make"),
                eqpt_model=row.get("eqpt_model"),
                unit_price=(
                    str(row.get("unit_price")) if row.get("unit_price") is not None else None
                ),
                life_of_asset=(
                    str(row.get("life_of_asset")) if row.get("life_of_asset") is not None else None
                ),
            )
        )
    return out


@router.post("/approve", response_model=ApproveOut)
def approve_new_eqpt(
    body: ApproveIn,
    session: Session = Depends(get_db_session),
    principal: Principal = Depends(require_unit_or_admin),
) -> ApproveOut:
    now = datetime.utcnow()
    actor = (principal.username or "system")[:25]
    approved: list[str] = []
    approved_code = get_opstatus_code_value(session, "APPROVED", "1")

    for item in body.items:
        row_id = (item.get("id") or "").strip()
        source = (item.get("source_table") or "").strip().lower()
        if not row_id or not source:
            raise HTTPException(
                status_code=400,
                detail="Each item requires id and source_table",
            )
        table_name = _TABLE_MAP.get(source)
        if not table_name:
            raise HTTPException(status_code=400, detail=f"Unknown source_table '{source}'")

        row = fetch_one(session, f"SELECT id, op_status FROM {table_name} WHERE id = :rid OR TO_CHAR(id) = :rid_str", {"rid": row_id, "rid_str": row_id})
        if row is None:
            raise HTTPException(
                status_code=404,
                detail=f"Record '{row_id}' not found in {source}",
            )
        current = str(row.get("op_status") or "").strip().upper()
        if current == approved_code.upper():
            continue

        execute_sql(
            session,
            f"UPDATE {table_name} SET op_status = :st, approved_by = :app_by, approved_date = :app_dt WHERE id = :rid OR TO_CHAR(id) = :rid_str",
            {"st": approved_code, "app_by": actor, "app_dt": now, "rid": row_id, "rid_str": row_id},
        )
        approved.append(f"{source}:{row_id}")

    return ApproveOut(approved_ids=approved, count=len(approved))


@router.post("/reject", response_model=ApproveOut)
def reject_new_eqpt(
    body: ApproveIn,
    session: Session = Depends(get_db_session),
    principal: Principal = Depends(require_unit_or_admin),
) -> ApproveOut:
    now = datetime.utcnow()
    actor = (principal.username or "system")[:25]
    rejected: list[str] = []
    rejected_code = get_opstatus_code_value(session, "REJECTED", "2")

    for item in body.items:
        row_id = (item.get("id") or "").strip()
        source = (item.get("source_table") or "").strip().lower()
        if not row_id or not source:
            raise HTTPException(
                status_code=400,
                detail="Each item requires id and source_table",
            )
        table_name = _TABLE_MAP.get(source)
        if not table_name:
            raise HTTPException(status_code=400, detail=f"Unknown source_table '{source}'")

        execute_sql(
            session,
            f"UPDATE {table_name} SET op_status = :st, approved_by = :app_by, approved_date = :app_dt WHERE id = :rid OR TO_CHAR(id) = :rid_str",
            {"st": rejected_code, "app_by": actor, "app_dt": now, "rid": row_id, "rid_str": row_id},
        )
        rejected.append(f"{source}:{row_id}")

    return ApproveOut(approved_ids=rejected, count=len(rejected))
