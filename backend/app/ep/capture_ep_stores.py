"""Capture EP Stores — lookups + persist to MMS_EP_TRANSACTION using Native SQL."""

from __future__ import annotations

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.deps import get_db_session, get_principal
from app.auth.principal import Principal
from app.db.native_utils import execute_sql, fetch_all, fetch_one
from app.utils.ids import get_by_id, next_int_id

router = APIRouter(
    prefix="/ep/capture",
    tags=["ep: capture stores"],
)


class DomainOptionOut(BaseModel):
    code_value: str
    label_name: str


class IssuerUnitOut(BaseModel):
    id: str | int
    sanctioning_auth: str
    unit_name: str
    sus_no: str
    form_code: str | None = None


class HoldingUnitOut(BaseModel):
    id: str | int
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
    domain_id: str | int = Field(...)
    sub_domain_id: str | int = Field(...)
    regn_no_avl: str = Field(..., pattern="^(yes|no)$")
    qty: int = Field(..., ge=1, le=9999)
    upload_voucher: str | None = None
    remarks: str | None = Field(None, max_length=255)
    equipment: list[EquipLineIn] = Field(default_factory=list)


class CaptureEpOut(BaseModel):
    ids: list[str | int]
    count: int


@router.get("/sanctioning-auths", response_model=list[DomainOptionOut])
def list_sanctioning_auths(
    session: Session = Depends(get_db_session),
) -> list[DomainOptionOut]:
    sql = """
        SELECT code_value, label_name
        FROM MMS_DOMAIN_VALUES
        WHERE UPPER(domain_name) = 'EPAUTHORITY'
        ORDER BY LPAD(COALESCE(disp_order, '9999'), 10, '0'), label_name
    """
    rows = fetch_all(session, sql)
    if rows:
        return [
            DomainOptionOut(
                code_value=str(r.get("code_value") or r.get("label_name") or ""),
                label_name=str(r.get("label_name") or r.get("code_value") or ""),
            )
            for r in rows
            if r.get("code_value") or r.get("label_name")
        ]

    # Fallback from MMS_EP_ISSUER_UNIT
    unit_auths = fetch_all(session, "SELECT DISTINCT sanctioning_auth FROM MMS_EP_ISSUER_UNIT ORDER BY sanctioning_auth")
    auth_list = [str(r["sanctioning_auth"]) for r in unit_auths if r.get("sanctioning_auth")]
    if not auth_list:
        auth_list = ["DG CD", "DGOS", "DGAS", "DGEME"]
    return [DomainOptionOut(code_value=a, label_name=a) for a in auth_list]


@router.get("/serviceability-options", response_model=list[DomainOptionOut])
def list_serviceability_options(
    session: Session = Depends(get_db_session),
) -> list[DomainOptionOut]:
    sql = """
        SELECT code_value, label_name
        FROM MMS_DOMAIN_VALUES
        WHERE UPPER(domain_name) = 'SERVICEABLITY'
        ORDER BY LPAD(COALESCE(disp_order, '9999'), 10, '0'), label_name
    """
    rows = fetch_all(session, sql)
    if rows:
        return [
            DomainOptionOut(
                code_value=str(r.get("code_value") or r.get("label_name") or ""),
                label_name=str(r.get("label_name") or r.get("code_value") or ""),
            )
            for r in rows
            if r.get("code_value") or r.get("label_name")
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
    row = fetch_one(session, "SELECT COUNT(id) AS cnt FROM MMS_EP_TRANSACTION WHERE UPPER(iv_no) = :iv", {"iv": clean_iv})
    cnt = int((row.get("cnt") if row else 0) or 0)
    return {"exists": cnt > 0}


@router.get("/issuer-units", response_model=list[IssuerUnitOut])
def search_issuer_units(
    q: str | None = None,
    by: str | None = None,
    sanctioning_auth: str | None = None,
    session: Session = Depends(get_db_session),
) -> list[IssuerUnitOut]:
    sql = "SELECT id, unit_name, sus_no, form_code FROM MMS_ORBAT_UNIT_DETL WHERE UPPER(status) = 'ACTIVE'"
    params: dict = {}
    if q and q.strip():
        like = f"%{q.strip().upper()}%"
        if by == "name":
            sql += " AND UPPER(unit_name) LIKE :like"
        elif by == "sus":
            sql += " AND UPPER(sus_no) LIKE :like"
        else:
            sql += " AND (UPPER(unit_name) LIKE :like OR UPPER(sus_no) LIKE :like)"
        params["like"] = like

    sql += " ORDER BY unit_name"
    orbat_rows = fetch_all(session, sql, params)[:20]
    if orbat_rows:
        return [
            IssuerUnitOut(
                id=r["id"],
                sanctioning_auth=sanctioning_auth or "DG CD",
                unit_name=r["unit_name"],
                sus_no=r["sus_no"],
                form_code=r.get("form_code"),
            )
            for r in orbat_rows
        ]

    # Fallback to MMS_EP_ISSUER_UNIT
    ep_sql = "SELECT id, sanctioning_auth, unit_name, sus_no, form_code FROM MMS_EP_ISSUER_UNIT WHERE 1=1"
    ep_params: dict = {}
    if sanctioning_auth and sanctioning_auth.strip():
        ep_sql += " AND UPPER(sanctioning_auth) = :auth"
        ep_params["auth"] = sanctioning_auth.strip().upper()
    if q and q.strip():
        like = f"%{q.strip().upper()}%"
        if by == "name":
            ep_sql += " AND UPPER(unit_name) LIKE :like"
        elif by == "sus":
            ep_sql += " AND UPPER(sus_no) LIKE :like"
        else:
            ep_sql += " AND (UPPER(unit_name) LIKE :like OR UPPER(sus_no) LIKE :like)"
        ep_params["like"] = like

    ep_sql += " ORDER BY unit_name"
    ep_rows = fetch_all(session, ep_sql, ep_params)[:20]
    return [
        IssuerUnitOut(
            id=r["id"],
            sanctioning_auth=r["sanctioning_auth"],
            unit_name=r["unit_name"],
            sus_no=r["sus_no"],
            form_code=r.get("form_code"),
        )
        for r in ep_rows
    ]


@router.get("/holding-units", response_model=list[HoldingUnitOut])
def search_holding_units(
    q: str | None = None,
    by: str | None = None,
    session: Session = Depends(get_db_session),
) -> list[HoldingUnitOut]:
    sql = "SELECT id, unit_name, sus_no, form_code FROM MMS_ORBAT_UNIT_DETL WHERE UPPER(status) = 'ACTIVE'"
    params: dict = {}
    if q and q.strip():
        like = f"%{q.strip().upper()}%"
        if by == "name":
            sql += " AND UPPER(unit_name) LIKE :like"
        elif by == "sus":
            sql += " AND UPPER(sus_no) LIKE :like"
        else:
            sql += " AND (UPPER(unit_name) LIKE :like OR UPPER(sus_no) LIKE :like)"
        params["like"] = like

    sql += " ORDER BY unit_name"
    orbat_rows = fetch_all(session, sql, params)[:20]
    if orbat_rows:
        return [
            HoldingUnitOut(
                id=r["id"],
                unit_name=r["unit_name"],
                sus_no=r["sus_no"],
                form_code=r.get("form_code"),
            )
            for r in orbat_rows
        ]

    # Fallback to MMS_EP_HOLDING_UNIT
    ep_sql = "SELECT id, unit_name, sus_no, form_code FROM MMS_EP_HOLDING_UNIT WHERE 1=1"
    ep_params: dict = {}
    if q and q.strip():
        like = f"%{q.strip().upper()}%"
        if by == "name":
            ep_sql += " AND UPPER(unit_name) LIKE :like"
        elif by == "sus":
            ep_sql += " AND UPPER(sus_no) LIKE :like"
        else:
            ep_sql += " AND (UPPER(unit_name) LIKE :like OR UPPER(sus_no) LIKE :like)"
        ep_params["like"] = like

    ep_sql += " ORDER BY unit_name"
    ep_rows = fetch_all(session, ep_sql, ep_params)[:20]
    return [
        HoldingUnitOut(
            id=r["id"],
            unit_name=r["unit_name"],
            sus_no=r["sus_no"],
            form_code=r.get("form_code"),
        )
        for r in ep_rows
    ]


def _get_domain_code(session: Session, domain_name: str, preferred: str, fallback: str) -> str:
    sql = """
        SELECT code_value FROM MMS_DOMAIN_VALUES
        WHERE REPLACE(UPPER(domain_name), '_', '') = :dname
        AND (UPPER(TRIM(code_value)) = :pref OR UPPER(TRIM(label_name)) = :pref)
    """
    row = fetch_one(
        session,
        sql,
        {"dname": domain_name.replace("_", "").upper(), "pref": preferred.upper()},
    )
    val = row.get("code_value") if row else None
    return str(val or fallback).strip()


@router.post("/", response_model=CaptureEpOut)
def submit_capture(
    body: CaptureEpIn,
    session: Session = Depends(get_db_session),
    principal: Principal = Depends(get_principal),
) -> CaptureEpOut:
    domain = fetch_one(
        session,
        "SELECT * FROM MMS_EP_DOMAIN_MASTER WHERE domain_id = :did OR TO_CHAR(domain_id) = :did",
        {"did": str(body.domain_id).strip()},
    )
    if domain is None:
        raise HTTPException(status_code=400, detail="Invalid Eqpt Category/Domain")

    sub = fetch_one(
        session,
        "SELECT * FROM MMS_EP_SUB_DOMAIN WHERE sub_domain_id = :sdid OR TO_CHAR(sub_domain_id) = :sdid",
        {"sdid": str(body.sub_domain_id).strip()},
    )
    if sub is None:
        raise HTTPException(status_code=400, detail="Invalid EP Census/Sub Domain")

    sub_eq_domain = str(sub.get("equipment_domain_id") or "").strip()
    dom_domain_id = str(domain.get("domain_id") if domain.get("domain_id") is not None else "").strip()
    dom_id = str(domain.get("id") if domain.get("id") is not None else "").strip()
    if sub_eq_domain != dom_domain_id and sub_eq_domain != dom_id:
        raise HTTPException(
            status_code=400,
            detail="Sub Domain does not belong to the selected Domain",
        )

    target_sub_id = str(sub.get("sub_domain_id") if sub.get("sub_domain_id") is not None else sub.get("id") or "").strip()

    census_row = fetch_one(
        session,
        """
        SELECT census_no FROM MMS_EP_MASTER
        WHERE (domain_id = :did OR TO_CHAR(domain_id) = :did OR domain_id = :d_id OR TO_CHAR(domain_id) = :d_id)
        AND (sub_domain_id = :sid OR TO_CHAR(sub_domain_id) = :sid OR sub_domain_id = :s_id OR TO_CHAR(sub_domain_id) = :s_id)
        ORDER BY census_no DESC
        """,
        {
            "did": dom_domain_id,
            "d_id": dom_id,
            "sid": target_sub_id,
            "s_id": str(sub.get("id") or "").strip(),
        },
    )
    census_no = census_row.get("census_no") if census_row else None
    if not census_no:
        raise HTTPException(
            status_code=400,
            detail="No census number found in MMS_EP_MASTER for the selected domain and sub domain",
        )

    issuer_form_code: str | None = None
    orbat_issuer = fetch_one(
        session,
        "SELECT form_code FROM MMS_ORBAT_UNIT_DETL WHERE UPPER(sus_no) = :sus AND UPPER(status) = 'ACTIVE'",
        {"sus": body.issue_sus_no.strip().upper()},
    )
    if orbat_issuer and orbat_issuer.get("form_code"):
        issuer_form_code = orbat_issuer["form_code"]
    else:
        ep_issuer = fetch_one(
            session,
            "SELECT form_code FROM MMS_EP_ISSUER_UNIT WHERE UPPER(sus_no) = :sus",
            {"sus": body.issue_sus_no.strip().upper()},
        )
        if ep_issuer and ep_issuer.get("form_code"):
            issuer_form_code = ep_issuer["form_code"]
    if not issuer_form_code:
        issuer_form_code = "FC01"

    holding_form_code: str | None = None
    orbat_holding = fetch_one(
        session,
        "SELECT form_code FROM MMS_ORBAT_UNIT_DETL WHERE UPPER(sus_no) = :sus AND UPPER(status) = 'ACTIVE'",
        {"sus": body.sus_no.strip().upper()},
    )
    if orbat_holding and orbat_holding.get("form_code"):
        holding_form_code = orbat_holding["form_code"]
    else:
        ep_holding = fetch_one(
            session,
            "SELECT form_code FROM MMS_EP_HOLDING_UNIT WHERE UPPER(sus_no) = :sus",
            {"sus": body.sus_no.strip().upper()},
        )
        if ep_holding and ep_holding.get("form_code"):
            holding_form_code = ep_holding["form_code"]
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
            regn_params = {f"r{i}": r for i, r in enumerate(regn_list)}
            in_clause = ", ".join(f":r{i}" for i in range(len(regn_list)))
            existing_db = fetch_all(
                session,
                f"SELECT eqpt_regn_no FROM MMS_EP_TRANSACTION WHERE eqpt_regn_no IS NOT NULL AND UPPER(TRIM(eqpt_regn_no)) IN ({in_clause})",
                regn_params,
            )
            if existing_db:
                dups = ", ".join(sorted(set(str(e["eqpt_regn_no"]) for e in existing_db if e.get("eqpt_regn_no"))))
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

    op_status_code = _get_domain_code(session, "OPSTATUS", "PENDING", "0")
    tfr_status_code = _get_domain_code(session, "TFRSTATUS", "PTFR", "PTFR")

    next_id = next_int_id(session, "MMS_EP_TRANSACTION")
    saved_ids: list[str] = []

    insert_sql = """
        INSERT INTO MMS_EP_TRANSACTION (
            id, sanction_auth, issued_from, from_sus_no, auth_letter_no, auth_date,
            census_no, from_tr_date, to_tr_date, upload_auth_letter, domain_id, sub_domain_id,
            to_sus_no, iv_sus_no, iv_no, iv_date, qty, eqpt_regn_no, service_status,
            remarks, upload_voucher, op_status, stores_type, tfr_status, from_form_code,
            to_form_code, created_by, created_date, upload_by, upload_date
        ) VALUES (
            :id, :sanction_auth, :issued_from, :from_sus_no, :auth_letter_no, :auth_date,
            :census_no, :from_tr_date, :to_tr_date, :upload_auth_letter, :domain_id, :sub_domain_id,
            :to_sus_no, :iv_sus_no, :iv_no, :iv_date, :qty, :eqpt_regn_no, :service_status,
            :remarks, :upload_voucher, :op_status, :stores_type, :tfr_status, :from_form_code,
            :to_form_code, :created_by, :created_date, :upload_by, :upload_date
        )
    """

    for line in work_lines:
        current_id_str = str(next_id)
        params = {
            "id": current_id_str,
            "sanction_auth": body.sanctioning_auth.strip()[:255],
            "issued_from": body.issue_sus_no.strip()[:255],
            "from_sus_no": body.issue_sus_no.strip()[:255],
            "auth_letter_no": body.auth_letter_no.strip()[:255],
            "auth_date": auth_dt,
            "census_no": census_no,
            "from_tr_date": now,
            "to_tr_date": now,
            "upload_auth_letter": (body.upload_auth_letter or "")[:255] or None,
            "domain_id": dom_domain_id or dom_id,
            "sub_domain_id": target_sub_id or str(sub.get("id") or ""),
            "to_sus_no": body.sus_no.strip()[:255],
            "iv_sus_no": body.issue_sus_no.strip()[:255],
            "iv_no": body.iv_no.strip()[:255],
            "iv_date": iv_dt,
            "qty": 1 if body.regn_no_avl == "yes" else body.qty,
            "eqpt_regn_no": (
                (line.regd_no or "").strip()[:255] or None
                if body.regn_no_avl == "yes"
                else None
            ),
            "service_status": (line.serviceability or "SR").strip()[:255],
            "remarks": (body.remarks or "").strip()[:255] or None,
            "upload_voucher": (body.upload_voucher or "")[:255] or None,
            "op_status": op_status_code,
            "stores_type": body.sanctioning_auth.strip()[:255],
            "tfr_status": tfr_status_code,
            "from_form_code": issuer_form_code[:255],
            "to_form_code": holding_form_code[:255],
            "created_by": principal.username,
            "created_date": now,
            "upload_by": principal.username,
            "upload_date": now,
        }
        execute_sql(session, insert_sql, params)
        saved_ids.append(current_id_str)
        next_id += 1

    return CaptureEpOut(ids=saved_ids, count=len(saved_ids))
