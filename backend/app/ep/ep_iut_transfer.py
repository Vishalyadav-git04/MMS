"""EP IUT (Inter Unit Transfer) — backend API endpoints using Native SQL."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.deps import get_db_session
from app.db.native_utils import execute_sql, fetch_all, fetch_one

router = APIRouter(
    prefix="/ep/iut",
    tags=["ep: inter unit transfer"],
)


class ParentUnitOut(BaseModel):
    sus_no: str
    unit_name: str
    display: str


class DomainOptionOut(BaseModel):
    id: str | int
    eqpt_cat: str


class SubDomainOptionOut(BaseModel):
    id: str | int
    sub_domain_name: str


class ReceivingUnitOut(BaseModel):
    sus_no: str
    unit_name: str
    form_code: str | None = None
    display: str


class TransferSubmitIn(BaseModel):
    parent_sus_no: str = Field(..., min_length=1)
    receiving_sus_no: str = Field(..., min_length=1)
    domain_id: str | int = Field(...)
    sub_domain_id: str | int = Field(...)
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
    sql = """
        SELECT DISTINCT to_sus_no
        FROM MMS_EP_TRANSACTION
        WHERE to_sus_no IS NOT NULL
        AND UPPER(TRIM(COALESCE(op_status, ''))) IN ('1', 'A', 'APPROVED')
    """
    rows = fetch_all(session, sql)
    distinct_suses = [str(r["to_sus_no"]).strip().upper() for r in rows if r.get("to_sus_no")]
    if not distinct_suses:
        return []

    in_clause = ", ".join(f":s_{i}" for i in range(len(distinct_suses)))
    params = {f"s_{i}": s for i, s in enumerate(distinct_suses)}

    orbat_rows = fetch_all(
        session,
        f"SELECT sus_no, unit_name FROM MMS_ORBAT_UNIT_DETL WHERE UPPER(sus_no) IN ({in_clause})",
        params,
    )
    orbat_map = {str(r["sus_no"]).strip().upper(): str(r["unit_name"]).strip() for r in orbat_rows if r.get("sus_no")}

    results: list[ParentUnitOut] = []
    for sus in distinct_suses:
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
    sql = """
        SELECT DISTINCT domain_id
        FROM MMS_EP_TRANSACTION
        WHERE UPPER(to_sus_no) = :sus
        AND domain_id IS NOT NULL
        AND UPPER(TRIM(COALESCE(op_status, ''))) IN ('1', 'A', 'APPROVED')
    """
    rows = fetch_all(session, sql, {"sus": sus})
    domain_ids = [str(r["domain_id"]).strip() for r in rows if r.get("domain_id")]
    if not domain_ids:
        return []

    in_clause = ", ".join(f":d_{i}" for i in range(len(domain_ids)))
    params = {f"d_{i}": d for i, d in enumerate(domain_ids)}

    domains = fetch_all(
        session,
        f"SELECT id, eqpt_cat FROM MMS_EP_DOMAIN_MASTER WHERE id IN ({in_clause}) OR TO_CHAR(id) IN ({in_clause})",
        params,
    )
    res = [
        DomainOptionOut(id=str(d["id"]), eqpt_cat=str(d.get("eqpt_cat") or ""))
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

    sql = """
        SELECT DISTINCT sub_domain_id
        FROM MMS_EP_TRANSACTION
        WHERE UPPER(to_sus_no) = :sus
        AND (domain_id = :dom_id OR TO_CHAR(domain_id) = :dom_id)
        AND sub_domain_id IS NOT NULL
        AND UPPER(TRIM(COALESCE(op_status, ''))) IN ('1', 'A', 'APPROVED')
    """
    rows = fetch_all(session, sql, {"sus": sus, "dom_id": dom_id})
    sub_ids = [str(r["sub_domain_id"]).strip() for r in rows if r.get("sub_domain_id")]
    if not sub_ids:
        return []

    in_clause = ", ".join(f":sd_{i}" for i in range(len(sub_ids)))
    params = {f"sd_{i}": sd for i, sd in enumerate(sub_ids)}

    sub_domains = fetch_all(
        session,
        f"SELECT id, sub_domain_name FROM MMS_EP_SUB_DOMAIN WHERE id IN ({in_clause}) OR TO_CHAR(id) IN ({in_clause})",
        params,
    )
    res = [
        SubDomainOptionOut(id=str(s["id"]), sub_domain_name=str(s.get("sub_domain_name") or ""))
        for s in sub_domains
    ]
    res.sort(key=lambda x: x.sub_domain_name.lower())
    return res


@router.get("/receiving-units", response_model=list[ReceivingUnitOut])
def get_receiving_units(
    search: str | None = None,
    session: Session = Depends(get_db_session),
) -> list[ReceivingUnitOut]:
    sql = "SELECT sus_no, unit_name, form_code FROM MMS_ORBAT_UNIT_DETL WHERE UPPER(status) = 'ACTIVE'"
    params: dict = {}
    if search and search.strip():
        q = f"%{search.strip().upper()}%"
        sql += " AND (UPPER(unit_name) LIKE :q OR UPPER(sus_no) LIKE :q)"
        params["q"] = q

    sql += " ORDER BY unit_name"
    rows = fetch_all(session, sql, params)[:100]

    results: list[ReceivingUnitOut] = []
    for r in rows:
        sus = str(r.get("sus_no") or "")
        uname = str(r.get("unit_name") or "")
        display = f"{sus} - {uname}"
        results.append(
            ReceivingUnitOut(
                sus_no=sus,
                unit_name=uname,
                form_code=r.get("form_code"),
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

    sql = """
        SELECT eqpt_regn_no
        FROM MMS_EP_TRANSACTION
        WHERE UPPER(to_sus_no) = :sus
        AND (domain_id = :dom_id OR TO_CHAR(domain_id) = :dom_id)
        AND (sub_domain_id = :sub_dom_id OR TO_CHAR(sub_domain_id) = :sub_dom_id)
        AND eqpt_regn_no IS NOT NULL
        AND UPPER(TRIM(COALESCE(op_status, ''))) IN ('1', 'A', 'APPROVED')
    """
    rows = fetch_all(session, sql, {"sus": sus, "dom_id": dom_id, "sub_dom_id": sub_dom_id})
    regns = sorted(list({str(r["eqpt_regn_no"]).strip() for r in rows if r.get("eqpt_regn_no") and str(r["eqpt_regn_no"]).strip()}))
    return regns


@router.post("/transfer", response_model=TransferSubmitOut)
def submit_transfer(
    body: TransferSubmitIn,
    session: Session = Depends(get_db_session),
) -> TransferSubmitOut:
    parent_sus = body.parent_sus_no.strip().upper()
    rec_sus = body.receiving_sus_no.strip().upper()
    dom_id = str(body.domain_id).strip()
    sub_dom_id = str(body.sub_domain_id).strip()

    if not body.regn_numbers:
        raise HTTPException(status_code=400, detail="No registration numbers provided for transfer")

    parent_unit = fetch_one(session, "SELECT form_code FROM MMS_ORBAT_UNIT_DETL WHERE UPPER(sus_no) = :sus", {"sus": parent_sus})
    parent_form_code = parent_unit.get("form_code") if parent_unit else None

    rec_unit = fetch_one(session, "SELECT form_code FROM MMS_ORBAT_UNIT_DETL WHERE UPPER(sus_no) = :sus", {"sus": rec_sus})
    rec_form_code = rec_unit.get("form_code") if rec_unit else None

    tfr_row = fetch_one(
        session,
        "SELECT code_value FROM MMS_DOMAIN_VALUES WHERE UPPER(domain_name) = 'TFRSTATUS' AND UPPER(label_name) LIKE '%TRANSFER%'",
    )
    if not tfr_row:
        tfr_row = fetch_one(session, "SELECT code_value FROM MMS_DOMAIN_VALUES WHERE UPPER(domain_name) = 'TFRSTATUS'")
    tfr_status_val = tfr_row.get("code_value") if tfr_row else "TRANSFERRED"

    in_clause = ", ".join(f":r_{i}" for i in range(len(body.regn_numbers)))
    params = {
        "parent_sus": parent_sus,
        "dom_id": dom_id,
        "sub_dom_id": sub_dom_id,
        **{f"r_{i}": r for i, r in enumerate(body.regn_numbers)},
    }

    find_sql = f"""
        SELECT id, eqpt_regn_no
        FROM MMS_EP_TRANSACTION
        WHERE UPPER(to_sus_no) = :parent_sus
        AND (domain_id = :dom_id OR TO_CHAR(domain_id) = :dom_id)
        AND (sub_domain_id = :sub_dom_id OR TO_CHAR(sub_domain_id) = :sub_dom_id)
        AND eqpt_regn_no IN ({in_clause})
        AND UPPER(TRIM(COALESCE(op_status, ''))) IN ('1', 'A', 'APPROVED')
    """
    txns = fetch_all(session, find_sql, params)
    if not txns:
        raise HTTPException(status_code=404, detail="No approved transaction records found for transfer")

    now = datetime.now()
    try:
        rv_dt = datetime.strptime(body.rv_date, "%Y-%m-%d")
    except ValueError:
        rv_dt = now

    transferred: list[str] = []
    for row in txns:
        txn_id = row["id"]
        update_sql = """
            UPDATE MMS_EP_TRANSACTION
            SET issued_from = :psus,
                from_sus_no = :psus,
                iv_sus_no = :psus,
                from_form_code = :pform,
                to_sus_no = :rsus,
                to_form_code = :rform,
                tfr_status = :tfr_status,
                to_tr_date = :now_dt,
                from_tr_date = :now_dt,
                iv_no = :rv_no,
                iv_date = :rv_date
        """
        up_params = {
            "psus": parent_sus,
            "pform": parent_form_code,
            "rsus": rec_sus,
            "rform": rec_form_code,
            "tfr_status": tfr_status_val,
            "now_dt": now,
            "rv_no": body.rv_no.strip(),
            "rv_date": rv_dt,
            "tid": txn_id,
            "tid_str": str(txn_id),
        }
        if body.upload_rv:
            update_sql += ", upload_voucher = :upload_rv"
            up_params["upload_rv"] = body.upload_rv

        update_sql += " WHERE id = :tid OR TO_CHAR(id) = :tid_str"
        execute_sql(session, update_sql, up_params)

        if row.get("eqpt_regn_no"):
            transferred.append(str(row["eqpt_regn_no"]))

    return TransferSubmitOut(count=len(transferred), transferred_regns=transferred)
