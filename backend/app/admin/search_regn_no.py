"""Search Regn No — lookup EQPT_REGN_NO across unit / depot / other holdings using Native SQL."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.deps import get_db_session
from app.db.native_utils import execute_sql, fetch_all, fetch_one

router = APIRouter(
    prefix="/admin/search-regn-no",
    tags=["admin: search regn no"],
)

_SOURCE_UNIT = "unit"
_SOURCE_DEPOT = "depot"
_SOURCE_OTH = "oth"

_SOURCE_LABEL = {
    _SOURCE_UNIT: "Unit",
    _SOURCE_DEPOT: "Depot",
    _SOURCE_OTH: "Other",
}

_TABLE_MAP = {
    _SOURCE_UNIT: "MMS_UNIT_MASTER",
    _SOURCE_DEPOT: "MMS_DEPOT_MASTER",
    _SOURCE_OTH: "MMS_OTH_MASTER",
}


class SearchRegnRequest(BaseModel):
    regn_no: str = Field(..., min_length=1)
    census_no: str | None = None
    prf_code: str | None = None


class RegnRecord(BaseModel):
    id: str | int
    source_table: str
    source_label: str
    eqpt_regn_no: str | None = None
    census_no: str | None = None
    prf_code: str | None = None
    prf_group: str | None = None
    nomenclature: str | None = None
    sus_no: str | None = None
    type_of_hldg: str | None = None
    type_of_hldg_label: str | None = None
    type_of_eqpt: str | None = None
    service_status: str | None = None
    service_status_label: str | None = None
    op_status: str | None = None
    from_sus_no: str | None = None
    to_sus_no: str | None = None
    iv_no: str | None = None
    iv_date: datetime | None = None
    remarks: str | None = None


class OptionOut(BaseModel):
    value: str
    label: str


class OptionsOut(BaseModel):
    service_status: list[OptionOut]


class UpdateRegnRequest(BaseModel):
    id: str | int = Field(...)
    source_table: str = Field(..., min_length=1, max_length=10)
    eqpt_regn_no: str = Field(..., min_length=1, max_length=25)
    service_status: str = Field(..., min_length=1, max_length=10)


class UpdateRegnOut(BaseModel):
    id: str | int
    source_table: str
    updated: bool


class LookupOut(BaseModel):
    eqpt_regn_no: str | None = None
    census_no: str | None = None
    prf_code: str | None = None


def _option_list(session: Session, domain: str) -> list[OptionOut]:
    dname = domain.replace("_", "").upper()
    dnames = [dname]
    if dname in ("SERVICEABLITY", "SERVICEABILITY"):
        dnames = ["SERVICEABLITY", "SERVICEABILITY"]

    in_clause = ", ".join(f":d_{i}" for i in range(len(dnames)))
    params = {f"d_{i}": d for i, d in enumerate(dnames)}

    sql = f"""
        SELECT code_value, label_name
        FROM MMS_DOMAIN_VALUES
        WHERE REPLACE(UPPER(domain_name), '_', '') IN ({in_clause})
        ORDER BY LPAD(NVL(disp_order, '9999'), 10, '0'), label_name
    """
    rows = fetch_all(session, sql, params)
    out: list[OptionOut] = []
    for r in rows:
        val = str(r.get("code_value") or "").strip()
        lbl = str(r.get("label_name") or r.get("code_value") or "").strip()
        if val:
            out.append(OptionOut(value=val, label=lbl))
    return out


def _domain_map(session: Session, domain: str) -> dict[str, str]:
    dname = domain.replace("_", "").upper()
    dnames = [dname]
    if dname in ("SERVICEABLITY", "SERVICEABILITY"):
        dnames = ["SERVICEABLITY", "SERVICEABILITY"]

    in_clause = ", ".join(f":d_{i}" for i in range(len(dnames)))
    params = {f"d_{i}": d for i, d in enumerate(dnames)}

    sql = f"""
        SELECT code_value, label_name, label_short
        FROM MMS_DOMAIN_VALUES
        WHERE REPLACE(UPPER(domain_name), '_', '') IN ({in_clause})
    """
    rows = fetch_all(session, sql, params)
    out: dict[str, str] = {}
    for r in rows:
        code = str(r.get("code_value") or "").strip()
        label = str(r.get("label_name") or r.get("code_value") or "").strip()
        short = str(r.get("label_short") or "").strip()
        if code and label:
            out[code.upper()] = label
        if short and label:
            out[short.upper()] = label
        if label:
            out[label.upper()] = label

    if dname in ("SERVICEABLITY", "SERVICEABILITY"):
        fallbacks = {
            "1": "Serviceable",
            "0": "Unserviceable",
            "A": "Serviceable",
            "SR": "Serviceable",
            "US": "Unserviceable",
            "USR": "Unserviceable",
            "BOH": "BOH",
            "EOA": "EOA",
        }
        for k, v in fallbacks.items():
            if k not in out:
                out[k] = v

    return out


def _holding_type_map(session: Session) -> dict[str, str]:
    sql = """
        SELECT code_value, label_name, label_short
        FROM MMS_DOMAIN_VALUES
        WHERE REPLACE(UPPER(domain_name), '_', '') IN ('TYPEOFHOLDING', 'TYPEHOLDING', 'HOLDINGTYPE')
    """
    rows = fetch_all(session, sql)
    out: dict[str, str] = {
        "WE": "War Equipment",
        "PE": "Peace Equipment",
        "SS": "Sector Stores",
        "LS": "Loan Stores",
        "ACSFP": "ACSFP Stores",
        "A1": "UNIT HOLDING",
        "A2": "SECTOR STORE",
        "A3": "LOAN STORE",
        "A4": "ACSFP STORE",
        "R3": "War Equipment",
    }
    for r in rows:
        code = str(r.get("code_value") or "").strip()
        label = str(r.get("label_name") or r.get("code_value") or "").strip()
        short = str(r.get("label_short") or "").strip()
        if code and label:
            out[code.upper()] = label
        if short and label:
            out[short.upper()] = label

    return out


def _get_prf_group_labels(session: Session, rows: list[dict]) -> dict[tuple[str, str], str]:
    census_nos = {str(r.get("census_no")).strip().upper() for r in rows if r.get("census_no")}
    prf_codes = {str(r.get("prf_code")).strip() for r in rows if r.get("prf_code")}

    census_to_group: dict[str, str] = {}
    if census_nos:
        in_c = ", ".join(f":c_{i}" for i in range(len(census_nos)))
        params_c = {f"c_{i}": c for i, c in enumerate(census_nos)}
        c_rows = fetch_all(
            session,
            f"SELECT UPPER(TRIM(census_no)) as cno, prf_group FROM MMS_MLCCS_EQPT_MASTER WHERE UPPER(TRIM(census_no)) IN ({in_c}) AND prf_group IS NOT NULL",
            params_c,
        )
        for cr in c_rows:
            if cr.get("cno") and cr.get("prf_group"):
                census_to_group[str(cr["cno"]).strip().upper()] = str(cr["prf_group"]).strip()

    prf_to_group: dict[str, str] = {}
    if prf_codes:
        valid_int_codes = [c for c in prf_codes if c.isdigit()]
        if valid_int_codes:
            in_p = ", ".join(f":p_{i}" for i in range(len(valid_int_codes)))
            params_p = {f"p_{i}": int(c) for i, c in enumerate(valid_int_codes)}
            p_rows = fetch_all(
                session,
                f"SELECT prf_code, prf_grp FROM MMS_PRF_GRP_MSTR WHERE prf_code IN ({in_p}) AND prf_grp IS NOT NULL",
                params_p,
            )
            for pr in p_rows:
                if pr.get("prf_code") is not None and pr.get("prf_grp"):
                    prf_to_group[str(pr["prf_code"]).strip()] = str(pr["prf_grp"]).strip()

        in_ps = ", ".join(f":ps_{i}" for i in range(len(prf_codes)))
        params_ps = {f"ps_{i}": c.upper() for i, c in enumerate(prf_codes)}
        ps_rows = fetch_all(
            session,
            f"SELECT UPPER(TRIM(prf_code)) as pcode, prf_group FROM MMS_MLCCS_EQPT_MASTER WHERE UPPER(TRIM(prf_code)) IN ({in_ps}) AND prf_group IS NOT NULL",
            params_ps,
        )
        for ps in ps_rows:
            if ps.get("pcode") and ps.get("prf_group"):
                prf_to_group[str(ps["pcode"]).strip().upper()] = str(ps["prf_group"]).strip()

    out: dict[tuple[str, str], str] = {}
    for r in rows:
        cno = str(r.get("census_no") or "").strip().upper()
        pcode = str(r.get("prf_code") or "").strip()
        grp = census_to_group.get(cno) or prf_to_group.get(pcode.upper()) or prf_to_group.get(pcode) or pcode
        if grp:
            out[(cno, pcode)] = grp

    return out


import re


def _clean_key(val: Any) -> str:
    if val is None:
        return ""
    return re.sub(r"[\s\-]", "", str(val)).upper()


def _get_nomenclatures(session: Session, raw_tuples: list[tuple[str, dict]]) -> dict[tuple[str, str], str]:
    rows = [r for _, r in raw_tuples]
    census_list = [str(r.get("census_no")).strip() for r in rows if r.get("census_no") and str(r.get("census_no")).strip()]
    prf_list = [str(r.get("prf_code")).strip() for r in rows if r.get("prf_code") and str(r.get("prf_code")).strip()]

    census_map: dict[str, str] = {}

    # 1. Look up MMS_MLCCS_EQPT_MASTER by census_no
    if census_list:
        unique_census = list(set(census_list))
        in_c = ", ".join(f":c_{i}" for i in range(len(unique_census)))
        params_c = {f"c_{i}": c.upper() for i, c in enumerate(unique_census)}
        sql_c = f"""
            SELECT census_no, nomen, brief_desc, cat_part_no
            FROM MMS_MLCCS_EQPT_MASTER
            WHERE UPPER(TRIM(census_no)) IN ({in_c})
               OR UPPER(census_no) IN ({in_c})
        """
        c_rows = fetch_all(session, sql_c, params_c)
        for cr in c_rows:
            cno = cr.get("census_no")
            nomen_val = str(cr.get("nomen") or cr.get("brief_desc") or cr.get("cat_part_no") or "").strip()
            if cno and nomen_val:
                ckey = _clean_key(cno)
                if ckey:
                    census_map[ckey] = nomen_val

    # 2. Look up MMS_EP_MASTER by census_no for remaining missing census numbers
    missing_c = [c for c in census_list if _clean_key(c) not in census_map]
    if missing_c:
        unique_ep = list(set(missing_c))
        in_ep = ", ".join(f":ep_{i}" for i in range(len(unique_ep)))
        params_ep = {f"ep_{i}": c.upper() for i, c in enumerate(unique_ep)}
        sql_ep = f"""
            SELECT census_no, brief_description, cat_part_no
            FROM MMS_EP_MASTER
            WHERE UPPER(TRIM(census_no)) IN ({in_ep})
               OR UPPER(census_no) IN ({in_ep})
        """
        ep_rows = fetch_all(session, sql_ep, params_ep)
        for er in ep_rows:
            cno = er.get("census_no")
            nomen_val = str(er.get("brief_description") or er.get("cat_part_no") or "").strip()
            if cno and nomen_val:
                ckey = _clean_key(cno)
                if ckey and ckey not in census_map:
                    census_map[ckey] = nomen_val

    # 3. Secondary lookup by prf_code from MMS_MLCCS_EQPT_MASTER if census_no was not found
    prf_map: dict[str, str] = {}
    if prf_list:
        unique_prf = list(set(prf_list))
        in_p = ", ".join(f":p_{i}" for i in range(len(unique_prf)))
        params_p = {f"p_{i}": p.upper() for i, p in enumerate(unique_prf)}
        sql_p = f"""
            SELECT prf_code, nomen, brief_desc
            FROM MMS_MLCCS_EQPT_MASTER
            WHERE (UPPER(TRIM(prf_code)) IN ({in_p}) OR UPPER(prf_code) IN ({in_p}))
              AND (nomen IS NOT NULL OR brief_desc IS NOT NULL)
        """
        p_rows = fetch_all(session, sql_p, params_p)
        for pr in p_rows:
            pcode = pr.get("prf_code")
            nomen_val = str(pr.get("nomen") or pr.get("brief_desc") or "").strip()
            if pcode and nomen_val:
                pkey = _clean_key(pcode)
                if pkey and pkey not in prf_map:
                    prf_map[pkey] = nomen_val

    out: dict[tuple[str, str], str] = {}
    for source, r in raw_tuples:
        rid = str(r.get("id") or "")
        raw_nomen = str(r.get("nomen") or r.get("nomenclature") or r.get("item_name") or "").strip()
        cno_key = _clean_key(r.get("census_no"))
        pcode_key = _clean_key(r.get("prf_code"))

        if raw_nomen:
            out[(source, rid)] = raw_nomen
        elif cno_key and cno_key in census_map:
            out[(source, rid)] = census_map[cno_key]
        elif pcode_key and pcode_key in prf_map:
            out[(source, rid)] = prf_map[pcode_key]

    return out


def _row_to_record(
    source: str,
    row: dict,
    svc_labels: dict[str, str],
    hldg_labels: dict[str, str],
    prf_groups: dict[tuple[str, str], str],
    nomenclatures: dict[tuple[str, str], str],
) -> RegnRecord:
    svc = str(row.get("service_status") or "").strip()
    hldg = str(row.get("type_of_hldg") or "").strip()
    sus = row.get("sus_no") or row.get("to_sus_no")
    iv_dt = row.get("iv_date")
    cno = str(row.get("census_no") or "").strip().upper()
    pcode = str(row.get("prf_code") or "").strip()
    prf_grp = prf_groups.get((cno, pcode))
    rid = str(row.get("id") or "")
    nomen = nomenclatures.get((source, rid))

    return RegnRecord(
        id=rid,
        source_table=source,
        source_label=_SOURCE_LABEL.get(source, source),
        eqpt_regn_no=row.get("eqpt_regn_no"),
        census_no=row.get("census_no"),
        prf_code=row.get("prf_code"),
        prf_group=prf_grp,
        nomenclature=nomen,
        sus_no=sus,
        type_of_hldg=row.get("type_of_hldg"),
        type_of_hldg_label=hldg_labels.get(hldg.upper(), hldg) if hldg else None,
        type_of_eqpt=row.get("type_of_eqpt"),
        service_status=row.get("service_status"),
        service_status_label=svc_labels.get(svc.upper(), svc) if svc else None,
        op_status=row.get("op_status"),
        from_sus_no=row.get("from_sus_no"),
        to_sus_no=row.get("to_sus_no"),
        iv_no=row.get("iv_no"),
        iv_date=iv_dt if isinstance(iv_dt, datetime) else None,
        remarks=row.get("remarks"),
    )


def _regn_exists_elsewhere(
    session: Session,
    *,
    regn_no: str,
    exclude_id: str,
    exclude_source: str,
) -> bool:
    upper = regn_no.strip().upper()
    for source, table_name in _TABLE_MAP.items():
        sql = f"SELECT id FROM {table_name} WHERE UPPER(eqpt_regn_no) = :rno"
        params: dict = {"rno": upper}
        if source == exclude_source:
            sql += " AND id != :ex_id AND TO_CHAR(id) != :ex_id_str"
            params["ex_id"] = exclude_id
            params["ex_id_str"] = str(exclude_id)
        if fetch_one(session, sql, params) is not None:
            return True
    return False


@router.get("/options", response_model=OptionsOut)
def get_options(session: Session = Depends(get_db_session)) -> OptionsOut:
    opts = _option_list(session, "SERVICEABLITY")
    if not opts:
        opts = [
            OptionOut(value="1", label="Serviceable"),
            OptionOut(value="0", label="Unserviceable"),
            OptionOut(value="SR", label="Serviceable"),
            OptionOut(value="US", label="Unserviceable"),
        ]
    return OptionsOut(service_status=opts)


@router.get("/lookup", response_model=LookupOut)
def lookup_regn(
    regn_no: str,
    session: Session = Depends(get_db_session),
) -> LookupOut:
    upper = regn_no.strip().upper()
    if not upper:
        raise HTTPException(status_code=400, detail="Regn No is required")

    rno_pattern = f"%{upper}%"
    for table_name in _TABLE_MAP.values():
        row = fetch_one(session, f"SELECT eqpt_regn_no, census_no, prf_code FROM {table_name} WHERE UPPER(TRIM(eqpt_regn_no)) LIKE :rno AND ROWNUM = 1", {"rno": rno_pattern})
        if row is not None:
            return LookupOut(
                eqpt_regn_no=row.get("eqpt_regn_no"),
                census_no=row.get("census_no"),
                prf_code=row.get("prf_code"),
            )

    raise HTTPException(
        status_code=404,
        detail=f"No registration found for regn no '{regn_no}'",
    )


@router.post("/search", response_model=list[RegnRecord])
def search_regn(
    body: SearchRegnRequest,
    session: Session = Depends(get_db_session),
) -> list[RegnRecord]:
    svc_labels = _domain_map(session, "SERVICEABLITY")
    hldg_labels = _holding_type_map(session)

    raw_rows: list[tuple[str, dict]] = []
    rno_pattern = f"%{body.regn_no.strip().upper()}%"

    for source, table_name in _TABLE_MAP.items():
        sql = f"SELECT * FROM {table_name} WHERE UPPER(TRIM(eqpt_regn_no)) LIKE :rno"
        params: dict = {"rno": rno_pattern}

        if body.census_no and body.census_no.strip():
            sql += " AND UPPER(TRIM(census_no)) LIKE :cno"
            params["cno"] = f"%{body.census_no.strip().upper()}%"

        if body.prf_code and body.prf_code.strip():
            sql += " AND UPPER(TRIM(prf_code)) LIKE :pcode"
            params["pcode"] = f"%{body.prf_code.strip().upper()}%"

        sql += " ORDER BY eqpt_regn_no"
        rows = fetch_all(session, sql, params)
        for r in rows:
            raw_rows.append((source, r))

    if not raw_rows:
        raise HTTPException(
            status_code=404,
            detail=f"No registration found for regn no '{body.regn_no}'",
        )

    prf_groups = _get_prf_group_labels(session, [r for _, r in raw_rows])
    nomenclatures = _get_nomenclatures(session, raw_rows)

    out: list[RegnRecord] = []
    for source, r in raw_rows:
        out.append(_row_to_record(source, r, svc_labels, hldg_labels, prf_groups, nomenclatures))

    return out


@router.put("/update", response_model=UpdateRegnOut)
def update_regn(
    body: UpdateRegnRequest,
    session: Session = Depends(get_db_session),
) -> UpdateRegnOut:
    source = body.source_table.strip().lower()
    table_name = _TABLE_MAP.get(source)
    if not table_name:
        raise HTTPException(status_code=400, detail=f"Unknown source_table '{source}'")

    row = fetch_one(session, f"SELECT * FROM {table_name} WHERE id = :rid OR TO_CHAR(id) = :rid_str", {"rid": body.id, "rid_str": str(body.id)})
    if row is None:
        raise HTTPException(status_code=404, detail="Equipment record not found")

    new_regn = body.eqpt_regn_no.strip().upper()[:25]
    new_svc = body.service_status.strip().upper()[:10]

    known = {o.value.upper() for o in _option_list(session, "SERVICEABLITY")}
    if known and new_svc not in known:
        raise HTTPException(status_code=400, detail="Invalid Serviceability status")

    current_regn = str(row.get("eqpt_regn_no") or "").strip().upper()
    if new_regn != current_regn and _regn_exists_elsewhere(
        session,
        regn_no=new_regn,
        exclude_id=body.id,
        exclude_source=source,
    ):
        raise HTTPException(
            status_code=409,
            detail=f"Registration No '{new_regn}' already exists",
        )

    execute_sql(
        session,
        f"UPDATE {table_name} SET eqpt_regn_no = :rno, service_status = :ssvc WHERE id = :rid OR TO_CHAR(id) = :rid_str",
        {"rno": new_regn, "ssvc": new_svc, "rid": body.id, "rid_str": str(body.id)},
    )
    return UpdateRegnOut(id=body.id, source_table=source, updated=True)
