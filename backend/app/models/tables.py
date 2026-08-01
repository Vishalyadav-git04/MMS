"""Oracle table models mapped from the MMS DDL (owned by SYSTEM locally)."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Float, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MlccsEquipmentMaster(Base):
    """MMS_MLCCS_EQUIPMENT_MASTER — Master List of Controlled and Census Stores."""

    __tablename__ = "MMS_MLCCS_EQUIPMENT_MASTER"

    id: Mapped[str] = mapped_column("ID", String(36), primary_key=True)
    req_tr_id: Mapped[str | None] = mapped_column("REQ_TR_ID", String(7))
    auth_lett_no: Mapped[str | None] = mapped_column("AUTH_LETT_NO", String(50))
    auth_date: Mapped[datetime | None] = mapped_column("AUTH_DATE", DateTime)
    cos_sec: Mapped[str | None] = mapped_column("COS_SEC", String(10))
    prf_code: Mapped[str | None] = mapped_column("PRF_CODE", String(8))
    prf_group: Mapped[str | None] = mapped_column("PRF_GROUP", String(150))
    cat_part_no: Mapped[str | None] = mapped_column("CAT_PART_NO", String(50))
    census_seq_no: Mapped[float | None] = mapped_column("CENSUS_SEQ_NO", Float)
    census_no: Mapped[str | None] = mapped_column("CENSUS_NO", String(9), unique=True)
    nomen: Mapped[str | None] = mapped_column("NOMEN", String(255), unique=True)
    brief_desc: Mapped[str | None] = mapped_column("BRIEF_DESC", String(255))
    au: Mapped[str | None] = mapped_column("AU", String(50))
    item_status: Mapped[str | None] = mapped_column("ITEM_STATUS", String(3))
    item_category: Mapped[str | None] = mapped_column("ITEM_CATEGORY", String(10))
    origin_country: Mapped[str | None] = mapped_column("ORIGIN_COUNTRY", String(25))
    manuf_agency: Mapped[str | None] = mapped_column("MANUF_AGENCY", String(100))
    ahsp_agency: Mapped[str | None] = mapped_column("AHSP_AGENCY", String(100))
    induc_year: Mapped[str | None] = mapped_column("INDUC_YEAR", String(50))
    nato_stk_no: Mapped[str | None] = mapped_column("NATO_STK_NO", String(50))
    def_cat_no_dcan: Mapped[str | None] = mapped_column("DEF_CAT_NO_DCAN", String(50))
    ces_no: Mapped[str | None] = mapped_column("CES_NO", String(50))
    upload_file_name: Mapped[str | None] = mapped_column("UPLOAD_FILE_NAME", String(50))
    spl_remarks: Mapped[str | None] = mapped_column("SPL_REMARKS", String(255))
    remarks: Mapped[str | None] = mapped_column("REMARKS", String(255))
    data_cr_by: Mapped[str | None] = mapped_column("DATA_CR_BY", String(25))
    data_cr_date: Mapped[datetime | None] = mapped_column("DATA_CR_DATE", DateTime)
    data_upd_by: Mapped[str | None] = mapped_column("DATA_UPD_BY", String(25))
    data_upd_date: Mapped[datetime | None] = mapped_column("DATA_UPD_DATE", DateTime)
    data_app_by: Mapped[str | None] = mapped_column("DATA_APP_BY", String(25))
    data_app_date: Mapped[datetime | None] = mapped_column("DATA_APP_DATE", DateTime)
    op_status: Mapped[str | None] = mapped_column("OP_STATUS", String(10))
    class_category: Mapped[str | None] = mapped_column("CLASS_CATEGORY", String(50))
    dte_category: Mapped[str | None] = mapped_column("DTE_CATEGORY", String(50))
    active_status: Mapped[str | None] = mapped_column("ACTIVE_STATUS", String(10))
    item_seq_no: Mapped[str | None] = mapped_column("ITEM_SEQ_NO", String(255))
    item_code: Mapped[str | None] = mapped_column("ITEM_CODE", String(80))
    digest_category: Mapped[str | None] = mapped_column("DIGEST_CATEGORY", String(50))
    eqpt_priority: Mapped[str | None] = mapped_column("EQPT_PRIORITY", String(50))
    spl_dte: Mapped[str | None] = mapped_column("SPL_DTE", String(50))
    roleid: Mapped[int | None] = mapped_column("ROLEID", Integer)
    dte_eqpt_category: Mapped[str | None] = mapped_column("DTE_EQPT_CATEGORY", String(25))
    cost: Mapped[Decimal | None] = mapped_column("COST", Numeric(18, 2))
    material_no: Mapped[str | None] = mapped_column("MATERIAL_NO", String(15))


class EpDomainMaster(Base):
    """MMS_EP_DOMAIN_MASTER — EQPT category domains for EP Stores."""

    __tablename__ = "MMS_EP_DOMAIN_MASTER"

    id: Mapped[str] = mapped_column("ID", String(36), primary_key=True)
    domain_id: Mapped[int] = mapped_column("DOMAIN_ID", Integer, nullable=False)
    eqpt_cat: Mapped[str] = mapped_column("EQPT_CAT", String(255), unique=True, nullable=False)
    created_by: Mapped[str | None] = mapped_column("CREATED_BY", String(255))
    created_date: Mapped[datetime | None] = mapped_column("CREATED_DATE", DateTime)
    modified_by: Mapped[str | None] = mapped_column("MODIFIED_BY", String(255))
    modified_date: Mapped[datetime | None] = mapped_column("MODIFIED_DATE", DateTime)


class EpSubDomain(Base):
    """MMS_EP_SUB_DOMAIN — sub-domains under an EQPT domain."""

    __tablename__ = "MMS_EP_SUB_DOMAIN"

    id: Mapped[str] = mapped_column("ID", String(36), primary_key=True)
    equipment_domain_id: Mapped[str] = mapped_column(
        "EQUIPMENT_DOMAIN_ID", String(36), nullable=False
    )
    sub_domain_id: Mapped[int] = mapped_column("SUB_DOMAIN_ID", Integer, nullable=False)
    sub_domain_name: Mapped[str] = mapped_column(
        "SUB_DOMAIN_NAME", String(4000), unique=True, nullable=False
    )
    created_by: Mapped[str | None] = mapped_column("CREATED_BY", String(255))
    created_date: Mapped[datetime | None] = mapped_column("CREATED_DATE", DateTime)
    modified_by: Mapped[str | None] = mapped_column("MODIFIED_BY", String(255))
    modified_date: Mapped[datetime | None] = mapped_column("MODIFIED_DATE", DateTime)


class EpMstr(Base):
    """MMS_EP_MSTR — EP census master (Gen EP Census).

    Note: DB column ITEM_STAUTS is misspelled (missing 'T').
    """

    __tablename__ = "MMS_EP_MSTR"

    id: Mapped[str] = mapped_column("ID", String(36), primary_key=True)
    domain_id: Mapped[str] = mapped_column("DOMAIN_ID", String(36), nullable=False)
    sub_domain_id: Mapped[str] = mapped_column("SUB_DOMAIN_ID", String(36), nullable=False)
    census_no: Mapped[str] = mapped_column("CENSUS_NO", String(30), unique=True, nullable=False)
    auth_letter_no: Mapped[str | None] = mapped_column("AUTH_LETTER_NO", String(100))
    auth_date: Mapped[datetime | None] = mapped_column("AUTH_DATE", DateTime)
    cat_part_no: Mapped[str | None] = mapped_column("CAT_PART_NO", String(100))
    brief_description: Mapped[str | None] = mapped_column("BRIEF_DESCRIPTION", String(2000))
    accounting_unit: Mapped[str | None] = mapped_column("ACCOUNTING_UNIT", String(2000))
    item_status: Mapped[str | None] = mapped_column("ITEM_STAUTS", String(10))
    item_category: Mapped[str | None] = mapped_column("ITEM_CATEGORY", String(10))
    class_of_equipment: Mapped[str | None] = mapped_column("CLASS_OF_EQUIPMENT", String(10))
    nodal_directorate: Mapped[str | None] = mapped_column("NODAL_DIRECTORATE", String(10))
    digest_category: Mapped[str | None] = mapped_column("DIGEST_CATEGORY", String(10))
    equipment_category: Mapped[str | None] = mapped_column("EQUIPMENT_CATEGORY", String(10))
    country: Mapped[str | None] = mapped_column("COUNTRY", String(100))
    year_of_induction: Mapped[int | None] = mapped_column("YEAR_OF_INDUCTION", Integer)
    cost: Mapped[Decimal | None] = mapped_column("COST", Numeric(18, 2))
    manufacturing_agency: Mapped[str | None] = mapped_column("MANUFACTURING_AGENCY", String(255))
    ahsp_agency: Mapped[str | None] = mapped_column("AHSP_AGENCY", String(255))
    nato_stock_no: Mapped[str | None] = mapped_column("NATO_STOCK_NO", String(100))
    defence_catalogue_no: Mapped[str | None] = mapped_column("DEFENCE_CATALOGUE_NO", String(100))
    status: Mapped[str | None] = mapped_column("STATUS", String(10))
    remarks: Mapped[str | None] = mapped_column("REMARKS", String(1000))
    approved_by: Mapped[str | None] = mapped_column("APPROVED_BY", String(100))
    approved_date: Mapped[datetime | None] = mapped_column("APPROVED_DATE", DateTime)
    created_by: Mapped[str | None] = mapped_column("CREATED_BY", String(100))
    created_date: Mapped[datetime | None] = mapped_column("CREATED_DATE", DateTime)
    modified_by: Mapped[str | None] = mapped_column("MODIFIED_BY", String(100))
    modified_date: Mapped[datetime | None] = mapped_column("MODIFIED_DATE", DateTime)


class EpIssuerUnit(Base):
    """MMS_EP_ISSUER_UNIT — dummy issuer auth units for Capture EP Stores."""

    __tablename__ = "MMS_EP_ISSUER_UNIT"

    id: Mapped[str] = mapped_column("ID", String(36), primary_key=True)
    sanctioning_auth: Mapped[str] = mapped_column("SANCTIONING_AUTH", String(100), nullable=False)
    unit_name: Mapped[str] = mapped_column("UNIT_NAME", String(255), nullable=False)
    sus_no: Mapped[str] = mapped_column("SUS_NO", String(50), nullable=False)
    form_code: Mapped[str | None] = mapped_column("FORM_CODE", String(50))


class EpHoldingUnit(Base):
    """MMS_EP_HOLDING_UNIT — dummy holding units for Capture EP Stores."""

    __tablename__ = "MMS_EP_HOLDING_UNIT"

    id: Mapped[str] = mapped_column("ID", String(36), primary_key=True)
    unit_name: Mapped[str] = mapped_column("UNIT_NAME", String(255), nullable=False)
    sus_no: Mapped[str] = mapped_column("SUS_NO", String(50), nullable=False)
    form_code: Mapped[str | None] = mapped_column("FORM_CODE", String(50))


class EpTransaction(Base):
    """MMS_EP_TRANSACTION — Capture EP Stores submissions."""

    __tablename__ = "MMS_EP_TRANSACTION"

    id: Mapped[str] = mapped_column("ID", String(36), primary_key=True)
    auth_date: Mapped[datetime | None] = mapped_column("AUTH_DATE", DateTime)
    auth_letter_no: Mapped[str | None] = mapped_column("AUTH_LETTER_NO", String(255))
    census_no: Mapped[str | None] = mapped_column("CENSUS_NO", String(255))
    approved_by: Mapped[str | None] = mapped_column("APPROVED_BY", String(255))
    approved_date: Mapped[datetime | None] = mapped_column("APPROVED_DATE", DateTime)
    created_by: Mapped[str | None] = mapped_column("CREATED_BY", String(255))
    created_date: Mapped[datetime | None] = mapped_column("CREATED_DATE", DateTime)
    upload_by: Mapped[str | None] = mapped_column("UPLOAD_BY", String(255))
    upload_date: Mapped[datetime | None] = mapped_column("UPLOAD_DATE", DateTime)
    domain_id: Mapped[str] = mapped_column("DOMAIN_ID", String(36), nullable=False)
    eqpt_regn_no: Mapped[str | None] = mapped_column("EQPT_REGN_NO", String(255))
    from_form_code: Mapped[str | None] = mapped_column("FROM_FORM_CODE", String(255))
    from_sus_no: Mapped[str | None] = mapped_column("FROM_SUS_NO", String(255))
    from_tr_date: Mapped[datetime | None] = mapped_column("FROM_TR_DATE", DateTime)
    issued_from: Mapped[str | None] = mapped_column("ISSUED_FROM", String(255))
    iv_date: Mapped[datetime | None] = mapped_column("IV_DATE", DateTime)
    iv_no: Mapped[str | None] = mapped_column("IV_NO", String(255))
    iv_sus_no: Mapped[str | None] = mapped_column("IV_SUS_NO", String(255))
    op_status: Mapped[str | None] = mapped_column("OP_STATUS", String(255))
    qty: Mapped[int | None] = mapped_column("QTY", Integer)
    remarks: Mapped[str | None] = mapped_column("REMARKS", String(255))
    sanction_auth: Mapped[str | None] = mapped_column("SANCTION_AUTH", String(255))
    service_status: Mapped[str | None] = mapped_column("SERVICE_STATUS", String(255))
    stores_type: Mapped[str | None] = mapped_column("STORES_TYPE", String(255))
    sub_domain_id: Mapped[str | None] = mapped_column("SUB_DOMAIN_ID", String(36))
    tfr_status: Mapped[str | None] = mapped_column("TFR_STATUS", String(255))
    to_form_code: Mapped[str | None] = mapped_column("TO_FORM_CODE", String(255))
    to_sus_no: Mapped[str | None] = mapped_column("TO_SUS_NO", String(255))
    to_tr_date: Mapped[datetime | None] = mapped_column("TO_TR_DATE", DateTime)
    upload_auth_letter: Mapped[str | None] = mapped_column("UPLOAD_AUTH_LETTER", String(255))
    upload_voucher: Mapped[str | None] = mapped_column("UPLOAD_VOUCHER", String(255))


class DomainValue(Base):
    """MMS_DOMAIN_VALUES — reference / domain master codes."""

    __tablename__ = "MMS_DOMAIN_VALUES"

    id: Mapped[str] = mapped_column("ID", String(36), primary_key=True)
    domain_name: Mapped[str | None] = mapped_column("DOMAIN_NAME", String(255))
    code_value: Mapped[str | None] = mapped_column("CODE_VALUE", String(255))
    label_name: Mapped[str | None] = mapped_column("LABEL_NAME", String(255))
    label_short: Mapped[str | None] = mapped_column("LABEL_SHORT", String(10))
    disp_order: Mapped[str | None] = mapped_column("DISP_ORDER", String(10))
    updated_by: Mapped[str | None] = mapped_column("UPDATED_BY", String(255))
    updated_date: Mapped[datetime | None] = mapped_column("UPDATED_DATE", DateTime)
    created_by: Mapped[str | None] = mapped_column("CREATED_BY", String(255))
    created_date: Mapped[datetime | None] = mapped_column("CREATED_DATE", DateTime)
    version_no: Mapped[str | None] = mapped_column("VERSION_NO", String(10))
    module: Mapped[str | None] = mapped_column("MODULE", String(255))


class UnitMasterDetail(Base):
    """MMS_UNIT_MSTR_DETL — unit equipment / registration holdings."""

    __tablename__ = "MMS_UNIT_MSTR_DETL"

    id: Mapped[str] = mapped_column("ID", String(36), primary_key=True)
    sus_no: Mapped[str | None] = mapped_column("SUS_NO", String(9))
    census_seq_no: Mapped[int | None] = mapped_column("CENSUS_SEQ_NO", Integer)
    census_no: Mapped[str | None] = mapped_column("CENSUS_NO", String(9))
    type_of_hldg: Mapped[str | None] = mapped_column("TYPE_OF_HLDG", String(15))
    type_of_eqpt: Mapped[str | None] = mapped_column("TYPE_OF_EQPT", String(3))
    eqpt_regn_no: Mapped[str | None] = mapped_column("EQPT_REGN_NO", String(25))
    regn_seq_no: Mapped[str | None] = mapped_column("REGN_SEQ_NO", String(20))
    from_sus_no: Mapped[str | None] = mapped_column("FROM_SUS_NO", String(8))
    from_form_code: Mapped[str | None] = mapped_column("FROM_FORM_CODE", String(15))
    from_tr_date: Mapped[datetime | None] = mapped_column("FROM_TR_DATE", DateTime)
    to_sus_no: Mapped[str | None] = mapped_column("TO_SUS_NO", String(8))
    to_form_code: Mapped[str | None] = mapped_column("TO_FORM_CODE", String(15))
    to_tr_date: Mapped[datetime | None] = mapped_column("TO_TR_DATE", DateTime)
    barrel1_detl: Mapped[str | None] = mapped_column("BARREL1_DETL", String(150))
    barrel2_detl: Mapped[str | None] = mapped_column("BARREL2_DETL", String(150))
    barrel3_detl: Mapped[str | None] = mapped_column("BARREL3_DETL", String(150))
    barrel4_detl: Mapped[str | None] = mapped_column("BARREL4_DETL", String(150))
    service_status: Mapped[str | None] = mapped_column("SERVICE_STATUS", String(2))
    spl_remarks: Mapped[str | None] = mapped_column("SPL_REMARKS", String(200))
    remarks: Mapped[str | None] = mapped_column("REMARKS", String(200))
    created_by: Mapped[str | None] = mapped_column("CREATED_BY", String(25))
    created_date: Mapped[datetime | None] = mapped_column("CREATED_DATE", DateTime)
    upload_by: Mapped[str | None] = mapped_column("UPLOAD_BY", String(25))
    upload_date: Mapped[datetime | None] = mapped_column("UPLOAD_DATE", DateTime)
    approved_by: Mapped[str | None] = mapped_column("APPROVED_BY", String(25))
    approved_date: Mapped[datetime | None] = mapped_column("APPROVED_DATE", DateTime)
    op_status: Mapped[str | None] = mapped_column("OP_STATUS", String(3))
    tfr_status: Mapped[str | None] = mapped_column("TFR_STATUS", String(2))
    iv_no: Mapped[str | None] = mapped_column("IV_NO", String(25))
    iv_date: Mapped[datetime | None] = mapped_column("IV_DATE", DateTime)
    prf_code: Mapped[str | None] = mapped_column("PRF_CODE", String(8))
    depres_dur_year: Mapped[Decimal | None] = mapped_column("DEPRES_DUR_YEAR", Numeric(12, 2))
    upload_iv: Mapped[str | None] = mapped_column("UPLOAD_IV", String(8))


class ObsnDetail(Base):
    """MMS_OBSN_DETL — unit observation status details."""

    __tablename__ = "MMS_OBSN_DETL"

    id: Mapped[str] = mapped_column("ID", String(36), primary_key=True)
    tr_id: Mapped[int] = mapped_column("TR_ID", Integer, nullable=False)
    mth: Mapped[str | None] = mapped_column("MTH", String(30))
    yr: Mapped[str | None] = mapped_column("YR", String(10))
    deo: Mapped[str | None] = mapped_column("DEO", String(100))
    sus_no: Mapped[str | None] = mapped_column("SUS_NO", String(8))
    cert_opt1: Mapped[str | None] = mapped_column("CERT_OPT1", String(100))
    cert_opt2: Mapped[str | None] = mapped_column("CERT_OPT2", String(100))
    obsn1: Mapped[str | None] = mapped_column("OBSN1", String(255))
    obsn2: Mapped[str | None] = mapped_column("OBSN2", String(255))
    obsn3: Mapped[str | None] = mapped_column("OBSN3", String(255))
    obsn4: Mapped[str | None] = mapped_column("OBSN4", String(255))
    obsn5: Mapped[str | None] = mapped_column("OBSN5", String(255))
    obsn1_res: Mapped[str | None] = mapped_column("OBSN1_RES", String(255))
    obsn2_res: Mapped[str | None] = mapped_column("OBSN2_RES", String(255))
    obsn3_res: Mapped[str | None] = mapped_column("OBSN3_RES", String(255))
    obsn4_res: Mapped[str | None] = mapped_column("OBSN4_RES", String(255))
    obsn5_res: Mapped[str | None] = mapped_column("OBSN5_RES", String(255))
    data_upd_by: Mapped[str | None] = mapped_column("DATA_UPD_BY", String(150))
    data_upd_date: Mapped[datetime | None] = mapped_column("DATA_UPD_DATE", DateTime)
    data_chk_by: Mapped[str | None] = mapped_column("DATA_CHK_BY", String(150))
    data_chk_date: Mapped[datetime | None] = mapped_column("DATA_CHK_DATE", DateTime)
    data_cr_by: Mapped[str | None] = mapped_column("DATA_CR_BY", String(150))
    data_cr_date: Mapped[datetime | None] = mapped_column("DATA_CR_DATE", DateTime)
    latest: Mapped[str | None] = mapped_column("LATEST", String(6))
    census_no: Mapped[str | None] = mapped_column("CENSUS_NO", String(30))
    census_seq_no: Mapped[str | None] = mapped_column("CENSUS_SEQ_NO", String(30))
    type_of_hldg: Mapped[str | None] = mapped_column("TYPE_OF_HLDG", String(100))
    type_of_eqpt: Mapped[str | None] = mapped_column("TYPE_OF_EQPT", String(100))
    material_no: Mapped[str | None] = mapped_column("MATERIAL_NO", String(100))
    obsn_status: Mapped[str | None] = mapped_column("OBSN_STATUS", String(1))
    obsn1_act: Mapped[str | None] = mapped_column("OBSN1_ACT", String(1))
    obsn2_act: Mapped[str | None] = mapped_column("OBSN2_ACT", String(1))
    obsn3_act: Mapped[str | None] = mapped_column("OBSN3_ACT", String(1))
    obsn4_act: Mapped[str | None] = mapped_column("OBSN4_ACT", String(1))
    obsn5_act: Mapped[str | None] = mapped_column("OBSN5_ACT", String(1))
    unit_remarks: Mapped[str | None] = mapped_column("UNIT_REMARKS", String(255))
    unit_upload_document: Mapped[str | None] = mapped_column("UNIT_UPLOAD_DOCUMENT", String(255))


class MmsUser(Base):
    """MMS_USERS — application login accounts (ADMIN / UNIT)."""

    __tablename__ = "MMS_USERS"

    id: Mapped[str] = mapped_column("ID", String(36), primary_key=True)
    username: Mapped[str] = mapped_column("USERNAME", String(64), unique=True, nullable=False)
    display_name: Mapped[str | None] = mapped_column("DISPLAY_NAME", String(120))
    password_hash: Mapped[str] = mapped_column("PASSWORD_HASH", String(255), nullable=False)
    role: Mapped[str] = mapped_column("ROLE", String(20), nullable=False)  # ADMIN | UNIT
    unit_id: Mapped[str | None] = mapped_column("UNIT_ID", String(32))
    active: Mapped[str] = mapped_column("ACTIVE", String(1), default="Y", nullable=False)
    created_at: Mapped[datetime | None] = mapped_column("CREATED_AT", DateTime)
