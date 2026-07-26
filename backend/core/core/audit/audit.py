"""Audit trail primitives.

For a military system every mutating action must be traceable: who did what,
when, to which record, and what changed. Services call `record_audit` inside
the same transaction as the change so the audit row commits atomically with it.

This module defines the shape of an audit event and a helper to persist it.
The concrete audit table lives in each service's schema but follows this shape.
"""

from __future__ import annotations

import enum
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


class AuditAction(str, enum.Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    READ = "READ"
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"


@dataclass(slots=True)
class AuditEvent:
    """A single audit record, independent of storage."""

    action: AuditAction
    entity: str                       # table / resource name, e.g. "UNIT"
    entity_id: str | None             # primary key of the affected row
    actor: str | None                 # username / service principal
    module: str                       # owning module, e.g. "ORBAT"
    before: dict[str, Any] | None = None
    after: dict[str, Any] | None = None
    ip_address: str | None = None
    occurred_at: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    def to_row(self) -> dict[str, Any]:
        """Flatten to a dict suitable for insertion into an audit table."""
        return {
            "action": self.action.value,
            "entity": self.entity,
            "entity_id": self.entity_id,
            "actor": self.actor,
            "module": self.module,
            "before_json": json.dumps(self.before) if self.before else None,
            "after_json": json.dumps(self.after) if self.after else None,
            "ip_address": self.ip_address,
            "occurred_at": self.occurred_at,
        }


def record_audit(session, event: AuditEvent, table: str = "AUDIT_LOG") -> None:
    """Insert an audit event using the given (open) SQLAlchemy session.

    Uses a plain textual insert so it works before ORM models are defined.
    Call inside the same transaction as the change it describes.
    """
    from sqlalchemy import text

    session.execute(
        text(
            f"""
            INSERT INTO {table}
                (action, entity, entity_id, actor, module,
                 before_json, after_json, ip_address, occurred_at)
            VALUES
                (:action, :entity, :entity_id, :actor, :module,
                 :before_json, :after_json, :ip_address, :occurred_at)
            """
        ),
        event.to_row(),
    )
