from __future__ import annotations

import asyncio
import logging
import re
import unicodedata
import uuid
from datetime import datetime, timezone
from typing import Annotated

import phonenumbers
from fastapi import APIRouter, Depends, HTTPException, Request, Response, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_admin
from app.models.models import Workshop, WorkshopApplication
from app.services.logo_image import LogoError, prepare_logo
from app.schemas.schemas import (
    KINDS_WITH_SPECIALTIES,
    WORKSHOP_BUSINESS_KINDS,
    WORKSHOP_BUSINESS_TYPES,
    WORKSHOP_CHECK_KEYS,
    WorkshopApplicationCreate,
    WorkshopApplicationOut,
    WorkshopApplicationUpdate,
)
from pydantic import BaseModel

from app.services import company_verification
from app.services import dealer_vehicles as dealer_rules
from app.services import email, geocoding, workshop_access, workshop_invites
from app.services.admin_notify import notify_admin
from app.services.cache import get_redis
from app.services.colombian_nit import is_valid_colombian_nit
from app.services.contact_validation import classify_contact
from app.services.ocr import OcrUnavailableError, extract_text_from_file, structure_chamber_data
from app.services.storage import upload_file
from app.utils import client_ip

logger = logging.getLogger("carlink")

router = APIRouter(prefix="/workshop-applications", tags=["workshop-applications"])
admin_router = APIRouter(prefix="/admin/workshop-applications", tags=["workshop-applications"])

# Tipos de negocio de nivel de confianza alto: la lista de chequeo manual es obligatoria para aprobarlos.
HIGH_TRUST_KINDS = {"cda", "compraventa"}
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
_SCAN_RATE_MAX = 6       # lecturas de Camara de Comercio por hora por IP (cada una cuesta OCR + IA)
_GEOCODE_RATE_MAX = 40   # busquedas en el mapa por hora por IP
_INVITE_RATE_MAX = 30    # consultas de invitacion por hora por IP


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


def _valid_phone(raw: str) -> bool:
    """Celular o fijo colombiano valido (o numero internacional con su indicativo)."""
    try:
        return phonenumbers.is_valid_number(phonenumbers.parse(raw.strip(), "CO"))
    except phonenumbers.NumberParseException:
        return False


async def _resolve_location(body: WorkshopApplicationCreate) -> tuple[float | None, float | None]:
    """Pin confirmado por la persona (debe caer en Colombia) o, si no confirmo, el de la direccion. Es de mejor
    esfuerzo: sin pin la postulacion igual se guarda y solo cuenta en la ciudad."""
    if body.latitude is not None and body.longitude is not None:
        if not geocoding.in_colombia(body.latitude, body.longitude):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="location_invalid")
        return round(body.latitude, 6), round(body.longitude, 6)
    coords = await geocoding.geocode_address(body.address, body.city)
    return coords if coords else (None, None)


def normalize_nit(raw: str) -> str:
    return raw.strip().upper().replace(" ", "").replace(".", "")


@router.post("/upload")
async def upload_application_file(file: UploadFile, request: Request, kind: str = ""):
    """Público: sube el logo / fachada / documento de una postulación. Acotado:
    solo PNG, JPG, WebP y PDF, verificados por firma, con tope de tamaño y de
    frecuencia por IP. Van al prefijo `applications/` (no cuentan para ningún cupo)."""
    if not await _rate_ok("upload", client_ip(request), _UPLOAD_RATE_MAX):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail="rate_limited")
    data = await file.read()
    detected = _detect_type(data)
    if detected is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="file_type_not_allowed")
    mime, ext = detected
    if len(data) > (_MAX_PDF if mime == "application/pdf" else _MAX_IMAGE):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="file_too_large")
    if kind == "logo":
        # El logo se revisa y se normaliza (recorte de márgenes, tamaño, PNG) para que se vea bien en la franja de aliados.
        if mime == "application/pdf":
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="file_type_not_allowed")
        try:
            data = await run_in_threadpool(prepare_logo, data)
        except LogoError as e:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=e.code)
        mime, ext = "image/png", "png"
    key = f"applications/{uuid.uuid4()}.{ext}"
    url = await upload_file(data, key, mime)
    return JSONResponse({"url": url, "key": key})


@router.post("/scan")
async def scan_chamber_of_commerce(file: UploadFile, request: Request):
    """Publico: lee una Camara de Comercio o RUT (foto o PDF) y devuelve los datos para prellenar el formulario.
    Ayuda de captura, no verificacion: la persona revisa todo y el envio vuelve a validar cada campo. El archivo
    queda guardado como documento de la postulacion (`doc_url`). Nunca falla duro por una mala lectura: devuelve
    los campos vacios y el formulario se llena a mano."""
    if not await _rate_ok("scan", client_ip(request), _SCAN_RATE_MAX):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail="rate_limited")
    data = await file.read()
    detected = _detect_type(data)
    if detected is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="file_type_not_allowed")
    mime, ext = detected
    if len(data) > (_MAX_PDF if mime == "application/pdf" else _MAX_IMAGE):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="file_too_large")
    try:
        raw_text = await run_in_threadpool(extract_text_from_file, data, mime)
    except OcrUnavailableError:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="ocr_unavailable")
    except Exception:
        logger.exception("chamber scan: no se pudo leer el archivo")
        raw_text = ""
    fields = await structure_chamber_data(raw_text)
    key = f"applications/{uuid.uuid4()}.{ext}"
    url = await upload_file(data, key, mime)
    return JSONResponse({"fields": fields, "doc_url": url, "doc_name": f"camara-de-comercio.{ext}"})


@router.get("/geocode")
async def geocode_for_form(request: Request, address: str = "", city: str = ""):
    """Publico: ubica una direccion para que la persona confirme el pin en el mapa del formulario.
    `precision` es "address" si se encontro la direccion, "city" si solo el centro de la ciudad (sirve para
    centrar el mapa; no es el pin del negocio) o null."""
    if not await _rate_ok("geocode", client_ip(request), _GEOCODE_RATE_MAX):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail="rate_limited")
    address, city = address.strip()[:200], city.strip()[:80]
    coords = await geocoding.geocode_address(address, city)
    if coords:
        return {"lat": coords[0], "lng": coords[1], "precision": "address"}
    coords = await geocoding.geocode_city(city)
    if coords:
        return {"lat": coords[0], "lng": coords[1], "precision": "city"}
    return {"lat": None, "lng": None, "precision": None}


def _city_key(city: str) -> str:
    """Clave para agrupar la misma ciudad escrita de distintas formas ("Bogota", "bogotá D.C.")."""
    folded = unicodedata.normalize("NFD", city.lower())
    folded = "".join(c for c in folded if unicodedata.category(c) != "Mn")
    folded = re.sub(r"\bd\.?\s?c\.?\b", " ", folded)
    return re.sub(r"[^a-z0-9]+", " ", folded).strip()


@router.get("/public-allies")
async def public_allies(response: Response, db: Annotated[AsyncSession, Depends(get_db)]):
    """Público: logos de los aliados para la franja "Marcas y aliados que confían en CarLink" de /taller. Solo negocios APROBADOS que
    autorizaron mostrar su logo (`logo_authorized`); el más reciente primero. Expone nombre, logo y, si ya tiene ficha pública, su
    código; nada de contacto, NIT ni dirección."""
    rows = (await db.execute(
        select(WorkshopApplication.name, WorkshopApplication.logo_url, WorkshopApplication.nit)
        .where(WorkshopApplication.status == "approved", WorkshopApplication.logo_authorized.is_(True),
               WorkshopApplication.logo_url.like("/api/upload/files/applications/%"))
        .order_by(WorkshopApplication.reviewed_at.desc().nullslast(), WorkshopApplication.created_at.desc())
        .limit(12)
    )).all()
    codes = {}
    if rows:
        codes = dict((await db.execute(
            select(Workshop.legal_id, Workshop.code).where(Workshop.legal_id.in_([r.nit for r in rows]), Workshop.is_published.is_(True))
        )).all())
    response.headers["Cache-Control"] = "public, max-age=60"
    return {"items": [{"name": r.name, "logo_url": r.logo_url, "code": codes.get(r.nit)} for r in rows]}


@router.get("/public-map")
async def public_map(response: Response, db: Annotated[AsyncSession, Depends(get_db)]):
    """Publico: postulaciones no rechazadas, para sumarlas al mapa de /taller. Expone solo ciudad, pin
    redondeado a ~100 m y el nombre unicamente si el negocio autorizo mostrarlo (`logo_authorized`); nada de
    contacto, NIT ni direccion."""
    rows = (await db.execute(
        select(WorkshopApplication).where(WorkshopApplication.status != "rejected")
        .order_by(WorkshopApplication.created_at)
    )).scalars().all()
    response.headers["Cache-Control"] = "public, max-age=60"
    return {"items": [
        {
            "city": r.city.strip(), "key": _city_key(r.city),
            "lat": round(r.latitude, 3) if r.latitude is not None else None,
            "lng": round(r.longitude, 3) if r.longitude is not None else None,
            "name": r.name if r.logo_authorized else None,
        }
        for r in rows if _city_key(r.city)
    ]}


@router.get("/invite/{token}")
async def invite_info(token: str, request: Request, db: Annotated[AsyncSession, Depends(get_db)]):
    """Público: datos básicos de la postulación aprobada a la que pertenece un enlace de invitación, para
    precargar el registro. Solo responde a quien ya tiene el token (personal, de un solo uso, con vencimiento)."""
    if not await _rate_ok("invite", client_ip(request), _INVITE_RATE_MAX):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail="rate_limited")
    if not 20 <= len(token) <= 128:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="invite_invalid")
    row = (await db.execute(
        select(WorkshopApplication).where(WorkshopApplication.invite_token_hash == workshop_invites.hash_token(token))
    )).scalar_one_or_none()
    if row is None or row.status != "approved":
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="invite_invalid")
    st = workshop_invites.state(row)
    if st != "valid":
        raise HTTPException(status.HTTP_410_GONE, detail=f"invite_{st}")
    return {
        "business_kind": row.business_kind, "name": row.name, "legal_id": row.nit, "city": row.city,
        "address": row.address, "phone": row.phone, "contact_name": row.contact_name,
        "grant_plan": row.grant_plan, "grant_days": row.grant_days,
    }


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
    if not await _rate_ok("submit", client_ip(request), _SUBMIT_RATE_MAX):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail="rate_limited")
    if not body.consent_accepted:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="consent_required")
    if body.business_kind not in WORKSHOP_BUSINESS_KINDS:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="business_kind_invalid")
    # El subtipo solo existe para los talleres; los demás tipos de negocio no lo llevan.
    if body.business_kind == "taller" and body.business_type not in WORKSHOP_BUSINESS_TYPES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="business_type_invalid")
    business_type = body.business_type if body.business_kind == "taller" else ""
    specialties = body.specialties.strip() if body.business_kind in KINDS_WITH_SPECIALTIES else ""
    if not is_valid_colombian_nit(body.nit):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="nit_invalid")
    classified = classify_contact(body.email)
    if classified is None or classified[0] != "email":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="email_invalid")
    email_norm = classified[1]
    if not _valid_phone(body.phone):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="phone_invalid")
    lat, lng = await _resolve_location(body)
    # Solo aceptamos archivos que subió nuestro propio endpoint.
    for u in (body.logo_url, body.facade_url, body.doc_url):
        if u and not u.startswith("/api/upload/files/applications/"):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="file_invalid")
    if not body.logo_url:
        body.logo_authorized = False  # sin logo no hay nada que autorizar mostrar

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
        business_kind=body.business_kind, business_type=business_type, name=body.name.strip(), legal_name=body.legal_name.strip(),
        nit=nit, city=body.city.strip(), address=body.address.strip(),
        contact_name=body.contact_name.strip(), contact_role=body.contact_role.strip(),
        phone=body.phone.strip(), email=email_norm, website=body.website.strip(),
        instagram=body.instagram.strip(), specialties=specialties,
        monthly_volume=body.monthly_volume.strip(), logo_url=body.logo_url,
        facade_url=body.facade_url, doc_url=body.doc_url, logo_authorized=body.logo_authorized,
        latitude=lat, longitude=lng,
        consent_version=body.consent_version.strip(), source=body.source.strip(),
    )
    # Verificación automática en el RUES: mejor esfuerzo y con tope de tiempo; si el servicio no responde la postulación igual se guarda
    # (el admin puede repetirla con el botón "Consultar RUES"). Es una ayuda: nunca aprueba ni rechaza sola.
    try:
        app_row.verification = await asyncio.wait_for(
            company_verification.verify(nit=nit, name=app_row.name, legal_name=app_row.legal_name, kind=app_row.business_kind),
            timeout=get_settings().company_verification_timeout_seconds + 2,
        )
    except Exception:
        logger.exception("company verification failed for new application")
    db.add(app_row)
    await db.flush()

    # Best-effort: un fallo de correo nunca debe perder la postulación.
    try:
        await notify_admin(
            db, kind="workshop_application", severity="warning", title=f"Postulación de taller: {app_row.name}",
            body=f"{app_row.business_kind}{(' / ' + app_row.business_type) if app_row.business_type else ''} · {app_row.city}\n{app_row.contact_name} · {app_row.phone}",
            ref=str(app_row.id), link="/admin?tab=postulaciones",
        )
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
    rows = (await db.execute(q)).scalars().all()
    nits = [r.nit for r in rows if r.invite_used_at]
    enabled = set()
    if nits:
        enabled = set((await db.execute(select(Workshop.legal_id).where(Workshop.legal_id.in_(nits), Workshop.can_certify_odometer.is_(True)))).scalars().all())
    return [WorkshopApplicationOut.model_validate(r).model_copy(update={"can_certify_odometer": r.nit in enabled}) for r in rows]


def _invite_url(raw: str) -> str:
    return f"{email.FRONTEND_URL}/register?mode=empresa&invite={raw}"


def _send_approval(row: WorkshopApplication, raw: str) -> None:
    try:
        email.send_workshop_application_approved_email(
            row.email, row.contact_name, row.name, invite_url=_invite_url(raw),
            business_kind=row.business_kind, expires_days=workshop_invites.INVITE_DAYS,
            grant_plan=row.grant_plan, grant_days=row.grant_days,
        )
    except Exception:
        logger.exception("workshop approval email failed")


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
    raw_invite: str | None = None
    if body.status is not None:
        if body.status not in _ALLOWED_STATUS:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="status_invalid")
        became_approved = body.status == "approved" and row.status != "approved"
        # Nivel de confianza alto (CDA y compraventa, docs/PLAN_ALIADOS_NEGOCIO.md sección 10): no se aprueba con la lista de chequeo
        # incompleta. Para los demás tipos es una advertencia en el panel, no un bloqueo.
        if became_approved and row.business_kind in HIGH_TRUST_KINDS:
            merged = {**(row.checks or {}), **(body.checks or {})}
            if not all(merged.get(k) for k in WORKSHOP_CHECK_KEYS):
                raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="checks_incomplete")
        row.status = body.status
        row.reviewed_at = datetime.now(timezone.utc)
        if became_approved:
            # Aprobar NO crea cuenta: invita al registro real con un enlace personal de un solo uso.
            raw_invite = workshop_invites.issue(row)
        elif body.status in ("rejected", "pending", "contacted"):
            # Un cambio hacia atrás invalida cualquier invitación sin usar.
            if workshop_invites.state(row) in ("valid", "expired"):
                row.invite_token_hash = None
                row.invite_expires_at = None
    if body.admin_notes is not None:
        row.admin_notes = body.admin_notes
    if body.grant_plan is not None:
        if body.grant_plan not in workshop_access.GRANT_PLANS:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="grant_plan_invalid")
        row.grant_plan = body.grant_plan
    if body.grant_days is not None:
        row.grant_days = body.grant_days
    if body.checks is not None:
        if set(body.checks) - WORKSHOP_CHECK_KEYS:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="check_invalid")
        row.checks = {**(row.checks or {}), **body.checks}
    await db.flush()
    await db.refresh(row)
    if raw_invite:
        _send_approval(row, raw_invite)
    return row


class CertificationIn(BaseModel):
    enabled: bool


@admin_router.patch("/{application_id}/certification")
async def set_certification(
    application_id: uuid.UUID,
    body: CertificationIn,
    _: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Da o quita el permiso de certificar kilometraje al negocio creado desde esta postulación. Es un permiso APARTE de
    la aprobación y solo existe para concesionarios y compraventas ya verificados (docs/PLAN_ALIADOS_NEGOCIO.md, sección 10)."""
    row = await db.get(WorkshopApplication, application_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="not_found")
    workshop = (await db.execute(select(Workshop).where(Workshop.legal_id == row.nit))).scalar_one_or_none()
    if workshop is None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="no_account_yet")
    if body.enabled and (workshop.business_kind not in dealer_rules.KIND_FOR_BUSINESS or not workshop.is_verified):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="kind_or_verification_not_allowed")
    workshop.can_certify_odometer = body.enabled
    await db.flush()
    return {"workshop_code": workshop.code, "can_certify_odometer": workshop.can_certify_odometer}


@admin_router.post("/{application_id}/verify", response_model=WorkshopApplicationOut)
async def verify_application(
    application_id: uuid.UUID,
    _: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Repite la consulta del NIT en el RUES y guarda el resultado (botón "Consultar RUES" del panel). Solo informa."""
    row = await db.get(WorkshopApplication, application_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="not_found")
    row.verification = await company_verification.verify(nit=row.nit, name=row.name, legal_name=row.legal_name, kind=row.business_kind)
    await db.flush()
    await db.refresh(row)
    return row


@admin_router.post("/{application_id}/resend-invite", response_model=WorkshopApplicationOut)
async def resend_invite(
    application_id: uuid.UUID,
    _: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Genera una invitación nueva (la anterior deja de servir) y la envía. Solo para aprobadas que no la usaron."""
    row = await db.get(WorkshopApplication, application_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="not_found")
    if row.status != "approved":
        raise HTTPException(status.HTTP_409_CONFLICT, detail="not_approved")
    if workshop_invites.state(row) == "used":
        raise HTTPException(status.HTTP_409_CONFLICT, detail="invite_already_used")
    raw = workshop_invites.issue(row)
    await db.flush()
    await db.refresh(row)
    _send_approval(row, raw)
    return row
