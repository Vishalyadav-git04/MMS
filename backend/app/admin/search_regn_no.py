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
    _SOURCE_UNIT: "MMS_UNIT_MSTR_DETL",
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
    sus_no: str | None = None
    type_of_hldg: str | None = None
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
        }
        for k, v in fallbacks.items():
            if k not in out:
                out[k] = v

    return out


def _row_to_record(
    source: str,
    row: dict,
    svc_labels: dict[str, str],
) -> RegnRecord:
    svc = str(row.get("service_status") or "").strip()
    sus = row.get("sus_no") or row.get("to_sus_no")
    iv_dt = row.get("iv_date")
    return RegnRecord(
        id=str(row.get("id") or ""),
        source_table=source,
        source_label=_SOURCE_LABEL.get(source, source),
        eqpt_regn_no=row.get("eqpt_regn_no"),
        census_no=row.get("census_no"),
        prf_code=row.get("prf_code"),
        sus_no=sus,
        type_of_hldg=row.get("type_of_hldg"),
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

    for table_name in _TABLE_MAP.values():
        row = fetch_one(session, f"SELECT eqpt_regn_no, census_no, prf_code FROM {table_name} WHERE UPPER(eqpt_regn_no) = :rno AND ROWNUM = 1", {"rno": upper})
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
    out: list[RegnRecord] = []

    for source, table_name in _TABLE_MAP.items():
        sql = f"SELECT * FROM {table_name} WHERE UPPER(eqpt_regn_no) = :rno"
        params: dict = {"rno": body.regn_no.strip().upper()}

        if body.census_no and body.census_no.strip():
            sql += " AND UPPER(census_no) = :cno"
            params["cno"] = body.census_no.strip().upper()

        if body.prf_code and body.prf_code.strip():
            sql += " AND UPPER(prf_code) = :pcode"
            params["pcode"] = body.prf_code.strip().upper()

        sql += " ORDER BY eqpt_regn_no"
        rows = fetch_all(session, sql, params)
        for r in rows:
            out.append(_row_to_record(source, r, svc_labels))

    if not out:
        raise HTTPException(
            status_code=404,
            detail=f"No registration found for regn no '{body.regn_no}'",
        )
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
