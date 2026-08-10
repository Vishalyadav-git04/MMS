"""Native SQL Execution & Dynamic Query Helpers for Oracle DB in MMS."""

from __future__ import annotations

from typing import Any, Mapping, Sequence

from sqlalchemy import text
from sqlalchemy.orm import Session


def normalize_row(row: Mapping[str, Any] | None, lowercase_keys: bool = True) -> dict[str, Any] | None:
    """Convert SQLAlchemy RowMapping to dict, optionally lowercasing keys."""
    if row is None:
        return None
    d = dict(row)
    if lowercase_keys:
        return {k.lower(): v for k, v in d.items()}
    return d


def normalize_rows(rows: Sequence[Mapping[str, Any]], lowercase_keys: bool = True) -> list[dict[str, Any]]:
    """Convert list of RowMappings to list of dicts."""
    return [normalize_row(r, lowercase_keys=lowercase_keys) for r in rows if r is not None]  # type: ignore


def fetch_all(
    session: Session,
    sql: str,
    params: dict[str, Any] | None = None,
    lowercase_keys: bool = True,
) -> list[dict[str, Any]]:
    """Execute raw SQL query and return all rows as dicts."""
    result = session.execute(text(sql), params or {})
    mappings = result.mappings().all()
    return normalize_rows(mappings, lowercase_keys=lowercase_keys)


def fetch_one(
    session: Session,
    sql: str,
    params: dict[str, Any] | None = None,
    lowercase_keys: bool = True,
) -> dict[str, Any] | None:
    """Execute raw SQL query and return a single row as dict, or None."""
    result = session.execute(text(sql), params or {})
    mapping = result.mappings().first()
    return normalize_row(mapping, lowercase_keys=lowercase_keys)


def execute_sql(
    session: Session,
    sql: str,
    params: dict[str, Any] | Sequence[dict[str, Any]] | None = None,
) -> int:
    """Execute DML (INSERT, UPDATE, DELETE) statement and return rowcount."""
    result = session.execute(text(sql), params or {})
    return result.rowcount


def build_insert_sql(table_name: str, data: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    """Dynamically construct parameterized INSERT statement from a dictionary.

    Example:
        table_name = "MMS_USER"
        data = {"username": "admin", "role": "ADMIN"}
        Returns: ("INSERT INTO MMS_USER (username, role) VALUES (:username, :role)", data)
    """
    if not data:
        raise ValueError("Data dictionary cannot be empty for insert")

    columns = list(data.keys())
    col_str = ", ".join(columns)
    val_str = ", ".join(f":{c}" for c in columns)

    sql = f"INSERT INTO {table_name} ({col_str}) VALUES ({val_str})"
    return sql, data


def build_update_sql(
    table_name: str,
    data: dict[str, Any],
    where_clause: str,
    where_params: dict[str, Any],
) -> tuple[str, dict[str, Any]]:
    """Dynamically construct parameterized UPDATE statement from a dictionary.

    Example:
        table_name = "MMS_USER"
        data = {"display_name": "New Name"}
        where_clause = "username = :w_username"
        where_params = {"w_username": "admin"}
        Returns: ("UPDATE MMS_USER SET display_name = :display_name WHERE username = :w_username", combined_params)
    """
    if not data:
        raise ValueError("Data dictionary cannot be empty for update")

    set_clauses = [f"{c} = :{c}" for c in data.keys()]
    set_str = ", ".join(set_clauses)

    combined_params = {**data, **where_params}
    sql = f"UPDATE {table_name} SET {set_str} WHERE {where_clause}"
    return sql, combined_params


def get_opstatus_code_value(
    session: Session,
    label_or_name: str,
    default_fallback: str,
) -> str:
    """Look up the code_value from MMS_DOMAIN_VALUES where domain_name is OPSTATUS
    matching the given label_name or code_value (e.g. 'APPROVED', 'REJECTED', 'PENDING').
    """
    key = label_or_name.strip().upper()
    sql = """
        SELECT code_value FROM MMS_DOMAIN_VALUES
        WHERE REPLACE(UPPER(domain_name), '_', '') = 'OPSTATUS'
          AND (
            UPPER(TRIM(label_name)) = :key
            OR UPPER(TRIM(code_value)) = :key
            OR UPPER(TRIM(label_name)) LIKE :like_key
            OR UPPER(TRIM(code_value)) LIKE :like_key
          )
        ORDER BY CASE
            WHEN UPPER(TRIM(label_name)) = :key THEN 1
            WHEN UPPER(TRIM(code_value)) = :key THEN 2
            WHEN UPPER(TRIM(label_name)) LIKE :like_key THEN 3
            ELSE 4
        END
    """
    row = fetch_one(session, sql, {"key": key, "like_key": f"%{key}%"})
    if row and row.get("code_value"):
        return str(row["code_value"]).strip()
    return default_fallback

