"""Link Census No with Item Code — MMS Admin.

Endpoints, schemas and service logic to be provided.
"""

from fastapi import APIRouter

router = APIRouter(
    prefix="/admin/link-census-no-with-item-code",
    tags=["admin: link census no with item code"],
)
