from __future__ import annotations

import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, get_current_user_optional
from app.models.models import NfcToken, ShopOrder, Vehicle
from app.schemas.schemas import VehicleCreate, VehicleOut, VehicleUpdate, VehicleVerificationRequest
from app.services.auth import ensure_profile
from app.services.cache import (
    cache_delete,
    cache_get,
    cache_invalidate_vehicle,
    cache_set,
)
from app.services.nfc_provisioning import TRIAL_ACCOUNT_TYPES, generate_nfc_token

logger = logging.getLogger("carlink")

router = APIRouter(prefix="/vehicles", tags=["vehicles"])


@router.get("", response_model=list[VehicleOut])
async def list_vehicles(
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    cached = await cache_get(f"vehicles:list:{user_id}")
    if cached:
        return [VehicleOut(**v) for v in cached]

    result = await db.execute(
        select(Vehicle).where(Vehicle.owner_id == uuid.UUID(user_id)).order_by(Vehicle.created_at.desc())
    )
    vehicles = list(result.scalars().all())
    await cache_set(f"vehicles:list:{user_id}", [VehicleOut.model_validate(v).model_dump() for v in vehicles], ttl=120)
    return vehicles


@router.get("/plate-check")
async def check_plate(
    plate: str,
    user_id: Annotated[str | None, Depends(get_current_user_optional)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Público (no requiere sesión) — lo usa el checkout del llavero NFC para
    saber, antes de dejar avanzar la compra, si esa placa ya está asociada a
    un vehículo existente. Declarado antes de /{vehicle_id} a propósito: si
    quedara después, Starlette lo matchearía contra esa ruta primero y
    "plate-check" fallaría al intentar convertirse a UUID.

    No devuelve a quién pertenece la placa (evita filtrar datos de otra
    cuenta) — solo si existe y si es la cuenta que está consultando, para que
    el frontend distinga "verifica tu cuenta" (es de alguien más) de
    "contáctanos para reemplazo/duplicado" (ya es tuya).
    """
    normalized = re.sub(r"[^A-Z0-9]", "", plate.strip().upper())
    if not normalized:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="plate query param required")

    rows = (await db.execute(
        select(Vehicle.id, Vehicle.owner_id, Vehicle.verification_status).where(_plate_matches(normalized))
    )).all()
    if not rows:
        return {"exists": False, "owned_by_you": False, "has_active_keychain": False, "reserved_by_other": False}

    mine = [r for r in rows if user_id and str(r[1]) == user_id]
    owned_by_you = bool(mine)
    has_active_keychain = False
    if owned_by_you:
        # Solo se le revela al dueño. Un vehículo suyo sin llavero activo (registrado gratis)
        # debe poder comprar su primer llavero sin toparse con el bloqueo de "placa duplicada".
        has_active_keychain = bool((await db.execute(
            select(func.count(NfcToken.id)).where(
                NfcToken.vehicle_id.in_([r[0] for r in mine]),
                NfcToken.token_type == "personal",
                NfcToken.is_active.is_(True),
            )
        )).scalar())
    # Una placa la reserva sólo un vehículo verificado o con llavero activo
    # (regla 2026-09-18): un registro gratuito sin verificar no bloquea a otra
    # cuenta, que puede reclamarla verificando su tarjeta de propiedad.
    reserved_by_other = await _reserved_by_other(normalized, user_id, db)
    return {
        "exists": True,
        "owned_by_you": owned_by_you,
        "has_active_keychain": has_active_keychain,
        "reserved_by_other": reserved_by_other,
    }


def _plate_matches(normalized: str):
    return func.regexp_replace(func.upper(Vehicle.plate), r"[^A-Z0-9]", "", "g") == normalized


async def _reserved_by_other(normalized: str, user_id: str | None, db: AsyncSession) -> bool:
    """¿Otra cuenta tiene esta placa "reservada"? Reservada = su vehículo está
    verificado o tiene un llavero personal activo. Sin `user_id` (consulta
    pública) cualquier vehículo cuenta como "otro"."""
    active_keychain = select(NfcToken.id).where(
        NfcToken.vehicle_id == Vehicle.id,
        NfcToken.token_type == "personal",
        NfcToken.is_active.is_(True),
    ).exists()
    q = select(func.count(Vehicle.id)).where(
        _plate_matches(normalized),
        or_(Vehicle.verification_status == "verified", active_keychain),
    )
    if user_id:
        q = q.where(Vehicle.owner_id != uuid.UUID(user_id))
    return bool((await db.execute(q)).scalar())


async def _spare_keychains(uid: uuid.UUID, db: AsyncSession) -> int:
    """Llaveros comprados que todavía no respaldan ningún vehículo.

    Regla (2026-09-18): el primer vehículo de una cuenta persona es gratis;
    cada vehículo adicional necesita su propio llavero comprado, aunque el
    código todavía esté pendiente de activar. Por eso no basta con restar los
    llaveros ya activados: todo vehículo sin llavero activado, salvo uno (el
    gratis), ya tiene "reservado" un llavero comprado.

        spare = comprados - activados - max(vehículos_sin_llavero - 1, 0)

    Los tokens de prueba (token_type='trial') no cuentan como activados — el
    trial no consume un llavero comprado."""
    purchased = (await db.execute(
        select(func.coalesce(func.sum(ShopOrder.quantity), 0)).where(
            ShopOrder.user_id == uid, ShopOrder.status == "approved"
        )
    )).scalar() or 0
    claimed = (await db.execute(
        select(func.count(NfcToken.id)).where(
            NfcToken.user_id == uid, NfcToken.token_type == "personal"
        )
    )).scalar() or 0
    without_keychain = (await db.execute(
        select(func.count(Vehicle.id)).where(
            Vehicle.owner_id == uid,
            ~select(NfcToken.id).where(
                NfcToken.vehicle_id == Vehicle.id, NfcToken.token_type == "personal"
            ).exists(),
        )
    )).scalar() or 0
    return max(purchased - claimed - max(without_keychain - 1, 0), 0)


@router.get("/keychain-availability")
async def get_keychain_availability(
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Cuántos vehículos adicionales puede registrar la cuenta (llaveros
    comprados sin vehículo asignado) — gatea el botón "Agregar vehículo" en
    el frontend y es la misma cuenta que POST /vehicles aplica en el backend.
    Declarado antes de /{vehicle_id} por el mismo motivo que /plate-check."""
    return {"available": await _spare_keychains(uuid.UUID(user_id), db)}


@router.get("/{vehicle_id}", response_model=VehicleOut)
async def get_vehicle(
    vehicle_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    cached = await cache_get(f"vehicles:{vehicle_id}")
    if cached:
        return VehicleOut(**cached)

    result = await db.execute(
        select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.owner_id == uuid.UUID(user_id))
    )
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    await cache_set(f"vehicles:{vehicle_id}", VehicleOut.model_validate(vehicle).model_dump(), ttl=120)
    return vehicle


@router.post("", response_model=VehicleOut, status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    body: VehicleCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    uid = uuid.UUID(user_id)
    logger.info(f"Creating vehicle for user {user_id}: plate={body.plate}, brand={body.brand}, model={body.model}")
    try:
        profile = await ensure_profile(user_id, db)
        logger.info(f"Profile ensured for user {user_id}")
    except Exception as e:
        logger.error(f"Failed to ensure profile for user {user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo crear el perfil. Verifica tu conexión e intenta de nuevo.",
        )

    existing = await db.execute(
        select(Vehicle).where(Vehicle.owner_id == uid, Vehicle.plate == body.plate.upper())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This plate is already registered")

    # Placa reservada por otra cuenta (verificada o con llavero activo): no se
    # puede registrar acá. Un registro gratuito sin verificar de otra cuenta
    # NO bloquea — ver plate-check. Sin esto el bloqueo vivía sólo en el frontend.
    if await _reserved_by_other(re.sub(r"[^A-Z0-9]", "", body.plate.upper()), user_id, db):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Esta placa ya está verificada o activa en otra cuenta. Si es tuya, contacta a soporte.",
        )

    # Only this account's very first vehicle is eligible for the free trial
    # below — checked before insert so the new row doesn't count itself.
    # Decision (2026-08-07): a taller/empresa that wants a 2nd+ vehicle with
    # a working public ficha needs to buy and claim a physical keychain for
    # it, same as any additional vehicle for a persona account. Without this
    # check every vehicle a business account ever created got its own free
    # 7-day trial with no limit.
    other_vehicles_count = (
        await db.execute(select(func.count(Vehicle.id)).where(Vehicle.owner_id == uid))
    ).scalar() or 0
    is_first_vehicle = other_vehicles_count == 0

    # Cuentas persona: el primer vehículo es gratis, del segundo en adelante
    # hace falta un llavero comprado sin vehículo (ver _spare_keychains). El
    # botón del frontend ya lo bloquea, pero sin esta validación cualquiera
    # podía crear vehículos sin límite llamando al endpoint directo. Los
    # talleres/empresas no necesitan llavero.
    if profile.account_type == "persona" and other_vehicles_count >= 1:
        if await _spare_keychains(uid, db) < 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Para agregar otro vehículo necesitas comprar un llavero NFC.",
            )

    vehicle = Vehicle(
        owner_id=uid,
        plate=body.plate.upper(),
        city=body.city,
        brand=body.brand,
        model=body.model,
        year=body.year,
        type=body.type,
        color=body.color,
        image_url=body.image_url,
    )
    db.add(vehicle)
    try:
        await db.flush()
        await db.refresh(vehicle)
    except Exception as e:
        logger.error(f"Failed to create vehicle for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Vehicle creation failed: {e}")
    await cache_delete(f"vehicles:list:{user_id}")
    logger.info(f"Vehicle created successfully: {vehicle.id}")

    # Taller/empresa accounts get a free 7-day public-ficha trial on their
    # first vehicle only, minted automatically — no physical keychain
    # involved. Persona never gets this; it always requires claiming a real
    # keychain (see app/routers/nfc.py _has_ficha_access). Best-effort: a
    # failure here must not block vehicle registration.
    if profile.account_type in TRIAL_ACCOUNT_TYPES and is_first_vehicle:
        try:
            generated = generate_nfc_token()
            trial_token = NfcToken(
                user_id=uid,
                vehicle_id=vehicle.id,
                token_hash=generated.token_hash,
                token_prefix=generated.token_prefix,
                qr_slug=generated.qr_slug,
                token_type="trial",
                label="Ficha de prueba (7 días)",
            )
            db.add(trial_token)
            await db.flush()
            if generated.token_url_encrypted:
                await db.execute(
                    text("UPDATE nfc_tokens SET token_url_encrypted = :url WHERE id = :id"),
                    {"url": generated.token_url_encrypted, "id": str(trial_token.id)},
                )
                await db.flush()
        except Exception as e:
            logger.error(f"Failed to mint trial NFC token for vehicle {vehicle.id}: {e}", exc_info=True)

    return vehicle


@router.put("/{vehicle_id}", response_model=VehicleOut)
async def update_vehicle(
    vehicle_id: UUID,
    body: VehicleUpdate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.owner_id == uuid.UUID(user_id))
    )
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    # plate/city/type ya no existen en VehicleUpdate: Pydantic los descarta aunque
    # el cliente los mande, así que el congelado es efectivo aquí.
    update_data = body.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(vehicle, key, val)

    await db.flush()
    await db.refresh(vehicle)
    await cache_invalidate_vehicle(str(vehicle_id))
    return vehicle


@router.post("/{vehicle_id}/verification", response_model=VehicleOut)
async def request_vehicle_verification(
    vehicle_id: UUID,
    body: VehicleVerificationRequest,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """El dueño sube la tarjeta de propiedad de ESTE vehículo y queda a la espera
    de revisión. Por vehículo, no por cuenta (2026-09-19, antes vivía en
    POST /auth/me/verification) — verificar una tarjeta no puede habilitar
    transferir/vender otros vehículos de la misma cuenta que nunca se revisaron.

    Deliberadamente no puede pasar a "verified" por sí mismo: subir un archivo no
    acredita nada, así que este endpoint sólo llega hasta "pending".
    """
    result = await db.execute(
        select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.owner_id == uuid.UUID(user_id))
    )
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    if vehicle.verification_status == "verified":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El vehículo ya está verificado")
    # Ambas caras obligatorias (2026-09-18) — front-only ya no alcanza.
    if not body.verification_doc_url or not body.verification_doc_url_back:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falta el frente o el reverso del documento")

    vehicle.verification_doc_url = body.verification_doc_url
    vehicle.verification_doc_url_back = body.verification_doc_url_back
    vehicle.verification_status = "pending"
    vehicle.verification_note = ""
    vehicle.verification_requested_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(vehicle)
    await cache_invalidate_vehicle(str(vehicle_id))
    return vehicle


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vehicle(
    vehicle_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.owner_id == uuid.UUID(user_id))
    )
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    await db.delete(vehicle)
    await cache_invalidate_vehicle(str(vehicle_id))


@router.patch("/{vehicle_id}/nfc-toggle", response_model=VehicleOut)
async def toggle_nfc_visibility(
    vehicle_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.owner_id == uuid.UUID(user_id))
    )
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    vehicle.nfc_active = not vehicle.nfc_active
    await db.flush()
    await db.refresh(vehicle)
    await cache_invalidate_vehicle(str(vehicle_id))
    return vehicle


@router.patch("/{vehicle_id}/lost-keychain-toggle", response_model=VehicleOut)
async def toggle_lost_keychain(
    vehicle_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.owner_id == uuid.UUID(user_id))
    )
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    vehicle.lost_keychain_enabled = not vehicle.lost_keychain_enabled
    await db.flush()
    await db.refresh(vehicle)
    await cache_invalidate_vehicle(str(vehicle_id))
    return vehicle


@router.patch("/{vehicle_id}/georeference-toggle", response_model=VehicleOut)
async def toggle_georeference(
    vehicle_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.owner_id == uuid.UUID(user_id))
    )
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    vehicle.georeference_enabled = not vehicle.georeference_enabled
    await db.flush()
    await db.refresh(vehicle)
    await cache_invalidate_vehicle(str(vehicle_id))
    return vehicle
