"""Small ID / time helpers."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session


def next_int_id(
    session: Session,
    model: type[Any],
    *,
    start_after: int | None = None,
) -> int:
    """Next integer primary key for ``model.id``.

    Only considers existing IDs that are purely numeric so leftover UUID rows
    do not break the sequence. Pass ``start_after`` when allocating several IDs
    in one transaction before flush.
    """
    if start_after is not None:
        return start_after + 1
    ids = session.scalars(select(model.id)).all()
    return max(
        (int(i) for i in ids if i is not None and str(i).isdigit()),
        default=0,
    ) + 1


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
