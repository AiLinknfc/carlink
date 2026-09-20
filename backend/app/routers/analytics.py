from __future__ import annotations

import logging
import uuid
from typing import Annotated

from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import and_, distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_admin, get_current_user_optional
from app.models.models import AnalyticsEvent, ShopOrder, WhatsappClick
from app.schemas.schemas import (
    AnalyticsCount,
    AnalyticsDayPoint,
    AnalyticsEventBatch,
    AnalyticsFunnel,
    AnalyticsFunnelStep,
    AnalyticsSummaryOut,
    WhatsappClickCreate,
    WhatsappClickOut,
    WhatsappClickSummaryOut,
)
from app.services.cache import get_redis

logger = logging.getLogger("carlink")

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.post("/whatsapp-click", response_model=WhatsappClickOut, status_code=status.HTTP_201_CREATED)
async def track_whatsapp_click(
    body: WhatsappClickCreate,
    user_id: Annotated[str | None, Depends(get_current_user_optional)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Público (no requiere sesión, igual que el resto de los botones de
    WhatsApp que dispara) — tracking mínimo de qué tan seguido se clickea
    cada uno de los links wa.me de la app y por qué motivo, para tener datos
    reales antes de decidir si vale la pena automatizar alguno con la API de
    WhatsApp Business (ver docs/PENDIENTES.md). Best-effort desde el
    frontend: un fallo acá nunca debe impedir que el link de WhatsApp se
    abra — por eso este endpoint no hace nada más que guardar la fila."""
    click = WhatsappClick(
        intent=body.intent,
        source=body.source,
        user_id=uuid.UUID(user_id) if user_id else None,
    )
    db.add(click)
    await db.flush()
    await db.refresh(click)
    return click


@router.get("/whatsapp-clicks/summary", response_model=WhatsappClickSummaryOut)
async def whatsapp_clicks_summary(
    admin_user_id: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Admin-only — conteo agregado, no la lista fila por fila (no hace falta
    todavía; si más adelante se necesita filtrar por fecha/usuario puntual,
    se agrega ahí, no acá)."""
    total = await db.scalar(select(func.count()).select_from(WhatsappClick)) or 0

    by_intent_rows = await db.execute(
        select(WhatsappClick.intent, func.count()).group_by(WhatsappClick.intent)
    )
    by_source_rows = await db.execute(
        select(WhatsappClick.source, func.count()).group_by(WhatsappClick.source)
    )

    return WhatsappClickSummaryOut(
        total=total,
        by_intent=dict(by_intent_rows.all()),
        by_source=dict(by_source_rows.all()),
    )


# ─────────────────────────────────────────────────────────────────────────
# Analítica first-party (migración 060) — visitas y embudos, sin terceros.
# ─────────────────────────────────────────────────────────────────────────

_EVENTS_RATE_WINDOW = 60
_EVENTS_RATE_MAX = 30  # lotes por minuto por IP (cada lote trae hasta 20 eventos)
_TZ = "America/Bogota"


async def _check_events_rate(ip: str) -> bool:
    r = await get_redis()
    if r is None:
        return True
    key = f"rate:analytics:{ip}"
    count = await r.incr(key)
    if count == 1:
        await r.expire(key, _EVENTS_RATE_WINDOW)
    return count <= _EVENTS_RATE_MAX


@router.post("/events", status_code=status.HTTP_204_NO_CONTENT)
async def ingest_events(
    body: AnalyticsEventBatch,
    request: Request,
    user_id: Annotated[str | None, Depends(get_current_user_optional)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Público, en lote. Best-effort desde el frontend: nunca debe bloquear
    nada de la UI. No guarda IP ni ningún dato personal."""
    ip = request.client.host if request.client else "unknown"
    if not await _check_events_rate(ip):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many requests")
    uid = uuid.UUID(user_id) if user_id else None
    for e in body.events:
        db.add(AnalyticsEvent(
            anon_id=e.anon_id, session_id=e.session_id, user_id=uid, event=e.event,
            path=e.path, props=e.props, referrer=e.referrer, utm_source=e.utm_source,
            utm_medium=e.utm_medium, utm_campaign=e.utm_campaign, device=e.device,
        ))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# Cada paso = (etiqueta, evento, filtro opcional). "Alcanzó el paso" = anon_id
# distinto que lo disparó al menos una vez en la ventana (no exige orden
# estricto entre pasos, pero como cada paso sigue al anterior en la UI, la
# caída entre pasos es la lectura útil).
_FUNNELS: list[tuple[str, str, list[tuple[str, str, dict[str, str]]]]] = [
    ("shop", "Compra del llavero", [
        ("Visita /shop", "page_view", {"path_prefix": "/shop"}),
        ("Abre el carrito", "cart_open", {}),
        ("Datos de envío", "checkout_step", {"step": "shipping"}),
        ("Pantalla de pago", "checkout_step", {"step": "payment"}),
        ("Inicia el pago", "payment_start", {}),
    ]),
    ("onboarding", "Registro y activación", [
        ("Envía registro", "signup_submit", {}),
        ("Ve bienvenida", "wizard_step", {"step": "bienvenida"}),
        ("Ve paso vehículo", "wizard_step", {"step": "vehiculo"}),
        ("Crea su vehículo", "vehicle_created", {}),
        ("Ve paso WhatsApp", "wizard_step", {"step": "whatsapp"}),
        ("Ve paso llavero", "wizard_step", {"step": "llavero"}),
        ("Activa su llavero", "keychain_activated", {}),
    ]),
]


def _event_conditions(event: str, flt: dict[str, str]):
    conds = [AnalyticsEvent.event == event]
    for k, v in flt.items():
        if k == "path_prefix":
            conds.append(AnalyticsEvent.path.like(f"{v}%"))
        else:
            conds.append(AnalyticsEvent.props[k].astext == v)
    return and_(*conds)


def _source_label(utm_source: str, referrer: str) -> str:
    if utm_source:
        return utm_source
    host = urlparse(referrer).netloc.lower().removeprefix("www.") if referrer else ""
    if not host or host.endswith("carlink.com.co"):
        return "directo"
    return host


@router.get("/summary", response_model=AnalyticsSummaryOut)
async def analytics_summary(
    admin_user_id: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    days: Annotated[int, Query(ge=1, le=365)] = 30,
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    in_window = AnalyticsEvent.created_at >= since
    pv = AnalyticsEvent.event == "page_view"

    visitors = await db.scalar(select(func.count(distinct(AnalyticsEvent.anon_id))).where(in_window)) or 0
    sessions = await db.scalar(select(func.count(distinct(AnalyticsEvent.session_id))).where(in_window)) or 0
    pageviews = await db.scalar(select(func.count()).select_from(AnalyticsEvent).where(in_window, pv)) or 0

    day_col = func.date(func.timezone(_TZ, AnalyticsEvent.created_at)).label("day")
    rows = await db.execute(
        select(
            day_col,
            func.count(distinct(AnalyticsEvent.anon_id)),
            func.count(distinct(AnalyticsEvent.session_id)),
            func.count().filter(pv),
        ).where(in_window).group_by(day_col).order_by(day_col)
    )
    by_day = {str(r[0]): AnalyticsDayPoint(day=str(r[0]), visitors=r[1], sessions=r[2], pageviews=r[3]) for r in rows.all()}
    today = datetime.now(ZoneInfo(_TZ)).date()
    series = []
    for i in range(days - 1, -1, -1):
        d = str(today - timedelta(days=i))
        series.append(by_day.get(d) or AnalyticsDayPoint(day=d, visitors=0, sessions=0, pageviews=0))

    top_pages_rows = await db.execute(
        select(AnalyticsEvent.path, func.count(distinct(AnalyticsEvent.anon_id)))
        .where(in_window, pv).group_by(AnalyticsEvent.path)
        .order_by(func.count(distinct(AnalyticsEvent.anon_id)).desc()).limit(10)
    )
    top_pages = [AnalyticsCount(label=p or "/", count=n) for p, n in top_pages_rows.all()]

    src_rows = await db.execute(
        select(AnalyticsEvent.utm_source, AnalyticsEvent.referrer, func.count(distinct(AnalyticsEvent.session_id)))
        .where(in_window, pv).group_by(AnalyticsEvent.utm_source, AnalyticsEvent.referrer)
    )
    src: dict[str, int] = {}
    for utm, ref, n in src_rows.all():
        label = _source_label(utm, ref)
        src[label] = src.get(label, 0) + n
    top_sources = [AnalyticsCount(label=k, count=v) for k, v in sorted(src.items(), key=lambda kv: -kv[1])[:10]]

    dev_rows = await db.execute(
        select(AnalyticsEvent.device, func.count(distinct(AnalyticsEvent.anon_id)))
        .where(in_window).group_by(AnalyticsEvent.device)
    )
    devices = [AnalyticsCount(label=d or "desconocido", count=n) for d, n in dev_rows.all()]

    funnels: list[AnalyticsFunnel] = []
    for key, title, steps in _FUNNELS:
        out: list[AnalyticsFunnelStep] = []
        for label, event, flt in steps:
            n = await db.scalar(
                select(func.count(distinct(AnalyticsEvent.anon_id))).where(in_window, _event_conditions(event, flt))
            ) or 0
            out.append(AnalyticsFunnelStep(label=label, count=n))
        if key == "shop":
            paid = await db.scalar(
                select(func.count()).select_from(ShopOrder).where(ShopOrder.created_at >= since, ShopOrder.status == "approved")
            ) or 0
            out.append(AnalyticsFunnelStep(label="Pago aprobado (pedidos)", count=paid))
        funnels.append(AnalyticsFunnel(key=key, title=title, steps=out))

    return AnalyticsSummaryOut(
        days=days, visitors=visitors, sessions=sessions, pageviews=pageviews,
        series=series, top_pages=top_pages, top_sources=top_sources, devices=devices, funnels=funnels,
    )
