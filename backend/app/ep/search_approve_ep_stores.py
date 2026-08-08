"""Search / Approve EP Stores — query and update MMS_EP_TRANSACTION using Native SQL."""

from __future__ import annotations

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.deps import get_db_session, get_principal
from app.auth.principal import Principal
from app.db.native_utils import execute_sql, fetch_all, fetch_one
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
    status: str = Field(..., min_length=1)  # Approved | Pending | Rejected | All
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


class ApproveEpIn(BaseModel):
    ids: list[str | int] = Field(..., min_length=1)


class ApproveEpOut(BaseModel):
    approved_ids: list[str | int]
    count: int


def _to_out(row: dict) -> EpTxnOut:
    status = str(row.get("op_status") or "").strip().upper()
    auth = row.get("auth_date")
    iv = row.get("iv_date")
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
    )


@router.post("/search", response_model=list[EpTxnOut])
def search_transactions(
    body: SearchEpIn,
    session: Session = Depends(get_db_session),
) -> list[EpTxnOut]:
    status_key = body.status.strip().lower()
    if status_key not in _STATUS_CODES and status_key != "all":
        raise HTTPException(
            status_code=400,
            detail="Status must be Approved, Pending, Rejected, or All",
        )

    sql = """
        SELECT t.id, t.to_sus_no, t.issued_from, t.from_sus_no, t.census_no,
               t.auth_letter_no, t.auth_date, t.iv_no, t.iv_date, t.qty,
               t.eqpt_regn_no, t.service_status, t.op_status, t.remarks, u.unit_name
        FROM MMS_EP_TRANSACTION t
        LEFT JOIN MMS_EP_HOLDING_UNIT u ON UPPER(u.sus_no) = UPPER(t.to_sus_no)
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

    sql += " ORDER BY t.id"
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
    for txn_id in raw_ids:
        row = get_by_id(session, "MMS_EP_TRANSACTION", txn_id)
        if row is None:
            raise HTTPException(status_code=404, detail=f"Record '{txn_id}' not found")
        curr_status = str(row.get("op_status") or "").strip().upper()
        if curr_status in ("A", "1"):
            continue
        if curr_status not in ("P", "0", "R", "2", ""):
            raise HTTPException(
                status_code=400,
                detail=f"Record '{txn_id}' cannot be approved (status={curr_status})",
            )
        new_status = "1" if curr_status == "0" else "A"
        execute_sql(
            session,
            """
            UPDATE MMS_EP_TRANSACTION
            SET op_status = :status, approved_by = :app_by, approved_date = :app_date
            WHERE id = :id OR TO_CHAR(id) = :id_str
            """,
            {
                "status": new_status,
                "app_by": principal.username,
                "app_date": now,
                "id": row.get("id"),
                "id_str": str(row.get("id")),
            },
        )
        approved.append(str(row.get("id")))

    return ApproveEpOut(approved_ids=approved, count=len(approved))
