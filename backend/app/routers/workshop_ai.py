from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, verify_workshop
from app.schemas.schemas import (
    AiDiagnoseRequest,
    AiDiagnoseResult,
    AiNotificationRequest,
    AiNotificationResult,
)
from app.services.ai_diagnostics import (
    AiDiagnosticsUnavailableError,
    generate_ai_diagnosis,
    generate_ai_notification_message,
)

router = APIRouter(prefix="/workshops/me", tags=["workshop-ai"])


@router.post("/ai-diagnose", response_model=AiDiagnoseResult)
async def ai_diagnose(
    body: AiDiagnoseRequest,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Diagnóstico preliminar con IA — requiere sesión de taller autenticada,
    la key de DeepSeek nunca sale del backend (ver services/ai_diagnostics.py)."""
    await verify_workshop(user_id, db)
    try:
        result = await generate_ai_diagnosis(
            body.vehicle_brand, body.vehicle_model, body.vehicle_year, body.vehicle_mileage, body.symptoms
        )
    except AiDiagnosticsUnavailableError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)) from e
    return AiDiagnoseResult.model_validate(result)


@router.post("/ai-notification-message", response_model=AiNotificationResult)
async def ai_notification_message(
    body: AiNotificationRequest,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """"Mejorar con IA" del compositor de notificaciones — mismo botón que
    tallerpro/NotificationsCenter.tsx ("Mejorar con IA"), pero por DeepSeek
    en vez de Gemini (ver services/ai_diagnostics.py)."""
    await verify_workshop(user_id, db)
    try:
        message = await generate_ai_notification_message(
            body.notification_type, body.client_name, body.vehicle_plate,
            body.order_number, body.total_amount, body.draft,
        )
    except AiDiagnosticsUnavailableError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)) from e
    return AiNotificationResult(message=message)
