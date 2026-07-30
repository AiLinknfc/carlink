from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
import re

from pydantic import BaseModel, Field, field_validator


# =========== Vehicle ===========
class VehicleCreate(BaseModel):
    plate: str
    city: str = ""
    brand: str = ""
    model: str = ""
    year: int = 0
    type: str = ""
    color: str = ""
    image_url: str = ""

    @field_validator('plate')
    @classmethod
    def validate_plate(cls, v: str) -> str:
        v = v.upper().strip()
        if not re.match(r'^[A-Z]{3}-\d{3}$', v):
            raise ValueError('Placa debe tener formato ABC-123 (3 letras, guión, 3 números)')
        return v


class VehicleUpdate(BaseModel):
    # plate, city y type quedan fuera a propósito: la placa está ligada al
    # llavero y sólo se renueva con una compra. Bloquearlos sólo en la UI no
    # sirve — el endpoint los aceptaba y cualquiera podía cambiarlos.
    brand: str | None = None
    model: str | None = None
    year: int | None = None
    color: str | None = None
    image_url: str | None = None
    nfc_active: bool | None = None
    sell_enabled: bool | None = None
    sell_price: str | None = None
    sell_city: str | None = None
    sell_zip: str | None = None
    sell_phone: str | None = None
    sell_description: str | None = None
    vehicle_condition: str | None = None

    # El validador de placa vivía aquí; se fue con el campo. La validación de
    # formato sigue en VehicleCreate, que es donde la placa se fija.


class VehicleOut(BaseModel):
    id: UUID
    owner_id: UUID
    plate: str
    city: str
    brand: str
    model: str
    year: int
    type: str
    color: str
    image_url: str
    nfc_active: bool
    sell_enabled: bool = False
    sell_price: str = ""
    sell_city: str = ""
    sell_zip: str = ""
    sell_phone: str = ""
    sell_description: str = ""
    vehicle_condition: str = "usado"
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# =========== Maintenance ===========
class MaintenanceCreate(BaseModel):
    vehicle_id: UUID
    service_type: str
    description: str = ""
    mileage: int
    date: str | None = None
    workshop: str = ""
    workshop_id: UUID | None = None
    cost: Decimal = Field(default=Decimal("0"))
    lubricant_brand: str = ""
    lubricant_type: str = ""
    next_service_mileage: int | None = None


class MaintenanceOut(BaseModel):
    id: UUID
    vehicle_id: UUID
    workshop_id: UUID | None = None
    service_type: str
    description: str
    mileage: int
    date: date
    workshop: str
    cost: Decimal
    lubricant_brand: str
    lubricant_type: str
    next_service_mileage: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


# =========== Parts ===========
class PartCreate(BaseModel):
    vehicle_id: UUID
    name: str
    category: str = "Otros"
    brand: str = ""
    part_number: str = ""
    status: str = "ok"
    mileage_installed: int | None = None
    lifespan_mileage: int | None = None
    notes: str = ""


class PartUpdate(BaseModel):
    """Actualización parcial. Antes el PUT reutilizaba PartCreate, que exige
    vehicle_id y name, así que toda actualización enviada por el formulario de
    servicios era rechazada con 422 — y el front la descartaba en silencio."""
    name: str | None = None
    category: str | None = None
    brand: str | None = None
    part_number: str | None = None
    status: str | None = None
    mileage_installed: int | None = None
    lifespan_mileage: int | None = None
    notes: str | None = None


class PartOut(BaseModel):
    id: UUID
    vehicle_id: UUID
    name: str
    category: str
    brand: str
    part_number: str
    status: str
    mileage_installed: int | None
    lifespan_mileage: int | None
    notes: str
    created_at: datetime
    # Fecha del último reemplazo: la batería envejece por tiempo, no sólo por km.
    # El tipo del frontend ya lo declaraba, pero el backend nunca lo enviaba.
    updated_at: datetime

    model_config = {"from_attributes": True}


# =========== Certificates ===========
class CertificateCreate(BaseModel):
    vehicle_id: UUID
    name: str
    issued_by: str = ""
    issue_date: date | None = None
    expiry_date: date | None = None
    file_url: str = ""
    cost: Decimal | None = None
    notes: str = ""


class CertificateUpdate(BaseModel):
    name: str | None = None
    issued_by: str | None = None
    issue_date: date | None = None
    expiry_date: date | None = None
    file_url: str | None = None
    cost: Decimal | None = None
    notes: str | None = None


class CertificateOut(BaseModel):
    id: UUID
    vehicle_id: UUID
    name: str
    issued_by: str
    issue_date: date | None
    expiry_date: date | None
    file_url: str
    cost: Decimal | None
    notes: str
    created_at: datetime

    model_config = {"from_attributes": True}


# =========== Documents ===========
class DocumentCreate(BaseModel):
    vehicle_id: UUID
    name: str
    type: str = ""
    file_url: str = ""
    notes: str = ""


class DocumentUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    file_url: str | None = None
    notes: str | None = None


class DocumentOut(BaseModel):
    id: UUID
    vehicle_id: UUID
    name: str
    type: str
    file_url: str
    notes: str
    created_at: datetime

    model_config = {"from_attributes": True}


# =========== OCR ===========
class VehicleCardResult(BaseModel):
    """Datos leídos de una tarjeta de propiedad. Sólo prellenan el registro:
    el usuario confirma y la verificación real la hace una persona."""
    plate: str | None = None
    city: str | None = None
    brand: str | None = None
    model: str | None = None
    year: int | None = None
    color: str | None = None
    owner_name: str | None = None
    document_number: str | None = None
    raw_text: str


class OcrExtractResult(BaseModel):
    title: str | None = None
    vendor: str | None = None
    issue_date: str | None = None
    cost: Decimal | None = None
    currency: str | None = None
    raw_text: str


# =========== Gallery ===========
class GalleryCreate(BaseModel):
    vehicle_id: UUID
    image_url: str
    caption: str = ""


class GalleryUpdate(BaseModel):
    caption: str | None = None
    image_url: str | None = None


class GalleryOut(BaseModel):
    id: UUID
    vehicle_id: UUID
    image_url: str
    caption: str
    sort_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


# =========== Diagnostics ===========
class DiagnosticCreate(BaseModel):
    vehicle_id: UUID
    alert_type: str
    description: str
    severity: str = "info"


class DiagnosticOut(BaseModel):
    id: UUID
    vehicle_id: UUID
    alert_type: str
    description: str
    severity: str
    resolved: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# =========== Profile ===========
class ProfileOut(BaseModel):
    id: UUID
    email: str | None
    full_name: str | None
    avatar_url: str | None
    account_type: str = "persona"
    document_number: str = ""
    verification_status: str = "unverified"
    verification_doc_url: str = ""
    verification_note: str = ""
    verified_at: datetime | None = None
    whatsapp_enabled: bool = False
    whatsapp_number: str = ""
    created_at: datetime

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    account_type: str | None = None
    document_number: str | None = None
    whatsapp_enabled: bool | None = None
    whatsapp_number: str | None = None
    # verification_status queda fuera a propósito: el usuario no puede
    # auto-verificarse. Sólo /auth/me/verification lo mueve a "pending".


class VerificationRequest(BaseModel):
    verification_doc_url: str


# =========== Workshops ===========
class WorkshopCreate(BaseModel):
    legal_id: str
    name: str
    address: str = ""
    city: str = ""
    phone: str = ""
    description: str = ""
    logo_url: str | None = None
    stamps_required: int = 6
    promotion_description: str = ""
    # Optional vehicle registration for workshops that need a test vehicle
    plate: str | None = None
    brand: str | None = None
    model: str | None = None
    year: int | None = None
    vehicle_type: str | None = None
    color: str | None = None
    vehicle_city: str | None = None


class WorkshopOut(BaseModel):
    id: UUID
    owner_id: UUID
    legal_id: str
    code: str
    name: str
    address: str
    city: str
    phone: str
    description: str
    logo_url: str
    is_verified: bool
    stamps_required: int = 6
    promotion_description: str = ""
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkshopSearchResult(BaseModel):
    id: UUID
    code: str
    name: str
    address: str
    city: str
    phone: str
    is_verified: bool


# =========== Service Logs ===========
class ServiceLogCreate(BaseModel):
    vehicle_id: UUID
    log_text: str


class ServiceLogOut(BaseModel):
    id: UUID
    vehicle_id: UUID
    log_text: str
    created_at: datetime

    model_config = {"from_attributes": True}


# =========== NFC Tokens ===========
class NfcActivateRequest(BaseModel):
    """A token can only become active by claiming a keychain CarLink already
    provisioned — there is no self-service creation anymore."""
    activation_code: str


class NfcTokenOut(BaseModel):
    id: UUID
    vehicle_id: UUID
    token_prefix: str
    label: str
    is_active: bool
    has_url: bool = False
    last_accessed_at: datetime | None = None
    access_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class NfcTokenInfoPublic(BaseModel):
    """Public data exposed via NFC chip scan — no owner info."""
    plate: str
    brand: str
    model: str
    year: int
    color: str
    type: str
    vehicle_id: UUID
    # Ficha técnica (from latest maintenance record)
    current_mileage: int | None = None
    next_service_mileage: int | None = None
    lubricant_brand: str = ""
    lubricant_type: str = ""
    total_services: int = 0
    latest_service_date: str | None = None
    workshop_name: str | None = None
    workshop_rating: float = 0.0
    # Sell info
    sell_enabled: bool = False
    sell_price: str = ""
    sell_city: str = ""
    sell_zip: str = ""
    sell_phone: str = ""
    sell_description: str = ""
    # Vehicle info
    vehicle_condition: str = "usado"
    published_at: str | None = None
    owner_whatsapp: str = ""
    owner_name: str = ""


# =========== Upload ===========
class UploadOut(BaseModel):
    url: str
    key: str


# =========== Found Requests ===========
class FoundRequestCreate(BaseModel):
    vehicle_id: UUID
    nfc_token_id: UUID | None = None
    message: str = ""
    contact_method: str = "phone"
    finder_email: str = ""
    finder_phone: str = ""
    finder_name: str = ""


class FoundRequestOut(BaseModel):
    id: UUID
    owner_id: UUID
    finder_id: UUID | None = None
    vehicle_id: UUID
    nfc_token_id: UUID | None = None
    message: str
    contact_method: str
    finder_email: str
    finder_phone: str
    finder_name: str
    status: str
    created_at: datetime
    # Joined data
    vehicle_plate: str = ""
    vehicle_brand: str = ""
    vehicle_model: str = ""
    owner_name: str = ""
    owner_email: str = ""
    owner_whatsapp: str = ""

    model_config = {"from_attributes": True}


# =========== NFC Admin ===========
class NfcTokenAdminOut(BaseModel):
    id: UUID
    user_id: UUID
    vehicle_id: UUID
    token_prefix: str
    label: str
    is_active: bool
    tag_uid: str | None = None
    status: str = "active"
    token_type: str = "personal"
    last_accessed_at: datetime | None = None
    access_count: int = 0
    created_at: datetime
    # Joined
    user_email: str = ""
    user_name: str = ""
    vehicle_plate: str = ""
    vehicle_brand: str = ""
    # Short redirect URL for the printable keychain QR — not a secret, can
    # always be re-shown (unlike the one-time activation code/raw token).
    qr_url: str | None = None

    model_config = {"from_attributes": True}


class NfcTokenUpdate(BaseModel):
    label: str | None = None
    status: str | None = None
    tag_uid: str | None = None
    is_active: bool | None = None


class NfcTokenLimitOut(BaseModel):
    id: UUID
    account_type: str
    max_tokens_per_vehicle: int
    max_daily_access: int
    max_unique_ips_24h: int
    updated_at: datetime

    model_config = {"from_attributes": True}


class NfcTokenLimitUpdate(BaseModel):
    max_tokens_per_vehicle: int | None = None
    max_daily_access: int | None = None
    max_unique_ips_24h: int | None = None


class NfcAccessLogOut(BaseModel):
    id: UUID
    token_id: UUID
    ip_address: str | None = None
    user_agent: str | None = None
    country: str | None = None
    city: str | None = None
    scanned_at: datetime

    model_config = {"from_attributes": True}


class NfcAlertOut(BaseModel):
    id: UUID
    token_id: UUID
    alert_type: str
    severity: str
    message: str | None = None
    resolved: bool
    resolved_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class NfcAlertResolve(BaseModel):
    resolved: bool = True


class NfcWhitelistOut(BaseModel):
    id: UUID
    tag_uid: str
    label: str
    status: str = "available"
    added_by: UUID | None = None
    claimed_by: UUID | None = None
    claimed_at: datetime | None = None
    created_at: datetime
    # Joined
    claimed_by_email: str = ""
    claimed_by_name: str = ""
    # Short redirect URL for the printable keychain QR — not a secret, can
    # always be re-shown (unlike the one-time activation code/raw token).
    qr_url: str | None = None

    model_config = {"from_attributes": True}


class NfcWhitelistCreate(BaseModel):
    tag_uid: str
    label: str = ""


class NfcWhitelistBulkCreate(BaseModel):
    entries: list[NfcWhitelistCreate]


class NfcWhitelistProvisionCreate(BaseModel):
    tag_uid: str
    label: str = ""


class NfcWhitelistProvisionOut(BaseModel):
    """Returned ONCE at provisioning time: the raw activation code and raw
    token URL to print on the physical keychain / packaging. Neither is
    ever stored in plaintext, so this response cannot be reconstructed later.
    qr_url is NOT one-time-only — it's a short, re-showable redirect link
    meant to be printed as a QR alongside the NFC chip."""
    id: UUID
    tag_uid: str
    activation_code: str
    token_url: str
    qr_url: str


class NfcStatsOut(BaseModel):
    total_tokens: int
    active_tokens: int
    total_access_today: int
    total_alerts: int
    unresolved_alerts: int
    whitelist_count: int


# =========== Job Applications ===========

class JobApplicationCreate(BaseModel):
    full_name: str
    email: str
    phone: str
    area: str
    message: str | None = None
    cv_url: str | None = None
    offer_title: str | None = None


class JobApplicationOut(BaseModel):
    id: UUID
    full_name: str
    email: str
    phone: str
    area: str
    message: str | None = None
    cv_url: str | None = None
    offer_title: str | None = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


# =========== NFC Tag Inventory ===========
# Raw metadata scanned off a physical keychain (manual today, meant to be
# automated later). Fields are free text on purpose — real scans are
# inconsistent (mixed date formats, blank columns).

class NfcTagInventoryCreate(BaseModel):
    tag_type: str = ""
    technologies: str = ""
    serial_number: str | None = None
    atqa: str = ""
    sak: str = ""
    signature: str = ""
    password_protected: str = ""
    memory_info: str = ""
    data_format: str = ""
    size_info: str = ""
    writable: str = ""
    read_only: str = ""
    tag_content: str = ""
    tag_password: str = ""
    tag_created_date: str = ""
    description: str = ""
    linked_whitelist_id: UUID | None = None


class NfcTagInventoryBulkCreate(BaseModel):
    entries: list[NfcTagInventoryCreate]


class NfcTagInventoryOut(BaseModel):
    id: UUID
    tag_type: str
    technologies: str
    serial_number: str | None = None
    atqa: str
    sak: str
    signature: str
    password_protected: str
    memory_info: str
    data_format: str
    size_info: str
    writable: str
    read_only: str
    tag_content: str
    tag_password: str
    tag_created_date: str
    description: str
    linked_whitelist_id: UUID | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
