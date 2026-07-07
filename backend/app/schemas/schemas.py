from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


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


class VehicleUpdate(BaseModel):
    plate: str | None = None
    city: str | None = None
    brand: str | None = None
    model: str | None = None
    year: int | None = None
    type: str | None = None
    color: str | None = None
    image_url: str | None = None


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
    cost: Decimal = Field(default=Decimal("0"))
    lubricant_brand: str = ""
    lubricant_type: str = ""
    next_service_mileage: int | None = None


class MaintenanceOut(BaseModel):
    id: UUID
    vehicle_id: UUID
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
    part_number: str = ""
    status: str = "ok"
    mileage_installed: int | None = None
    lifespan_mileage: int | None = None
    notes: str = ""


class PartOut(BaseModel):
    id: UUID
    vehicle_id: UUID
    name: str
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
    issue_date: str | None = None
    expiry_date: str | None = None
    file_url: str = ""
    notes: str = ""


class CertificateOut(BaseModel):
    id: UUID
    vehicle_id: UUID
    name: str
    issued_by: str
    issue_date: date | None
    expiry_date: date | None
    file_url: str
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


class DocumentOut(BaseModel):
    id: UUID
    vehicle_id: UUID
    name: str
    type: str
    file_url: str
    notes: str
    created_at: datetime

    model_config = {"from_attributes": True}


# =========== Gallery ===========
class GalleryCreate(BaseModel):
    vehicle_id: UUID
    image_url: str
    caption: str = ""


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
    created_at: datetime

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    full_name: str | None = None


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


# =========== Upload ===========
class UploadOut(BaseModel):
    url: str
    key: str
