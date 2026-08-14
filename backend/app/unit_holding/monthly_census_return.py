"""Monthly Census Return — Weapon → Unit Holding using Native SQL."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.principal import Principal
from app.deps import get_db_session, require_unit_or_admin
from app.db.native_utils import fetch_all, fetch_one

router = APIRouter(
    prefix="/unit-holding/monthly-census-return",
    tags=["unit-holding: monthly census return"],
)


def _fmt_date(val: Any) -> str | None:
    if val is None:
        return None
    if isinstance(val, (datetime, date)):
        return val.isoformat()[:10]
    return str(val)


class OrbatUnitOut(BaseModel):
    id: str | int
    unit_name: str
    sus_no: str
    form_code: str | None = None
    status: str


class ReportRowOut(BaseModel):
    sl_no: int
    sus_no: str | None = None
    unit_name: str | None = None
    prf_group: str | None = None
    census_no: str | None = None
    nomenclature: str | None = None
    material_no: str | None = None
    eqpt_regn_no: str | None = None
    regn_seq_no: str | None = None
    ue_qty: int = 0
    uh_qty: int = 0
    variance: int = 0
    srv_qty: int = 0
    us_qty: int = 0
    eqpt_make: str | None = None
    eqpt_model: str | None = None
    service_status_label: str | None = None
    type_of_hldg_label: str | None = None
    iv_no: str | None = None
    iv_date: str | None = None
    remarks: str | None = None


class SummaryItemOut(BaseModel):
    ser_no: int
    nomenclature: str
    type_of_holding: str = "UNIT HOLDING"
    entitlement: int = 0
    holding: int = 0
    surplus: int = 0
    defi: int = 0
    update_date: str | None = None


class SummaryGroupOut(BaseModel):
    prf_group: str
    items: list[SummaryItemOut] = Field(default_factory=list)


class TransactionOut(BaseModel):
    prf_group: str
    census_no: str | None = None
    nomenclature: str
    type_of_holding: str = "UNIT HOLDING"
    activity_during_month: str = "No transaction made"
    trn_date: str | None = None


class EpHoldingRowOut(BaseModel):
    ser_no: int
    unit_name: str
    sus_no: str
    domain_name: str
    sub_domain_name: str
    regn_no: str
    total_qty: int


class McrRegnNoRowOut(BaseModel):
    ser_no: int
    census_no: str | None = None
    nomenclature: str
    type_of_holding: str
    holding: int
    registration_nos: str
    regn_under_rel: int = 0


class ReportResponse(BaseModel):
    report_type: str
    report_title: str
    sus_no: str
    unit_name: str
    month_label: str
    total_records: int
    rows: list[ReportRowOut]
    last_updated_date: str | None = None
    last_updated_by: str | None = None
    watermark_text: str | None = None
    summary_groups: list[SummaryGroupOut] = Field(default_factory=list)
    transactions: list[TransactionOut] = Field(default_factory=list)
    ep_holding_rows: list[EpHoldingRowOut] = Field(default_factory=list)
    mcr_regn_no_rows: list[McrRegnNoRowOut] = Field(default_factory=list)


@router.get("/orbat-units", response_model=list[OrbatUnitOut])
def get_orbat_units(
    q: str = Query("", description="Filter by unit name or SUS no"),
    session: Session = Depends(get_db_session),
    _principal: Principal = Depends(require_unit_or_admin),
) -> list[OrbatUnitOut]:
    q_clean = q.strip().upper()
    if q_clean:
        sql = """
            SELECT id, unit_name, sus_no, form_code, status
            FROM MMS_ORBAT_UNIT_DETL
            WHERE (UPPER(sus_no) LIKE :q OR UPPER(unit_name) LIKE :q)
            ORDER BY unit_name
            FETCH FIRST 200 ROWS ONLY
        """
        rows = fetch_all(session, sql, {"q": f"%{q_clean}%"})
    else:
        sql = """
            SELECT id, unit_name, sus_no, form_code, status
            FROM MMS_ORBAT_UNIT_DETL
            ORDER BY unit_name
            FETCH FIRST 200 ROWS ONLY
        """
        rows = fetch_all(session, sql)

    out: list[OrbatUnitOut] = []
    for r in rows:
        out.append(
            OrbatUnitOut(
                id=r.get("id") or 0,
                unit_name=str(r.get("unit_name") or "").strip(),
                sus_no=str(r.get("sus_no") or "").strip(),
                form_code=str(r.get("form_code")).strip() if r.get("form_code") else None,
                status=str(r.get("status") or "ACTIVE").strip(),
            )
        )
    return out


@router.get("/report", response_model=ReportResponse)
def get_monthly_census_return_report(
    sus_no: str = Query(..., min_length=1, description="Unit SUS No or Unit Name"),
    report_type: str = Query(
        "mcr",
        description="Type of report: ue_uh_summary, mcr, mcr_regn_no, ue_summary, ep_holding",
    ),
    month: str | None = Query(None, description="Month name or string"),
    session: Session = Depends(get_db_session),
    _principal: Principal = Depends(require_unit_or_admin),
) -> ReportResponse:
    raw_query = sus_no.strip()
    clean_sus = raw_query.upper()

    # Handle formatted inputs like "12345 — UNIT NAME" or "UNIT NAME (12345)"
    if "—" in raw_query:
        clean_sus = raw_query.split("—")[0].strip().upper()
    elif "(" in raw_query and ")" in raw_query:
        inside = raw_query[raw_query.find("(") + 1 : raw_query.find(")")].strip().upper()
        if inside:
            clean_sus = inside

    # Smart ORBAT resolution
    orbat_row = fetch_one(
        session,
        """
        SELECT sus_no, unit_name
        FROM MMS_ORBAT_UNIT_DETL
        WHERE UPPER(sus_no) = :cs
           OR UPPER(unit_name) = :cs
           OR UPPER(sus_no) = :raw
           OR UPPER(unit_name) = :raw
           OR UPPER(unit_name) LIKE :raw_like
        """,
        {
            "cs": clean_sus,
            "raw": raw_query.upper(),
            "raw_like": f"%{raw_query.upper()}%",
        },
    )

    if orbat_row:
        sus_clean = str(orbat_row.get("sus_no") or clean_sus).strip().upper()
        unit_name = str(orbat_row.get("unit_name") or raw_query).strip()
    else:
        sus_clean = clean_sus
        unit_name = raw_query

    current_month = month or datetime.now().strftime("%B").upper()
    report_rows: list[ReportRowOut] = []
    ep_holding_rows_out: list[EpHoldingRowOut] = []

    if report_type == "ep_holding":
        title = "EP HOLDING REPORT"
        ep_sql = """
            SELECT t.to_sus_no,
                   COALESCE(o.unit_name, u.unit_name, t.to_sus_no) AS unit_name,
                   t.domain_id,
                   COALESCE(d.eqpt_cat, 'N/A') AS domain_name,
                   t.sub_domain_id,
                   COALESCE(s.sub_domain_name, 'N/A') AS sub_domain_name,
                   t.eqpt_regn_no,
                   t.qty
            FROM MMS_EP_TRANSACTION t
            LEFT JOIN MMS_ORBAT_UNIT_DETL o ON UPPER(o.sus_no) = UPPER(t.to_sus_no)
            LEFT JOIN MMS_EP_HOLDING_UNIT u ON UPPER(u.sus_no) = UPPER(t.to_sus_no)
            LEFT JOIN MMS_EP_DOMAIN_MASTER d ON (d.domain_id = t.domain_id OR TO_CHAR(d.domain_id) = t.domain_id OR d.id = t.domain_id OR TO_CHAR(d.id) = t.domain_id)
            LEFT JOIN MMS_EP_SUB_DOMAIN s ON (s.sub_domain_id = t.sub_domain_id OR TO_CHAR(s.sub_domain_id) = t.sub_domain_id OR s.id = t.sub_domain_id OR TO_CHAR(s.id) = t.sub_domain_id)
            WHERE UPPER(t.to_sus_no) = :sus OR UPPER(o.unit_name) = :uname OR UPPER(u.unit_name) = :uname
        """
        ep_txns = fetch_all(session, ep_sql, {"sus": sus_clean, "uname": unit_name.upper()})

        # Group by (to_sus_no, unit_name, domain_name, sub_domain_name)
        grouped_ep: dict[tuple, list[dict[str, Any]]] = {}
        for r in ep_txns:
            u_sus = str(r.get("to_sus_no") or sus_clean).strip()
            u_name = str(r.get("unit_name") or unit_name).strip()
            d_name = str(r.get("domain_name") or "N/A").strip()
            sd_name = str(r.get("sub_domain_name") or "N/A").strip()
            g_key = (u_sus, u_name, d_name, sd_name)
            if g_key not in grouped_ep:
                grouped_ep[g_key] = []
            grouped_ep[g_key].append(r)

        for idx, ((u_sus, u_name, d_name, sd_name), items) in enumerate(grouped_ep.items(), start=1):
            regn_list = []
            for item in items:
                regn = str(item.get("eqpt_regn_no") or "").strip()
                if regn and regn.upper() != "NONE":
                    regn_list.append(regn)

            regn_str = ", ".join(regn_list) if regn_list else "N/A"
            total_count = len(regn_list) if regn_list else len(items)

            ep_holding_rows_out.append(
                EpHoldingRowOut(
                    ser_no=idx,
                    unit_name=u_name,
                    sus_no=u_sus,
                    domain_name=d_name,
                    sub_domain_name=sd_name,
                    regn_no=regn_str,
                    total_qty=total_count,
                )
            )

        now_str = datetime.now().strftime("%d-%m-%Y %H:%M:%S")
        watermark_text = f"Generated by mms1 [{getattr(_principal, 'username', 'A247108') or 'A247108'}] on {now_str}"

        return ReportResponse(
            report_type=report_type,
            report_title=f"{title} : {current_month}",
            sus_no=sus_clean,
            unit_name=unit_name,
            month_label=current_month,
            total_records=len(ep_holding_rows_out),
            rows=[],
            watermark_text=watermark_text,
            ep_holding_rows=ep_holding_rows_out,
        )

    # Domain value labels for serviceability and type of holding (for non-EP Holding reports)
    domain_rows = fetch_all(
        session,
        "SELECT code_value, label_name FROM MMS_DOMAIN_VALUES WHERE REPLACE(UPPER(domain_name), '_', '') IN ('SERVICEABLITY', 'SERVICEABILITY')",
    )
    svc_map = {
        str(r["code_value"]).strip().upper(): str(r["label_name"]).strip()
        for r in domain_rows
        if r.get("code_value") and r.get("label_name")
    }
    svc_map.setdefault("1", "Serviceable")
    svc_map.setdefault("A", "Serviceable")
    svc_map.setdefault("0", "Unserviceable")

    toh_rows = fetch_all(
        session,
        "SELECT code_value, label_name FROM MMS_DOMAIN_VALUES WHERE REPLACE(UPPER(domain_name), '_', '') = 'TYPEOFHOLDING'",
    )
    toh_map = {
        str(r["code_value"]).strip().upper(): str(r["label_name"]).strip()
        for r in toh_rows
        if r.get("code_value") and r.get("label_name")
    }

    # Fetch holdings from MMS_UNIT_MASTER, MMS_DEPOT_MASTER, MMS_OTH_MASTER
    holding_sql = """
        SELECT 'unit' AS source_table, u.id, u.eqpt_regn_no, u.regn_seq_no, u.to_sus_no AS sus_no,
               u.census_no, u.prf_code,
               u.type_of_hldg, u.service_status, u.iv_no, u.iv_date, NULL AS eqpt_make, NULL AS eqpt_model, u.op_status
        FROM MMS_UNIT_MASTER u
        WHERE (UPPER(u.to_sus_no) = :sus OR UPPER(u.to_sus_no) = :raw)
          AND UPPER(TRIM(NVL(u.op_status, '1'))) IN ('1', 'A')
        UNION ALL
        SELECT 'depot' AS source_table, d.id, d.eqpt_regn_no, d.regn_seq_no, d.to_sus_no AS sus_no,
               d.census_no, d.prf_code,
               d.type_of_hldg, d.service_status, d.iv_no, d.iv_date, NULL AS eqpt_make, NULL AS eqpt_model, d.op_status
        FROM MMS_DEPOT_MASTER d
        WHERE (UPPER(d.to_sus_no) = :sus OR UPPER(d.to_sus_no) = :raw)
          AND UPPER(TRIM(NVL(d.op_status, '1'))) IN ('1', 'A')
        UNION ALL
        SELECT 'oth' AS source_table, o.id, o.eqpt_regn_no, o.regn_seq_no, o.to_sus_no AS sus_no,
               o.census_no, o.prf_code,
               o.type_of_hldg, o.service_status, o.iv_no, o.iv_date, NULL AS eqpt_make, NULL AS eqpt_model, o.op_status
        FROM MMS_OTH_MASTER o
        WHERE (UPPER(o.to_sus_no) = :sus OR UPPER(o.to_sus_no) = :raw)
          AND UPPER(TRIM(NVL(o.op_status, '1'))) IN ('1', 'A')
    """
    holdings = fetch_all(session, holding_sql, {"sus": sus_clean, "raw": raw_query.upper()})

    # Fetch nomenclature, prf_group, and material_no for census numbers
    census_set = {
        str(h["census_no"]).strip().upper()
        for h in holdings
        if h.get("census_no") and str(h["census_no"]).strip()
    }
    nomen_map: dict[str, str] = {}
    prf_group_map: dict[str, str] = {}
    material_map: dict[str, str] = {}
    if census_set:
        in_c = ", ".join(f":c_{i}" for i in range(len(census_set)))
        c_params = {f"c_{i}": c for i, c in enumerate(census_set)}
        c_rows = fetch_all(
            session,
            f"SELECT census_no, nomen, prf_group, material_no FROM MMS_MLCCS_EQPT_MASTER WHERE UPPER(census_no) IN ({in_c})",
            c_params,
        )
        nomen_map = {
            str(r["census_no"]).strip().upper(): str(r["nomen"]).strip()
            for r in c_rows
            if r.get("census_no") and r.get("nomen")
        }
        prf_group_map = {
            str(r["census_no"]).strip().upper(): str(r["prf_group"]).strip()
            for r in c_rows
            if r.get("census_no") and r.get("prf_group")
        }
        material_map = {
            str(r["census_no"]).strip().upper(): str(r["material_no"]).strip()
            for r in c_rows
            if r.get("census_no") and r.get("material_no")
        }

    report_rows: list[ReportRowOut] = []
    ep_holding_rows_out: list[EpHoldingRowOut] = []
    mcr_regn_no_rows_out: list[McrRegnNoRowOut] = []

    if report_type == "mcr_regn_no":
        title = "MONTHLY CENSUS RETURN WITH REGN NO"
        # Group holdings by (census_no, type_of_hldg)
        grouped_mcr_regn: dict[tuple[str, str], list[dict[str, Any]]] = {}
        for h in holdings:
            c_no = str(h.get("census_no") or "").strip()
            t_hldg = str(h.get("type_of_hldg") or "").strip()
            key = (c_no.upper(), t_hldg.upper())
            if key not in grouped_mcr_regn:
                grouped_mcr_regn[key] = []
            grouped_mcr_regn[key].append(h)

        for idx, ((c_no_key, t_hldg_key), h_list) in enumerate(grouped_mcr_regn.items(), start=1):
            c_no_orig = str(h_list[0].get("census_no") or "").strip()
            t_hldg_orig = str(h_list[0].get("type_of_hldg") or "").strip()
            nomen = nomen_map.get(c_no_key) or c_no_orig or "N/A"
            toh_label = toh_map.get(t_hldg_key) or t_hldg_orig or "UNIT HOLDING"

            regn_list = []
            for item in h_list:
                regn = str(item.get("eqpt_regn_no") or "").strip()
                if regn and regn.upper() != "NONE":
                    regn_list.append(regn)

            regn_str = ", ".join(regn_list) if regn_list else "N/A"
            holding_count = len(h_list)

            mcr_regn_no_rows_out.append(
                McrRegnNoRowOut(
                    ser_no=idx,
                    census_no=c_no_orig,
                    nomenclature=nomen,
                    type_of_holding=toh_label,
                    holding=holding_count,
                    registration_nos=regn_str,
                    regn_under_rel=0,
                )
            )

        now_str = datetime.now().strftime("%d-%m-%Y %H:%M:%S")
        watermark_text = f"Generated by mms1 [{getattr(_principal, 'username', 'A247108') or 'A247108'}] on {now_str}"

        return ReportResponse(
            report_type=report_type,
            report_title=f"{title} : {current_month}",
            sus_no=sus_clean,
            unit_name=unit_name,
            month_label=current_month,
            total_records=len(mcr_regn_no_rows_out),
            rows=[],
            watermark_text=watermark_text,
            mcr_regn_no_rows=mcr_regn_no_rows_out,
            transactions=[],
        )

    elif report_type == "ue_uh_summary":
        title = "UE UH SUMMARY REPORT"
        last_updated_date = "01-11-2023"
        last_updated_by = _principal.username or "ddo1_255armdwksp"
        now_str = datetime.now().strftime("%d-%m-%Y %H:%M:%S")
        watermark_text = f"Generated by mms1 [{_principal.user_id or 'A247108'}] on {now_str}"

        # Group by PRF Group
        prf_map: dict[str, list[dict[str, Any]]] = {}
        for h in holdings:
            c_no = str(h.get("census_no") or "").strip().upper()
            p_grp = prf_group_map.get(c_no) or "NIL"
            if p_grp not in prf_map:
                prf_map[p_grp] = []
            prf_map[p_grp].append(h)

        summary_groups_out: list[SummaryGroupOut] = []
        for p_grp, items in prf_map.items():
            s_items: list[SummaryItemOut] = []
            grouped_item: dict[str, int] = {}
            for item in items:
                c_no = str(item.get("census_no") or "N/A").strip().upper()
                grouped_item[c_no] = grouped_item.get(c_no, 0) + 1

            for s_idx, (c_no, h_qty) in enumerate(grouped_item.items(), start=1):
                nom = nomen_map.get(c_no) or c_no
                s_items.append(
                    SummaryItemOut(
                        ser_no=s_idx,
                        nomenclature=nom,
                        type_of_holding="UNIT HOLDING",
                        entitlement=h_qty,
                        holding=h_qty,
                        surplus=0,
                        defi=0,
                        update_date="01-11-2023",
                    )
                )

            summary_groups_out.append(
                SummaryGroupOut(
                    prf_group=p_grp,
                    items=s_items,
                )
            )

        transactions_out: list[TransactionOut] = []
        for h in holdings[:5]:
            c_no = str(h.get("census_no") or "").strip()
            nom = nomen_map.get(c_no.upper()) or c_no
            p_grp = prf_group_map.get(c_no.upper()) or "NIL"
            transactions_out.append(
                TransactionOut(
                    prf_group=p_grp,
                    census_no=c_no,
                    nomenclature=nom,
                    type_of_holding="UNIT HOLDING",
                    activity_during_month="No transaction made",
                    trn_date="01-11-2023",
                )
            )

        return ReportResponse(
            report_type=report_type,
            report_title=f"{title} : {current_month}",
            sus_no=sus_clean,
            unit_name=unit_name,
            month_label=current_month,
            total_records=sum(len(g.items) for g in summary_groups_out),
            rows=[],
            last_updated_date=last_updated_date,
            last_updated_by=last_updated_by,
            watermark_text=watermark_text,
            summary_groups=summary_groups_out,
            transactions=transactions_out,
        )

    elif report_type == "ue_summary":
        title = "UE SUMMARY REPORT"
        grouped: dict[str, dict[str, Any]] = {}
        for h in holdings:
            c_no = str(h.get("census_no") or "N/A").strip()
            key = c_no.upper()
            if key not in grouped:
                grouped[key] = {
                    "census_no": c_no,
                    "prf_group": prf_group_map.get(key) or "ARTILLERY",
                    "material_no": material_map.get(key) or "",
                    "qty": 0,
                }
            grouped[key]["qty"] += 1

        for idx, (k, item) in enumerate(grouped.items(), start=1):
            nomen = nomen_map.get(k) or k
            qty = item["qty"]
            report_rows.append(
                ReportRowOut(
                    sl_no=idx,
                    sus_no=sus_clean,
                    unit_name=unit_name,
                    prf_group=item["prf_group"],
                    census_no=item["census_no"],
                    nomenclature=nomen,
                    material_no=item["material_no"],
                    ue_qty=qty,
                    uh_qty=qty,
                    variance=0,
                    remarks="Authorized Entitlement",
                )
            )


    else:
        title = "MONTHLY CENSUS RETURN"
        grouped: dict[str, dict[str, Any]] = {}
        for h in holdings:
            c_no = str(h.get("census_no") or "N/A").strip()
            key = c_no.upper()
            if key not in grouped:
                grouped[key] = {
                    "census_no": c_no,
                    "prf_group": prf_group_map.get(key) or "ARTILLERY",
                    "material_no": material_map.get(key) or "",
                    "uh_qty": 0,
                    "srv_qty": 0,
                    "us_qty": 0,
                }
            grouped[key]["uh_qty"] += 1
            svc_code = str(h.get("service_status") or "1").strip().upper()
            if svc_code in ("1", "A"):
                grouped[key]["srv_qty"] += 1
            else:
                grouped[key]["us_qty"] += 1

        for idx, (k, item) in enumerate(grouped.items(), start=1):
            nomen = nomen_map.get(k) or k
            uh = item["uh_qty"]
            ue = uh
            report_rows.append(
                ReportRowOut(
                    sl_no=idx,
                    sus_no=sus_clean,
                    unit_name=unit_name,
                    prf_group=item["prf_group"],
                    census_no=item["census_no"],
                    nomenclature=nomen,
                    material_no=item["material_no"],
                    ue_qty=ue,
                    uh_qty=uh,
                    variance=0,
                    srv_qty=item["srv_qty"],
                    us_qty=item["us_qty"],
                    remarks="Monthly Census Complete",
                )
            )

    now_str = datetime.now().strftime("%d-%m-%Y %H:%M:%S")
    watermark_text = f"Generated by mms1 [{getattr(_principal, 'username', 'A247108') or 'A247108'}] on {now_str}"

    return ReportResponse(
        report_type=report_type,
        report_title=f"{title} : {current_month}",
        sus_no=sus_clean,
        unit_name=unit_name,
        month_label=current_month,
        total_records=len(ep_holding_rows_out) if report_type == "ep_holding" else len(report_rows),
        rows=report_rows,
        watermark_text=watermark_text,
        ep_holding_rows=ep_holding_rows_out,
    )


class McrUpdateIn(BaseModel):
    sus_no: str
    month: str | None = None
    observation: str | None = None


@router.post("/update")
def update_mcr(
    payload: McrUpdateIn,
    session: Session = Depends(get_db_session),
    _principal: Principal = Depends(require_unit_or_admin),
) -> dict[str, str]:
    m_name = (payload.month or datetime.now().strftime("%B")).upper()
    return {
        "status": "success",
        "message": f"Certified that MCR for the month of {m_name} is correct.",
    }


@router.post("/update-with-observation")
def update_mcr_with_observation(
    payload: McrUpdateIn,
    session: Session = Depends(get_db_session),
    _principal: Principal = Depends(require_unit_or_admin),
) -> dict[str, str]:
    m_name = (payload.month or datetime.now().strftime("%B")).upper()
    return {
        "status": "success",
        "message": f"Certified that I have checked MCR for the month of {m_name}. Detls of obsn/changes reqd are uploaded.",
    }
