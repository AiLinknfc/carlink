from __future__ import annotations

from fastapi import HTTPException, UploadFile, status

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_CONTENT_PREFIXES = ("image/",)
ALLOWED_CONTENT_TYPES = ("application/pdf",)


async def validate_upload_file(file: UploadFile) -> bytes:
    """Validate content type and size of an uploaded file. Returns file contents."""
    if not file.content_type or not (
        file.content_type.startswith(ALLOWED_CONTENT_PREFIXES)
        or file.content_type in ALLOWED_CONTENT_TYPES
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image files and PDFs are allowed",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large (max 10MB)",
        )
    return contents
