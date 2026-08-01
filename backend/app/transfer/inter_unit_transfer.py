"""Inter Unit Transfer (Unit to Unit) — Weapon → EQPT Transfer.

Mirrors frontend InterUnitTransfer in src/components/transfer/EqptTransferForms.tsx.
Wire Oracle models/services here without changing the UI.
"""

from fastapi import APIRouter

router = APIRouter(
    prefix="/transfer/inter-unit",
    tags=["transfer: inter unit"],
)


@router.get("/status")
def status() -> dict[str, str]:
    return {"module": "transfer", "feature": "inter-unit", "status": "scaffold"}
