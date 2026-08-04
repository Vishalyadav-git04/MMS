"""EQPT Transfer (Depot to Depot) — Weapon → EQPT Transfer.

Queries and updates MMS_DEPOT_MASTER table.
Maps units with MMS_ORBAT_UNIT_DETL and domain codes with MMS_DOMAIN_VALUES.
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import String, func, or_, select
from sqlalchemy.orm import Session

from app.deps import get_db_session
from app.models import (
    DepotMaster,
    DomainValue,
    MlccsEquipmentMaster,
    OrbatUnitDetl,
    PrfGrpMstr,
    UnitMasterDetail,
)

router = APIRouter(
    prefix="/transfer/depot-to-depot",
    tags=["transfer: depot to depot"],
)


def _get_approved_op_codes(session: Session) -> list[str]:
    """Retrieve OPSTATUS approved code values from MMS_DOMAIN_VALUES."""
    codes = session.scalars(
        select(DomainValue.code_value).where(
            func.replace(func.upper(DomainValue.domain_name), "_", "") == "OPSTATUS",
            or_(
                func.upper(func.trim(DomainValue.code_value)).in_(["1", "A", "APPROVED"]),
                func.upper(DomainValue.label_name).like("%APPROV%"),
            ),
        )
    ).all()
    clean = [c.strip().upper() for c in codes if c and c.strip()]
    fallbacks = ["1", "A", "APPROVED"]
    return list(set(clean + fallbacks))


def _get_tfr_status_code(session: Session) -> str:
    """Retrieve TFRSTATUS code value for transferred equipment."""
    code = session.scalar(
        select(DomainValue.code_value).where(
            func.replace(func.upper(DomainValue.domain_name), "_", "") == "TFRSTATUS",
            or_(
                func.upper(DomainValue.label_name).like("%TRANSFER%"),
                func.upper(DomainValue.code_value).like("%TRANS%"),
                func.upper(DomainValue.code_value).like("%TFR%"),
            ),
        ).limit(1)
    )
    if not code:
        code = session.scalar(
            select(DomainValue.code_value).where(
                func.replace(func.upper(DomainValue.domain_name), "_", "") == "TFRSTATUS"
            ).limit(1)
        )
    return (code or "TRANSFERRED").strip()


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
    """Get distinct parent depots from MMS_DEPOT_MASTER (and MMS_UNIT_MSTR_DETL) mapped with ORBAT."""
    approved_codes = _get_approved_op_codes(session)
    
    # Query from MMS_DEPOT_MASTER primarily
    depot_suses = session.scalars(
        select(func.distinct(DepotMaster.to_sus_no)).where(
            DepotMaster.to_sus_no.is_not(None),
            func.upper(func.trim(func.coalesce(DepotMaster.op_status, ""))).in_(approved_codes),
        )
    ).all()
    
    # Also check MMS_UNIT_MSTR_DETL as secondary source
    unit_suses = session.scalars(
        select(func.distinct(UnitMasterDetail.to_sus_no)).where(
            UnitMasterDetail.to_sus_no.is_not(None),
            func.upper(func.trim(func.coalesce(UnitMasterDetail.op_status, ""))).in_(approved_codes),
        )
    ).all()

    all_suses = list(depot_suses) + list(unit_suses)
    clean_suses = [s.strip().upper() for s in all_suses if s and s.strip()]
    if not clean_suses:
        return []

    orbat_map = {}
    orbat_rows = session.scalars(
        select(OrbatUnitDetl).where(
            func.upper(OrbatUnitDetl.sus_no).in_(clean_suses)
        )
    ).all()
    for row in orbat_rows:
        orbat_map[row.sus_no.strip().upper()] = row.unit_name.strip()

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
    """Get distinct holding types for the selected parent depot from MMS_DEPOT_MASTER."""
    approved_codes = _get_approved_op_codes(session)
    sus = parent_sus_no.strip().upper()
    
    distinct_types = session.scalars(
        select(func.distinct(DepotMaster.type_of_hldg)).where(
            func.upper(DepotMaster.to_sus_no) == sus,
            DepotMaster.type_of_hldg.is_not(None),
            func.upper(func.trim(func.coalesce(DepotMaster.op_status, ""))).in_(approved_codes),
        )
    ).all()
    
    if not distinct_types:
        distinct_types = session.scalars(
            select(func.distinct(UnitMasterDetail.type_of_hldg)).where(
                func.upper(UnitMasterDetail.to_sus_no) == sus,
                UnitMasterDetail.type_of_hldg.is_not(None),
                func.upper(func.trim(func.coalesce(UnitMasterDetail.op_status, ""))).in_(approved_codes),
            )
        ).all()

    clean_types = [t.strip() for t in distinct_types if t and t.strip()]
    if not clean_types:
        return []

    dv_rows = session.scalars(
        select(DomainValue).where(
            func.replace(func.upper(DomainValue.domain_name), "_", "") == "TYPEOFHOLDING"
        )
    ).all()
    dv_map = {}
    for r in dv_rows:
        if r.code_value:
            dv_map[r.code_value.strip().upper()] = r.label_name or r.code_value

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
    """Get distinct equipment types for the selected parent depot from MMS_DEPOT_MASTER."""
    approved_codes = _get_approved_op_codes(session)
    sus = parent_sus_no.strip().upper()
    
    stmt = select(func.distinct(DepotMaster.type_of_eqpt)).where(
        func.upper(DepotMaster.to_sus_no) == sus,
        DepotMaster.type_of_eqpt.is_not(None),
        func.upper(func.trim(func.coalesce(DepotMaster.op_status, ""))).in_(approved_codes),
    )
    if holding_type and holding_type.strip():
        stmt = stmt.where(func.upper(DepotMaster.type_of_hldg) == holding_type.strip().upper())

    distinct_types = session.scalars(stmt).all()
    if not distinct_types:
        stmt_unit = select(func.distinct(UnitMasterDetail.type_of_eqpt)).where(
            func.upper(UnitMasterDetail.to_sus_no) == sus,
            UnitMasterDetail.type_of_eqpt.is_not(None),
            func.upper(func.trim(func.coalesce(UnitMasterDetail.op_status, ""))).in_(approved_codes),
        )
        if holding_type and holding_type.strip():
            stmt_unit = stmt_unit.where(func.upper(UnitMasterDetail.type_of_hldg) == holding_type.strip().upper())
        distinct_types = session.scalars(stmt_unit).all()

    clean_types = [t.strip() for t in distinct_types if t and t.strip()]
    if not clean_types:
        return []

    dv_rows = session.scalars(
        select(DomainValue).where(
            func.replace(func.upper(DomainValue.domain_name), "_", "") == "TYPEOFEQPT"
        )
    ).all()
    dv_map = {}
    for r in dv_rows:
        if r.code_value:
            dv_map[r.code_value.strip().upper()] = r.label_name or r.code_value

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
    """Get distinct PRF groups for parent depot from MMS_DEPOT_MASTER mapped with MMS_PRF_GRP_MSTR."""
    approved_codes = _get_approved_op_codes(session)
    sus = parent_sus_no.strip().upper()
    
    stmt = select(func.distinct(DepotMaster.prf_code)).where(
        func.upper(DepotMaster.to_sus_no) == sus,
        DepotMaster.prf_code.is_not(None),
        func.upper(func.trim(func.coalesce(DepotMaster.op_status, ""))).in_(approved_codes),
    )
    if holding_type and holding_type.strip():
        stmt = stmt.where(func.upper(DepotMaster.type_of_hldg) == holding_type.strip().upper())
    if eqpt_type and eqpt_type.strip():
        stmt = stmt.where(func.upper(DepotMaster.type_of_eqpt) == eqpt_type.strip().upper())

    codes = session.scalars(stmt).all()
    if not codes:
        stmt_unit = select(func.distinct(UnitMasterDetail.prf_code)).where(
            func.upper(UnitMasterDetail.to_sus_no) == sus,
            UnitMasterDetail.prf_code.is_not(None),
            func.upper(func.trim(func.coalesce(UnitMasterDetail.op_status, ""))).in_(approved_codes),
        )
        if holding_type and holding_type.strip():
            stmt_unit = stmt_unit.where(func.upper(UnitMasterDetail.type_of_hldg) == holding_type.strip().upper())
        if eqpt_type and eqpt_type.strip():
            stmt_unit = stmt_unit.where(func.upper(UnitMasterDetail.type_of_eqpt) == eqpt_type.strip().upper())
        codes = session.scalars(stmt_unit).all()

    clean_codes = [c.strip() for c in codes if c and c.strip()]
    if not clean_codes:
        return []

    # Map PRF_CODE from MMS_DEPOT_MASTER with MMS_PRF_GRP_MSTR to get PRF_GRP
    int_codes = []
    for c in clean_codes:
        try:
            int_codes.append(int(c))
        except ValueError:
            pass

    prf_map: dict[str, str] = {}
    if int_codes:
        prf_rows = session.execute(
            select(PrfGrpMstr.prf_code, PrfGrpMstr.prf_grp)
            .where(PrfGrpMstr.prf_code.in_(int_codes))
            .distinct()
        ).all()
        for p_code, p_grp in prf_rows:
            if p_grp:
                prf_map[str(p_code).strip()] = p_grp.strip()

    unmapped = [c for c in clean_codes if c not in prf_map]
    if unmapped:
        str_rows = session.execute(
            select(PrfGrpMstr.prf_code, PrfGrpMstr.prf_grp)
            .where(func.cast(PrfGrpMstr.prf_code, String).in_(unmapped))
            .distinct()
        ).all()
        for p_code, p_grp in str_rows:
            if p_grp:
                prf_map[str(p_code).strip()] = p_grp.strip()

    missing = [c for c in clean_codes if c not in prf_map]
    if missing:
        mlccs_rows = session.scalars(
            select(MlccsEquipmentMaster).where(
                MlccsEquipmentMaster.prf_code.in_(missing)
            )
        ).all()
        for r in mlccs_rows:
            if r.prf_code and r.prf_group:
                prf_map[r.prf_code.strip()] = r.prf_group.strip()

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
    """Get distinct census/nomenclatures for parent depot from MMS_DEPOT_MASTER."""
    approved_codes = _get_approved_op_codes(session)
    sus = parent_sus_no.strip().upper()
    
    stmt = select(func.distinct(DepotMaster.census_no)).where(
        func.upper(DepotMaster.to_sus_no) == sus,
        DepotMaster.census_no.is_not(None),
        func.upper(func.trim(func.coalesce(DepotMaster.op_status, ""))).in_(approved_codes),
    )
    if holding_type and holding_type.strip():
        stmt = stmt.where(func.upper(DepotMaster.type_of_hldg) == holding_type.strip().upper())
    if eqpt_type and eqpt_type.strip():
        stmt = stmt.where(func.upper(DepotMaster.type_of_eqpt) == eqpt_type.strip().upper())
    if prf_code and prf_code.strip():
        stmt = stmt.where(func.upper(DepotMaster.prf_code) == prf_code.strip().upper())

    censuses = session.scalars(stmt).all()
    if not censuses:
        stmt_unit = select(func.distinct(UnitMasterDetail.census_no)).where(
            func.upper(UnitMasterDetail.to_sus_no) == sus,
            UnitMasterDetail.census_no.is_not(None),
            func.upper(func.trim(func.coalesce(UnitMasterDetail.op_status, ""))).in_(approved_codes),
        )
        if holding_type and holding_type.strip():
            stmt_unit = stmt_unit.where(func.upper(UnitMasterDetail.type_of_hldg) == holding_type.strip().upper())
        if eqpt_type and eqpt_type.strip():
            stmt_unit = stmt_unit.where(func.upper(UnitMasterDetail.type_of_eqpt) == eqpt_type.strip().upper())
        if prf_code and prf_code.strip():
            stmt_unit = stmt_unit.where(func.upper(UnitMasterDetail.prf_code) == prf_code.strip().upper())
        censuses = session.scalars(stmt_unit).all()

    clean_censuses = [c.strip() for c in censuses if c and c.strip()]
    if not clean_censuses:
        return []

    mlccs_rows = session.scalars(
        select(MlccsEquipmentMaster).where(
            MlccsEquipmentMaster.census_no.in_(clean_censuses)
        )
    ).all()
    mlccs_map = {}
    for r in mlccs_rows:
        if r.census_no and r.nomen:
            mlccs_map[r.census_no.strip()] = r.nomen.strip()

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
    """Get active receiving units/depots from MMS_ORBAT_UNIT_DETL."""
    stmt = select(OrbatUnitDetl).where(func.upper(OrbatUnitDetl.status) == "ACTIVE")
    if search and search.strip():
        q = f"%{search.strip().upper()}%"
        stmt = stmt.where(
            or_(
                func.upper(OrbatUnitDetl.unit_name).like(q),
                func.upper(OrbatUnitDetl.sus_no).like(q),
            )
        )
    stmt = stmt.order_by(OrbatUnitDetl.unit_name).limit(100)
    rows = session.scalars(stmt).all()
    res: list[ReceivingUnitOut] = []
    for r in rows:
        display = f"{r.sus_no} - {r.unit_name}"
        res.append(
            ReceivingUnitOut(
                sus_no=r.sus_no,
                unit_name=r.unit_name,
                form_code=r.form_code,
                display=display,
            )
        )
    return res


@router.get("/receiving-holding-types", response_model=list[OptionOut])
def get_receiving_holding_types(
    session: Session = Depends(get_db_session),
) -> list[OptionOut]:
    """Get receiving holding types from MMS_DOMAIN_VALUES where code_value is LIKE '%D%' OR '%R%'."""
    rows = session.scalars(
        select(DomainValue)
        .where(
            func.replace(func.upper(DomainValue.domain_name), "_", "") == "TYPEOFHOLDING",
            or_(
                func.upper(DomainValue.code_value).like("%D%"),
                func.upper(DomainValue.code_value).like("%R%"),
                func.upper(DomainValue.label_name).like("%DEPOT%"),
                func.upper(DomainValue.label_name).like("%REGIMENTAL%"),
            ),
        )
        .order_by(func.lpad(func.coalesce(DomainValue.disp_order, "9999"), 10, "0"), DomainValue.label_name)
    ).all()

    if not rows:
        return [
            OptionOut(value="D", label="Depot Holding"),
            OptionOut(value="R", label="Regimental Holding"),
        ]

    res: list[OptionOut] = []
    seen = set()
    for r in rows:
        val = (r.code_value or r.label_name or "").strip()
        lbl = (r.label_name or r.code_value or "").strip()
        if val and val not in seen:
            seen.add(val)
            res.append(OptionOut(value=val, label=lbl))
    return res


@router.get("/receiving-eqpt-types", response_model=list[OptionOut])
def get_receiving_eqpt_types(
    session: Session = Depends(get_db_session),
) -> list[OptionOut]:
    """Get receiving eqpt types from MMS_DOMAIN_VALUES where domain_name = TYPEOFEQPT."""
    rows = session.scalars(
        select(DomainValue)
        .where(
            func.replace(func.upper(DomainValue.domain_name), "_", "") == "TYPEOFEQPT"
        )
        .order_by(func.lpad(func.coalesce(DomainValue.disp_order, "9999"), 10, "0"), DomainValue.label_name)
    ).all()

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
        val = (r.code_value or r.label_name or "").strip()
        lbl = (r.label_name or r.code_value or "").strip()
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
    """Get approved registration numbers for parent depot from MMS_DEPOT_MASTER."""
    approved_codes = _get_approved_op_codes(session)
    sus = parent_sus_no.strip().upper()
    
    stmt = select(DepotMaster.eqpt_regn_no).where(
        func.upper(DepotMaster.to_sus_no) == sus,
        DepotMaster.eqpt_regn_no.is_not(None),
        func.upper(func.trim(func.coalesce(DepotMaster.op_status, ""))).in_(approved_codes),
    )
    if holding_type and holding_type.strip():
        stmt = stmt.where(func.upper(DepotMaster.type_of_hldg) == holding_type.strip().upper())
    if eqpt_type and eqpt_type.strip():
        stmt = stmt.where(func.upper(DepotMaster.type_of_eqpt) == eqpt_type.strip().upper())
    if prf_code and prf_code.strip():
        stmt = stmt.where(func.upper(DepotMaster.prf_code) == prf_code.strip().upper())
    if census_no and census_no.strip():
        stmt = stmt.where(func.upper(DepotMaster.census_no) == census_no.strip().upper())

    rows = session.scalars(stmt).all()
    if not rows:
        # Fallback to UnitMasterDetail if no records found in DepotMaster
        stmt_unit = select(UnitMasterDetail.eqpt_regn_no).where(
            func.upper(UnitMasterDetail.to_sus_no) == sus,
            UnitMasterDetail.eqpt_regn_no.is_not(None),
            func.upper(func.trim(func.coalesce(UnitMasterDetail.op_status, ""))).in_(approved_codes),
        )
        if holding_type and holding_type.strip():
            stmt_unit = stmt_unit.where(func.upper(UnitMasterDetail.type_of_hldg) == holding_type.strip().upper())
        if eqpt_type and eqpt_type.strip():
            stmt_unit = stmt_unit.where(func.upper(UnitMasterDetail.type_of_eqpt) == eqpt_type.strip().upper())
        if prf_code and prf_code.strip():
            stmt_unit = stmt_unit.where(func.upper(UnitMasterDetail.prf_code) == prf_code.strip().upper())
        if census_no and census_no.strip():
            stmt_unit = stmt_unit.where(func.upper(UnitMasterDetail.census_no) == census_no.strip().upper())
        rows = session.scalars(stmt_unit).all()

    regns = sorted(list({r.strip() for r in rows if r and r.strip()}))
    return regns


@router.post("/transfer", response_model=TransferSubmitOut)
def submit_transfer(
    body: TransferSubmitIn,
    session: Session = Depends(get_db_session),
) -> TransferSubmitOut:
    """Transform data in MMS_DEPOT_MASTER for selected approved registration numbers."""
    parent_sus = body.parent_sus_no.strip().upper()
    receiving_sus = body.receiving_sus_no.strip().upper()

    if not body.regn_numbers:
        raise HTTPException(status_code=400, detail="No registration numbers provided for transfer")

    parent_unit = session.scalar(
        select(OrbatUnitDetl).where(func.upper(OrbatUnitDetl.sus_no) == parent_sus)
    )
    parent_form_code = parent_unit.form_code if parent_unit else None

    receiving_unit = session.scalar(
        select(OrbatUnitDetl).where(func.upper(OrbatUnitDetl.sus_no) == receiving_sus)
    )
    receiving_form_code = receiving_unit.form_code if receiving_unit else None

    tfr_status_code = _get_tfr_status_code(session)
    approved_codes = _get_approved_op_codes(session)

    stmt = select(DepotMaster).where(
        func.upper(DepotMaster.to_sus_no) == parent_sus,
        DepotMaster.eqpt_regn_no.in_(body.regn_numbers),
        func.upper(func.trim(func.coalesce(DepotMaster.op_status, ""))).in_(approved_codes),
    )
    if body.parent_type_of_hldg and body.parent_type_of_hldg.strip():
        stmt = stmt.where(func.upper(DepotMaster.type_of_hldg) == body.parent_type_of_hldg.strip().upper())
    if body.parent_type_of_eqpt and body.parent_type_of_eqpt.strip():
        stmt = stmt.where(func.upper(DepotMaster.type_of_eqpt) == body.parent_type_of_eqpt.strip().upper())
    if body.prf_code and body.prf_code.strip():
        stmt = stmt.where(func.upper(DepotMaster.prf_code) == body.prf_code.strip().upper())
    if body.census_no and body.census_no.strip():
        stmt = stmt.where(func.upper(DepotMaster.census_no) == body.census_no.strip().upper())

    rows = session.scalars(stmt).all()

    # Fallback to UnitMasterDetail if records exist in UnitMasterDetail
    if not rows:
        stmt_unit = select(UnitMasterDetail).where(
            func.upper(UnitMasterDetail.to_sus_no) == parent_sus,
            UnitMasterDetail.eqpt_regn_no.in_(body.regn_numbers),
            func.upper(func.trim(func.coalesce(UnitMasterDetail.op_status, ""))).in_(approved_codes),
        )
        if body.parent_type_of_hldg and body.parent_type_of_hldg.strip():
            stmt_unit = stmt_unit.where(func.upper(UnitMasterDetail.type_of_hldg) == body.parent_type_of_hldg.strip().upper())
        if body.parent_type_of_eqpt and body.parent_type_of_eqpt.strip():
            stmt_unit = stmt_unit.where(func.upper(UnitMasterDetail.type_of_eqpt) == body.parent_type_of_eqpt.strip().upper())
        if body.prf_code and body.prf_code.strip():
            stmt_unit = stmt_unit.where(func.upper(UnitMasterDetail.prf_code) == body.prf_code.strip().upper())
        if body.census_no and body.census_no.strip():
            stmt_unit = stmt_unit.where(func.upper(UnitMasterDetail.census_no) == body.census_no.strip().upper())

        unit_rows = session.scalars(stmt_unit).all()
        if not unit_rows:
            raise HTTPException(status_code=404, detail="No approved equipment records found for transfer")
        
        # Transform by inserting or updating into MMS_DEPOT_MASTER
        now = datetime.now()
        transferred: list[str] = []
        for ur in unit_rows:
            dm = DepotMaster(
                id=ur.id,
                sus_no=receiving_sus,
                census_seq_no=ur.census_seq_no,
                census_no=ur.census_no,
                type_of_hldg=body.receiving_type_of_hldg.strip() if body.receiving_type_of_hldg else ur.type_of_hldg,
                type_of_eqpt=body.receiving_type_of_eqpt.strip() if body.receiving_type_of_eqpt else ur.type_of_eqpt,
                eqpt_regn_no=ur.eqpt_regn_no,
                regn_seq_no=ur.regn_seq_no,
                from_sus_no=parent_sus,
                from_form_code=parent_form_code,
                from_tr_date=now,
                to_sus_no=receiving_sus,
                to_form_code=receiving_form_code,
                to_tr_date=now,
                service_status=ur.service_status,
                op_status=ur.op_status,
                tfr_status=tfr_status_code,
                prf_code=ur.prf_code,
            )
            session.add(dm)
            ur.to_sus_no = receiving_sus
            ur.sus_no = receiving_sus
            ur.from_sus_no = parent_sus
            ur.to_tr_date = now
            ur.from_tr_date = now
            ur.tfr_status = tfr_status_code
            if ur.eqpt_regn_no:
                transferred.append(ur.eqpt_regn_no)
        session.flush()
        return TransferSubmitOut(count=len(transferred), transferred_regns=transferred)

    now = datetime.now()
    transferred: list[str] = []
    for r in rows:
        r.from_sus_no = parent_sus
        r.from_form_code = parent_form_code
        r.to_sus_no = receiving_sus
        r.sus_no = receiving_sus
        r.to_form_code = receiving_form_code
        r.from_tr_date = now
        r.to_tr_date = now
        if body.receiving_type_of_hldg and body.receiving_type_of_hldg.strip():
            r.type_of_hldg = body.receiving_type_of_hldg.strip()
        if body.receiving_type_of_eqpt and body.receiving_type_of_eqpt.strip():
            r.type_of_eqpt = body.receiving_type_of_eqpt.strip()
        r.tfr_status = tfr_status_code
        if r.eqpt_regn_no:
            transferred.append(r.eqpt_regn_no)

    session.flush()
    return TransferSubmitOut(count=len(transferred), transferred_regns=transferred)
