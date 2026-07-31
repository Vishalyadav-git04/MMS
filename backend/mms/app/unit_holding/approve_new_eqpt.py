"""Approve New Eqpt — Weapon → Unit Holding.

Mirrors frontend src/components/unit-holding/ApproveNewEqpt.tsx.
Wire Oracle models/services here without changing the UI.
"""

from fastapi import APIRouter

router = APIRouter(
    prefix="/unit-holding/approve-new-eqpt",
    tags=["unit-holding: approve new eqpt"],
)


@router.get("/status")
def status() -> dict[str, str]:
    return {"module": "unit-holding", "feature": "approve-new-eqpt", "status": "scaffold"}
