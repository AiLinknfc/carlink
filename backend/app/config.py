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

    model_config = {"env_file": ".env", "case_sensitive": False}

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
