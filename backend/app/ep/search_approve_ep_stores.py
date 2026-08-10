"""Search / Approve EP Stores — query and update MMS_EP_TRANSACTION using Native SQL."""

from __future__ import annotations

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.deps import get_db_session, get_principal
from app.auth.principal import Principal
from app.db.native_utils import execute_sql, fetch_all, fetch_one, get_opstatus_code_value
from app.utils.ids import get_by_id

router = APIRouter(
    prefix="/ep/search-approve",
    tags=["ep: search approve"],
)

_STATUS_CODES = {
    "approved": ["A", "1", "APPROVED"],
    "pending": ["P", "0", "PENDING"],
    "rejected": ["R", "2", "REJECTED"],
}

_STATUS_LABEL = {
    "A": "Approved",
    "1": "Approved",
    "APPROVED": "Approved",
    "P": "Pending",
    "0": "Pending",
    "PENDING": "Pending",
    "R": "Rejected",
    "2": "Rejected",
    "REJECTED": "Rejected",
}


class SearchEpIn(BaseModel):
    sus_no: str | None = None
    unit_name: str | None = None
    status: str | None = "All"
    date_from: date | None = None
    date_to: date | None = None


class EpTxnOut(BaseModel):
    id: str | int
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
    sanction_auth: str | None = None
    upload_auth_letter: str | None = None
    upload_voucher: str | None = None
    created_by: str | None = None
    created_date: str | None = None
    approved_by: str | None = None
    approved_date: str | None = None
    domain_name: str | None = None
    sub_domain_name: str | None = None


class ApproveEpIn(BaseModel):
    ids: list[str | int] = Field(..., min_length=1)


class ApproveEpOut(BaseModel):
    approved_ids: list[str | int]
    count: int


class RejectEpIn(BaseModel):
    ids: list[str | int] = Field(..., min_length=1)


class RejectEpOut(BaseModel):
    rejected_ids: list[str | int]
    count: int


def _to_out(row: dict) -> EpTxnOut:
    status = str(row.get("op_status") or "").strip().upper()
    auth = row.get("auth_date")
    iv = row.get("iv_date")
    c_dt = row.get("created_date")
    a_dt = row.get("approved_date")
    return EpTxnOut(
        id=str(row.get("id") or ""),
        sus_no=row.get("to_sus_no"),
        unit_name=row.get("unit_name"),
        issued_from=row.get("issued_from"),
        from_sus_no=row.get("from_sus_no"),
        census_no=row.get("census_no"),
        auth_letter_no=row.get("auth_letter_no"),
        auth_date=auth.date().isoformat() if isinstance(auth, datetime) else (str(auth) if auth else None),
        iv_no=row.get("iv_no"),
        iv_date=iv.date().isoformat() if isinstance(iv, datetime) else (str(iv) if iv else None),
        qty=row.get("qty"),
        eqpt_regn_no=row.get("eqpt_regn_no"),
        service_status=row.get("service_status"),
        op_status=status or None,
        op_status_label=_STATUS_LABEL.get(status, status or None),
        remarks=row.get("remarks"),
        sanction_auth=row.get("sanction_auth"),
        upload_auth_letter=row.get("upload_auth_letter"),
        upload_voucher=row.get("upload_voucher"),
        created_by=row.get("created_by"),
        created_date=c_dt.isoformat() if isinstance(c_dt, datetime) else (str(c_dt) if c_dt else None),
        approved_by=row.get("approved_by"),
        approved_date=a_dt.isoformat() if isinstance(a_dt, datetime) else (str(a_dt) if a_dt else None),
        domain_name=row.get("domain_name"),
        sub_domain_name=row.get("sub_domain_name"),
    )


@router.post("/search", response_model=list[EpTxnOut])
def search_transactions(
    body: SearchEpIn,
    session: Session = Depends(get_db_session),
) -> list[EpTxnOut]:
    status_key = (body.status or "all").strip().lower()
    if not status_key:
        status_key = "all"
    if status_key not in _STATUS_CODES and status_key != "all":
        raise HTTPException(
            status_code=400,
            detail="Status must be Approved, Pending, Rejected, or All",
        )

    sql = """
        SELECT t.id, t.to_sus_no, t.issued_from, t.from_sus_no, t.census_no,
               t.auth_letter_no, t.auth_date, t.iv_no, t.iv_date, t.qty,
               t.eqpt_regn_no, t.service_status, t.op_status, t.remarks, u.unit_name,
               t.sanction_auth, t.upload_auth_letter, t.upload_voucher,
               t.created_by, t.created_date, t.approved_by, t.approved_date,
               d.eqpt_cat AS domain_name, s.sub_domain_name
        FROM MMS_EP_TRANSACTION t
        LEFT JOIN MMS_EP_HOLDING_UNIT u ON UPPER(u.sus_no) = UPPER(t.to_sus_no)
        LEFT JOIN MMS_EP_DOMAIN_MASTER d ON (d.domain_id = t.domain_id OR TO_CHAR(d.domain_id) = t.domain_id)
        LEFT JOIN MMS_EP_SUB_DOMAIN s ON (s.sub_domain_id = t.sub_domain_id OR TO_CHAR(s.sub_domain_id) = t.sub_domain_id)
        WHERE 1=1
    """
    params: dict = {}

    if body.sus_no and body.sus_no.strip():
        sus = body.sus_no.strip().upper()
        sql += " AND (UPPER(t.to_sus_no) = :sus OR UPPER(u.sus_no) = :sus)"
        params["sus"] = sus

    if body.unit_name and body.unit_name.strip():
        unit = body.unit_name.strip().upper()
        sql += " AND (UPPER(u.unit_name) LIKE :unit OR UPPER(u.unit_name) = :exact_unit)"
        params["unit"] = f"%{unit}%"
        params["exact_unit"] = unit

    if status_key != "all":
        codes = _STATUS_CODES[status_key]
        in_clause = ", ".join(f":st_{i}" for i in range(len(codes)))
        sql += f" AND UPPER(TRIM(t.op_status)) IN ({in_clause})"
        for i, c in enumerate(codes):
            params[f"st_{i}"] = c

    if body.date_from is not None or body.date_to is not None:
        sql += " AND COALESCE(t.auth_date, t.from_tr_date, t.created_date) "
        if body.date_from is not None and body.date_to is not None:
            sql += " BETWEEN :dfrom AND :dto"
            params["dfrom"] = datetime.combine(body.date_from, datetime.min.time())
            params["dto"] = datetime.combine(body.date_to, datetime.max.time())
        elif body.date_from is not None:
            sql += " >= :dfrom"
            params["dfrom"] = datetime.combine(body.date_from, datetime.min.time())
        elif body.date_to is not None:
            sql += " <= :dto"
            params["dto"] = datetime.combine(body.date_to, datetime.max.time())

    sql += " ORDER BY CAST(t.id AS INT) DESC, t.id DESC"
    rows = fetch_all(session, sql, params)
    return [_to_out(r) for r in rows]


@router.post("/approve", response_model=ApproveEpOut)
def approve_transactions(
    body: ApproveEpIn,
    session: Session = Depends(get_db_session),
    principal: Principal = Depends(get_principal),
) -> ApproveEpOut:
    raw_ids = [str(i).strip() for i in body.ids if i is not None and str(i).strip()]
    if not raw_ids:
        raise HTTPException(status_code=400, detail="No records selected")

    now = datetime.now()
    approved: list[str] = []
    approved_code = get_opstatus_code_value(session, "APPROVED", "A")

    for txn_id in raw_ids:
        row = get_by_id(session, "MMS_EP_TRANSACTION", txn_id)
        if row is None:
            raise HTTPException(status_code=404, detail=f"Record '{txn_id}' not found")
        curr_status = str(row.get("op_status") or "").strip().upper()
        if curr_status == approved_code.upper():
            continue
        execute_sql(
            session,
            """
            UPDATE MMS_EP_TRANSACTION
            SET op_status = :status, approved_by = :app_by, approved_date = :app_date
            WHERE id = :id OR TO_CHAR(id) = :id_str
            """,
            {
                "status": approved_code,
                "app_by": principal.username,
                "app_date": now,
                "id": row.get("id"),
                "id_str": str(row.get("id")),
            },
        )
        approved.append(str(row.get("id")))

    return ApproveEpOut(approved_ids=approved, count=len(approved))


@router.post("/reject", response_model=RejectEpOut)
def reject_transactions(
    body: RejectEpIn,
    session: Session = Depends(get_db_session),
    principal: Principal = Depends(get_principal),
) -> RejectEpOut:
    raw_ids = [str(i).strip() for i in body.ids if i is not None and str(i).strip()]
    if not raw_ids:
        raise HTTPException(status_code=400, detail="No records selected")

    now = datetime.now()
    rejected: list[str] = []
    rejected_code = get_opstatus_code_value(session, "REJECTED", "R")

    for txn_id in raw_ids:
        row = get_by_id(session, "MMS_EP_TRANSACTION", txn_id)
        if row is None:
            raise HTTPException(status_code=404, detail=f"Record '{txn_id}' not found")
        curr_status = str(row.get("op_status") or "").strip().upper()
        if curr_status == rejected_code.upper():
            continue
        execute_sql(
            session,
            """
            UPDATE MMS_EP_TRANSACTION
            SET op_status = :status, approved_by = :app_by, approved_date = :app_date
            WHERE id = :id OR TO_CHAR(id) = :id_str
            """,
            {
                "status": rejected_code,
                "app_by": principal.username,
                "app_date": now,
                "id": row.get("id"),
                "id_str": str(row.get("id")),
            },
        )
        rejected.append(str(row.get("id")))

    return RejectEpOut(rejected_ids=rejected, count=len(rejected))
