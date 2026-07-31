"""Capture EP Stores — lookups + persist to MMS_EP_TRANSACTION."""

from __future__ import annotations

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.deps import get_db_session, get_principal
from app.models import (
    EpDomainMaster,
    EpHoldingUnit,
    EpIssuerUnit,
    EpMstr,
    EpSubDomain,
    EpTransaction,
)
from app.auth.principal import Principal
from app.utils.ids import next_int_id

router = APIRouter(
    prefix="/ep/capture",
    tags=["ep: capture stores"],
)


class IssuerUnitOut(BaseModel):
    id: str
    sanctioning_auth: str
    unit_name: str
    sus_no: str
    form_code: str | None = None


class HoldingUnitOut(BaseModel):
    id: str
    unit_name: str
    sus_no: str
    form_code: str | None = None


class EquipLineIn(BaseModel):
    regd_no: str | None = None
    serviceability: str | None = "Serviceable"


class CaptureEpIn(BaseModel):
    sanctioning_auth: str = Field(..., min_length=1, max_length=255)
    issuing_authority: str = Field(..., min_length=1, max_length=255)
    issue_sus_no: str = Field(..., min_length=1, max_length=255)
    auth_letter_no: str = Field(..., min_length=1, max_length=255)
    auth_date: date
    upload_auth_letter: str | None = None
    unit_name: str = Field(..., min_length=1, max_length=255)
    sus_no: str = Field(..., min_length=1, max_length=255)
    iv_no: str = Field(..., min_length=1, max_length=255)
    iv_date: date
    domain_id: str = Field(..., min_length=1, max_length=36)
    sub_domain_id: str = Field(..., min_length=1, max_length=36)
    regn_no_avl: str = Field(..., pattern="^(yes|no)$")
    qty: int = Field(..., ge=1, le=9999)
    upload_voucher: str | None = None
    remarks: str | None = Field(None, max_length=255)
    equipment: list[EquipLineIn] = Field(default_factory=list)


class CaptureEpOut(BaseModel):
    ids: list[str]
    count: int


@router.get("/sanctioning-auths", response_model=list[str])
def list_sanctioning_auths(
    session: Session = Depends(get_db_session),
) -> list[str]:
    rows = session.scalars(
        select(EpIssuerUnit.sanctioning_auth)
        .distinct()
        .order_by(EpIssuerUnit.sanctioning_auth)
    ).all()
    return [r for r in rows if r]


@router.get("/issuer-units", response_model=list[IssuerUnitOut])
def search_issuer_units(
    q: str | None = None,
    sanctioning_auth: str | None = None,
    session: Session = Depends(get_db_session),
) -> list[IssuerUnitOut]:
    stmt = select(EpIssuerUnit).order_by(EpIssuerUnit.unit_name)
    if sanctioning_auth and sanctioning_auth.strip():
        stmt = stmt.where(
            func.upper(EpIssuerUnit.sanctioning_auth)
            == sanctioning_auth.strip().upper()
        )
    if q and q.strip():
        like = f"%{q.strip().upper()}%"
        stmt = stmt.where(
            or_(
                func.upper(EpIssuerUnit.unit_name).like(like),
                func.upper(EpIssuerUnit.sus_no).like(like),
            )
        )
    return [
        IssuerUnitOut(
            id=r.id,
            sanctioning_auth=r.sanctioning_auth,
            unit_name=r.unit_name,
            sus_no=r.sus_no,
            form_code=r.form_code,
        )
        for r in session.scalars(stmt).all()[:20]
    ]


@router.get("/holding-units", response_model=list[HoldingUnitOut])
def search_holding_units(
    q: str | None = None,
    session: Session = Depends(get_db_session),
) -> list[HoldingUnitOut]:
    stmt = select(EpHoldingUnit).order_by(EpHoldingUnit.unit_name)
    if q and q.strip():
        like = f"%{q.strip().upper()}%"
        stmt = stmt.where(
            or_(
                func.upper(EpHoldingUnit.unit_name).like(like),
                func.upper(EpHoldingUnit.sus_no).like(like),
            )
        )
    return [
        HoldingUnitOut(id=r.id, unit_name=r.unit_name, sus_no=r.sus_no, form_code=r.form_code)
        for r in session.scalars(stmt).all()[:20]
    ]


def _next_txn_id(session: Session) -> int:
    return next_int_id(session, EpTransaction)


@router.post("/", response_model=CaptureEpOut)
def submit_capture(
    body: CaptureEpIn,
    session: Session = Depends(get_db_session),
    principal: Principal = Depends(get_principal),
) -> CaptureEpOut:
    domain = session.get(EpDomainMaster, body.domain_id.strip())
    if domain is None:
        raise HTTPException(status_code=400, detail="Invalid Eqpt Category/Domain")

    sub = session.get(EpSubDomain, body.sub_domain_id.strip())
    if sub is None:
        raise HTTPException(status_code=400, detail="Invalid EP Census/Sub Domain")
    if sub.equipment_domain_id != domain.id:
        raise HTTPException(
            status_code=400,
            detail="Sub Domain does not belong to the selected Domain",
        )

    census_no = session.scalar(
        select(EpMstr.census_no)
        .where(
            EpMstr.domain_id == domain.id,
            EpMstr.sub_domain_id == sub.id,
        )
        .order_by(EpMstr.census_no.desc())
        .limit(1)
    )
    if not census_no:
        raise HTTPException(
            status_code=400,
            detail="No census number found in MMS_EP_MSTR for the selected domain and sub domain",
        )

    issuer_unit = session.scalar(
        select(EpIssuerUnit).where(
            func.upper(EpIssuerUnit.sus_no) == body.issue_sus_no.strip().upper(),
            func.upper(EpIssuerUnit.unit_name)
            == body.issuing_authority.strip().upper(),
        )
    )
    if issuer_unit is None:
        issuer_unit = session.scalar(
            select(EpIssuerUnit).where(
                func.upper(EpIssuerUnit.sus_no) == body.issue_sus_no.strip().upper()
            )
        )
    if issuer_unit is None or not issuer_unit.form_code:
        raise HTTPException(
            status_code=400,
            detail="Issuing Authority / Issue SUS No not found in issuer unit master",
        )

    holding_unit = session.scalar(
        select(EpHoldingUnit).where(
            func.upper(EpHoldingUnit.sus_no) == body.sus_no.strip().upper(),
            func.upper(EpHoldingUnit.unit_name) == body.unit_name.strip().upper(),
        )
    )
    if holding_unit is None:
        holding_unit = session.scalar(
            select(EpHoldingUnit).where(
                func.upper(EpHoldingUnit.sus_no) == body.sus_no.strip().upper()
            )
        )
    if holding_unit is None or not holding_unit.form_code:
        raise HTTPException(
            status_code=400,
            detail="Unit Name / SUS No not found in holding unit master",
        )

    now = datetime.now()
    auth_dt = datetime.combine(body.auth_date, datetime.min.time())
    iv_date_str = body.iv_date.isoformat()

    lines = body.equipment
    if body.regn_no_avl == "yes":
        if not lines:
            lines = [EquipLineIn()]
        # one transaction row per equipment line
        work_lines = lines[: body.qty] if body.qty else lines
    else:
        work_lines = [EquipLineIn(serviceability=lines[0].serviceability if lines else "Serviceable")]

    next_id = _next_txn_id(session)
    saved_ids: list[str] = []

    for line in work_lines:
        row = EpTransaction(
            id=str(next_id),
            sanction_auth=body.sanctioning_auth.strip()[:255],
            issued_from=body.issuing_authority.strip()[:255],
            from_sus_no=body.issue_sus_no.strip()[:255],
            auth_letter_no=body.auth_letter_no.strip()[:255],
            auth_date=auth_dt,
            census_no=census_no,
            from_tr_date=now,
            to_tr_date=now,
            upload_auth_letter=(body.upload_auth_letter or "")[:255] or None,
            domain_id=domain.id,
            sub_domain_id=sub.id,
            to_sus_no=body.sus_no.strip()[:255],
            iv_sus_no=None,
            iv_no=body.iv_no.strip()[:255],
            iv_date=iv_date_str,
            qty=1 if body.regn_no_avl == "yes" else body.qty,
            eqpt_regn_no=(
                (line.regd_no or "").strip()[:255] or None
                if body.regn_no_avl == "yes"
                else None
            ),
            service_status=(line.serviceability or "Serviceable")[:255],
            remarks=(body.remarks or "").strip()[:255] or None,
            upload_voucher=(body.upload_voucher or "")[:255] or None,
            op_status="P",
            stores_type="ORD",
            tfr_status="N",
            from_form_code=issuer_unit.form_code[:255],
            to_form_code=holding_unit.form_code[:255],
            created_by=principal.username,
            created_date=now,
            upload_by=principal.username,
            upload_date=now,
        )
        session.add(row)
        saved_ids.append(row.id)
        next_id += 1

    session.flush()
    return CaptureEpOut(ids=saved_ids, count=len(saved_ids))
