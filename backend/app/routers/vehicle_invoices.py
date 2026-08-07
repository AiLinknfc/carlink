from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, verify_vehicle
from app.models.models import (
    WorkOrder,
    Workshop,
    WorkshopIssuedDocument,
    WorkshopVehicle,
)
from app.schemas.schemas import VehicleInvoiceOut

router = APIRouter(prefix="/invoices", tags=["vehicle-invoices"])


@router.get("/vehicle/{vehicle_id}", response_model=list[VehicleInvoiceOut])
async def list_vehicle_invoices(
    vehicle_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Facturas/certificados de talleres que le llegaron a este vehículo —
    solo las órdenes cuyo `workshop_vehicles.linked_vehicle_id` apunta acá
    (docs/PLAN_FACTURACION_AUTOMATICA.md Paso 2). Mismo patrón que
    `documents.py`/`maintenance.py`: `verify_vehicle` primero, confirma dueño."""
    await verify_vehicle(vehicle_id, user_id, db)

    query = (
        select(WorkshopIssuedDocument, Workshop.name, Workshop.workshop_type)
        .join(WorkOrder, WorkshopIssuedDocument.work_order_id == WorkOrder.id)
        .join(WorkshopVehicle, WorkOrder.workshop_vehicle_id == WorkshopVehicle.id)
        .join(Workshop, WorkshopIssuedDocument.workshop_id == Workshop.id)
        .where(WorkshopVehicle.linked_vehicle_id == vehicle_id)
        .order_by(WorkshopIssuedDocument.issue_date.desc(), WorkshopIssuedDocument.created_at.desc())
    )
    rows = (await db.execute(query)).all()

    return [
        VehicleInvoiceOut(
            id=doc.id,
            doc_number=doc.doc_number,
            doc_type=doc.doc_type,
            issue_date=doc.issue_date,
            amount=doc.amount,
            details=doc.details,
            mechanic_name=doc.mechanic_name,
            vehicle_plate=doc.vehicle_plate,
            vehicle_model=doc.vehicle_model,
            workshop_name=workshop_name,
            workshop_is_cda="cda" in (workshop_type or "").lower(),
            created_at=doc.created_at,
        )
        for doc, workshop_name, workshop_type in rows
    ]
