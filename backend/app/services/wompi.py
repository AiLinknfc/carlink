from __future__ import annotations

import hashlib
import hmac
import logging

import httpx

from app.config import get_settings

logger = logging.getLogger("carlink")
settings = get_settings()

# Wompi Colombia: la API de sandbox y la de producción son hosts distintos
# con el mismo contrato — se elige según el prefijo de la llave privada
# (prv_test_ / prv_prod_) para que esto no requiera una variable de entorno
# extra ni se pueda desincronizar de qué llave está configurada.
_SANDBOX_BASE = "https://sandbox.wompi.co/v1"
_PRODUCTION_BASE = "https://production.wompi.co/v1"


def _base_url() -> str:
    return _PRODUCTION_BASE if settings.wompi_private_key.startswith("prv_prod_") else _SANDBOX_BASE


def compute_integrity_signature(reference: str, amount_in_cents: int, currency: str = "COP") -> str:
    """Firma que el widget necesita para abrir el checkout sin que el monto se
    pueda alterar desde el navegador. Fórmula exacta de Wompi (verificada
    contra su documentación real, sin separadores entre los campos):
    sha256(reference + amountInCents + currency + integritySecret)."""
    raw = f"{reference}{amount_in_cents}{currency}{settings.wompi_integrity_secret}"
    return hashlib.sha256(raw.encode()).hexdigest()


def _get_nested(data: dict, dotted_path: str):
    """'transaction.id' -> data['transaction']['id']. Las propiedades que
    Wompi manda a firmar en un evento (signature.properties) usan esta
    notación de punto sobre el objeto `data` del payload."""
    value = data
    for part in dotted_path.split("."):
        if not isinstance(value, dict) or part not in value:
            return None
        value = value[part]
    return value


def verify_webhook_checksum(payload: dict) -> bool:
    """Valida la firma de un evento (webhook) de Wompi antes de confiar en su
    contenido. checksum = sha256(concat(data[prop] por cada prop en
    signature.properties, en orden) + timestamp + eventsSecret)."""
    try:
        sig = payload["signature"]
        properties: list[str] = sig["properties"]
        expected_checksum: str = sig["checksum"]
        timestamp = payload["timestamp"]
        data = payload.get("data", {})
    except (KeyError, TypeError):
        return False

    if not settings.wompi_events_secret:
        logger.error("WOMPI_EVENTS_SECRET no configurado — no se puede verificar el webhook")
        return False

    concatenated = "".join(str(_get_nested(data, prop)) for prop in properties)
    raw = f"{concatenated}{timestamp}{settings.wompi_events_secret}"
    computed = hashlib.sha256(raw.encode()).hexdigest()
    return hmac.compare_digest(computed, expected_checksum)


async def fetch_transaction(transaction_id: str) -> dict | None:
    """Reconsulta una transacción directamente a Wompi (fuente de verdad, no
    lo que reporte el navegador ni un webhook sin verificar). Devuelve el
    objeto `data` de la respuesta o None si falla."""
    if not settings.wompi_private_key:
        logger.error("WOMPI_PRIVATE_KEY no configurado")
        return None
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{_base_url()}/transactions/{transaction_id}",
                headers={"Authorization": f"Bearer {settings.wompi_private_key}"},
            )
            if resp.status_code != 200:
                logger.warning(f"Wompi GET /transactions/{transaction_id} -> {resp.status_code}: {resp.text}")
                return None
            return resp.json().get("data")
    except httpx.HTTPError as e:
        logger.error(f"Wompi GET /transactions/{transaction_id} failed: {e}")
        return None
