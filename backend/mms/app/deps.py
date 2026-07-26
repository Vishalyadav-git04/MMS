"""FastAPI dependencies for the MMS service.

Wires the shared `core` primitives (database, principal) to this service.
`db` is created once at startup in `main.py` and injected here.
"""

from __future__ import annotations

from typing import Iterator

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from core.auth.principal import Principal, Role


def get_db_session(request: Request) -> Iterator[Session]:
    """Yield a transactional session from the app-wide Database instance."""
    db = request.app.state.db
    if db is None:
        raise RuntimeError("Database is not connected")
    with db.session() as session:
        yield session


def get_principal(request: Request) -> Principal:
    """Resolve the current principal.

    Placeholder: returns a dev admin. Replace with real token/PKI verification
    (JWT / SSO) before anything leaves development.
    """
    return Principal(username="dev", roles={Role.ADMIN}, clearance=99)


SessionDep = Depends(get_db_session)
PrincipalDep = Depends(get_principal)
