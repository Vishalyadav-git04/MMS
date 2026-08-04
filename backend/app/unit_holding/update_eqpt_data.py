"""Update Eqpt Data — Weapon → Unit Holding.

Cascade: Unit (TO_SUS_NO × 3 holding tables → ORBAT name) →
PRF Group (holding CENSUS_NO → MLCCS.PRF_GROUP) → Census → Type of Holding →
search approved rows → update SERVICE_STATUS / barrels / SPL_REMARKS.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select, union
from sqlalchemy.orm import Session

from app.auth.principal import Principal
from app.deps import get_db_session, require_unit_or_admin
from app.models import (
    DepotMaster,
    DomainValue,
    MlccsEquipmentMaster,
    OrbatUnitDetl,
    OthMaster,
    PrfGrpMstr,
    UnitMasterDetail,
)

router = APIRouter(
    prefix="/unit-holding/update-eqpt-data",
    tags=["unit-holding: update eqpt data"],
)

# Approved holdings only (same codes as Approve New Eqpt).
_APPROVED_CODES = ("1", "A")

_SOURCE_UNIT = "unit"
_SOURCE_DEPOT = "depot"
_SOURCE_OTH = "oth"

_SOURCE_LABEL = {
    _SOURCE_UNIT: "Unit",
    _SOURCE_DEPOT: "Depot",
    _SOURCE_OTH: "Other",
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
    type_of_hldg: str = Field(..., min_length=1, max_length=15)
    regd_no: str | None = Field(None, max_length=25)


class EqptRowOut(BaseModel):
    id: str
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
    barrel1_detl: str | None = None
    barrel2_detl: str | None = None
    barrel3_detl: str | None = None
    barrel4_detl: str | None = None
    spl_remarks: str | None = None
    has_barrels: bool = False


class UpdateIn(BaseModel):
    id: str = Field(..., min_length=1, max_length=36)
    source_table: str = Field(..., min_length=1, max_length=10)
    service_status: str = Field(..., min_length=1, max_length=10)
    barrel1_detl: str | None = Field(None, max_length=150)
    barrel2_detl: str | None = Field(None, max_length=150)
    barrel3_detl: str | None = Field(None, max_length=150)
    barrel4_detl: str | None = Field(None, max_length=150)
    spl_remarks: str | None = Field(None, max_length=200)


class UpdateOut(BaseModel):
    id: str
    source_table: str
    updated: bool


def _option_list(session: Session, domain: str) -> list[OptionOut]:
    rows = session.scalars(
        select(DomainValue)
        .where(func.upper(DomainValue.domain_name) == domain.upper())
        .order_by(
            func.lpad(func.nvl(DomainValue.disp_order, "9999"), 10, "0"),
            DomainValue.label_name,
        )
    ).all()
    return [
        OptionOut(value=r.code_value or "", label=r.label_name or r.code_value or "")
        for r in rows
        if r.code_value
    ]


def _domain_map(session: Session, domain: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for opt in _option_list(session, domain):
        out[opt.value.strip().upper()] = opt.label
    return out


def _approved(col: Any):
    return func.upper(func.coalesce(col, "")).in_(_APPROVED_CODES)


def _model_for_source(source: str) -> type[Any]:
    if source == _SOURCE_UNIT:
        return UnitMasterDetail
    if source == _SOURCE_DEPOT:
        return DepotMaster
    if source == _SOURCE_OTH:
        return OthMaster
    raise HTTPException(status_code=400, detail=f"Unknown source_table '{source}'")


def _orbat_name_map(session: Session, sus_nos: set[str]) -> dict[str, str]:
    if not sus_nos:
        return {}
    upper = {s.upper() for s in sus_nos if s}
    rows = session.execute(
        select(OrbatUnitDetl.sus_no, OrbatUnitDetl.unit_name).where(
            func.upper(OrbatUnitDetl.sus_no).in_(upper),
            func.upper(OrbatUnitDetl.status) == "ACTIVE",
        )
    ).all()
    return {
        str(sus).strip().upper(): str(name).strip()
        for sus, name in rows
        if sus and name
    }


def _nomen_for_census(session: Session, census_nos: set[str]) -> dict[str, str]:
    if not census_nos:
        return {}
    upper = {c.upper() for c in census_nos if c}
    rows = session.execute(
        select(MlccsEquipmentMaster.census_no, MlccsEquipmentMaster.nomen).where(
            func.upper(MlccsEquipmentMaster.census_no).in_(upper)
        )
    ).all()
    return {
        str(c).strip().upper(): str(n).strip()
        for c, n in rows
        if c and n
    }


def _mlccs_prf_by_census(session: Session, census_nos: set[str]) -> dict[str, str]:
    """Map CENSUS_NO → PRF_GROUP via MLCCS (authoritative for held equipment)."""
    if not census_nos:
        return {}
    upper = {c.upper() for c in census_nos if c}
    rows = session.execute(
        select(MlccsEquipmentMaster.census_no, MlccsEquipmentMaster.prf_group).where(
            func.upper(MlccsEquipmentMaster.census_no).in_(upper),
            MlccsEquipmentMaster.prf_group.is_not(None),
        )
    ).all()
    out: dict[str, str] = {}
    for census, group in rows:
        if census and group:
            out[str(census).strip().upper()] = str(group).strip()
    return out


def _prf_grp_mstr_label(session: Session, prf_code: str | None) -> str | None:
    """Fallback when census is missing from MLCCS — numeric PRF_CODE → PRF_GRP."""
    if not prf_code or not str(prf_code).strip().isdigit():
        return None
    row = session.scalar(
        select(PrfGrpMstr.prf_grp).where(PrfGrpMstr.prf_code == int(str(prf_code).strip()))
    )
    return str(row).strip() if row else None


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
    """Approved holding (census_no, prf_code) pairs for a TO_SUS_NO."""
    pairs: list[tuple[str, str | None]] = []
    seen: set[str] = set()
    for model in (UnitMasterDetail, DepotMaster, OthMaster):
        rows = session.execute(
            select(model.census_no, model.prf_code).where(
                func.upper(model.to_sus_no) == sus,
                _approved(model.op_status),
                model.census_no.is_not(None),
            )
        ).all()
        for census, prf_code in rows:
            if not census or not str(census).strip():
                continue
            key = str(census).strip().upper()
            if key in seen:
                continue
            seen.add(key)
            pairs.append((key, (str(prf_code).strip() if prf_code else None)))
    return pairs


def _census_nos_for_prf_group(session: Session, prf_group: str) -> set[str]:
    rows = session.scalars(
        select(MlccsEquipmentMaster.census_no).where(
            func.upper(func.trim(MlccsEquipmentMaster.prf_group))
            == prf_group.strip().upper(),
            MlccsEquipmentMaster.census_no.is_not(None),
        )
    ).all()
    return {str(c).strip().upper() for c in rows if c and str(c).strip()}


def _holding_base(model: type[Any], sus: str) -> list[Any]:
    return [
        func.upper(model.to_sus_no) == sus,
        _approved(model.op_status),
    ]


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
    """Distinct TO_SUS_NO from approved holdings, named via ORBAT."""
    parts = [
        select(func.upper(func.trim(UnitMasterDetail.to_sus_no)).label("sus")).where(
            UnitMasterDetail.to_sus_no.is_not(None),
            _approved(UnitMasterDetail.op_status),
        ),
        select(func.upper(func.trim(DepotMaster.to_sus_no)).label("sus")).where(
            DepotMaster.to_sus_no.is_not(None),
            _approved(DepotMaster.op_status),
        ),
        select(func.upper(func.trim(OthMaster.to_sus_no)).label("sus")).where(
            OthMaster.to_sus_no.is_not(None),
            _approved(OthMaster.op_status),
        ),
    ]
    sub = union(*parts).subquery()
    sus_list = [
        str(r[0]).strip()
        for r in session.execute(select(sub.c.sus).order_by(sub.c.sus)).all()
        if r[0]
    ]
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
    # Also keep MLCCS census under this group that appear on holdings
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
    # Ensure selected census belongs to this unit + PRF group
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
    for model in (UnitMasterDetail, DepotMaster, OthMaster):
        rows = session.scalars(
            select(model.type_of_hldg).where(
                *_holding_base(model, sus),
                func.upper(func.trim(model.census_no)) == census,
                model.type_of_hldg.is_not(None),
            )
        ).all()
        for v in rows:
            if v and str(v).strip():
                values.add(str(v).strip())

    labels = _domain_map(session, "TYPE_OF_HLDG")
    return [
        HoldingTypeOut(
            value=v,
            label=labels.get(v.upper(), v),
        )
        for v in sorted(values, key=lambda x: x.upper())
    ]


def _row_to_out(
    source: str,
    row: Any,
    *,
    unit_name: str | None,
    prf_group: str | None,
    hldg_labels: dict[str, str],
    svc_labels: dict[str, str],
) -> EqptRowOut:
    hldg = (row.type_of_hldg or "").strip() or None
    svc = (row.service_status or "").strip() or None
    return EqptRowOut(
        id=str(row.id),
        source_table=source,
        source_label=_SOURCE_LABEL.get(source, source),
        eqpt_regn_no=(row.eqpt_regn_no or None),
        sus_no=(row.to_sus_no or None),
        unit_name=unit_name,
        prf_group=prf_group,
        prf_code=(row.prf_code or None),
        census_no=(row.census_no or None),
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
    hldg = body.type_of_hldg.strip().upper()
    prf_group = body.prf_group.strip()

    # Validate census belongs to this unit under the selected PRF group.
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
    hldg_labels = _domain_map(session, "TYPE_OF_HLDG")
    svc_labels = _domain_map(session, "SERVICEABLITY")

    regd = (body.regd_no or "").strip().upper()
    out: list[EqptRowOut] = []

    for source, model in (
        (_SOURCE_UNIT, UnitMasterDetail),
        (_SOURCE_DEPOT, DepotMaster),
        (_SOURCE_OTH, OthMaster),
    ):
        stmt = select(model).where(
            *_holding_base(model, sus),
            func.upper(func.trim(model.census_no)) == census,
            func.upper(func.trim(model.type_of_hldg)) == hldg,
        )
        if regd:
            stmt = stmt.where(func.upper(model.eqpt_regn_no).like(f"%{regd}%"))
        for row in session.scalars(stmt.order_by(model.eqpt_regn_no)).all():
            out.append(
                _row_to_out(
                    source,
                    row,
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
    model = _model_for_source(source_table.strip().lower())
    row = session.get(model, id)
    if row is None:
        raise HTTPException(status_code=404, detail="Equipment record not found")

    sus = (row.to_sus_no or "").strip().upper()
    names = _orbat_name_map(session, {sus} if sus else set())
    prf_group = _prf_group_for_census(session, row.census_no, row.prf_code)
    hldg_labels = _domain_map(session, "TYPE_OF_HLDG")
    svc_labels = _domain_map(session, "SERVICEABLITY")
    base = _row_to_out(
        source_table.strip().lower(),
        row,
        unit_name=names.get(sus),
        prf_group=prf_group,
        hldg_labels=hldg_labels,
        svc_labels=svc_labels,
    )
    has_barrels = source_table.strip().lower() in (_SOURCE_UNIT, _SOURCE_DEPOT)
    return EqptDetailOut(
        **base.model_dump(),
        barrel1_detl=getattr(row, "barrel1_detl", None) if has_barrels else None,
        barrel2_detl=getattr(row, "barrel2_detl", None) if has_barrels else None,
        barrel3_detl=getattr(row, "barrel3_detl", None) if has_barrels else None,
        barrel4_detl=getattr(row, "barrel4_detl", None) if has_barrels else None,
        spl_remarks=row.spl_remarks,
        has_barrels=has_barrels,
    )


@router.put("/update", response_model=UpdateOut)
def update_eqpt(
    body: UpdateIn,
    session: Session = Depends(get_db_session),
    _: Principal = Depends(require_unit_or_admin),
) -> UpdateOut:
    source = body.source_table.strip().lower()
    model = _model_for_source(source)
    row = session.get(model, body.id)
    if row is None:
        raise HTTPException(status_code=404, detail="Equipment record not found")

    known = {o.value.upper() for o in _option_list(session, "SERVICEABLITY")}
    if known and body.service_status.strip().upper() not in known:
        raise HTTPException(status_code=400, detail="Invalid Serviceability status")

    # Only approved holdings may be updated here.
    op = (row.op_status or "").strip().upper()
    if op not in _APPROVED_CODES:
        raise HTTPException(
            status_code=400,
            detail="Only approved holdings can be updated",
        )

    row.service_status = body.service_status.strip().upper()[:10]
    if body.spl_remarks is not None:
        row.spl_remarks = body.spl_remarks.strip()[:200] or None

    if source in (_SOURCE_UNIT, _SOURCE_DEPOT):
        row.barrel1_detl = (
            body.barrel1_detl.strip()[:150] if body.barrel1_detl and body.barrel1_detl.strip() else None
        )
        row.barrel2_detl = (
            body.barrel2_detl.strip()[:150] if body.barrel2_detl and body.barrel2_detl.strip() else None
        )
        row.barrel3_detl = (
            body.barrel3_detl.strip()[:150] if body.barrel3_detl and body.barrel3_detl.strip() else None
        )
        row.barrel4_detl = (
            body.barrel4_detl.strip()[:150] if body.barrel4_detl and body.barrel4_detl.strip() else None
        )

    session.commit()
    return UpdateOut(id=body.id, source_table=source, updated=True)
