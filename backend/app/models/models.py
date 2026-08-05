from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, Date, DateTime, DECIMAL, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, INET, JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    email: Mapped[str | None] = mapped_column(Text, nullable=True)
    full_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    account_type: Mapped[str] = mapped_column(Text, default="persona")
    document_number: Mapped[str] = mapped_column(Text, default="")
    # unverified | pending | verified | rejected
    verification_status: Mapped[str] = mapped_column(Text, default="unverified")
    verification_doc_url: Mapped[str] = mapped_column(Text, default="")
    verification_note: Mapped[str] = mapped_column(Text, default="")
    verification_requested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    whatsapp_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    whatsapp_number: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    vehicles = relationship("Vehicle", back_populates="owner", cascade="all, delete-orphan")
    workshops = relationship("Workshop", back_populates="owner", cascade="all, delete-orphan")
    found_requests_received = relationship("FoundRequest", back_populates="owner", foreign_keys="FoundRequest.owner_id")
    found_requests_found = relationship("FoundRequest", back_populates="finder", foreign_keys="FoundRequest.finder_id")


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"))
    plate: Mapped[str] = mapped_column(Text)
    city: Mapped[str] = mapped_column(Text, default="")
    brand: Mapped[str] = mapped_column(Text, default="")
    model: Mapped[str] = mapped_column(Text, default="")
    year: Mapped[int] = mapped_column(Integer, default=0)
    type: Mapped[str] = mapped_column(Text, default="")
    color: Mapped[str] = mapped_column(Text, default="")
    image_url: Mapped[str] = mapped_column(Text, default="")
    nfc_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sell_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    sell_price: Mapped[str] = mapped_column(Text, default="")
    sell_city: Mapped[str] = mapped_column(Text, default="")
    sell_zip: Mapped[str] = mapped_column(Text, default="")
    sell_phone: Mapped[str] = mapped_column(Text, default="")
    sell_description: Mapped[str] = mapped_column(Text, default="")
    vehicle_condition: Mapped[str] = mapped_column(Text, default="usado")
    description_embedding: Mapped[list[float] | None] = mapped_column(Vector(384), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("Profile", back_populates="vehicles")
    maintenance_records = relationship("MaintenanceRecord", back_populates="vehicle", cascade="all, delete-orphan")
    parts = relationship("Part", back_populates="vehicle", cascade="all, delete-orphan")
    certificates = relationship("Certificate", back_populates="vehicle", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="vehicle", cascade="all, delete-orphan")
    gallery_images = relationship("GalleryImage", back_populates="vehicle", cascade="all, delete-orphan")
    diagnostics = relationship("Diagnostic", back_populates="vehicle", cascade="all, delete-orphan")
    service_logs = relationship("ServiceLog", back_populates="vehicle", cascade="all, delete-orphan")


class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="CASCADE"))
    workshop_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("workshops.id", ondelete="SET NULL"), nullable=True)
    service_type: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text, default="")
    mileage: Mapped[int] = mapped_column(Integer)
    date: Mapped[date] = mapped_column(Date, server_default=func.current_date())
    workshop: Mapped[str] = mapped_column(Text, default="")
    cost: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), default=0)
    lubricant_brand: Mapped[str] = mapped_column(Text, default="")
    lubricant_type: Mapped[str] = mapped_column(Text, default="")
    next_service_mileage: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes_embedding: Mapped[list[float] | None] = mapped_column(Vector(384), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    vehicle = relationship("Vehicle", back_populates="maintenance_records")
    workshop_rel = relationship("Workshop", back_populates="maintenance_records")


class Part(Base):
    __tablename__ = "parts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(Text, default="Otros")
    brand: Mapped[str] = mapped_column(Text, default="")
    part_number: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(Text, default="ok")
    mileage_installed: Mapped[int | None] = mapped_column(Integer, nullable=True)
    lifespan_mileage: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    vehicle = relationship("Vehicle", back_populates="parts")


class Certificate(Base):
    __tablename__ = "certificates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(Text)
    issued_by: Mapped[str] = mapped_column(Text, default="")
    issue_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    file_url: Mapped[str] = mapped_column(Text, default="")
    cost: Mapped[Decimal | None] = mapped_column("amount", DECIMAL(12, 2), nullable=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    vehicle = relationship("Vehicle", back_populates="certificates")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(Text)
    type: Mapped[str] = mapped_column(Text, default="")
    file_url: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    vehicle = relationship("Vehicle", back_populates="documents")


class GalleryImage(Base):
    __tablename__ = "gallery_images"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="CASCADE"))
    image_url: Mapped[str] = mapped_column(Text)
    caption: Mapped[str] = mapped_column(Text, default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    vehicle = relationship("Vehicle", back_populates="gallery_images")


class Diagnostic(Base):
    __tablename__ = "diagnostics"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="CASCADE"))
    alert_type: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(Text, default="info")
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    # Solo aplican cuando alert_type == "cda" — resultado real de una revisión
    # técnico-mecánica (RTM/CDA), ver migración 032 y
    # docs/PLAN_MIGRACION_TALLERPRO.md Fase 6 (antes esto se inventaba en el
    # cliente: código con Math.random(), vencimiento fijo a +365 días).
    cda_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    cda_expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    cda_checks: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    cda_cert_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    vehicle = relationship("Vehicle", back_populates="diagnostics")


class NfcToken(Base):
    __tablename__ = "nfc_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"))
    vehicle_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="CASCADE"))
    token_hash: Mapped[str] = mapped_column(Text, unique=True)
    token_prefix: Mapped[str] = mapped_column(Text)
    qr_slug: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)
    label: Mapped[str] = mapped_column(Text, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    tag_uid: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, default="active")
    token_type: Mapped[str] = mapped_column(Text, default="personal")
    last_accessed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    access_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Workshop(Base):
    __tablename__ = "workshops"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), unique=True)
    legal_id: Mapped[str] = mapped_column(Text, unique=True)
    code: Mapped[str] = mapped_column(Text, unique=True)
    name: Mapped[str] = mapped_column(Text)
    address: Mapped[str] = mapped_column(Text, default="")
    city: Mapped[str] = mapped_column(Text, default="")
    phone: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str] = mapped_column(Text, default="")
    logo_url: Mapped[str] = mapped_column(Text, default="")
    rating: Mapped[float] = mapped_column(default=0.0)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    stamps_required: Mapped[int] = mapped_column(Integer, default=6)
    promotion_description: Mapped[str] = mapped_column(Text, default="")
    # Panel de negocio (migración de tallerpro/, ver docs/PLAN_MIGRACION_TALLERPRO.md)
    slogan: Mapped[str] = mapped_column(Text, default="")
    workshop_type: Mapped[str] = mapped_column(Text, default="")
    email: Mapped[str] = mapped_column(Text, default="")
    business_hours: Mapped[str] = mapped_column(Text, default="")
    specialties: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    manager_name: Mapped[str] = mapped_column(Text, default="")
    manager_role: Mapped[str] = mapped_column(Text, default="")
    manager_avatar: Mapped[str] = mapped_column(Text, default="")
    tax_rate_percent: Mapped[Decimal] = mapped_column(DECIMAL(5, 2), default=0)
    certification_code: Mapped[str] = mapped_column(Text, default="")
    social_instagram: Mapped[str] = mapped_column(Text, default="")
    social_facebook: Mapped[str] = mapped_column(Text, default="")
    social_website: Mapped[str] = mapped_column(Text, default="")
    social_whatsapp: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("Profile", back_populates="workshops")
    maintenance_records = relationship("MaintenanceRecord", back_populates="workshop_rel")
    mechanics = relationship("WorkshopMechanic", back_populates="workshop", cascade="all, delete-orphan")
    service_items = relationship("WorkshopServiceItem", back_populates="workshop", cascade="all, delete-orphan")
    clients = relationship("WorkshopClient", back_populates="workshop", cascade="all, delete-orphan")
    reviews = relationship("WorkshopReview", back_populates="workshop", cascade="all, delete-orphan")


class ServiceLog(Base):
    __tablename__ = "service_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="CASCADE"))
    log_text: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(384), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    vehicle = relationship("Vehicle", back_populates="service_logs")


class FoundRequest(Base):
    __tablename__ = "found_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"))
    finder_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="CASCADE"))
    nfc_token_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("nfc_tokens.id", ondelete="SET NULL"), nullable=True)
    message: Mapped[str] = mapped_column(Text, default="")
    contact_method: Mapped[str] = mapped_column(Text, default="email")
    finder_email: Mapped[str] = mapped_column(Text, default="")
    finder_phone: Mapped[str] = mapped_column(Text, default="")
    finder_name: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(Text, default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("Profile", back_populates="found_requests_received", foreign_keys=[owner_id])
    finder = relationship("Profile", back_populates="found_requests_found", foreign_keys=[finder_id])
    vehicle = relationship("Vehicle")


class NfcTokenLimit(Base):
    __tablename__ = "nfc_token_limits"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_type: Mapped[str] = mapped_column(Text, unique=True)
    max_tokens_per_vehicle: Mapped[int] = mapped_column(Integer, default=1)
    max_daily_access: Mapped[int] = mapped_column(Integer, default=100)
    max_unique_ips_24h: Mapped[int] = mapped_column(Integer, default=10)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class NfcAccessLog(Base):
    __tablename__ = "nfc_access_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("nfc_tokens.id", ondelete="CASCADE"))
    # Column is INET in the DB (migration 014) — must match here or asyncpg
    # rejects the insert with a DatatypeMismatchError, breaking every real scan.
    ip_address: Mapped[str | None] = mapped_column(INET, nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    country: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(Text, nullable=True)
    scanned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class NfcAlert(Base):
    __tablename__ = "nfc_alerts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("nfc_tokens.id", ondelete="CASCADE"))
    alert_type: Mapped[str] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(Text, default="warning")
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class NfcTokenWhitelist(Base):
    __tablename__ = "nfc_token_whitelist"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tag_uid: Mapped[str] = mapped_column(Text, unique=True)
    label: Mapped[str] = mapped_column(Text, default="")
    added_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True)
    # Provisioning: filled in when CarLink pre-programs a physical keychain,
    # before it's ever claimed by a user.
    activation_code_hash: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)
    token_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    token_prefix: Mapped[str | None] = mapped_column(Text, nullable=True)
    token_url_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    qr_slug: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)
    status: Mapped[str] = mapped_column(Text, default="available")
    claimed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    claimed_vehicle_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True)
    claimed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class NfcTagInventory(Base):
    """Raw metadata scanned off a physical NFC keychain (today captured
    manually with a reader app) — inventory/traceability, separate from the
    activation flow in NfcTokenWhitelist. Kept as free text since real scans
    are inconsistent (mixed date formats, blank fields)."""
    __tablename__ = "nfc_tag_inventory"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tag_type: Mapped[str] = mapped_column(Text, default="")
    technologies: Mapped[str] = mapped_column(Text, default="")
    serial_number: Mapped[str | None] = mapped_column(Text, nullable=True)
    atqa: Mapped[str] = mapped_column(Text, default="")
    sak: Mapped[str] = mapped_column(Text, default="")
    signature: Mapped[str] = mapped_column(Text, default="")
    password_protected: Mapped[str] = mapped_column(Text, default="")
    memory_info: Mapped[str] = mapped_column(Text, default="")
    data_format: Mapped[str] = mapped_column(Text, default="")
    size_info: Mapped[str] = mapped_column(Text, default="")
    writable: Mapped[str] = mapped_column(Text, default="")
    read_only: Mapped[str] = mapped_column(Text, default="")
    tag_content: Mapped[str] = mapped_column(Text, default="")
    tag_password: Mapped[str] = mapped_column(Text, default="")
    tag_created_date: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str] = mapped_column(Text, default="")
    linked_whitelist_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("nfc_token_whitelist.id", ondelete="SET NULL"), nullable=True)
    added_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class JobApplication(Base):
    __tablename__ = "job_applications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name: Mapped[str] = mapped_column(Text)
    email: Mapped[str] = mapped_column(Text)
    phone: Mapped[str] = mapped_column(Text)
    area: Mapped[str] = mapped_column(Text)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    cv_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    offer_title: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, default="new")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ─────────────────────────────────────────────────────────────────────────
# Panel de negocio del taller/empresa (migración de tallerpro/)
# Ver docs/PLAN_MIGRACION_TALLERPRO.md — todo escopeado por workshop_id,
# independiente de vehicles/parts (que son del dueño del vehículo, no del taller).
# ─────────────────────────────────────────────────────────────────────────

class WorkshopMechanic(Base):
    __tablename__ = "workshop_mechanics"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workshop_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workshops.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(Text, default="")
    specialty: Mapped[str] = mapped_column(Text, default="")
    phone: Mapped[str] = mapped_column(Text, default="")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    avatar_url: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    workshop = relationship("Workshop", back_populates="mechanics")


class WorkshopServiceItem(Base):
    __tablename__ = "workshop_service_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workshop_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workshops.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(Text, default="")
    estimated_price: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), default=0)
    estimated_hours: Mapped[Decimal] = mapped_column(DECIMAL(6, 2), default=0)
    description: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    workshop = relationship("Workshop", back_populates="service_items")


class WorkshopClient(Base):
    __tablename__ = "workshop_clients"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workshop_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workshops.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(Text)
    phone: Mapped[str] = mapped_column(Text, default="")
    email: Mapped[str] = mapped_column(Text, default="")
    address: Mapped[str] = mapped_column(Text, default="")
    document_id: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    workshop = relationship("Workshop", back_populates="clients")
    vehicles = relationship("WorkshopVehicle", back_populates="client", cascade="all, delete-orphan")


class WorkshopVehicle(Base):
    __tablename__ = "workshop_vehicles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workshop_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workshops.id", ondelete="CASCADE"))
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workshop_clients.id", ondelete="CASCADE"))
    linked_vehicle_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True)
    license_plate: Mapped[str] = mapped_column(Text)
    brand: Mapped[str] = mapped_column(Text, default="")
    model: Mapped[str] = mapped_column(Text, default="")
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    vin: Mapped[str] = mapped_column(Text, default="")
    mileage: Mapped[int] = mapped_column(Integer, default=0)
    fuel_type: Mapped[str] = mapped_column(Text, default="")
    color: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    client = relationship("WorkshopClient", back_populates="vehicles")
    # cascade explícito para que coincida con ON DELETE CASCADE de la DB en
    # work_orders.workshop_vehicle_id — sin esto, SQLAlchemy intenta poner
    # workshop_vehicle_id en NULL en vez de borrar la orden al borrar el
    # vehículo, y choca contra la columna NOT NULL (bug real encontrado en el
    # E2E de esta migración, ver docs/PLAN_MIGRACION_TALLERPRO.md).
    work_orders = relationship("WorkOrder", back_populates="workshop_vehicle", cascade="all, delete-orphan")


class WorkOrder(Base):
    __tablename__ = "work_orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workshop_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workshops.id", ondelete="CASCADE"))
    order_number: Mapped[str] = mapped_column(Text)
    workshop_vehicle_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workshop_vehicles.id", ondelete="CASCADE"))
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workshop_clients.id", ondelete="CASCADE"))
    mechanic_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("workshop_mechanics.id", ondelete="SET NULL"), nullable=True)
    entry_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    estimated_completion_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(Text, default="Pendiente")
    symptoms: Mapped[str] = mapped_column(Text, default="")
    technical_notes: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(Text, default="")
    labor_total: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), default=0)
    parts_total: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), default=0)
    total_cost_price: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), default=0)
    total_amount: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), default=0)
    tax_amount: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), default=0)
    final_total: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), default=0)
    net_profit: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), default=0)
    is_paid: Mapped[bool] = mapped_column(Boolean, default=False)
    payment_method: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    workshop_vehicle = relationship("WorkshopVehicle", back_populates="work_orders")
    client = relationship("WorkshopClient")
    mechanic = relationship("WorkshopMechanic")
    labor_items = relationship("WorkOrderLaborItem", back_populates="work_order", cascade="all, delete-orphan")
    parts_items = relationship("WorkOrderPart", back_populates="work_order", cascade="all, delete-orphan")
    photo_evidences = relationship("WorkOrderPhotoEvidence", back_populates="work_order", cascade="all, delete-orphan")


class WorkOrderLaborItem(Base):
    __tablename__ = "work_order_labor_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("work_orders.id", ondelete="CASCADE"))
    description: Mapped[str] = mapped_column(Text)
    hours: Mapped[Decimal] = mapped_column(DECIMAL(6, 2), default=0)
    rate_per_hour: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), default=0)
    total: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    work_order = relationship("WorkOrder", back_populates="labor_items")


class WorkOrderPart(Base):
    __tablename__ = "work_order_parts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("work_orders.id", ondelete="CASCADE"))
    part_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("workshop_inventory_parts.id", ondelete="SET NULL"), nullable=True)
    part_name: Mapped[str] = mapped_column(Text)
    sku: Mapped[str] = mapped_column(Text, default="")
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_cost: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), default=0)
    unit_price: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), default=0)
    subtotal: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    work_order = relationship("WorkOrder", back_populates="parts_items")


class WorkOrderPhotoEvidence(Base):
    __tablename__ = "work_order_photo_evidence"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("work_orders.id", ondelete="CASCADE"))
    url: Mapped[str] = mapped_column(Text)
    caption: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(Text, default="")
    uploaded_by: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    work_order = relationship("WorkOrder", back_populates="photo_evidences")


class WorkshopInventoryPart(Base):
    __tablename__ = "workshop_inventory_parts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workshop_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workshops.id", ondelete="CASCADE"))
    sku: Mapped[str] = mapped_column(Text, default="")
    name: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(Text, default="Otros")
    stock: Mapped[int] = mapped_column(Integer, default=0)
    min_stock: Mapped[int] = mapped_column(Integer, default=0)
    cost_price: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), default=0)
    retail_price: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), default=0)
    location: Mapped[str] = mapped_column(Text, default="")
    compatible_models: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    last_restock_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workshop_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workshops.id", ondelete="CASCADE"))
    client_name: Mapped[str] = mapped_column(Text)
    client_phone: Mapped[str] = mapped_column(Text, default="")
    client_email: Mapped[str] = mapped_column(Text, default="")
    vehicle_plate: Mapped[str] = mapped_column(Text, default="")
    vehicle_model: Mapped[str] = mapped_column(Text, default="")
    service_category: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    appointment_date: Mapped[date] = mapped_column(Date)
    time_slot: Mapped[str] = mapped_column(Text)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60)
    status: Mapped[str] = mapped_column(Text, default="Pendiente")
    converted_to_work_order_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("work_orders.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class WorkshopNotificationLog(Base):
    __tablename__ = "workshop_notifications_log"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workshop_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workshops.id", ondelete="CASCADE"))
    recipient_name: Mapped[str] = mapped_column(Text)
    recipient_phone: Mapped[str] = mapped_column(Text, default="")
    recipient_email: Mapped[str] = mapped_column(Text, default="")
    channel: Mapped[str] = mapped_column(Text, default="Email")
    notification_type: Mapped[str] = mapped_column(Text)
    message: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, default="simulado")
    vehicle_plate: Mapped[str] = mapped_column(Text, default="")
    work_order_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("work_orders.id", ondelete="SET NULL"), nullable=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class WorkshopIssuedDocument(Base):
    __tablename__ = "workshop_issued_documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workshop_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workshops.id", ondelete="CASCADE"))
    doc_number: Mapped[str] = mapped_column(Text)
    doc_type: Mapped[str] = mapped_column(Text)
    issue_date: Mapped[date] = mapped_column(Date, server_default=func.current_date())
    client_name: Mapped[str] = mapped_column(Text)
    client_tax_id: Mapped[str] = mapped_column(Text, default="")
    recipient_role: Mapped[str] = mapped_column(Text, default="")
    vehicle_plate: Mapped[str] = mapped_column(Text, default="")
    vehicle_model: Mapped[str] = mapped_column(Text, default="")
    work_order_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("work_orders.id", ondelete="SET NULL"), nullable=True)
    amount: Mapped[Decimal | None] = mapped_column(DECIMAL(12, 2), nullable=True)
    mechanic_name: Mapped[str] = mapped_column(Text, default="")
    validity_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    details: Mapped[str] = mapped_column(Text, default="")
    issued_by: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, default="Emitido")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class WorkshopReview(Base):
    __tablename__ = "workshop_reviews"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workshop_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workshops.id", ondelete="CASCADE"))
    client_name: Mapped[str] = mapped_column(Text)
    rating: Mapped[int] = mapped_column(Integer)
    review_date: Mapped[date] = mapped_column(Date, server_default=func.current_date())
    comment: Mapped[str] = mapped_column(Text, default="")
    vehicle_model: Mapped[str] = mapped_column(Text, default="")
    is_verified_client: Mapped[bool] = mapped_column(Boolean, default=False)
    manager_response: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workshop = relationship("Workshop", back_populates="reviews")
