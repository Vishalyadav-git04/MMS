"""Oracle connectivity for the MMS service."""

from __future__ import annotations

from contextlib import contextmanager
from typing import TYPE_CHECKING, Iterator

import oracledb
from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import Session, sessionmaker

if TYPE_CHECKING:
    from app.settings import MmsSettings


def build_engine(settings: MmsSettings) -> Engine:
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
                cursor.execute(f"ALTER SESSION SET CURRENT_SCHEMA = {schema}")
            finally:
                cursor.close()

    engine = create_engine(
        "oracle+oracledb://",
        creator=pool.acquire,
        poolclass=None,
        echo=settings.db_echo,
    )
    event.listen(engine, "connect", _on_connect)
    return engine


def get_sessionmaker(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Database:
    """Lifecycle wrapper around the engine and session factory."""

    def __init__(self, settings: MmsSettings) -> None:
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
