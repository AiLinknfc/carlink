from __future__ import annotations

import uuid
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import Certificate, Vehicle
from app.schemas.schemas import CertificateCreate, CertificateOut, CertificateUpdate
from app.services.storage import get_file, key_from_url

router = APIRouter(prefix="/certificates", tags=["certificates"])


async def _verify_vehicle(vehicle_id: UUID, user_id: str, db: AsyncSession):
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.owner_id == uuid.UUID(user_id)))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")


@router.get("/vehicle/{vehicle_id}", response_model=list[CertificateOut])
async def list_certificates(
    vehicle_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _verify_vehicle(vehicle_id, user_id, db)
    result = await db.execute(
        select(Certificate).where(Certificate.vehicle_id == vehicle_id).order_by(Certificate.issue_date.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=CertificateOut, status_code=status.HTTP_201_CREATED)
async def create_certificate(
    body: CertificateCreate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _verify_vehicle(body.vehicle_id, user_id, db)
    cert = Certificate(**body.model_dump())
    db.add(cert)
    await db.flush()
    await db.refresh(cert)
    return cert


@router.put("/{cert_id}", response_model=CertificateOut)
async def update_certificate(
    cert_id: UUID,
    body: CertificateUpdate,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Certificate).where(Certificate.id == cert_id))
    cert = result.scalar_one_or_none()
    if not cert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found")
    await _verify_vehicle(cert.vehicle_id, user_id, db)
    for key, val in body.model_dump(exclude_unset=True).items():
        setattr(cert, key, val)
    await db.flush()
    await db.refresh(cert)
    return cert


@router.get("/{cert_id}/download")
async def download_certificate(
    cert_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Certificate).where(Certificate.id == cert_id))
    cert = result.scalar_one_or_none()
    if not cert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found")
    await _verify_vehicle(cert.vehicle_id, user_id, db)

    key = key_from_url(cert.file_url)
    if not key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No file attached to this certificate")

    contents, content_type = await run_in_threadpool(get_file, key)
    ext = key.rsplit(".", 1)[-1] if "." in key else "bin"
    safe_name = "".join(c for c in cert.name if c.isalnum() or c in " -_") or "certificado"
    return Response(
        content=contents,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{safe_name}.{ext}"'},
    )


@router.delete("/{cert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_certificate(
    cert_id: UUID,
    user_id: Annotated[str, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Certificate).where(Certificate.id == cert_id))
    cert = result.scalar_one_or_none()
    if not cert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found")
    await _verify_vehicle(cert.vehicle_id, user_id, db)
    await db.delete(cert)
