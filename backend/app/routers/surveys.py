from __future__ import annotations

import re
import unicodedata
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_admin, get_current_user
from app.models.models import AnalyticsEvent, Review, Survey, WorkshopReview
from app.schemas.schemas import SurveyAdminOut, SurveyCreate, SurveyOut, SurveyUpdate

router = APIRouter(prefix="/surveys", tags=["surveys"])
admin_router = APIRouter(prefix="/admin/surveys", tags=["admin-surveys"])

WORKSHOP_SURVEY_KEY = "workshop_service"

_FLOATING = "App del cliente, tarjeta flotante abajo a la derecha"

# Momentos de la app que YA disparan encuestas en el código (frontend: lib/surveys.ts). Admin puede
# crear encuestas nuevas sobre cualquiera de ellos; un momento nuevo requiere código.
TRIGGERS: dict[str, dict] = {
    "usage_milestone": {
        "label": "Uso sostenido", "target_types": ["platform", "product"], "location": _FLOATING,
        "timing": "A los 30 dias del registro, o cuando ya tiene un vehiculo y al menos 3 servicios registrados",
    },
    "first_service_registered": {
        "label": "Primer servicio guardado", "target_types": ["platform", "product"], "location": _FLOATING,
        "timing": "Justo despues de guardar el primer servicio de mantenimiento del usuario",
    },
    "keychain_activated": {
        "label": "Llavero activado", "target_types": ["platform", "product"], "location": _FLOATING,
        "timing": "Justo despues de activar un llavero con su codigo de activacion",
    },
    "found_notice_opened": {
        "label": "Aviso de llavero encontrado", "target_types": ["platform", "product"], "location": _FLOATING,
        "timing": 'Cuando el dueño abre un aviso de "llavero encontrado"',
    },
    "order_delivered": {
        "label": "Pedido entregado", "target_types": ["platform", "product"],
        "location": "Seguimiento del pedido, ventana centrada (interrumpe; unico caso asi)",
        "timing": "Cuando el usuario abre el seguimiento de un pedido ya entregado",
    },
    "workshop_service_registered": {
        "label": "Servicio con un taller aliado", "target_types": ["workshop"], "location": _FLOATING,
        "timing": "Justo despues de registrar un servicio hecho en un taller aliado (una vez por taller)",
    },
}


def _slug(text: str) -> str:
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "_", ascii_text.lower()).strip("_")[:40] or "encuesta"


@router.get("/active", response_model=list[SurveyOut])
async def list_active_surveys(
    _: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Encuestas que la app del cliente puede mostrar (las pausadas desde Admin no salen)."""
    rows = await db.execute(select(Survey).where(Survey.is_active.is_(True)).order_by(Survey.position, Survey.key))
    return [SurveyOut.model_validate(s) for s in rows.scalars().all()]


@admin_router.get("/triggers")
async def admin_list_triggers(_: Annotated[str, Depends(get_current_admin)]):
    return [{"key": k, **v} for k, v in TRIGGERS.items()]


@admin_router.get("", response_model=list[SurveyAdminOut])
async def admin_list_surveys(
    _: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    surveys = (await db.execute(select(Survey).order_by(Survey.position, Survey.key))).scalars().all()

    stats = {
        key: (count, float(avg or 0))
        for key, count, avg in (
            await db.execute(
                select(Review.survey_key, func.count(), func.avg(Review.rating))
                .where(Review.survey_key.is_not(None))
                .group_by(Review.survey_key)
            )
        ).all()
    }
    # Las respuestas de taller viven en workshop_reviews (solo las enviadas por clientes autenticados).
    w_count, w_avg = (
        await db.execute(
            select(func.count(), func.avg(WorkshopReview.rating)).where(WorkshopReview.source == "cliente_autenticado")
        )
    ).one()
    stats[WORKSHOP_SURVEY_KEY] = (w_count or 0, float(w_avg or 0))

    # Embudo desde la analitica propia: mostradas y cerradas sin responder, por encuesta.
    survey_key_expr = AnalyticsEvent.props["survey_key"].astext
    funnel: dict[str, dict[str, int]] = {}
    for key, event, count in (
        await db.execute(
            select(survey_key_expr, AnalyticsEvent.event, func.count())
            .where(AnalyticsEvent.event.in_(("survey_shown", "survey_dismissed")))
            .group_by(survey_key_expr, AnalyticsEvent.event)
        )
    ).all():
        if key:
            funnel.setdefault(key, {})[event] = count
    last_seen: dict[str, tuple] = {}
    for key, created_at, path in (
        await db.execute(
            select(survey_key_expr, AnalyticsEvent.created_at, AnalyticsEvent.path)
            .where(AnalyticsEvent.event == "survey_shown")
            .order_by(AnalyticsEvent.created_at.desc())
            .limit(500)
        )
    ).all():
        if key and key not in last_seen:
            last_seen[key] = (created_at, path)

    out: list[SurveyAdminOut] = []
    for s in surveys:
        count, avg = stats.get(s.key, (0, 0.0))
        f = funnel.get(s.key, {})
        seen_at, seen_path = last_seen.get(s.key, (None, ""))
        out.append(SurveyAdminOut(
            key=s.key, title=s.title, hint=s.hint, target_type=s.target_type, trigger_key=s.trigger_key,
            location=s.location, timing=s.timing, is_active=s.is_active, position=s.position,
            responses=count, average=round(avg, 1),
            shown=f.get("survey_shown", 0), dismissed=f.get("survey_dismissed", 0),
            last_shown_at=seen_at, last_shown_path=seen_path or "",
        ))
    return out


@admin_router.post("", response_model=SurveyOut, status_code=status.HTTP_201_CREATED)
async def admin_create_survey(
    body: SurveyCreate,
    _: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Crea una encuesta nueva sobre un momento que la app ya sabe disparar (TRIGGERS)."""
    trigger = TRIGGERS.get(body.trigger_key)
    if trigger is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="trigger_unknown")
    if body.target_type not in trigger["target_types"]:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="target_type_not_allowed_for_trigger")

    base = _slug(body.title)
    key, n = base, 1
    while await db.get(Survey, key) is not None:
        n += 1
        key = f"{base}_{n}"

    last_position = await db.scalar(select(func.max(Survey.position))) or 0
    survey = Survey(
        key=key, title=body.title.strip(), hint=body.hint.strip(), target_type=body.target_type,
        trigger_key=body.trigger_key, location=trigger["location"], timing=trigger["timing"],
        is_active=True, position=last_position + 1,
    )
    db.add(survey)
    await db.flush()
    await db.refresh(survey)
    return SurveyOut.model_validate(survey)


@admin_router.patch("/{key}", response_model=SurveyOut)
async def admin_update_survey(
    key: str,
    body: SurveyUpdate,
    _: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    survey = await db.get(Survey, key)
    if survey is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="not_found")
    if body.title is not None:
        survey.title = body.title.strip()
    if body.hint is not None:
        survey.hint = body.hint.strip()
    if body.is_active is not None:
        survey.is_active = body.is_active
    await db.flush()
    await db.refresh(survey)
    return SurveyOut.model_validate(survey)


@admin_router.delete("/{key}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_survey(
    key: str,
    _: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Solo se borra una encuesta sin respuestas; con respuestas se pausa (no se pierde historial)."""
    survey = await db.get(Survey, key)
    if survey is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="not_found")
    answered = await db.scalar(select(func.count()).select_from(Review).where(Review.survey_key == key)) or 0
    if key == WORKSHOP_SURVEY_KEY or answered:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="survey_has_responses")
    await db.delete(survey)
    await db.flush()
