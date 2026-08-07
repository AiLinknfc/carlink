from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, verify_workshop
from app.models.models import Vehicle, WorkshopClient, WorkshopVehicle
from app.schemas.schemas import (
    WorkshopClientCreate,
    WorkshopClientOut,
    WorkshopClientUpdate,
    WorkshopVehicleCreate,
    WorkshopVehicleOut,
    WorkshopVehicleUpdate,
)

router = APIRouter(prefix="/workshops/me", tags=["workshop-clients"])


# =========== Clients ===========

@router.get("/clients", response_model=list[WorkshopClientOut])
async def list_clients(
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    q: str = Query("", description="Busca por nombre, teléfono, email o documento"),
):
    workshop = await verify_workshop(user_id, db)
    query = select(WorkshopClient).where(WorkshopClient.workshop_id == workshop.id)
    if q:
        pattern = f"%{q}%"
        query = query.where(
            or_(
                WorkshopClient.name.ilike(pattern),
                WorkshopClient.phone.ilike(pattern),
                WorkshopClient.email.ilike(pattern),
                WorkshopClient.document_id.ilike(pattern),
            )
        )
    query = query.order_by(WorkshopClient.name).limit(200)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("/clients", response_model=WorkshopClientOut, status_code=status.HTTP_201_CREATED)
async def create_client(
    body: WorkshopClientCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    workshop = await verify_workshop(user_id, db)
    client = WorkshopClient(workshop_id=workshop.id, **body.model_dump())
    db.add(client)
    await db.flush()
    await db.refresh(client)
    return client


async def _get_owned_client(client_id: UUID, user_id: str, db: AsyncSession) -> WorkshopClient:
    workshop = await verify_workshop(user_id, db)
    result = await db.execute(
        select(WorkshopClient).where(WorkshopClient.id == client_id, WorkshopClient.workshop_id == workshop.id)
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return client


@router.put("/clients/{client_id}", response_model=WorkshopClientOut)
async def update_client(
    client_id: UUID,
    body: WorkshopClientUpdate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    client = await _get_owned_client(client_id, user_id, db)
    for key, val in body.model_dump(exclude_unset=True).items():
        setattr(client, key, val)
    await db.flush()
    await db.refresh(client)
    return client


@router.delete("/clients/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    client = await _get_owned_client(client_id, user_id, db)
    await db.delete(client)


# =========== Vehicles ===========

@router.get("/vehicles", response_model=list[WorkshopVehicleOut])
async def list_workshop_vehicles(
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    client_id: UUID | None = Query(None),
    q: str = Query("", description="Busca por placa, marca o modelo"),
):
    workshop = await verify_workshop(user_id, db)
    query = select(WorkshopVehicle).where(WorkshopVehicle.workshop_id == workshop.id)
    if client_id:
        query = query.where(WorkshopVehicle.client_id == client_id)
    if q:
        pattern = f"%{q}%"
        query = query.where(
            or_(
                WorkshopVehicle.license_plate.ilike(pattern),
                WorkshopVehicle.brand.ilike(pattern),
                WorkshopVehicle.model.ilike(pattern),
            )
        )
    query = query.order_by(WorkshopVehicle.license_plate).limit(200)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("/vehicles", response_model=WorkshopVehicleOut, status_code=status.HTTP_201_CREATED)
async def create_workshop_vehicle(
    body: WorkshopVehicleCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    workshop = await verify_workshop(user_id, db)
    await _get_owned_client(body.client_id, user_id, db)  # 404 if the client isn't this workshop's
    data = body.model_dump()
    data["license_plate"] = data["license_plate"].upper()
    vehicle = WorkshopVehicle(workshop_id=workshop.id, **data)
    db.add(vehicle)
    await db.flush()
    await db.refresh(vehicle)
    return vehicle


async def _get_owned_workshop_vehicle(vehicle_id: UUID, user_id: str, db: AsyncSession) -> WorkshopVehicle:
    workshop = await verify_workshop(user_id, db)
    result = await db.execute(
        select(WorkshopVehicle).where(WorkshopVehicle.id == vehicle_id, WorkshopVehicle.workshop_id == workshop.id)
    )
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    return vehicle


@router.put("/vehicles/{vehicle_id}", response_model=WorkshopVehicleOut)
async def update_workshop_vehicle(
    vehicle_id: UUID,
    body: WorkshopVehicleUpdate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    vehicle = await _get_owned_workshop_vehicle(vehicle_id, user_id, db)
    update_data = body.model_dump(exclude_unset=True)
    if update_data.get("license_plate"):
        update_data["license_plate"] = update_data["license_plate"].upper()
    for key, val in update_data.items():
        setattr(vehicle, key, val)
    await db.flush()
    await db.refresh(vehicle)
    return vehicle


@router.delete("/vehicles/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workshop_vehicle(
    vehicle_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    vehicle = await _get_owned_workshop_vehicle(vehicle_id, user_id, db)
    await db.delete(vehicle)


@router.post("/vehicles/{vehicle_id}/link", response_model=WorkshopVehicleOut)
async def link_workshop_vehicle(
    vehicle_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Vincula este vehículo del taller con una cuenta CarLink real —
    docs/PLAN_FACTURACION_AUTOMATICA.md Paso 3 (para que las facturas y el
    historial le lleguen al cliente). Busca por placa exacta en vez de
    aceptar un `linked_vehicle_id` a mano: el taller nunca ve ni elige entre
    vehículos de otras cuentas, solo confirma si SU cliente (por la placa que
    ya cargó) tiene o no cuenta CarLink."""
    workshop_vehicle = await _get_owned_workshop_vehicle(vehicle_id, user_id, db)
    plate = workshop_vehicle.license_plate.strip().upper()
    result = await db.execute(select(Vehicle).where(func.upper(Vehicle.plate) == plate))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay ninguna cuenta CarLink registrada con esta placa")
    workshop_vehicle.linked_vehicle_id = vehicle.id
    await db.flush()
    await db.refresh(workshop_vehicle)
    return workshop_vehicle


@router.post("/vehicles/{vehicle_id}/unlink", response_model=WorkshopVehicleOut)
async def unlink_workshop_vehicle(
    vehicle_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    workshop_vehicle = await _get_owned_workshop_vehicle(vehicle_id, user_id, db)
    workshop_vehicle.linked_vehicle_id = None
    await db.flush()
    await db.refresh(workshop_vehicle)
    return workshop_vehicle
