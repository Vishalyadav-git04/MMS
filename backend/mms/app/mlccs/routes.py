"""MLCCS feature stubs aligned with frontend screens under src/components/mlccs.

Screens: ViewMlccs. Wire Oracle models/services here without changing the UI.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/mlccs", tags=["mlccs"])


@router.get("/status")
def mlccs_status() -> dict[str, str]:
    return {"module": "mlccs", "status": "scaffold"}
