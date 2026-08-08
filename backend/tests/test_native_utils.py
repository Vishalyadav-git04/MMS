"""Unit tests for Native SQL helper utilities."""

from app.db.native_utils import (
    build_insert_sql,
    build_update_sql,
    normalize_row,
    normalize_rows,
)


def test_normalize_row():
    row = {"IV_NO": "IV101", "QTY": 10, "STATUS": "A"}
    norm = normalize_row(row, lowercase_keys=True)
    assert norm == {"iv_no": "IV101", "qty": 10, "status": "A"}

    norm_orig = normalize_row(row, lowercase_keys=False)
    assert norm_orig == {"IV_NO": "IV101", "QTY": 10, "STATUS": "A"}


def test_normalize_rows():
    rows = [{"IV_NO": "IV1"}, {"IV_NO": "IV2"}]
    norm = normalize_rows(rows, lowercase_keys=True)
    assert norm == [{"iv_no": "IV1"}, {"iv_no": "IV2"}]


def test_build_insert_sql():
    data = {"username": "admin", "role": "ADMIN"}
    sql, params = build_insert_sql("MMS_USER", data)
    assert sql == "INSERT INTO MMS_USER (username, role) VALUES (:username, :role)"
    assert params == data


def test_build_update_sql():
    data = {"display_name": "New Admin"}
    where_clause = "username = :w_user"
    where_params = {"w_user": "admin"}
    sql, combined = build_update_sql("MMS_USER", data, where_clause, where_params)
    assert sql == "UPDATE MMS_USER SET display_name = :display_name WHERE username = :w_user"
    assert combined == {"display_name": "New Admin", "w_user": "admin"}
