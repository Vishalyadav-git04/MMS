"""API router for document file system upload."""

from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.services.upload import save_uploaded_document

router = APIRouter(prefix="/upload", tags=["upload"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_document(file: UploadFile = File(...)):
    """Upload a document file to the configured file system UPLOAD_PATH."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided in upload request",
        )
    try:
        saved_info = save_uploaded_document(file)
        return {
            "message": "Document uploaded successfully to file system",
            "file_name": saved_info.file_name,
            "relative_path": saved_info.relative_path,
            "absolute_path": saved_info.absolute_path,
            "size_bytes": saved_info.size_bytes,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload document to file system: {exc}",
        ) from exc
