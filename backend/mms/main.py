"""MMS service entrypoint.

Creates the FastAPI app, opens the shared Database at startup, registers
routers, CORS and domain-error handling. Run with:

    uvicorn main:app --reload --port 8001
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.auth_seed import ensure_users_table
from app.db.session import Database
from app.ep_lookup_seed import ensure_ep_lookup_tables
from app.logging_setup import configure_logging
from app.settings import get_settings
from app.utils.errors import MisoError

settings = get_settings()
logger = logging.getLogger("mms")


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging(settings.service_name, level="DEBUG" if settings.debug else "INFO")
    db = Database(settings)
    app.state.db = None
    app.state.db_connected = False
    try:
        db.connect()
        app.state.db = db
        app.state.db_connected = True
        logger.info("oracle pool connected", extra={"dsn": settings.oracle_dsn})
        try:
            ensure_users_table(db)
        except Exception:
            logger.exception("failed to ensure MMS_USERS / seed accounts")
        try:
            ensure_ep_lookup_tables(db)
        except Exception:
            logger.exception("failed to ensure EP lookup tables")
    except Exception:
        # Allow API process to start for local UI work even if Oracle is down.
        # /health stays ok; /health/ready will report not ready.
        logger.exception("oracle pool connect failed — running without DB")
    try:
        yield
    finally:
        if app.state.db_connected and app.state.db is not None:
            app.state.db.dispose()


app = FastAPI(
    title="MMS — Material / Master List Management",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(MisoError)
async def miso_error_handler(_: Request, exc: MisoError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


app.include_router(api_router, prefix=settings.api_prefix)
