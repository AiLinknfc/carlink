from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass

from app.config import get_settings
from app.services.crypto import encrypt_url

# No 0/O/1/I/L — avoids confusion when a human reads the code off a printed
# label or types it in by hand.
_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

# Free 7-day public-ficha trial — taller/empresa only. Persona never gets a
# free ficha; it always requires a claimed (token_type='personal') keychain.
TRIAL_DAYS = 7
TRIAL_ACCOUNT_TYPES = {"taller", "empresa", "business"}


def generate_human_code(length: int = 10) -> str:
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(length))


@dataclass
class GeneratedNfcToken:
    raw_token: str
    token_hash: str
    token_prefix: str
    token_url: str
    token_url_encrypted: str | None
    qr_slug: str
    qr_url: str


def generate_nfc_token() -> GeneratedNfcToken:
    """Generate the material for one NFC identity: the long token (written to
    the physical chip, or held for a trial link) plus a short qr_slug for a
    print-friendly QR. Both resolve to the same ficha — the QR just does it
    through a short redirect (GET /nfc/q/{slug}) instead of the long URL, so
    it can be printed small with a simple, damage-tolerant pattern."""
    settings = get_settings()
    raw_token = secrets.token_hex(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    token_prefix = raw_token[:8]
    token_url = f"{settings.frontend_url}/nfc/{raw_token}"
    token_url_encrypted = encrypt_url(token_url)
    qr_slug = generate_human_code(8)
    qr_url = f"{settings.frontend_url}/nfc/q/{qr_slug}"
    return GeneratedNfcToken(
        raw_token=raw_token,
        token_hash=token_hash,
        token_prefix=token_prefix,
        token_url=token_url,
        token_url_encrypted=token_url_encrypted,
        qr_slug=qr_slug,
        qr_url=qr_url,
    )
