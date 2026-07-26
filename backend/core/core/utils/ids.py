"""Small, dependency-free helpers used across services."""

import uuid
from datetime import datetime, timezone


def new_id() -> str:
    """Return a new random UUID4 string."""
    return str(uuid.uuid4())


def utcnow() -> datetime:
    """Timezone-aware current UTC timestamp."""
    return datetime.now(timezone.utc)
