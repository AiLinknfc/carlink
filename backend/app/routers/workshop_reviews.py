from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, verify_workshop
from app.models.models import WorkshopReview
from app.schemas.schemas import (
    WorkshopReviewCreate,
    WorkshopReviewOut,
    WorkshopReviewRespond,
)

router = APIRouter(prefix="/workshops/me/reviews", tags=["workshop-reviews"])


@router.get("", response_model=list[WorkshopReviewOut])
async def list_my_reviews(
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    workshop = await verify_workshop(user_id, db)
    result = await db.execute(
        select(WorkshopReview).where(WorkshopReview.workshop_id == workshop.id).order_by(WorkshopReview.review_date.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=WorkshopReviewOut, status_code=status.HTTP_201_CREATED)
async def create_review(
    body: WorkshopReviewCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Registro manual de una reseña recibida fuera de línea (no hay todavía un
    flujo público de clientes autenticados dejando reseñas — fuera de alcance
    de esta migración, ver docs/PLAN_MIGRACION_TALLERPRO.md)."""
    workshop = await verify_workshop(user_id, db)
    review = WorkshopReview(workshop_id=workshop.id, **body.model_dump())
    db.add(review)
    await db.flush()
    await db.refresh(review)

    # Recalcula el rating promedio del taller, mostrado en la ficha pública.
    all_ratings = (
        await db.execute(select(WorkshopReview.rating).where(WorkshopReview.workshop_id == workshop.id))
    ).scalars().all()
    if all_ratings:
        workshop.rating = round(sum(all_ratings) / len(all_ratings), 1)

    return review


@router.put("/{review_id}/respond", response_model=WorkshopReviewOut)
async def respond_to_review(
    review_id: UUID,
    body: WorkshopReviewRespond,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    workshop = await verify_workshop(user_id, db)
    result = await db.execute(
        select(WorkshopReview).where(WorkshopReview.id == review_id, WorkshopReview.workshop_id == workshop.id)
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    review.manager_response = body.manager_response
    await db.flush()
    await db.refresh(review)
    return review
