"""Search RO — Weapon → Generate RO.

Mirrors frontend src/components/ro/SearchRo.tsx.
Wire Oracle models/services here without changing the UI.
"""

from fastapi import APIRouter

router = APIRouter(
    prefix="/ro/search-ro",
    tags=["ro: search ro"],
)


@router.get("/status")
def status() -> dict[str, str]:
    return {"module": "ro", "feature": "search-ro", "status": "scaffold"}
