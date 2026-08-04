"""Sub Domain Master — CRUD against MMS_EP_SUB_DOMAIN."""

from __future__ import annotations

import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.deps import get_db_session, get_principal
from app.models import EpDomainMaster, EpSubDomain
from app.auth.principal import Principal

router = APIRouter(
    prefix="/ep/sub-domain-master",
    tags=["ep: sub domain master"],
)


class EpSubDomainIn(BaseModel):
    equipment_domain_id: str = Field(..., min_length=1, max_length=36)
    sub_domain_name: str = Field(..., min_length=1, max_length=4000)


class EpSubDomainOut(BaseModel):
    id: str
    equipment_domain_id: str
    sub_domain_id: int
    sub_domain_name: str
    eqpt_cat: str | None = None
    created_by: str | None = None


def _to_out(row: EpSubDomain, eqpt_cat: str | None = None) -> EpSubDomainOut:
    return EpSubDomainOut(
        id=row.id,
        equipment_domain_id=row.equipment_domain_id,
        sub_domain_id=row.sub_domain_id,
        sub_domain_name=row.sub_domain_name,
        eqpt_cat=eqpt_cat,
        created_by=row.created_by,
    )


@router.get("/search", response_model=list[EpSubDomainOut])
def search_sub_domains(
    equipment_domain_id: str | None = None,
    sub_domain_name: str | None = None,
    session: Session = Depends(get_db_session),
) -> list[EpSubDomainOut]:
    stmt = (
        select(EpSubDomain, EpDomainMaster.eqpt_cat)
        .outerjoin(
            EpDomainMaster,
            EpDomainMaster.id == EpSubDomain.equipment_domain_id,
        )
        .order_by(EpSubDomain.sub_domain_id)
    )
    if equipment_domain_id and equipment_domain_id.strip():
        stmt = stmt.where(
            EpSubDomain.equipment_domain_id == equipment_domain_id.strip()
        )
    if sub_domain_name and sub_domain_name.strip():
        stmt = stmt.where(
            func.upper(EpSubDomain.sub_domain_name).like(
                f"%{sub_domain_name.strip().upper()}%"
            )
        )
    return [_to_out(row, cat) for row, cat in session.execute(stmt).all()]


@router.post("/", response_model=EpSubDomainOut)
def create_sub_domain(
    body: EpSubDomainIn,
    session: Session = Depends(get_db_session),
    principal: Principal = Depends(get_principal),
) -> EpSubDomainOut:
    domain_id = body.equipment_domain_id.strip()
    name = re.sub(r"[^A-Z0-9\s\-/]", "", body.sub_domain_name.strip().upper())
    if not domain_id or not name:
        raise HTTPException(
            status_code=400,
            detail="EQPT CAT and Sub Domain Name are required",
        )

    domain = session.get(EpDomainMaster, domain_id)
    if domain is None:
        raise HTTPException(status_code=400, detail="Invalid EQPT CAT selected")

    clash = session.scalar(
        select(EpSubDomain).where(
            func.upper(EpSubDomain.sub_domain_name) == name
        )
    )
    if clash is not None:
        raise HTTPException(
            status_code=409,
            detail=f"Sub Domain '{name}' already exists",
        )

    next_id = (
        session.scalar(select(func.coalesce(func.max(EpSubDomain.sub_domain_id), 0)))
        or 0
    ) + 1

    now = datetime.now()
    row = EpSubDomain(
        id=str(next_id),
        equipment_domain_id=domain_id,
        sub_domain_id=next_id,
        sub_domain_name=name,
        created_by=principal.username,
        created_date=now,
    )
    session.add(row)
    session.flush()
    return _to_out(row, domain.eqpt_cat)
