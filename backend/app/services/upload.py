"""File system upload service for MMS documents.

Handles saving uploaded files directly to the directory configured in UPLOAD_PATH
(e.g., D:/miso/ locally or /srv/ on staging).
"""

from __future__ import annotations

import os
import shutil
from pathlib import Path
from typing import NamedTuple

from fastapi import UploadFile

from app.settings import get_settings


class SavedFileInfo(NamedTuple):
    file_name: str
    relative_path: str
    absolute_path: str
    size_bytes: int


def save_uploaded_document(
    file: UploadFile,
    subfolder: str = "",
) -> SavedFileInfo:
    """Save an uploaded FastAPI file to the configured UPLOAD_PATH.

    Creates destination directory if it does not exist.
    """
    settings = get_settings()
    base_upload_dir = Path(settings.upload_path)
    target_dir = base_upload_dir / subfolder if subfolder else base_upload_dir
    target_dir.mkdir(parents=True, exist_ok=True)

    filename = Path(file.filename or "uploaded_document").name
    dest_path = target_dir / filename

    # Avoid overwriting existing files by appending counter if needed
    counter = 1
    stem = dest_path.stem
    suffix = dest_path.suffix
    while dest_path.exists():
        dest_path = target_dir / f"{stem}_{counter}{suffix}"
        counter += 1

    with dest_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = dest_path.stat().st_size
    try:
        rel_path = str(dest_path.relative_to(base_upload_dir)).replace("\\", "/")
    except ValueError:
        rel_path = dest_path.name

    return SavedFileInfo(
        file_name=dest_path.name,
        relative_path=rel_path,
        absolute_path=str(dest_path.resolve()).replace("\\", "/"),
        size_bytes=file_size,
    )
