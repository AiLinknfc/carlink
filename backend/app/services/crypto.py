from __future__ import annotations

import base64
import logging
import os

from app.config import get_settings

logger = logging.getLogger("carlink")


def _get_key() -> bytes | None:
    settings = get_settings()
    key_hex = settings.encryption_key
    if not key_hex:
        return None
    return bytes.fromhex(key_hex)


def encrypt_url(plaintext: str) -> str | None:
    """Encrypt a URL string using AES-256-GCM. Returns base64(iv || tag || ciphertext).
    Returns None if ENCRYPTION_KEY is not set (graceful degradation)."""
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM

        key = _get_key()
        if key is None:
            logger.warning("ENCRYPTION_KEY not set — storing URL unencrypted")
            return None
        nonce = os.urandom(12)
        aesgcm = AESGCM(key)
        ct = aesgcm.encrypt(nonce, plaintext.encode(), None)
        return base64.b64encode(nonce + ct).decode()
    except Exception as e:
        logger.warning(f"encrypt_url failed: {e}")
        return None


def decrypt_url(token: str) -> str | None:
    """Decrypt a base64-encoded AES-256-GCM blob. Returns plaintext or None on failure."""
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM

        key = _get_key()
        if key is None:
            return None
        raw = base64.b64decode(token)
        nonce = raw[:12]
        ct = raw[12:]
        aesgcm = AESGCM(key)
        return aesgcm.decrypt(nonce, ct, None).decode()
    except Exception:
        return None


# ---- Cifrado de campos sensibles (documento del propietario) ----
# A diferencia de encrypt_url (que degrada a "sin cifrar" si falta la clave), acá se falla
# cerrado: un documento de identidad nunca se guarda en claro.
FIELD_PREFIX = "enc1:"


class EncryptionUnavailable(RuntimeError):
    """No hay ENCRYPTION_KEY: no se puede guardar un dato sensible."""


def encrypt_field(plaintext: str) -> str:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    key = _get_key()
    if key is None:
        raise EncryptionUnavailable("ENCRYPTION_KEY no configurada")
    nonce = os.urandom(12)
    return FIELD_PREFIX + base64.b64encode(nonce + AESGCM(key).encrypt(nonce, plaintext.encode(), None)).decode()


def decrypt_field(token: str) -> str | None:
    """Plaintext, o None si no se puede descifrar (clave ausente/distinta o dato corrupto)."""
    if not token.startswith(FIELD_PREFIX):
        return None
    result = decrypt_url(token[len(FIELD_PREFIX):])
    return result


def hmac_digest(message: str) -> str:
    """Huella HMAC-SHA256 con la clave de cifrado (un hash simple de un documento de pocos dígitos
    se revertiría por fuerza bruta)."""
    import hashlib
    import hmac

    key = _get_key()
    if key is None:
        raise EncryptionUnavailable("ENCRYPTION_KEY no configurada")
    return hmac.new(key, message.encode(), hashlib.sha256).hexdigest()
