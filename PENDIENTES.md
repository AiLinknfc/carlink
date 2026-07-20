# Pendientes de Implementación

## Rate Limiting con Redis (Producción)

**Prioridad**: Alta antes de desplegar a producción

**Estado actual**: El endpoint público NFC usa rate limiting in-memory. En producción se debe usar Redis.

### Archivos a modificar:
- `backend/app/routers/nfc.py` — Reemplazar rate limiting in-memory por Redis
- `backend/app/services/cache.py` — Ya tiene soporte Redis, usar funciones existentes

### Implementación sugerida:
```python
# En nfc.py, usar cache.py para rate limiting
from app.services.cache import get_redis

async def check_rate_limit(ip: str, limit: int = 30, window: int = 60) -> bool:
    r = await get_redis()
    if r is None:
        return True  # fallback sin rate limiting
    key = f"rate:nfc:{ip}"
    count = await r.incr(key)
    if count == 1:
        await r.expire(key, window)
    return count <= limit
```

### Endpoints a proteger:
- `GET /api/nfc/{token}` — Endpoint público, más vulnerable
- `POST /api/found-requests/public` — Formulario público

### Notas:
- Redis ya está configurado en `docker-compose.yml` y `cache.py`
- El fallback in-memory debe mantenerse para desarrollo local sin Redis
- En Upstash, verificar que el plan soporte suficientes comandos/sec
