"""Geocodificación de la dirección de un taller (docs/PLAN_VINCULO_TALLER_CONDUCTOR.md, fase 0).

Sin latitud/longitud el mapa de la ficha pública no dibuja el pin de un taller. Usa Nominatim
(OpenStreetMap), el mismo proveedor de los tiles del mapa. Reglas de su política de uso: identificarse
con un User-Agent propio y no pasar de 1 petición por segundo (el script de relleno espera entre una y otra).

Solo sale hacia el servicio la dirección y ciudad del NEGOCIO (dato público del taller), nunca datos de
personas. Es de mejor esfuerzo: cualquier falla devuelve None y jamás debe romper el registro o la edición
del taller.
"""
from __future__ import annotations

import logging

import httpx

logger = logging.getLogger(__name__)

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "CarLink/1.0 (https://carlink.com.co; soporte@carlink.com.co)"
TIMEOUT_SECONDS = 5.0

# Colombia continental e insular, con margen: descarta resultados de otro pais por una direccion ambigua.
_LAT_RANGE = (-4.5, 13.6)
_LON_RANGE = (-82.0, -66.5)


def in_colombia(lat: float, lon: float) -> bool:
    return _LAT_RANGE[0] <= lat <= _LAT_RANGE[1] and _LON_RANGE[0] <= lon <= _LON_RANGE[1]


def build_query(address: str | None, city: str | None) -> str:
    parts = [(address or "").strip(), (city or "").strip()]
    return ", ".join(p for p in parts if p)


async def _search(query: str, client: httpx.AsyncClient | None) -> tuple[float, float] | None:
    params = {"q": query, "format": "jsonv2", "limit": "1", "countrycodes": "co"}
    own_client = client is None
    http = client or httpx.AsyncClient(timeout=TIMEOUT_SECONDS, headers={"User-Agent": USER_AGENT})
    try:
        resp = await http.get(NOMINATIM_URL, params=params)
        if resp.status_code != 200:
            logger.warning("geocoding: HTTP %s", resp.status_code)
            return None
        results = resp.json()
        if not results:
            return None
        lat, lon = float(results[0]["lat"]), float(results[0]["lon"])
        return (lat, lon) if in_colombia(lat, lon) else None
    except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
        logger.warning("geocoding: fallo (%s)", type(exc).__name__)
        return None
    finally:
        if own_client:
            await http.aclose()


async def geocode_address(
    address: str | None,
    city: str | None,
    client: httpx.AsyncClient | None = None,
) -> tuple[float, float] | None:
    """(lat, lon) de la direccion, o None si no hay direccion, no se encuentra o el servicio falla."""
    if not (address or "").strip():
        return None  # solo la ciudad ubicaria el taller en el centro de la ciudad: no es su pin
    return await _search(build_query(address, city), client)


async def geocode_city(city: str | None, client: httpx.AsyncClient | None = None) -> tuple[float, float] | None:
    """Centro aproximado de la ciudad. Solo para centrar un mapa de confirmacion: NUNCA es el pin de un negocio."""
    if not (city or "").strip():
        return None
    return await _search(city.strip(), client)


async def apply_geocode(workshop, client: httpx.AsyncClient | None = None) -> bool:
    """Calcula y asigna latitude/longitude del taller segun su direccion actual. Si la direccion no se puede
    ubicar deja las coordenadas en None (nunca un pin viejo de otra direccion). True si quedo con coordenadas."""
    coords = await geocode_address(workshop.address, workshop.city, client)
    workshop.latitude, workshop.longitude = coords if coords else (None, None)
    return coords is not None
