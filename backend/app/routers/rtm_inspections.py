from __future__ import annotations

import hashlib
import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, verify_workshop
from app.models.models import Diagnostic, KmCertifyAttempt, OdometerReading, RtmInspection, Vehicle, Workshop, WorkshopClient, WorkshopVehicle
from app.routers.odometer import _service_history
from app.routers.vehicles import _plate_matches
from app.routers.workshop_applications import _rate_ok
from app.schemas.schemas import DealerDeliveryOut, RtmClaimIn, RtmClaimOut, RtmClaimPreviewOut, RtmCreate, RtmOut
from app.services import dealer_vehicles as dv_rules
from app.services import rtm as rtm_rules
from app.services.auth import ensure_profile
from app.services.cache import cache_delete, cache_invalidate_vehicle
from app.services.maintenance_rules import RuleError, check_mileage
from app.services.odometer import as_history, list_readings, utcnow
from app.services.workshop_gate import workshop_gate
from app.utils import client_ip

logger = logging.getLogger("carlink")

# Panel del CDA: registra revisiones técnico-mecánicas y las entrega al propietario (docs/PLAN_ALIADOS_NEGOCIO.md, sección 16).
router = APIRouter(prefix="/workshops/me/rtm", tags=["rtm"], dependencies=[Depends(workshop_gate("revisiones"))])
# Constancia pública (vista previa con el código) y aceptación por el propietario.
public_router = APIRouter(prefix="/rtm", tags=["rtm"])

_PUBLIC_RATE_MAX = 60
_today = lambda: datetime.now(timezone.utc).date()  # noqa: E731


def _hash(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def _out(r: RtmInspection, client: tuple[str, str] | None = None) -> RtmOut:
    now = utcnow()
    pending = bool(r.claim_code_hash and r.claimed_at is None and r.claim_expires_at and r.claim_expires_at > now)
    return RtmOut(
        id=r.id, plate=r.plate, inspected_on=r.inspected_on, expires_on=r.expires_on, days_left=rtm_rules.days_left(r.expires_on),
        certificate_code=r.certificate_code, result=r.result, mileage_km=r.mileage_km, notes=r.notes, claim_pending=pending,
        claimed=r.claimed_at is not None, claimed_at=r.claimed_at, share_with_cda=r.share_with_cda,
        client_name=client[0] if client else None, client_phone=client[1] if client else None, created_at=r.created_at,
    )


async def _clients_for(db: AsyncSession, workshop_id: uuid.UUID, rows: list[RtmInspection]) -> dict[uuid.UUID, tuple[str, str]]:
    """Nombre y teléfono del propietario, SOLO de quien autorizó compartirlos al aceptar la constancia."""
    ids = [r.claimed_vehicle_id for r in rows if r.share_with_cda and r.claimed_vehicle_id]
    if not ids:
        return {}
    found = (await db.execute(
        select(WorkshopVehicle.linked_vehicle_id, WorkshopClient.name, WorkshopClient.phone)
        .join(WorkshopClient, WorkshopClient.id == WorkshopVehicle.client_id)
        .where(WorkshopVehicle.workshop_id == workshop_id, WorkshopVehicle.linked_vehicle_id.in_(ids))
    )).all()
    return {vid: (name, phone) for vid, name, phone in found}


@router.post("", response_model=RtmOut, status_code=status.HTTP_201_CREATED)
async def register_inspection(body: RtmCreate, user_id: Annotated[str, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    """Registra una revisión. Exige CDA verificado, con acceso vigente y habilitado por CarLink; el kilometraje nunca puede ser
    menor al historial de la placa (en cualquier cuenta) y hay un tope de 3 intentos por placa cada 24 h."""
    workshop = await verify_workshop(user_id, db)
    blocked = dv_rules.certification_block(workshop)
    if blocked:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=blocked)
    plate = dv_rules.normalize_plate(body.plate)
    code = rtm_rules.normalize_certificate(body.certificate_code)
    rtm_rules.validate_dates(body.inspected_on, body.expires_on)

    attempt = (await db.execute(select(KmCertifyAttempt).where(KmCertifyAttempt.workshop_id == workshop.id, KmCertifyAttempt.plate == plate))).scalar_one_or_none()
    if attempt is None:
        attempt = KmCertifyAttempt(workshop_id=workshop.id, plate=plate, window_start=utcnow(), attempts=0)
        db.add(attempt)
    rtm_rules.bump_attempt(attempt)
    await db.commit()  # el intento cuenta aunque la revisión se rechace

    previous = (await db.execute(
        select(RtmInspection.mileage_km).where(RtmInspection.plate == plate).order_by(RtmInspection.mileage_km.desc()).limit(1)
    )).scalar()
    dv_rules.check_against_history(body.mileage_km, await dv_rules.history_max_km(db, plate), previous)
    row = RtmInspection(workshop_id=workshop.id, plate=plate, inspected_on=body.inspected_on, expires_on=body.expires_on, certificate_code=code,
                        result=body.result, mileage_km=body.mileage_km, notes=body.notes.strip())
    db.add(row)
    try:
        await db.flush()
    except IntegrityError:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="certificate_exists")
    await db.refresh(row)
    return _out(row)


@router.get("", response_model=list[RtmOut])
async def list_inspections(user_id: Annotated[str, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    workshop = await verify_workshop(user_id, db)
    rows = (await db.execute(select(RtmInspection).where(RtmInspection.workshop_id == workshop.id).order_by(RtmInspection.inspected_on.desc(), RtmInspection.created_at.desc()).limit(300))).scalars().all()
    clients = await _clients_for(db, workshop.id, rows)
    return [_out(r, clients.get(r.claimed_vehicle_id)) for r in rows]


@router.get("/upcoming", response_model=list[RtmOut])
async def upcoming_expirations(user_id: Annotated[str, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)], days: int = 45):
    """Revisiones aprobadas por vencer (o vencidas hace poco): la última de cada placa. Para avisar al cliente a mano (WhatsApp)."""
    workshop = await verify_workshop(user_id, db)
    days = max(1, min(days, 120))
    today = _today()
    rows = (await db.execute(
        select(RtmInspection).where(RtmInspection.workshop_id == workshop.id, RtmInspection.result == "approved",
                                    RtmInspection.expires_on >= today - timedelta(days=30))
        .order_by(RtmInspection.inspected_on.desc())
    )).scalars().all()
    latest: dict[str, RtmInspection] = {}
    for r in rows:
        latest.setdefault(r.plate, r)  # ya vienen de la más reciente a la más antigua
    due = sorted((r for r in latest.values() if r.expires_on <= today + timedelta(days=days)), key=lambda r: r.expires_on)
    clients = await _clients_for(db, workshop.id, due)
    return [_out(r, clients.get(r.claimed_vehicle_id)) for r in due]


@router.post("/{inspection_id}/claim-link", response_model=DealerDeliveryOut)
async def create_claim_link(inspection_id: uuid.UUID, user_id: Annotated[str, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    """Genera el enlace/QR de la constancia para el propietario. Se muestra una sola vez; generar otro invalida el anterior."""
    workshop = await verify_workshop(user_id, db)
    r = (await db.execute(select(RtmInspection).where(RtmInspection.id == inspection_id, RtmInspection.workshop_id == workshop.id))).scalar_one_or_none()
    if r is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="not_found")
    if r.claimed_at is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="already_claimed")
    raw = secrets.token_urlsafe(24)
    r.claim_code_hash, r.claim_expires_at = _hash(raw), utcnow() + timedelta(days=rtm_rules.CLAIM_DAYS)
    await db.flush()
    return DealerDeliveryOut(token=raw, expires_at=r.claim_expires_at, workshop_name=workshop.name)


# ───────────────────────────── propietario ─────────────────────────────

async def _by_code(db: AsyncSession, code: str) -> tuple[RtmInspection, Workshop]:
    row = (await db.execute(
        select(RtmInspection, Workshop).join(Workshop, Workshop.id == RtmInspection.workshop_id).where(RtmInspection.claim_code_hash == _hash(code))
    )).first()
    if row is None or row[0].claimed_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="claim_invalid")
    if row[0].claim_expires_at is None or row[0].claim_expires_at <= utcnow():
        raise HTTPException(status.HTTP_410_GONE, detail="claim_expired")
    return row[0], row[1]


async def _rate(request: Request) -> None:
    if not await _rate_ok("rtm", client_ip(request), _PUBLIC_RATE_MAX):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail="rate_limited")


@public_router.get("/claim/{code}", response_model=RtmClaimPreviewOut)
async def claim_preview(code: str, request: Request, db: Annotated[AsyncSession, Depends(get_db)]):
    await _rate(request)
    if not 20 <= len(code) <= 128:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="claim_invalid")
    r, w = await _by_code(db, code)
    return RtmClaimPreviewOut(plate=dv_rules.display_plate(r.plate), cda_name=w.name, cda_city=w.city, result=r.result, inspected_on=r.inspected_on,
                              expires_on=r.expires_on, certificate_code=r.certificate_code, mileage_km=r.mileage_km, expires_at=r.claim_expires_at)


@public_router.post("/claim", response_model=RtmClaimOut, status_code=status.HTTP_201_CREATED)
async def claim_inspection(body: RtmClaimIn, request: Request, user_id: Annotated[str, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    """El propietario acepta la constancia: debe tener en su cuenta un vehículo con esa placa. Se agrega un diagnóstico de revisión
    (con su vigencia) y, si el kilometraje es coherente con su historial, una lectura de odómetro certificada por el CDA.
    Solo comparte su nombre y WhatsApp con el CDA si lo autoriza."""
    await _rate(request)
    uid = uuid.UUID(user_id)
    r, w = await _by_code(db, body.code)
    profile = await ensure_profile(user_id, db)
    vehicle = (await db.execute(select(Vehicle).where(Vehicle.owner_id == uid, _plate_matches(r.plate)).order_by(Vehicle.created_at))).scalars().first()
    if vehicle is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="no_vehicle")

    ok = r.result == "approved"
    diag = Diagnostic(
        vehicle_id=vehicle.id, alert_type="cda", severity="info" if ok else "critical",
        description=f"Revisión técnico-mecánica {'aprobada' if ok else 'no aprobada'} en {w.name} ({w.city}). Certificado {r.certificate_code}.",
        cda_code=r.certificate_code, cda_expiry_date=r.expires_on,
    )
    db.add(diag)

    km_added = False
    readings = await list_readings(db, vehicle.id)
    try:
        check_mileage(r.mileage_km, _today(), await _service_history(db, vehicle.id), as_history(readings))
        db.add(OdometerReading(vehicle_id=vehicle.id, mileage=r.mileage_km, source="cda_inspection", certified_by_workshop_id=w.id, certification_kind="cda"))
        km_added = True
    except RuleError:
        km_added = False  # la lectura del CDA no cuadra con el historial del propietario: se guarda la revisión, no el kilometraje

    r.claimed_at, r.claimed_by, r.claimed_vehicle_id, r.share_with_cda, r.claim_code_hash = utcnow(), uid, vehicle.id, body.share_contact, None
    if body.share_contact:
        already = (await db.execute(select(WorkshopVehicle.id).where(WorkshopVehicle.workshop_id == w.id, WorkshopVehicle.linked_vehicle_id == vehicle.id))).first()
        if not already:
            client = WorkshopClient(workshop_id=w.id, name=(profile.full_name or (profile.email or "Cliente CarLink").split("@")[0])[:120],
                                    phone=profile.whatsapp_number or "", email=profile.email or "")
            db.add(client)
            await db.flush()
            db.add(WorkshopVehicle(workshop_id=w.id, client_id=client.id, linked_vehicle_id=vehicle.id, license_plate=r.plate,
                                   brand=vehicle.brand, model=vehicle.model, year=vehicle.year or None, color=vehicle.color, mileage=r.mileage_km))
    await db.flush()
    await cache_invalidate_vehicle(str(vehicle.id))
    await cache_delete(f"vehicles:list:{user_id}")
    return RtmClaimOut(vehicle_id=vehicle.id, plate=vehicle.plate, diagnostic_id=diag.id, km_added=km_added)
