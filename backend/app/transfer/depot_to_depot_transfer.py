"""EQPT Transfer (Depot to Depot) — Weapon → EQPT Transfer.

Mirrors frontend DepotToDepotTransfer in src/components/transfer/EqptTransferForms.tsx.
Wire Oracle models/services here without changing the UI.
"""

from fastapi import APIRouter

router = APIRouter(
    prefix="/transfer/depot-to-depot",
    tags=["transfer: depot to depot"],
)


@router.get("/status")
def status() -> dict[str, str]:
    return {"module": "transfer", "feature": "depot-to-depot", "status": "scaffold"}
