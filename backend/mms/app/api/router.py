"""Top-level API router aggregating every MMS feature router.

Admin feature modules own an `APIRouter`; they are grouped here plus health.
Feature folders mirror the existing frontend screens under src/components/.
"""

from fastapi import APIRouter, Depends

from app.api.routes import auth, health
from app.admin import capture_mlccs_details
from app.admin import link_census_no_with_item_code
from app.admin import mms_domain_master
from app.admin import search_regn_no
from app.admin import unit_obsn_status
from app.dashboard import routes as dashboard_routes
from app.deps import require_unit_or_admin
from app.ep import capture_ep_stores as ep_capture
from app.ep import domain_master as ep_domain_master
from app.ep import gen_ep_census as ep_gen_census
from app.ep import routes as ep_routes
from app.ep import search_approve_ep_stores as ep_search_approve
from app.ep import sub_domain_master as ep_sub_domain_master
from app.mlccs import routes as mlccs_routes
from app.ro import routes as ro_routes
from app.transfer import routes as transfer_routes

api_router = APIRouter()

# --- public ---------------------------------------------------------------
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router)

# --- authenticated (ADMIN or UNIT) ----------------------------------------
protected = APIRouter(dependencies=[Depends(require_unit_or_admin)])
protected.include_router(dashboard_routes.router)
protected.include_router(capture_mlccs_details.router)
protected.include_router(mms_domain_master.router)
protected.include_router(search_regn_no.router)
protected.include_router(link_census_no_with_item_code.router)
protected.include_router(unit_obsn_status.router)
protected.include_router(ep_routes.router)
protected.include_router(ep_domain_master.router)
protected.include_router(ep_sub_domain_master.router)
protected.include_router(ep_gen_census.router)
protected.include_router(ep_capture.router)
protected.include_router(ep_search_approve.router)
protected.include_router(mlccs_routes.router)
protected.include_router(ro_routes.router)
protected.include_router(transfer_routes.router)
api_router.include_router(protected)
