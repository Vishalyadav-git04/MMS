"""EQPT Domain Master — CRUD against MMS_EP_DOMAIN_MASTER using Native SQL."""

from __future__ import annotations

import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.deps import get_db_session, get_principal
from app.auth.principal import Principal
from app.db.native_utils import execute_sql, fetch_all, fetch_one

router = APIRouter(
    prefix="/ep/domain-master",
    tags=["ep: domain master"],
)


class EpDomainIn(BaseModel):
    eqpt_cat: str = Field(..., min_length=1, max_length=255)


class EpDomainOut(BaseModel):
    id: str | int
    domain_id: int | str
    eqpt_cat: str
    created_by: str | None = None


def _to_out(row: dict) -> EpDomainOut:
    return EpDomainOut(
        id=str(row.get("id") or ""),
        domain_id=row.get("domain_id") or 0,
        eqpt_cat=str(row.get("eqpt_cat") or ""),
        created_by=row.get("created_by"),
    )


@router.get("/", response_model=list[EpDomainOut])
def list_domains(
    session: Session = Depends(get_db_session),
) -> list[EpDomainOut]:
    rows = fetch_all(session, "SELECT id, domain_id, eqpt_cat, created_by FROM MMS_EP_DOMAIN_MASTER ORDER BY domain_id")
    return [_to_out(r) for r in rows]


@router.get("/search", response_model=list[EpDomainOut])
def search_domains(
    eqpt_cat: str | None = None,
    session: Session = Depends(get_db_session),
) -> list[EpDomainOut]:
    sql = "SELECT id, domain_id, eqpt_cat, created_by FROM MMS_EP_DOMAIN_MASTER"
    params: dict = {}
    if eqpt_cat and eqpt_cat.strip():
        sql += " WHERE UPPER(eqpt_cat) LIKE :cat"
        params["cat"] = f"%{eqpt_cat.strip().upper()}%"
    sql += " ORDER BY domain_id"
    rows = fetch_all(session, sql, params)
    return [_to_out(r) for r in rows]


@router.post("/", response_model=EpDomainOut)
def create_domain(
    body: EpDomainIn,
    session: Session = Depends(get_db_session),
    principal: Principal = Depends(get_principal),
) -> EpDomainOut:
    cat = re.sub(r"[^A-Z0-9\s\-/]", "", body.eqpt_cat.strip().upper())
    if not cat:
        raise HTTPException(status_code=400, detail="EQPT CAT is required")

    clash = fetch_one(session, "SELECT id FROM MMS_EP_DOMAIN_MASTER WHERE UPPER(eqpt_cat) = :cat", {"cat": cat})
    if clash is not None:
        raise HTTPException(
            status_code=409,
            detail=f"EQPT CAT '{cat}' already exists",
        )

    max_row = fetch_one(session, "SELECT NVL(MAX(domain_id), 0) AS max_id FROM MMS_EP_DOMAIN_MASTER")
    next_id = int((max_row.get("max_id") if max_row else 0) or 0) + 1

    now = datetime.now()
    row_data = {
        "id": str(next_id),
        "domain_id": next_id,
        "eqpt_cat": cat,
        "created_by": principal.username,
        "created_date": now,
    }
    execute_sql(
        session,
        """
        INSERT INTO MMS_EP_DOMAIN_MASTER (id, domain_id, eqpt_cat, created_by, created_date)
        VALUES (:id, :domain_id, :eqpt_cat, :created_by, :created_date)
        """,
        row_data,
    )
    return _to_out(row_data)
