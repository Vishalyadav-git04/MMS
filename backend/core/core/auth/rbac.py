"""Role-based access control helpers for FastAPI.

`require_roles` returns a dependency that rejects requests whose principal
lacks one of the allowed roles. Services provide the `get_principal`
dependency that extracts and verifies the principal from the request.
"""

from __future__ import annotations

from typing import Callable

from core.auth.principal import Principal, Role


class AuthorizationError(Exception):
    """Raised when a principal lacks the required role(s)."""


def require_roles(*allowed: Role) -> Callable[[Principal], Principal]:
    """Build a check that passes the principal through if authorized.

    Intended to be adapted into a FastAPI dependency by each service, e.g.::

        def orbat_admin(p: Principal = Depends(get_principal)) -> Principal:
            return require_roles(Role.ADMIN)(p)
    """

    def _check(principal: Principal) -> Principal:
        if not allowed or principal.has_any(*allowed):
            return principal
        raise AuthorizationError(
            f"requires one of: {', '.join(r.value for r in allowed)}"
        )

    return _check
