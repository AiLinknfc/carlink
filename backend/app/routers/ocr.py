from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool

from app.dependencies import get_current_user
from app.schemas.schemas import OcrExtractResult
from app.services.ocr import OcrUnavailableError, extract_text_from_file, structure_receipt_data

router = APIRouter(prefix="/ocr", tags=["ocr"])


@router.post("/scan", response_model=OcrExtractResult)
async def scan_document(
    file: UploadFile,
    user_id: Annotated[str, Depends(get_current_user)],
):
    """Extract title/vendor/date/cost from a scanned receipt or invoice.

    Runs Tesseract OCR to pull raw text, then DeepSeek to structure it. Never fails hard
    on a bad scan — callers fall back to manual entry when fields come back null.
    """
    if not file.content_type or not (file.content_type.startswith("image/") or file.content_type == "application/pdf"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image files and PDFs are allowed")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large (max 10MB)")

    try:
        raw_text = await run_in_threadpool(extract_text_from_file, contents, file.content_type)
    except OcrUnavailableError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

    structured = await structure_receipt_data(raw_text)
    return OcrExtractResult(**structured, raw_text=raw_text)
