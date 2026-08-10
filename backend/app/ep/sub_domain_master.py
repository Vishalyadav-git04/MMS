"""Sub Domain Master — CRUD against MMS_EP_SUB_DOMAIN using Native SQL."""

from __future__ import annotations

import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.deps import get_db_session, get_principal
from app.auth.principal import Principal
from app.db.native_utils import execute_sql, fetch_all, fetch_one
from app.utils.ids import get_by_id

router = APIRouter(
    prefix="/ep/sub-domain-master",
    tags=["ep: sub domain master"],
)


class EpSubDomainIn(BaseModel):
    equipment_domain_id: str | int = Field(...)
    sub_domain_name: str = Field(..., min_length=1, max_length=4000)


class EpSubDomainOut(BaseModel):
    id: str | int
    equipment_domain_id: str | int
    sub_domain_id: int | str
    sub_domain_name: str
    eqpt_cat: str | None = None
    created_by: str | None = None


def _to_out(row: dict) -> EpSubDomainOut:
    return EpSubDomainOut(
        id=str(row.get("id") or ""),
        equipment_domain_id=str(row.get("equipment_domain_id") or ""),
        sub_domain_id=row.get("sub_domain_id") or 0,
        sub_domain_name=str(row.get("sub_domain_name") or ""),
        eqpt_cat=row.get("eqpt_cat"),
        created_by=row.get("created_by"),
    )


@router.get("/search", response_model=list[EpSubDomainOut])
def search_sub_domains(
    equipment_domain_id: str | None = None,
    sub_domain_name: str | None = None,
    session: Session = Depends(get_db_session),
) -> list[EpSubDomainOut]:
    sql = """
        SELECT s.id, s.equipment_domain_id, s.sub_domain_id, s.sub_domain_name, s.created_by,
               d.eqpt_cat
        FROM MMS_EP_SUB_DOMAIN s
        LEFT JOIN MMS_EP_DOMAIN_MASTER d
          ON (d.domain_id = s.equipment_domain_id OR TO_CHAR(d.domain_id) = TO_CHAR(s.equipment_domain_id))
        WHERE 1=1
    """
    params: dict = {}
    if equipment_domain_id and str(equipment_domain_id).strip():
        clean_eid = str(equipment_domain_id).strip()
        sql += " AND (s.equipment_domain_id = :eid OR TO_CHAR(s.equipment_domain_id) = :eid)"
        params["eid"] = clean_eid

    if sub_domain_name and sub_domain_name.strip():
        sql += " AND UPPER(s.sub_domain_name) LIKE :name"
        params["name"] = f"%{sub_domain_name.strip().upper()}%"

    sql += " ORDER BY s.sub_domain_id"
    rows = fetch_all(session, sql, params)
    return [_to_out(r) for r in rows]


@router.post("/", response_model=EpSubDomainOut)
def create_sub_domain(
    body: EpSubDomainIn,
    session: Session = Depends(get_db_session),
    principal: Principal = Depends(get_principal),
) -> EpSubDomainOut:
    domain_id = str(body.equipment_domain_id).strip()
    name = re.sub(r"[^A-Z0-9\s\-/]", "", body.sub_domain_name.strip().upper())
    if not domain_id or not name:
        raise HTTPException(
            status_code=400,
            detail="EQPT CAT and Sub Domain Name are required",
        )

    domain = fetch_one(
        session,
        "SELECT * FROM MMS_EP_DOMAIN_MASTER WHERE domain_id = :did OR TO_CHAR(domain_id) = :did",
        {"did": domain_id},
    )
    if domain is None:
        raise HTTPException(status_code=400, detail="Invalid EQPT CAT selected")

    clash = fetch_one(session, "SELECT id FROM MMS_EP_SUB_DOMAIN WHERE UPPER(sub_domain_name) = :name", {"name": name})
    if clash is not None:
        raise HTTPException(
            status_code=409,
            detail=f"Sub Domain '{name}' already exists",
        )

    max_row = fetch_one(session, "SELECT NVL(MAX(sub_domain_id), 0) AS max_id FROM MMS_EP_SUB_DOMAIN")
    next_id = int((max_row.get("max_id") if max_row else 0) or 0) + 1

    now = datetime.now()
    target_domain_id = str(domain.get("domain_id") if domain.get("domain_id") is not None else domain_id)
    row_data = {
        "id": str(next_id),
        "equipment_domain_id": target_domain_id,
        "sub_domain_id": next_id,
        "sub_domain_name": name,
        "created_by": principal.username,
        "created_date": now,
        "eqpt_cat": domain.get("eqpt_cat"),
    }
    execute_sql(
        session,
        """
        INSERT INTO MMS_EP_SUB_DOMAIN (id, equipment_domain_id, sub_domain_id, sub_domain_name, created_by, created_date)
        VALUES (:id, :equipment_domain_id, :sub_domain_id, :sub_domain_name, :created_by, :created_date)
        """,
        {
            "id": row_data["id"],
            "equipment_domain_id": row_data["equipment_domain_id"],
            "sub_domain_id": row_data["sub_domain_id"],
            "sub_domain_name": row_data["sub_domain_name"],
            "created_by": row_data["created_by"],
            "created_date": row_data["created_date"],
        },
    )
    return _to_out(row_data)
