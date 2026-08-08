"""Approve New Eqpt — Weapon → Unit Holding using Native SQL."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.principal import Principal
from app.deps import get_db_session, require_unit_or_admin
from app.db.native_utils import execute_sql, fetch_all, fetch_one

router = APIRouter(
    prefix="/unit-holding/approve-new-eqpt",
    tags=["unit-holding: approve new eqpt"],
)

_STATUS_CODES: dict[str, tuple[str, ...]] = {
    "pending": ("0", "P"),
    "approved": ("1", "A"),
    "rejected": ("2", "R"),
}

_STATUS_LABEL: dict[str, str] = {
    "0": "Pending",
    "P": "Pending",
    "1": "Approved",
    "A": "Approved",
    "2": "Rejected",
    "R": "Rejected",
}

_APPROVED_CODE = "1"
_PENDING_CODES = frozenset({"0", "P"})

_SOURCE_UNIT = "unit"
_SOURCE_DEPOT = "depot"
_SOURCE_OTH = "oth"

_TABLE_MAP = {
    _SOURCE_UNIT: "MMS_UNIT_MSTR_DETL",
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
    sus_no: str = Field(..., min_length=1, max_length=50)
    unit_name: str = Field(..., min_length=1, max_length=255)
    status: str = Field(..., min_length=1)  # Pending | Approved | Rejected
    date_from: date
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


def _status_label(code: str | None) -> str:
    if not code:
        return ""
    return _STATUS_LABEL.get(code.strip().upper(), code)


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
    rows = fetch_all(session, sql, params)[:40]
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


def _resolve_unit(
    session: Session, sus_no: str, unit_name: str
) -> dict:
    sus = sus_no.strip().upper()
    name = unit_name.strip().upper()
    row = fetch_one(
        session,
        """
        SELECT id, unit_name, sus_no, form_code, status FROM MMS_ORBAT_UNIT_DETL
        WHERE UPPER(sus_no) = :sus AND UPPER(status) = 'ACTIVE'
        AND (UPPER(unit_name) = :uname OR UPPER(unit_name) LIKE :uname_like)
        """,
        {"sus": sus, "uname": name, "uname_like": f"%{name}%"},
    )
    if row is None:
        by_sus = fetch_one(
            session,
            "SELECT id, unit_name, sus_no, form_code, status FROM MMS_ORBAT_UNIT_DETL WHERE UPPER(sus_no) = :sus AND UPPER(status) = 'ACTIVE'",
            {"sus": sus},
        )
        if by_sus is None:
            raise HTTPException(
                status_code=404,
                detail=f"No active ORBAT unit for SUS No '{sus_no.strip()}'",
            )
        by_name = str(by_sus.get("unit_name") or "").upper()
        if name not in by_name:
            raise HTTPException(
                status_code=400,
                detail=f"Unit's Name does not match SUS No (expected '{by_sus.get('unit_name')}')",
            )
        return by_sus
    return row


def _material_for_census(session: Session, census_nos: set[str]) -> dict[str, str]:
    if not census_nos:
        return {}
    in_clause = ", ".join(f":c_{i}" for i in range(len(census_nos)))
    params = {f"c_{i}": c.upper() for i, c in enumerate(census_nos) if c}
    rows = fetch_all(
        session,
        f"SELECT census_no, material_no FROM MMS_MLCCS_EQUIPMENT_MASTER WHERE UPPER(census_no) IN ({in_clause})",
        params,
    )
    return {
        str(r["census_no"]).strip().upper(): str(r["material_no"]).strip()
        for r in rows
        if r.get("census_no") and r.get("material_no")
    }


@router.post("/search", response_model=list[NewEqptOut])
def search_new_eqpt(
    body: SearchIn,
    session: Session = Depends(get_db_session),
    _: Principal = Depends(require_unit_or_admin),
) -> list[NewEqptOut]:
    status_key = body.status.strip().lower()
    if status_key not in _STATUS_CODES:
        raise HTTPException(
            status_code=400,
            detail="Status must be Pending, Approved, or Rejected",
        )
    status_codes = _STATUS_CODES[status_key]

    unit = _resolve_unit(session, body.sus_no, body.unit_name)
    sus = str(unit["sus_no"]).strip().upper()

    date_from = datetime.combine(body.date_from, datetime.min.time())
    date_to = (
        datetime.combine(body.date_to, datetime.max.time())
        if body.date_to is not None
        else None
    )

    results: list[tuple[str, dict, str]] = []
    st_clause = ", ".join(f":s_{i}" for i in range(len(status_codes)))
    base_params = {f"s_{i}": s for i, s in enumerate(status_codes)}
    base_params["sus"] = sus
    base_params["dfrom"] = date_from

    date_clause = " AND iv_date >= :dfrom"
    if date_to is not None:
        date_clause += " AND iv_date <= :dto"
        base_params["dto"] = date_to

    for source, table_name in _TABLE_MAP.items():
        sql = f"""
            SELECT * FROM {table_name}
            WHERE UPPER(to_sus_no) = :sus
            AND UPPER(TRIM(COALESCE(op_status, ''))) IN ({st_clause})
            {date_clause}
            ORDER BY iv_date DESC
        """
        rows = fetch_all(session, sql, base_params)
        for r in rows:
            results.append((source, r, str(unit["unit_name"])))

    census_nos = {
        str(r.get("census_no")).strip()
        for _, r, _ in results
        if r.get("census_no")
    }
    materials = _material_for_census(session, census_nos)
    hldg_labels = _holding_label_map(session)

    out: list[NewEqptOut] = []
    for source, row, unit_name in results:
        census = str(row.get("census_no") or "").strip()
        op = str(row.get("op_status") or "").strip().upper() or None
        hldg = str(row.get("type_of_hldg") or "").strip() or None
        holding_sus = str(row.get("to_sus_no") or sus).strip()
        out.append(
            NewEqptOut(
                id=str(row["id"]),
                source_table=source,
                iv_no=row.get("iv_no"),
                iv_date=_fmt_date(row.get("iv_date")),
                unit_name=unit_name,
                sus_no=holding_sus,
                material_no=materials.get(census.upper()) if census else None,
                census_no=census or None,
                type_of_hldg=hldg,
                type_of_hldg_label=(
                    hldg_labels.get(hldg.upper(), hldg) if hldg else None
                ),
                status=_status_label(op),
                op_status=op,
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
        if current == _APPROVED_CODE or current == "A":
            continue
        if current not in _PENDING_CODES and current not in ("", "2", "R"):
            raise HTTPException(
                status_code=400,
                detail=f"Record '{row_id}' cannot be approved (status={current})",
            )

        execute_sql(
            session,
            f"UPDATE {table_name} SET op_status = :st, approved_by = :app_by, approved_date = :app_dt WHERE id = :rid OR TO_CHAR(id) = :rid_str",
            {"st": _APPROVED_CODE, "app_by": actor, "app_dt": now, "rid": row_id, "rid_str": row_id},
        )
        approved.append(f"{source}:{row_id}")

    return ApproveOut(approved_ids=approved, count=len(approved))
