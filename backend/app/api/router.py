"""Top-level API router aggregating every MMS feature router.

Admin feature modules own an `APIRouter`; they are grouped here plus health.
Feature folders mirror the existing frontend screens under src/components/
(admin, ep, mlccs, ro, transfer, unit_holding, dashboard).
"""

from fastapi import APIRouter, Depends

from app.api.routes import auth, health
from app.admin import capture_mlccs_details
from app.admin import link_census_no_with_item_code
from app.admin import mms_domain_master
from app.admin import search_regn_no
from app.admin import unit_obsn_status
from app.dashboard import counts as dashboard_counts
from app.deps import require_unit_or_admin
from app.ep import capture_ep_stores as ep_capture
from app.ep import domain_master as ep_domain_master
from app.ep import ep_iut_transfer as ep_iut
from app.ep import gen_ep_census as ep_gen_census
from app.ep import search_approve_ep_stores as ep_search_approve
from app.ep import sub_domain_master as ep_sub_domain_master
from app.mlccs import view_mlccs
from app.ro import drr_dir_upload
from app.ro import generate_ro
from app.ro import search_ro
from app.transfer import depot_to_depot_transfer
from app.transfer import inter_unit_transfer
from app.transfer import unit_to_depot_deposit
from app.unit_holding import add_new_eqpt
from app.unit_holding import approve_new_eqpt
from app.unit_holding import update_arty_eqpt_data
from app.unit_holding import update_eqpt_data

api_router = APIRouter()

# --- public ---------------------------------------------------------------
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router)

# --- authenticated (ADMIN or UNIT) ----------------------------------------
protected = APIRouter(dependencies=[Depends(require_unit_or_admin)])
protected.include_router(dashboard_counts.router)
protected.include_router(capture_mlccs_details.router)
protected.include_router(mms_domain_master.router)
protected.include_router(search_regn_no.router)
protected.include_router(link_census_no_with_item_code.router)
protected.include_router(unit_obsn_status.router)
protected.include_router(ep_domain_master.router)
protected.include_router(ep_sub_domain_master.router)
protected.include_router(ep_gen_census.router)
protected.include_router(ep_capture.router)
protected.include_router(ep_search_approve.router)
protected.include_router(ep_iut.router)
protected.include_router(view_mlccs.router)
protected.include_router(drr_dir_upload.router)
protected.include_router(generate_ro.router)
protected.include_router(search_ro.router)
protected.include_router(inter_unit_transfer.router)
protected.include_router(depot_to_depot_transfer.router)
protected.include_router(unit_to_depot_deposit.router)
protected.include_router(add_new_eqpt.router)
protected.include_router(approve_new_eqpt.router)
protected.include_router(update_eqpt_data.router)
protected.include_router(update_arty_eqpt_data.router)
api_router.include_router(protected)
