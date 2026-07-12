from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime

import httpx
from jose import jwk, jwt
from jose.exceptions import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.models import Profile

logger = logging.getLogger("carlink")

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


async def verify_supabase_jwt(token: str) -> str | None:
    """Verify a Supabase JWT and return the user_id (sub)."""
    try:
        jwks = await _fetch_jwks()
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
        logger.warning(f"JWT verify failed: {e}")
        return None


async def _fetch_supabase_user(user_id: str) -> dict | None:
    """Fetch user data from Supabase admin API using async httpx."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{settings.supabase_url}/auth/v1/admin/users/{user_id}",
                headers={
                    "Authorization": f"Bearer {settings.supabase_service_key}",
                    "apikey": settings.supabase_service_key,
                },
            )
            if resp.status_code == 200:
                return resp.json()
            logger.warning(f"Supabase admin API returned {resp.status_code} for user {user_id}")
    except Exception:
        logger.warning("Failed to fetch user from Supabase admin API", exc_info=True)
    return None


async def ensure_profile(user_id: str, db: AsyncSession) -> Profile:
    """Get or create a Profile for the given user_id."""
    result = await db.execute(select(Profile).where(Profile.id == uuid.UUID(user_id)))
    profile = result.scalar_one_or_none()
    if profile:
        return profile

    user_data = await _fetch_supabase_user(user_id)
    if user_data and user_data.get("user_metadata"):
        meta = user_data["user_metadata"]
        profile = Profile(
            id=uuid.UUID(user_id),
            email=user_data.get("email"),
            full_name=meta.get("full_name"),
            avatar_url=meta.get("avatar_url"),
        )
    else:
        profile = Profile(id=uuid.UUID(user_id))

    db.add(profile)
    await db.flush()
    await db.refresh(profile)
    return profile
