from __future__ import annotations

from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_admin, get_current_user, get_current_user_optional
from app.models.models import Profile, Review, Workshop, WorkshopReview
from app.schemas.schemas import (
    AdminReviewOut,
    ReviewCreate,
    ReviewOut,
    ReviewSubmitOut,
    ReviewSummaryOut,
)
from app.services.reviews import recalculate_workshop_rating

router = APIRouter(prefix="/reviews", tags=["reviews"])
admin_router = APIRouter(prefix="/admin/reviews", tags=["admin-reviews"])


def _client_name_for(profile: Profile | None) -> str:
    if profile and profile.full_name:
        return profile.full_name
    if profile and profile.email:
        return profile.email.split("@")[0]
    return "Cliente CarLink"


@router.post("", response_model=ReviewSubmitOut, status_code=status.HTTP_201_CREATED)
async def submit_review(
    body: ReviewCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Servicio único de reseñas, llamado desde los 3 puntos de la app (plataforma,
    producto, taller) — el target_type decide dónde se guarda. Reenviar una reseña
    para el mismo target edita la existente en vez de duplicarla."""
    if body.target_type == "workshop":
        if not body.workshop_id:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="workshop_id is required for target_type='workshop'")
        workshop = (await db.execute(select(Workshop).where(Workshop.id == body.workshop_id))).scalar_one_or_none()
        if not workshop:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workshop not found")

        existing = (
            await db.execute(
                select(WorkshopReview).where(
                    WorkshopReview.workshop_id == workshop.id,
                    WorkshopReview.submitted_by_user_id == UUID(user_id),
                )
            )
        ).scalar_one_or_none()

        if existing:
            existing.rating = body.rating
            existing.comment = body.comment
            review = existing
        else:
            profile = (await db.execute(select(Profile).where(Profile.id == UUID(user_id)))).scalar_one_or_none()
            review = WorkshopReview(
                workshop_id=workshop.id,
                client_name=_client_name_for(profile),
                rating=body.rating,
                comment=body.comment,
                submitted_by_user_id=UUID(user_id),
                source="cliente_autenticado",
            )
            db.add(review)

        await db.flush()
        await db.refresh(review)
        await recalculate_workshop_rating(workshop, db)

        return ReviewSubmitOut(
            id=review.id,
            target_type="workshop",
            workshop_id=review.workshop_id,
            rating=review.rating,
            comment=review.comment,
            created_at=review.created_at,
            updated_at=review.created_at,
        )

    existing = (
        await db.execute(
            select(Review).where(Review.user_id == UUID(user_id), Review.target_type == body.target_type)
        )
    ).scalar_one_or_none()

    if existing:
        existing.rating = body.rating
        existing.comment = body.comment
        review = existing
    else:
        review = Review(user_id=UUID(user_id), target_type=body.target_type, rating=body.rating, comment=body.comment)
        db.add(review)

    await db.flush()
    await db.refresh(review)

    return ReviewSubmitOut(
        id=review.id,
        target_type=review.target_type,
        workshop_id=None,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at,
        updated_at=review.updated_at,
    )


@router.get("")
async def list_reviews(
    db: Annotated[AsyncSession, Depends(get_db)],
    user_id: Annotated[str | None, Depends(get_current_user_optional)],
    target_type: Literal["platform", "product"] | None = None,
    min_rating: Annotated[int | None, Query(ge=1, le=5)] = None,
    sort: Literal["recientes", "mejores", "peores"] = "recientes",
    mine: bool = False,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
):
    """Lectura pública (plataforma/producto) para prueba social en shop/landing, o
    'mis reseñas' (mine=true, requiere sesión) para el estado de ResenasTab — en
    ese caso incluye también la reseña de taller, si existe, leyendo workshop_reviews."""
    if mine:
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
        mine_reviews = (
            await db.execute(select(Review).where(Review.user_id == UUID(user_id)))
        ).scalars().all()
        mine_workshop_reviews = (
            await db.execute(select(WorkshopReview).where(WorkshopReview.submitted_by_user_id == UUID(user_id)))
        ).scalars().all()
        return [
            ReviewSubmitOut(
                id=r.id, target_type=r.target_type, workshop_id=None,
                rating=r.rating, comment=r.comment, created_at=r.created_at, updated_at=r.updated_at,
            )
            for r in mine_reviews
        ] + [
            ReviewSubmitOut(
                id=r.id, target_type="workshop", workshop_id=r.workshop_id,
                rating=r.rating, comment=r.comment, created_at=r.created_at, updated_at=r.created_at,
            )
            for r in mine_workshop_reviews
        ]

    if not target_type:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="target_type is required")

    query = select(Review).where(Review.target_type == target_type)
    if min_rating:
        query = query.where(Review.rating >= min_rating)
    if sort == "mejores":
        query = query.order_by(Review.rating.desc(), Review.created_at.desc())
    elif sort == "peores":
        query = query.order_by(Review.rating.asc(), Review.created_at.desc())
    else:
        query = query.order_by(Review.created_at.desc())
    query = query.limit(limit)

    result = await db.execute(query)
    return [ReviewOut.model_validate(r) for r in result.scalars().all()]


@router.get("/summary", response_model=ReviewSummaryOut)
async def review_summary(
    db: Annotated[AsyncSession, Depends(get_db)],
    target_type: Literal["platform", "product"],
):
    total = await db.scalar(select(func.count()).select_from(Review).where(Review.target_type == target_type)) or 0
    average = await db.scalar(select(func.avg(Review.rating)).where(Review.target_type == target_type)) or 0
    breakdown_rows = await db.execute(
        select(Review.rating, func.count()).where(Review.target_type == target_type).group_by(Review.rating)
    )
    breakdown = {str(star): 0 for star in range(5, 0, -1)}
    for rating, count in breakdown_rows.all():
        breakdown[str(rating)] = count

    return ReviewSummaryOut(total=total, average=round(float(average), 1), breakdown=breakdown)


async def _fetch_admin_reviews(
    db: AsyncSession,
    target_type: Literal["platform", "product", "workshop"] | None,
    workshop_id: UUID | None,
    min_rating: int | None,
) -> list[AdminReviewOut]:
    items: list[AdminReviewOut] = []

    if target_type in (None, "platform", "product"):
        query = select(Review, Profile).join(Profile, Profile.id == Review.user_id, isouter=True)
        if target_type:
            query = query.where(Review.target_type == target_type)
        if min_rating:
            query = query.where(Review.rating >= min_rating)
        for review, profile in (await db.execute(query)).all():
            items.append(
                AdminReviewOut(
                    id=review.id, target_type=review.target_type, target_label="",
                    author=_client_name_for(profile), rating=review.rating, comment=review.comment,
                    created_at=review.created_at,
                )
            )

    if target_type in (None, "workshop"):
        query = select(WorkshopReview, Workshop).join(Workshop, Workshop.id == WorkshopReview.workshop_id)
        if workshop_id:
            query = query.where(WorkshopReview.workshop_id == workshop_id)
        if min_rating:
            query = query.where(WorkshopReview.rating >= min_rating)
        for review, workshop in (await db.execute(query)).all():
            items.append(
                AdminReviewOut(
                    id=review.id, target_type="workshop", target_label=workshop.name,
                    author=review.client_name, rating=review.rating, comment=review.comment,
                    manager_response=review.manager_response, created_at=review.created_at,
                )
            )

    return items


@admin_router.get("", response_model=list[AdminReviewOut])
async def admin_list_reviews(
    admin_id: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    target_type: Literal["platform", "product", "workshop"] | None = None,
    workshop_id: UUID | None = None,
    min_rating: Annotated[int | None, Query(ge=1, le=5)] = None,
    sort: Literal["recientes", "mejores", "peores"] = "recientes",
):
    """Vista global de Admin: une reviews (plataforma/producto) + workshop_reviews
    (taller) en una sola lista filtrable/ordenable — las 3 categorías juntas."""
    items = await _fetch_admin_reviews(db, target_type, workshop_id, min_rating)
    if sort == "mejores":
        items.sort(key=lambda r: (-r.rating, -r.created_at.timestamp()))
    elif sort == "peores":
        items.sort(key=lambda r: (r.rating, -r.created_at.timestamp()))
    else:
        items.sort(key=lambda r: r.created_at, reverse=True)
    return items


@admin_router.get("/summary")
async def admin_review_summary(
    admin_id: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    target_type: Literal["platform", "product", "workshop"] | None = None,
):
    items = await _fetch_admin_reviews(db, target_type, None, None)
    total = len(items)
    average = round(sum(i.rating for i in items) / total, 1) if total else 0.0
    breakdown = {str(star): 0 for star in range(5, 0, -1)}
    for i in items:
        breakdown[str(i.rating)] += 1
    by_target_type = {
        tt: sum(1 for i in items if i.target_type == tt) for tt in ("platform", "product", "workshop")
    }
    return {"total": total, "average": average, "breakdown": breakdown, "by_target_type": by_target_type}
