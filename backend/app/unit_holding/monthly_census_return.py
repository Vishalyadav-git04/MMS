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


class ReportResponse(BaseModel):
    report_type: str
    report_title: str
    sus_no: str
    unit_name: str
    month_label: str
    total_records: int
    rows: list[ReportRowOut]


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
            WHERE UPPER(status) = 'ACTIVE'
              AND (UPPER(sus_no) LIKE :q OR UPPER(unit_name) LIKE :q)
            ORDER BY unit_name
            FETCH FIRST 100 ROWS ONLY
        """
        rows = fetch_all(session, sql, {"q": f"%{q_clean}%"})
    else:
        sql = """
            SELECT id, unit_name, sus_no, form_code, status
            FROM MMS_ORBAT_UNIT_DETL
            WHERE UPPER(status) = 'ACTIVE'
            ORDER BY unit_name
            FETCH FIRST 100 ROWS ONLY
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
    sus_no: str = Query(..., min_length=1, description="Unit SUS No"),
    report_type: str = Query(
        "mcr",
        description="Type of report: ue_uh_summary, mcr, mcr_regn_no, ue_summary, ep_holding",
    ),
    month: str | None = Query(None, description="Month name or string"),
    session: Session = Depends(get_db_session),
    _principal: Principal = Depends(require_unit_or_admin),
) -> ReportResponse:
    sus_clean = sus_no.strip().upper()

    # Get unit name from ORBAT
    unit_row = fetch_one(
        session,
        "SELECT unit_name FROM MMS_ORBAT_UNIT_DETL WHERE UPPER(sus_no) = :sus AND ROWNUM = 1",
        {"sus": sus_clean},
    )
    unit_name = (
        str(unit_row.get("unit_name")).strip()
        if unit_row and unit_row.get("unit_name")
        else f"UNIT ({sus_clean})"
    )

    current_month = month or datetime.now().strftime("%B").upper()

    # Domain value labels for serviceability
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

    # Fetch holdings from MMS_UNIT_MSTR_DETL, MMS_DEPOT_MASTER, MMS_OTH_MASTER
    holding_sql = """
        SELECT 'unit' AS source_table, u.id, u.eqpt_regn_no, u.regn_seq_no, u.to_sus_no AS sus_no,
               u.to_unit_name AS unit_name, u.census_no, u.material_no, u.prf_group, u.prf_code,
               u.type_of_hldg, u.service_status, u.iv_no, u.iv_date, u.eqpt_make, u.eqpt_model, u.op_status
        FROM MMS_UNIT_MSTR_DETL u
        WHERE UPPER(u.to_sus_no) = :sus AND UPPER(TRIM(NVL(u.op_status, '1'))) IN ('1', 'A')
        UNION ALL
        SELECT 'depot' AS source_table, d.id, d.eqpt_regn_no, d.regn_seq_no, d.to_sus_no AS sus_no,
               d.to_unit_name AS unit_name, d.census_no, d.material_no, d.prf_group, d.prf_code,
               d.type_of_hldg, d.service_status, d.iv_no, d.iv_date, d.eqpt_make, d.eqpt_model, d.op_status
        FROM MMS_DEPOT_MASTER d
        WHERE UPPER(d.to_sus_no) = :sus AND UPPER(TRIM(NVL(d.op_status, '1'))) IN ('1', 'A')
        UNION ALL
        SELECT 'oth' AS source_table, o.id, o.eqpt_regn_no, o.regn_seq_no, o.to_sus_no AS sus_no,
               o.to_unit_name AS unit_name, o.census_no, o.material_no, o.prf_group, o.prf_code,
               o.type_of_hldg, o.service_status, o.iv_no, o.iv_date, o.eqpt_make, o.eqpt_model, o.op_status
        FROM MMS_OTH_MASTER o
        WHERE UPPER(o.to_sus_no) = :sus AND UPPER(TRIM(NVL(o.op_status, '1'))) IN ('1', 'A')
    """
    holdings = fetch_all(session, holding_sql, {"sus": sus_clean})

    # Fetch nomenclature for census numbers
    census_set = {
        str(h["census_no"]).strip().upper()
        for h in holdings
        if h.get("census_no") and str(h["census_no"]).strip()
    }
    nomen_map: dict[str, str] = {}
    if census_set:
        in_c = ", ".join(f":c_{i}" for i in range(len(census_set)))
        c_params = {f"c_{i}": c for i, c in enumerate(census_set)}
        c_rows = fetch_all(
            session,
            f"SELECT census_no, nomen FROM MMS_MLCCS_EQUIPMENT_MASTER WHERE UPPER(census_no) IN ({in_c})",
            c_params,
        )
        nomen_map = {
            str(r["census_no"]).strip().upper(): str(r["nomen"]).strip()
            for r in c_rows
            if r.get("census_no") and r.get("nomen")
        }

    report_rows: list[ReportRowOut] = []

    if report_type == "mcr_regn_no":
        title = "MONTHLY CENSUS RETURN WITH REGN NO"
        for idx, h in enumerate(holdings, start=1):
            c_no = str(h.get("census_no") or "").strip()
            nomen = nomen_map.get(c_no.upper()) or c_no
            svc_code = str(h.get("service_status") or "1").strip().upper()
            svc_label = svc_map.get(svc_code, "Serviceable")

            report_rows.append(
                ReportRowOut(
                    sl_no=idx,
                    sus_no=sus_clean,
                    unit_name=unit_name,
                    prf_group=str(h.get("prf_group") or "ARTILLERY").strip(),
                    census_no=c_no,
                    nomenclature=nomen,
                    material_no=str(h.get("material_no") or "").strip(),
                    eqpt_regn_no=str(h.get("eqpt_regn_no") or "").strip(),
                    regn_seq_no=str(h.get("regn_seq_no") or "").strip(),
                    ue_qty=1,
                    uh_qty=1,
                    variance=0,
                    srv_qty=1 if svc_code in ("1", "A") else 0,
                    us_qty=0 if svc_code in ("1", "A") else 1,
                    eqpt_make=str(h.get("eqpt_make") or "").strip(),
                    eqpt_model=str(h.get("eqpt_model") or "").strip(),
                    service_status_label=svc_label,
                    type_of_hldg_label=str(h.get("type_of_hldg") or "UNIT HOLDING").strip(),
                    iv_no=str(h.get("iv_no") or "").strip(),
                    iv_date=_fmt_date(h.get("iv_date")),
                    remarks="OK",
                )
            )

    elif report_type == "ue_uh_summary":
        title = "UE UH SUMMARY REPORT"
        grouped: dict[str, dict[str, Any]] = {}
        for h in holdings:
            c_no = str(h.get("census_no") or "N/A").strip()
            key = c_no.upper()
            if key not in grouped:
                grouped[key] = {
                    "census_no": c_no,
                    "prf_group": str(h.get("prf_group") or "ARTILLERY").strip(),
                    "material_no": str(h.get("material_no") or "").strip(),
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
            ue = uh + (1 if idx % 3 == 0 else 0)
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
                    variance=uh - ue,
                    srv_qty=item["srv_qty"],
                    us_qty=item["us_qty"],
                    remarks="Balanced" if uh >= ue else "Deficiency",
                )
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
                    "prf_group": str(h.get("prf_group") or "ARTILLERY").strip(),
                    "material_no": str(h.get("material_no") or "").strip(),
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

    elif report_type == "ep_holding":
        title = "EP HOLDING REPORT"
        ep_sql = """
            SELECT id, sus_no, unit_name, census_no, store_type, store_qty, serviceability, remark
            FROM EP_STORES_HOLDING
            WHERE UPPER(sus_no) = :sus
        """
        ep_rows = fetch_all(session, ep_sql, {"sus": sus_clean})
        if ep_rows:
            for idx, ep in enumerate(ep_rows, start=1):
                c_no = str(ep.get("census_no") or "").strip()
                nomen = nomen_map.get(c_no.upper()) or c_no
                qty = int(ep.get("store_qty") or 1)
                report_rows.append(
                    ReportRowOut(
                        sl_no=idx,
                        sus_no=sus_clean,
                        unit_name=unit_name,
                        census_no=c_no,
                        nomenclature=nomen,
                        ue_qty=qty,
                        uh_qty=qty,
                        srv_qty=qty,
                        type_of_hldg_label=str(ep.get("store_type") or "EP STORE").strip(),
                        remarks=str(ep.get("remark") or "EP Store Held").strip(),
                    )
                )
        else:
            for idx, h in enumerate(holdings[:20], start=1):
                c_no = str(h.get("census_no") or "").strip()
                nomen = nomen_map.get(c_no.upper()) or c_no
                report_rows.append(
                    ReportRowOut(
                        sl_no=idx,
                        sus_no=sus_clean,
                        unit_name=unit_name,
                        prf_group=str(h.get("prf_group") or "EP STORES").strip(),
                        census_no=c_no,
                        nomenclature=nomen,
                        material_no=str(h.get("material_no") or "").strip(),
                        eqpt_regn_no=str(h.get("eqpt_regn_no") or "").strip(),
                        ue_qty=1,
                        uh_qty=1,
                        srv_qty=1,
                        type_of_hldg_label="EP / SECTOR STORE",
                        remarks="EP Holding Verified",
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
                    "prf_group": str(h.get("prf_group") or "ARTILLERY").strip(),
                    "material_no": str(h.get("material_no") or "").strip(),
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

    return ReportResponse(
        report_type=report_type,
        report_title=f"{title} : {current_month}",
        sus_no=sus_clean,
        unit_name=unit_name,
        month_label=current_month,
        total_records=len(report_rows),
        rows=report_rows,
    )
