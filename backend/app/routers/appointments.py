from __future__ import annotations

from datetime import date as date_type
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, verify_workshop
from app.models.models import (
    Appointment,
    WorkOrder,
    Workshop,
    WorkshopClient,
    WorkshopVehicle,
)
from app.routers.work_orders import _ORDER_LOADS, _insert_order_with_unique_number
from app.schemas.schemas import (
    AppointmentCreate,
    AppointmentOut,
    AppointmentUpdate,
    WorkOrderOut,
)

router = APIRouter(prefix="/workshops/me/appointments", tags=["appointments"])


@router.get("", response_model=list[AppointmentOut])
async def list_appointments(
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    on_date: date_type | None = Query(None, alias="date"),
    appointment_status: str | None = Query(None, alias="status"),
):
    workshop = await verify_workshop(user_id, db)
    query = select(Appointment).where(Appointment.workshop_id == workshop.id)
    if on_date:
        query = query.where(Appointment.appointment_date == on_date)
    if appointment_status:
        query = query.where(Appointment.status == appointment_status)
    query = query.order_by(Appointment.appointment_date, Appointment.time_slot)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    body: AppointmentCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    workshop = await verify_workshop(user_id, db)
    appt = Appointment(workshop_id=workshop.id, **body.model_dump())
    db.add(appt)
    await db.flush()
    await db.refresh(appt)
    return appt


async def _get_owned_appointment(appointment_id: UUID, user_id: str, db: AsyncSession) -> tuple[Appointment, Workshop]:
    workshop = await verify_workshop(user_id, db)
    result = await db.execute(
        select(Appointment).where(Appointment.id == appointment_id, Appointment.workshop_id == workshop.id)
    )
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    return appt, workshop


@router.put("/{appointment_id}", response_model=AppointmentOut)
async def update_appointment(
    appointment_id: UUID,
    body: AppointmentUpdate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    appt, _ = await _get_owned_appointment(appointment_id, user_id, db)
    for key, val in body.model_dump(exclude_unset=True).items():
        setattr(appt, key, val)
    await db.flush()
    await db.refresh(appt)
    return appt


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appointment(
    appointment_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    appt, _ = await _get_owned_appointment(appointment_id, user_id, db)
    await db.delete(appt)


@router.post("/{appointment_id}/convert", response_model=WorkOrderOut, status_code=status.HTTP_201_CREATED)
async def convert_appointment_to_work_order(
    appointment_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Conversión 1-click cita → orden de trabajo. A diferencia de tallerpro
    (que fabricaba un mecánico, horas y tarifa fijos para dejar la orden con
    un total ya calculado), esto crea la orden vacía en 'Pendiente' — sin
    mano de obra/repuestos inventados — para que el taller la complete con
    datos reales."""
    appt, workshop = await _get_owned_appointment(appointment_id, user_id, db)
    if appt.converted_to_work_order_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Appointment already converted")

    client = None
    if appt.client_phone:
        client = (
            await db.execute(
                select(WorkshopClient).where(
                    WorkshopClient.workshop_id == workshop.id, WorkshopClient.phone == appt.client_phone
                )
            )
        ).scalar_one_or_none()
    if not client:
        client = WorkshopClient(
            workshop_id=workshop.id,
            name=appt.client_name,
            phone=appt.client_phone,
            email=appt.client_email,
        )
        db.add(client)
        await db.flush()

    vehicle = None
    plate = (appt.vehicle_plate or "").upper()
    if plate:
        vehicle = (
            await db.execute(
                select(WorkshopVehicle).where(
                    WorkshopVehicle.workshop_id == workshop.id, WorkshopVehicle.license_plate == plate
                )
            )
        ).scalar_one_or_none()
    if not vehicle:
        vehicle = WorkshopVehicle(
            workshop_id=workshop.id,
            client_id=client.id,
            license_plate=plate or f"SIN-PLACA-{appt.id.hex[:6].upper()}",
            model=appt.vehicle_model,
        )
        db.add(vehicle)
        await db.flush()

    order = WorkOrder(
        workshop_id=workshop.id,
        workshop_vehicle_id=vehicle.id,
        client_id=client.id,
        status="Pendiente",
        symptoms=appt.notes or f"Cita agendada: {appt.service_category}",
        category=appt.service_category,
    )
    await _insert_order_with_unique_number(order, workshop, user_id, db)

    appt.status = "Completada"
    appt.converted_to_work_order_id = order.id

    result = await db.execute(select(WorkOrder).options(*_ORDER_LOADS).where(WorkOrder.id == order.id))
    return result.scalar_one()
