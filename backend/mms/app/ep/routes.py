"""EP feature stubs aligned with frontend screens under src/components/ep.

Screens: CaptureEpStores, EqptDomainMaster, GenEpCensus, SearchApproveEpStores,
SubDomainMaster. Wire Oracle models/services here without changing the UI.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/ep", tags=["ep"])


@router.get("/status")
def ep_status() -> dict[str, str]:
    return {"module": "ep", "status": "scaffold"}
