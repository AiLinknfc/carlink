from __future__ import annotations

import hashlib
import hmac
import logging
import re

import httpx

from app.config import get_settings

logger = logging.getLogger("carlink")

GRAPH_URL = "https://graph.facebook.com/v25.0"
_HTTP_TIMEOUT = 15  # segundos


def normalize_co_phone(raw: str) -> str | None:
    """Devuelve el número en formato E.164 sin '+' (lo que pide la Cloud API,
    ej. '573124044313') o None si no parece un celular colombiano válido.
    Acepta '3124044313', '+57 312 404 4313', '57 312-404-4313', '0057312...'.
    Solo Colombia por ahora: el resto del producto (envíos, ciudades) es
    colombiano; un número extranjero se omite en vez de adivinarse."""
    digits = re.sub(r"\D", "", raw or "")
    if digits.startswith("00"):
        digits = digits[2:]
    if len(digits) == 10 and digits.startswith("3"):
        digits = "57" + digits
    if len(digits) == 12 and digits.startswith("573"):
        return digits
    return None


def is_configured() -> bool:
    s = get_settings()
    return bool(s.whatsapp_token and s.whatsapp_phone_id)


def send_template(
    to_phone: str,
    template: str,
    params: list[str],
    *,
    language: str | None = None,
    copy_code: str | None = None,
) -> tuple[str | None, str]:
    """Único punto de envío real (mismo patrón que email._send_email: función
    síncrona con httpx, se llama desde run_in_threadpool). Devuelve
    (provider_message_id, error) — id None + error != "" si falló. Nunca
    lanza: un fallo de WhatsApp jamás debe tumbar la confirmación de un pago.

    Que la API responda 200 con un id NO garantiza entrega — el estado real
    (delivered/read/failed) llega después por el webhook."""
    s = get_settings()
    if not is_configured():
        return None, "WhatsApp no configurado (WHATSAPP_TOKEN / WHATSAPP_PHONE_ID)"
    components: list[dict] = [
        {"type": "body", "parameters": [{"type": "text", "text": p} for p in params]}
    ]
    if copy_code:
        # Plantillas de categoría Authentication: el botón "Copy code" se
        # envía como botón url con el mismo código como parámetro.
        components.append({
            "type": "button", "sub_type": "url", "index": "0",
            "parameters": [{"type": "text", "text": copy_code}],
        })
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "template",
        "template": {
            "name": template,
            "language": {"code": language or s.whatsapp_template_lang},
            "components": components,
        },
    }
    try:
        r = httpx.post(
            f"{GRAPH_URL}/{s.whatsapp_phone_id}/messages",
            headers={"Authorization": f"Bearer {s.whatsapp_token}"},
            json=payload,
            timeout=_HTTP_TIMEOUT,
        )
        data = r.json() if r.content else {}
        if r.status_code >= 400:
            err = data.get("error", {})
            return None, f"{err.get('code', r.status_code)}: {err.get('message', r.text[:200])}"
        msgs = data.get("messages") or []
        return (msgs[0].get("id") if msgs else None), ""
    except Exception as e:  # red, timeout, JSON inválido
        logger.error(f"[whatsapp] send_template {template} failed: {e}")
        return None, f"exception: {e}"


def verify_signature(body: bytes, signature_header: str | None) -> bool:
    """Valida X-Hub-Signature-256 ('sha256=<hex>') del webhook de Meta con el
    App Secret. Sin secreto configurado, siempre rechaza — nunca se aceptan
    webhooks sin firmar."""
    secret = get_settings().whatsapp_app_secret
    if not secret or not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header.removeprefix("sha256="))


def send_text(to_phone: str, body: str) -> tuple[str | None, str]:
    """Texto libre — SOLO funciona dentro de las 24 h posteriores a que el
    cliente le escribió al número (ventana de servicio). Por eso se usa
    únicamente para responder a un mensaje entrante (Plan B mientras las
    plantillas no están aprobadas). Mismo contrato que send_template."""
    s = get_settings()
    if not is_configured():
        return None, "WhatsApp no configurado (WHATSAPP_TOKEN / WHATSAPP_PHONE_ID)"
    try:
        r = httpx.post(
            f"{GRAPH_URL}/{s.whatsapp_phone_id}/messages",
            headers={"Authorization": f"Bearer {s.whatsapp_token}"},
            json={"messaging_product": "whatsapp", "to": to_phone, "type": "text", "text": {"body": body}},
            timeout=_HTTP_TIMEOUT,
        )
        data = r.json() if r.content else {}
        if r.status_code >= 400:
            err = data.get("error", {})
            return None, f"{err.get('code', r.status_code)}: {err.get('message', r.text[:200])}"
        msgs = data.get("messages") or []
        return (msgs[0].get("id") if msgs else None), ""
    except Exception as e:
        logger.error(f"[whatsapp] send_text failed: {e}")
        return None, f"exception: {e}"
