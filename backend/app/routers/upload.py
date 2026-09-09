from __future__ import annotations

import uuid
from typing import Annotated
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse, Response

from app.dependencies import get_current_user
from app.services.storage import delete_file, upload_file, get_file
from app.utils import validate_upload_file

router = APIRouter(prefix="/upload", tags=["upload"])

_executor = ThreadPoolExecutor(max_workers=4)


@router.post("")
async def upload_file_endpoint(
    file: UploadFile,
    user_id: Annotated[str, Depends(get_current_user)],
):
    contents = await validate_upload_file(file)

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


@router.get("/files/{key:path}")
async def serve_file(key: str):
    """Proxy endpoint: sirve archivos desde R2 con credenciales privadas.
    Las URLs públicas de R2 pueden fallar (403) si el bucket no tiene
    acceso público habilitado. Este endpoint siempre funciona."""
    try:
        file_bytes, content_type = await get_file(key)
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return Response(
        content=file_bytes,
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )
