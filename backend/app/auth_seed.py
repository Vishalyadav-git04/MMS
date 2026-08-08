"""Ensure MMS_USER table exists and seed default ADMIN / UNIT accounts using Native SQL."""

from __future__ import annotations

import logging
from datetime import datetime
from sqlalchemy import text

from app.auth.jwt import hash_password
from app.auth.principal import Role
from app.db.native_utils import execute_sql, fetch_one
from app.utils.ids import next_int_id

logger = logging.getLogger("mms.auth")

_CREATE_MMS_USER_DDL = """
CREATE TABLE MMS_USER (
    ID VARCHAR2(36) PRIMARY KEY,
    USERNAME VARCHAR2(100) UNIQUE NOT NULL,
    DISPLAY_NAME VARCHAR2(255),
    PASSWORD_HASH VARCHAR2(255) NOT NULL,
    ROLE VARCHAR2(50) NOT NULL,
    UNIT_ID VARCHAR2(100),
    ACTIVE VARCHAR2(1) DEFAULT 'Y',
    CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
"""

_SEED_USERS = (
    {
        "username": "admin",
        "display_name": "MMS Admin",
        "password": "admin123",
        "role": Role.ADMIN.value,
        "unit_id": None,
    },
    {
        "username": "unit",
        "display_name": "Unit Operator",
        "password": "unit123",
        "role": Role.UNIT.value,
        "unit_id": "UNIT001",
    },
)


def ensure_users_table(db) -> None:
    """Create MMS_USER if missing, then seed default accounts when empty."""
    with db.engine.begin() as conn:
        try:
            conn.execute(text(_CREATE_MMS_USER_DDL))
        except Exception:
            pass  # Table already exists

    with db.session() as session:
        last_id: int | None = None
        for spec in _SEED_USERS:
            existing = fetch_one(
                session,
                "SELECT id FROM MMS_USER WHERE username = :u",
                {"u": spec["username"]},
            )
            if existing is not None:
                continue
            next_id = next_int_id(session, "MMS_USER", start_after=last_id)
            last_id = next_id
            execute_sql(
                session,
                """
                INSERT INTO MMS_USER (id, username, display_name, password_hash, role, unit_id, active, created_at)
                VALUES (:id, :username, :display_name, :password_hash, :role, :unit_id, 'Y', :created_at)
                """,
                {
                    "id": str(next_id),
                    "username": spec["username"],
                    "display_name": spec["display_name"],
                    "password_hash": hash_password(spec["password"]),
                    "role": spec["role"],
                    "unit_id": spec["unit_id"],
                    "created_at": datetime.utcnow(),
                },
            )
            logger.info("seeded user %s (%s)", spec["username"], spec["role"])
