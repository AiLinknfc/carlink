from __future__ import annotations

import json
from datetime import datetime

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings

settings = get_settings()
JWKS_CACHE: dict | None = None
JWKS_FETCHED_AT: float = 0


async def _fetch_jwks() -> dict:
    global JWKS_CACHE, JWKS_FETCHED_AT
    now = datetime.now().timestamp()
    if JWKS_CACHE and (now - JWKS_FETCHED_AT) < 3600:
        return JWKS_CACHE
    url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, timeout=10)
        resp.raise_for_status()
        JWKS_CACHE = resp.json()
        JWKS_FETCHED_AT = now
        return JWKS_CACHE


async def verify_supabase_jwt(token: str, db: AsyncSession) -> str | None:
    """Verify a Supabase JWT and return the user_id (sub)."""
    try:
        jwks = await _fetch_jwks()
        from jose import jwk, jwt
        from jose.exceptions import JWTError

        unverified = jwt.get_unverified_header(token)
        kid = unverified.get("kid")
        if not kid or "keys" not in jwks:
            return None

        key_data = None
        for k in jwks["keys"]:
            if k.get("kid") == kid:
                key_data = k
                break
        if not key_data:
            return None

        key_alg = key_data.get("alg", "RS256")
        public_key = jwk.construct(key_data, algorithm=key_alg)
        payload = jwt.decode(
            token,
            public_key,
            algorithms=[key_alg],
            audience="authenticated",
            options={"verify_exp": True},
        )
        return payload.get("sub")
    except Exception as e:
        import logging
        logging.getLogger("carlink").warning(f"JWT verify failed: {e}")
        return None
