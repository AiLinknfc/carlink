from __future__ import annotations

from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, verify_vehicle
from app.models.models import VehicleExpense
from app.schemas.schemas import ExpenseCreate, ExpenseOut, ExpenseScanResult, ExpenseUpdate
from app.services.ocr import (
    OcrUnavailableError,
    extract_text_from_file,
    structure_expense_data,
)
from app.utils import validate_upload_file

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.post("/scan", response_model=ExpenseScanResult)
async def scan_expense(
    file: UploadFile,
    user_id: Annotated[str, Depends(get_current_user)],
):
    """Scan a receipt/invoice and extract structured expense data.

    Returns auto-detected category + extracted fields. Empty fields mean
    the OCR couldn't read them — the user fills them in the form.
    """
    contents = await validate_upload_file(file)

    try:
        raw_text = await run_in_threadpool(extract_text_from_file, contents, file.content_type)
    except OcrUnavailableError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

    structured = await structure_expense_data(raw_text)
    return ExpenseScanResult(**structured, raw_text=raw_text)


@router.get("/vehicle/{vehicle_id}", response_model=list[ExpenseOut])
async def list_expenses(
    vehicle_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    category: str | None = Query(None),
):
    """List expenses for a vehicle, optionally filtered by category."""
    await verify_vehicle(vehicle_id, user_id, db)
    stmt = select(VehicleExpense).where(VehicleExpense.vehicle_id == vehicle_id)
    if category:
        stmt = stmt.where(VehicleExpense.category == category)
    stmt = stmt.order_by(VehicleExpense.issue_date.desc().nullslast(), VehicleExpense.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/vehicle/{vehicle_id}/fuel-summary")
async def fuel_summary(
    vehicle_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Return fuel-related summary for the vehicle's fuel gauge."""
    await verify_vehicle(vehicle_id, user_id, db)
    result = await db.execute(
        select(VehicleExpense)
        .where(VehicleExpense.vehicle_id == vehicle_id, VehicleExpense.category == "fuel")
        .order_by(VehicleExpense.issue_date.desc().nullslast(), VehicleExpense.created_at.desc())
        .limit(20)
    )
    fuel_records = list(result.scalars().all())

    if not fuel_records:
        return {"has_data": False}

    latest = fuel_records[0]
    total_liters = sum(float(r.fuel_liters or 0) for r in fuel_records if r.fuel_liters)
    total_cost = sum(float(r.cost or 0) for r in fuel_records if r.cost)
    avg_price = total_cost / total_liters if total_liters > 0 else None

    return {
        "has_data": True,
        "latest_date": str(latest.issue_date) if latest.issue_date else None,
        "latest_mileage": latest.mileage_at_purchase,
        "latest_fuel_type": latest.fuel_type,
        "latest_liters": float(latest.fuel_liters) if latest.fuel_liters else None,
        "latest_cost": float(latest.cost) if latest.cost else None,
        "latest_price_per_liter": float(latest.price_per_liter) if latest.price_per_liter else None,
        "total_liters_20": total_liters,
        "total_cost_20": total_cost,
        "avg_price_per_liter": avg_price,
        "record_count": len(fuel_records),
    }


@router.post("", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
async def create_expense(
    body: ExpenseCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create a new expense record (with or without prior OCR scan)."""
    await verify_vehicle(body.vehicle_id, user_id, db)
    data = body.model_dump()
    if isinstance(data.get("issue_date"), str) and data["issue_date"]:
        data["issue_date"] = date.fromisoformat(data["issue_date"])
    expense = VehicleExpense(**data)
    db.add(expense)
    await db.flush()
    await db.refresh(expense)
    return expense


@router.put("/{expense_id}", response_model=ExpenseOut)
async def update_expense(
    expense_id: UUID,
    body: ExpenseUpdate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update an existing expense."""
    result = await db.execute(select(VehicleExpense).where(VehicleExpense.id == expense_id))
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    await verify_vehicle(expense.vehicle_id, user_id, db)

    update_data = body.model_dump(exclude_unset=True)
    if isinstance(update_data.get("issue_date"), str) and update_data["issue_date"]:
        update_data["issue_date"] = date.fromisoformat(update_data["issue_date"])
    for field, value in update_data.items():
        setattr(expense, field, value)
    await db.flush()
    await db.refresh(expense)
    return expense


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Delete an expense."""
    result = await db.execute(select(VehicleExpense).where(VehicleExpense.id == expense_id))
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    await verify_vehicle(expense.vehicle_id, user_id, db)
    await db.delete(expense)
    await db.flush()
