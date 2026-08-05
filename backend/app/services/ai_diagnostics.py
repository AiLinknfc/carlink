from __future__ import annotations

import json
import logging

import httpx

from app.config import get_settings

logger = logging.getLogger("carlink")
settings = get_settings()

# Puerto de tallerpro/server.ts (`/api/gemini/diagnose`) a DeepSeek — mismo
# proveedor que ya usa `services/ocr.py`, mismo API key ya configurada en
# Railway. Nunca Gemini ni ninguna key expuesta al cliente (ver
# docs/PLAN_MIGRACION_TALLERPRO.md §2). El JSON de salida mantiene el mismo
# esquema que tallerpro para no rehacer el frontend desde cero.
_DIAGNOSE_SYSTEM_PROMPT = """Actúa como un maestro mecánico jefe de taller automotriz experimentado.
Recibes los datos de un vehículo y una descripción de síntomas o fallas.
Devuelve SOLO un objeto JSON con este esquema exacto (nunca inventes precios como si fueran una cotización real, son solo estimaciones de referencia):
{
  "diagnostic_summary": "Resumen claro del problema probable",
  "possible_causes": ["Causa 1", "Causa 2"],
  "recommended_labor": [
    {"description": "Descripción del trabajo", "estimated_hours": 1.5, "suggested_rate_per_hour": 35}
  ],
  "recommended_parts": [
    {"part_name": "Nombre del repuesto", "estimated_cost": 45, "urgency": "Alta/Media/Baja"}
  ],
  "technical_notes": "Consejos adicionales para el mecánico",
  "estimated_total_cost": 0
}
Responde únicamente en JSON válido, en español."""


class AiDiagnosticsUnavailableError(RuntimeError):
    pass


async def generate_ai_diagnosis(
    vehicle_brand: str,
    vehicle_model: str,
    vehicle_year: int | None,
    vehicle_mileage: int | None,
    symptoms: str,
) -> dict:
    if not settings.deepseek_api_key:
        raise AiDiagnosticsUnavailableError("DEEPSEEK_API_KEY not configured")

    user_prompt = (
        f"Vehículo: {vehicle_brand} {vehicle_model} ({vehicle_year or '—'}) "
        f"- Kilometraje: {vehicle_mileage or '—'} km.\n"
        f'Síntomas / falla reportada: "{symptoms}"'
    )

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{settings.deepseek_base_url}/chat/completions",
                headers={"Authorization": f"Bearer {settings.deepseek_api_key}"},
                json={
                    "model": settings.deepseek_model,
                    "messages": [
                        {"role": "system", "content": _DIAGNOSE_SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.3,
                },
                timeout=45,
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
            return json.loads(content)
    except (httpx.HTTPError, KeyError, json.JSONDecodeError) as e:
        logger.warning(f"AI diagnostics (DeepSeek) failed: {e}")
        raise AiDiagnosticsUnavailableError(str(e)) from e
