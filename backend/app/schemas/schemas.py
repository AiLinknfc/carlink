from __future__ import annotations

import re
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

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
    cost: Decimal = Field(default=Decimal(0))
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
    source_work_order_id: UUID | None = None
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
    # Presente solo si un taller la registró al entregar/cobrar una orden
    # (docs/PLAN_FACTURACION_AUTOMATICA.md Paso 3) — el frontend la muestra
    # sin edición cuando esto no es null.
    workshop_id: UUID | None = None
    source_work_order_id: UUID | None = None
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
class DiagnosticCdaCheck(BaseModel):
    name: str
    passed: bool


class DiagnosticCreate(BaseModel):
    vehicle_id: UUID
    alert_type: str
    description: str
    severity: str = "info"
    # Solo se usan cuando alert_type == "cda" — ver migración 032.
    cda_code: str | None = None
    cda_expiry_date: date | None = None
    cda_checks: list[DiagnosticCdaCheck] | None = None
    cda_cert_url: str | None = None


class DiagnosticOut(BaseModel):
    id: UUID
    vehicle_id: UUID
    alert_type: str
    description: str
    severity: str
    resolved: bool
    cda_code: str | None = None
    cda_expiry_date: date | None = None
    cda_checks: list[DiagnosticCdaCheck] | None = None
    cda_cert_url: str | None = None
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


class WorkshopUpdate(BaseModel):
    """Actualización parcial del perfil del taller — todo opcional, a diferencia
    de WorkshopCreate (que exige legal_id/name porque también sirve para el
    registro inicial). Usado por el módulo "Perfil del taller" del panel de
    negocio (docs/PLAN_MIGRACION_TALLERPRO.md Fase 4.10)."""
    name: str | None = None
    address: str | None = None
    city: str | None = None
    phone: str | None = None
    description: str | None = None
    logo_url: str | None = None
    stamps_required: int | None = None
    promotion_description: str | None = None
    slogan: str | None = None
    workshop_type: str | None = None
    email: str | None = None
    business_hours: str | None = None
    specialties: list[str] | None = None
    manager_name: str | None = None
    manager_role: str | None = None
    manager_avatar: str | None = None
    tax_rate_percent: Decimal | None = None
    certification_code: str | None = None
    social_instagram: str | None = None
    social_facebook: str | None = None
    social_website: str | None = None
    social_whatsapp: str | None = None
    is_published: bool | None = None


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
    is_published: bool = True
    stamps_required: int = 6
    promotion_description: str = ""
    slogan: str = ""
    workshop_type: str = ""
    email: str = ""
    business_hours: str = ""
    specialties: list[str] = Field(default_factory=list)
    manager_name: str = ""
    manager_role: str = ""
    manager_avatar: str = ""
    tax_rate_percent: Decimal = Decimal(0)
    certification_code: str = ""
    social_instagram: str = ""
    social_facebook: str = ""
    social_website: str = ""
    social_whatsapp: str = ""
    rating: float = 0.0
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


class WorkshopPublicOut(WorkshopOut):
    """Perfil público del taller (GET /workshops/{code}) — mismo shape que
    WorkshopOut más los sub-recursos que arma la ficha pública, para no
    requerir N llamadas adicionales desde el frontend."""
    mechanics: list[WorkshopMechanicOut] = Field(default_factory=list)
    service_items: list[WorkshopServiceItemOut] = Field(default_factory=list)
    reviews: list[WorkshopReviewOut] = Field(default_factory=list)


# =========== Workshop mechanics ===========
class WorkshopMechanicCreate(BaseModel):
    name: str
    role: str = ""
    specialty: str = ""
    phone: str = ""
    active: bool = True
    avatar_url: str = ""


class WorkshopMechanicUpdate(BaseModel):
    name: str | None = None
    role: str | None = None
    specialty: str | None = None
    phone: str | None = None
    active: bool | None = None
    avatar_url: str | None = None


class WorkshopMechanicOut(BaseModel):
    id: UUID
    workshop_id: UUID
    name: str
    role: str
    specialty: str
    phone: str
    active: bool
    avatar_url: str
    created_at: datetime

    model_config = {"from_attributes": True}


# =========== Workshop service catalog ===========
class WorkshopServiceItemCreate(BaseModel):
    name: str
    category: str = ""
    estimated_price: Decimal = Decimal(0)
    estimated_hours: Decimal = Decimal(0)
    description: str = ""


class WorkshopServiceItemUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    estimated_price: Decimal | None = None
    estimated_hours: Decimal | None = None
    description: str | None = None


class WorkshopServiceItemOut(BaseModel):
    id: UUID
    workshop_id: UUID
    name: str
    category: str
    estimated_price: Decimal
    estimated_hours: Decimal
    description: str
    created_at: datetime

    model_config = {"from_attributes": True}


# =========== Workshop clients & vehicles ===========
class WorkshopClientCreate(BaseModel):
    name: str
    phone: str = ""
    email: str = ""
    address: str = ""
    document_id: str = ""


class WorkshopClientUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    document_id: str | None = None


class WorkshopClientOut(BaseModel):
    id: UUID
    workshop_id: UUID
    name: str
    phone: str
    email: str
    address: str
    document_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkshopVehicleCreate(BaseModel):
    client_id: UUID
    license_plate: str
    brand: str = ""
    model: str = ""
    year: int | None = None
    vin: str = ""
    mileage: int = 0
    fuel_type: str = ""
    color: str = ""
    linked_vehicle_id: UUID | None = None


class WorkshopVehicleUpdate(BaseModel):
    license_plate: str | None = None
    brand: str | None = None
    model: str | None = None
    year: int | None = None
    vin: str | None = None
    mileage: int | None = None
    fuel_type: str | None = None
    color: str | None = None
    linked_vehicle_id: UUID | None = None


class WorkshopVehicleOut(BaseModel):
    id: UUID
    workshop_id: UUID
    client_id: UUID
    linked_vehicle_id: UUID | None
    license_plate: str
    brand: str
    model: str
    year: int | None
    vin: str
    mileage: int
    fuel_type: str
    color: str
    created_at: datetime

    model_config = {"from_attributes": True}


# =========== Work orders ===========
class WorkOrderLaborItemIn(BaseModel):
    description: str
    hours: Decimal = Decimal(0)
    rate_per_hour: Decimal = Decimal(0)


class WorkOrderLaborItemOut(BaseModel):
    id: UUID
    description: str
    hours: Decimal
    rate_per_hour: Decimal
    total: Decimal

    model_config = {"from_attributes": True}


class WorkOrderPartIn(BaseModel):
    part_id: UUID | None = None
    part_name: str
    sku: str = ""
    quantity: int = 1
    unit_cost: Decimal = Decimal(0)
    unit_price: Decimal = Decimal(0)


class WorkOrderPartOut(BaseModel):
    id: UUID
    part_id: UUID | None
    part_name: str
    sku: str
    quantity: int
    unit_cost: Decimal
    unit_price: Decimal
    subtotal: Decimal

    model_config = {"from_attributes": True}


class WorkOrderPhotoEvidenceIn(BaseModel):
    url: str
    caption: str = ""
    category: str = ""
    uploaded_by: str = ""


class WorkOrderPhotoEvidenceOut(BaseModel):
    id: UUID
    url: str
    caption: str
    category: str
    uploaded_by: str
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkOrderCreate(BaseModel):
    workshop_vehicle_id: UUID
    client_id: UUID
    mechanic_id: UUID | None = None
    estimated_completion_date: datetime | None = None
    status: str = "Pendiente"
    symptoms: str = ""
    technical_notes: str = ""
    category: str = ""
    payment_method: str = ""
    is_paid: bool = False
    labor_items: list[WorkOrderLaborItemIn] = Field(default_factory=list)
    parts_items: list[WorkOrderPartIn] = Field(default_factory=list)


class WorkOrderUpdate(BaseModel):
    mechanic_id: UUID | None = None
    estimated_completion_date: datetime | None = None
    status: str | None = None
    symptoms: str | None = None
    technical_notes: str | None = None
    category: str | None = None
    payment_method: str | None = None
    is_paid: bool | None = None
    labor_items: list[WorkOrderLaborItemIn] | None = None
    parts_items: list[WorkOrderPartIn] | None = None


class WorkOrderStatusUpdate(BaseModel):
    status: str


class WorkOrderOut(BaseModel):
    id: UUID
    workshop_id: UUID
    order_number: str
    workshop_vehicle_id: UUID
    client_id: UUID
    mechanic_id: UUID | None
    entry_date: datetime
    estimated_completion_date: datetime | None
    completed_date: datetime | None
    status: str
    symptoms: str
    technical_notes: str
    category: str
    labor_total: Decimal
    parts_total: Decimal
    total_cost_price: Decimal
    total_amount: Decimal
    tax_amount: Decimal
    final_total: Decimal
    net_profit: Decimal
    is_paid: bool
    payment_method: str
    created_at: datetime
    labor_items: list[WorkOrderLaborItemOut] = Field(default_factory=list)
    parts_items: list[WorkOrderPartOut] = Field(default_factory=list)
    photo_evidences: list[WorkOrderPhotoEvidenceOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}


# =========== Workshop inventory ===========
class WorkshopInventoryPartCreate(BaseModel):
    name: str
    sku: str = ""
    category: str = "Otros"
    stock: int = 0
    min_stock: int = 0
    cost_price: Decimal = Decimal(0)
    retail_price: Decimal = Decimal(0)
    location: str = ""
    compatible_models: list[str] = Field(default_factory=list)
    last_restock_date: date | None = None


class WorkshopInventoryPartUpdate(BaseModel):
    name: str | None = None
    sku: str | None = None
    category: str | None = None
    stock: int | None = None
    min_stock: int | None = None
    cost_price: Decimal | None = None
    retail_price: Decimal | None = None
    location: str | None = None
    compatible_models: list[str] | None = None
    last_restock_date: date | None = None


class WorkshopInventoryStockUpdate(BaseModel):
    stock: int


class WorkshopInventoryPartOut(BaseModel):
    id: UUID
    workshop_id: UUID
    sku: str
    name: str
    category: str
    stock: int
    min_stock: int
    cost_price: Decimal
    retail_price: Decimal
    location: str
    compatible_models: list[str]
    last_restock_date: date | None
    created_at: datetime

    model_config = {"from_attributes": True}


# =========== Appointments ===========
class AppointmentCreate(BaseModel):
    client_name: str
    client_phone: str = ""
    client_email: str = ""
    vehicle_plate: str = ""
    vehicle_model: str = ""
    service_category: str = ""
    notes: str = ""
    appointment_date: date
    time_slot: str
    duration_minutes: int = 60
    status: str = "Pendiente"


class AppointmentUpdate(BaseModel):
    client_name: str | None = None
    client_phone: str | None = None
    client_email: str | None = None
    vehicle_plate: str | None = None
    vehicle_model: str | None = None
    service_category: str | None = None
    notes: str | None = None
    appointment_date: date | None = None
    time_slot: str | None = None
    duration_minutes: int | None = None
    status: str | None = None


class AppointmentOut(BaseModel):
    id: UUID
    workshop_id: UUID
    client_name: str
    client_phone: str
    client_email: str
    vehicle_plate: str
    vehicle_model: str
    service_category: str
    notes: str
    appointment_date: date
    time_slot: str
    duration_minutes: int
    status: str
    converted_to_work_order_id: UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


# =========== Workshop notifications ===========
class WorkshopNotificationCreate(BaseModel):
    recipient_name: str
    recipient_phone: str = ""
    recipient_email: str = ""
    channel: str = "Email"
    notification_type: str
    message: str
    vehicle_plate: str = ""
    work_order_id: UUID | None = None


class WorkshopNotificationOut(BaseModel):
    id: UUID
    workshop_id: UUID
    recipient_name: str
    recipient_phone: str
    recipient_email: str
    channel: str
    notification_type: str
    message: str
    status: str
    vehicle_plate: str
    work_order_id: UUID | None
    sent_at: datetime

    model_config = {"from_attributes": True}


# =========== Workshop issued documents ===========
class WorkshopDocumentCreate(BaseModel):
    doc_type: str
    client_name: str
    client_tax_id: str = ""
    recipient_role: str = ""
    vehicle_plate: str = ""
    vehicle_model: str = ""
    work_order_id: UUID | None = None
    amount: Decimal | None = None
    mechanic_name: str = ""
    validity_months: int | None = None
    details: str = ""
    issued_by: str


class WorkshopDocumentOut(BaseModel):
    id: UUID
    workshop_id: UUID
    doc_number: str
    doc_type: str
    issue_date: date
    client_name: str
    client_tax_id: str
    recipient_role: str
    vehicle_plate: str
    vehicle_model: str
    work_order_id: UUID | None
    amount: Decimal | None
    mechanic_name: str
    validity_months: int | None
    details: str
    issued_by: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class VehicleInvoiceOut(BaseModel):
    """Documentos emitidos por un taller (facturas, certificados) que le
    llegan al dueño real del vehículo — docs/PLAN_FACTURACION_AUTOMATICA.md
    Paso 2. Solo existen si `workshop_vehicles.linked_vehicle_id` conecta la
    orden con una cuenta CarLink real; de ahí sale este endpoint aparte de
    `WorkshopDocumentOut` (que es la vista del taller, sin ese filtro)."""
    id: UUID
    doc_number: str
    doc_type: str
    issue_date: date
    amount: Decimal | None
    details: str
    mechanic_name: str
    vehicle_plate: str
    vehicle_model: str
    workshop_name: str
    # true si el taller emisor es un CDA — el frontend lo usa para mostrar
    # esto como certificado en vez de factura, sin inventar datos de una
    # revisión CDA real (esa sigue siendo la de `diagnostics.cda_checks`).
    workshop_is_cda: bool
    created_at: datetime


# =========== Workshop reviews ===========
class WorkshopReviewCreate(BaseModel):
    client_name: str
    rating: int = Field(ge=1, le=5)
    comment: str = ""
    vehicle_model: str = ""
    is_verified_client: bool = False


class WorkshopReviewRespond(BaseModel):
    manager_response: str


class WorkshopReviewOut(BaseModel):
    id: UUID
    workshop_id: UUID
    client_name: str
    rating: int
    review_date: date
    comment: str
    vehicle_model: str
    is_verified_client: bool
    manager_response: str
    created_at: datetime

    model_config = {"from_attributes": True}


# =========== Dashboard ===========
class WorkshopDashboardOut(BaseModel):
    active_work_orders: int
    today_appointments: int
    low_stock_alerts: int
    current_month_revenue: Decimal
    current_month_profit: Decimal
    avg_profit_margin: float
    total_clients: int


# =========== AI diagnostics ===========
class AiDiagnoseRequest(BaseModel):
    vehicle_brand: str = ""
    vehicle_model: str = ""
    vehicle_year: int | None = None
    vehicle_mileage: int | None = None
    symptoms: str


class AiDiagnoseLabor(BaseModel):
    description: str
    estimated_hours: float
    suggested_rate_per_hour: float


class AiDiagnosePart(BaseModel):
    part_name: str
    estimated_cost: float
    urgency: str


class AiDiagnoseResult(BaseModel):
    diagnostic_summary: str
    possible_causes: list[str] = Field(default_factory=list)
    recommended_labor: list[AiDiagnoseLabor] = Field(default_factory=list)
    recommended_parts: list[AiDiagnosePart] = Field(default_factory=list)
    technical_notes: str = ""
    estimated_total_cost: float = 0


# "Mejorar con IA" del compositor de notificaciones (ver
# docs/PLAN_PARIDAD_UI_TALLERPRO.md — tallerpro/NotificationsCenter.tsx).
class AiNotificationRequest(BaseModel):
    notification_type: str
    client_name: str = ""
    vehicle_plate: str = ""
    order_number: str | None = None
    total_amount: float | None = None
    draft: str | None = None


class AiNotificationResult(BaseModel):
    message: str


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
