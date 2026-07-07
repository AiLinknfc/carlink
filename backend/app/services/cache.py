from __future__ import annotations

import json
from typing import Any

import redis.asyncio as aioredis

from app.config import get_settings

settings = get_settings()

_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis | None:
    """Lazy-connected Redis client. Returns None if REDIS_URL is not set (graceful fallback)."""
    global _redis
    if not settings.redis_url:
        return None
    if _redis is None:
        _redis = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=2,
        )
    return _redis


async def cache_get(key: str) -> Any | None:
    r = await get_redis()
    if r is None:
        return None
    val = await r.get(f"carlink:{key}")
    if val:
        return json.loads(val)
    return None


async def cache_set(key: str, value: Any, ttl: int = 300) -> None:
    r = await get_redis()
    if r is None:
        return
    await r.setex(f"carlink:{key}", ttl, json.dumps(value, default=str))


async def cache_delete(pattern: str) -> None:
    """Delete all keys matching pattern (e.g. 'carlink:vehicles:*')."""
    r = await get_redis()
    if r is None:
        return
    keys = await r.keys(f"carlink:{pattern}")
    if keys:
        await r.delete(*keys)


async def cache_invalidate_vehicle(vehicle_id: str) -> None:
    await cache_delete(f"vehicles:{vehicle_id}:*")
    await cache_delete("vehicles:list:*")


async def close_redis() -> None:
    global _redis
    if _redis:
        await _redis.close()
        _redis = None
