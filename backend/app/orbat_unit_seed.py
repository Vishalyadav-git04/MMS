"""Create MMS_ORBAT_UNIT_DETL and seed dummy ORBAT unit rows."""

from __future__ import annotations

import logging

from sqlalchemy import select

from app.models import OrbatUnitDetl

logger = logging.getLogger("mms.orbat")

# id, unit_name, sus_no, form_code, status
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
    OrbatUnitDetl.__table__.create(bind=db.engine, checkfirst=True)

    with db.session() as session:
        if session.scalar(select(OrbatUnitDetl.id).limit(1)) is not None:
            return
        for id_, name, sus, form_code, status in _ORBAT_SEED:
            session.add(
                OrbatUnitDetl(
                    id=id_,
                    unit_name=name,
                    sus_no=sus,
                    form_code=form_code,
                    status=status,
                )
            )
        logger.info("seeded %s ORBAT units", len(_ORBAT_SEED))
