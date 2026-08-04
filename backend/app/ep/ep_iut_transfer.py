"""EP IUT (Inter Unit Transfer) — backend API endpoints."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.deps import get_db_session
from app.models import (
    DomainValue,
    EpDomainMaster,
    EpSubDomain,
    EpTransaction,
    OrbatUnitDetl,
)

router = APIRouter(
    prefix="/ep/iut",
    tags=["ep: inter unit transfer"],
)

_APPROVED_OP_STATUSES = ("1", "A", "APPROVED")


def _is_approved(col):
    """Filter records whose OP_STATUS is approved (1, A, APPROVED)."""
    return func.upper(func.trim(func.coalesce(col, ""))).in_(_APPROVED_OP_STATUSES)


class ParentUnitOut(BaseModel):
    sus_no: str
    unit_name: str
    display: str


class DomainOptionOut(BaseModel):
    id: str
    eqpt_cat: str


class SubDomainOptionOut(BaseModel):
    id: str
    sub_domain_name: str


class ReceivingUnitOut(BaseModel):
    sus_no: str
    unit_name: str
    form_code: str | None = None
    display: str


class TransferSubmitIn(BaseModel):
    parent_sus_no: str = Field(..., min_length=1)
    receiving_sus_no: str = Field(..., min_length=1)
    domain_id: str = Field(..., min_length=1)
    sub_domain_id: str = Field(..., min_length=1)
    rv_no: str = Field(..., min_length=1)
    rv_date: str = Field(..., min_length=1)
    upload_rv: str | None = None
    regn_numbers: list[str] = Field(..., min_length=1)


class TransferSubmitOut(BaseModel):
    count: int
    transferred_regns: list[str]


@router.get("/parent-units", response_model=list[ParentUnitOut])
def get_parent_units(
    session: Session = Depends(get_db_session),
) -> list[ParentUnitOut]:
    distinct_suses = session.scalars(
        select(func.distinct(EpTransaction.to_sus_no))
        .where(
            EpTransaction.to_sus_no.is_not(None),
            _is_approved(EpTransaction.op_status),
        )
    ).all()

    if not distinct_suses:
        return []

    clean_suses = [s.strip().upper() for s in distinct_suses if s and s.strip()]
    if not clean_suses:
        return []

    orbat_map = {}
    orbat_rows = session.scalars(
        select(OrbatUnitDetl).where(
            func.upper(OrbatUnitDetl.sus_no).in_(clean_suses)
        )
    ).all()
    for row in orbat_rows:
        orbat_map[row.sus_no.strip().upper()] = row.unit_name.strip()

    results: list[ParentUnitOut] = []
    for sus in clean_suses:
        name = orbat_map.get(sus, sus)
        display = f"{sus} - {name}" if name != sus else sus
        results.append(ParentUnitOut(sus_no=sus, unit_name=name, display=display))

    results.sort(key=lambda x: x.display)
    return results


@router.get("/domains", response_model=list[DomainOptionOut])
def get_domains_for_parent(
    parent_sus_no: str = Query(..., min_length=1),
    session: Session = Depends(get_db_session),
) -> list[DomainOptionOut]:
    sus = parent_sus_no.strip().upper()
    domain_ids = session.scalars(
        select(func.distinct(EpTransaction.domain_id))
        .where(
            func.upper(EpTransaction.to_sus_no) == sus,
            EpTransaction.domain_id.is_not(None),
            _is_approved(EpTransaction.op_status),
        )
    ).all()

    if not domain_ids:
        return []

    clean_ids = [d.strip() for d in domain_ids if d and d.strip()]
    domains = session.scalars(
        select(EpDomainMaster).where(EpDomainMaster.id.in_(clean_ids))
    ).all()

    res = [
        DomainOptionOut(id=d.id, eqpt_cat=d.eqpt_cat)
        for d in domains
    ]
    res.sort(key=lambda x: x.eqpt_cat.lower())
    return res


@router.get("/sub-domains", response_model=list[SubDomainOptionOut])
def get_sub_domains_for_parent_domain(
    parent_sus_no: str = Query(..., min_length=1),
    domain_id: str = Query(..., min_length=1),
    session: Session = Depends(get_db_session),
) -> list[SubDomainOptionOut]:
    sus = parent_sus_no.strip().upper()
    dom_id = domain_id.strip()

    sub_ids = session.scalars(
        select(func.distinct(EpTransaction.sub_domain_id))
        .where(
            func.upper(EpTransaction.to_sus_no) == sus,
            EpTransaction.domain_id == dom_id,
            EpTransaction.sub_domain_id.is_not(None),
            _is_approved(EpTransaction.op_status),
        )
    ).all()

    if not sub_ids:
        return []

    clean_ids = [s.strip() for s in sub_ids if s and s.strip()]
    sub_domains = session.scalars(
        select(EpSubDomain).where(EpSubDomain.id.in_(clean_ids))
    ).all()

    res = [
        SubDomainOptionOut(id=s.id, sub_domain_name=s.sub_domain_name)
        for s in sub_domains
    ]
    res.sort(key=lambda x: x.sub_domain_name.lower())
    return res


@router.get("/receiving-units", response_model=list[ReceivingUnitOut])
def get_receiving_units(
    search: str | None = None,
    session: Session = Depends(get_db_session),
) -> list[ReceivingUnitOut]:
    stmt = select(OrbatUnitDetl).where(func.upper(OrbatUnitDetl.status) == "ACTIVE")
    if search and search.strip():
        q = f"%{search.strip().upper()}%"
        stmt = stmt.where(
            or_(
                func.upper(OrbatUnitDetl.unit_name).like(q),
                func.upper(OrbatUnitDetl.sus_no).like(q),
            )
        )
    stmt = stmt.order_by(OrbatUnitDetl.unit_name).limit(100)

    rows = session.scalars(stmt).all()
    results: list[ReceivingUnitOut] = []
    for r in rows:
        display = f"{r.sus_no} - {r.unit_name}"
        results.append(
            ReceivingUnitOut(
                sus_no=r.sus_no,
                unit_name=r.unit_name,
                form_code=r.form_code,
                display=display,
            )
        )
    return results


@router.get("/regn-list", response_model=list[str])
def get_regn_list(
    parent_sus_no: str = Query(..., min_length=1),
    domain_id: str = Query(..., min_length=1),
    sub_domain_id: str = Query(..., min_length=1),
    session: Session = Depends(get_db_session),
) -> list[str]:
    sus = parent_sus_no.strip().upper()
    dom_id = domain_id.strip()
    sub_dom_id = sub_domain_id.strip()

    rows = session.scalars(
        select(EpTransaction.eqpt_regn_no)
        .where(
            func.upper(EpTransaction.to_sus_no) == sus,
            EpTransaction.domain_id == dom_id,
            EpTransaction.sub_domain_id == sub_dom_id,
            EpTransaction.eqpt_regn_no.is_not(None),
            _is_approved(EpTransaction.op_status),
        )
    ).all()

    regns = sorted(list({r.strip() for r in rows if r and r.strip()}))
    return regns


@router.post("/transfer", response_model=TransferSubmitOut)
def submit_transfer(
    body: TransferSubmitIn,
    session: Session = Depends(get_db_session),
) -> TransferSubmitOut:
    parent_sus = body.parent_sus_no.strip().upper()
    rec_sus = body.receiving_sus_no.strip().upper()
    dom_id = body.domain_id.strip()
    sub_dom_id = body.sub_domain_id.strip()

    if not body.regn_numbers:
        raise HTTPException(status_code=400, detail="No registration numbers provided for transfer")

    # Fetch Parent Unit details (for form_code)
    parent_unit = session.scalar(
        select(OrbatUnitDetl).where(func.upper(OrbatUnitDetl.sus_no) == parent_sus)
    )
    parent_form_code = parent_unit.form_code if parent_unit else None

    # Fetch Receiving Unit details (for form_code)
    rec_unit = session.scalar(
        select(OrbatUnitDetl).where(func.upper(OrbatUnitDetl.sus_no) == rec_sus)
    )
    rec_form_code = rec_unit.form_code if rec_unit else None

    # Look up tfr_status code from MMS_DOMAIN_VALUES for TFR_STATUS
    tfr_status_val = session.scalar(
        select(DomainValue.code_value).where(
            func.upper(DomainValue.domain_name) == "TFR_STATUS",
            func.upper(DomainValue.label_name).like("%TRANSFER%"),
        ).limit(1)
    )
    if not tfr_status_val:
        tfr_status_val = session.scalar(
            select(DomainValue.code_value).where(
                func.upper(DomainValue.domain_name) == "TFR_STATUS"
            ).limit(1)
        ) or "TRANSFERRED"

    # Find matching EpTransaction records (must be approved)
    txns = session.scalars(
        select(EpTransaction).where(
            func.upper(EpTransaction.to_sus_no) == parent_sus,
            EpTransaction.domain_id == dom_id,
            EpTransaction.sub_domain_id == sub_dom_id,
            EpTransaction.eqpt_regn_no.in_(body.regn_numbers),
            _is_approved(EpTransaction.op_status),
        )
    ).all()

    if not txns:
        raise HTTPException(status_code=404, detail="No approved transaction records found for transfer")

    now = datetime.now()
    try:
        rv_dt = datetime.strptime(body.rv_date, "%Y-%m-%d")
    except ValueError:
        rv_dt = now

    transferred: list[str] = []
    for row in txns:
        row.issued_from = parent_sus
        row.from_sus_no = parent_sus
        row.iv_sus_no = parent_sus
        row.from_form_code = parent_form_code
        row.to_sus_no = rec_sus
        row.to_form_code = rec_form_code
        row.tfr_status = tfr_status_val
        row.to_tr_date = now
        row.from_tr_date = now
        row.iv_no = body.rv_no.strip()
        row.iv_date = rv_dt
        if body.upload_rv:
            row.upload_voucher = body.upload_rv
        if row.eqpt_regn_no:
            transferred.append(row.eqpt_regn_no)

    session.flush()
    return TransferSubmitOut(count=len(transferred), transferred_regns=transferred)
