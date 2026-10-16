from __future__ import annotations

import re
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.workshop_gate import workshop_gate
from app.database import get_db
from app.dependencies import get_current_user, verify_workshop
from app.models.models import Workshop, WorkshopServiceItem
from app.schemas.schemas import WorkshopServiceItemCreate, WorkshopServiceItemOut, WorkshopServiceItemUpdate

router = APIRouter(prefix="/workshops/me/services", tags=["workshop-services"], dependencies=[Depends(workshop_gate("catalogo"))])

MAX_FEATURED = 4


def _clean_photo_url(url: str, user_id: str) -> str:
    """La foto solo puede ser un archivo subido por ESTE usuario al almacenamiento propio (/api/upload/files/<id>/<uuid>.<ext>).
    Nada de URLs externas ni de otro usuario: la ficha publica la pinta tal cual en un <img>."""
    url = (url or "").strip()
    if not url:
        return ""
    if not re.fullmatch(rf"/api/upload/files/{re.escape(user_id)}/[0-9a-fA-F-]{{36}}\.[A-Za-z0-9]{{2,5}}", url):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="La foto debe ser un archivo subido desde tu cuenta")
    return url


async def _check_featured_room(db: AsyncSession, workshop: Workshop, except_id: UUID | None) -> None:
    """Hasta MAX_FEATURED destacados por taller. Se bloquea la fila del taller para que dos peticiones a la vez no se pasen del limite."""
    await db.execute(select(Workshop.id).where(Workshop.id == workshop.id).with_for_update())
    q = select(func.count()).select_from(WorkshopServiceItem).where(
        WorkshopServiceItem.workshop_id == workshop.id, WorkshopServiceItem.is_featured.is_(True),
    )
    if except_id is not None:
        q = q.where(WorkshopServiceItem.id != except_id)
    if (await db.scalar(q) or 0) >= MAX_FEATURED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Solo puedes destacar hasta {MAX_FEATURED} servicios")


@router.get("", response_model=list[WorkshopServiceItemOut])
async def list_service_items(
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    workshop = await verify_workshop(user_id, db)
    result = await db.execute(
        select(WorkshopServiceItem)
        .where(WorkshopServiceItem.workshop_id == workshop.id)
        .order_by(WorkshopServiceItem.category, WorkshopServiceItem.name)
    )
    return list(result.scalars().all())


@router.post("", response_model=WorkshopServiceItemOut, status_code=status.HTTP_201_CREATED)
async def create_service_item(
    body: WorkshopServiceItemCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    workshop = await verify_workshop(user_id, db)
    data = body.model_dump()
    data["photo_url"] = _clean_photo_url(data["photo_url"], user_id)
    if data["is_featured"]:
        if not data["photo_url"]:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Un servicio destacado necesita foto")
        await _check_featured_room(db, workshop, None)
    item = WorkshopServiceItem(workshop_id=workshop.id, **data)
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item


async def _get_owned_service_item(item_id: UUID, user_id: str, db: AsyncSession) -> WorkshopServiceItem:
    workshop = await verify_workshop(user_id, db)
    result = await db.execute(
        select(WorkshopServiceItem).where(WorkshopServiceItem.id == item_id, WorkshopServiceItem.workshop_id == workshop.id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service item not found")
    return item


@router.put("/{item_id}", response_model=WorkshopServiceItemOut)
async def update_service_item(
    item_id: UUID,
    body: WorkshopServiceItemUpdate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    item = await _get_owned_service_item(item_id, user_id, db)
    data = body.model_dump(exclude_unset=True)
    if "photo_url" in data:
        data["photo_url"] = _clean_photo_url(data["photo_url"] or "", user_id)
        if not data["photo_url"]:
            data["is_featured"] = False  # sin foto no puede seguir destacado
    photo_after = data.get("photo_url", item.photo_url)
    if data.get("is_featured"):
        if not photo_after:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Un servicio destacado necesita foto")
        if not item.is_featured:
            workshop = await verify_workshop(user_id, db)
            await _check_featured_room(db, workshop, item.id)
    for key, val in data.items():
        setattr(item, key, val)
    await db.flush()
    await db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service_item(
    item_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    item = await _get_owned_service_item(item_id, user_id, db)
    await db.delete(item)
