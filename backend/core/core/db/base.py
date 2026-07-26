"""Declarative base and shared column conventions for all MISO models.

Every module's models inherit from this `Base`, so a single Alembic setup or
metadata reflection can see them. `TimestampMixin` and `AuditMixin` provide
the common bookkeeping columns expected on nearly every table.
"""

from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Root declarative base shared across all module models."""


class TimestampMixin:
    """Created / updated timestamps, managed by the database."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class AuditMixin(TimestampMixin):
    """Who created / last updated the row, in addition to timestamps."""

    created_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    updated_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
