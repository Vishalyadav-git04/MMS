"""Dashboard — home screen count aggregates for MLCCS, EP and MMS sections.

Mirrors frontend Dashboard in src/routes/index.tsx.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.deps import get_db_session
from app.models import EpDomainMaster, EpSubDomain, EpTransaction

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


def _scalar_count(session: Session, stmt) -> int:
    return int(session.scalar(stmt) or 0)


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
        domain = _scalar_count(session, select(func.count()).select_from(EpDomainMaster))
        sub_domain = _scalar_count(session, select(func.count()).select_from(EpSubDomain))
        # Unique EQPT_REGN_NO values in MMS_EP_TRANSACTION
        # Note: do not compare to '' — Oracle treats empty string as NULL.
        regn_no = _scalar_count(
            session,
            select(func.count(func.distinct(EpTransaction.eqpt_regn_no))).where(
                EpTransaction.eqpt_regn_no.is_not(None),
            ),
        )
    except Exception:
        logger.exception("dashboard EP count query failed")
        session.rollback()

    return DashboardCounts(
        mlccs=MlccsCounts(unique_census_no=1284, prf_group=86),
        ep=EpCounts(domain=domain, sub_domain=sub_domain, regn_no=regn_no),
        mms=MmsCounts(ue=4520, uh=18976),
    )
