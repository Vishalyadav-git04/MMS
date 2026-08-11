"""Create the Update Arty Eqpt Data history tables using Native SQL.

MMS_OH_DETL / MMS_BARREL_DETL / MMS_STRIP_DETL back the OH Details, Barrel
Details and Strip Inspection tabs on UpdateArtyEqptData.tsx. They are
append-only history logs keyed by EQPT_REGN_NO (see
app.unit_holding.update_arty_eqpt_data).
"""

from __future__ import annotations

import logging
from sqlalchemy import text

logger = logging.getLogger("mms.arty_detail")

_CREATE_OH_DDL = """
CREATE TABLE MMS_OH_DETL (
    ID VARCHAR2(36) PRIMARY KEY,
    OH_TYPE VARCHAR2(50),
    OH_DUE_DT DATE,
    OH_DONE_DT DATE,
    WKSP_NAME VARCHAR2(150),
    WKSP_IN_DT DATE,
    DISPATCH_DT DATE,
    BOH_COMPL_DT DATE,
    GUN_RECD_DT DATE,
    DT_OF_INTRO DATE,
    EQPT_REGN_NO VARCHAR2(25),
    SUS_NO VARCHAR2(50),
    CREATED_BY VARCHAR2(25),
    CREATED_ON DATE
)
"""

_CREATE_BARREL_DDL = """
CREATE TABLE MMS_BARREL_DETL (
    ID VARCHAR2(36) PRIMARY KEY,
    BARREL_REGN_NO VARCHAR2(50),
    OP_CLEAR VARCHAR2(20),
    OP_CLEAR_DT DATE,
    WKSP_NAME VARCHAR2(150),
    WKSP_IN_DT DATE,
    COFR_VERTICAL NUMBER,
    COFR_HORIZONTAL NUMBER,
    QTR_OF_LIFE VARCHAR2(20),
    EFC NUMBER,
    TOTAL_RDS_FIRED NUMBER,
    LAST_FIRED_DT DATE,
    EQPT_REGN_NO VARCHAR2(25),
    SUS_NO VARCHAR2(50),
    CREATED_BY VARCHAR2(25),
    CREATED_ON DATE
)
"""

_CREATE_STRIP_DDL = """
CREATE TABLE MMS_STRIP_DETL (
    ID VARCHAR2(36) PRIMARY KEY,
    RECOIL_SYS_REGD_NO VARCHAR2(50),
    PERIODICITY VARCHAR2(20),
    DUE_DT DATE,
    DONE_DT DATE,
    EQPT_REGN_NO VARCHAR2(25),
    CREATED_BY VARCHAR2(25),
    CREATED_ON DATE
)
"""


def ensure_arty_detail_tables(db) -> None:
    """Create MMS_OH_DETL / MMS_BARREL_DETL / MMS_STRIP_DETL if missing."""
    with db.engine.begin() as conn:
        for ddl, name in (
            (_CREATE_OH_DDL, "MMS_OH_DETL"),
            (_CREATE_BARREL_DDL, "MMS_BARREL_DETL"),
            (_CREATE_STRIP_DDL, "MMS_STRIP_DETL"),
        ):
            try:
                conn.execute(text(ddl))
                logger.info("created %s", name)
            except Exception:
                pass
