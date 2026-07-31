"""Role-based access control helpers."""

from __future__ import annotations

from typing import Callable

from app.auth.principal import Principal, Role


class AuthorizationError(Exception):
    """Raised when a principal lacks the required role(s)."""


def require_roles(*allowed: Role) -> Callable[[Principal], Principal]:
    def _check(principal: Principal) -> Principal:
        if not allowed or principal.has_any(*allowed):
            return principal
        raise AuthorizationError(
            f"requires one of: {', '.join(r.value for r in allowed)}"
        )

    return _check
