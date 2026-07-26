"""Liveness / readiness endpoints."""

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import text

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    """Liveness — the process is up."""
    return {"status": "ok"}


@router.get("/health/ready")
def ready(request: Request) -> dict[str, str]:
    """Readiness — the database is reachable."""
    if not getattr(request.app.state, "db_connected", False) or request.app.state.db is None:
        raise HTTPException(status_code=503, detail="database not connected")
    db = request.app.state.db
    with db.session() as session:
        session.execute(text("SELECT 1 FROM dual"))
    return {"status": "ready"}
