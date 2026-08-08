"""Create MMS_ORBAT_UNIT_DETL and seed dummy ORBAT unit rows using Native SQL."""

from __future__ import annotations

import logging
from sqlalchemy import text

from app.db.native_utils import execute_sql, fetch_one

logger = logging.getLogger("mms.orbat")

_CREATE_ORBAT_DDL = """
CREATE TABLE MMS_ORBAT_UNIT_DETL (
    ID VARCHAR2(36) PRIMARY KEY,
    UNIT_NAME VARCHAR2(255),
    SUS_NO VARCHAR2(255),
    FORM_CODE VARCHAR2(50),
    STATUS VARCHAR2(50)
)
"""

_ORBAT_SEED = (
    ("1", "1 Guards", "66070809", "OR01", "ACTIVE"),
    ("2", "2 Rajput", "44050607", "OR01", "ACTIVE"),
    ("3", "3 Sikh", "88091011", "OR02", "ACTIVE"),
    ("4", "4 Madras", "55060708", "OR02", "INACTIVE"),
    ("5", "5 JAK LI", "77080910", "OR03", "ACTIVE"),
    ("6", "Artillery Regiment", "33040506", "OR03", "ACTIVE"),
    ("7", "Armoured Regiment", "22030405", "OR04", "INACTIVE"),
    ("8", "Signals Unit Delhi", "11020304", "OR04", "ACTIVE"),
)


def ensure_orbat_unit_table(db) -> None:
    """Create MMS_ORBAT_UNIT_DETL if missing and seed dummy rows when empty."""
    with db.engine.begin() as conn:
        try:
            conn.execute(text(_CREATE_ORBAT_DDL))
        except Exception:
            pass

    with db.session() as session:
        has_orbat = fetch_one(session, "SELECT id FROM MMS_ORBAT_UNIT_DETL WHERE ROWNUM = 1")
        if has_orbat is not None:
            return
        for id_, name, sus, form_code, status in _ORBAT_SEED:
            execute_sql(
                session,
                "INSERT INTO MMS_ORBAT_UNIT_DETL (id, unit_name, sus_no, form_code, status) VALUES (:id, :name, :sus, :form, :status)",
                {"id": id_, "name": name, "sus": sus, "form": form_code, "status": status},
            )
        logger.info("seeded %s ORBAT units", len(_ORBAT_SEED))
