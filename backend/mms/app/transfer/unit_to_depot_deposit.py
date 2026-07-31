"""Unit to Depot Deposit — Weapon → EQPT Transfer.

Mirrors frontend UnitToDepotDeposit in src/components/transfer/EqptTransferForms.tsx.
Wire Oracle models/services here without changing the UI.
"""

from fastapi import APIRouter

router = APIRouter(
    prefix="/transfer/unit-to-depot",
    tags=["transfer: unit to depot"],
)


@router.get("/status")
def status() -> dict[str, str]:
    return {"module": "transfer", "feature": "unit-to-depot", "status": "scaffold"}
