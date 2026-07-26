"""Shared domain error types.

Services map these to HTTP responses in one place (a FastAPI exception
handler), so business code just raises the semantic error.
"""


class MisoError(Exception):
    """Base class for all MISO domain errors."""

    status_code: int = 500
    code: str = "internal_error"

    def __init__(self, message: str | None = None) -> None:
        super().__init__(message or self.__class__.__name__)
        self.message = message or self.__class__.__name__


class NotFoundError(MisoError):
    status_code = 404
    code = "not_found"


class ConflictError(MisoError):
    status_code = 409
    code = "conflict"


class ValidationError(MisoError):
    status_code = 422
    code = "validation_error"
