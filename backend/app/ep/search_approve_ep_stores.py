"""Search / Approve EP Stores — query and update MMS_EP_TRANSACTION."""

from __future__ import annotations

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.deps import get_db_session, get_principal
from app.models import EpHoldingUnit, EpTransaction
from app.auth.principal import Principal

router = APIRouter(
    prefix="/ep/search-approve",
    tags=["ep: search approve"],
)

_STATUS_MAP = {
    "approved": "A",
    "pending": "P",
    "rejected": "R",
}

_STATUS_LABEL = {"A": "Approved", "P": "Pending", "R": "Rejected"}


class SearchEpIn(BaseModel):
    sus_no: str = Field(..., min_length=1, max_length=255)
    unit_name: str = Field(..., min_length=1, max_length=255)
    status: str = Field(..., min_length=1)  # Approved | Pending | Rejected | All
    date_from: date | None = None
    date_to: date | None = None


class EpTxnOut(BaseModel):
    id: str
    sus_no: str | None = None
    unit_name: str | None = None
    issued_from: str | None = None
    from_sus_no: str | None = None
    census_no: str | None = None
    auth_letter_no: str | None = None
    auth_date: str | None = None
    iv_no: str | None = None
    iv_date: str | None = None
    qty: int | None = None
    eqpt_regn_no: str | None = None
    service_status: str | None = None
    op_status: str | None = None
    op_status_label: str | None = None
    remarks: str | None = None


class ApproveEpIn(BaseModel):
    ids: list[str] = Field(..., min_length=1)


class ApproveEpOut(BaseModel):
    approved_ids: list[str]
    count: int


def _to_out(row: EpTransaction, unit_name: str | None) -> EpTxnOut:
    status = (row.op_status or "").upper()
    auth = row.auth_date
    iv = row.iv_date
    return EpTxnOut(
        id=row.id,
        sus_no=row.to_sus_no,
        unit_name=unit_name,
        issued_from=row.issued_from,
        from_sus_no=row.from_sus_no,
        census_no=row.census_no,
        auth_letter_no=row.auth_letter_no,
        auth_date=auth.date().isoformat() if isinstance(auth, datetime) else None,
        iv_no=row.iv_no,
        iv_date=iv.date().isoformat() if isinstance(iv, datetime) else None,
        qty=row.qty,
        eqpt_regn_no=row.eqpt_regn_no,
        service_status=row.service_status,
        op_status=status or None,
        op_status_label=_STATUS_LABEL.get(status, status or None),
        remarks=row.remarks,
    )


@router.post("/search", response_model=list[EpTxnOut])
def search_transactions(
    body: SearchEpIn,
    session: Session = Depends(get_db_session),
) -> list[EpTxnOut]:
    status_key = body.status.strip().lower()
    if status_key not in _STATUS_MAP and status_key != "all":
        raise HTTPException(
            status_code=400,
            detail="Status must be Approved, Pending, Rejected, or All",
        )

    stmt = (
        select(EpTransaction, EpHoldingUnit.unit_name)
        .outerjoin(
            EpHoldingUnit,
            func.upper(EpHoldingUnit.sus_no) == func.upper(EpTransaction.to_sus_no),
        )
        .order_by(EpTransaction.id)
    )

    sus = body.sus_no.strip().upper()
    unit = body.unit_name.strip().upper()
    stmt = stmt.where(
        or_(
            func.upper(EpTransaction.to_sus_no) == sus,
            func.upper(EpHoldingUnit.sus_no) == sus,
        )
    )
    stmt = stmt.where(
        or_(
            func.upper(EpHoldingUnit.unit_name).like(f"%{unit}%"),
            # allow exact-ish match when unit name typed from suggestions
            func.upper(EpHoldingUnit.unit_name) == unit,
        )
    )

    if status_key != "all":
        stmt = stmt.where(
            func.upper(EpTransaction.op_status) == _STATUS_MAP[status_key]
        )

    if body.date_from is not None or body.date_to is not None:
        effective = func.coalesce(
            EpTransaction.auth_date,
            EpTransaction.from_tr_date,
            EpTransaction.created_date,
        )
        if body.date_from is not None:
            stmt = stmt.where(
                effective >= datetime.combine(body.date_from, datetime.min.time())
            )
        if body.date_to is not None:
            stmt = stmt.where(
                effective <= datetime.combine(body.date_to, datetime.max.time())
            )

    return [_to_out(row, name) for row, name in session.execute(stmt).all()]


@router.post("/approve", response_model=ApproveEpOut)
def approve_transactions(
    body: ApproveEpIn,
    session: Session = Depends(get_db_session),
    principal: Principal = Depends(get_principal),
) -> ApproveEpOut:
    ids = [i.strip() for i in body.ids if i and i.strip()]
    if not ids:
        raise HTTPException(status_code=400, detail="No records selected")

    now = datetime.now()
    approved: list[str] = []
    for txn_id in ids:
        row = session.get(EpTransaction, txn_id)
        if row is None:
            raise HTTPException(status_code=404, detail=f"Record '{txn_id}' not found")
        if (row.op_status or "").upper() == "A":
            continue
        if (row.op_status or "").upper() not in ("P", "R", ""):
            raise HTTPException(
                status_code=400,
                detail=f"Record '{txn_id}' cannot be approved (status={row.op_status})",
            )
        row.op_status = "A"
        row.approved_by = principal.username
        row.approved_date = now
        approved.append(row.id)

    session.flush()
    return ApproveEpOut(approved_ids=approved, count=len(approved))
