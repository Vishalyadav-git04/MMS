"""Generate RO — Weapon → Generate RO.

Mirrors frontend src/components/ro/GenerateRo.tsx.
Wire Oracle models/services here without changing the UI.
"""

from fastapi import APIRouter

router = APIRouter(
    prefix="/ro/generate-ro",
    tags=["ro: generate ro"],
)


@router.get("/status")
def status() -> dict[str, str]:
    return {"module": "ro", "feature": "generate-ro", "status": "scaffold"}
