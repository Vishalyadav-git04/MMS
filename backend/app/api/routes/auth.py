"""JWT login and current-user endpoints."""

from __future__ import annotations

import re
import socket
from functools import lru_cache

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


_PRIVATE_172 = re.compile(r"^172\.(1[6-9]|2\d|3[0-1])\.")


def _is_loopback_ip(ip: str) -> bool:
    lower = (ip or "").strip().lower()
    return (
        not lower
        or lower in ("127.0.0.1", "::1", "0:0:0:0:0:0:0:1", "unknown")
        or lower.startswith("127.")
    )


def _is_private_lan_ip(ip: str) -> bool:
    value = (ip or "").strip()
    if not re.fullmatch(r"\d{1,3}(\.\d{1,3}){3}", value):
        return False
    return (
        value.startswith("10.")
        or value.startswith("192.168.")
        or bool(_PRIVATE_172.match(value))
    )


def _lan_rank(ip: str) -> int:
    if ip.startswith("192.168."):
        return 0
    if ip.startswith("10."):
        return 1
    if _PRIVATE_172.match(ip):
        return 2
    return 9


@lru_cache(maxsize=1)
def _primary_lan_ip() -> str | None:
    """Best private NIC on this host — used when the browser hits us via localhost."""
    candidates: list[str] = []

    def _add(ip: str) -> None:
        if _is_private_lan_ip(ip) and ip not in candidates:
            candidates.append(ip)

    for target in (("8.8.8.8", 80), ("192.168.0.1", 1)):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
                sock.settimeout(0.2)
                sock.connect(target)
                _add(sock.getsockname()[0])
        except OSError:
            pass

    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, family=socket.AF_INET):
            _add(info[4][0])
    except OSError:
        pass

    if not candidates:
        return None
    candidates.sort(key=_lan_rank)
    return candidates[0]


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
            host = "unknown"

    # Normalize IPv6 loopback / IPv4-mapped forms for display
    lower = host.lower()
    if lower in ("::1", "0:0:0:0:0:0:0:1"):
        host = "127.0.0.1"
    elif lower.startswith("::ffff:"):
        host = host.split(":")[-1]
    elif host.startswith("[") and host.endswith("]"):
        host = _client_ip_from_host(host[1:-1])

    # Localhost login: browsers hide LAN IPs; fall back to this machine's NIC.
    if _is_loopback_ip(host):
        lan = _primary_lan_ip()
        if lan:
            return lan
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
