"""Revalidación periódica de los negocios verificados contra el RUES (docs/PLAN_ALIADOS_NEGOCIO.md, sección 17; MODELO_NEGOCIO.md pide
revalidar cada 6 a 12 meses). SOLO LEE: no cambia ningún negocio ni suspende nada; imprime los que ya no están en regla para que el
admin decida (revocar el permiso de certificar, pedir documentos, etc.).

Uso (desde backend/, con el venv activo):
    python scripts/revalidate_businesses.py            # todos los negocios verificados
    python scripts/revalidate_businesses.py --kind cda # solo un tipo
Sale con código 1 si hay negocios con problemas (útil para correrlo desde un cron propio, siempre local: ver feedback_local_agents)."""
from __future__ import annotations

import argparse
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from sqlalchemy import select

from app.database import async_session_factory
from app.models.models import Workshop
from app.services import company_verification as cv


async def main(kind: str | None) -> int:
    async with async_session_factory() as db:
        q = select(Workshop).where(Workshop.is_verified.is_(True)).order_by(Workshop.created_at)
        if kind:
            q = q.where(Workshop.business_kind == kind)
        rows = (await db.execute(q)).scalars().all()
    print(f"{len(rows)} negocio(s) verificado(s) a revalidar")
    problems = 0
    async with httpx.AsyncClient(timeout=10) as client:
        for w in rows:
            r = await cv.verify(nit=w.legal_id, name=w.name, legal_name=w.name, kind=w.business_kind, client=client)
            status = r.get("status", "unavailable")
            mark = {"ok": "OK      ", "review": "REVISAR ", "fail": "PROBLEMA", "not_found": "NO ESTA ", "unavailable": "SIN RESP."}.get(status, status)
            print(f"  {mark} {w.code} | {w.business_kind} | {w.legal_id} | {w.name} | RUES: {r.get('estado', '-')} · renovada {r.get('ultimo_ano_renovado', '-')}")
            if status in ("fail", "not_found"):
                problems += 1
            await asyncio.sleep(0.3)  # cortesía con el portal de datos abiertos
    print(f"{problems} con problemas")
    return 1 if problems else 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--kind", choices=["taller", "cda", "concesionario", "compraventa", "repuestos"])
    sys.exit(asyncio.run(main(ap.parse_args().kind)))
