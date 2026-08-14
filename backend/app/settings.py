"""MMS settings. Values can be overridden via environment / .env file."""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

Environment = Literal["dev", "staging", "prod"]


class MmsSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    service_name: str = "mms"
    environment: Environment = "dev"
    debug: bool = True

    oracle_user: str = "MMS"
    oracle_password: str = "oracle"
    oracle_dsn: str = "localhost:1521/FREEPDB1"
    oracle_schema: str = "MMS"

    db_pool_min: int = 1
    db_pool_max: int = 10
    db_pool_increment: int = 1
    db_pool_timeout: int = 30
    db_echo: bool = False

    upload_path: str = "D:/MISO/MMS/"

    api_prefix: str = ""
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://131.3.54.120",
        "https://131.3.54.120",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    jwt_secret: str = Field(
        default="mms-dev-jwt-secret-change-me-32chars!",
        description="HS256 signing secret for access tokens",
    )
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480

    @property
    def is_prod(self) -> bool:
        return self.environment == "prod"


@lru_cache
def get_settings() -> MmsSettings:
    return MmsSettings()
