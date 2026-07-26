"""FastAPI dependencies for the MMS service.

Wires the shared `core` primitives (database, principal) to this service.
`db` is created once at startup in `main.py` and injected here.
"""

from __future__ import annotations

from typing import Iterator

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.settings import MmsSettings, get_settings
from core.auth.jwt import decode_access_token
from core.auth.principal import Principal, Role
from core.auth.rbac import AuthorizationError, require_roles

_bearer = HTTPBearer(auto_error=False)


def get_settings_dep() -> MmsSettings:
    return get_settings()


def get_optional_db_session(request: Request) -> Iterator[Session | None]:
    """Yield a session when Oracle is up; otherwise None (for login fallback)."""
    db = getattr(request.app.state, "db", None)
    if db is None or not getattr(request.app.state, "db_connected", False):
        yield None
        return
    with db.session() as session:
        yield session


def get_db_session(request: Request) -> Iterator[Session]:
    """Yield a transactional session from the app-wide Database instance."""
    db = getattr(request.app.state, "db", None)
    if db is None or not getattr(request.app.state, "db_connected", False):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not connected",
        )
    with db.session() as session:
        yield session


def get_principal(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    settings: MmsSettings = Depends(get_settings_dep),
) -> Principal:
    """Resolve the current principal from a Bearer JWT."""
    if creds is None or not creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_access_token(
            creds.credentials,
            secret=settings.jwt_secret,
            algorithm=settings.jwt_algorithm,
        )
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    username = payload.get("sub")
    if not username or not isinstance(username, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
            headers={"WWW-Authenticate": "Bearer"},
        )

    raw_roles = payload.get("roles") or []
    roles: set[Role] = set()
    for r in raw_roles:
        try:
            roles.add(Role(str(r).upper()))
        except ValueError:
            continue
    if not roles:
        roles.add(Role.UNIT)

    clearance = 99 if Role.ADMIN in roles else 10
    return Principal(
        username=username,
        roles=roles,
        clearance=clearance,
        unit_id=payload.get("unit_id"),
        display_name=payload.get("display_name"),
    )


def require_admin(principal: Principal = Depends(get_principal)) -> Principal:
    try:
        return require_roles(Role.ADMIN)(principal)
    except AuthorizationError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc


def require_unit_or_admin(
    principal: Principal = Depends(get_principal),
) -> Principal:
    try:
        return require_roles(Role.ADMIN, Role.UNIT)(principal)
    except AuthorizationError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc


SessionDep = Depends(get_db_session)
PrincipalDep = Depends(get_principal)
