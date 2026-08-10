"""Create MMS_ORBAT_UNIT_DETL and seed dummy ORBAT unit rows using Native SQL."""

from __future__ import annotations

import logging
from sqlalchemy import inspect, text

from app.db.native_utils import execute_sql, fetch_all, fetch_one

logger = logging.getLogger("mms.orbat")

_CREATE_ORBAT_DDL = """
CREATE TABLE MMS_ORBAT_UNIT_DETL (
    ID VARCHAR2(36) PRIMARY KEY,
    UNIT_NAME VARCHAR2(255),
    SUS_NO VARCHAR2(255),
    FORM_CODE VARCHAR2(50),
    STATUS VARCHAR2(50),
    ARM_CODE VARCHAR2(4)
)
"""

# Artillery units use arm codes starting with 02 (e.g. 0201, 0202, ...).
_ARTY_ARM_CODE_PREFIX = "02"

_ORBAT_SEED = (
    ("1", "1 Guards", "66070809", "OR01", "ACTIVE", "4817"),
    ("2", "2 Rajput", "44050607", "OR01", "ACTIVE", "6392"),
    ("3", "3 Sikh", "88091011", "OR02", "ACTIVE", "1054"),
    ("4", "4 Madras", "55060708", "OR02", "INACTIVE", "7728"),
    ("5", "5 JAK LI", "77080910", "OR03", "ACTIVE", "3146"),
    ("6", "Artillery Regiment", "33040506", "OR03", "ACTIVE", f"{_ARTY_ARM_CODE_PREFIX}01"),
    ("7", "Armoured Regiment", "22030405", "OR04", "INACTIVE", "5583"),
    ("8", "Signals Unit Delhi", "11020304", "OR04", "ACTIVE", "9261"),
)


def _is_arty_unit_name(unit_name: str) -> bool:
    upper = unit_name.upper()
    return "ARTILLERY" in upper or " ARTY" in upper or upper.startswith("ARTY")


def _ensure_arm_code_column(db) -> None:
    """Add ARM_CODE if the table already existed without it."""
    insp = inspect(db.engine)
    cols = {c["name"].upper() for c in insp.get_columns("MMS_ORBAT_UNIT_DETL")}
    if "ARM_CODE" in cols:
        return
    with db.engine.begin() as conn:
        conn.execute(text('ALTER TABLE "MMS_ORBAT_UNIT_DETL" ADD "ARM_CODE" VARCHAR2(4)'))
    logger.info("added ARM_CODE to MMS_ORBAT_UNIT_DETL")


def _next_arty_arm_seq(session) -> int:
    rows = fetch_all(
        session,
        "SELECT arm_code FROM MMS_ORBAT_UNIT_DETL WHERE arm_code LIKE :prefix",
        {"prefix": f"{_ARTY_ARM_CODE_PREFIX}%"},
    )
    max_seq = 0
    for row in rows:
        code = str(row.get("arm_code") or "")
        if len(code) == 4 and code.startswith(_ARTY_ARM_CODE_PREFIX) and code[2:].isdigit():
            max_seq = max(max_seq, int(code[2:]))
    return max_seq + 1


def _backfill_arty_arm_codes(session) -> None:
    """Assign sequential 02xx arm codes to artillery units missing a value."""
    rows = fetch_all(
        session,
        """
        SELECT id, unit_name
        FROM MMS_ORBAT_UNIT_DETL
        WHERE arm_code IS NULL OR arm_code = ''
        ORDER BY id
        """,
    )
    arty_seq = _next_arty_arm_seq(session)
    for row in rows:
        unit_name = str(row.get("unit_name") or "")
        if not _is_arty_unit_name(unit_name):
            continue
        arm_code = f"{_ARTY_ARM_CODE_PREFIX}{arty_seq:02d}"
        execute_sql(
            session,
            "UPDATE MMS_ORBAT_UNIT_DETL SET arm_code = :arm_code WHERE id = :id",
            {"arm_code": arm_code, "id": row["id"]},
        )
        arty_seq += 1


def ensure_orbat_unit_table(db) -> None:
    """Create MMS_ORBAT_UNIT_DETL if missing and seed dummy rows when empty."""
    with db.engine.begin() as conn:
        try:
            conn.execute(text(_CREATE_ORBAT_DDL))
        except Exception:
            pass

    _ensure_arm_code_column(db)

    with db.session() as session:
        has_orbat = fetch_one(session, "SELECT id FROM MMS_ORBAT_UNIT_DETL WHERE ROWNUM = 1")
        if has_orbat is None:
            for id_, name, sus, form_code, status, arm_code in _ORBAT_SEED:
                execute_sql(
                    session,
                    "INSERT INTO MMS_ORBAT_UNIT_DETL (id, unit_name, sus_no, form_code, status, arm_code) VALUES (:id, :name, :sus, :form, :status, :arm_code)",
                    {
                        "id": id_,
                        "name": name,
                        "sus": sus,
                        "form": form_code,
                        "status": status,
                        "arm_code": arm_code,
                    },
                )
            logger.info("seeded %s ORBAT units", len(_ORBAT_SEED))
        else:
            for id_, name, sus, form_code, status, arm_code in _ORBAT_SEED:
                execute_sql(
                    session,
                    "UPDATE MMS_ORBAT_UNIT_DETL SET arm_code = :arm_code WHERE id = :id AND (arm_code IS NULL OR arm_code = '')",
                    {"id": id_, "arm_code": arm_code},
                )
            _backfill_arty_arm_codes(session)
