"""Single source of truth for Oracle connectivity.

Every module service uses this layer instead of writing its own connection
logic. It builds a `python-oracledb` connection pool and wraps it in a
SQLAlchemy engine, then hands out scoped sessions. Each service instantiates
one `Database` at startup (its own pool), but the *code* lives here only.

Usage in a service:

    db = Database(settings)
    db.connect()
    ...
    with db.session() as session:
        session.execute(...)
    ...
    db.dispose()  # on shutdown
"""

from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

import oracledb
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from core.config.settings import BaseServiceSettings


def build_engine(settings: BaseServiceSettings) -> Engine:
    """Create a SQLAlchemy engine backed by a python-oracledb connection pool.

    A pool is created once and shared by the engine; SQLAlchemy's own
    ``pool_class`` is disabled (``NullPool`` behaviour) because oracledb owns
    pooling. The default schema is set on each new connection.
    """
    pool = oracledb.create_pool(
        user=settings.oracle_user,
        password=settings.oracle_password,
        dsn=settings.oracle_dsn,
        min=settings.db_pool_min,
        max=settings.db_pool_max,
        increment=settings.db_pool_increment,
        timeout=settings.db_pool_timeout,
    )

    schema = settings.oracle_schema

    def _on_connect(dbapi_conn, _record) -> None:
        if schema:
            cursor = dbapi_conn.cursor()
            try:
                cursor.execute(f'ALTER SESSION SET CURRENT_SCHEMA = {schema}')
            finally:
                cursor.close()

    engine = create_engine(
        "oracle+oracledb://",
        creator=pool.acquire,
        poolclass=None,  # oracledb manages the pool
        echo=settings.db_echo,
    )

    from sqlalchemy import event

    event.listen(engine, "connect", _on_connect)
    return engine


def get_sessionmaker(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Database:
    """Lifecycle wrapper around a service's engine and session factory."""

    def __init__(self, settings: BaseServiceSettings) -> None:
        self._settings = settings
        self._engine: Engine | None = None
        self._sessionmaker: sessionmaker[Session] | None = None

    def connect(self) -> None:
        if self._engine is None:
            self._engine = build_engine(self._settings)
            self._sessionmaker = get_sessionmaker(self._engine)

    @property
    def engine(self) -> Engine:
        if self._engine is None:
            raise RuntimeError("Database.connect() must be called first")
        return self._engine

    @contextmanager
    def session(self) -> Iterator[Session]:
        """Transactional session scope: commit on success, rollback on error."""
        if self._sessionmaker is None:
            raise RuntimeError("Database.connect() must be called first")
        session = self._sessionmaker()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def dispose(self) -> None:
        if self._engine is not None:
            self._engine.dispose()
            self._engine = None
            self._sessionmaker = None
