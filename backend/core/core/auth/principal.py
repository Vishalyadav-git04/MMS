"""Authenticated principal and role model.

A `Principal` is whoever (or whatever service) is making a request, along with
the roles and clearance that authorization decisions are based on. Roles are
intentionally coarse here; module-specific permissions build on top of them.
The actual token verification (JWT / SSO / PKI) is wired up per deployment.
"""

from __future__ import annotations

import enum
from dataclasses import dataclass, field


class Role(str, enum.Enum):
    ADMIN = "ADMIN"
    OPERATOR = "OPERATOR"
    VIEWER = "VIEWER"


@dataclass(slots=True)
class Principal:
    username: str
    roles: set[Role] = field(default_factory=set)
    clearance: int = 0          # numeric clearance level; higher = more access
    unit_id: str | None = None  # ORBAT unit the principal belongs to

    def has_role(self, role: Role) -> bool:
        return role in self.roles

    def has_any(self, *roles: Role) -> bool:
        return any(r in self.roles for r in roles)
