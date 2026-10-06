"""Comprueba contra la base real que la cuenta de pruebas no cuenta en las metricas y un visitante real si.
Corre con el Python del venv del backend (importa app.*):  cd backend && .venv/bin/python ../scripts/qa_suite14/analytics_scope_check.py
Imprime una linea JSON; QA_PASSWORD debe estar en el entorno y el cwd debe ser backend/ (app.config lee backend/.env desde ahi)."""
import asyncio, sys, uuid, json
sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parents[2] / "backend")); sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
from sqlalchemy import select, func, distinct, and_
from app.database import async_session_factory
from app.models.models import AnalyticsEvent
from app.services.analytics_scope import event_scope, excluded_user_ids
from analytics_helpers import token, post, ev
async def main():
    tok = token(); a = "qa-" + uuid.uuid4().hex[:12]; c = "qa-" + uuid.uuid4().hex[:12]
    post([ev(a, "/app"), ev(a, "/shop")], tok); post([ev(a, "/")]); post([ev(c, "/shop")])
    async with async_session_factory() as db:
        ex = await excluded_user_ids(db)
        async def counted(anon):
            return await db.scalar(select(func.count(distinct(AnalyticsEvent.anon_id))).where(AnalyticsEvent.anon_id == anon, event_scope(ex)))
        raw = await db.scalar(select(func.count()).select_from(AnalyticsEvent).where(AnalyticsEvent.anon_id == a))
        print(json.dumps({"eventos guardados del navegador de la cuenta de pruebas": raw, "contado en métricas (cuenta de pruebas)": await counted(a), "contado en métricas (visitante real)": await counted(c)}, ensure_ascii=False))
asyncio.run(main())
