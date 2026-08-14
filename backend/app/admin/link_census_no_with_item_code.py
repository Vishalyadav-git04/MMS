"""Link Census No with Item Code — update ITEM_CODE on MMS_MLCCS_EQPT_MASTER using Native SQL."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.deps import get_db_session, get_principal
from app.auth.principal import Principal
from app.db.native_utils import execute_sql, fetch_all, fetch_one

router = APIRouter(
    prefix="/admin/link-census-no-with-item-code",
    tags=["admin: link census no with item code"],
)


class LinkRequest(BaseModel):
    census_no: str = Field(..., min_length=1)
    item_code: str = Field(..., min_length=1)


class LinkResult(BaseModel):
    id: str | int
    census_no: str | None
    nomenclature: str | None
    item_code: str | None
    cat_part_no: str | None = None
    prf_group: str | None = None
    cos_section: str | None = None


class CensusSuggestion(BaseModel):
    census_no: str
    nomenclature: str | None = None
    cat_part_no: str | None = None
    prf_group: str | None = None
    item_code: str | None = None
    cos_section: str | None = None


class OptionItem(BaseModel):
    value: str
    label: str


def _to_result(row: dict) -> LinkResult:
    return LinkResult(
        id=str(row.get("id") or ""),
        census_no=row.get("census_no"),
        nomenclature=row.get("nomen"),
        item_code=row.get("item_code"),
        cat_part_no=row.get("cat_part_no"),
        prf_group=row.get("prf_group"),
        cos_section=row.get("cos_sec"),
    )


@router.get("/suggest-census", response_model=list[CensusSuggestion])
def suggest_census(
    q: str = Query(""),
    session: Session = Depends(get_db_session),
) -> list[CensusSuggestion]:
    term = q.strip().upper()
    sql = "SELECT census_no, nomen, cat_part_no, prf_group, item_code, cos_sec FROM MMS_MLCCS_EQPT_MASTER WHERE census_no IS NOT NULL"
    params: dict = {}
    if term:
        sql += " AND (UPPER(census_no) LIKE :term OR UPPER(COALESCE(nomen, '')) LIKE :term)"
        params["term"] = f"%{term}%"

    sql += " ORDER BY census_no"
    rows = fetch_all(session, sql, params)[:50]
    return [
        CensusSuggestion(
            census_no=str(r["census_no"]),
            nomenclature=r.get("nomen"),
            cat_part_no=r.get("cat_part_no"),
            prf_group=r.get("prf_group"),
            item_code=r.get("item_code"),
            cos_section=r.get("cos_sec"),
        )
        for r in rows
        if r.get("census_no")
    ]


@router.get("/item-codes", response_model=list[OptionItem])
def list_item_codes(
    prf_group: str = Query(..., min_length=1),
    cos_section: str | None = Query(None),
    session: Session = Depends(get_db_session),
) -> list[OptionItem]:
    grp = prf_group.strip()
    if not grp:
        raise HTTPException(status_code=400, detail="prf_group is required")

    sql = "SELECT DISTINCT item_code, item_name FROM MMS_PRF_GRP_MSTR WHERE UPPER(prf_grp) = :grp"
    params: dict = {"grp": grp.upper()}

    cos = (cos_section or "").strip().upper()
    if cos:
        sql += " AND UPPER(cos_sec) = :cos"
        params["cos"] = cos

    sql += " ORDER BY item_code"
    rows = fetch_all(session, sql, params)

    out: list[OptionItem] = []
    seen: set[str] = set()
    for r in rows:
        if r.get("item_code") is None:
            continue
        code = str(r["item_code"])
        if code in seen:
            continue
        seen.add(code)
        name = str(r.get("item_name") or "").strip()
        label = f"{code} — {name}" if name else code
        out.append(OptionItem(value=code, label=label))
    return out


@router.post("/link", response_model=LinkResult)
def link_item_code(
    body: LinkRequest,
    session: Session = Depends(get_db_session),
    principal: Principal = Depends(get_principal),
) -> LinkResult:
    row = fetch_one(
        session,
        "SELECT * FROM MMS_MLCCS_EQPT_MASTER WHERE UPPER(census_no) = :key",
        {"key": body.census_no.strip().upper()},
    )
    if row is None:
        raise HTTPException(
            status_code=404,
            detail=f"No MLCCS record for census no '{body.census_no}'",
        )

    rec_id = str(row["id"])
    execute_sql(
        session,
        "UPDATE MMS_MLCCS_EQPT_MASTER SET item_code = :icode, data_upd_by = :upd_by, data_upd_date = :upd_dt WHERE id = :rid OR TO_CHAR(id) = :rid_str",
        {
            "icode": body.item_code.strip(),
            "upd_by": principal.username,
            "upd_dt": datetime.now(),
            "rid": rec_id,
            "rid_str": rec_id,
        },
    )
    updated_row = fetch_one(session, "SELECT * FROM MMS_MLCCS_EQPT_MASTER WHERE id = :rid OR TO_CHAR(id) = :rid_str", {"rid": rec_id, "rid_str": rec_id})
    return _to_result(updated_row or {})


@router.get("/lookup/{census_no}", response_model=LinkResult)
def lookup_by_census(
    census_no: str,
    session: Session = Depends(get_db_session),
) -> LinkResult:
    row = fetch_one(
        session,
        "SELECT * FROM MMS_MLCCS_EQPT_MASTER WHERE UPPER(census_no) = :key",
        {"key": census_no.strip().upper()},
    )
    if row is None:
        raise HTTPException(status_code=404, detail=f"No MLCCS record for '{census_no}'")
    return _to_result(row)
