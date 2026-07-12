from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from app.dependencies import get_current_user
from app.services.storage import delete_file, upload_file

router = APIRouter(prefix="/upload", tags=["upload"])


@router.post("")
async def upload_file_endpoint(
    file: UploadFile,
    user_id: Annotated[str, Depends(get_current_user)],
):
    if not file.content_type or not (file.content_type.startswith("image/") or file.content_type == "application/pdf"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image files and PDFs are allowed")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large (max 10MB)")

    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "jpg"
    key = f"{user_id}/{uuid.uuid4()}.{ext}"

    url = await upload_file(contents, key, file.content_type)
    return JSONResponse({"url": url, "key": key})


@router.delete("/{key:path}")
async def delete_file_endpoint(
    key: str,
    user_id: Annotated[str, Depends(get_current_user)],
):
    if not key.startswith(f"{user_id}/"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to delete this file")
    await delete_file(key)
    return JSONResponse({"ok": True})
