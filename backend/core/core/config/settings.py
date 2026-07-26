"""Environment-driven configuration shared by every MISO service.

Each module service subclasses `BaseServiceSettings` to add its own settings
and to pin its Oracle schema. Values are read from environment variables
(and a local `.env` file in development). Secrets never live in code.
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

Environment = Literal["dev", "staging", "prod"]


class BaseServiceSettings(BaseSettings):
    """Base settings common to all MISO backend services."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Service identity -------------------------------------------------
    service_name: str = "miso-service"
    environment: Environment = "dev"
    debug: bool = False

    # --- Oracle connection ------------------------------------------------
    # Prefer a DSN / connect string. For Oracle 26.1 use the "easy connect"
    # form host:port/service_name, or a tnsnames alias.
    oracle_user: str = Field(default="", description="DB username")
    oracle_password: str = Field(default="", description="DB password")
    # Local Oracle: host:port/service_name. Default service is FREEPDB1.
    oracle_dsn: str = Field(
        default="localhost:1521/FREEPDB1",
        description="Oracle connect string (host:port/service_name or TNS alias)",
    )
    oracle_schema: str = Field(
        default="",
        description="Default schema for this service (e.g. ORBAT)",
    )

    # --- Connection pool --------------------------------------------------
    db_pool_min: int = 1
    db_pool_max: int = 10
    db_pool_increment: int = 1
    db_pool_timeout: int = 30
    db_echo: bool = False  # SQLAlchemy SQL echo (dev only)

    # --- API --------------------------------------------------------------
    api_prefix: str = "/api/v1"
    cors_origins: list[str] = ["http://localhost:5173"]

    @property
    def is_prod(self) -> bool:
        return self.environment == "prod"


@lru_cache
def get_settings() -> BaseServiceSettings:
    """Cached base settings. Services usually define their own cached getter."""
    return BaseServiceSettings()
