"""Update Eqpt Data — Weapon → Unit Holding.

Mirrors frontend src/components/unit-holding/UpdateEqptData.tsx.
Wire Oracle models/services here without changing the UI.
"""

from fastapi import APIRouter

router = APIRouter(
    prefix="/unit-holding/update-eqpt-data",
    tags=["unit-holding: update eqpt data"],
)


@router.get("/status")
def status() -> dict[str, str]:
    return {"module": "unit-holding", "feature": "update-eqpt-data", "status": "scaffold"}
