from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import auth, certificates, diagnostics, documents, gallery, maintenance, nfc, ocr, parts, service_logs, upload, vehicles, workshops
from app.services.cache import close_redis

settings = get_settings()
logger = logging.getLogger("carlink")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("CarLink API starting...")
    yield
    await close_redis()
    logger.info("CarLink API stopped.")


app = FastAPI(
    title="CarLink API",
    version="1.0.0",
    description="Vehicle maintenance platform API — FastAPI + Supabase + pgvector + Redis + R2",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Healthcheck
@app.get("/api/health")
async def health():
    return {"ok": True, "service": "carlink-api", "version": "1.0.0"}

# Routers
app.include_router(auth.router, prefix="/api")
app.include_router(vehicles.router, prefix="/api")
app.include_router(maintenance.router, prefix="/api")
app.include_router(nfc.router, prefix="/api")
app.include_router(parts.router, prefix="/api")
app.include_router(certificates.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(gallery.router, prefix="/api")
app.include_router(diagnostics.router, prefix="/api")
app.include_router(service_logs.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(workshops.router, prefix="/api")
app.include_router(ocr.router, prefix="/api")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.port, reload=settings.environment == "development")
