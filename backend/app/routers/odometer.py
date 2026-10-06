from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, verify_vehicle
from app.models.models import MaintenanceRecord, OdometerReading
from app.schemas.schemas import OdometerIn, OdometerStatus
from app.services.cache import cache_invalidate_vehicle
from app.services.maintenance_rules import RuleError, check_mileage
from app.services.odometer import as_history, can_correct_initial, list_readings, reminder_state, utcnow

router = APIRouter(prefix="/odometer", tags=["odometer"])


def _status(readings: list[OdometerReading], now) -> OdometerStatus:
    # El odómetro no retrocede: el actual es el mayor valor visto, no el último en llegar (una
    # lectura rezagada o un 0 de un taller no debe mostrarse como kilometraje actual).
    latest = max(readings, key=lambda r: r.recorded_at) if readings else None
    return OdometerStatus(
        state=reminder_state(readings, now),
        current_mileage=max(r.mileage for r in readings) if readings else None,
        last_recorded_at=latest.recorded_at if latest else None,
        can_correct_initial=can_correct_initial(readings, now) is not None,
    )


async def _service_history(db: AsyncSession, vehicle_id: UUID) -> list[tuple]:
    rows = (
        await db.execute(
            select(MaintenanceRecord.date, MaintenanceRecord.mileage).where(MaintenanceRecord.vehicle_id == vehicle_id)
        )
    ).all()
    return [(r[0], r[1]) for r in rows]


@router.get("/vehicle/{vehicle_id}", response_model=OdometerStatus)
async def get_odometer_status(
    vehicle_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await verify_vehicle(vehicle_id, user_id, db)
    return _status(await list_readings(db, vehicle_id), utcnow())


@router.post("/vehicle/{vehicle_id}/initial", response_model=OdometerStatus, status_code=status.HTTP_201_CREATED)
async def set_initial_reading(
    vehicle_id: UUID,
    body: OdometerIn,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Kilometraje inicial de un vehículo que aún no tiene ninguna lectura (los nuevos lo traen en
    POST /vehicles). También permite corregir el inicial durante 48 h si sigue siendo la única."""
    await verify_vehicle(vehicle_id, user_id, db)
    now = utcnow()
    readings = await list_readings(db, vehicle_id)
    if readings:
        current = can_correct_initial(readings, now)
        if current is None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Este vehículo ya tiene su kilometraje inicial registrado.")
        try:
            check_mileage(body.mileage, now.date(), await _service_history(db, vehicle_id))
        except RuleError as e:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
        current.mileage = body.mileage
        current.recorded_at = now
        await db.flush()
        await cache_invalidate_vehicle(str(vehicle_id))
        return _status([current], now)
    try:
        check_mileage(body.mileage, now.date(), await _service_history(db, vehicle_id))
    except RuleError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    reading = OdometerReading(vehicle_id=vehicle_id, mileage=body.mileage, source="initial", recorded_at=now)
    db.add(reading)
    await db.flush()
    await cache_invalidate_vehicle(str(vehicle_id))
    return _status([reading], now)


@router.post("/vehicle/{vehicle_id}/periodic", response_model=OdometerStatus, status_code=status.HTTP_201_CREATED)
async def add_periodic_reading(
    vehicle_id: UUID,
    body: OdometerIn,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Lectura opcional cuando pasaron varios meses sin servicio. Nunca puede ser menor a una
    anterior ni saltar de forma absurda."""
    await verify_vehicle(vehicle_id, user_id, db)
    now = utcnow()
    readings = await list_readings(db, vehicle_id)
    if not readings:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Primero registra el kilometraje inicial del vehículo.")
    try:
        check_mileage(body.mileage, now.date(), await _service_history(db, vehicle_id), as_history(readings))
    except RuleError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    reading = OdometerReading(vehicle_id=vehicle_id, mileage=body.mileage, source="periodic", recorded_at=now)
    db.add(reading)
    await db.flush()
    await cache_invalidate_vehicle(str(vehicle_id))
    return _status([reading, *readings], now)
