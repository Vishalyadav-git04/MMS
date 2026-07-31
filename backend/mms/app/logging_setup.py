"""Structured JSON logging for the MMS service."""

import logging
import sys

from pythonjsonlogger import jsonlogger


def configure_logging(service_name: str, level: str = "INFO") -> None:
    handler = logging.StreamHandler(sys.stdout)
    formatter = jsonlogger.JsonFormatter(
        "%(asctime)s %(levelname)s %(name)s %(message)s",
        rename_fields={"asctime": "ts", "levelname": "level", "name": "logger"},
    )
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level.upper())

    logging.getLogger(service_name).info(
        "logging configured", extra={"service": service_name}
    )


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
