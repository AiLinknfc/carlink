from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, verify_workshop
from app.models.models import Workshop, WorkshopIssuedDocument
from app.schemas.schemas import WorkshopDocumentCreate, WorkshopDocumentOut

router = APIRouter(prefix="/workshops/me/documents", tags=["workshop-documents"])


@router.get("", response_model=list[WorkshopDocumentOut])
async def list_documents(
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    doc_type: str | None = Query(None),
):
    workshop = await verify_workshop(user_id, db)
    query = select(WorkshopIssuedDocument).where(WorkshopIssuedDocument.workshop_id == workshop.id)
    if doc_type:
        query = query.where(WorkshopIssuedDocument.doc_type == doc_type)
    query = query.order_by(WorkshopIssuedDocument.created_at.desc()).limit(300)
    result = await db.execute(query)
    return list(result.scalars().all())


async def _next_doc_number(workshop_id: UUID, db: AsyncSession) -> str:
    """Secuencia reiniciada cada año (DOC-{año}-001, ...) — antes contaba todos
    los documentos históricos del taller sin importar el año, así que un taller
    que cruzara de año seguía la numeración vieja en vez de reiniciar (bug
    encontrado en la revisión del backend, ver docs/PLAN_MIGRACION_TALLERPRO.md)."""
    year = datetime.now(UTC).date().year
    count = await db.scalar(
        select(func.count()).select_from(WorkshopIssuedDocument).where(
            WorkshopIssuedDocument.workshop_id == workshop_id,
            WorkshopIssuedDocument.doc_number.like(f"DOC-{year}-%"),
        )
    )
    return f"DOC-{year}-{str((count or 0) + 1).zfill(3)}"


@router.post("", response_model=WorkshopDocumentOut, status_code=status.HTTP_201_CREATED)
async def create_document(
    body: WorkshopDocumentCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    workshop: Workshop = await verify_workshop(user_id, db)
    doc = WorkshopIssuedDocument(workshop_id=workshop.id, **body.model_dump())
    for attempt in range(5):
        doc.doc_number = await _next_doc_number(workshop.id, db)
        db.add(doc)
        try:
            await db.flush()
            break
        except IntegrityError:
            await db.rollback()
            if attempt == 4:
                raise HTTPException(status_code=500, detail="Could not generate a unique document number")
    await db.refresh(doc)
    return doc


@router.get("/{doc_id}", response_model=WorkshopDocumentOut)
async def get_document(
    doc_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    workshop = await verify_workshop(user_id, db)
    result = await db.execute(
        select(WorkshopIssuedDocument).where(
            WorkshopIssuedDocument.id == doc_id, WorkshopIssuedDocument.workshop_id == workshop.id
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return doc
