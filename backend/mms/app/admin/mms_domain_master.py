"""MMS Domain Master — CRUD against MMS_DOMAIN_VALUES."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.principal import Principal
from app.deps import get_db_session, get_principal
from app.models import DomainValue
from app.utils.ids import next_int_id

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
    id: str
    created_by: str | None = None
    created_date: str | None = None
    updated_by: str | None = None
    updated_date: str | None = None
    version_no: str | None = None


def _disp_order_key():
    """Numeric-ish sort so Display Order 1,2,10 sorts correctly (not 1,10,2)."""
    return func.lpad(func.nvl(DomainValue.disp_order, "9999"), 10, "0")


def _to_out(row: DomainValue) -> DomainValueOut:
    return DomainValueOut(
        id=row.id,
        domain_name=row.domain_name or "",
        code_value=row.code_value or "",
        label_name=row.label_name or "",
        label_short=row.label_short,
        disp_order=row.disp_order,
        module=row.module,
        created_by=row.created_by,
        created_date=row.created_date,
        updated_by=row.updated_by,
        updated_date=row.updated_date,
        version_no=row.version_no,
    )


@router.get("/domains")
def list_domain_names(session: Session = Depends(get_db_session)) -> list[str]:
    rows = session.scalars(
        select(DomainValue.domain_name)
        .where(DomainValue.domain_name.is_not(None))
        .distinct()
        .order_by(DomainValue.domain_name)
    ).all()
    return [r for r in rows if r]


@router.get("/suggest-domains", response_model=list[str])
def suggest_domains(
    q: str = Query(""),
    session: Session = Depends(get_db_session),
) -> list[str]:
    """Typeahead for Domain Name — distinct DOMAIN_NAME values."""
    term = q.strip().upper()
    stmt = (
        select(DomainValue.domain_name)
        .where(DomainValue.domain_name.is_not(None))
        .distinct()
        .order_by(DomainValue.domain_name)
    )
    if term:
        stmt = stmt.where(func.upper(DomainValue.domain_name).like(f"%{term}%"))
    rows = session.scalars(stmt.limit(50)).all()
    return [str(r) for r in rows if r and str(r).strip()]


@router.get("/search", response_model=list[DomainValueOut])
def search_domain(
    domain_name: str | None = None,
    session: Session = Depends(get_db_session),
) -> list[DomainValueOut]:
    stmt = select(DomainValue).order_by(
        DomainValue.domain_name,
        _disp_order_key(),
        DomainValue.label_name,
    )
    if domain_name and domain_name.strip():
        stmt = stmt.where(
            func.upper(DomainValue.domain_name) == domain_name.strip().upper()
        )
    return [_to_out(r) for r in session.scalars(stmt).all()]


@router.post("/", response_model=DomainValueOut)
def create_domain_value(
    body: DomainValueIn,
    session: Session = Depends(get_db_session),
    principal: Principal = Depends(get_principal),
) -> DomainValueOut:
    domain = body.domain_name.strip()
    code = body.code_value.strip()
    label = body.label_name.strip()
    short = (body.label_short or "").strip() or label
    order = (body.disp_order or "").strip() or None

    clash = session.scalar(
        select(DomainValue).where(
            func.upper(DomainValue.domain_name) == domain.upper(),
            func.upper(DomainValue.code_value) == code.upper(),
        )
    )
    if clash is not None:
        raise HTTPException(
            status_code=409,
            detail=f"Code '{code}' already exists in domain '{domain}'",
        )

    now = datetime.now().isoformat(timespec="seconds")
    actor = principal.username
    row = DomainValue(
        id=str(next_int_id(session, DomainValue)),
        domain_name=domain,
        code_value=code,
        label_name=label,
        label_short=short[:10],
        disp_order=order,
        module=(body.module or "MMS").strip() or "MMS",
        created_by=actor,
        created_date=now,
        updated_by=actor,
        updated_date=now,
        version_no="1",
    )
    session.add(row)
    session.flush()
    return _to_out(row)
