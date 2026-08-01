"""Update Arty Eqpt Data — Weapon → Unit Holding.

Mirrors frontend src/components/unit-holding/UpdateArtyEqptData.tsx.
OH Details / Barrel Details / Strip Inspection live under this screen.
Wire Oracle models/services here without changing the UI.
"""

from fastapi import APIRouter

router = APIRouter(
    prefix="/unit-holding/update-arty-eqpt-data",
    tags=["unit-holding: update arty eqpt data"],
)


@router.get("/status")
def status() -> dict[str, str]:
    return {
        "module": "unit-holding",
        "feature": "update-arty-eqpt-data",
        "status": "scaffold",
    }
