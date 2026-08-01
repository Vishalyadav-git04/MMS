"""JWT login and current-user endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.deps import get_optional_db_session, get_principal, get_settings_dep
from app.models import MmsUser
from app.settings import MmsSettings
from app.auth.jwt import create_access_token, hash_password, verify_password
from app.auth.principal import Principal, Role

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    display_name: str | None = None
    role: str
    unit_id: str | None = None
    client_ip: str | None = None


class MeResponse(BaseModel):
    username: str
    display_name: str | None = None
    role: str
    unit_id: str | None = None
    roles: list[str]
    client_ip: str


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        host = forwarded.split(",")[0].strip()
    else:
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            host = real_ip.strip()
        elif request.client and request.client.host:
            host = request.client.host
        else:
            return "unknown"

    # Normalize IPv6 loopback / IPv4-mapped forms for display
    lower = host.lower()
    if lower in ("::1", "0:0:0:0:0:0:0:1"):
        return "127.0.0.1"
    if lower.startswith("::ffff:"):
        return host.split(":")[-1]
    if host.startswith("[") and host.endswith("]"):
        return _client_ip_from_host(host[1:-1])
    return host


def _client_ip_from_host(host: str) -> str:
    lower = host.lower()
    if lower in ("::1", "0:0:0:0:0:0:0:1"):
        return "127.0.0.1"
    if lower.startswith("::ffff:"):
        return host.split(":")[-1]
    return host


# In-memory fallback when Oracle is unavailable (local UI work).
_DEV_FALLBACK: dict[str, dict[str, str]] = {
    "admin": {
        "password_hash": hash_password("admin123"),
        "display_name": "MMS Admin",
        "role": Role.ADMIN.value,
        "unit_id": "",
    },
    "unit": {
        "password_hash": hash_password("unit123"),
        "display_name": "Unit Operator",
        "role": Role.UNIT.value,
        "unit_id": "UNIT001",
    },
}


def _token_for(
    *,
    username: str,
    role: str,
    display_name: str | None,
    unit_id: str | None,
    settings: MmsSettings,
    client_ip: str | None = None,
) -> TokenResponse:
    token = create_access_token(
        subject=username,
        roles=[role],
        secret=settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
        expire_minutes=settings.jwt_expire_minutes,
        display_name=display_name,
        unit_id=unit_id or None,
    )
    return TokenResponse(
        access_token=token,
        username=username,
        display_name=display_name,
        role=role,
        unit_id=unit_id or None,
        client_ip=client_ip,
    )


@router.post("/login", response_model=TokenResponse)
def login(
    body: LoginRequest,
    request: Request,
    settings: MmsSettings = Depends(get_settings_dep),
    session: Session | None = Depends(get_optional_db_session),
) -> TokenResponse:
    username = body.username.strip()
    client_ip = _client_ip(request)
    row: MmsUser | None = None
    if session is not None:
        try:
            row = session.scalar(
                select(MmsUser).where(
                    func.upper(MmsUser.username) == username.upper()
                )
            )
        except Exception:
            row = None

    if row is not None:
        if (row.active or "Y").upper() != "Y":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is inactive",
            )
        if not verify_password(body.password, row.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
            )
        role = (row.role or Role.UNIT.value).upper()
        if role not in (Role.ADMIN.value, Role.UNIT.value):
            role = Role.UNIT.value
        return _token_for(
            username=row.username,
            role=role,
            display_name=row.display_name or row.username,
            unit_id=row.unit_id,
            settings=settings,
            client_ip=client_ip,
        )

    # Fallback seed users (no DB / table not ready)
    fb = _DEV_FALLBACK.get(username.lower())
    if fb and verify_password(body.password, fb["password_hash"]):
        return _token_for(
            username=username.lower(),
            role=fb["role"],
            display_name=fb["display_name"],
            unit_id=fb["unit_id"] or None,
            settings=settings,
            client_ip=client_ip,
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid username or password",
    )


@router.get("/me", response_model=MeResponse)
def me(
    request: Request,
    principal: Principal = Depends(get_principal),
) -> MeResponse:
    role = principal.primary_role.value if principal.primary_role else Role.UNIT.value
    return MeResponse(
        username=principal.username,
        display_name=principal.display_name or principal.username,
        role=role,
        unit_id=principal.unit_id,
        roles=[r.value for r in principal.roles],
        client_ip=_client_ip(request),
    )
