"""Capture EP Stores — lookups + persist to MMS_EP_TRANSACTION."""

from __future__ import annotations

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.deps import get_db_session, get_principal
from app.models import (
    DomainValue,
    EpDomainMaster,
    EpHoldingUnit,
    EpIssuerUnit,
    EpMstr,
    EpSubDomain,
    EpTransaction,
    OrbatUnitDetl,
)
from app.auth.principal import Principal
from app.utils.ids import next_int_id

router = APIRouter(
    prefix="/ep/capture",
    tags=["ep: capture stores"],
)


class DomainOptionOut(BaseModel):
    code_value: str
    label_name: str


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
    serviceability: str | None = "SR"


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


@router.get("/sanctioning-auths", response_model=list[DomainOptionOut])
def list_sanctioning_auths(
    session: Session = Depends(get_db_session),
) -> list[DomainOptionOut]:
    dv_rows = session.scalars(
        select(DomainValue)
        .where(func.upper(DomainValue.domain_name) == "EPAUTHORITY")
        .order_by(
            func.lpad(func.coalesce(DomainValue.disp_order, "9999"), 10, "0"),
            DomainValue.label_name,
        )
    ).all()
    if dv_rows:
        return [
            DomainOptionOut(
                code_value=r.code_value or r.label_name or "",
                label_name=r.label_name or r.code_value or "",
            )
            for r in dv_rows
            if r.code_value or r.label_name
        ]

    # Fallback from EpIssuerUnit if MMS_DOMAIN_VALUES doesn't have EPAUTHORITY yet
    unit_auths = session.scalars(
        select(EpIssuerUnit.sanctioning_auth)
        .distinct()
        .order_by(EpIssuerUnit.sanctioning_auth)
    ).all()
    auth_list = [r for r in unit_auths if r]
    if not auth_list:
        auth_list = ["DG CD", "DGOS", "DGAS", "DGEME"]
    return [DomainOptionOut(code_value=a, label_name=a) for a in auth_list]


@router.get("/serviceability-options", response_model=list[DomainOptionOut])
def list_serviceability_options(
    session: Session = Depends(get_db_session),
) -> list[DomainOptionOut]:
    dv_rows = session.scalars(
        select(DomainValue)
        .where(func.upper(DomainValue.domain_name) == "SERVICEABLITY")
        .order_by(
            func.lpad(func.coalesce(DomainValue.disp_order, "9999"), 10, "0"),
            DomainValue.label_name,
        )
    ).all()
    if dv_rows:
        return [
            DomainOptionOut(
                code_value=r.code_value or r.label_name or "",
                label_name=r.label_name or r.code_value or "",
            )
            for r in dv_rows
            if r.code_value or r.label_name
        ]
    return [
        DomainOptionOut(code_value="SR", label_name="Serviceable"),
        DomainOptionOut(code_value="USR", label_name="Unserviceable"),
        DomainOptionOut(code_value="BOH", label_name="BOH"),
        DomainOptionOut(code_value="EOA", label_name="EOA"),
        DomainOptionOut(code_value="R4", label_name="R4"),
    ]


@router.get("/check-iv")
def check_iv_exists(
    iv_no: str,
    session: Session = Depends(get_db_session),
) -> dict[str, bool]:
    clean_iv = iv_no.strip().upper()
    if not clean_iv:
        return {"exists": False}
    count = session.scalar(
        select(func.count(EpTransaction.id)).where(
            func.upper(EpTransaction.iv_no) == clean_iv
        )
    )
    return {"exists": bool(count and count > 0)}


@router.get("/issuer-units", response_model=list[IssuerUnitOut])
def search_issuer_units(
    q: str | None = None,
    by: str | None = None,
    sanctioning_auth: str | None = None,
    session: Session = Depends(get_db_session),
) -> list[IssuerUnitOut]:
    stmt = (
        select(OrbatUnitDetl)
        .where(func.upper(OrbatUnitDetl.status) == "ACTIVE")
        .order_by(OrbatUnitDetl.unit_name)
    )
    if q and q.strip():
        like = f"%{q.strip().upper()}%"
        if by == "name":
            stmt = stmt.where(func.upper(OrbatUnitDetl.unit_name).like(like))
        elif by == "sus":
            stmt = stmt.where(func.upper(OrbatUnitDetl.sus_no).like(like))
        else:
            stmt = stmt.where(
                or_(
                    func.upper(OrbatUnitDetl.unit_name).like(like),
                    func.upper(OrbatUnitDetl.sus_no).like(like),
                )
            )
    orbat_rows = session.scalars(stmt).all()[:20]
    if orbat_rows:
        return [
            IssuerUnitOut(
                id=r.id,
                sanctioning_auth=sanctioning_auth or "DG CD",
                unit_name=r.unit_name,
                sus_no=r.sus_no,
                form_code=r.form_code,
            )
            for r in orbat_rows
        ]

    # Fallback to EpIssuerUnit if MMS_ORBAT_UNIT_DETL has no matches
    ep_stmt = select(EpIssuerUnit).order_by(EpIssuerUnit.unit_name)
    if sanctioning_auth and sanctioning_auth.strip():
        ep_stmt = ep_stmt.where(
            func.upper(EpIssuerUnit.sanctioning_auth)
            == sanctioning_auth.strip().upper()
        )
    if q and q.strip():
        like = f"%{q.strip().upper()}%"
        if by == "name":
            ep_stmt = ep_stmt.where(func.upper(EpIssuerUnit.unit_name).like(like))
        elif by == "sus":
            ep_stmt = ep_stmt.where(func.upper(EpIssuerUnit.sus_no).like(like))
        else:
            ep_stmt = ep_stmt.where(
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
        for r in session.scalars(ep_stmt).all()[:20]
    ]


@router.get("/holding-units", response_model=list[HoldingUnitOut])
def search_holding_units(
    q: str | None = None,
    by: str | None = None,
    session: Session = Depends(get_db_session),
) -> list[HoldingUnitOut]:
    stmt = (
        select(OrbatUnitDetl)
        .where(func.upper(OrbatUnitDetl.status) == "ACTIVE")
        .order_by(OrbatUnitDetl.unit_name)
    )
    if q and q.strip():
        like = f"%{q.strip().upper()}%"
        if by == "name":
            stmt = stmt.where(func.upper(OrbatUnitDetl.unit_name).like(like))
        elif by == "sus":
            stmt = stmt.where(func.upper(OrbatUnitDetl.sus_no).like(like))
        else:
            stmt = stmt.where(
                or_(
                    func.upper(OrbatUnitDetl.unit_name).like(like),
                    func.upper(OrbatUnitDetl.sus_no).like(like),
                )
            )
    orbat_rows = session.scalars(stmt).all()[:20]
    if orbat_rows:
        return [
            HoldingUnitOut(
                id=r.id,
                unit_name=r.unit_name,
                sus_no=r.sus_no,
                form_code=r.form_code,
            )
            for r in orbat_rows
        ]

    # Fallback to EpHoldingUnit
    ep_stmt = select(EpHoldingUnit).order_by(EpHoldingUnit.unit_name)
    if q and q.strip():
        like = f"%{q.strip().upper()}%"
        if by == "name":
            ep_stmt = ep_stmt.where(func.upper(EpHoldingUnit.unit_name).like(like))
        elif by == "sus":
            ep_stmt = ep_stmt.where(func.upper(EpHoldingUnit.sus_no).like(like))
        else:
            ep_stmt = ep_stmt.where(
                or_(
                    func.upper(EpHoldingUnit.unit_name).like(like),
                    func.upper(EpHoldingUnit.sus_no).like(like),
                )
            )
    return [
        HoldingUnitOut(id=r.id, unit_name=r.unit_name, sus_no=r.sus_no, form_code=r.form_code)
        for r in session.scalars(ep_stmt).all()[:20]
    ]



def _next_txn_id(session: Session) -> int:
    return next_int_id(session, EpTransaction)


def _get_domain_code(session: Session, domain_name: str, preferred: str, fallback: str) -> str:
    dv = session.scalar(
        select(DomainValue.code_value).where(
            func.replace(func.upper(DomainValue.domain_name), "_", "")
            == domain_name.replace("_", "").upper(),
            or_(
                func.upper(func.trim(DomainValue.code_value)) == preferred.upper(),
                func.upper(func.trim(DomainValue.label_name)) == preferred.upper(),
            ),
        )
    )
    return (dv or fallback).strip()


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

    issuer_form_code: str | None = None
    orbat_issuer = session.scalar(
        select(OrbatUnitDetl).where(
            func.upper(OrbatUnitDetl.sus_no) == body.issue_sus_no.strip().upper(),
            func.upper(OrbatUnitDetl.status) == "ACTIVE",
        )
    )
    if orbat_issuer and orbat_issuer.form_code:
        issuer_form_code = orbat_issuer.form_code
    else:
        ep_issuer = session.scalar(
            select(EpIssuerUnit).where(
                func.upper(EpIssuerUnit.sus_no) == body.issue_sus_no.strip().upper()
            )
        )
        if ep_issuer and ep_issuer.form_code:
            issuer_form_code = ep_issuer.form_code
    if not issuer_form_code:
        issuer_form_code = "FC01"

    holding_form_code: str | None = None
    orbat_holding = session.scalar(
        select(OrbatUnitDetl).where(
            func.upper(OrbatUnitDetl.sus_no) == body.sus_no.strip().upper(),
            func.upper(OrbatUnitDetl.status) == "ACTIVE",
        )
    )
    if orbat_holding and orbat_holding.form_code:
        holding_form_code = orbat_holding.form_code
    else:
        ep_holding = session.scalar(
            select(EpHoldingUnit).where(
                func.upper(EpHoldingUnit.sus_no) == body.sus_no.strip().upper()
            )
        )
        if ep_holding and ep_holding.form_code:
            holding_form_code = ep_holding.form_code
    if not holding_form_code:
        holding_form_code = "UH01"

    lines = body.equipment
    if body.regn_no_avl == "yes":
        if not lines:
            lines = [EquipLineIn()]
        work_lines = lines[: body.qty] if body.qty else lines
        seen_regn: set[str] = set()
        regn_list: list[str] = []
        for idx, l in enumerate(work_lines, start=1):
            clean_reg = (l.regd_no or "").strip()
            if not clean_reg:
                raise HTTPException(
                    status_code=400,
                    detail=f"Registration number is required for equipment row {idx}",
                )
            clean_upper = clean_reg.upper()
            if clean_upper in seen_regn:
                raise HTTPException(
                    status_code=400,
                    detail=f"Duplicate registration number '{clean_reg}' entered in equipment row {idx}",
                )
            seen_regn.add(clean_upper)
            regn_list.append(clean_upper)

        if regn_list:
            existing_db = session.scalars(
                select(EpTransaction.eqpt_regn_no).where(
                    EpTransaction.eqpt_regn_no.is_not(None),
                    func.upper(func.trim(EpTransaction.eqpt_regn_no)).in_(regn_list),
                )
            ).all()
            if existing_db:
                dups = ", ".join(sorted(set(e for e in existing_db if e)))
                raise HTTPException(
                    status_code=400,
                    detail=f"Equipment registration number(s) '{dups}' already exist in previous transactions",
                )
    else:
        work_lines = [EquipLineIn(serviceability=lines[0].serviceability if lines else "SR")]

    today = date.today()
    if body.auth_date > today:
        raise HTTPException(
            status_code=400,
            detail="Auth Letter Date cannot be a future date",
        )
    if body.iv_date > today:
        raise HTTPException(
            status_code=400,
            detail="IV Date cannot be a future date",
        )

    now = datetime.now()
    auth_dt = datetime.combine(body.auth_date, datetime.min.time())
    iv_dt = datetime.combine(body.iv_date, datetime.min.time())

    # Look up OPSTATUS and TFRSTATUS code values from MMS_DOMAIN_VALUES
    op_status_code = _get_domain_code(session, "OPSTATUS", "PENDING", "0")
    tfr_status_code = _get_domain_code(session, "TFRSTATUS", "PTFR", "PTFR")

    next_id = _next_txn_id(session)
    saved_ids: list[str] = []

    for line in work_lines:
        row = EpTransaction(
            id=str(next_id),
            sanction_auth=body.sanctioning_auth.strip()[:255],
            issued_from=body.issue_sus_no.strip()[:255],
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
            iv_sus_no=body.issue_sus_no.strip()[:255],
            iv_no=body.iv_no.strip()[:255],
            iv_date=iv_dt,
            qty=1 if body.regn_no_avl == "yes" else body.qty,
            eqpt_regn_no=(
                (line.regd_no or "").strip()[:255] or None
                if body.regn_no_avl == "yes"
                else None
            ),
            service_status=(line.serviceability or "SR").strip()[:255],
            remarks=(body.remarks or "").strip()[:255] or None,
            upload_voucher=(body.upload_voucher or "")[:255] or None,
            op_status=op_status_code,
            stores_type=body.sanctioning_auth.strip()[:255],
            tfr_status=tfr_status_code,
            from_form_code=issuer_form_code[:255],
            to_form_code=holding_form_code[:255],
            created_by=principal.username,
            created_date=now,
            upload_by=principal.username,
            upload_date=now,
            approved_by=None,
            approved_date=None,
        )
        session.add(row)
        saved_ids.append(row.id)
        next_id += 1

    session.flush()
    return CaptureEpOut(ids=saved_ids, count=len(saved_ids))


