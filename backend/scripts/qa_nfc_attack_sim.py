"""Simulación de ataques contra los llaveros NFC (docs/PRUEBAS_FUNCIONALES.md, suite "Defensa automática NFC").

Comprueba contra la base REAL (con datos desechables que se borran al final) que la respuesta
automática de services/alerts.py cumple lo que promete:

  A. uso normal (pocas conexiones)              -> el llavero NO se pausa
  B. URL filtrada (>= 10 conexiones distintas)  -> se pausa solo, alerta resuelta, ficha bloqueada con mensaje claro
  C. bot desde pocas IPs (>= 200 lecturas/día)  -> se pausa solo
  D. una sola IP martillando                    -> el límite por IP (429) corta antes; no pausa el llavero
  E. adivinar tokens al azar                    -> todo 404, ningún llavero afectado
  F. el dueño reactiva su llavero               -> vuelve a funcionar
  G. aviso al admin                             -> queda una notificación ya resuelta (historial)

Uso (desde backend/, con el .venv; usa .env: DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_KEY, REDIS_URL):
    python scripts/qa_nfc_attack_sim.py

Crea un usuario desechable (qa.attack.<hex>@carlink.internal) con cuatro vehículos y un llavero cada uno, y lo borra al
terminar aunque falle (en cascada se van vehículo, llaveros, alertas). No toca cuentas ni llaveros reales.
Los envíos de correo salen solo si RESEND_API_KEY y ADMIN_EMAIL están configurados.
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import secrets
import sys
import uuid

import httpx
from dotenv import load_dotenv
from sqlalchemy import text

load_dotenv()
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
logging.disable(logging.CRITICAL)

from app.config import get_settings  # noqa: E402
from app.database import async_session_factory  # noqa: E402
from app.dependencies import get_current_user  # noqa: E402
from app.main import app  # noqa: E402
from app.models.models import NfcToken, Profile, Vehicle  # noqa: E402

RESULTS: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    RESULTS.append((name, ok, detail))
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}{(' - ' + detail) if detail else ''}")


def client_from(ip: str) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app, client=(ip, 40000)), base_url="http://sim")


async def scan(token: str, ip: str) -> httpx.Response:
    async with client_from(ip) as c:
        return await c.get(f"/api/nfc/{token}")


async def state(token_id) -> dict:
    async with async_session_factory() as db:
        t = (await db.execute(text("select is_active, status from nfc_tokens where id=:i"), {"i": str(token_id)})).one()
        a = (await db.execute(text("select count(*), count(*) filter (where resolved) from nfc_alerts where token_id=:i and alert_type='auto_paused'"), {"i": str(token_id)})).one()
        n = (await db.execute(text("select count(*), count(*) filter (where resolved_at is not null) from admin_notifications where ref=:r"), {"r": f"{token_id}:auto_paused"})).one()
    return {"active": t[0], "status": t[1], "alerts": a[0], "alerts_resolved": a[1], "notifs": n[0], "notifs_resolved": n[1]}


async def main() -> int:
    s = get_settings()
    url, key = s.supabase_url.rstrip("/"), s.supabase_service_key
    hdr = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    email = f"qa.attack.{secrets.token_hex(4)}@carlink.internal"
    async with httpx.AsyncClient() as http:
        r = await http.post(f"{url}/auth/v1/admin/users", headers=hdr, timeout=20,
                            json={"email": email, "password": "Cl-" + secrets.token_urlsafe(16), "email_confirm": True})
        if r.status_code >= 300:
            print("No se pudo crear el usuario desechable:", r.status_code, r.text)
            return 2
        uid = uuid.UUID(r.json()["id"])

    raw = {k: secrets.token_hex(32) for k in ("leak", "bot", "normal", "flood")}
    ids: dict[str, uuid.UUID] = {}
    try:
        async with async_session_factory() as db:
            if not (await db.execute(text("select 1 from profiles where id=:i"), {"i": str(uid)})).first():
                db.add(Profile(id=uid, email=email, full_name="QA Ataques"))
                await db.flush()
            for i, (k, tok) in enumerate(raw.items(), 1):
                veh = Vehicle(owner_id=uid, plate=f"QAT-00{i}", city="Bogotá", brand="QA", model="Sim", nfc_active=True)
                db.add(veh)
                await db.flush()
                t = NfcToken(user_id=uid, vehicle_id=veh.id, token_hash=hashlib.sha256(tok.encode()).hexdigest(),
                             token_prefix=tok[:8], label=f"qa-{k}", is_active=True, status="active")
                db.add(t)
                await db.flush()
                ids[k] = t.id
            await db.commit()

        ip = lambda n, base="203.0.113": f"{base}.{n}"  # noqa: E731  (TEST-NET-3, no enrutable)
        print("\nA. Uso normal: 3 conexiones distintas, 2 lecturas cada una")
        codes = [(await scan(raw["normal"], ip(n))).status_code for n in range(1, 4) for _ in range(2)]
        st = await state(ids["normal"])
        check("A1 lecturas legítimas responden 200", all(c == 200 for c in codes), str(set(codes)))
        check("A2 el llavero sigue activo", st["active"] and st["alerts"] == 0)

        print("\nB. URL filtrada: lecturas desde 12 conexiones distintas")
        codes = [(await scan(raw["leak"], ip(n, "198.51.100"))).status_code for n in range(1, 13)]  # en serie: la pausa ocurre en la lectura 10
        st = await state(ids["leak"])
        check("B1 el llavero se pausó solo", not st["active"] and st["status"] == "paused_security", str(st))
        check("B2 alerta 'auto_paused' creada y ya resuelta", st["alerts"] == 1 and st["alerts_resolved"] == 1)
        check("B3 aviso al admin en el historial, ya resuelto", st["notifs"] == 1 and st["notifs_resolved"] == 1)
        after = await scan(raw["leak"], ip(99, "198.51.100"))
        check("B4 una lectura posterior ya no muestra la ficha (404)", after.status_code == 404, str(after.status_code))
        check("B5 el mensaje explica que fue pausado por seguridad", "pausado por seguridad" in after.text, after.text[:90])

        print("\nC. Bot desde 8 conexiones, 26 lecturas cada una (208 en total)")
        async def burst(n: int) -> list[int]:
            return [(await scan(raw["bot"], ip(n, "192.0.2"))).status_code for _ in range(26)]
        statuses = [c for batch in await asyncio.gather(*(burst(n) for n in range(1, 9))) for c in batch]
        st = await state(ids["bot"])
        check("C1 el llavero se pausó solo por volumen", not st["active"] and st["status"] == "paused_security", f"{st} 200s={statuses.count(200)}")

        print("\nD. Una sola IP martillando (45 lecturas seguidas)")
        codes = [(await scan(raw["flood"], "203.0.113.200")).status_code for _ in range(45)]
        st = await state(ids["flood"])
        if get_settings().redis_url:
            check("D1 el límite por IP corta con 429", 429 in codes, f"200s={codes.count(200)} 429s={codes.count(429)}")
        else:
            print("  [SKIP] D1 el límite por IP necesita REDIS_URL (sin Redis no hay límite). En producción se prueba con el curl de la suite 13.")
        check("D2 una sola IP no logra pausar el llavero de otro", st["active"], str(st))

        print("\nE. Adivinar tokens al azar (30 intentos)")
        codes = [(await scan(secrets.token_hex(32), ip(150 + n % 50, "198.18.0"))).status_code for n in range(30)]
        check("E1 todos los intentos fallan (404)", set(codes) <= {404, 429}, str(set(codes)))

        print("\nF. El dueño reactiva su llavero pausado")
        app.dependency_overrides[get_current_user] = lambda: str(uid)
        try:
            async with client_from("203.0.113.10") as c:
                rr = await c.post(f"/api/nfc/tokens/{ids['leak']}/reactivate")
        finally:
            app.dependency_overrides.pop(get_current_user, None)
        st = await state(ids["leak"])
        check("F1 la reactivación responde 200 y el llavero queda activo", rr.status_code == 200 and st["active"] and st["status"] == "active", f"{rr.status_code} {st}")
        back = await scan(raw["leak"], "203.0.113.11")
        check("F2 la ficha vuelve a responder", back.status_code == 200, str(back.status_code))
    finally:
        async with httpx.AsyncClient() as http:
            await http.delete(f"{url}/auth/v1/admin/users/{uid}", headers=hdr, timeout=20)
        async with async_session_factory() as db:
            await db.execute(text("delete from admin_notifications where ref like any(:p)"), {"p": [f"{i}:%" for i in ids.values()]})
            await db.commit()
        async with async_session_factory() as db:
            left = (await db.execute(text("select (select count(*) from profiles where id=:i) + (select count(*) from nfc_tokens where user_id=:i) + (select count(*) from admin_notifications where ref like any(:p))"),
                                     {"i": str(uid), "p": [f"{i}:%" for i in ids.values()]})).scalar()
        print(f"\nLimpieza: residuo = {left}")
        check("Z  no quedó ningún dato de la simulación", left == 0)

    failed = [n for n, ok, _ in RESULTS if not ok]
    print(f"\n{len(RESULTS) - len(failed)}/{len(RESULTS)} comprobaciones OK" + (f" — FALLARON: {failed}" if failed else ""))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
