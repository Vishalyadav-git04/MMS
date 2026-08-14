"""EQPT Transfer (Depot to Depot) — Weapon → EQPT Transfer using Native SQL."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.deps import get_db_session
from app.db.native_utils import execute_sql, fetch_all, fetch_one
from app.utils.ids import next_int_id

router = APIRouter(
    prefix="/transfer/depot-to-depot",
    tags=["transfer: depot to depot"],
)


def _get_approved_op_codes(session: Session) -> list[str]:
    sql = """
        SELECT code_value FROM MMS_DOMAIN_VALUES
        WHERE REPLACE(UPPER(domain_name), '_', '') = 'OPSTATUS'
        AND (UPPER(TRIM(code_value)) IN ('1', 'A', 'APPROVED') OR UPPER(label_name) LIKE '%APPROV%')
    """
    rows = fetch_all(session, sql)
    clean = [str(r["code_value"]).strip().upper() for r in rows if r.get("code_value")]
    fallbacks = ["1", "A", "APPROVED"]
    return list(set(clean + fallbacks))


def _get_tfr_status_code(session: Session) -> str:
    sql = """
        SELECT code_value FROM MMS_DOMAIN_VALUES
        WHERE REPLACE(UPPER(domain_name), '_', '') = 'TFRSTATUS'
        AND (UPPER(label_name) LIKE '%TRANSFER%' OR UPPER(code_value) LIKE '%TRANS%' OR UPPER(code_value) LIKE '%TFR%')
    """
    row = fetch_one(session, sql)
    if not row:
        row = fetch_one(session, "SELECT code_value FROM MMS_DOMAIN_VALUES WHERE REPLACE(UPPER(domain_name), '_', '') = 'TFRSTATUS'")
    val = row.get("code_value") if row else None
    return str(val or "TRANSFERRED").strip()


class ParentUnitOut(BaseModel):
    sus_no: str
    unit_name: str
    display: str


class OptionOut(BaseModel):
    value: str
    label: str


class PrfOptionOut(BaseModel):
    prf_code: str
    prf_group: str


class CensusOptionOut(BaseModel):
    census_no: str
    nomenclature: str


class ReceivingUnitOut(BaseModel):
    sus_no: str
    unit_name: str
    form_code: str | None = None
    display: str


class TransferSubmitIn(BaseModel):
    parent_sus_no: str = Field(..., min_length=1)
    parent_type_of_hldg: str | None = None
    parent_type_of_eqpt: str | None = None
    prf_code: str | None = None
    census_no: str | None = None
    receiving_sus_no: str = Field(..., min_length=1)
    receiving_type_of_hldg: str | None = None
    receiving_type_of_eqpt: str | None = None
    regn_numbers: list[str] = Field(..., min_length=1)


class TransferSubmitOut(BaseModel):
    count: int
    transferred_regns: list[str]


@router.get("/status")
def status() -> dict[str, str]:
    return {"module": "transfer", "feature": "depot-to-depot", "status": "active"}


@router.get("/parent-units", response_model=list[ParentUnitOut])
def get_parent_units(session: Session = Depends(get_db_session)) -> list[ParentUnitOut]:
    approved_codes = _get_approved_op_codes(session)
    ac_clause = ", ".join(f":ac_{i}" for i in range(len(approved_codes)))
    params = {f"ac_{i}": c for i, c in enumerate(approved_codes)}

    sql = f"""
        SELECT DISTINCT to_sus_no FROM MMS_DEPOT_MASTER WHERE to_sus_no IS NOT NULL AND UPPER(TRIM(COALESCE(op_status, ''))) IN ({ac_clause})
        UNION
        SELECT DISTINCT to_sus_no FROM MMS_UNIT_MASTER WHERE to_sus_no IS NOT NULL AND UPPER(TRIM(COALESCE(op_status, ''))) IN ({ac_clause})
        UNION
        SELECT DISTINCT to_sus_no FROM MMS_OTH_MASTER WHERE to_sus_no IS NOT NULL AND UPPER(TRIM(COALESCE(op_status, ''))) IN ({ac_clause})
    """
    rows = fetch_all(session, sql, params)
    clean_suses = [str(r["to_sus_no"]).strip().upper() for r in rows if r.get("to_sus_no")]
    if not clean_suses:
        return []

    sin_clause = ", ".join(f":s_{i}" for i in range(len(clean_suses)))
    sparams = {f"s_{i}": s for i, s in enumerate(clean_suses)}

    orbat_rows = fetch_all(
        session,
        f"SELECT sus_no, unit_name FROM MMS_ORBAT_UNIT_DETL WHERE UPPER(sus_no) IN ({sin_clause})",
        sparams,
    )
    orbat_map = {str(r["sus_no"]).strip().upper(): str(r["unit_name"]).strip() for r in orbat_rows if r.get("sus_no")}

    res: list[ParentUnitOut] = []
    for s in sorted(list(set(clean_suses))):
        name = orbat_map.get(s, s)
        display = f"{s} - {name}" if name != s else s
        res.append(ParentUnitOut(sus_no=s, unit_name=name, display=display))

    res.sort(key=lambda x: x.display)
    return res


@router.get("/holding-types", response_model=list[OptionOut])
def get_parent_holding_types(
    parent_sus_no: str = Query(..., min_length=1),
    session: Session = Depends(get_db_session),
) -> list[OptionOut]:
    approved_codes = _get_approved_op_codes(session)
    ac_clause = ", ".join(f":ac_{i}" for i in range(len(approved_codes)))
    params = {f"ac_{i}": c for i, c in enumerate(approved_codes)}
    params["sus"] = parent_sus_no.strip().upper()

    sql = f"""
        SELECT DISTINCT type_of_hldg FROM MMS_DEPOT_MASTER WHERE UPPER(to_sus_no) = :sus AND type_of_hldg IS NOT NULL AND UPPER(TRIM(COALESCE(op_status, ''))) IN ({ac_clause})
        UNION
        SELECT DISTINCT type_of_hldg FROM MMS_UNIT_MASTER WHERE UPPER(to_sus_no) = :sus AND type_of_hldg IS NOT NULL AND UPPER(TRIM(COALESCE(op_status, ''))) IN ({ac_clause})
        UNION
        SELECT DISTINCT type_of_hldg FROM MMS_OTH_MASTER WHERE UPPER(to_sus_no) = :sus AND type_of_hldg IS NOT NULL AND UPPER(TRIM(COALESCE(op_status, ''))) IN ({ac_clause})
    """
    rows = fetch_all(session, sql, params)
    clean_types = [str(r["type_of_hldg"]).strip() for r in rows if r.get("type_of_hldg")]

    if not clean_types:
        return []

    dv_rows = fetch_all(session, "SELECT code_value, label_name FROM MMS_DOMAIN_VALUES WHERE REPLACE(UPPER(domain_name), '_', '') = 'TYPEOFHOLDING'")
    dv_map = {str(r["code_value"]).strip().upper(): str(r.get("label_name") or r["code_value"]) for r in dv_rows if r.get("code_value")}

    res: list[OptionOut] = []
    for t in sorted(list(set(clean_types))):
        lbl = dv_map.get(t.upper(), t)
        res.append(OptionOut(value=t, label=lbl))
    return res


@router.get("/eqpt-types", response_model=list[OptionOut])
def get_parent_eqpt_types(
    parent_sus_no: str = Query(..., min_length=1),
    holding_type: str | None = None,
    session: Session = Depends(get_db_session),
) -> list[OptionOut]:
    approved_codes = _get_approved_op_codes(session)
    ac_clause = ", ".join(f":ac_{i}" for i in range(len(approved_codes)))
    params = {f"ac_{i}": c for i, c in enumerate(approved_codes)}
    params["sus"] = parent_sus_no.strip().upper()

    ht_clause = ""
    if holding_type and holding_type.strip():
        ht_clause = " AND UPPER(type_of_hldg) = :htype"
        params["htype"] = holding_type.strip().upper()

    sql = f"""
        SELECT DISTINCT type_of_eqpt FROM MMS_DEPOT_MASTER WHERE UPPER(to_sus_no) = :sus AND type_of_eqpt IS NOT NULL AND UPPER(TRIM(COALESCE(op_status, ''))) IN ({ac_clause}){ht_clause}
        UNION
        SELECT DISTINCT type_of_eqpt FROM MMS_UNIT_MASTER WHERE UPPER(to_sus_no) = :sus AND type_of_eqpt IS NOT NULL AND UPPER(TRIM(COALESCE(op_status, ''))) IN ({ac_clause}){ht_clause}
        UNION
        SELECT DISTINCT type_of_eqpt FROM MMS_OTH_MASTER WHERE UPPER(to_sus_no) = :sus AND type_of_eqpt IS NOT NULL AND UPPER(TRIM(COALESCE(op_status, ''))) IN ({ac_clause}){ht_clause}
    """

    rows = fetch_all(session, sql, params)
    clean_types = [str(r["type_of_eqpt"]).strip() for r in rows if r.get("type_of_eqpt")]

    if not clean_types:
        return []

    dv_rows = fetch_all(session, "SELECT code_value, label_name FROM MMS_DOMAIN_VALUES WHERE REPLACE(UPPER(domain_name), '_', '') = 'TYPEOFEQPT'")
    dv_map = {str(r["code_value"]).strip().upper(): str(r.get("label_name") or r["code_value"]) for r in dv_rows if r.get("code_value")}

    res: list[OptionOut] = []
    for t in sorted(list(set(clean_types))):
        lbl = dv_map.get(t.upper(), t)
        res.append(OptionOut(value=t, label=lbl))
    return res


@router.get("/prf-groups", response_model=list[PrfOptionOut])
def get_parent_prf_groups(
    parent_sus_no: str = Query(..., min_length=1),
    holding_type: str | None = None,
    eqpt_type: str | None = None,
    session: Session = Depends(get_db_session),
) -> list[PrfOptionOut]:
    approved_codes = _get_approved_op_codes(session)
    ac_clause = ", ".join(f":ac_{i}" for i in range(len(approved_codes)))
    params = {f"ac_{i}": c for i, c in enumerate(approved_codes)}
    params["sus"] = parent_sus_no.strip().upper()

    extra_clause = ""
    if holding_type and holding_type.strip():
        extra_clause += " AND UPPER(type_of_hldg) = :htype"
        params["htype"] = holding_type.strip().upper()
    if eqpt_type and eqpt_type.strip():
        extra_clause += " AND UPPER(type_of_eqpt) = :etype"
        params["etype"] = eqpt_type.strip().upper()

    sql = f"""
        SELECT DISTINCT prf_code FROM MMS_DEPOT_MASTER WHERE UPPER(to_sus_no) = :sus AND prf_code IS NOT NULL AND UPPER(TRIM(COALESCE(op_status, ''))) IN ({ac_clause}){extra_clause}
        UNION
        SELECT DISTINCT prf_code FROM MMS_UNIT_MASTER WHERE UPPER(to_sus_no) = :sus AND prf_code IS NOT NULL AND UPPER(TRIM(COALESCE(op_status, ''))) IN ({ac_clause}){extra_clause}
        UNION
        SELECT DISTINCT prf_code FROM MMS_OTH_MASTER WHERE UPPER(to_sus_no) = :sus AND prf_code IS NOT NULL AND UPPER(TRIM(COALESCE(op_status, ''))) IN ({ac_clause}){extra_clause}
    """

    rows = fetch_all(session, sql, params)
    clean_codes = [str(r["prf_code"]).strip() for r in rows if r.get("prf_code")]

    if not clean_codes:
        return []

    prf_map: dict[str, str] = {}
    int_codes = [int(c) for c in clean_codes if c.isdigit()]
    if int_codes:
        pin_clause = ", ".join(f":p_{i}" for i in range(len(int_codes)))
        pparams = {f"p_{i}": p for i, p in enumerate(int_codes)}
        prf_rows = fetch_all(session, f"SELECT DISTINCT prf_code, prf_grp FROM MMS_PRF_GRP_MSTR WHERE prf_code IN ({pin_clause})", pparams)
        for r in prf_rows:
            if r.get("prf_grp"):
                prf_map[str(r["prf_code"]).strip()] = str(r["prf_grp"]).strip()

    unmapped = [c for c in clean_codes if c not in prf_map]
    if unmapped:
        umin_clause = ", ".join(f":u_{i}" for i in range(len(unmapped)))
        uparams = {f"u_{i}": u for i, u in enumerate(unmapped)}
        mlccs_rows = fetch_all(session, f"SELECT prf_code, prf_group FROM MMS_MLCCS_EQPT_MASTER WHERE prf_code IN ({umin_clause})", uparams)
        for r in mlccs_rows:
            if r.get("prf_code") and r.get("prf_group"):
                prf_map[str(r["prf_code"]).strip()] = str(r["prf_group"]).strip()

    res: list[PrfOptionOut] = []
    for c in sorted(list(set(clean_codes))):
        name = prf_map.get(c, f"PRF Group {c}")
        res.append(PrfOptionOut(prf_code=c, prf_group=name))
    res.sort(key=lambda x: x.prf_group.lower())
    return res


@router.get("/nomenclatures", response_model=list[CensusOptionOut])
def get_parent_nomenclatures(
    parent_sus_no: str = Query(..., min_length=1),
    holding_type: str | None = None,
    eqpt_type: str | None = None,
    prf_code: str | None = None,
    session: Session = Depends(get_db_session),
) -> list[CensusOptionOut]:
    approved_codes = _get_approved_op_codes(session)
    ac_clause = ", ".join(f":ac_{i}" for i in range(len(approved_codes)))
    params = {f"ac_{i}": c for i, c in enumerate(approved_codes)}
    params["sus"] = parent_sus_no.strip().upper()

    extra_clause = ""
    if holding_type and holding_type.strip():
        extra_clause += " AND UPPER(type_of_hldg) = :htype"
        params["htype"] = holding_type.strip().upper()
    if eqpt_type and eqpt_type.strip():
        extra_clause += " AND UPPER(type_of_eqpt) = :etype"
        params["etype"] = eqpt_type.strip().upper()
    if prf_code and prf_code.strip():
        extra_clause += " AND UPPER(prf_code) = :pcode"
        params["pcode"] = prf_code.strip().upper()

    sql = f"""
        SELECT DISTINCT census_no FROM MMS_DEPOT_MASTER WHERE UPPER(to_sus_no) = :sus AND census_no IS NOT NULL AND UPPER(TRIM(COALESCE(op_status, ''))) IN ({ac_clause}){extra_clause}
        UNION
        SELECT DISTINCT census_no FROM MMS_UNIT_MASTER WHERE UPPER(to_sus_no) = :sus AND census_no IS NOT NULL AND UPPER(TRIM(COALESCE(op_status, ''))) IN ({ac_clause}){extra_clause}
        UNION
        SELECT DISTINCT census_no FROM MMS_OTH_MASTER WHERE UPPER(to_sus_no) = :sus AND census_no IS NOT NULL AND UPPER(TRIM(COALESCE(op_status, ''))) IN ({ac_clause}){extra_clause}
    """

    rows = fetch_all(session, sql, params)
    clean_censuses = [str(r["census_no"]).strip() for r in rows if r.get("census_no")]

    if not clean_censuses:
        return []

    cin_clause = ", ".join(f":c_{i}" for i in range(len(clean_censuses)))
    cparams = {f"c_{i}": c for i, c in enumerate(clean_censuses)}
    mlccs_rows = fetch_all(session, f"SELECT census_no, nomen FROM MMS_MLCCS_EQPT_MASTER WHERE census_no IN ({cin_clause})", cparams)
    mlccs_map = {str(r["census_no"]).strip(): str(r["nomen"]).strip() for r in mlccs_rows if r.get("census_no") and r.get("nomen")}

    res: list[CensusOptionOut] = []
    for c in sorted(list(set(clean_censuses))):
        nomen = mlccs_map.get(c, f"Census {c}")
        res.append(CensusOptionOut(census_no=c, nomenclature=f"{c} — {nomen}"))
    res.sort(key=lambda x: x.nomenclature.lower())
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

    res: list[ReceivingUnitOut] = []
    for r in rows:
        sus = str(r["sus_no"])
        uname = str(r["unit_name"])
        display = f"{sus} - {uname}"
        res.append(
            ReceivingUnitOut(
                sus_no=sus,
                unit_name=uname,
                form_code=r.get("form_code"),
                display=display,
            )
        )
    return res


@router.get("/receiving-holding-types", response_model=list[OptionOut])
def get_receiving_holding_types(
    session: Session = Depends(get_db_session),
) -> list[OptionOut]:
    rows = fetch_all(
        session,
        """
        SELECT code_value, label_name FROM MMS_DOMAIN_VALUES
        WHERE REPLACE(UPPER(domain_name), '_', '') = 'TYPEOFHOLDING'
        AND (UPPER(code_value) LIKE '%D%' OR UPPER(code_value) LIKE '%R%' OR UPPER(label_name) LIKE '%DEPOT%' OR UPPER(label_name) LIKE '%REGIMENTAL%')
        ORDER BY LPAD(COALESCE(disp_order, '9999'), 10, '0'), label_name
        """,
    )
    if not rows:
        return [
            OptionOut(value="D", label="Depot Holding"),
            OptionOut(value="R", label="Regimental Holding"),
        ]

    res: list[OptionOut] = []
    seen = set()
    for r in rows:
        val = str(r.get("code_value") or r.get("label_name") or "").strip()
        lbl = str(r.get("label_name") or r.get("code_value") or "").strip()
        if val and val not in seen:
            seen.add(val)
            res.append(OptionOut(value=val, label=lbl))
    return res


@router.get("/receiving-eqpt-types", response_model=list[OptionOut])
def get_receiving_eqpt_types(
    session: Session = Depends(get_db_session),
) -> list[OptionOut]:
    rows = fetch_all(
        session,
        "SELECT code_value, label_name FROM MMS_DOMAIN_VALUES WHERE REPLACE(UPPER(domain_name), '_', '') = 'TYPEOFEQPT' ORDER BY LPAD(COALESCE(disp_order, '9999'), 10, '0'), label_name",
    )
    if not rows:
        return [
            OptionOut(value="S", label="Small Arms"),
            OptionOut(value="C", label="Crew Served Wpn"),
            OptionOut(value="O", label="Optics & NVDs"),
            OptionOut(value="E", label="Comn Eqpt"),
        ]

    res: list[OptionOut] = []
    seen = set()
    for r in rows:
        val = str(r.get("code_value") or r.get("label_name") or "").strip()
        lbl = str(r.get("label_name") or r.get("code_value") or "").strip()
        if val and val not in seen:
            seen.add(val)
            res.append(OptionOut(value=val, label=lbl))
    return res


@router.get("/regn-list", response_model=list[str])
def get_regn_list(
    parent_sus_no: str = Query(..., min_length=1),
    holding_type: str | None = None,
    eqpt_type: str | None = None,
    prf_code: str | None = None,
    census_no: str | None = None,
    session: Session = Depends(get_db_session),
) -> list[str]:
    approved_codes = _get_approved_op_codes(session)
    ac_clause = ", ".join(f":ac_{i}" for i in range(len(approved_codes)))
    params = {f"ac_{i}": c for i, c in enumerate(approved_codes)}
    params["sus"] = parent_sus_no.strip().upper()

    extra_clause = ""
    if holding_type and holding_type.strip():
        extra_clause += " AND UPPER(type_of_hldg) = :htype"
        params["htype"] = holding_type.strip().upper()
    if eqpt_type and eqpt_type.strip():
        extra_clause += " AND UPPER(type_of_eqpt) = :etype"
        params["etype"] = eqpt_type.strip().upper()
    if prf_code and prf_code.strip():
        extra_clause += " AND UPPER(prf_code) = :pcode"
        params["pcode"] = prf_code.strip().upper()
    if census_no and census_no.strip():
        extra_clause += " AND UPPER(census_no) = :cno"
        params["cno"] = census_no.strip().upper()

    sql = f"""
        SELECT eqpt_regn_no FROM MMS_DEPOT_MASTER WHERE UPPER(to_sus_no) = :sus AND eqpt_regn_no IS NOT NULL AND UPPER(TRIM(COALESCE(op_status, ''))) IN ({ac_clause}){extra_clause}
        UNION
        SELECT eqpt_regn_no FROM MMS_UNIT_MASTER WHERE UPPER(to_sus_no) = :sus AND eqpt_regn_no IS NOT NULL AND UPPER(TRIM(COALESCE(op_status, ''))) IN ({ac_clause}){extra_clause}
        UNION
        SELECT eqpt_regn_no FROM MMS_OTH_MASTER WHERE UPPER(to_sus_no) = :sus AND eqpt_regn_no IS NOT NULL AND UPPER(TRIM(COALESCE(op_status, ''))) IN ({ac_clause}){extra_clause}
    """

    rows = fetch_all(session, sql, params)
    regns = sorted(list({str(r["eqpt_regn_no"]).strip() for r in rows if r.get("eqpt_regn_no") and str(r["eqpt_regn_no"]).strip()}))
    return regns


@router.post("/transfer", response_model=TransferSubmitOut)
def submit_transfer(
    body: TransferSubmitIn,
    session: Session = Depends(get_db_session),
) -> TransferSubmitOut:
    parent_sus = body.parent_sus_no.strip().upper()
    receiving_sus = body.receiving_sus_no.strip().upper()

    if not body.regn_numbers:
        raise HTTPException(status_code=400, detail="No registration numbers provided for transfer")

    parent_unit = fetch_one(session, "SELECT form_code FROM MMS_ORBAT_UNIT_DETL WHERE UPPER(sus_no) = :sus", {"sus": parent_sus})
    parent_form_code = parent_unit.get("form_code") if parent_unit else None

    receiving_unit = fetch_one(session, "SELECT form_code FROM MMS_ORBAT_UNIT_DETL WHERE UPPER(sus_no) = :sus", {"sus": receiving_sus})
    receiving_form_code = receiving_unit.get("form_code") if receiving_unit else None

    tfr_status_code = _get_tfr_status_code(session)
    approved_codes = _get_approved_op_codes(session)

    ac_clause = ", ".join(f":ac_{i}" for i in range(len(approved_codes)))
    r_clause = ", ".join(f":r_{i}" for i in range(len(body.regn_numbers)))

    params = {
        "psus": parent_sus,
        **{f"ac_{i}": c for i, c in enumerate(approved_codes)},
        **{f"r_{i}": r for i, r in enumerate(body.regn_numbers)},
    }

    extra_clause = ""
    if body.parent_type_of_hldg and body.parent_type_of_hldg.strip():
        extra_clause += " AND UPPER(type_of_hldg) = :htype"
        params["htype"] = body.parent_type_of_hldg.strip().upper()
    if body.parent_type_of_eqpt and body.parent_type_of_eqpt.strip():
        extra_clause += " AND UPPER(type_of_eqpt) = :etype"
        params["etype"] = body.parent_type_of_eqpt.strip().upper()
    if body.prf_code and body.prf_code.strip():
        extra_clause += " AND UPPER(prf_code) = :pcode"
        params["pcode"] = body.prf_code.strip().upper()
    if body.census_no and body.census_no.strip():
        extra_clause += " AND UPPER(census_no) = :cno"
        params["cno"] = body.census_no.strip().upper()

    depot_rows = fetch_all(
        session,
        f"""
            SELECT * FROM MMS_DEPOT_MASTER
            WHERE UPPER(to_sus_no) = :psus
            AND eqpt_regn_no IN ({r_clause})
            AND UPPER(TRIM(COALESCE(op_status, ''))) IN ({ac_clause})
            {extra_clause}
        """,
        params,
    )

    if not depot_rows:
        unit_rows = fetch_all(
            session,
            f"""
                SELECT * FROM MMS_UNIT_MASTER
                WHERE UPPER(to_sus_no) = :psus
                AND eqpt_regn_no IN ({r_clause})
                AND UPPER(TRIM(COALESCE(op_status, ''))) IN ({ac_clause})
                {extra_clause}
            """,
            params,
        )
        if not unit_rows:
            oth_rows = fetch_all(
                session,
                f"""
                    SELECT * FROM MMS_OTH_MASTER
                    WHERE UPPER(to_sus_no) = :psus
                    AND eqpt_regn_no IN ({r_clause})
                    AND UPPER(TRIM(COALESCE(op_status, ''))) IN ({ac_clause})
                    {extra_clause}
                """,
                params,
            )
            unit_rows = oth_rows

        if not unit_rows:
            raise HTTPException(status_code=404, detail="No approved equipment records found for transfer")

        now = datetime.now()
        transferred: list[str] = []
        last_id: int | None = None
        for ur in unit_rows:
            next_id = str(next_int_id(session, "MMS_DEPOT_MASTER", start_after=last_id))
            last_id = int(next_id) if next_id.isdigit() else None

            insert_params = {
                "id": next_id,
                "sus_no": receiving_sus,
                "census_seq_no": ur.get("census_seq_no"),
                "census_no": ur.get("census_no"),
                "type_of_hldg": body.receiving_type_of_hldg.strip() if body.receiving_type_of_hldg else ur.get("type_of_hldg"),
                "type_of_eqpt": body.receiving_type_of_eqpt.strip() if body.receiving_type_of_eqpt else ur.get("type_of_eqpt"),
                "eqpt_regn_no": ur.get("eqpt_regn_no"),
                "regn_seq_no": ur.get("regn_seq_no"),
                "from_sus_no": parent_sus,
                "from_form_code": parent_form_code,
                "from_tr_date": now,
                "to_sus_no": receiving_sus,
                "to_form_code": receiving_form_code,
                "to_tr_date": now,
                "service_status": ur.get("service_status"),
                "op_status": ur.get("op_status"),
                "tfr_status": tfr_status_code,
                "prf_code": ur.get("prf_code"),
            }
            insert_sql = """
                INSERT INTO MMS_DEPOT_MASTER (
                    id, sus_no, census_seq_no, census_no, type_of_hldg, type_of_eqpt,
                    eqpt_regn_no, regn_seq_no, from_sus_no, from_form_code, from_tr_date,
                    to_sus_no, to_form_code, to_tr_date, service_status, op_status, tfr_status, prf_code
                ) VALUES (
                    :id, :sus_no, :census_seq_no, :census_no, :type_of_hldg, :type_of_eqpt,
                    :eqpt_regn_no, :regn_seq_no, :from_sus_no, :from_form_code, :from_tr_date,
                    :to_sus_no, :to_form_code, :to_tr_date, :service_status, :op_status, :tfr_status, :prf_code
                )
            """
            execute_sql(session, insert_sql, insert_params)

            u_up_params = {
                "rsus": receiving_sus,
                "psus": parent_sus,
                "now_dt": now,
                "tfr_code": tfr_status_code,
                "uid": ur["id"],
                "uid_str": str(ur["id"]),
            }
            target_tbl = "MMS_OTH_MASTER" if "MMS_OTH_MASTER" in str(ur.get("source_table", "")) else "MMS_UNIT_MASTER"
            execute_sql(
                session,
                f"UPDATE {target_tbl} SET to_sus_no = :rsus, sus_no = :rsus, from_sus_no = :psus, to_tr_date = :now_dt, from_tr_date = :now_dt, tfr_status = :tfr_code WHERE id = :uid OR TO_CHAR(id) = :uid_str",
                u_up_params,
            )

            if ur.get("eqpt_regn_no"):
                transferred.append(str(ur["eqpt_regn_no"]))

        return TransferSubmitOut(count=len(transferred), transferred_regns=transferred)

    now = datetime.now()
    transferred: list[str] = []
    for r in depot_rows:
        rec_id = r["id"]
        update_sql = """
            UPDATE MMS_DEPOT_MASTER
            SET from_sus_no = :psus,
                from_form_code = :pform,
                to_sus_no = :rsus,
                sus_no = :rsus,
                to_form_code = :rform,
                from_tr_date = :now_dt,
                to_tr_date = :now_dt,
                tfr_status = :tfr_code
        """
        up_params = {
            "psus": parent_sus,
            "pform": parent_form_code,
            "rsus": receiving_sus,
            "rform": receiving_form_code,
            "now_dt": now,
            "tfr_code": tfr_status_code,
            "rid": rec_id,
            "rid_str": str(rec_id),
        }
        if body.receiving_type_of_hldg and body.receiving_type_of_hldg.strip():
            update_sql += ", type_of_hldg = :rhldg"
            up_params["rhldg"] = body.receiving_type_of_hldg.strip()
        if body.receiving_type_of_eqpt and body.receiving_type_of_eqpt.strip():
            update_sql += ", type_of_eqpt = :reqpt"
            up_params["reqpt"] = body.receiving_type_of_eqpt.strip()

        update_sql += " WHERE id = :rid OR TO_CHAR(id) = :rid_str"
        execute_sql(session, update_sql, up_params)

        if r.get("eqpt_regn_no"):
            transferred.append(str(r["eqpt_regn_no"]))

    return TransferSubmitOut(count=len(transferred), transferred_regns=transferred)
