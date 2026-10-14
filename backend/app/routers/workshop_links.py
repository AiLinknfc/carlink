"""Vínculo taller-conductor por QR — docs/PLAN_VINCULO_TALLER_CONDUCTOR.md.

Todo está detrás de `WORKSHOP_LINKS_ENABLED` (apagado por defecto): con el flag apagado cada ruta responde 404 y
el resto de la app se comporta exactamente como antes.

Reglas que no se negocian (ver el plan, sección 3):
- Lo inicia siempre el conductor. El taller solo ofrece enlaces; nunca vincula a nadie por su cuenta.
- Vínculo y procedencia son distintos: nada de aquí escribe `workshop_id` ni `origin='workshop'` en un servicio
  del conductor. Eso solo lo hacen las órdenes de trabajo (`work_orders.py`), y sólo si el conductor aceptó.
- Los enlaces de reclamo son de un solo uso, caducan a los 7 días y se guardan con hash.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, verify_workshop
from app.models.models import (
    MaintenanceRecord, Profile, Vehicle, Workshop, WorkshopClaimToken, WorkshopClientLink, WorkOrder, WorkshopVehicle,
)
from app.routers.work_orders import backfill_linked_orders
from app.schemas.schemas import (
    WorkshopCandidateConfirm, WorkshopCandidateOut, WorkshopCandidateResult, WorkshopClaimInfoOut,
    WorkshopClaimResult, WorkshopClaimTokenOut, WorkshopClientLinkTallerOut, WorkshopLinkClaim,
    WorkshopLinkCreate, WorkshopLinkOut, WorkshopLinksStatusOut,
)
from app.services.cache import get_redis
from app.services.workshop_links import (
    MAX_LINKS_PER_USER, city_compatible, hash_token, links_enabled, maintenance_claims, mask_plate,
    names_match, new_claim_token, normalize_plate,
)
from app.utils import client_ip

router = APIRouter(prefix="/workshop-links", tags=["workshop-links"])
taller_router = APIRouter(prefix="/workshops/me", tags=["workshop-links"])

_UNREGISTERED = "Taller no registrado"
_RATE_WINDOW, _RATE_MAX = 60, 30


def _require_enabled() -> None:
    if not links_enabled():
        # 404 y no 403: con el flag apagado la funcion simplemente no existe.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")


Enabled = Depends(_require_enabled)


async def _check_rate(ip: str) -> bool:
    r = await get_redis()
    if r is None:
        return True
    key = f"rate:wlink:{ip}"
    count = await r.incr(key)
    if count == 1:
        await r.expire(key, _RATE_WINDOW)
    return count <= _RATE_MAX


async def _owned_vehicle(vehicle_id: UUID, user_id: str, db: AsyncSession) -> Vehicle:
    v = (await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.owner_id == UUID(user_id)))).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehículo no encontrado")
    return v


def _link_out(link: WorkshopClientLink, workshop: Workshop, vehicle: Vehicle) -> WorkshopLinkOut:
    return WorkshopLinkOut(
        id=link.id, workshop_code=workshop.code, workshop_name=workshop.name, workshop_city=workshop.city or "",
        vehicle_id=vehicle.id, plate=vehicle.plate, origin=link.origin,
        consent_share_contact=link.consent_share_contact, created_at=link.created_at,
    )


async def _upsert_link(
    db: AsyncSession, *, workshop: Workshop, vehicle: Vehicle, user_id: str, origin: str, share_contact: bool,
) -> WorkshopClientLink:
    """Crea el vínculo o reactiva uno revocado. Idempotente; no cambia el origen de uno ya activo."""
    uid = UUID(user_id)
    link = (await db.execute(
        select(WorkshopClientLink).where(WorkshopClientLink.workshop_id == workshop.id, WorkshopClientLink.vehicle_id == vehicle.id)
    )).scalar_one_or_none()
    if link and link.status == "active":
        link.consent_share_contact = share_contact
        return link
    if not link:
        active = await db.scalar(
            select(func.count()).select_from(WorkshopClientLink).where(WorkshopClientLink.user_id == uid, WorkshopClientLink.status == "active")
        ) or 0
        if active >= MAX_LINKS_PER_USER:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Llegaste al límite de talleres vinculados")
        link = WorkshopClientLink(workshop_id=workshop.id, vehicle_id=vehicle.id, user_id=uid, origin=origin)
        db.add(link)
    link.status, link.revoked_at, link.origin = "active", None, origin
    link.consent_share_contact, link.consent_at = share_contact, datetime.now(timezone.utc)
    await db.flush()
    return link


async def _attach_and_backfill(db: AsyncSession, workshop: Workshop, vehicle: Vehicle) -> int:
    """El conductor ya aceptó: los vehículos del taller con esa placa quedan ligados a su cuenta (para que las
    próximas órdenes le lleguen) y se trae lo ya entregado y pagado. Devuelve las órdenes elegibles."""
    synced = 0
    wvs = (await db.execute(select(WorkshopVehicle).where(WorkshopVehicle.workshop_id == workshop.id))).scalars().all()
    for wv in wvs:
        if normalize_plate(wv.license_plate) != normalize_plate(vehicle.plate):
            continue
        if wv.linked_vehicle_id not in (None, vehicle.id):
            continue  # ya ligado a otra cuenta: no se pisa
        wv.linked_vehicle_id = vehicle.id
        synced += await backfill_linked_orders(wv, workshop, db)
    return synced


# =========== Públicas ===========

@router.get("/status", response_model=WorkshopLinksStatusOut)
async def links_status():
    return WorkshopLinksStatusOut(enabled=links_enabled())


@router.get("/claim/{token}", response_model=WorkshopClaimInfoOut, dependencies=[Enabled])
async def claim_info(token: str, request: Request, db: Annotated[AsyncSession, Depends(get_db)]):
    """Qué taller te invitó, antes de iniciar sesión. 404 uniforme si el enlace no existe, venció o ya se usó."""
    if not await _check_rate(client_ip(request)):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many requests. Try again later.")
    row = await _valid_token(token, db)
    wv = (await db.execute(select(WorkshopVehicle).where(WorkshopVehicle.id == row.workshop_vehicle_id))).scalar_one()
    ws = (await db.execute(select(Workshop).where(Workshop.id == row.workshop_id))).scalar_one()
    return WorkshopClaimInfoOut(
        workshop_code=ws.code, workshop_name=ws.name, plate_hint=mask_plate(wv.license_plate), brand=wv.brand, model=wv.model,
    )


async def _valid_token(raw: str, db: AsyncSession) -> WorkshopClaimToken:
    row = (await db.execute(select(WorkshopClaimToken).where(WorkshopClaimToken.token_hash == hash_token(raw)))).scalar_one_or_none()
    if not row or row.used_at is not None or row.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enlace no válido o vencido")
    return row


async def _is_business_account(user_id: str, db: AsyncSession) -> bool:
    acct = (await db.execute(select(Profile.account_type).where(Profile.id == UUID(user_id)))).scalar_one_or_none()
    return acct in ("taller", "empresa")


async def _require_driver(user_id: str, db: AsyncSession) -> None:
    """El vínculo es de un conductor con su vehículo: una cuenta de taller/empresa no puede hacerse 'cliente' de
    ningún taller (ni del propio ni de otro). Se valida en el servidor; la interfaz solo lo anticipa."""
    if await _is_business_account(user_id, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Una cuenta de taller o empresa no puede vincularse como cliente")


# =========== Conductor ===========

@router.post("", response_model=WorkshopLinkOut, status_code=status.HTTP_201_CREATED, dependencies=[Enabled])
async def create_link(
    body: WorkshopLinkCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Escenario A: el conductor escaneó el QR del taller y acepta vincular su vehículo."""
    await _require_driver(user_id, db)
    vehicle = await _owned_vehicle(body.vehicle_id, user_id, db)
    workshop = (await db.execute(
        select(Workshop).where(Workshop.code == body.workshop_code.strip().upper(), Workshop.is_published.is_(True))
    )).scalar_one_or_none()
    if not workshop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Taller no encontrado")
    if str(workshop.owner_id) == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No puedes vincularte a tu propio taller")
    link = await _upsert_link(db, workshop=workshop, vehicle=vehicle, user_id=user_id, origin="qr_taller", share_contact=body.share_contact)
    await _attach_and_backfill(db, workshop, vehicle)
    await db.refresh(link)
    return _link_out(link, workshop, vehicle)


@router.get("/mine", response_model=list[WorkshopLinkOut], dependencies=[Enabled])
async def my_links(user_id: Annotated[str, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    rows = (await db.execute(
        select(WorkshopClientLink, Workshop, Vehicle)
        .join(Workshop, Workshop.id == WorkshopClientLink.workshop_id)
        .join(Vehicle, Vehicle.id == WorkshopClientLink.vehicle_id)
        .where(WorkshopClientLink.user_id == UUID(user_id), WorkshopClientLink.status == "active")
        .order_by(WorkshopClientLink.created_at.desc())
    )).all()
    return [_link_out(l, w, v) for l, w, v in rows]


@router.delete("/{link_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Enabled])
async def revoke_link(link_id: UUID, user_id: Annotated[str, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    """El conductor corta el vínculo: el taller deja de verlo y deja de recibir su historial. Lo ya sincronizado se conserva."""
    link = (await db.execute(
        select(WorkshopClientLink).where(WorkshopClientLink.id == link_id, WorkshopClientLink.user_id == UUID(user_id))
    )).scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vínculo no encontrado")
    link.status, link.revoked_at = "revoked", datetime.now(timezone.utc)
    await db.execute(
        update(WorkshopVehicle)
        .where(WorkshopVehicle.workshop_id == link.workshop_id, WorkshopVehicle.linked_vehicle_id == link.vehicle_id)
        .values(linked_vehicle_id=None)
    )


@router.post("/claim", response_model=WorkshopClaimResult, dependencies=[Enabled])
async def claim(
    body: WorkshopLinkClaim, request: Request,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Escenario B: el cliente abre el enlace que le dio el taller, confirma que el vehículo es suyo y acepta."""
    if not await _check_rate(client_ip(request)):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many requests. Try again later.")
    await _require_driver(user_id, db)
    vehicle = await _owned_vehicle(body.vehicle_id, user_id, db)
    row = await _valid_token(body.token, db)
    wv = (await db.execute(select(WorkshopVehicle).where(WorkshopVehicle.id == row.workshop_vehicle_id))).scalar_one()
    if normalize_plate(wv.license_plate) != normalize_plate(vehicle.plate):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La placa de tu vehículo no coincide con la del enlace")
    workshop = (await db.execute(select(Workshop).where(Workshop.id == row.workshop_id))).scalar_one()
    if str(workshop.owner_id) == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No puedes vincularte a tu propio taller")
    if wv.linked_vehicle_id not in (None, vehicle.id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Este vehículo del taller ya está ligado a otra cuenta")
    # Un solo uso, atómico: si dos peticiones llegan a la vez solo una gana.
    used = await db.execute(
        update(WorkshopClaimToken)
        .where(WorkshopClaimToken.id == row.id, WorkshopClaimToken.used_at.is_(None))
        .values(used_at=datetime.now(timezone.utc), used_by_user_id=UUID(user_id))
    )
    if used.rowcount != 1:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enlace no válido o vencido")
    origin = "order_qr" if row.work_order_id else "claim_link"
    link = await _upsert_link(db, workshop=workshop, vehicle=vehicle, user_id=user_id, origin=origin, share_contact=body.share_contact)
    synced = await _attach_and_backfill(db, workshop, vehicle)
    await db.refresh(link)
    return WorkshopClaimResult(link=_link_out(link, workshop, vehicle), synced_orders=synced)


@router.get("/candidates", response_model=list[WorkshopCandidateOut], dependencies=[Enabled])
async def candidates(user_id: Annotated[str, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    """Escenario C: servicios con el nombre de un taller escrito a mano que ahora sí está en CarLink.
    Son sugerencias por nombre y ciudad; nada se asocia hasta que el conductor confirma."""
    if await _is_business_account(user_id, db):
        return []
    rows = (await db.execute(
        select(MaintenanceRecord.id, MaintenanceRecord.vehicle_id, MaintenanceRecord.workshop, Vehicle.city)
        .join(Vehicle, Vehicle.id == MaintenanceRecord.vehicle_id)
        .where(Vehicle.owner_id == UUID(user_id), MaintenanceRecord.workshop_id.is_(None), MaintenanceRecord.workshop != "", MaintenanceRecord.workshop != _UNREGISTERED)
    )).all()
    if not rows:
        return []
    claimed = {
        r[0] for r in (await db.execute(
            select(maintenance_claims.c.id).where(maintenance_claims.c.id.in_([r[0] for r in rows]), maintenance_claims.c.claimed_workshop_id.is_not(None))
        )).all()
    }
    workshops = (await db.execute(select(Workshop).where(Workshop.is_published.is_(True), Workshop.owner_id != UUID(user_id)))).scalars().all()
    found: dict[tuple, dict] = {}
    for rec_id, veh_id, typed, veh_city in rows:
        if rec_id in claimed:
            continue
        for ws in workshops:
            if names_match(typed, ws.name) and city_compatible(veh_city, ws.city):
                item = found.setdefault((ws.id, veh_id), {"ws": ws, "typed": set(), "n": 0})
                item["typed"].add(typed.strip())
                item["n"] += 1
    return [
        WorkshopCandidateOut(
            workshop_id=ws_id, workshop_code=i["ws"].code, workshop_name=i["ws"].name, workshop_city=i["ws"].city or "",
            vehicle_id=veh_id, typed_names=sorted(i["typed"]), record_count=i["n"],
        )
        for (ws_id, veh_id), i in found.items()
    ]


@router.post("/candidates/confirm", response_model=WorkshopCandidateResult, dependencies=[Enabled])
async def confirm_candidate(
    body: WorkshopCandidateConfirm,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """El conductor confirma 'sí, ese es mi taller'. Los servicios quedan con `claimed_workshop_id` (declarado, NO
    verificado: no da la etiqueta 'Del taller'). Si además manda `share_contact`, se crea el vínculo."""
    await _require_driver(user_id, db)
    vehicle = await _owned_vehicle(body.vehicle_id, user_id, db)
    ws = (await db.execute(select(Workshop).where(Workshop.id == body.workshop_id, Workshop.is_published.is_(True)))).scalar_one_or_none()
    if not ws or str(ws.owner_id) == user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Taller no encontrado")
    recs = (await db.execute(
        select(MaintenanceRecord.id, MaintenanceRecord.workshop).where(
            MaintenanceRecord.vehicle_id == vehicle.id, MaintenanceRecord.workshop_id.is_(None),
        )
    )).all()
    ids = [rid for rid, typed in recs if typed and typed != _UNREGISTERED and names_match(typed, ws.name)]
    if ids:
        await db.execute(update(maintenance_claims).where(maintenance_claims.c.id.in_(ids)).values(claimed_workshop_id=ws.id))
    linked = False
    if body.share_contact is not None:
        await _upsert_link(db, workshop=ws, vehicle=vehicle, user_id=user_id, origin="name_match", share_contact=body.share_contact)
        await _attach_and_backfill(db, ws, vehicle)
        linked = True
    return WorkshopCandidateResult(records_claimed=len(ids), linked=linked)


# =========== Taller ===========

@taller_router.get("/links", response_model=list[WorkshopClientLinkTallerOut], dependencies=[Enabled])
async def workshop_links(user_id: Annotated[str, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    workshop = await verify_workshop(user_id, db)
    rows = (await db.execute(
        select(WorkshopClientLink, Profile, Vehicle)
        .join(Profile, Profile.id == WorkshopClientLink.user_id)
        .join(Vehicle, Vehicle.id == WorkshopClientLink.vehicle_id)
        .where(WorkshopClientLink.workshop_id == workshop.id, WorkshopClientLink.status == "active")
        .order_by(WorkshopClientLink.created_at.desc())
    )).all()
    return [
        WorkshopClientLinkTallerOut(
            id=l.id, client_name=p.full_name or "Cliente CarLink", plate=v.plate, brand=v.brand, model=v.model,
            whatsapp=(p.whatsapp_number or None) if l.consent_share_contact else None,
            origin=l.origin, created_at=l.created_at,
        )
        for l, p, v in rows
    ]


async def _issue_token(db: AsyncSession, workshop: Workshop, wv: WorkshopVehicle, order_id: UUID | None) -> WorkshopClaimTokenOut:
    now = datetime.now(timezone.utc)
    # Un enlace vigente por vehículo: generar uno nuevo invalida los anteriores sin usar.
    await db.execute(
        update(WorkshopClaimToken)
        .where(WorkshopClaimToken.workshop_vehicle_id == wv.id, WorkshopClaimToken.used_at.is_(None), WorkshopClaimToken.expires_at > now)
        .values(expires_at=now)
    )
    raw, hashed, expires = new_claim_token()
    db.add(WorkshopClaimToken(workshop_id=workshop.id, workshop_vehicle_id=wv.id, work_order_id=order_id, token_hash=hashed, expires_at=expires))
    await db.flush()
    return WorkshopClaimTokenOut(token=raw, expires_at=expires, workshop_name=workshop.name)


@taller_router.post("/vehicles/{workshop_vehicle_id}/claim-token", response_model=WorkshopClaimTokenOut, dependencies=[Enabled])
async def vehicle_claim_token(
    workshop_vehicle_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Escenario B: el taller genera el enlace/QR de reclamo para su cliente. El token en claro se devuelve UNA vez."""
    workshop = await verify_workshop(user_id, db)
    wv = (await db.execute(
        select(WorkshopVehicle).where(WorkshopVehicle.id == workshop_vehicle_id, WorkshopVehicle.workshop_id == workshop.id)
    )).scalar_one_or_none()
    if not wv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    return await _issue_token(db, workshop, wv, None)


@taller_router.post("/orders/{order_id}/claim-token", response_model=WorkshopClaimTokenOut, dependencies=[Enabled])
async def order_claim_token(
    order_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Fase 5: mismo reclamo, pero impreso en una orden concreta (queda registrado de cuál)."""
    workshop = await verify_workshop(user_id, db)
    order = (await db.execute(select(WorkOrder).where(WorkOrder.id == order_id, WorkOrder.workshop_id == workshop.id))).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    wv = (await db.execute(select(WorkshopVehicle).where(WorkshopVehicle.id == order.workshop_vehicle_id))).scalar_one()
    return await _issue_token(db, workshop, wv, order.id)
