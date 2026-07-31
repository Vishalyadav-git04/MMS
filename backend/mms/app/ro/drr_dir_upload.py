"""Upload DIR/DRR — Weapon → Generate RO.

Mirrors frontend src/components/ro/DrrDirUpload.tsx.
Wire Oracle models/services here without changing the UI.
"""

from fastapi import APIRouter

router = APIRouter(
    prefix="/ro/drr-dir-upload",
    tags=["ro: drr dir upload"],
)


@router.get("/status")
def status() -> dict[str, str]:
    return {"module": "ro", "feature": "drr-dir-upload", "status": "scaffold"}
