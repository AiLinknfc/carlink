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
    plate: str | None = None
    city: str | None = None
    brand: str | None = None
    model: str | None = None
    year: int | None = None
    type: str | None = None
    color: str | None = None
    image_url: str | None = None
    nfc_active: bool | None = None

    @field_validator('plate')
    @classmethod
    def validate_plate(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.upper().strip()
        if not re.match(r'^[A-Z]{3}-\d{3}$', v):
            raise ValueError('Placa debe tener formato ABC-123 (3 letras, guión, 3 números)')
        return v


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
    brand: str = ""
    part_number: str = ""
    status: str = "ok"
    mileage_installed: int | None = None
    lifespan_mileage: int | None = None
    notes: str = ""


class PartOut(BaseModel):
    id: UUID
    vehicle_id: UUID
    name: str
    brand: str
    part_number: str
    status: str
    mileage_installed: int | None
    lifespan_mileage: int | None
    notes: str
    created_at: datetime

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
    created_at: datetime

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    account_type: str | None = None


# =========== Workshops ===========
class WorkshopCreate(BaseModel):
    legal_id: str
    name: str
    address: str = ""
    city: str = ""
    phone: str = ""
    description: str = ""
    logo_url: str | None = None
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
class NfcTokenCreate(BaseModel):
    token_hash: str
    token_prefix: str


class NfcTokenOut(BaseModel):
    id: UUID
    vehicle_id: UUID
    token_prefix: str
    label: str
    is_active: bool
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


# =========== Upload ===========
class UploadOut(BaseModel):
    url: str
    key: str
