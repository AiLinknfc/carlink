"""Relleno de latitude/longitude de los talleres que ya existen (fase 0 de docs/PLAN_VINCULO_TALLER_CONDUCTOR.md).

Uso (desde backend/, con el venv activo):
    python scripts/geocode_workshops.py            # simulacro: muestra que haria, no escribe nada
    python scripts/geocode_workshops.py --apply    # escribe las coordenadas encontradas

Solo toca talleres con direccion y SIN coordenadas; nunca pisa unas existentes. Respeta la politica de
Nominatim: 1 peticion por segundo. La base es la misma para local, staging y produccion.
"""
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
from app.services.geocoding import TIMEOUT_SECONDS, USER_AGENT, geocode_address


async def main(apply: bool) -> None:
    async with async_session_factory() as db:
        rows = (await db.execute(
            select(Workshop).where(Workshop.latitude.is_(None), Workshop.address != "")
        )).scalars().all()
        print(f"{len(rows)} taller(es) con direccion y sin coordenadas ({'APLICANDO' if apply else 'simulacro'})")
        found = 0
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS, headers={"User-Agent": USER_AGENT}) as client:
            for w in rows:
                coords = await geocode_address(w.address, w.city, client)
                print(f"  {w.code} | {w.city or '-'} | {'-> %.5f, %.5f' % coords if coords else 'sin resultado'}")
                if coords:
                    found += 1
                    if apply:
                        w.latitude, w.longitude = coords
                await asyncio.sleep(1.1)
        if apply:
            await db.commit()
        print(f"{found} ubicado(s)." + ("" if apply else " Nada se escribio: repetir con --apply."))


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--apply", action="store_true")
    asyncio.run(main(ap.parse_args().apply))
