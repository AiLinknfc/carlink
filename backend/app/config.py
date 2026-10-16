from __future__ import annotations

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_key: str = ""

    # Database
    database_url: str = "postgresql+asyncpg://localhost:5432/carlink"

    # Redis (Upstash / Elasticache)
    redis_url: str = ""

    # Cloudflare R2
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = "carlink-images"
    r2_endpoint: str = ""
    r2_public_url: str = ""

    # Respuesta automática a llaveros NFC con actividad que parece clonado/fuga/rastreo
    # (services/alerts.py): pausa el llavero y avisa. Apagable sin desplegar con NFC_AUTO_PAUSE_ENABLED=false.
    nfc_auto_pause_enabled: bool = True
    nfc_auto_pause_ips: int = 10     # conexiones distintas en 24 h
    nfc_auto_pause_scans: int = 200  # lecturas en 24 h

    # Vinculo taller-conductor por QR (docs/PLAN_VINCULO_TALLER_CONDUCTOR.md). Apagado por defecto: con False los
    # endpoints responden 404 y el vinculo por placa del taller sigue como antes. Encender con WORKSHOP_LINKS_ENABLED=true.
    workshop_links_enabled: bool = False

    # Registro de negocios con invitación (docs/PLAN_ALIADOS_NEGOCIO.md, Fase 0). Con False, POST /workshops sigue
    # aceptando cualquier alta (con o sin invitación; una invitación válida igual marca el negocio como verificado).
    # Con True, sin invitación aprobada no se crea el negocio. Encender con WORKSHOP_INVITE_REQUIRED=true cuando el
    # flujo de aprobación esté probado en producción.
    workshop_invite_required: bool = False

    # Codigo de alianza (docs/PLAN_ALIADOS_NEGOCIO.md, seccion 5): descuento por llavero para el comprador que usa el
    # codigo de un negocio aliado. El kit ($10.000) se activa cuando el kit tenga producto propio en el backend.
    alliance_discount_per_keychain_cop: int = 7000
    alliance_discount_per_kit_cop: int = 10000
    # Tope de llaveros con descuento por negocio en 30 dias (pedidos pagados, o pendientes de las ultimas 48 h).
    alliance_monthly_cap_units: int = 30

    # Verificación automática de empresas contra el RUES (datos abiertos de Confecámaras en datos.gov.co; sin clave).
    company_verification_enabled: bool = True
    company_verification_timeout_seconds: float = 6.0

    # CORS
    cors_origins: str = "http://localhost:3000"

    # JWT
    supabase_jwt_secret: str = ""

    # DeepSeek (structures raw OCR text into title/vendor/date/cost)
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-chat"

    # Tesseract (local OCR — reads text out of scanned receipts/invoices)
    tesseract_cmd: str = ""

    # Server
    port: int = 8000
    environment: str = "development"
    # Used to build the public NFC URL written to physical keychains at
    # provisioning time (POST /admin/nfc/whitelist/provision).
    frontend_url: str = "http://localhost:3000"

    # Admin
    admin_user_id: str = ""
    admin_email: str = ""

    # Encryption (AES-256-GCM, 64-char hex = 32 bytes)
    encryption_key: str = ""

    # WhatsApp Cloud API (Meta) — envío automático del código de activación.
    # Todas secretas salvo template/lang; van en backend/.env y Railway, nunca
    # en el repo (docs/SECURITY.md). Plantillas aprobadas en WhatsApp Manager.
    whatsapp_token: str = ""
    whatsapp_phone_id: str = ""
    whatsapp_app_secret: str = ""
    whatsapp_verify_token: str = ""
    whatsapp_template_code: str = "codigo_activacion_carlink"  # invitado: incluye el código
    whatsapp_template_ready: str = "codigo_listo_carlink"  # con cuenta: solo avisa
    whatsapp_template_lang: str = "es"

    # Wompi (pasarela de pagos del checkout del llavero NFC). La llave
    # pública NO va acá — es del frontend (NEXT_PUBLIC_WOMPI_PUBLIC_KEY),
    # se manda al navegador a propósito. Estas tres son secretas.
    wompi_private_key: str = ""
    wompi_events_secret: str = ""
    wompi_integrity_secret: str = ""

    model_config = {"env_file": ".env", "case_sensitive": False, "extra": "ignore"}

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
