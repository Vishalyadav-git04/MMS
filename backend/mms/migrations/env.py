"""Alembic environment for MMS.

Builds the engine from the service settings and targets the shared
`Base.metadata` so autogenerate sees the service's models.
"""

from __future__ import annotations

from logging.config import fileConfig

from alembic import context

from app.settings import get_settings
from core.db.base import Base
from core.db.session import build_engine

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

settings = get_settings()
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=None,
        dialect_name="oracle",
        target_metadata=target_metadata,
        literal_binds=True,
        version_table_schema=settings.oracle_schema or None,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = build_engine(settings)
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            version_table_schema=settings.oracle_schema or None,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
