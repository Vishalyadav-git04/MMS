"""MMS Domain Master — CRUD against MMS_DOMAIN_VALUES using Native SQL."""

from __future__ import annotations

import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.principal import Principal
from app.deps import get_db_session, get_principal
from app.db.native_utils import execute_sql, fetch_all, fetch_one
from app.utils.ids import next_int_id


def _clean_text(val: str | None) -> str:
    if not val:
        return ""
    return re.sub(r"[^A-Z0-9\s\-_/]", "", val.strip().upper())


router = APIRouter(
    prefix="/admin/mms-domain-master",
    tags=["admin: mms domain master"],
)


class DomainValueIn(BaseModel):
    domain_name: str = Field(..., min_length=1)
    code_value: str = Field(..., min_length=1)
    label_name: str = Field(..., min_length=1)
    label_short: str | None = None
    disp_order: str | None = None
    module: str | None = "MMS"


class DomainValueOut(DomainValueIn):
    id: str | int
    created_by: str | None = None
    created_date: str | None = None
    updated_by: str | None = None
    updated_date: str | None = None
    version_no: str | None = None


def _fmt_dt(value: Any) -> str | None:
    if isinstance(value, datetime):
        return value.isoformat(timespec="seconds")
    if value is not None:
        return str(value)
    return None


def _to_out(row: dict) -> DomainValueOut:
    return DomainValueOut(
        id=str(row.get("id") or ""),
        domain_name=str(row.get("domain_name") or ""),
        code_value=str(row.get("code_value") or ""),
        label_name=str(row.get("label_name") or ""),
        label_short=row.get("label_short"),
        disp_order=row.get("disp_order"),
        module=row.get("module"),
        created_by=row.get("created_by"),
        created_date=_fmt_dt(row.get("created_date")),
        updated_by=row.get("updated_by"),
        updated_date=_fmt_dt(row.get("updated_date")),
        version_no=row.get("version_no"),
    )


def _assert_unique_within_domain(
    session: Session,
    *,
    domain: str,
    code: str,
    label: str,
    short: str,
    order: str | None,
    exclude_id: str | None = None,
) -> None:
    domain_u = domain.upper()
    checks: list[tuple[str, str, str]] = [
        ("Code Value", "code_value", code),
        ("Label Name", "label_name", label),
        ("Label Short", "label_short", short),
    ]
    if order is not None:
        checks.append(("Display Order", "disp_order", order))

    for field_label, col_name, value in checks:
        sql = f"SELECT id FROM MMS_DOMAIN_VALUES WHERE UPPER(domain_name) = :dname AND UPPER(TRIM({col_name})) = :val"
        params: dict = {"dname": domain_u, "val": value.upper()}
        if exclude_id is not None:
            sql += " AND id != :ex_id AND TO_CHAR(id) != :ex_id_str"
            params["ex_id"] = exclude_id
            params["ex_id_str"] = str(exclude_id)

        clash = fetch_one(session, sql, params)
        if clash is not None:
            raise HTTPException(
                status_code=409,
                detail=f"{field_label} '{value}' already exists in domain '{domain}'",
            )


@router.get("/domains")
def list_domain_names(session: Session = Depends(get_db_session)) -> list[str]:
    rows = fetch_all(session, "SELECT DISTINCT domain_name FROM MMS_DOMAIN_VALUES WHERE domain_name IS NOT NULL ORDER BY domain_name")
    return [str(r["domain_name"]) for r in rows if r.get("domain_name")]


@router.get("/suggest-domains", response_model=list[str])
def suggest_domains(
    q: str = Query(""),
    session: Session = Depends(get_db_session),
) -> list[str]:
    term = q.strip().upper()
    sql = "SELECT DISTINCT domain_name FROM MMS_DOMAIN_VALUES WHERE domain_name IS NOT NULL"
    params: dict = {}
    if term:
        sql += " AND UPPER(domain_name) LIKE :term"
        params["term"] = f"%{term}%"

    sql += " ORDER BY domain_name"
    rows = fetch_all(session, sql, params)[:50]
    return [str(r["domain_name"]) for r in rows if r.get("domain_name") and str(r["domain_name"]).strip()]


@router.get("/search", response_model=list[DomainValueOut])
def search_domain(
    domain_name: str | None = None,
    session: Session = Depends(get_db_session),
) -> list[DomainValueOut]:
    sql = """
        SELECT id, domain_name, code_value, label_name, label_short, disp_order,
               module, created_by, created_date, updated_by, updated_date, version_no
        FROM MMS_DOMAIN_VALUES
    """
    params: dict = {}
    if domain_name and domain_name.strip():
        sql += " WHERE UPPER(domain_name) = :dname"
        params["dname"] = domain_name.strip().upper()

    sql += " ORDER BY domain_name, LPAD(NVL(disp_order, '9999'), 10, '0'), label_name"
    rows = fetch_all(session, sql, params)
    return [_to_out(r) for r in rows]


@router.post("/", response_model=DomainValueOut)
def create_domain_value(
    body: DomainValueIn,
    session: Session = Depends(get_db_session),
    principal: Principal = Depends(get_principal),
) -> DomainValueOut:
    domain = _clean_text(body.domain_name)
    code = _clean_text(body.code_value)
    label = _clean_text(body.label_name)
    short = (_clean_text(body.label_short) or label)[:10]
    order = re.sub(r"[^0-9]", "", (body.disp_order or "").strip()) or None

    _assert_unique_within_domain(
        session,
        domain=domain,
        code=code,
        label=label,
        short=short,
        order=order,
    )

    now = datetime.now()
    actor = principal.username
    next_id = str(next_int_id(session, "MMS_DOMAIN_VALUES"))

    row_data = {
        "id": next_id,
        "domain_name": domain,
        "code_value": code,
        "label_name": label,
        "label_short": short,
        "disp_order": order,
        "module": _clean_text(body.module) or "MMS",
        "created_by": actor,
        "created_date": now,
        "updated_by": actor,
        "updated_date": now,
        "version_no": "1",
    }
    execute_sql(
        session,
        """
        INSERT INTO MMS_DOMAIN_VALUES (
            id, domain_name, code_value, label_name, label_short, disp_order, module,
            created_by, created_date, updated_by, updated_date, version_no
        ) VALUES (
            :id, :domain_name, :code_value, :label_name, :label_short, :disp_order, :module,
            :created_by, :created_date, :updated_by, :updated_date, :version_no
        )
        """,
        row_data,
    )
    return _to_out(row_data)


@router.put("/{row_id}", response_model=DomainValueOut)
def update_domain_value(
    row_id: str,
    body: DomainValueIn,
    session: Session = Depends(get_db_session),
    principal: Principal = Depends(get_principal),
) -> DomainValueOut:
    row = fetch_one(session, "SELECT * FROM MMS_DOMAIN_VALUES WHERE id = :rid OR TO_CHAR(id) = :rid_str", {"rid": row_id, "rid_str": str(row_id)})
    if row is None:
        raise HTTPException(status_code=404, detail="Domain value not found")

    domain = _clean_text(body.domain_name)
    code = _clean_text(body.code_value)
    label = _clean_text(body.label_name)
    short = (_clean_text(body.label_short) or label)[:10]
    order = re.sub(r"[^0-9]", "", (body.disp_order or "").strip()) or None

    _assert_unique_within_domain(
        session,
        domain=domain,
        code=code,
        label=label,
        short=short,
        order=order,
        exclude_id=row_id,
    )

    now = datetime.now()
    try:
        next_ver = str(int((str(row.get("version_no") or "1")).strip() or "1") + 1)
    except ValueError:
        next_ver = "1"

    update_params = {
        "domain_name": domain,
        "code_value": code,
        "label_name": label,
        "label_short": short,
        "disp_order": order,
        "module": (body.module or row.get("module") or "MMS").strip() or "MMS",
        "updated_by": principal.username,
        "updated_date": now,
        "version_no": next_ver,
        "rid": row_id,
        "rid_str": str(row_id),
    }

    execute_sql(
        session,
        """
        UPDATE MMS_DOMAIN_VALUES
        SET domain_name = :domain_name,
            code_value = :code_value,
            label_name = :label_name,
            label_short = :label_short,
            disp_order = :disp_order,
            module = :module,
            updated_by = :updated_by,
            updated_date = :updated_date,
            version_no = :version_no
        WHERE id = :rid OR TO_CHAR(id) = :rid_str
        """,
        update_params,
    )
    updated_row = fetch_one(session, "SELECT * FROM MMS_DOMAIN_VALUES WHERE id = :rid OR TO_CHAR(id) = :rid_str", {"rid": row_id, "rid_str": str(row_id)})
    return _to_out(updated_row or {})


@router.delete("/{row_id}")
def delete_domain_value(
    row_id: str,
    session: Session = Depends(get_db_session),
    _principal: Principal = Depends(get_principal),
) -> dict[str, str]:
    row = fetch_one(session, "SELECT id FROM MMS_DOMAIN_VALUES WHERE id = :rid OR TO_CHAR(id) = :rid_str", {"rid": row_id, "rid_str": str(row_id)})
    if row is None:
        raise HTTPException(status_code=404, detail="Domain value not found")
    execute_sql(session, "DELETE FROM MMS_DOMAIN_VALUES WHERE id = :rid OR TO_CHAR(id) = :rid_str", {"rid": row_id, "rid_str": str(row_id)})
    return {"status": "deleted", "id": row_id}
