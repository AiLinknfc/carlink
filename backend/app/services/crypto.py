from __future__ import annotations

import base64
import hashlib
import os

from app.config import get_settings


def _get_key() -> bytes:
    settings = get_settings()
    key_hex = settings.encryption_key
    if not key_hex:
        raise RuntimeError("ENCRYPTION_KEY env var not set")
    return bytes.fromhex(key_hex)


def encrypt_url(plaintext: str) -> str:
    """Encrypt a URL string using AES-256-GCM. Returns base64(iv || tag || ciphertext)."""
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    key = _get_key()
    nonce = os.urandom(12)
    aesgcm = AESGCM(key)
    ct = aesgcm.encrypt(nonce, plaintext.encode(), None)
    return base64.b64encode(nonce + ct).decode()


def decrypt_url(token: str) -> str | None:
    """Decrypt a base64-encoded AES-256-GCM blob. Returns plaintext or None on failure."""
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM

        key = _get_key()
        raw = base64.b64decode(token)
        nonce = raw[:12]
        ct = raw[12:]
        aesgcm = AESGCM(key)
        return aesgcm.decrypt(nonce, ct, None).decode()
    except Exception:
        return None
