from __future__ import annotations

import io
import json
import logging

import httpx
from PIL import Image

from app.config import get_settings

logger = logging.getLogger("carlink")
settings = get_settings()

MAX_PDF_PAGES = 3

# --- OCR engine selection: prefer Tesseract, fall back to RapidOCR ---

_tesseract_available = False
_rapidocr_engine = None

try:
    import pytesseract

    if settings.tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd
    # Probe: will this actually work?
    pytesseract.get_tesseract_version()
    _tesseract_available = True
    TESSERACT_LANG = "spa+eng"
    logger.info("Using Tesseract OCR engine")
except Exception:
    logger.info("Tesseract not available, falling back to RapidOCR")
    try:
        from rapidocr_onnxruntime import RapidOCR

        _rapidocr_engine = RapidOCR()
        logger.info("RapidOCR engine loaded")
    except Exception as e:
        logger.warning(f"Neither Tesseract nor RapidOCR available: {e}")


class OcrUnavailableError(RuntimeError):
    pass


def extract_text_from_file(contents: bytes, content_type: str) -> str:
    """Extract raw text from an image or PDF using the best available OCR engine."""

    # Convert PDF pages to images first
    images: list[Image.Image] = []
    if content_type == "application/pdf":
        try:
            from pdf2image import convert_from_bytes

            images = convert_from_bytes(contents, dpi=200, first_page=1, last_page=MAX_PDF_PAGES)
        except Exception as e:
            logger.warning(f"PDF conversion failed: {e}")
            images = []
    else:
        image = Image.open(io.BytesIO(contents))
        if image.mode not in ("L", "RGB"):
            image = image.convert("RGB")
        images = [image]

    if not images:
        raise OcrUnavailableError("Could not process the file")

    # Try Tesseract first
    if _tesseract_available:
        try:
            texts = [pytesseract.image_to_string(img, lang=TESSERACT_LANG) for img in images]
            result = "\n\n".join(texts).strip()
            if result:
                return result
            # Tesseract returned empty — fall through to RapidOCR
            logger.warning("Tesseract returned empty text, trying RapidOCR")
        except Exception as e:
            logger.warning(f"Tesseract failed: {e}")

    # Try RapidOCR
    if _rapidocr_engine is not None:
        try:
            all_texts = []
            for img in images:
                import numpy as np

                img_array = np.array(img)
                result, _ = _rapidocr_engine(img_array)
                if result:
                    # RapidOCR returns list of (bbox, text, confidence)
                    page_text = "\n".join(item[1] for item in result)
                    all_texts.append(page_text)
            final = "\n\n".join(all_texts).strip()
            if final:
                return final
        except Exception as e:
            logger.warning(f"RapidOCR failed: {e}")

    raise OcrUnavailableError("No OCR engine available. Install tesseract-ocr or rapidocr-onnxruntime.")


# --- DeepSeek structuring prompts ---

_STRUCTURE_SYSTEM_PROMPT = """Eres un asistente que extrae datos estructurados de texto OCR de facturas, recibos o documentos vehiculares en español (Colombia).

Devuelve SOLO un objeto JSON con estas claves (usa null cuando no encuentres el dato, nunca inventes valores):
- "title": título corto y descriptivo del documento (ej. "Factura cambio de aceite", "SOAT 2026"). Máx 60 caracteres.
- "vendor": nombre de la empresa, taller o entidad que emitió el documento.
- "issue_date": fecha del documento en formato ISO YYYY-MM-DD.
- "cost": monto total pagado, como número (sin símbolos de moneda ni separadores de miles). Ej: 185000.5
- "currency": código de moneda de 3 letras si es identificable (ej. COP, USD). null si no es claro.

No agregues texto fuera del JSON."""


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
                timeout=60,
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            return {**fallback, **parsed}
    except (httpx.HTTPError, KeyError, json.JSONDecodeError) as e:
        logger.warning(f"DeepSeek receipt structuring failed: {e}")
        return fallback


_STRUCTURE_EXPENSE_PROMPT = """Eres un extractor de datos de recibos y facturas vehiculares en Colombia.
Detecta el TIPO de documento y extrae los campos correspondientes.

Tipos posibles: fuel (gasolina/ACPM/diesel), parts (repuestos/accesorios), service (servicio mecánico), insurance (seguro), other (otro).

Para CADA tipo extrae los campos que apliquen:

COMBUSTIBLE (fuel):
- category: "fuel"
- title: nombre de la estación o "Recibo de combustible"
- vendor: nombre de la estación (ej. "Terpel", "Esso", "Mobil", "Petrobras", "Primax")
- issue_date: fecha ISO YYYY-MM-DD
- cost: monto total pagado (número sin símbolos ni separadores de miles)
- currency: COP si es colombiano
- fuel_type: "gasolina", "acpm", "diesel" o "gas"
- fuel_liters: cantidad de litros o galones cargados (número)
- price_per_liter: precio por litro o galón (número)
- mileage: kilometraje si aparece en el recibo

REPUESTOS (parts):
- category: "parts"
- title: descripción general de la compra (ej. "Frenos y aceite")
- vendor: nombre de la tienda o repuestera
- issue_date: fecha ISO
- cost: monto total
- items: array de objetos [{name, brand, quantity, unit_price}]

SERVICIO (service):
- category: "service"
- title: tipo de servicio realizado (ej. "Cambio de aceite", "Alineación")
- vendor: nombre del taller mecánico
- issue_date: fecha ISO
- cost: monto total

SEGURO (insurance):
- category: "insurance"
- title: tipo de póliza o seguro
- vendor: aseguradora
- issue_date: fecha ISO
- cost: monto total o prima

OTRO (other):
- category: "other"
- title: descripción del gasto
- vendor: empresa o persona
- issue_date: fecha ISO
- cost: monto total

REGLAS:
- Si un dato no aparece con claridad en el texto, usa null. No inventes ni completes a medias.
- Si no puedes detectar el tipo, usa "other".
- El OCR viene con ruido: ignora encabezados, sellos, numeración de formato, números de autorización.
- Devuelve SOLO el objeto JSON, sin texto adicional."""


async def structure_expense_data(raw_text: str) -> dict:
    """Extrae datos estructurados de un recibo/factura vehicular.

    Detecta el tipo (combustible, repuestos, servicio, seguro, otro) y
    extrae los campos específicos. Los campos que no aparecen vienen como
    null para que el usuario los complete manualmente.
    """
    fallback = {
        "category": None, "title": None, "vendor": None, "issue_date": None,
        "cost": None, "currency": None, "fuel_type": None, "fuel_liters": None,
        "price_per_liter": None, "mileage": None, "items": None,
    }

    if not raw_text.strip():
        return fallback
    if not settings.deepseek_api_key:
        logger.warning("DEEPSEEK_API_KEY not configured; skipping expense structuring")
        return fallback

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{settings.deepseek_base_url}/chat/completions",
                headers={"Authorization": f"Bearer {settings.deepseek_api_key}"},
                json={
                    "model": settings.deepseek_model,
                    "messages": [
                        {"role": "system", "content": _STRUCTURE_EXPENSE_PROMPT},
                        {"role": "user", "content": raw_text[:6000]},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0,
                },
                timeout=60,
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            return {**fallback, **{k: v for k, v in parsed.items() if k in fallback}}
    except (httpx.HTTPError, KeyError, json.JSONDecodeError) as e:
        logger.warning(f"DeepSeek expense structuring failed: {e}")
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
                timeout=60,
            )
            resp.raise_for_status()
            parsed = json.loads(resp.json()["choices"][0]["message"]["content"])
            return {**fallback, **{k: v for k, v in parsed.items() if k in fallback}}
    except (httpx.HTTPError, KeyError, json.JSONDecodeError) as e:
        logger.warning(f"DeepSeek vehicle card structuring failed: {e}")
        return fallback
