from __future__ import annotations

import io
import json
import logging

import httpx
import pytesseract
from PIL import Image

from app.config import get_settings

logger = logging.getLogger("carlink")
settings = get_settings()

if settings.tesseract_cmd:
    pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd

TESSERACT_LANG = "spa+eng"
MAX_PDF_PAGES = 3

_STRUCTURE_SYSTEM_PROMPT = """Eres un asistente que extrae datos estructurados de texto OCR de facturas, recibos o documentos vehiculares en español (Colombia).

Devuelve SOLO un objeto JSON con estas claves (usa null cuando no encuentres el dato, nunca inventes valores):
- "title": título corto y descriptivo del documento (ej. "Factura cambio de aceite", "SOAT 2026"). Máx 60 caracteres.
- "vendor": nombre de la empresa, taller o entidad que emitió el documento.
- "issue_date": fecha del documento en formato ISO YYYY-MM-DD.
- "cost": monto total pagado, como número (sin símbolos de moneda ni separadores de miles). Ej: 185000.5
- "currency": código de moneda de 3 letras si es identificable (ej. COP, USD). null si no es claro.

No agregues texto fuera del JSON."""


class OcrUnavailableError(RuntimeError):
    pass


def extract_text_from_file(contents: bytes, content_type: str) -> str:
    try:
        if content_type == "application/pdf":
            from pdf2image import convert_from_bytes

            pages = convert_from_bytes(contents, dpi=200, first_page=1, last_page=MAX_PDF_PAGES)
            texts = [pytesseract.image_to_string(page, lang=TESSERACT_LANG) for page in pages]
            return "\n\n".join(texts).strip()

        image = Image.open(io.BytesIO(contents))
        if image.mode not in ("L", "RGB"):
            image = image.convert("RGB")
        return pytesseract.image_to_string(image, lang=TESSERACT_LANG).strip()
    except pytesseract.TesseractNotFoundError as e:
        raise OcrUnavailableError("Tesseract OCR is not installed on this server") from e


async def structure_receipt_data(raw_text: str) -> dict:
    fallback = {"title": None, "vendor": None, "issue_date": None, "cost": None, "currency": None}

    if not raw_text.strip():
        return fallback
    if not settings.deepseek_api_key:
        logger.warning("DEEPSEEK_API_KEY not configured; skipping receipt structuring")
        return fallback

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{settings.deepseek_base_url}/chat/completions",
                headers={"Authorization": f"Bearer {settings.deepseek_api_key}"},
                json={
                    "model": settings.deepseek_model,
                    "messages": [
                        {"role": "system", "content": _STRUCTURE_SYSTEM_PROMPT},
                        {"role": "user", "content": raw_text[:6000]},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0,
                },
                timeout=30,
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            return {**fallback, **parsed}
    except (httpx.HTTPError, KeyError, json.JSONDecodeError) as e:
        logger.warning(f"DeepSeek receipt structuring failed: {e}")
        return fallback

_VEHICLE_CARD_SYSTEM_PROMPT = """Eres un extractor de datos de tarjetas de propiedad vehicular de Colombia.
Recibes el texto OCR crudo de una tarjeta (licencia de tránsito) y devuelves JSON con estas claves exactas:
  plate            placa en formato ABC-123 (agrega el guión si falta), o null
  city             ciudad de matrícula, o null
  brand            marca, ej. "Mazda", o null
  model            línea o modelo, ej. "3 Grand Touring", o null
  year             año modelo como entero, o null
  color            color del vehículo, o null
  owner_name       nombre completo del propietario, o null
  document_number  cédula o NIT del propietario, sólo dígitos y guiones, o null

Reglas:
- Si un dato no aparece con claridad, devuelve null. Nunca inventes ni completes a medias.
- El OCR trae ruido: ignora encabezados, sellos y numeración de formato.
- Devuelve únicamente el objeto JSON."""


async def structure_vehicle_card_data(raw_text: str) -> dict:
    """Estructura el texto OCR de una tarjeta de propiedad.

    Sirve sólo para prellenar el registro: el usuario confirma cada campo. No
    acredita nada — la verificación real la hace una persona en CarLink.
    """
    fallback = {
        "plate": None, "city": None, "brand": None, "model": None,
        "year": None, "color": None, "owner_name": None, "document_number": None,
    }

    if not raw_text.strip():
        return fallback
    if not settings.deepseek_api_key:
        logger.warning("DEEPSEEK_API_KEY not configured; skipping vehicle card structuring")
        return fallback

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{settings.deepseek_base_url}/chat/completions",
                headers={"Authorization": f"Bearer {settings.deepseek_api_key}"},
                json={
                    "model": settings.deepseek_model,
                    "messages": [
                        {"role": "system", "content": _VEHICLE_CARD_SYSTEM_PROMPT},
                        {"role": "user", "content": raw_text[:6000]},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0,
                },
                timeout=30,
            )
            resp.raise_for_status()
            parsed = json.loads(resp.json()["choices"][0]["message"]["content"])
            return {**fallback, **{k: v for k, v in parsed.items() if k in fallback}}
    except (httpx.HTTPError, KeyError, json.JSONDecodeError) as e:
        logger.warning(f"DeepSeek vehicle card structuring failed: {e}")
        return fallback
