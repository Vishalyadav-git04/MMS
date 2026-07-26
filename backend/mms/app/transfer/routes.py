"""Transfer feature stubs aligned with frontend src/components/transfer.

Screens: EqptTransferForms. Wire Oracle models/services here without changing
the UI.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/transfer", tags=["transfer"])


@router.get("/status")
def transfer_status() -> dict[str, str]:
    return {"module": "transfer", "status": "scaffold"}
