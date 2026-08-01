"""JWT create/verify and password hashing helpers."""

from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

from app.auth.principal import Role

_PBKDF2_ITERS = 120_000
_HASH_PREFIX = "pbkdf2_sha256"


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        _PBKDF2_ITERS,
    ).hex()
    return f"{_HASH_PREFIX}${_PBKDF2_ITERS}${salt}${digest}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        prefix, iters_s, salt, expected = password_hash.split("$", 3)
        if prefix != _HASH_PREFIX:
            return False
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            int(iters_s),
        ).hex()
        return hmac.compare_digest(digest, expected)
    except (ValueError, TypeError):
        return False


def create_access_token(
    *,
    subject: str,
    roles: list[str] | set[str] | set[Role],
    secret: str,
    algorithm: str = "HS256",
    expire_minutes: int = 480,
    display_name: str | None = None,
    unit_id: str | None = None,
    extra: dict[str, Any] | None = None,
) -> str:
    now = datetime.now(timezone.utc)
    role_values = [r.value if isinstance(r, Role) else str(r) for r in roles]
    payload: dict[str, Any] = {
        "sub": subject,
        "roles": role_values,
        "iat": now,
        "exp": now + timedelta(minutes=expire_minutes),
    }
    if display_name:
        payload["display_name"] = display_name
    if unit_id:
        payload["unit_id"] = unit_id
    if extra:
        payload.update(extra)
    return jwt.encode(payload, secret, algorithm=algorithm)


def decode_access_token(
    token: str,
    *,
    secret: str,
    algorithm: str = "HS256",
) -> dict[str, Any]:
    return jwt.decode(token, secret, algorithms=[algorithm])
