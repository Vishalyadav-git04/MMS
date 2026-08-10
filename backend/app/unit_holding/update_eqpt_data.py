"""Update Eqpt Data — Weapon → Unit Holding using Native SQL."""

from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session


def _fmt_date(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()[:10]
    return str(value)

from app.auth.principal import Principal
from app.deps import get_db_session, require_unit_or_admin
from app.db.native_utils import execute_sql, fetch_all, fetch_one

router = APIRouter(
    prefix="/unit-holding/update-eqpt-data",
    tags=["unit-holding: update eqpt data"],
)

_APPROVED_CODES = ("1", "A")

_SOURCE_UNIT = "unit"
_SOURCE_DEPOT = "depot"
_SOURCE_OTH = "oth"

_SOURCE_LABEL = {
    _SOURCE_UNIT: "Unit",
    _SOURCE_DEPOT: "Depot",
    _SOURCE_OTH: "Other",
}

_TABLE_MAP = {
    _SOURCE_UNIT: "MMS_UNIT_MSTR_DETL",
    _SOURCE_DEPOT: "MMS_DEPOT_MASTER",
    _SOURCE_OTH: "MMS_OTH_MASTER",
}


class OptionOut(BaseModel):
    value: str
    label: str


class HoldingUnitOut(BaseModel):
    sus_no: str
    unit_name: str
    display: str


class PrfGroupOut(BaseModel):
    prf_group: str
    prf_codes: list[str] = Field(default_factory=list)


class CensusItemOut(BaseModel):
    census_no: str
    nomenclature: str | None = None


class HoldingTypeOut(BaseModel):
    value: str
    label: str


class SearchIn(BaseModel):
    sus_no: str = Field(..., min_length=1, max_length=50)
    prf_group: str = Field(..., min_length=1, max_length=150)
    census_no: str = Field(..., min_length=1, max_length=9)
    type_of_hldg: str | None = Field(None, max_length=15)
    regd_no: str | None = Field(None, max_length=25)


class EqptRowOut(BaseModel):
    id: str | int
    source_table: str
    source_label: str
    eqpt_regn_no: str | None = None
    sus_no: str | None = None
    unit_name: str | None = None
    prf_group: str | None = None
    prf_code: str | None = None
    census_no: str | None = None
    type_of_hldg: str | None = None
    type_of_hldg_label: str | None = None
    service_status: str | None = None
    service_status_label: str | None = None


class EqptDetailOut(EqptRowOut):
    iv_no: str | None = None
    iv_date: str | None = None
    from_sus_no: str | None = None
    from_unit_name: str | None = None
    material_no: str | None = None
    nomenclature: str | None = None
    type_of_eqpt: str | None = None
    type_of_eqpt_label: str | None = None
    eqpt_make: str | None = None
    eqpt_model: str | None = None
    unit_price: str | None = None
    depres_dur_year: str | None = None
    life_of_asset: str | None = None
    upload_iv: str | None = None
    regn_seq_no: str | None = None
    census_seq_no: str | int | None = None
    barrel1_detl: str | None = None
    barrel2_detl: str | None = None
    barrel3_detl: str | None = None
    barrel4_detl: str | None = None
    spl_remarks: str | None = None
    has_barrels: bool = False


class UpdateIn(BaseModel):
    id: str | int = Field(...)
    source_table: str = Field(..., min_length=1, max_length=10)
    service_status: str = Field(..., min_length=1, max_length=10)
    barrel1_detl: str | None = Field(None, max_length=150)
    barrel2_detl: str | None = Field(None, max_length=150)
    barrel3_detl: str | None = Field(None, max_length=150)
    barrel4_detl: str | None = Field(None, max_length=150)
    spl_remarks: str | None = Field(None, max_length=200)


class UpdateOut(BaseModel):
    id: str | int
    source_table: str
    updated: bool


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
        }
        for k, v in fallbacks.items():
            if k not in out:
                out[k] = v

    return out


def _orbat_name_map(session: Session, sus_nos: set[str]) -> dict[str, str]:
    if not sus_nos:
        return {}
    in_clause = ", ".join(f":s_{i}" for i in range(len(sus_nos)))
    params = {f"s_{i}": s.upper() for i, s in enumerate(sus_nos) if s}
    rows = fetch_all(
        session,
        f"SELECT sus_no, unit_name FROM MMS_ORBAT_UNIT_DETL WHERE UPPER(sus_no) IN ({in_clause}) AND UPPER(status) = 'ACTIVE'",
        params,
    )
    return {
        str(r["sus_no"]).strip().upper(): str(r["unit_name"]).strip()
        for r in rows
        if r.get("sus_no") and r.get("unit_name")
    }


def _nomen_for_census(session: Session, census_nos: set[str]) -> dict[str, str]:
    if not census_nos:
        return {}
    in_clause = ", ".join(f":c_{i}" for i in range(len(census_nos)))
    params = {f"c_{i}": c.upper() for i, c in enumerate(census_nos) if c}
    rows = fetch_all(
        session,
        f"SELECT census_no, nomen FROM MMS_MLCCS_EQUIPMENT_MASTER WHERE UPPER(census_no) IN ({in_clause})",
        params,
    )
    return {
        str(r["census_no"]).strip().upper(): str(r["nomen"]).strip()
        for r in rows
        if r.get("census_no") and r.get("nomen")
    }


def _mlccs_prf_by_census(session: Session, census_nos: set[str]) -> dict[str, str]:
    if not census_nos:
        return {}
    in_clause = ", ".join(f":c_{i}" for i in range(len(census_nos)))
    params = {f"c_{i}": c.upper() for i, c in enumerate(census_nos) if c}
    rows = fetch_all(
        session,
        f"SELECT census_no, prf_group FROM MMS_MLCCS_EQUIPMENT_MASTER WHERE UPPER(census_no) IN ({in_clause}) AND prf_group IS NOT NULL",
        params,
    )
    out: dict[str, str] = {}
    for r in rows:
        if r.get("census_no") and r.get("prf_group"):
            out[str(r["census_no"]).strip().upper()] = str(r["prf_group"]).strip()
    return out


def _prf_grp_mstr_label(session: Session, prf_code: str | None) -> str | None:
    if not prf_code or not str(prf_code).strip().isdigit():
        return None
    row = fetch_one(
        session,
        "SELECT prf_grp FROM MMS_PRF_GRP_MSTR WHERE prf_code = :pcode AND ROWNUM = 1",
        {"pcode": int(str(prf_code).strip())},
    )
    return str(row.get("prf_grp")).strip() if row and row.get("prf_grp") else None


def _prf_group_for_census(
    session: Session,
    census_no: str | None,
    prf_code: str | None = None,
    census_map: dict[str, str] | None = None,
) -> str | None:
    if census_no and str(census_no).strip():
        key = str(census_no).strip().upper()
        mapped = (census_map or {}).get(key)
        if mapped:
            return mapped
        if census_map is None:
            mapped = _mlccs_prf_by_census(session, {key}).get(key)
            if mapped:
                return mapped
    return _prf_grp_mstr_label(session, prf_code)


def _collect_holding_census_rows(
    session: Session, sus: str
) -> list[tuple[str, str | None]]:
    pairs: list[tuple[str, str | None]] = []
    seen: set[str] = set()
    for table_name in _TABLE_MAP.values():
        rows = fetch_all(
            session,
            f"SELECT census_no, prf_code FROM {table_name} WHERE UPPER(to_sus_no) = :sus AND UPPER(TRIM(COALESCE(op_status, ''))) IN ('1', 'A') AND census_no IS NOT NULL",
            {"sus": sus},
        )
        for r in rows:
            c = r.get("census_no")
            if not c or not str(c).strip():
                continue
            key = str(c).strip().upper()
            if key in seen:
                continue
            seen.add(key)
            pairs.append((key, (str(r["prf_code"]).strip() if r.get("prf_code") else None)))
    return pairs


def _census_nos_for_prf_group(session: Session, prf_group: str) -> set[str]:
    rows = fetch_all(
        session,
        "SELECT census_no FROM MMS_MLCCS_EQUIPMENT_MASTER WHERE UPPER(TRIM(prf_group)) = :grp AND census_no IS NOT NULL",
        {"grp": prf_group.strip().upper()},
    )
    return {str(r["census_no"]).strip().upper() for r in rows if r.get("census_no")}


@router.get("/status")
def status() -> dict[str, str]:
    return {"module": "unit-holding", "feature": "update-eqpt-data", "status": "ready"}


@router.get("/options")
def list_options(session: Session = Depends(get_db_session)) -> dict[str, list[OptionOut]]:
    return {"service_status": _option_list(session, "SERVICEABLITY")}


@router.get("/units", response_model=list[HoldingUnitOut])
def search_holding_units(
    q: str = Query(""),
    session: Session = Depends(get_db_session),
) -> list[HoldingUnitOut]:
    sql = """
        SELECT DISTINCT UPPER(TRIM(to_sus_no)) AS sus FROM MMS_UNIT_MSTR_DETL WHERE to_sus_no IS NOT NULL AND UPPER(TRIM(COALESCE(op_status, ''))) IN ('1', 'A')
        UNION
        SELECT DISTINCT UPPER(TRIM(to_sus_no)) AS sus FROM MMS_DEPOT_MASTER WHERE to_sus_no IS NOT NULL AND UPPER(TRIM(COALESCE(op_status, ''))) IN ('1', 'A')
        UNION
        SELECT DISTINCT UPPER(TRIM(to_sus_no)) AS sus FROM MMS_OTH_MASTER WHERE to_sus_no IS NOT NULL AND UPPER(TRIM(COALESCE(op_status, ''))) IN ('1', 'A')
        ORDER BY sus
    """
    rows = fetch_all(session, sql)
    sus_list = [str(r["sus"]).strip() for r in rows if r.get("sus")]
    names = _orbat_name_map(session, set(sus_list))
    term = q.strip().upper()
    out: list[HoldingUnitOut] = []
    for sus in sus_list:
        name = names.get(sus.upper(), "")
        display = f"{sus} - {name}" if name else sus
        if term and term not in display.upper() and term not in sus.upper():
            continue
        out.append(HoldingUnitOut(sus_no=sus, unit_name=name or sus, display=display))
    return out[:80]


@router.get("/prf-groups", response_model=list[PrfGroupOut])
def list_prf_groups(
    sus_no: str = Query(..., min_length=1),
    session: Session = Depends(get_db_session),
) -> list[PrfGroupOut]:
    sus = sus_no.strip().upper()
    pairs = _collect_holding_census_rows(session, sus)
    census_map = _mlccs_prf_by_census(session, {c for c, _ in pairs})
    by_group: dict[str, set[str]] = {}
    for census, prf_code in pairs:
        group = _prf_group_for_census(session, census, prf_code, census_map)
        if not group:
            continue
        by_group.setdefault(group, set())
        if prf_code:
            by_group[group].add(prf_code.upper())
    return [
        PrfGroupOut(prf_group=g, prf_codes=sorted(codes))
        for g, codes in sorted(by_group.items(), key=lambda x: x[0].upper())
    ]


@router.get("/census-items", response_model=list[CensusItemOut])
def list_census_items(
    sus_no: str = Query(..., min_length=1),
    prf_group: str = Query(..., min_length=1),
    session: Session = Depends(get_db_session),
) -> list[CensusItemOut]:
    sus = sus_no.strip().upper()
    pairs = _collect_holding_census_rows(session, sus)
    census_map = _mlccs_prf_by_census(session, {c for c, _ in pairs})
    target = prf_group.strip().upper()
    census: set[str] = set()
    for c, prf_code in pairs:
        group = _prf_group_for_census(session, c, prf_code, census_map)
        if group and group.strip().upper() == target:
            census.add(c)
    mlccs_census = _census_nos_for_prf_group(session, prf_group)
    census |= {c for c, _ in pairs if c in mlccs_census}

    nomens = _nomen_for_census(session, census)
    return [
        CensusItemOut(
            census_no=c,
            nomenclature=nomens.get(c),
        )
        for c in sorted(census)
    ]


@router.get("/holding-types", response_model=list[HoldingTypeOut])
def list_holding_types(
    sus_no: str = Query(..., min_length=1),
    prf_group: str = Query(..., min_length=1),
    census_no: str = Query(..., min_length=1),
    session: Session = Depends(get_db_session),
) -> list[HoldingTypeOut]:
    sus = sus_no.strip().upper()
    census = census_no.strip().upper()
    pairs = _collect_holding_census_rows(session, sus)
    census_map = _mlccs_prf_by_census(session, {c for c, _ in pairs})
    allowed = False
    for c, prf_code in pairs:
        if c != census:
            continue
        group = _prf_group_for_census(session, c, prf_code, census_map)
        if group and group.strip().upper() == prf_group.strip().upper():
            allowed = True
            break
    if not allowed:
        return []

    values: set[str] = set()
    for table_name in _TABLE_MAP.values():
        rows = fetch_all(
            session,
            f"SELECT type_of_hldg FROM {table_name} WHERE UPPER(to_sus_no) = :sus AND UPPER(TRIM(COALESCE(op_status, ''))) IN ('1', 'A') AND UPPER(TRIM(census_no)) = :census AND type_of_hldg IS NOT NULL",
            {"sus": sus, "census": census},
        )
        for r in rows:
            v = r.get("type_of_hldg")
            if v and str(v).strip():
                values.add(str(v).strip())

    labels = _domain_map(session, "TYPE_OF_HOLDING")
    return [
        HoldingTypeOut(
            value=v,
            label=labels.get(v.upper(), v),
        )
        for v in sorted(values, key=lambda x: x.upper())
    ]


def _row_to_out(
    source: str,
    row: dict,
    *,
    unit_name: str | None,
    prf_group: str | None,
    hldg_labels: dict[str, str],
    svc_labels: dict[str, str],
) -> EqptRowOut:
    hldg = str(row.get("type_of_hldg") or "").strip() or None
    svc = str(row.get("service_status") or "").strip() or None
    return EqptRowOut(
        id=str(row["id"]),
        source_table=source,
        source_label=_SOURCE_LABEL.get(source, source),
        eqpt_regn_no=row.get("eqpt_regn_no"),
        sus_no=row.get("to_sus_no"),
        unit_name=unit_name,
        prf_group=prf_group,
        prf_code=row.get("prf_code"),
        census_no=row.get("census_no"),
        type_of_hldg=hldg,
        type_of_hldg_label=hldg_labels.get(hldg.upper(), hldg) if hldg else None,
        service_status=svc,
        service_status_label=svc_labels.get(svc.upper(), svc) if svc else None,
    )


@router.post("/search", response_model=list[EqptRowOut])
def search_eqpt(
    body: SearchIn,
    session: Session = Depends(get_db_session),
    _: Principal = Depends(require_unit_or_admin),
) -> list[EqptRowOut]:
    sus = body.sus_no.strip().upper()
    census = body.census_no.strip().upper()
    hldg_raw = (body.type_of_hldg or "").strip().upper()
    is_all_hldg = not hldg_raw or hldg_raw in ("ALL", "ALL HOLDINGS")
    hldg = None if is_all_hldg else hldg_raw
    prf_group = body.prf_group.strip()

    pairs = _collect_holding_census_rows(session, sus)
    census_map = _mlccs_prf_by_census(session, {c for c, _ in pairs})
    matched_group = None
    for c, prf_code in pairs:
        if c != census:
            continue
        matched_group = _prf_group_for_census(session, c, prf_code, census_map)
        break
    if not matched_group or matched_group.strip().upper() != prf_group.upper():
        return []

    names = _orbat_name_map(session, {sus})
    unit_name = names.get(sus)
    hldg_labels = _domain_map(session, "TYPE_OF_HOLDING")
    svc_labels = _domain_map(session, "SERVICEABLITY")

    regd = (body.regd_no or "").strip().upper()
    out: list[EqptRowOut] = []

    for source, table_name in _TABLE_MAP.items():
        sql = f"""
            SELECT * FROM {table_name}
            WHERE UPPER(to_sus_no) = :sus
            AND UPPER(TRIM(COALESCE(op_status, ''))) IN ('1', 'A')
            AND UPPER(TRIM(census_no)) = :census
        """
        params: dict = {"sus": sus, "census": census}
        if hldg:
            sql += " AND UPPER(TRIM(type_of_hldg)) = :hldg"
            params["hldg"] = hldg
        if regd:
            sql += " AND UPPER(TRIM(eqpt_regn_no)) LIKE :regd"
            params["regd"] = f"%{regd}%"

        sql += " ORDER BY eqpt_regn_no"
        rows = fetch_all(session, sql, params)
        for r in rows:
            out.append(
                _row_to_out(
                    source,
                    r,
                    unit_name=unit_name,
                    prf_group=prf_group,
                    hldg_labels=hldg_labels,
                    svc_labels=svc_labels,
                )
            )
    return out


@router.get("/detail", response_model=EqptDetailOut)
def get_eqpt_detail(
    id: str = Query(..., min_length=1),
    source_table: str = Query(..., min_length=1),
    session: Session = Depends(get_db_session),
    _: Principal = Depends(require_unit_or_admin),
) -> EqptDetailOut:
    source = source_table.strip().lower()
    table_name = _TABLE_MAP.get(source)
    if not table_name:
        raise HTTPException(status_code=400, detail=f"Unknown source_table '{source}'")

    rid_str = str(id).strip()
    if rid_str.isdigit():
        row = fetch_one(
            session,
            f"SELECT * FROM {table_name} WHERE id = :rid_num OR TO_CHAR(id) = :rid_str",
            {"rid_num": int(rid_str), "rid_str": rid_str},
        )
    else:
        row = fetch_one(
            session,
            f"SELECT * FROM {table_name} WHERE TO_CHAR(id) = :rid_str",
            {"rid_str": rid_str},
        )
    if row is None:
        raise HTTPException(status_code=404, detail="Equipment record not found")

    sus = str(row.get("to_sus_no") or "").strip().upper()
    from_sus = str(row.get("from_sus_no") or "").strip().upper()
    census_no = str(row.get("census_no") or "").strip().upper()

    sus_set = {s for s in (sus, from_sus) if s}
    names = _orbat_name_map(session, sus_set)
    nomen_map = _nomen_for_census(session, {census_no} if census_no else set())

    prf_group = _prf_group_for_census(session, row.get("census_no"), row.get("prf_code"))
    hldg_labels = _domain_map(session, "TYPE_OF_HOLDING")
    eqpt_labels = _domain_map(session, "TYPE_OF_EQPT")
    svc_labels = _domain_map(session, "SERVICEABLITY")

    base = _row_to_out(
        source,
        row,
        unit_name=names.get(sus),
        prf_group=prf_group,
        hldg_labels=hldg_labels,
        svc_labels=svc_labels,
    )
    has_barrels = source in (_SOURCE_UNIT, _SOURCE_DEPOT)
    type_of_eqpt = str(row.get("type_of_eqpt") or "").strip() or None

    return EqptDetailOut(
        **base.model_dump(),
        iv_no=row.get("iv_no"),
        iv_date=_fmt_date(row.get("iv_date")),
        from_sus_no=row.get("from_sus_no"),
        from_unit_name=names.get(from_sus),
        material_no=row.get("material_no"),
        nomenclature=nomen_map.get(census_no),
        type_of_eqpt=type_of_eqpt,
        type_of_eqpt_label=eqpt_labels.get(type_of_eqpt.upper(), type_of_eqpt) if type_of_eqpt else None,
        eqpt_make=row.get("eqpt_make"),
        eqpt_model=row.get("eqpt_model"),
        unit_price=str(row.get("unit_price")) if row.get("unit_price") is not None else None,
        depres_dur_year=str(row.get("depres_dur_year")) if row.get("depres_dur_year") is not None else None,
        life_of_asset=str(row.get("life_of_asset")) if row.get("life_of_asset") is not None else None,
        upload_iv=row.get("upload_iv"),
        regn_seq_no=row.get("regn_seq_no"),
        census_seq_no=row.get("census_seq_no"),
        barrel1_detl=row.get("barrel1_detl") if has_barrels else None,
        barrel2_detl=row.get("barrel2_detl") if has_barrels else None,
        barrel3_detl=row.get("barrel3_detl") if has_barrels else None,
        barrel4_detl=row.get("barrel4_detl") if has_barrels else None,
        spl_remarks=row.get("spl_remarks"),
        has_barrels=has_barrels,
    )


@router.put("/update", response_model=UpdateOut)
def update_eqpt(
    body: UpdateIn,
    session: Session = Depends(get_db_session),
    _: Principal = Depends(require_unit_or_admin),
) -> UpdateOut:
    source = body.source_table.strip().lower()
    table_name = _TABLE_MAP.get(source)
    if not table_name:
        raise HTTPException(status_code=400, detail=f"Unknown source_table '{source}'")

    row = fetch_one(session, f"SELECT op_status FROM {table_name} WHERE id = :rid OR TO_CHAR(id) = :rid_str", {"rid": body.id, "rid_str": body.id})
    if row is None:
        raise HTTPException(status_code=404, detail="Equipment record not found")

    known = {o.value.upper() for o in _option_list(session, "SERVICEABLITY")}
    if known and body.service_status.strip().upper() not in known:
        raise HTTPException(status_code=400, detail="Invalid Serviceability status")

    op = str(row.get("op_status") or "").strip().upper()
    if op not in _APPROVED_CODES:
        raise HTTPException(
            status_code=400,
            detail="Only approved holdings can be updated",
        )

    params: dict = {
        "ssvc": body.service_status.strip().upper()[:10],
        "spl_rem": body.spl_remarks.strip()[:200] if body.spl_remarks and body.spl_remarks.strip() else None,
        "rid": body.id,
        "rid_str": body.id,
    }
    update_sql = f"UPDATE {table_name} SET service_status = :ssvc, spl_remarks = :spl_rem"

    if source in (_SOURCE_UNIT, _SOURCE_DEPOT):
        update_sql += ", barrel1_detl = :b1, barrel2_detl = :b2, barrel3_detl = :b3, barrel4_detl = :b4"
        params.update({
            "b1": body.barrel1_detl.strip()[:150] if body.barrel1_detl and body.barrel1_detl.strip() else None,
            "b2": body.barrel2_detl.strip()[:150] if body.barrel2_detl and body.barrel2_detl.strip() else None,
            "b3": body.barrel3_detl.strip()[:150] if body.barrel3_detl and body.barrel3_detl.strip() else None,
            "b4": body.barrel4_detl.strip()[:150] if body.barrel4_detl and body.barrel4_detl.strip() else None,
        })

    update_sql += " WHERE id = :rid OR TO_CHAR(id) = :rid_str"
    execute_sql(session, update_sql, params)

    return UpdateOut(id=body.id, source_table=source, updated=True)
