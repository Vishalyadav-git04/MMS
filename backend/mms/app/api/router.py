"""Top-level API router aggregating every MMS feature router.

Admin feature modules own an `APIRouter`; they are grouped here plus health.
Feature folders mirror the existing frontend screens under src/components/.
"""

from fastapi import APIRouter

from app.api.routes import health
from app.admin import capture_mlccs_details
from app.admin import link_census_no_with_item_code
from app.admin import mms_domain_master
from app.admin import search_regn_no
from app.admin import unit_obsn_status
from app.ep import routes as ep_routes
from app.mlccs import routes as mlccs_routes
from app.ro import routes as ro_routes
from app.transfer import routes as transfer_routes

api_router = APIRouter()

# --- health ---------------------------------------------------------------
api_router.include_router(health.router, tags=["health"])

# --- admin (existing MMS admin screens) -----------------------------------
api_router.include_router(capture_mlccs_details.router)
api_router.include_router(mms_domain_master.router)
api_router.include_router(search_regn_no.router)
api_router.include_router(link_census_no_with_item_code.router)
api_router.include_router(unit_obsn_status.router)

# --- feature scaffolds (aligned with frontend components) -----------------
api_router.include_router(ep_routes.router)
api_router.include_router(mlccs_routes.router)
api_router.include_router(ro_routes.router)
api_router.include_router(transfer_routes.router)
