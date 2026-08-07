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


# "Mejorar con IA" del compositor de notificaciones — mismo puerto que arriba
# (tallerpro llamaba a `/api/gemini/notification`, acá va por DeepSeek, nunca
# Gemini ni key expuesta al cliente). A diferencia del diagnóstico, la salida
# es texto plano (el mensaje ya redactado), no JSON estructurado.
_NOTIFICATION_SYSTEM_PROMPT = """Eres el asistente de comunicación de un taller mecánico. Tu tarea es \
redactar o mejorar un mensaje corto y claro para enviarle a un cliente por WhatsApp/SMS/Email, a partir \
del tipo de aviso y los datos que te den. Reglas:
- Máximo 3-4 líneas, tono cercano y profesional, en español.
- Usa el nombre del cliente y la placa del vehículo si te los dan.
- Si te dan un borrador existente, mejóralo (más claro, más cordial) en vez de ignorarlo.
- No inventes datos que no te dieron (números de orden, montos, fechas) — si no te los dan, no los menciones.
- Responde SOLO con el mensaje final, sin comillas ni explicaciones adicionales."""


async def generate_ai_notification_message(
    notification_type: str,
    client_name: str,
    vehicle_plate: str,
    order_number: str | None,
    total_amount: float | None,
    draft: str | None,
) -> str:
    if not settings.deepseek_api_key:
        raise AiDiagnosticsUnavailableError("DEEPSEEK_API_KEY not configured")

    context_lines = [f"Tipo de aviso: {notification_type}", f"Cliente: {client_name or '—'}", f"Placa: {vehicle_plate or '—'}"]
    if order_number:
        context_lines.append(f"Orden #: {order_number}")
    if total_amount:
        context_lines.append(f"Total: ${total_amount:,.0f}")
    if draft and draft.strip():
        context_lines.append(f'Borrador actual a mejorar: "{draft.strip()}"')
    user_prompt = "\n".join(context_lines)

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{settings.deepseek_base_url}/chat/completions",
                headers={"Authorization": f"Bearer {settings.deepseek_api_key}"},
                json={
                    "model": settings.deepseek_model,
                    "messages": [
                        {"role": "system", "content": _NOTIFICATION_SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt},
                    ],
                    "temperature": 0.5,
                },
                timeout=30,
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
            return content.strip().strip('"')
    except (httpx.HTTPError, KeyError) as e:
        logger.warning(f"AI notification message (DeepSeek) failed: {e}")
        raise AiDiagnosticsUnavailableError(str(e)) from e
