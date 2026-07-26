"""Unit Obsn Status — MMS Admin.

Endpoints, schemas and service logic to be provided.
"""

from fastapi import APIRouter

router = APIRouter(
    prefix="/admin/unit-obsn-status",
    tags=["admin: unit obsn status"],
)
