"""RO feature stubs aligned with frontend screens under src/components/ro.

Screens: DrrDirUpload, GenerateRo, SearchRo. Wire Oracle models/services here
without changing the UI.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/ro", tags=["ro"])


@router.get("/status")
def ro_status() -> dict[str, str]:
    return {"module": "ro", "status": "scaffold"}
