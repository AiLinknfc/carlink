from __future__ import annotations

import secrets
import string
import uuid
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, verify_workshop
from app.models.models import (
    Appointment,
    Profile,
    Vehicle,
    Workshop,
    WorkshopClient,
    WorkshopInventoryPart,
    WorkshopMechanic,
    WorkshopReview,
    WorkshopServiceItem,
    WorkOrder,
)
from app.schemas.schemas import (
    WorkshopCreate,
    WorkshopDashboardOut,
    WorkshopOut,
    WorkshopPublicOut,
    WorkshopSearchResult,
    WorkshopUpdate,
)

router = APIRouter(prefix="/workshops", tags=["workshops"])


def _generate_code() -> str:
    chars = string.ascii_uppercase + string.digits
    return "TLR-" + "".join(secrets.choice(chars) for _ in range(5))


@router.post("", response_model=WorkshopOut, status_code=status.HTTP_201_CREATED)
async def create_workshop(
    body: WorkshopCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Register a new workshop (taller). Optionally registers a test vehicle."""
    uid = uuid.UUID(user_id)

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
    return workshop


@router.get("/me", response_model=WorkshopOut)
async def get_my_workshop(
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get the workshop owned by the current user."""
    return await verify_workshop(user_id, db)


@router.put("/me", response_model=WorkshopOut)
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
    for key, val in update_data.items():
        setattr(workshop, key, val)
    await db.flush()
    await db.refresh(workshop)
    return workshop


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


@router.get("/search", response_model=list[WorkshopSearchResult])
async def search_workshops(
    db: Annotated[AsyncSession, Depends(get_db)],
    q: str = Query(""),
    city: str = Query(""),
):
    """Search workshops by code, name, or legal_id, optionally filtered by city.

    `q` was `Query("", min_length=1)` — contradictory, since FastAPI validates
    an explicitly-sent empty string against min_length (only an *omitted*
    param falls back to the default unvalidated). Every call with `q=""`
    (e.g. FichaTab.tsx's useWorkshops(), which searches with an empty term
    to list all workshops) 422'd silently — apiGet() swallows the failure
    into null, so the dropdown just always rendered empty. Found running the
    app in a real browser (docs/PLAN_MIGRACION_TALLERPRO.md)."""
    """Search workshops by code, name, or legal_id, optionally filtered by city."""
    query = select(Workshop)

    conditions = []
    if q:
        pattern = f"%{q}%"
        conditions.append(
            or_(
                Workshop.code.ilike(pattern),
                Workshop.name.ilike(pattern),
                Workshop.legal_id.ilike(pattern),
            )
        )
    if city:
        conditions.append(Workshop.city.ilike(f"%{city}%"))

    if conditions:
        query = query.where(*conditions)

    query = query.order_by(Workshop.is_verified.desc(), Workshop.name.asc()).limit(20)

    result = await db.execute(query)
    workshops = list(result.scalars().all())
    return workshops


@router.get("/{code}", response_model=WorkshopPublicOut)
async def get_workshop_by_code(
    code: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get workshop by its TLR-XXXXX code (public) — ficha pública del taller
    (docs/PLAN_MIGRACION_TALLERPRO.md Fase 4.11), incluye mecánicos activos,
    catálogo de servicios y reseñas para evitar llamadas adicionales."""
    result = await db.execute(select(Workshop).where(Workshop.code == code.upper()))
    workshop = result.scalar_one_or_none()
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")

    mechanics = (
        await db.execute(
            select(WorkshopMechanic)
            .where(WorkshopMechanic.workshop_id == workshop.id, WorkshopMechanic.active.is_(True))
            .order_by(WorkshopMechanic.name)
        )
    ).scalars().all()
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

    return WorkshopPublicOut(
        **WorkshopOut.model_validate(workshop).model_dump(),
        mechanics=list(mechanics),
        service_items=list(services),
        reviews=list(reviews),
    )
