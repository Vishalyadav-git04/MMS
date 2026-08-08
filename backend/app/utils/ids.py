"""Small ID / time helpers."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session
from app.db.native_utils import fetch_all, fetch_one


def get_by_id(
    session: Session,
    model_or_table: Any,
    key: Any,
    pk_col: str = "ID",
) -> dict[str, Any] | None:
    """Retrieve row by primary key using native SQL."""
    if key is None:
        return None
    s_key = str(key).strip()
    table_name = getattr(model_or_table, "__tablename__", str(model_or_table))
    sql = f"SELECT * FROM {table_name} WHERE {pk_col} = :s_key OR TO_CHAR({pk_col}) = :s_key"
    return fetch_one(session, sql, {"s_key": s_key})


def next_int_id(
    session: Session,
    model_or_table: Any,
    *,
    pk_col: str = "ID",
    start_after: int | None = None,
) -> int:
    """Next integer primary key for ``table.pk_col``.

    Only considers existing IDs that are purely numeric so leftover UUID rows
    do not break the sequence. Pass ``start_after`` when allocating several IDs
    in one transaction before flush.
    """
    if start_after is not None:
        return start_after + 1
    table_name = getattr(model_or_table, "__tablename__", str(model_or_table))
    sql = f"SELECT {pk_col} FROM {table_name}"
    try:
        res = fetch_all(session, sql)
        ids = []
        for r in res:
            v = r.get(pk_col.lower()) if pk_col.lower() in r else r.get(pk_col.upper())
            if v is not None:
                ids.append(v)
        return max(
            (int(i) for i in ids if i is not None and str(i).isdigit()),
            default=0,
        ) + 1
    except Exception:
        return 1


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


