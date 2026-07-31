"""Ensure MMS_USERS exists and seed default ADMIN / UNIT accounts."""

from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy import select

from app.models import MmsUser
from app.auth.jwt import hash_password
from app.auth.principal import Role
from app.utils.ids import next_int_id

logger = logging.getLogger("mms.auth")

# Default local accounts (change passwords in non-dev environments).
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
    """Create MMS_USERS if missing, then seed default accounts when empty."""
    MmsUser.__table__.create(bind=db.engine, checkfirst=True)
    with db.session() as session:
        last_id: int | None = None
        for spec in _SEED_USERS:
            existing = session.scalar(
                select(MmsUser).where(MmsUser.username == spec["username"])
            )
            if existing is not None:
                continue
            next_id = next_int_id(session, MmsUser, start_after=last_id)
            last_id = next_id
            session.add(
                MmsUser(
                    id=str(next_id),
                    username=spec["username"],
                    display_name=spec["display_name"],
                    password_hash=hash_password(spec["password"]),
                    role=spec["role"],
                    unit_id=spec["unit_id"],
                    active="Y",
                    created_at=datetime.utcnow(),
                )
            )
            logger.info("seeded user %s (%s)", spec["username"], spec["role"])
