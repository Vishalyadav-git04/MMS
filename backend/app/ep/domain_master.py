"""EQPT Domain Master — CRUD against MMS_EP_DOMAIN_MASTER."""

from __future__ import annotations

import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.deps import get_db_session, get_principal
from app.models import EpDomainMaster
from app.auth.principal import Principal

router = APIRouter(
    prefix="/ep/domain-master",
    tags=["ep: domain master"],
)


class EpDomainIn(BaseModel):
    eqpt_cat: str = Field(..., min_length=1, max_length=255)


class EpDomainOut(BaseModel):
    id: str
    domain_id: int
    eqpt_cat: str
    created_by: str | None = None


def _to_out(row: EpDomainMaster) -> EpDomainOut:
    return EpDomainOut(
        id=row.id,
        domain_id=row.domain_id,
        eqpt_cat=row.eqpt_cat,
        created_by=row.created_by,
    )


@router.get("/", response_model=list[EpDomainOut])
def list_domains(
    session: Session = Depends(get_db_session),
) -> list[EpDomainOut]:
    rows = session.scalars(
        select(EpDomainMaster).order_by(EpDomainMaster.domain_id)
    ).all()
    return [_to_out(r) for r in rows]


@router.get("/search", response_model=list[EpDomainOut])
def search_domains(
    eqpt_cat: str | None = None,
    session: Session = Depends(get_db_session),
) -> list[EpDomainOut]:
    stmt = select(EpDomainMaster).order_by(EpDomainMaster.domain_id)
    if eqpt_cat and eqpt_cat.strip():
        stmt = stmt.where(
            func.upper(EpDomainMaster.eqpt_cat).like(
                f"%{eqpt_cat.strip().upper()}%"
            )
        )
    return [_to_out(r) for r in session.scalars(stmt).all()]


@router.post("/", response_model=EpDomainOut)
def create_domain(
    body: EpDomainIn,
    session: Session = Depends(get_db_session),
    principal: Principal = Depends(get_principal),
) -> EpDomainOut:
    cat = re.sub(r"[^A-Z0-9\s\-/]", "", body.eqpt_cat.strip().upper())
    if not cat:
        raise HTTPException(status_code=400, detail="EQPT CAT is required")

    clash = session.scalar(
        select(EpDomainMaster).where(
            func.upper(EpDomainMaster.eqpt_cat) == cat
        )
    )
    if clash is not None:
        raise HTTPException(
            status_code=409,
            detail=f"EQPT CAT '{cat}' already exists",
        )

    # Match existing seed rows: ID and DOMAIN_ID are the same integer sequence.
    next_id = (
        session.scalar(select(func.coalesce(func.max(EpDomainMaster.domain_id), 0)))
        or 0
    ) + 1

    now = datetime.now()
    row = EpDomainMaster(
        id=str(next_id),
        domain_id=next_id,
        eqpt_cat=cat,
        created_by=principal.username,
        created_date=now,
    )
    session.add(row)
    session.flush()
    return _to_out(row)
