from __future__ import annotations

import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_admin
from app.models.models import Workshop, WorkshopApplication
from app.schemas.schemas import (
    WORKSHOP_BUSINESS_TYPES,
    WorkshopApplicationCreate,
    WorkshopApplicationOut,
    WorkshopApplicationUpdate,
)
from app.services import email
from app.services.cache import get_redis
from app.services.colombian_nit import is_valid_colombian_nit
from app.services.contact_validation import classify_contact
from app.services.storage import upload_file

logger = logging.getLogger("carlink")

router = APIRouter(prefix="/workshop-applications", tags=["workshop-applications"])
admin_router = APIRouter(prefix="/admin/workshop-applications", tags=["workshop-applications"])

_ALLOWED_STATUS = {"pending", "contacted", "approved", "rejected"}

_MB = 1024 * 1024
_MAX_IMAGE = 2 * _MB
_MAX_PDF = 5 * _MB

# Tipo real por firma del archivo — no se confía en el Content-Type que manda el cliente.
# Sin SVG a propósito: se serviría desde nuestro dominio y puede ejecutar scripts.
_SIGNATURES: list[tuple[str, bytes, str]] = [
    ("image/png", b"\x89PNG\r\n\x1a\n", "png"),
    ("image/jpeg", b"\xff\xd8\xff", "jpg"),
    ("application/pdf", b"%PDF-", "pdf"),
]

_RATE_WINDOW = 3600
_SUBMIT_RATE_MAX = 5     # postulaciones por hora por IP
_UPLOAD_RATE_MAX = 15    # archivos por hora por IP


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def _rate_ok(kind: str, ip: str, limit: int) -> bool:
    r = await get_redis()
    if r is None:
        return True
    key = f"rate:wsapp:{kind}:{ip}"
    count = await r.incr(key)
    if count == 1:
        await r.expire(key, _RATE_WINDOW)
    return count <= limit


def _detect_type(data: bytes) -> tuple[str, str] | None:
    for mime, sig, ext in _SIGNATURES:
        if data.startswith(sig):
            return mime, ext
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp", "webp"
    return None


def normalize_nit(raw: str) -> str:
    return raw.strip().upper().replace(" ", "").replace(".", "")


@router.post("/upload")
async def upload_application_file(file: UploadFile, request: Request):
    """Público: sube el logo / fachada / documento de una postulación. Acotado:
    solo PNG, JPG, WebP y PDF, verificados por firma, con tope de tamaño y de
    frecuencia por IP. Van al prefijo `applications/` (no cuentan para ningún cupo)."""
    if not await _rate_ok("upload", _client_ip(request), _UPLOAD_RATE_MAX):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail="rate_limited")
    data = await file.read()
    detected = _detect_type(data)
    if detected is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="file_type_not_allowed")
    mime, ext = detected
    if len(data) > (_MAX_PDF if mime == "application/pdf" else _MAX_IMAGE):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="file_too_large")
    key = f"applications/{uuid.uuid4()}.{ext}"
    url = await upload_file(data, key, mime)
    return JSONResponse({"url": url, "key": key})


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_application(
    body: WorkshopApplicationCreate,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Público. Devuelve solo {"ok": true}: nada de la base vuelve al anónimo."""
    # Bot: el campo trampa viene lleno. Se responde igual que un éxito para no darle pistas.
    if body.website_confirm.strip():
        return {"ok": True}
    if not await _rate_ok("submit", _client_ip(request), _SUBMIT_RATE_MAX):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail="rate_limited")
    if not body.consent_accepted:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="consent_required")
    if body.business_type not in WORKSHOP_BUSINESS_TYPES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="business_type_invalid")
    if not is_valid_colombian_nit(body.nit):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="nit_invalid")
    classified = classify_contact(body.email)
    if classified is None or classified[0] != "email":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="email_invalid")
    email_norm = classified[1]
    if len(re.sub(r"\D", "", body.phone)) < 7:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="phone_invalid")
    # Solo aceptamos archivos que subió nuestro propio endpoint.
    for u in (body.logo_url, body.facade_url, body.doc_url):
        if u and not u.startswith("/api/upload/files/applications/"):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="file_invalid")
    if not body.logo_url:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="logo_required")

    nit = normalize_nit(body.nit)
    if (await db.execute(select(Workshop.id).where(Workshop.legal_id == nit))).first():
        raise HTTPException(status.HTTP_409_CONFLICT, detail="already_registered")
    # Idempotente: si ya hay una pendiente con este NIT no se duplica.
    dup = (await db.execute(
        select(WorkshopApplication.id).where(
            WorkshopApplication.nit == nit, WorkshopApplication.status.in_(("pending", "contacted"))
        )
    )).first()
    if dup:
        return {"ok": True}

    app_row = WorkshopApplication(
        business_type=body.business_type, name=body.name.strip(), legal_name=body.legal_name.strip(),
        nit=nit, city=body.city.strip(), address=body.address.strip(),
        contact_name=body.contact_name.strip(), contact_role=body.contact_role.strip(),
        phone=body.phone.strip(), email=email_norm, website=body.website.strip(),
        instagram=body.instagram.strip(), specialties=body.specialties.strip(),
        monthly_volume=body.monthly_volume.strip(), logo_url=body.logo_url,
        facade_url=body.facade_url, doc_url=body.doc_url, logo_authorized=body.logo_authorized,
        consent_version=body.consent_version.strip(), source=body.source.strip(),
    )
    db.add(app_row)
    await db.flush()

    # Best-effort: un fallo de correo nunca debe perder la postulación.
    try:
        email.send_workshop_application_admin_email(app_row)
        email.send_workshop_application_ack_email(app_row.email, app_row.contact_name, app_row.name)
    except Exception:
        logger.exception("workshop application email failed")
    return {"ok": True}


# ── Admin ──

@admin_router.get("", response_model=list[WorkshopApplicationOut])
async def list_applications(
    _: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    status_filter: str | None = None,
):
    q = select(WorkshopApplication).order_by(WorkshopApplication.created_at.desc())
    if status_filter:
        q = q.where(WorkshopApplication.status == status_filter)
    return (await db.execute(q)).scalars().all()


@admin_router.patch("/{application_id}", response_model=WorkshopApplicationOut)
async def update_application(
    application_id: uuid.UUID,
    body: WorkshopApplicationUpdate,
    _: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    row = await db.get(WorkshopApplication, application_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="not_found")
    if body.status is not None:
        if body.status not in _ALLOWED_STATUS:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="status_invalid")
        became_approved = body.status == "approved" and row.status != "approved"
        row.status = body.status
        row.reviewed_at = datetime.now(timezone.utc)
        if became_approved:
            # Aprobar NO crea cuenta: invita al registro real, donde se valida el NIT.
            try:
                email.send_workshop_application_approved_email(row.email, row.contact_name, row.name)
            except Exception:
                logger.exception("workshop approval email failed")
    if body.admin_notes is not None:
        row.admin_notes = body.admin_notes
    await db.flush()
    await db.refresh(row)
    return row
