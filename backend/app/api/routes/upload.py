from __future__ import annotations

import mimetypes
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.services.upload import save_uploaded_document
from app.settings import get_settings

router = APIRouter(prefix="/upload", tags=["upload"])


def _generate_sample_pdf(filename: str) -> bytes:
    title = f"MMS Document: {filename}"
    pdf_str = (
        "%PDF-1.4\n"
        "1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n"
        "2 0 obj <</Type /Pages /Count 1 /Kids [3 0 R]>> endobj\n"
        "3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R>> endobj\n"
        "4 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj\n"
        "5 0 obj <</Length 70>> stream\n"
        "BT\n"
        "/F1 20 Tf\n"
        "50 720 Td\n"
        f"({title[:45]}) Tj\n"
        "ET\n"
        "endstream\n"
        "endobj\n"
        "xref\n"
        "0 6\n"
        "0000000000 65535 f \n"
        "0000000009 00000 n \n"
        "0000000058 00000 n \n"
        "0000000115 00000 n \n"
        "0000000243 00000 n \n"
        "0000000309 00000 n \n"
        "trailer <</Size 6 /Root 1 0 R>>\n"
        "startxref\n"
        "430\n"
        "%%EOF\n"
    )
    return pdf_str.encode("latin-1", errors="replace")


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


@router.get("/{filename}")
async def get_document(filename: str):
    """Serve/download an uploaded document file from UPLOAD_PATH."""
    settings = get_settings()
    base_upload_dir = Path(settings.upload_path)
    base_upload_dir.mkdir(parents=True, exist_ok=True)
    safe_filename = Path(filename).name
    file_path = base_upload_dir / safe_filename

    if not file_path.is_file():
        try:
            sample_data = _generate_sample_pdf(safe_filename)
            file_path.write_bytes(sample_data)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File '{safe_filename}' not found in upload directory",
            )

    mime_type, _ = mimetypes.guess_type(safe_filename)
    return FileResponse(
        path=file_path,
        filename=safe_filename,
        media_type=mime_type or "application/pdf",
        content_disposition_type="inline",
    )

