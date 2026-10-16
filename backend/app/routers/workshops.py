from __future__ import annotations

import secrets
import string
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, verify_workshop
from app.models.models import (
    Appointment,
    Profile,
    Vehicle,
    WorkOrder,
    Workshop,
    WorkshopClient,
    WorkshopInventoryPart,
    WorkshopMechanic,
    WorkshopReview,
    WorkshopServiceItem,
    WorkshopApplication,
)
from app.config import get_settings
from app.schemas.schemas import (
    WorkshopCreate,
    WorkshopDashboardOut,
    WorkshopMeOut,
    WorkshopOut,
    WorkshopPublicOut,
    WorkshopPublicReviewOut,
    WorkshopPublicServiceOut,
    WorkshopSearchResult,
    WorkshopUpdate,
)
from app.services.colombian_nit import is_valid_colombian_nit
from app.services import workshop_access, workshop_invites
from app.services.capabilities import capabilities_for
from app.services.nfc_provisioning import TRIAL_DAYS
from app.services.geocoding import apply_geocode
from app.services.cache import get_redis
from app.utils import client_ip
from app.services.logo_image import LogoError, prepare_logo
from app.services.storage import upload_file
from app.services.storage_quota import ensure_room
from app.utils import validate_upload_file

router = APIRouter(prefix="/workshops", tags=["workshops"])


def _me_out(workshop: Workshop) -> WorkshopMeOut:
    """Negocio del dueño con lo que el panel necesita: capacidades de su tipo y estado de su acceso."""
    return WorkshopMeOut.model_validate(workshop).model_copy(update={
        "capabilities": sorted(capabilities_for(workshop.business_kind)),
        "can_certify_odometer": bool(workshop.can_certify_odometer),
        "access_plan": workshop.access_plan,
        "access_until": workshop_access.effective_until(workshop),
        "access_status": "active" if workshop_access.is_active(workshop) else "expired",
    })


def _generate_code() -> str:
    chars = string.ascii_uppercase + string.digits
    return "TLR-" + "".join(secrets.choice(chars) for _ in range(5))


@router.post("", response_model=WorkshopMeOut, status_code=status.HTTP_201_CREATED)
async def create_workshop(
    body: WorkshopCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Register a new workshop (taller). Optionally registers a test vehicle."""
    uid = uuid.UUID(user_id)

    # Cada cuenta taller nueva es candidata automática al trial gratuito de 7
    # días (nfc_provisioning.TRIAL_ACCOUNT_TYPES) — antes CUALQUIER string
    # único pasaba como legal_id, sin ninguna fricción real (ver docs/PENDIENTES.md,
    # "El trial de taller es la mayor grieta real del modelo cerrado").
    # Exigir un NIT con dígito de verificación matemáticamente correcto no
    # elimina el abuso, pero sí filtra el caso trivial de "escribir cualquier
    # cosa única para conseguir otra ficha gratis".
    if not is_valid_colombian_nit(body.legal_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="NIT inválido — usa el formato con dígito de verificación tal como aparece en tu RUT (ej. 900123456-7)",
        )

    # Invitación de la postulación aprobada (docs/PLAN_ALIADOS_NEGOCIO.md, Fase 0): une la aprobación manual del
    # admin con el alta real. Con invitación válida el NIT debe coincidir y el negocio nace verificado; con
    # WORKSHOP_INVITE_REQUIRED=true no hay alta sin invitación.
    invite_app: WorkshopApplication | None = None
    if body.invite_token:
        invite_app = (await db.execute(
            select(WorkshopApplication)
            .where(WorkshopApplication.invite_token_hash == workshop_invites.hash_token(body.invite_token))
            .with_for_update()
        )).scalar_one_or_none()
        if invite_app is None or invite_app.status != "approved":
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="invite_invalid")
        invite_state = workshop_invites.state(invite_app)
        if invite_state != "valid":
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=f"invite_{invite_state}")
        if body.legal_id.strip().upper().replace(" ", "").replace(".", "") != invite_app.nit:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="invite_nit_mismatch")
    elif get_settings().workshop_invite_required:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="invite_required")

    # Ensure profile exists
    p_result = await db.execute(select(Profile).where(Profile.id == uid))
    profile = p_result.scalar_one_or_none()
    if not profile:
        from app.services.auth import ensure_profile
        await ensure_profile(str(uid), db)
        p_result = await db.execute(select(Profile).where(Profile.id == uid))
        profile = p_result.scalar_one_or_none()

    # Check legal_id uniqueness
    existing = await db.execute(select(Workshop).where(Workshop.legal_id == body.legal_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="A workshop with this NIT/RUT is already registered")

    # Generate unique code
    code = ""
    for _ in range(20):
        candidate = _generate_code()
        c_result = await db.execute(select(Workshop).where(Workshop.code == candidate))
        if not c_result.scalar_one_or_none():
            code = candidate
            break
    if not code:
        raise HTTPException(status_code=500, detail="Could not generate a unique workshop code")

    workshop = Workshop(
        owner_id=uid,
        legal_id=body.legal_id,
        code=code,
        name=body.name,
        address=body.address,
        city=body.city,
        phone=body.phone,
        description=body.description,
    )
    # Mejor esfuerzo: ubica el pin del mapa de la ficha publica; si falla, el taller queda sin coordenadas.
    await apply_geocode(workshop)
    if invite_app is not None:
        workshop.business_kind = invite_app.business_kind
        workshop.is_verified = True  # la aprobación manual del admin es la verificación
        workshop.logo_url = workshop.logo_url or invite_app.logo_url
        workshop.specialties = [x.strip() for x in invite_app.specialties.split(",") if x.strip()]
        # El pin que la persona confirmó en el mapa de la postulación vale más que el geocodificado, si la dirección no cambió.
        if (invite_app.latitude is not None and invite_app.longitude is not None
                and (body.address or "").strip().lower() == invite_app.address.strip().lower()):
            workshop.latitude, workshop.longitude = invite_app.latitude, invite_app.longitude
        invite_app.invite_used_at = datetime.now(timezone.utc)
        invite_app.invite_used_by = uid
        # El acceso concedido al aprobar empieza hoy, al crear la cuenta (no al aprobar ni al registrarse como conductor).
        workshop_access.grant(workshop, invite_app.grant_plan, invite_app.grant_days)
    else:
        workshop_access.grant(workshop, workshop_access.PLAN_TRIAL, TRIAL_DAYS)
    db.add(workshop)
    await db.flush()

    # Update profile account_type
    profile.account_type = "taller"

    # Optionally create a test vehicle
    if body.plate:
        vehicle = Vehicle(
            owner_id=uid,
            plate=body.plate.upper(),
            city=body.vehicle_city or body.city or "",
            brand=body.brand or "",
            model=body.model or "",
            year=body.year or 0,
            type=body.vehicle_type or "",
            color=body.color or "",
        )
        db.add(vehicle)

    await db.flush()
    await db.refresh(workshop)
    return _me_out(workshop)


@router.get("/me", response_model=WorkshopMeOut)
async def get_my_workshop(
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get the workshop owned by the current user."""
    return _me_out(await verify_workshop(user_id, db))


@router.put("/me", response_model=WorkshopMeOut)
async def update_my_workshop(
    body: WorkshopUpdate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update the workshop owned by the current user.

    Was `body: WorkshopCreate` — WorkshopCreate requires legal_id/name with no
    default, so any partial save (e.g. WorkshopConfigTab.tsx saving just
    stamps_required/promotion_description) failed Pydantic validation with a
    422 the frontend never surfaced (apiPut swallows non-2xx into `null`).
    WorkshopUpdate makes every field optional, which is what a PATCH-style
    partial update actually needs.
    """
    workshop = await verify_workshop(user_id, db)
    update_data = body.model_dump(exclude_unset=True)
    address_before = (workshop.address, workshop.city)
    for key, val in update_data.items():
        setattr(workshop, key, val)
    # Solo se vuelve a geocodificar si cambio la direccion o la ciudad (un guardado de sellos no llama afuera).
    # Si el taller mando su propio pin (lo confirmo/arrastro en el mapa), ese manda.
    pin_sent = "latitude" in update_data and update_data["latitude"] is not None
    if (workshop.address, workshop.city) != address_before and not pin_sent:
        await apply_geocode(workshop)
    await db.flush()
    await db.refresh(workshop)
    return _me_out(workshop)


@router.post("/me/logo", response_model=WorkshopMeOut)
async def upload_my_logo(
    file: UploadFile,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Sube o cambia el logo del negocio. Se revisa y normaliza igual que el de la postulación (mín. 120 px, proporción
    razonable, recorte de márgenes, PNG) para que se vea bien en la ficha pública y, si autorizó, en la franja de aliados."""
    workshop = await verify_workshop(user_id, db)
    data = await validate_upload_file(file)
    if file.content_type == "application/pdf":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="file_type_not_allowed")
    try:
        data = await run_in_threadpool(prepare_logo, data)
    except LogoError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=e.code)
    await ensure_room(db, user_id, len(data))
    workshop.logo_url = await upload_file(data, f"{user_id}/logo-{uuid.uuid4()}.png", "image/png")
    await db.flush()
    await db.refresh(workshop)
    return _me_out(workshop)


@router.delete("/me/logo", response_model=WorkshopMeOut)
async def remove_my_logo(
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Quita el logo del negocio (la ficha pública deja de mostrarlo)."""
    workshop = await verify_workshop(user_id, db)
    workshop.logo_url = ""
    await db.flush()
    await db.refresh(workshop)
    return _me_out(workshop)


@router.get("/me/dashboard", response_model=WorkshopDashboardOut)
async def get_my_workshop_dashboard(
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Resumen agregado del panel de negocio — una sola llamada en vez de traer
    todo el dataset al frontend para contar ahí (lo que hacía tallerpro)."""
    workshop = await verify_workshop(user_id, db)
    wid = workshop.id

    active_orders = await db.scalar(
        select(func.count()).select_from(WorkOrder).where(
            WorkOrder.workshop_id == wid,
            WorkOrder.status.in_(["Pendiente", "En Proceso", "Diagnosticado", "Listo para Entrega"]),
        )
    )
    # func.current_date() (Postgres, UTC) — no date.today() (hora local del
    # proceso de Python). El servidor y la base pueden correr en timezones
    # distintos: con date.today() esto contaba mal "citas de hoy" cerca de la
    # medianoche UTC (bug real encontrado corriendo la app, no con tests).
    today_appts = await db.scalar(
        select(func.count()).select_from(Appointment).where(
            Appointment.workshop_id == wid,
            Appointment.appointment_date == func.current_date(),
            Appointment.status != "Cancelada",
        )
    )
    low_stock = await db.scalar(
        select(func.count()).select_from(WorkshopInventoryPart).where(
            WorkshopInventoryPart.workshop_id == wid,
            WorkshopInventoryPart.stock <= WorkshopInventoryPart.min_stock,
        )
    )
    total_clients = await db.scalar(
        select(func.count()).select_from(WorkshopClient).where(WorkshopClient.workshop_id == wid)
    )
    month_row = (
        await db.execute(
            select(
                func.coalesce(func.sum(WorkOrder.final_total), 0),
                func.coalesce(func.sum(WorkOrder.net_profit), 0),
            ).where(
                WorkOrder.workshop_id == wid,
                func.date_trunc("month", WorkOrder.entry_date) == func.date_trunc("month", func.now()),
            )
        )
    ).one()
    revenue, profit = Decimal(month_row[0]), Decimal(month_row[1])
    margin = float(profit / revenue * 100) if revenue > 0 else 0.0

    return WorkshopDashboardOut(
        active_work_orders=active_orders or 0,
        today_appointments=today_appts or 0,
        low_stock_alerts=low_stock or 0,
        current_month_revenue=revenue,
        current_month_profit=profit,
        avg_profit_margin=round(margin, 1),
        total_clients=total_clients or 0,
    )


_PUBLIC_RATE_MAX = 300      # consultas de ficha por hora por IP (alguien que abre muchos QR sigue holgado)
_PUBLIC_MISS_MAX = 30       # códigos que NO existen (o no están publicados) por hora por IP: más es adivinar códigos
_SEARCH_RATE_MAX = 240      # búsquedas de taller por hora por cuenta (el buscador escribe con retardo, ~1 por tecla)
_RATE_WINDOW = 3600


async def _count(key: str) -> int:
    """Suma 1 al contador de la ventana y devuelve el total (0 si no hay Redis: en local no se limita)."""
    r = await get_redis()
    if r is None:
        return 0
    n = await r.incr(key)
    if n == 1:
        await r.expire(key, _RATE_WINDOW)
    return int(n)


async def _peek(key: str) -> int:
    r = await get_redis()
    if r is None:
        return 0
    return int(await r.get(key) or 0)


@router.get("/search", response_model=list[WorkshopSearchResult])
async def search_workshops(
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    q: str = Query("", max_length=60),
    city: str = Query("", max_length=60),
):
    """Search workshops by code, name, or legal_id, optionally filtered by city.

    `q` was `Query("", min_length=1)` — contradictory, since FastAPI validates
    an explicitly-sent empty string against min_length (only an *omitted*
    param falls back to the default unvalidated). Every call with `q=""`
    (e.g. FichaTab.tsx's useWorkshops(), which searches with an empty term
    to list all workshops) 422'd silently — apiGet() swallows the failure
    into null, so the dropdown just always rendered empty. Found running the
    app in a real browser (docs/PLAN_MIGRACION_TALLERPRO.md)."""
    # Solo con sesión y con tope por cuenta: el directorio no es una lista que cualquiera pueda recorrer. El NIT ya no
    # es criterio de búsqueda (permitía confirmar qué NIT tiene un taller probando valores).
    if await _count(f"rate:ws:search:{user_id}") > _SEARCH_RATE_MAX:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail="rate_limited")
    query = select(Workshop)

    conditions = []
    if q:
        pattern = "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        conditions.append(
            or_(
                Workshop.code.ilike(pattern, escape="\\"),
                Workshop.name.ilike(pattern, escape="\\"),
            )
        )
    if city:
        conditions.append(Workshop.city.ilike("%" + city.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%", escape="\\"))

    if conditions:
        query = query.where(*conditions)

    query = query.order_by(Workshop.is_verified.desc(), Workshop.name.asc()).limit(20)

    result = await db.execute(query)
    workshops = list(result.scalars().all())
    return workshops


@router.get("/{code}", response_model=WorkshopPublicOut)
async def get_workshop_by_code(
    code: str,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get workshop by its TLR-XXXXX code (public) — ficha pública del taller
    (docs/PLAN_MIGRACION_TALLERPRO.md Fase 4.11), incluye mecánicos activos,
    catálogo de servicios y reseñas para evitar llamadas adicionales."""
    # Contra fuerza bruta: tope de consultas por IP y un tope más bajo de códigos que no existen.
    ip = client_ip(request)
    if await _count(f"rate:ws:pub:{ip}") > _PUBLIC_RATE_MAX or await _peek(f"rate:ws:miss:{ip}") >= _PUBLIC_MISS_MAX:
        raise HTTPException(status_code=429, detail="rate_limited")
    if len(code) > 16:  # ningún código real es así de largo: ni siquiera se consulta la base
        raise HTTPException(status_code=404, detail="Workshop not found")
    result = await db.execute(select(Workshop).where(Workshop.code == code.upper()))
    workshop = result.scalar_one_or_none()
    if not workshop:
        await _count(f"rate:ws:miss:{ip}")
        raise HTTPException(status_code=404, detail="Workshop not found")
    # Toggle "Publicar mi ficha pública" en Perfil del taller — un taller que
    # lo apagó no debe ser visible en su URL pública ni en su QR, aunque el
    # código exista. Detail distinto de "not found" para que el frontend
    # pueda mostrar un mensaje claro en vez de "taller no encontrado".
    if not workshop.is_published:
        await _count(f"rate:ws:miss:{ip}")
        raise HTTPException(status_code=404, detail="Workshop profile is not published")

    services = (
        await db.execute(
            select(WorkshopServiceItem)
            .where(WorkshopServiceItem.workshop_id == workshop.id)
            .order_by(WorkshopServiceItem.category, WorkshopServiceItem.name)
        )
    ).scalars().all()
    reviews = (
        await db.execute(
            select(WorkshopReview)
            .where(WorkshopReview.workshop_id == workshop.id)
            .order_by(WorkshopReview.review_date.desc())
            .limit(50)
        )
    ).scalars().all()

    # Se copian solo los campos de la lista blanca (sin tocar relaciones del modelo, que cargarían de más).
    fields = {f: getattr(workshop, f) for f in WorkshopPublicOut.model_fields if f not in ("service_items", "reviews")}
    return WorkshopPublicOut(
        **fields,
        service_items=[WorkshopPublicServiceOut.model_validate(s) for s in services],
        reviews=[WorkshopPublicReviewOut.model_validate(r) for r in reviews],
    )
