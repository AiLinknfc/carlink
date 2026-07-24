from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool

from app.dependencies import get_current_user
from app.schemas.schemas import OcrExtractResult, VehicleCardResult
from app.services.ocr import (
    OcrUnavailableError,
    extract_text_from_file,
    structure_receipt_data,
    structure_vehicle_card_data,
)
from app.utils import validate_upload_file

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
    contents = await validate_upload_file(file)

    try:
        raw_text = await run_in_threadpool(extract_text_from_file, contents, file.content_type)
    except OcrUnavailableError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

    structured = await structure_receipt_data(raw_text)
    return OcrExtractResult(**structured, raw_text=raw_text)


@router.post("/vehicle-card", response_model=VehicleCardResult)
async def scan_vehicle_card(
    file: UploadFile,
    user_id: Annotated[str, Depends(get_current_user)],
):
    """Lee una tarjeta de propiedad para prellenar el registro.

    Es una ayuda de captura, no una verificación: el OCR no distingue un
    documento auténtico de uno alterado, así que esto nunca cambia
    verification_status. Ese salto sólo lo da una revisión humana.
    """
    contents = await validate_upload_file(file)

    try:
        raw_text = await run_in_threadpool(extract_text_from_file, contents, file.content_type)
    except OcrUnavailableError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

    structured = await structure_vehicle_card_data(raw_text)
    return VehicleCardResult(**structured, raw_text=raw_text)
