"""Update Arty Eqpt Data — Weapon → Unit Holding using Native SQL.

Mirrors app.unit_holding.update_eqpt_data for the search / select / view-details
flow, restricted to Artillery units — ORBAT units whose arm_code starts with
"02" (see app.orbat_unit_seed._ARTY_ARM_CODE_PREFIX).

The Update button opens OH Details / Barrel Details / Strip Inspection tabs
(frontend src/components/unit-holding/UpdateArtyEqptData.tsx). Each tab is an
append-only history log persisted to its own table:
  MMS_OH_DETL, MMS_BARREL_DETL, MMS_STRIP_DETL
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.principal import Principal
from app.deps import get_db_session, require_unit_or_admin
from app.db.native_utils import execute_sql, fetch_all
from app.utils.ids import next_int_id
from app.unit_holding import update_eqpt_data as base

router = APIRouter(
    prefix="/unit-holding/update-arty-eqpt-data",
    tags=["unit-holding: update arty eqpt data"],
)

_ARTY_ARM_PREFIX = "02"


def _fmt_date(value: Any) -> str | None:
    return base._fmt_date(value)


def _to_dt(value: date | None) -> datetime | None:
    if value is None:
        return None
    return datetime.combine(value, datetime.min.time())


def _arty_sus_set(session: Session) -> set[str]:
    """SUS numbers of ORBAT units whose arm_code starts with 02 (Artillery)."""
    rows = fetch_all(
        session,
        "SELECT UPPER(TRIM(sus_no)) AS sus FROM MMS_ORBAT_UNIT_DETL "
        "WHERE arm_code LIKE :prefix AND UPPER(status) = 'ACTIVE'",
        {"prefix": f"{_ARTY_ARM_PREFIX}%"},
    )
    return {r["sus"] for r in rows if r.get("sus")}


@router.get("/status")
def status() -> dict[str, str]:
    return {"module": "unit-holding", "feature": "update-arty-eqpt-data", "status": "ready"}


@router.get("/options")
def list_options(session: Session = Depends(get_db_session)) -> dict[str, list[base.OptionOut]]:
    return base.list_options(session=session)


@router.get("/units", response_model=list[base.HoldingUnitOut])
def search_arty_units(
    q: str = Query(""),
    session: Session = Depends(get_db_session),
) -> list[base.HoldingUnitOut]:
    """Same holding units as update-eqpt-data, restricted to Artillery units."""
    sql = """
        SELECT DISTINCT UPPER(TRIM(to_sus_no)) AS sus FROM MMS_UNIT_MSTR_DETL WHERE to_sus_no IS NOT NULL AND UPPER(TRIM(COALESCE(op_status, ''))) IN ('1', 'A')
        UNION
        SELECT DISTINCT UPPER(TRIM(to_sus_no)) AS sus FROM MMS_DEPOT_MASTER WHERE to_sus_no IS NOT NULL AND UPPER(TRIM(COALESCE(op_status, ''))) IN ('1', 'A')
        UNION
        SELECT DISTINCT UPPER(TRIM(to_sus_no)) AS sus FROM MMS_OTH_MASTER WHERE to_sus_no IS NOT NULL AND UPPER(TRIM(COALESCE(op_status, ''))) IN ('1', 'A')
    """
    rows = fetch_all(session, sql)
    sus_list = [str(r["sus"]).strip() for r in rows if r.get("sus")]

    arty = _arty_sus_set(session)
    sus_list = [s for s in sus_list if s.upper() in arty]

    names = base._orbat_name_map(session, set(sus_list))
    term = q.strip().upper()
    out: list[base.HoldingUnitOut] = []
    for sus in sorted(sus_list):
        name = names.get(sus.upper(), "")
        display = f"{sus} - {name}" if name else sus
        if term and term not in display.upper() and term not in sus.upper():
            continue
        out.append(base.HoldingUnitOut(sus_no=sus, unit_name=name or sus, display=display))
    return out[:80]


@router.get("/prf-groups", response_model=list[base.PrfGroupOut])
def list_prf_groups(
    sus_no: str = Query(..., min_length=1),
    session: Session = Depends(get_db_session),
) -> list[base.PrfGroupOut]:
    return base.list_prf_groups(sus_no=sus_no, session=session)


@router.get("/census-items", response_model=list[base.CensusItemOut])
def list_census_items(
    sus_no: str = Query(..., min_length=1),
    prf_group: str = Query(..., min_length=1),
    session: Session = Depends(get_db_session),
) -> list[base.CensusItemOut]:
    return base.list_census_items(sus_no=sus_no, prf_group=prf_group, session=session)


@router.get("/holding-types", response_model=list[base.HoldingTypeOut])
def list_holding_types(
    sus_no: str = Query(..., min_length=1),
    prf_group: str = Query(..., min_length=1),
    census_no: str = Query(..., min_length=1),
    session: Session = Depends(get_db_session),
) -> list[base.HoldingTypeOut]:
    return base.list_holding_types(sus_no=sus_no, prf_group=prf_group, census_no=census_no, session=session)


@router.post("/search", response_model=list[base.EqptRowOut])
def search_eqpt(
    body: base.SearchIn,
    session: Session = Depends(get_db_session),
    principal: Principal = Depends(require_unit_or_admin),
) -> list[base.EqptRowOut]:
    return base.search_eqpt(body=body, session=session, _=principal)


@router.get("/detail", response_model=base.EqptDetailOut)
def get_eqpt_detail(
    id: str = Query(..., min_length=1),
    source_table: str = Query(..., min_length=1),
    session: Session = Depends(get_db_session),
    principal: Principal = Depends(require_unit_or_admin),
) -> base.EqptDetailOut:
    return base.get_eqpt_detail(id=id, source_table=source_table, session=session, _=principal)


# ---------------------------------------------------------------------------
# OH Details / Barrel Details / Strip Inspection — append-only history tables
# ---------------------------------------------------------------------------


class OhDetailIn(BaseModel):
    eqpt_regn_no: str = Field(..., min_length=1, max_length=25)
    sus_no: str | None = Field(None, max_length=50)
    oh_type: str = Field(..., min_length=1, max_length=50)
    oh_due_dt: date | None = None
    oh_done_dt: date | None = None
    wksp_name: str | None = Field(None, max_length=150)
    wksp_in_dt: date | None = None
    dispatch_dt: date | None = None
    boh_compl_dt: date | None = None
    gun_recd_dt: date | None = None
    dt_of_intro: date | None = None


class OhDetailOut(BaseModel):
    id: str
    eqpt_regn_no: str
    oh_type: str
    created_by: str | None = None
    created_on: str | None = None


@router.post("/oh-detail", response_model=OhDetailOut)
def add_oh_detail(
    body: OhDetailIn,
    session: Session = Depends(get_db_session),
    principal: Principal = Depends(require_unit_or_admin),
) -> OhDetailOut:
    actor = (principal.username or "system")[:25]
    now = datetime.utcnow()
    new_id = str(next_int_id(session, "MMS_OH_DETL"))
    execute_sql(
        session,
        """
        INSERT INTO MMS_OH_DETL (
            id, oh_type, oh_due_dt, oh_done_dt, wksp_name, wksp_in_dt,
            dispatch_dt, boh_compl_dt, gun_recd_dt, dt_of_intro,
            eqpt_regn_no, sus_no, created_by, created_on
        ) VALUES (
            :id, :oh_type, :oh_due_dt, :oh_done_dt, :wksp_name, :wksp_in_dt,
            :dispatch_dt, :boh_compl_dt, :gun_recd_dt, :dt_of_intro,
            :eqpt_regn_no, :sus_no, :created_by, :created_on
        )
        """,
        {
            "id": new_id,
            "oh_type": body.oh_type.strip()[:50],
            "oh_due_dt": _to_dt(body.oh_due_dt),
            "oh_done_dt": _to_dt(body.oh_done_dt),
            "wksp_name": (body.wksp_name or "").strip()[:150] or None,
            "wksp_in_dt": _to_dt(body.wksp_in_dt),
            "dispatch_dt": _to_dt(body.dispatch_dt),
            "boh_compl_dt": _to_dt(body.boh_compl_dt),
            "gun_recd_dt": _to_dt(body.gun_recd_dt),
            "dt_of_intro": _to_dt(body.dt_of_intro),
            "eqpt_regn_no": body.eqpt_regn_no.strip().upper()[:25],
            "sus_no": (body.sus_no or "").strip().upper()[:50] or None,
            "created_by": actor,
            "created_on": now,
        },
    )
    return OhDetailOut(
        id=new_id,
        eqpt_regn_no=body.eqpt_regn_no,
        oh_type=body.oh_type,
        created_by=actor,
        created_on=_fmt_date(now),
    )


class BarrelDetailIn(BaseModel):
    eqpt_regn_no: str = Field(..., min_length=1, max_length=25)
    sus_no: str | None = Field(None, max_length=15)
    barrel_regn_no: str = Field(..., min_length=1, max_length=25)
    op_clear: str | None = Field(None, max_length=20)
    op_clear_dt: date | None = None
    wksp_name: str | None = Field(None, max_length=150)
    wksp_in_dt: date | None = None
    cofr_vertical: str | None = Field(None, max_length=30)
    cofr_horizontal: str | None = Field(None, max_length=30)
    qtr_of_life: str = Field(..., min_length=1, max_length=15)
    efc: str = Field(..., min_length=1, max_length=20)
    total_rds_fired: str = Field(..., min_length=1, max_length=10)
    last_fired_dt: date = Field(...)


class BarrelDetailOut(BaseModel):
    id: str
    eqpt_regn_no: str
    barrel_regn_no: str
    created_by: str | None = None
    created_on: str | None = None


def _str_or_zero_default(raw: str | None, max_len: int) -> str:
    """COFR_VERTICAL / COFR_HORIZONTAL / EFC / TOTAL_RDS_FIRED / PERIODICITY are
    VARCHAR2 columns with DEFAULT '0' in Oracle — store the raw string as typed
    (never convert to a number, that would mangle formats like '0000.0000'),
    falling back to the literal '0' the column default uses when left blank."""
    cleaned = (raw or "").strip()
    return (cleaned or "0")[:max_len]


@router.post("/barrel-detail", response_model=BarrelDetailOut)
def add_barrel_detail(
    body: BarrelDetailIn,
    session: Session = Depends(get_db_session),
    principal: Principal = Depends(require_unit_or_admin),
) -> BarrelDetailOut:
    actor = (principal.username or "system")[:25]
    now = datetime.utcnow()
    new_id = str(next_int_id(session, "MMS_BARREL_DETL"))
    execute_sql(
        session,
        """
        INSERT INTO MMS_BARREL_DETL (
            id, barrel_regn_no, op_clear, op_clear_dt, wksp_name, wksp_in_dt,
            cofr_vertical, cofr_horizontal, qtr_of_life, efc, total_rds_fired,
            last_fired_dt, eqpt_regn_no, sus_no, created_by, created_on
        ) VALUES (
            :id, :barrel_regn_no, :op_clear, :op_clear_dt, :wksp_name, :wksp_in_dt,
            :cofr_vertical, :cofr_horizontal, :qtr_of_life, :efc, :total_rds_fired,
            :last_fired_dt, :eqpt_regn_no, :sus_no, :created_by, :created_on
        )
        """,
        {
            "id": new_id,
            "barrel_regn_no": body.barrel_regn_no.strip()[:25],
            "op_clear": (body.op_clear or "").strip()[:20] or None,
            "op_clear_dt": _to_dt(body.op_clear_dt),
            "wksp_name": (body.wksp_name or "").strip()[:150] or None,
            "wksp_in_dt": _to_dt(body.wksp_in_dt),
            "cofr_vertical": _str_or_zero_default(body.cofr_vertical, 30),
            "cofr_horizontal": _str_or_zero_default(body.cofr_horizontal, 30),
            "qtr_of_life": body.qtr_of_life.strip()[:15],
            "efc": _str_or_zero_default(body.efc, 20),
            "total_rds_fired": _str_or_zero_default(body.total_rds_fired, 10),
            "last_fired_dt": _to_dt(body.last_fired_dt),
            "eqpt_regn_no": body.eqpt_regn_no.strip().upper()[:25],
            "sus_no": (body.sus_no or "").strip().upper()[:15] or None,
            "created_by": actor,
            "created_on": now,
        },
    )
    return BarrelDetailOut(
        id=new_id,
        eqpt_regn_no=body.eqpt_regn_no,
        barrel_regn_no=body.barrel_regn_no,
        created_by=actor,
        created_on=_fmt_date(now),
    )


class StripDetailIn(BaseModel):
    eqpt_regn_no: str = Field(..., min_length=1, max_length=25)
    recoil_sys_regd_no: str = Field(..., min_length=1, max_length=25)
    periodicity: str | None = Field(None, max_length=10)
    dt_of_insp: date | None = None
    dt_of_next_insp: date | None = None


class StripDetailOut(BaseModel):
    id: str
    eqpt_regn_no: str
    recoil_sys_regd_no: str
    periodicity: str | None = None
    dt_of_insp: str | None = None
    dt_of_next_insp: str | None = None
    created_by: str | None = None
    created_on: str | None = None


@router.get("/strip-detail", response_model=list[StripDetailOut])
def list_strip_detail(
    eqpt_regn_no: str = Query(..., min_length=1),
    session: Session = Depends(get_db_session),
) -> list[StripDetailOut]:
    rows = fetch_all(
        session,
        "SELECT * FROM MMS_STRIP_DETL WHERE UPPER(eqpt_regn_no) = :rno ORDER BY id",
        {"rno": eqpt_regn_no.strip().upper()},
    )
    return [
        StripDetailOut(
            id=str(r.get("id")),
            eqpt_regn_no=str(r.get("eqpt_regn_no") or ""),
            recoil_sys_regd_no=str(r.get("recoil_sys_regd_no") or ""),
            periodicity=r.get("periodicity"),
            dt_of_insp=_fmt_date(r.get("done_dt")),
            dt_of_next_insp=_fmt_date(r.get("due_dt")),
            created_by=r.get("created_by"),
            created_on=_fmt_date(r.get("created_on")),
        )
        for r in rows
    ]


@router.post("/strip-detail", response_model=StripDetailOut)
def add_strip_detail(
    body: StripDetailIn,
    session: Session = Depends(get_db_session),
    principal: Principal = Depends(require_unit_or_admin),
) -> StripDetailOut:
    actor = (principal.username or "system")[:25]
    now = datetime.utcnow()
    new_id = str(next_int_id(session, "MMS_STRIP_DETL"))
    execute_sql(
        session,
        """
        INSERT INTO MMS_STRIP_DETL (
            id, recoil_sys_regd_no, periodicity, due_dt, done_dt, eqpt_regn_no,
            created_by, created_on
        ) VALUES (
            :id, :recoil_sys_regd_no, :periodicity, :due_dt, :done_dt, :eqpt_regn_no,
            :created_by, :created_on
        )
        """,
        {
            "id": new_id,
            "recoil_sys_regd_no": body.recoil_sys_regd_no.strip()[:25],
            "periodicity": _str_or_zero_default(body.periodicity, 10),
            # "Dt of insp" is when the strip inspection was carried out; "Dt of
            # next insp" is when the next one falls due.
            "due_dt": _to_dt(body.dt_of_next_insp),
            "done_dt": _to_dt(body.dt_of_insp),
            "eqpt_regn_no": body.eqpt_regn_no.strip().upper()[:25],
            "created_by": actor,
            "created_on": now,
        },
    )
    return StripDetailOut(
        id=new_id,
        eqpt_regn_no=body.eqpt_regn_no,
        recoil_sys_regd_no=body.recoil_sys_regd_no,
        periodicity=body.periodicity,
        dt_of_insp=_fmt_date(body.dt_of_insp),
        dt_of_next_insp=_fmt_date(body.dt_of_next_insp),
        created_by=actor,
        created_on=_fmt_date(now),
    )
