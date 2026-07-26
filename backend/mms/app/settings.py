"""MMS settings. Values can be overridden via environment / .env file.

Oracle connection uses the shared `core` Database layer (same pattern as
miso-5.0 ORBAT). Default schema name is MMS.
"""

from functools import lru_cache

from core.config.settings import BaseServiceSettings


class MmsSettings(BaseServiceSettings):
    service_name: str = "mms"
    environment: str = "dev"
    debug: bool = True

    oracle_user: str = "SYSTEM"
    oracle_password: str = "oracle"
    oracle_dsn: str = "localhost:1521/FREEPDB1"
    # MMS_* tables from the DDL live under SYSTEM in the local FreeDB PDB.
    oracle_schema: str = "SYSTEM"

    api_prefix: str = "/api/v1"
    # Include common Vite / TanStack / Lovable local ports used by this frontend
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ]


@lru_cache
def get_settings() -> MmsSettings:
    return MmsSettings()
