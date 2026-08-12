from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Workshop, WorkshopReview


async def recalculate_workshop_rating(workshop: Workshop, db: AsyncSession) -> None:
    """Recalcula workshops.rating como el promedio de todas sus workshop_reviews
    (manuales + enviadas por clientes autenticados). Reusado por workshop_reviews.py
    (alta manual) y reviews.py (alta desde el flujo genérico de reseñas)."""
    all_ratings = (
        await db.execute(select(WorkshopReview.rating).where(WorkshopReview.workshop_id == workshop.id))
    ).scalars().all()
    if all_ratings:
        workshop.rating = round(sum(all_ratings) / len(all_ratings), 1)
