"""Add New Eqpt — Weapon → Unit Holding.

Mirrors frontend src/components/unit-holding/AddNewEqpt.tsx.
Wire Oracle models/services here without changing the UI.
"""

from fastapi import APIRouter

router = APIRouter(
    prefix="/unit-holding/add-new-eqpt",
    tags=["unit-holding: add new eqpt"],
)


@router.get("/status")
def status() -> dict[str, str]:
    return {"module": "unit-holding", "feature": "add-new-eqpt", "status": "scaffold"}
