from __future__ import annotations

import hashlib
import logging
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, verify_workshop
from app.models.models import DealerVehicle, OdometerReading, Vehicle, Workshop, WorkshopClient, WorkshopVehicle
from app.routers.vehicles import _plate_matches, _reserved_by_other, _spare_keychains
from app.routers.workshop_applications import _rate_ok
from app.routers.workshop_services import _clean_photo_url
from app.schemas.schemas import (
    DealerCertifyIn,
    DealerClaimIn,
    DealerClaimOut,
    DealerDeliveryOut,
    DealerDeliveryPreviewOut,
    DealerPublicOut,
    DealerVehicleCreate,
    DealerVehicleOut,
    DealerVehicleUpdate,
)
from app.services import dealer_vehicles as dv_rules
from app.services import workshop_access
from app.services.auth import ensure_profile
from app.services.cache import cache_delete
from app.services.nfc_provisioning import generate_human_code
from app.services.workshop_gate import workshop_gate
from app.utils import client_ip

logger = logging.getLogger("carlink")

# Panel del concesionario / compraventa: su inventario, ficha pública, kilometraje y entrega (docs/PLAN_ALIADOS_NEGOCIO.md, sección 15).
router = APIRouter(prefix="/workshops/me/dealer-vehicles", tags=["dealer-vehicles"], dependencies=[Depends(workshop_gate("vehiculos_venta"))])
# Público (ficha del vehículo en venta, vista previa de la entrega) y del comprador (recibir la entrega).
public_router = APIRouter(prefix="/dealer-vehicles", tags=["dealer-vehicles"])

_PUBLIC_RATE_MAX = 60   # consultas por hora por IP
_NOW = lambda: datetime.now(timezone.utc)  # noqa: E731


def _hash(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def _out(dv: DealerVehicle) -> DealerVehicleOut:
    pending = bool(dv.delivery_code_hash and dv.status == "available" and dv.delivery_expires_at and dv.delivery_expires_at > _NOW())
    return DealerVehicleOut(
        id=dv.id, plate=dv.plate, brand=dv.brand, model=dv.model, year=dv.year, color=dv.color, vehicle_class=dv.vehicle_class,
        mileage_declared=dv.mileage_declared, price_cop=dv.price_cop, description=dv.description, photo_urls=list(dv.photo_urls or []), status=dv.status,
        is_listed=dv.is_listed, public_slug=dv.public_slug, certified_km=dv.certified_km, certified_at=dv.certified_at,
        certification_kind=dv.certification_kind, certification_label=dv_rules.label(dv.certification_kind),
        delivery_pending=pending, delivery_expires_at=dv.delivery_expires_at if pending else None,
        delivered_at=dv.delivered_at, share_with_dealer=dv.share_with_dealer, created_at=dv.created_at,
    )


async def _mine(db: AsyncSession, user_id: str, vehicle_id: uuid.UUID) -> tuple[Workshop, DealerVehicle]:
    workshop = await verify_workshop(user_id, db)
    dv = (await db.execute(select(DealerVehicle).where(DealerVehicle.id == vehicle_id, DealerVehicle.workshop_id == workshop.id))).scalar_one_or_none()
    if dv is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="not_found")
    return workshop, dv


def _clean_photos(urls: list[str], user_id: str) -> list[str]:
    """Hasta 6 fotos, todas archivos subidos por ESTE aliado (la ficha pública las pinta tal cual); sin repetidas."""
    clean: list[str] = []
    for u in urls:
        c = _clean_photo_url(u, user_id)
        if c and c not in clean:
            clean.append(c)
    return clean[:6]


@router.get("", response_model=list[DealerVehicleOut])
async def list_vehicles(user_id: Annotated[str, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    workshop = await verify_workshop(user_id, db)
    rows = (await db.execute(select(DealerVehicle).where(DealerVehicle.workshop_id == workshop.id).order_by(DealerVehicle.created_at.desc()))).scalars().all()
    return [_out(r) for r in rows]


@router.post("", response_model=DealerVehicleOut, status_code=status.HTTP_201_CREATED)
async def create_vehicle(body: DealerVehicleCreate, user_id: Annotated[str, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    workshop = await verify_workshop(user_id, db)
    plate = dv_rules.normalize_plate(body.plate)
    count = (await db.execute(select(func.count(DealerVehicle.id)).where(DealerVehicle.workshop_id == workshop.id))).scalar() or 0
    if count >= dv_rules.MAX_VEHICLES_PER_DEALER:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="inventory_limit")
    if (await db.execute(select(DealerVehicle.id).where(DealerVehicle.workshop_id == workshop.id, DealerVehicle.plate == plate))).first():
        raise HTTPException(status.HTTP_409_CONFLICT, detail="plate_exists")
    data = body.model_dump()
    data["plate"] = plate
    data["photo_urls"] = _clean_photos(data["photo_urls"], user_id)
    for k in ("brand", "model", "color", "vehicle_class", "description"):
        data[k] = data[k].strip()
    dv = DealerVehicle(workshop_id=workshop.id, public_slug=generate_human_code(8), **data)
    db.add(dv)
    try:
        await db.flush()
    except IntegrityError:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="plate_exists")
    await db.refresh(dv)
    return _out(dv)


@router.patch("/{vehicle_id}", response_model=DealerVehicleOut)
async def update_vehicle(vehicle_id: uuid.UUID, body: DealerVehicleUpdate, user_id: Annotated[str, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    _, dv = await _mine(db, user_id, vehicle_id)
    if dv.status == "delivered":
        raise HTTPException(status.HTTP_409_CONFLICT, detail="already_delivered")
    changes = body.model_dump(exclude_unset=True)
    if "photo_urls" in changes:
        changes["photo_urls"] = _clean_photos(changes["photo_urls"] or [], user_id)
    for k, v in changes.items():
        setattr(dv, k, v.strip() if isinstance(v, str) else v)
    await db.flush()
    await db.refresh(dv)
    return _out(dv)


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vehicle(vehicle_id: uuid.UUID, user_id: Annotated[str, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    _, dv = await _mine(db, user_id, vehicle_id)
    if dv.status == "delivered":
        raise HTTPException(status.HTTP_409_CONFLICT, detail="already_delivered")  # la entrega es parte del historial del comprador
    await db.delete(dv)


class ListingIn(BaseModel):
    listed: bool


@router.post("/{vehicle_id}/listing", response_model=DealerVehicleOut)
async def set_listing(vehicle_id: uuid.UUID, body: ListingIn, user_id: Annotated[str, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    """Publica o retira la ficha pública del vehículo. Solo un negocio verificado puede publicar."""
    workshop, dv = await _mine(db, user_id, vehicle_id)
    if dv.status == "delivered":
        raise HTTPException(status.HTTP_409_CONFLICT, detail="already_delivered")
    if body.listed and not workshop.is_verified:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="not_verified")
    dv.is_listed = body.listed
    await db.flush()
    await db.refresh(dv)
    return _out(dv)


@router.post("/{vehicle_id}/certify-km", response_model=DealerVehicleOut)
async def certify_km(vehicle_id: uuid.UUID, body: DealerCertifyIn, user_id: Annotated[str, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    """Certifica (concesionario) o declara (compraventa) el kilometraje con el que sale el vehículo. Exige negocio verificado,
    con acceso vigente y habilitado por el admin; nunca puede ser menor al historial que CarLink ya tenga de esa placa."""
    workshop, dv = await _mine(db, user_id, vehicle_id)
    if dv.status == "delivered":
        raise HTTPException(status.HTTP_409_CONFLICT, detail="already_delivered")
    blocked = dv_rules.certification_block(workshop)
    if blocked:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=blocked)
    dv_rules.register_attempt(dv)
    # El intento se cuenta aunque falle: se confirma ya (commit) para que un rechazo no lo devuelva atrás.
    await db.commit()
    dv_rules.check_against_history(body.km, await dv_rules.history_max_km(db, dv.plate), dv.certified_km)
    dv.certified_km, dv.certified_at = body.km, _NOW()
    dv.certification_kind = dv_rules.KIND_FOR_BUSINESS[workshop.business_kind]
    await db.flush()
    await db.refresh(dv)
    return _out(dv)


@router.post("/{vehicle_id}/delivery", response_model=DealerDeliveryOut)
async def create_delivery(vehicle_id: uuid.UUID, user_id: Annotated[str, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    """Genera el enlace/QR de entrega para el comprador. Se muestra una sola vez; generar uno nuevo invalida el anterior."""
    workshop, dv = await _mine(db, user_id, vehicle_id)
    if dv.status == "delivered":
        raise HTTPException(status.HTTP_409_CONFLICT, detail="already_delivered")
    if not workshop.is_verified:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="not_verified")
    raw = secrets.token_urlsafe(24)
    dv.delivery_code_hash = _hash(raw)
    dv.delivery_expires_at = _NOW() + timedelta(days=dv_rules.DELIVERY_DAYS)
    await db.flush()
    return DealerDeliveryOut(token=raw, expires_at=dv.delivery_expires_at, workshop_name=workshop.name)


# ───────────────────────────── público y comprador ─────────────────────────────

def _mileage(dv: DealerVehicle) -> tuple[int, str, bool]:
    if dv.certified_km is not None:
        return dv.certified_km, dv_rules.label(dv.certification_kind), True
    return dv.mileage_declared, dv_rules.label(None), False


async def _rate(request: Request) -> None:
    if not await _rate_ok("dealer", client_ip(request), _PUBLIC_RATE_MAX):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail="rate_limited")


@public_router.get("/public/{slug}", response_model=DealerPublicOut)
async def public_vehicle(slug: str, request: Request, db: Annotated[AsyncSession, Depends(get_db)]):
    await _rate(request)
    if not re.fullmatch(r"[A-Z0-9]{8}", slug.upper()):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="not_found")
    row = (await db.execute(
        select(DealerVehicle, Workshop).join(Workshop, Workshop.id == DealerVehicle.workshop_id)
        .where(DealerVehicle.public_slug == slug.upper(), DealerVehicle.is_listed.is_(True), DealerVehicle.status == "available")
    )).first()
    # Si el negocio dejó de estar verificado o perdió el acceso, la ficha deja de verse (404, no "error").
    if row is None or not row[1].is_verified or not workshop_access.is_active(row[1]):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="not_found")
    dv, w = row
    km, km_label, certified = _mileage(dv)
    return DealerPublicOut(
        slug=dv.public_slug, brand=dv.brand, model=dv.model, year=dv.year, color=dv.color, vehicle_class=dv.vehicle_class,
        plate_hint=dv_rules.plate_hint(dv.plate), mileage_km=km, mileage_label=km_label, mileage_certified=certified,
        certified_at=dv.certified_at, price_cop=dv.price_cop, description=dv.description, photo_urls=list(dv.photo_urls or []),
        dealer_name=w.name if w.is_published else "Aliado CarLink", dealer_city=w.city,
        dealer_code=w.code if w.is_published else None, dealer_verified=w.is_verified,
    )


async def _by_code(db: AsyncSession, code: str) -> tuple[DealerVehicle, Workshop]:
    row = (await db.execute(
        select(DealerVehicle, Workshop).join(Workshop, Workshop.id == DealerVehicle.workshop_id)
        .where(DealerVehicle.delivery_code_hash == _hash(code))
    )).first()
    if row is None or row[0].status != "available":
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="delivery_invalid")
    if row[0].delivery_expires_at is None or row[0].delivery_expires_at <= _NOW():
        raise HTTPException(status.HTTP_410_GONE, detail="delivery_expired")
    return row[0], row[1]


@public_router.get("/delivery/{code}", response_model=DealerDeliveryPreviewOut)
async def delivery_preview(code: str, request: Request, db: Annotated[AsyncSession, Depends(get_db)]):
    await _rate(request)
    if not 20 <= len(code) <= 128:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="delivery_invalid")
    dv, w = await _by_code(db, code)
    km, km_label, _ = _mileage(dv)
    return DealerDeliveryPreviewOut(plate=dv_rules.display_plate(dv.plate), brand=dv.brand, model=dv.model, year=dv.year, color=dv.color, mileage_km=km,
                                    mileage_label=km_label, dealer_name=w.name, dealer_city=w.city, expires_at=dv.delivery_expires_at)


@public_router.post("/claim", response_model=DealerClaimOut, status_code=status.HTTP_201_CREATED)
async def claim_delivery(body: DealerClaimIn, request: Request, user_id: Annotated[str, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    """El comprador recibe el vehículo en su cuenta. Aplica las mismas reglas que registrar un vehículo (placa propia ya
    registrada, placa reservada por otra cuenta, cupo de llaveros de una cuenta persona). El kilometraje entra como lectura
    certificada por el aliado; los datos de contacto solo se comparten si el comprador lo autoriza."""
    await _rate(request)
    uid = uuid.UUID(user_id)
    dv, w = await _by_code(db, body.code)
    profile = await ensure_profile(user_id, db)
    if (await db.execute(select(Vehicle.id).where(Vehicle.owner_id == uid, _plate_matches(dv.plate)))).first():
        raise HTTPException(status.HTTP_409_CONFLICT, detail="plate_already_yours")
    if await _reserved_by_other(dv.plate, user_id, db):
        raise HTTPException(status.HTTP_409_CONFLICT, detail="plate_reserved")
    others = (await db.execute(select(func.count(Vehicle.id)).where(Vehicle.owner_id == uid))).scalar() or 0
    if profile.account_type == "persona" and others >= 1 and await _spare_keychains(uid, db) < 1:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="keychain_required")

    vehicle = Vehicle(owner_id=uid, plate=dv_rules.display_plate(dv.plate), city=w.city, brand=dv.brand, model=dv.model, year=dv.year or 0,
                      type=dv.vehicle_class, color=dv.color)
    db.add(vehicle)
    await db.flush()
    km, _, certified = _mileage(dv)
    if km > 0:
        db.add(OdometerReading(
            vehicle_id=vehicle.id, mileage=km, source="dealer_delivery" if certified else "initial",
            certified_by_workshop_id=w.id if certified else None, certification_kind=dv.certification_kind if certified else None,
        ))
    dv.status, dv.delivered_at, dv.delivered_to_user_id, dv.delivered_vehicle_id = "delivered", _NOW(), uid, vehicle.id
    dv.share_with_dealer, dv.is_listed, dv.delivery_code_hash = body.share_contact, False, None
    if body.share_contact:
        client = WorkshopClient(workshop_id=w.id, name=(profile.full_name or (profile.email or "Cliente CarLink").split("@")[0])[:120],
                                phone=profile.whatsapp_number or "", email=profile.email or "")
        db.add(client)
        await db.flush()
        db.add(WorkshopVehicle(workshop_id=w.id, client_id=client.id, linked_vehicle_id=vehicle.id, license_plate=dv.plate,
                               brand=dv.brand, model=dv.model, year=dv.year, color=dv.color, mileage=km))
    await db.flush()
    await cache_delete(f"vehicles:list:{user_id}")
    return DealerClaimOut(vehicle_id=vehicle.id, plate=dv.plate)
