"""Create and seed dummy issuer / holding unit lookup tables for EP Stores using Native SQL."""

from __future__ import annotations

import logging
from sqlalchemy import inspect, text

from app.db.native_utils import execute_sql, fetch_one

logger = logging.getLogger("mms.ep.lookups")

_CREATE_ISSUER_DDL = """
CREATE TABLE MMS_EP_ISSUER_UNIT (
    ID VARCHAR2(36) PRIMARY KEY,
    SANCTIONING_AUTH VARCHAR2(255),
    UNIT_NAME VARCHAR2(255),
    SUS_NO VARCHAR2(255),
    FORM_CODE VARCHAR2(50)
)
"""

_CREATE_HOLDING_DDL = """
CREATE TABLE MMS_EP_HOLDING_UNIT (
    ID VARCHAR2(36) PRIMARY KEY,
    UNIT_NAME VARCHAR2(255),
    SUS_NO VARCHAR2(255),
    FORM_CODE VARCHAR2(50)
)
"""

_ISSUER_SEED = (
    ("1", "DG CD", "1 Corps Ordnance Depot", "99101112", "FC01"),
    ("2", "DG CD", "Central Ordnance Depot Delhi", "99101113", "FC01"),
    ("3", "DGOS", "COD Agra", "10111213", "FC02"),
    ("4", "DGOS", "AOD Pathankot", "10111214", "FC02"),
    ("5", "DGAS", "Base Workshop Delhi Cantt", "12131415", "FC03"),
    ("6", "DGAS", "EME Depot Kirkee", "12131416", "FC03"),
    ("7", "DGEME", "Workshop Company Ambala", "13141516", "FC04"),
)

_HOLDING_SEED = (
    ("1", "1 Guards", "66070809", "UH01"),
    ("2", "2 Rajput", "44050607", "UH01"),
    ("3", "3 Sikh", "88091011", "UH02"),
    ("4", "4 Madras", "55060708", "UH02"),
    ("5", "5 JAK LI", "77080910", "UH03"),
    ("6", "Artillery Regiment", "33040506", "UH03"),
    ("7", "Armoured Regiment", "22030405", "UH04"),
)


def _ensure_form_code_column(db, table_name: str) -> None:
    """Add FORM_CODE if the table already existed without it."""
    insp = inspect(db.engine)
    cols = {c["name"].upper() for c in insp.get_columns(table_name)}
    if "FORM_CODE" in cols:
        return
    with db.engine.begin() as conn:
        conn.execute(
            text(f'ALTER TABLE "{table_name}" ADD "FORM_CODE" VARCHAR2(50)')
        )
    logger.info("added FORM_CODE to %s", table_name)


def ensure_ep_lookup_tables(db) -> None:
    """Create MMS_EP_ISSUER_UNIT / MMS_EP_HOLDING_UNIT and seed dummy rows."""
    with db.engine.begin() as conn:
        try:
            conn.execute(text(_CREATE_ISSUER_DDL))
        except Exception:
            pass
        try:
            conn.execute(text(_CREATE_HOLDING_DDL))
        except Exception:
            pass

    _ensure_form_code_column(db, "MMS_EP_ISSUER_UNIT")
    _ensure_form_code_column(db, "MMS_EP_HOLDING_UNIT")

    with db.session() as session:
        has_issuer = fetch_one(session, "SELECT id FROM MMS_EP_ISSUER_UNIT WHERE ROWNUM = 1")
        if has_issuer is None:
            for id_, auth, name, sus, form_code in _ISSUER_SEED:
                execute_sql(
                    session,
                    "INSERT INTO MMS_EP_ISSUER_UNIT (id, sanctioning_auth, unit_name, sus_no, form_code) VALUES (:id, :auth, :name, :sus, :form)",
                    {"id": id_, "auth": auth, "name": name, "sus": sus, "form": form_code},
                )
            logger.info("seeded %s issuer units", len(_ISSUER_SEED))
        else:
            for id_, auth, name, sus, form_code in _ISSUER_SEED:
                execute_sql(
                    session,
                    "UPDATE MMS_EP_ISSUER_UNIT SET form_code = :form WHERE id = :id AND (form_code IS NULL OR form_code = '')",
                    {"id": id_, "form": form_code},
                )

        has_holding = fetch_one(session, "SELECT id FROM MMS_EP_HOLDING_UNIT WHERE ROWNUM = 1")
        if has_holding is None:
            for id_, name, sus, form_code in _HOLDING_SEED:
                execute_sql(
                    session,
                    "INSERT INTO MMS_EP_HOLDING_UNIT (id, unit_name, sus_no, form_code) VALUES (:id, :name, :sus, :form)",
                    {"id": id_, "name": name, "sus": sus, "form": form_code},
                )
            logger.info("seeded %s holding units", len(_HOLDING_SEED))
        else:
            for id_, name, sus, form_code in _HOLDING_SEED:
                execute_sql(
                    session,
                    "UPDATE MMS_EP_HOLDING_UNIT SET form_code = :form WHERE id = :id AND (form_code IS NULL OR form_code = '')",
                    {"id": id_, "form": form_code},
                )
