"""MMS Domain Master — MMS Admin.

Endpoints, schemas and service logic to be provided.
"""

from fastapi import APIRouter

router = APIRouter(
    prefix="/admin/mms-domain-master",
    tags=["admin: mms domain master"],
)
