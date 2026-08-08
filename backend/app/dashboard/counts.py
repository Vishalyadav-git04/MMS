"""Dashboard — home screen count aggregates for MLCCS, EP and MMS sections using Native SQL."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.deps import get_db_session
from app.db.native_utils import fetch_one

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard: counts"],
)


class MlccsCounts(BaseModel):
    unique_census_no: int
    prf_group: int


class EpCounts(BaseModel):
    domain: int
    sub_domain: int
    regn_no: int


class MmsCounts(BaseModel):
    ue: int
    uh: int


class DashboardCounts(BaseModel):
    mlccs: MlccsCounts
    ep: EpCounts
    mms: MmsCounts


@router.get("/counts", response_model=DashboardCounts)
def dashboard_counts(
    session: Session = Depends(get_db_session),
) -> DashboardCounts:
    """Return dashboard counts.

    MLCCS / MMS use placeholder dummy values for now.
    EP counts are live from:
      - MMS_EP_DOMAIN_MASTER
      - MMS_EP_SUB_DOMAIN
      - MMS_EP_TRANSACTION (EQPT_REGN_NO)
    """
    domain = 0
    sub_domain = 0
    regn_no = 0
    try:
        dom_row = fetch_one(session, "SELECT COUNT(id) AS cnt FROM MMS_EP_DOMAIN_MASTER")
        domain = int((dom_row.get("cnt") if dom_row else 0) or 0)

        sub_row = fetch_one(session, "SELECT COUNT(id) AS cnt FROM MMS_EP_SUB_DOMAIN")
        sub_domain = int((sub_row.get("cnt") if sub_row else 0) or 0)

        regn_row = fetch_one(
            session,
            "SELECT COUNT(DISTINCT eqpt_regn_no) AS cnt FROM MMS_EP_TRANSACTION WHERE eqpt_regn_no IS NOT NULL",
        )
        regn_no = int((regn_row.get("cnt") if regn_row else 0) or 0)
    except Exception:
        logger.exception("dashboard EP count query failed")
        session.rollback()

    return DashboardCounts(
        mlccs=MlccsCounts(unique_census_no=1284, prf_group=86),
        ep=EpCounts(domain=domain, sub_domain=sub_domain, regn_no=regn_no),
        mms=MmsCounts(ue=4520, uh=18976),
    )
