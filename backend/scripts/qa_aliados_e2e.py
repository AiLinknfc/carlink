"""E2E de "Aliados de negocio" (Fases 0 a 2) contra el API y la base REALES (docs/PLAN_ALIADOS_NEGOCIO.md; Suites 18, 19 y 20
de docs/PRUEBAS_FUNCIONALES.md).

Corre el backend EN PROCESO (ASGI) con la base real: no necesita uvicorn. Crea cuentas desechables en Supabase Auth
(`qa-aliados-*@carlink.internal`), postulaciones, negocios y pedidos de prueba, y los BORRA al terminar (aunque falle).
No envia correos reales (se interceptan y se revisa su contenido) ni toca cuentas reales. Las contrasenas no se guardan.

Requisitos: migraciones 077, 078 y 079 aplicadas; backend/.env con DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_KEY.

Uso (desde backend/):
    .venv/bin/python scripts/qa_aliados_e2e.py                       # corre y limpia
    .venv/bin/python scripts/qa_aliados_e2e.py --fixtures f.json     # ademas deja cuentas listas para la prueba VISUAL (ver abajo) y guarda sus sesiones en f.json
    .venv/bin/python scripts/qa_aliados_e2e.py --cleanup             # borra todo lo `qa-aliados-*` (tras --fixtures)

`--fixtures` NO limpia: deja 7 negocios en estados conocidos (taller vigente, taller con acceso vencido, convenio, concesionario, CDA,
compraventa, repuestos) y un codigo de alianza valido, para recorrerlos en el navegador. El archivo f.json contiene tokens de sesion:
guardarlo fuera del repo y borrarlo (y correr --cleanup) al terminar.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import re
import secrets
import string
import sys
import uuid
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncpg
import httpx
from dotenv import load_dotenv

logging.disable(logging.CRITICAL)  # el motor de SQLAlchemy imprime cada consulta; aca solo interesan los resultados
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

PREFIX = "qa-aliados-"
DOMAIN = "@carlink.internal"
results: list[tuple[str, bool, str]] = []


def check(case: str, ok: bool, detail: str = "") -> bool:
    results.append((case, ok, detail))
    print(("  OK    " if ok else "  FALLA ") + case + (f"  [{detail}]" if detail and not ok else ""))
    return ok


def _dsn() -> str:
    return os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://")


def _pw() -> str:
    return "Qa-" + "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(14))


def _dt(v: str) -> datetime:
    return datetime.fromisoformat(v.replace("Z", "+00:00"))


def _nit(base: int) -> str:
    """NIT con digito de verificacion valido (mismo algoritmo DIAN que el backend)."""
    from app.services.colombian_nit import _check_digit
    return f"{base}-{_check_digit(str(base))}"


# ---------- Supabase Auth (cuentas desechables) ----------

async def sb_create_user(email: str, password: str) -> str:
    url, key = os.environ["SUPABASE_URL"].rstrip("/"), os.environ["SUPABASE_SERVICE_KEY"]
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post(f"{url}/auth/v1/admin/users", headers={"apikey": key, "Authorization": f"Bearer {key}"},
                         json={"email": email, "password": password, "email_confirm": True, "user_metadata": {"full_name": "QA Aliados"}})
    r.raise_for_status()
    return r.json()["id"]


async def sb_sign_in(email: str, password: str) -> dict:
    url, anon = os.environ["SUPABASE_URL"].rstrip("/"), os.environ["SUPABASE_ANON_KEY"]
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post(f"{url}/auth/v1/token?grant_type=password", headers={"apikey": anon}, json={"email": email, "password": password})
    r.raise_for_status()
    return r.json()


async def cleanup() -> None:
    conn = await asyncpg.connect(_dsn(), statement_cache_size=0)
    try:
        like = f"{PREFIX}%{DOMAIN}"
        await conn.execute("DELETE FROM nfc_token_whitelist WHERE tag_uid LIKE 'QA-ALIADOS-%'")
        await conn.execute("DELETE FROM partners WHERE name LIKE 'QA Aliados%'")
        n_orders = await conn.execute("DELETE FROM shop_orders WHERE customer_email LIKE $1", like)
        n_apps = await conn.execute("DELETE FROM workshop_applications WHERE email LIKE $1", like)
        n_users = await conn.execute("DELETE FROM auth.users WHERE email LIKE $1", like)  # cascada: perfil, negocio, vehiculos
        print(f"Limpieza: pedidos [{n_orders}], postulaciones [{n_apps}], cuentas [{n_users}]")
    finally:
        await conn.close()


# ---------- Harness ----------

class Ctx:
    def __init__(self):
        self.uid: str | None = None          # usuario "con sesion" para las peticiones
        self.emails: list[dict] = []         # correos interceptados
        self.users: dict[str, dict] = {}     # alias -> {id, email, password}
        self.conn: asyncpg.Connection | None = None


def _extract_invite(html: str) -> str | None:
    m = re.search(r"invite=([A-Za-z0-9_\-]+)", html)
    return m.group(1) if m else None


async def main(args) -> int:
    if args.cleanup:
        await cleanup()
        return 0

    from app.config import get_settings
    from app.dependencies import get_current_admin, get_current_user, get_current_user_optional
    from app.main import app
    from app.routers import shop_orders as so
    from app.routers import workshop_applications as wa
    from app.services import email as email_svc

    ctx = Ctx()
    ctx.conn = await asyncpg.connect(_dsn(), statement_cache_size=0)
    settings = get_settings()

    # Aislamiento: ni correos reales ni avisos al admin; todo se intercepta.
    async def _noop(*a, **k):
        return None
    wa.notify_admin = _noop
    so.notify_admin = _noop
    so.email.send_order_received_email = lambda **k: True
    email_svc._send_email = lambda to, subject, html, log_label="": ctx.emails.append({"to": to, "subject": subject, "html": html}) or True

    app.dependency_overrides[get_current_user] = lambda: ctx.uid
    app.dependency_overrides[get_current_user_optional] = lambda: ctx.uid
    app.dependency_overrides[get_current_admin] = lambda: "qa-admin"

    http = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://qa", timeout=60)

    async def api(method: str, path: str, as_user: str | None = None, **kw):
        ctx.uid = ctx.users[as_user]["id"] if as_user else None
        return await http.request(method, "/api" + path, **kw)

    async def admin(method: str, path: str, **kw):
        ctx.uid = None
        return await http.request(method, "/api/admin/workshop-applications" + path, **kw)

    async def mkuser(alias: str) -> None:
        email, password = f"{PREFIX}{alias}-{uuid.uuid4().hex[:6]}{DOMAIN}", _pw()
        ctx.users[alias] = {"id": await sb_create_user(email, password), "email": email, "password": password}

    nit_seq = iter(range(900770001, 900770999))
    LOGO = "/api/upload/files/applications/qa.png"

    async def submit_application(alias: str, kind: str, nit: str | None = None, **over) -> str:
        """Postula (formulario publico) y devuelve el id de la postulacion."""
        nit = nit or _nit(next(nit_seq))
        body = {"business_kind": kind, "business_type": "mecanica_general" if kind == "taller" else "", "name": f"QA {kind} {alias}", "nit": nit,
                "city": "Duitama", "address": "Calle 15 # 10-20", "contact_name": "Ana QA", "phone": "311 456 7890",
                "email": ctx.users[alias]["email"], "specialties": "Frenos, Motor", "logo_url": LOGO, "logo_authorized": True,
                "consent_accepted": True, "consent_version": "2.4", "latitude": 5.8301, "longitude": -73.0401, **over}
        r = await api("POST", "/workshop-applications", json=body)
        assert r.status_code == 201, r.text
        ctx.users[alias]["nit"] = nit
        row = await ctx.conn.fetchrow("SELECT id FROM workshop_applications WHERE nit=$1", nit)
        ctx.users[alias]["app_id"] = str(row["id"])
        return str(row["id"])

    async def approve(alias: str, grant_plan="founder", grant_days=365, checks=True) -> str:
        """Aprueba como admin (con la lista de chequeo) y devuelve el token de la invitacion que llego por correo."""
        aid = ctx.users[alias]["app_id"]
        if checks:
            await admin("PATCH", f"/{aid}", json={"checks": {"doc_reviewed": True, "nit_confirmed": True, "contact_confirmed": True, "location_ok": True}})
        ctx.emails.clear()
        r = await admin("PATCH", f"/{aid}", json={"status": "approved", "grant_plan": grant_plan, "grant_days": grant_days})
        assert r.status_code == 200, r.text
        mail = next(m for m in ctx.emails if "exitoso" in m["subject"].lower())
        token = _extract_invite(mail["html"])
        ctx.users[alias]["token"], ctx.users[alias]["last_mail"] = token, mail
        return token

    async def register(alias: str, token: str | None, **over) -> httpx.Response:
        u = ctx.users[alias]
        body = {"legal_id": u["nit"], "name": f"QA {alias}", "address": "Calle 15 # 10-20", "city": "Duitama", "phone": "3114567890", **over}
        if token:
            body["invite_token"] = token
        return await api("POST", "/workshops", as_user=alias, json=body)

    async def full_onboarding(alias: str, kind: str, grant_plan="founder", grant_days=365) -> dict:
        await mkuser(alias)
        await submit_application(alias, kind)
        token = await approve(alias, grant_plan, grant_days)
        r = await register(alias, token)
        assert r.status_code == 201, r.text
        return r.json()

    try:
        # =====================================================================
        print("\n== Suite 18: tipo de negocio, validacion manual e invitacion (Fase 0) ==")
        # =====================================================================
        for a in ("taller", "comp", "conc", "cda", "rep", "conv"):
            await mkuser(a)
        await mkuser("sininvite")

        # 18.1/18.2 formulario por tipo: compraventa llega sin subtipo ni especialidades
        await submit_application("comp", "compraventa", specialties="Frenos, Motor", business_type="mecanica_general")
        row = await ctx.conn.fetchrow("SELECT business_kind, business_type, specialties FROM workshop_applications WHERE id=$1", uuid.UUID(ctx.users["comp"]["app_id"]))
        check("18.2 Compraventa llega sin subtipo ni especialidades", row["business_kind"] == "compraventa" and row["business_type"] == "" and row["specialties"] == "", dict(row).__repr__())
        await submit_application("conc", "concesionario", specialties="Chevrolet, Renault")
        row = await ctx.conn.fetchrow("SELECT specialties FROM workshop_applications WHERE id=$1", uuid.UUID(ctx.users["conc"]["app_id"]))
        check("18.1b Concesionario conserva las marcas que vende", row["specialties"] == "Chevrolet, Renault")
        r = await api("POST", "/workshop-applications", json={"business_kind": "aseguradora", "business_type": "", "name": "QA x", "nit": _nit(900771001), "city": "Duitama", "address": "Calle 1 # 2-3",
                                                              "contact_name": "Ana", "phone": "3114567890", "email": "qa-aliados-x@carlink.internal", "logo_url": LOGO, "consent_accepted": True, "consent_version": "2.4"})
        check("18.1c Una aseguradora se rechaza (fuera por ahora)", r.status_code == 422 and r.json()["detail"] == "business_kind_invalid", r.text)

        # 18.3 lista de chequeo persiste
        r = await admin("PATCH", f"/{ctx.users['comp']['app_id']}", json={"checks": {"doc_reviewed": True}})
        check("18.3 La lista de chequeo se guarda y vuelve en el listado", r.status_code == 200 and r.json()["checks"].get("doc_reviewed") is True, r.text)
        r = await admin("PATCH", f"/{ctx.users['comp']['app_id']}", json={"checks": {"inventada": True}})
        check("18.3b Un chequeo desconocido se rechaza", r.status_code == 422)

        # 18.4 aprobar -> correo con enlace y acceso
        await submit_application("taller", "taller")
        tok = await approve("taller", "founder", 180)
        mail = ctx.users["taller"]["last_mail"]
        app_row = await ctx.conn.fetchrow("SELECT invite_token_hash, invite_expires_at FROM workshop_applications WHERE id=$1", uuid.UUID(ctx.users["taller"]["app_id"]))
        days = (app_row["invite_expires_at"] - datetime.now(timezone.utc)).days
        check("18.4 Aprobar envia el correo 'registro exitoso' con enlace personal", bool(tok) and "/register?mode=empresa&invite=" in mail["html"] and mail["to"] == ctx.users["taller"]["email"], mail["subject"])
        check("18.4b La invitacion vence a los 14 dias y solo se guarda su hash", 13 <= days <= 14 and app_row["invite_token_hash"] != tok and len(app_row["invite_token_hash"]) == 64, f"{days} dias")
        check("18.4c El correo menciona 6 meses gratis desde crear la cuenta", "6 meses" in mail["html"] and "crees tu cuenta" in mail["html"])

        # 18.5 consulta publica de la invitacion
        r = await api("GET", f"/workshop-applications/invite/{tok}")
        check("18.5 La invitacion precarga NIT y datos del negocio", r.status_code == 200 and r.json()["legal_id"] == ctx.users["taller"]["nit"] and r.json()["grant_days"] == 180, r.text)

        # 18.7 seguridad antes de registrar
        r = await register("taller", tok, legal_id=_nit(900779999))
        check("18.7 Registrar con un NIT distinto se rechaza (invite_nit_mismatch)", r.status_code == 403 and r.json()["detail"] == "invite_nit_mismatch", r.text)
        r = await register("taller", "token-inventado-" + "x" * 30)
        check("18.7b Un token inventado se rechaza (invite_invalid)", r.status_code == 403 and r.json()["detail"] == "invite_invalid", r.text)
        r = await api("GET", "/workshop-applications/invite/" + "z" * 40)
        check("18.7c Consultar un token inventado da 404", r.status_code == 404)

        # 18.6 registro con invitacion + 19.1 acceso concedido
        r = await register("taller", tok)
        w = r.json()
        check("18.6 Crear la cuenta con la invitacion: 201, verificado, con el logo y el tipo de la postulacion", r.status_code == 201 and w["is_verified"] is True and w["business_kind"] == "taller" and w["logo_url"] == LOGO, r.text[:200])
        ctx.users["taller"]["code"] = w["code"]
        used = await ctx.conn.fetchval("SELECT invite_used_at FROM workshop_applications WHERE id=$1", uuid.UUID(ctx.users["taller"]["app_id"]))
        check("18.6b La invitacion queda usada", used is not None)
        row = await ctx.conn.fetchrow("SELECT latitude, longitude FROM workshops WHERE code=$1", w["code"])
        check("18.6c El pin que confirmo en la postulacion pasa al negocio", row["latitude"] is not None and abs(row["latitude"] - 5.8301) < 1e-3, str(dict(row)))
        r = await register("taller", tok)
        check("18.6d La invitacion no se puede usar dos veces", r.status_code in (403, 409), r.text)

        # 18.8 reenvio y rechazo
        await submit_application("sininvite", "taller")
        t1 = await approve("sininvite")
        ctx.emails.clear()
        r = await admin("POST", f"/{ctx.users['sininvite']['app_id']}/resend-invite")
        t2 = _extract_invite(ctx.emails[-1]["html"]) if ctx.emails else None
        old = await api("GET", f"/workshop-applications/invite/{t1}")
        new = await api("GET", f"/workshop-applications/invite/{t2}") if t2 else None
        check("18.8 Reenviar: llega un correo nuevo y el enlace anterior deja de servir", r.status_code == 200 and t2 and t2 != t1 and old.status_code == 404 and new.status_code == 200, f"{r.status_code} {old.status_code}")
        await admin("PATCH", f"/{ctx.users['sininvite']['app_id']}", json={"status": "rejected"})
        r = await api("GET", f"/workshop-applications/invite/{t2}")
        check("18.8b Pasar a Rechazada invalida la invitacion sin usar", r.status_code == 404)
        r = await admin("POST", f"/{ctx.users['taller']['app_id']}/resend-invite")
        check("18.8c No se reenvia una invitacion ya usada", r.status_code == 409 and r.json()["detail"] == "invite_already_used", r.text)

        # 18.9 registro sin invitacion (flag apagado) y con flag encendido
        r = await register("sininvite", None, legal_id=_nit(900778001))
        check("18.9 Sin invitacion (flag apagado) el registro funciona, queda sin verificar y en prueba de 7 dias",
              r.status_code == 201 and r.json()["is_verified"] is False and r.json()["access_plan"] == "trial" and 6 <= (_dt(r.json()["access_until"]) - datetime.now(timezone.utc)).days <= 7, r.text[:200])
        ctx.users["sininvite"]["code"] = r.json()["code"]
        await mkuser("flagon")
        settings.workshop_invite_required = True
        r = await api("POST", "/workshops", as_user="flagon", json={"legal_id": _nit(900778002), "name": "QA flag"})
        settings.workshop_invite_required = False
        check("18.9b Con WORKSHOP_INVITE_REQUIRED=true sin invitacion responde invite_required", r.status_code == 403 and r.json()["detail"] == "invite_required", r.text)

        # =====================================================================
        print("\n== Suite 19: capacidades por tipo y periodo de acceso (Fase 1) ==")
        # =====================================================================
        w = (await api("GET", "/workshops/me", as_user="taller")).json()
        until = _dt(w["access_until"])
        check("19.1 Acceso de aliado fundador de 6 meses desde crear la cuenta", w["access_plan"] == "founder" and w["access_status"] == "active" and 178 <= (until - datetime.now(timezone.utc)).days <= 180, f"{w['access_plan']} {w['access_until']}")
        me = (await api("GET", "/auth/me", as_user="taller")).json()
        check("19.1b /auth/me devuelve el estado de suscripcion calculado en el servidor", me["subscription_status"] == "trial" and me["subscription_plan"] == "founder" and me["trial_ends_at"], str({k: me[k] for k in ('subscription_status', 'subscription_plan', 'trial_ends_at')}))

        # onboarding de los demas tipos
        await submit_application("conv", "taller")
        w = (await register("conv", await approve("conv", "convenio", 365))).json()
        ctx.users["conv"]["code"] = w["code"]
        check("19.2 Convenio: sin vencimiento", w["access_plan"] == "convenio" and w["access_until"] is None and w["access_status"] == "active", str(w["access_until"]))
        me = (await api("GET", "/auth/me", as_user="conv")).json()
        check("19.2b /auth/me de un convenio: activo, sin banner de prueba", me["subscription_status"] == "active" and me["trial_ends_at"] is None, str(me["subscription_status"]))

        for alias, kind in (("conc", "concesionario"), ("cda", "cda"), ("rep", "repuestos")):
            if alias not in ctx.users or "app_id" not in ctx.users[alias]:
                await submit_application(alias, kind)
            w = (await register(alias, await approve(alias))).json()
            ctx.users[alias]["code"] = w["code"]
            ctx.users[alias]["caps"] = w["capabilities"]
        await register("comp", await approve("comp"))
        ctx.users["comp"]["code"] = (await api("GET", "/workshops/me", as_user="comp")).json()["code"]
        ctx.users["comp"]["caps"] = (await api("GET", "/workshops/me", as_user="comp")).json()["capabilities"]
        caps_t = (await api("GET", "/workshops/me", as_user="taller")).json()["capabilities"]

        check("19.3 Taller: panel completo", {"clientes", "ordenes", "mecanicos", "catalogo", "inventario", "citas", "diagnostico_ia", "rentabilidad"} <= set(caps_t), str(caps_t))
        r1 = await api("GET", "/workshops/me/work-orders", as_user="conc")
        r2 = await api("GET", "/workshops/me/work-orders", as_user="comp")
        r3 = await api("GET", "/workshops/me/clients", as_user="conc")
        check("19.4 Concesionario y compraventa: sin ordenes (403), con clientes", r1.status_code == 403 and r2.status_code == 403 and r1.json()["detail"] == "capability_not_available" and r3.status_code == 200, f"{r1.status_code} {r2.status_code} {r3.status_code}")
        r1 = await api("GET", "/workshops/me/appointments", as_user="cda")
        r2 = await api("GET", "/workshops/me/inventory", as_user="cda")
        r3 = await api("GET", "/workshops/me/work-orders", as_user="cda")
        check("19.5 CDA: citas si; inventario y ordenes no", r1.status_code == 200 and r2.status_code == 403 and r3.status_code == 403, f"{r1.status_code} {r2.status_code} {r3.status_code}")
        r1 = await api("GET", "/workshops/me/inventory", as_user="rep")
        r2 = await api("GET", "/workshops/me/clients", as_user="rep")
        check("19.5b Repuestos: inventario si; clientes no", r1.status_code == 200 and r2.status_code == 403, f"{r1.status_code} {r2.status_code}")
        r = await api("POST", "/workshops/me/inventory", as_user="rep", json={"name": "QA filtro"})
        check("19.5c Repuestos puede crear en su inventario", r.status_code == 201, r.text[:120])
        part_id = r.json()["id"] if r.status_code == 201 else None

        # 19.6/19.7 vencimiento: solo lectura
        await ctx.conn.execute("UPDATE workshops SET access_until = now() - interval '1 day' WHERE code=$1", ctx.users["rep"]["code"])
        rg = await api("GET", "/workshops/me/inventory", as_user="rep")
        rp = await api("POST", "/workshops/me/inventory", as_user="rep", json={"name": "QA otro"})
        rd = await api("DELETE", f"/workshops/me/inventory/{part_id}", as_user="rep") if part_id else None
        w = (await api("GET", "/workshops/me", as_user="rep")).json()
        me = (await api("GET", "/auth/me", as_user="rep")).json()
        check("19.6 Acceso vencido: leer funciona; crear y borrar dan 402 access_expired", rg.status_code == 200 and rp.status_code == 402 and rp.json()["detail"] == "access_expired" and (rd is None or rd.status_code == 402), f"{rg.status_code} {rp.status_code} {rd and rd.status_code}")
        check("19.6b El panel y /auth/me reportan 'expired'", w["access_status"] == "expired" and me["subscription_status"] == "expired", f"{w['access_status']} {me['subscription_status']}")
        await ctx.conn.execute("UPDATE workshops SET access_until = now() + interval '30 days' WHERE code=$1", ctx.users["rep"]["code"])
        rp = await api("POST", "/workshops/me/inventory", as_user="rep", json={"name": "QA otro"})
        check("19.7 Al renovar el acceso vuelve a escribir sin cerrar sesion", rp.status_code == 201, rp.text[:120])

        # 19.8 cuenta antigua que registra un negocio
        await ctx.conn.execute("UPDATE profiles SET created_at = now() - interval '400 days' WHERE id=$1", uuid.UUID(ctx.users["cda"]["id"]))
        me = (await api("GET", "/auth/me", as_user="cda")).json()
        check("19.8 Una cuenta de hace 400 dias con negocio nuevo NO aparece vencida", me["subscription_status"] == "trial", me["subscription_status"])

        # 19.9 ficha de prueba sigue al acceso
        from app.database import async_session_factory
        from app.models.models import Profile
        from app.routers.nfc import _has_ficha_access
        r = await api("POST", "/vehicles", as_user="taller", json={"plate": "QAL-901", "city": "Duitama", "brand": "Chevrolet", "model": "Spark", "year": 2020, "type": "particular"})
        vid = r.json().get("id") if r.status_code in (200, 201) else None
        if vid:
            await ctx.conn.execute("UPDATE nfc_tokens SET created_at = now() - interval '30 days' WHERE vehicle_id=$1 AND token_type='trial'", uuid.UUID(vid))
            async with async_session_factory() as s:
                owner = await s.get(Profile, uuid.UUID(ctx.users["taller"]["id"]))
                vigente = await _has_ficha_access(uuid.UUID(vid), owner, s)
            await ctx.conn.execute("UPDATE workshops SET access_until = now() - interval '1 day' WHERE code=$1", ctx.users["taller"]["code"])
            async with async_session_factory() as s:
                owner = await s.get(Profile, uuid.UUID(ctx.users["taller"]["id"]))
                vencido = await _has_ficha_access(uuid.UUID(vid), owner, s)
            await ctx.conn.execute("UPDATE workshops SET access_until = now() + interval '170 days' WHERE code=$1", ctx.users["taller"]["code"])
            check("19.9 La ficha de prueba de 30 dias sigue activa con acceso vigente y cae al vencer", vigente == (True, None) and vencido == (False, "trial_expired"), f"{vigente} {vencido}")
        else:
            check("19.9 La ficha de prueba sigue al acceso", False, f"no se pudo crear el vehiculo: {r.status_code} {r.text[:150]}")

        # 19.11 la ficha publica no filtra capacidades ni acceso
        pub = (await api("GET", f"/workshops/{ctx.users['taller']['code']}")).json()
        check("19.11 La ficha publica del negocio NO incluye capabilities ni access_*", not any(k in pub for k in ("capabilities", "access_plan", "access_until", "access_status", "invite_token_hash")), str(sorted(k for k in pub if "access" in k or "cap" in k)))

        # =====================================================================
        print("\n== Suite 20: codigo de alianza y descuento de llaveros (Fase 2) ==")
        # =====================================================================
        code = ctx.users["taller"]["code"]
        al = (await api("GET", "/workshops/me/alliance", as_user="taller")).json()
        check("20.1 Panel: codigo, enlace y estado elegible", al["code"] == code and al["share_url"].endswith(f"/?ref={code}") and al["eligible"] is True and al["units_30d"] == 0 and al["discount_per_unit_cop"] == 7000, str(al))
        al_u = (await api("GET", "/workshops/me/alliance", as_user="sininvite")).json()
        check("20.1b Un negocio sin verificar ve el aviso (not_verified) y no da descuento", al_u["eligible"] is False and al_u["reason"] == "not_verified", str(al_u))

        r = (await api("GET", f"/shop/alliance/{code.lower()}?quantity=1")).json()
        check("20.2 Validar el codigo: $7.000 de descuento y total $32.900", r["valid"] and r["discount_cop"] == 7000 and r["total_cop"] == 32900 and r["workshop_name"], str(r))
        r = (await api("GET", f"/shop/alliance/{code}?quantity=3")).json()
        check("20.3 Cantidad 3: descuento $21.000 y total $98.700", r["discount_cop"] == 21000 and r["total_cop"] == 98700, str(r))

        ORDER = {"plate_text": "", "plate_type": "", "plate_city": "", "quantity": 1, "customer_name": "Cliente QA", "customer_email": f"{PREFIX}cliente{DOMAIN}",
                 "customer_phone": "3001234567", "shipping_address": "Calle 1 # 2-3", "shipping_city": "Duitama", "payment_method": "wompi"}
        r = await api("POST", "/shop/orders", json={**ORDER, "alliance_code": code})
        o = await ctx.conn.fetchrow("SELECT amount_in_cents, discount_cents, alliance_code, alliance_workshop_id FROM shop_orders WHERE reference=$1", r.json()["reference"])
        check("20.4 Pedido con codigo: monto cobrado $32.900 y atribucion guardada", r.status_code == 201 and r.json()["amount_in_cents"] == 3290000 == o["amount_in_cents"] and o["discount_cents"] == 700000 and o["alliance_code"] == code and o["alliance_workshop_id"] is not None, str(dict(o)))
        await ctx.conn.execute("UPDATE shop_orders SET status='approved' WHERE reference=$1", r.json()["reference"])
        al = (await api("GET", "/workshops/me/alliance", as_user="taller")).json()
        check("20.11 Tras un pedido pagado el panel suma 1 llavero y 1 pedido, sin datos del comprador", al["units_30d"] == 1 and al["units_total"] == 1 and al["orders_total"] == 1 and set(al) == {"code", "share_url", "eligible", "reason", "discount_per_unit_cop", "monthly_cap_units", "units_30d", "units_total", "orders_total"}, str(al))

        r = (await api("GET", "/shop/alliance/TLR-ZZZZZ")).json()
        r2 = (await api("GET", f"/shop/alliance/{ctx.users['sininvite']['code']}")).json()
        check("20.5 Codigo inexistente o de un negocio sin verificar: 'invalid' (indistinguibles)", r["valid"] is False and r["reason"] == "invalid" and r2["valid"] is False and r2["reason"] == "invalid" and r2["workshop_name"] is None, f"{r} {r2}")
        r = (await api("GET", f"/shop/alliance/{code}", as_user="taller")).json()
        check("20.6 El dueno no puede usar su propio codigo", r["valid"] is False and r["reason"] == "self", str(r))
        await ctx.conn.execute("UPDATE workshops SET access_until = now() - interval '1 day' WHERE code=$1", ctx.users["conv"]["code"])
        await ctx.conn.execute("UPDATE workshops SET access_plan='founder', access_until = now() - interval '1 day' WHERE code=$1", ctx.users["conv"]["code"])
        r = (await api("GET", f"/shop/alliance/{ctx.users['conv']['code']}")).json()
        check("20.7 Un negocio con acceso vencido deja de dar descuento", r["valid"] is False and r["reason"] == "inactive", str(r))
        await ctx.conn.execute("UPDATE workshops SET access_plan='convenio', access_until = NULL WHERE code=$1", ctx.users["conv"]["code"])

        settings.alliance_monthly_cap_units = 2
        r = await api("POST", "/shop/orders", json={**ORDER, "quantity": 2, "alliance_code": code})  # 1 pagado + 2 > tope de 2
        settings.alliance_monthly_cap_units = 30
        check("20.8 Superar el tope mensual: 422 alliance_limit y no se crea el pedido", r.status_code == 422 and r.json()["detail"] == "alliance_limit", r.text)

        r = await api("POST", "/shop/orders", json={**ORDER, "alliance_code": code, "amount_in_cents": 1, "discount_cents": 99999999})
        o = await ctx.conn.fetchrow("SELECT amount_in_cents, discount_cents FROM shop_orders WHERE reference=$1", r.json()["reference"])
        check("20.9 Montos y descuentos inventados por el cliente se ignoran", r.status_code == 201 and o["amount_in_cents"] == 3290000 and o["discount_cents"] == 700000, str(dict(o)))

        r = await api("POST", "/shop/orders", json={**ORDER, "payment_method": "cod", "alliance_code": code})
        o1 = await ctx.conn.fetchval("SELECT amount_in_cents FROM shop_orders WHERE reference=$1", r.json()["reference"])
        r = await api("POST", "/shop/orders", json={**ORDER, "payment_method": "cod"})
        o2 = await ctx.conn.fetchrow("SELECT amount_in_cents, discount_cents, alliance_code FROM shop_orders WHERE reference=$1", r.json()["reference"])
        check("20.10 Contraentrega con codigo = $32.900; sin codigo = $39.900 y sin atribucion", o1 == 3290000 and o2["amount_in_cents"] == 3990000 and o2["discount_cents"] == 0 and o2["alliance_code"] == "", f"{o1} {dict(o2)}")

        # =====================================================================
        print("\n== Suite 21: vehiculos del aliado, kilometraje certificado y entrega (Fase 3) ==")
        # =====================================================================
        for a in ("buyer", "buyer2", "buyer3"):
            await mkuser(a)
        DV = "/workshops/me/dealer-vehicles"
        spark = {"plate": "qal-801", "brand": "Chevrolet", "model": "Spark GT", "year": 2020, "color": "Gris", "vehicle_class": "Automovil",
                 "mileage_declared": 41000, "price_cop": 38500000, "description": "Unico dueno"}

        r = await api("POST", DV, as_user="conc", json=spark)
        dv1 = r.json() if r.status_code == 201 else {}
        check("21.1 Concesionario agrega un vehiculo: placa normalizada y enlace publico de 8 caracteres", r.status_code == 201 and dv1.get("plate") == "QAL801" and len(dv1.get("public_slug", "")) == 8 and dv1.get("status") == "available" and dv1.get("is_listed") is False, r.text[:200])
        r = await api("POST", DV, as_user="comp", json={**spark, "plate": "QAL-802", "model": "Aveo"})
        dv_comp = r.json() if r.status_code == 201 else {}
        check("21.1b Compraventa tambien puede", r.status_code == 201, r.text[:150])
        r1 = await api("POST", DV, as_user="taller", json=spark)
        r2 = await api("POST", DV, as_user="cda", json=spark)
        r3 = await api("GET", DV, as_user="rep")
        check("21.1c Taller, CDA y repuestos NO tienen vehiculos en venta (403)", r1.status_code == r2.status_code == r3.status_code == 403 and r1.json()["detail"] == "capability_not_available", f"{r1.status_code} {r2.status_code} {r3.status_code}")
        r = await api("POST", DV, as_user="conc", json=spark)
        r2 = await api("POST", DV, as_user="conc", json={**spark, "plate": "AB"})
        check("21.2 Placa repetida 409; placa invalida 422", r.status_code == 409 and r.json()["detail"] == "plate_exists" and r2.status_code == 422, f"{r.status_code} {r2.status_code}")

        # publicar / ficha publica
        r = await api("POST", f"{DV}/{dv1['id']}/listing", as_user="conc", json={"listed": True})
        slug = dv1["public_slug"]
        pub = await api("GET", f"/dealer-vehicles/public/{slug}")
        pj = pub.json() if pub.status_code == 200 else {}
        check("21.3 Publicar: la ficha publica responde y NO muestra la placa completa ni contacto", r.status_code == 200 and pub.status_code == 200 and pj["plate_hint"] == "QAL•••" and "plate" not in pj and not any(k in pj for k in ("phone", "email", "address", "owner_id", "workshop_id")), str(sorted(pj)))
        check("21.3b El km publicado sin certificar dice 'Declarado por el vendedor'", pj.get("mileage_label") == "Declarado por el vendedor" and pj.get("mileage_certified") is False and pj.get("mileage_km") == 41000, str(pj))
        r = await api("GET", "/dealer-vehicles/public/ZZZZZZZZ")
        check("21.3c Una ficha inexistente da 404", r.status_code == 404)
        await ctx.conn.execute("UPDATE workshops SET is_verified=false WHERE code=$1", ctx.users["conc"]["code"])
        pub = await api("GET", f"/dealer-vehicles/public/{slug}")
        lst = await api("POST", f"{DV}/{dv1['id']}/listing", as_user="conc", json={"listed": True})
        await ctx.conn.execute("UPDATE workshops SET is_verified=true WHERE code=$1", ctx.users["conc"]["code"])
        check("21.4 Si el negocio deja de estar verificado: la ficha se oculta (404) y no puede publicar (403)", pub.status_code == 404 and lst.status_code == 403 and lst.json()["detail"] == "not_verified", f"{pub.status_code} {lst.status_code}")

        # certificacion: permiso aparte
        r = await api("POST", f"{DV}/{dv1['id']}/certify-km", as_user="conc", json={"km": 45000})
        check("21.5 Sin la habilitacion del admin no se puede certificar (not_enabled)", r.status_code == 403 and r.json()["detail"] == "not_enabled", r.text)
        r_t = await admin("PATCH", f"/{ctx.users['taller']['app_id']}/certification", json={"enabled": True})
        r_c = await admin("PATCH", f"/{ctx.users['conc']['app_id']}/certification", json={"enabled": True})
        r_p = await admin("PATCH", f"/{ctx.users['comp']['app_id']}/certification", json={"enabled": True})
        lst = (await admin("GET", "")).json()
        flags = {a["nit"]: a["can_certify_odometer"] for a in lst}
        check("21.5b El admin habilita concesionario y compraventa; un taller se rechaza; el listado muestra el permiso", r_c.status_code == 200 and r_p.status_code == 200 and r_t.status_code == 422 and flags.get(ctx.users["conc"]["nit"]) is True and flags.get(ctx.users["taller"]["nit"]) is False, f"{r_c.status_code} {r_p.status_code} {r_t.status_code}")

        r = await api("POST", f"{DV}/{dv1['id']}/certify-km", as_user="conc", json={"km": 45000})
        j = r.json() if r.status_code == 200 else {}
        check("21.6 Concesionario habilitado certifica: 'Certificado por concesionario'", r.status_code == 200 and j.get("certified_km") == 45000 and j.get("certification_label") == "Certificado por concesionario", r.text[:200])
        r = await api("POST", f"{DV}/{dv_comp['id']}/certify-km", as_user="comp", json={"km": 52000})
        check("21.6b Compraventa habilitada solo 'declara': 'Declarado por compraventa verificada'", r.status_code == 200 and r.json().get("certification_label") == "Declarado por compraventa verificada", r.text[:200])
        pj = (await api("GET", f"/dealer-vehicles/public/{slug}")).json()
        check("21.6c La ficha publica ahora muestra el km certificado", pj["mileage_km"] == 45000 and pj["mileage_certified"] is True and pj["mileage_label"] == "Certificado por concesionario", str(pj))
        r = await api("POST", f"{DV}/{dv1['id']}/certify-km", as_user="conc", json={"km": 44000})
        check("21.6d No se puede certificar menos de lo ya certificado", r.status_code == 422 and r.json()["detail"] == "km_below_history", r.text)

        # historial real de la placa en otra cuenta (anti-fraude de odometro)
        r = await api("POST", "/vehicles", as_user="buyer", json={"plate": "QAL-777", "city": "Duitama", "brand": "Renault", "model": "Logan", "year": 2018, "type": "particular", "initial_mileage": 60000})
        check("21.7 (preparacion) Una cuenta persona registra QAL-777 con 60.000 km", r.status_code == 201, r.text[:150])
        r = await api("POST", DV, as_user="conc", json={**spark, "plate": "QAL777", "model": "Logan"})
        dv_hist = r.json()
        r1 = await api("POST", f"{DV}/{dv_hist['id']}/certify-km", as_user="conc", json={"km": 59000})
        r2 = await api("POST", f"{DV}/{dv_hist['id']}/certify-km", as_user="conc", json={"km": 200000})
        check("21.7 Certificar menos que el historial de la placa se rechaza (km_below_history) sin revelar la cifra", r1.status_code == 422 and r1.json()["detail"] == "km_below_history" and "60" not in r1.text, r1.text)
        check("21.7b Un salto absurdo sobre el historial se rechaza (km_jump_too_large)", r2.status_code == 422 and r2.json()["detail"] == "km_jump_too_large", r2.text)
        r3 = await api("POST", f"{DV}/{dv_hist['id']}/certify-km", as_user="conc", json={"km": 58000})
        r4 = await api("POST", f"{DV}/{dv_hist['id']}/certify-km", as_user="conc", json={"km": 60500})
        check("21.7c Maximo 3 intentos por vehiculo cada 24 h: el 3.o se evalua y el 4.o responde 429 aunque el valor sea bueno", r3.status_code == 422 and r3.json()["detail"] == "km_below_history" and r4.status_code == 429 and r4.json()["detail"] == "certify_attempts_exceeded", f"{r3.status_code} {r4.status_code}")
        await ctx.conn.execute("UPDATE dealer_vehicles SET certify_attempts=0, certify_window_start=NULL WHERE id=$1", uuid.UUID(dv_hist["id"]))
        r = await api("POST", f"{DV}/{dv_hist['id']}/certify-km", as_user="conc", json={"km": 60500})
        check("21.7d Pasada la ventana, un valor coherente con el historial se acepta", r.status_code == 200, r.text[:150])

        # entrega al comprador
        r = await api("POST", f"{DV}/{dv1['id']}/delivery", as_user="conc")
        tok1 = r.json()["token"] if r.status_code == 200 else None
        prev = await api("GET", f"/dealer-vehicles/delivery/{tok1}") if tok1 else None
        pj = prev.json() if prev is not None and prev.status_code == 200 else {}
        check("21.8 Generar la entrega: enlace de un solo uso; la vista previa muestra placa, km y vendedor", bool(tok1) and pj.get("plate") == "QAL-801" and pj.get("mileage_km") == 45000 and pj.get("mileage_label") == "Certificado por concesionario" and pj.get("dealer_name"), str(pj))
        r = await api("POST", f"{DV}/{dv1['id']}/delivery", as_user="conc")
        tok2 = r.json()["token"]
        old = await api("GET", f"/dealer-vehicles/delivery/{tok1}")
        check("21.8b Generar otro enlace invalida el anterior", tok2 != tok1 and old.status_code == 404, str(old.status_code))
        row = await ctx.conn.fetchrow("SELECT delivery_code_hash FROM dealer_vehicles WHERE id=$1", uuid.UUID(dv1["id"]))
        check("21.8c Solo se guarda el hash del codigo de entrega", row["delivery_code_hash"] and row["delivery_code_hash"] != tok2 and len(row["delivery_code_hash"]) == 64)

        r = await api("POST", "/dealer-vehicles/claim", as_user="buyer", json={"code": tok2, "share_contact": False})
        prev = await api("GET", f"/dealer-vehicles/delivery/{tok2}")
        check("21.10 Una cuenta persona que ya tiene un vehiculo necesita llavero: 403 keychain_required y el codigo sigue vigente", r.status_code == 403 and r.json()["detail"] == "keychain_required" and prev.status_code == 200, f"{r.status_code} {prev.status_code}")

        r = await api("POST", "/dealer-vehicles/claim", as_user="buyer2", json={"code": tok2, "share_contact": True})
        cj = r.json() if r.status_code == 201 else {}
        check("21.9 El comprador recibe el vehiculo en su cuenta (placa con guion)", r.status_code == 201 and cj.get("plate") == "QAL801", r.text[:200])
        vlist = (await api("GET", "/vehicles", as_user="buyer2")).json()
        mine = [v for v in vlist if v["plate"] == "QAL-801"]
        check("21.9b El vehiculo aparece en la cuenta del comprador con marca y modelo", len(mine) == 1 and mine[0]["brand"] == "Chevrolet" and mine[0]["model"] == "Spark GT", str(vlist)[:200])
        reading = await ctx.conn.fetchrow("SELECT mileage, source, certification_kind, certified_by_workshop_id FROM odometer_readings WHERE vehicle_id=$1", uuid.UUID(mine[0]["id"])) if mine else None
        check("21.9c Su odometro recibe una lectura 'dealer_delivery' de 45.000 km certificada por el concesionario", reading is not None and reading["source"] == "dealer_delivery" and reading["mileage"] == 45000 and reading["certification_kind"] == "dealer" and reading["certified_by_workshop_id"] is not None, str(dict(reading) if reading else None))
        od = (await api("GET", f"/odometer/vehicle/{mine[0]['id']}", as_user="buyer2")).json() if mine else {}
        check("21.9d El estado del odometro del comprador dice quien certifico", od.get("certification_label") == "Certificado por concesionario" and od.get("certified_by") and od.get("current_mileage") == 45000, str(od))
        dvs = (await api("GET", DV, as_user="conc")).json()
        mine_dv = next(d for d in dvs if d["id"] == dv1["id"])
        check("21.9e Para el vendedor queda 'entregado' y se retira de la venta", mine_dv["status"] == "delivered" and mine_dv["is_listed"] is False and mine_dv["delivered_at"] and mine_dv["share_with_dealer"] is True, str(mine_dv))
        pub = await api("GET", f"/dealer-vehicles/public/{slug}")
        again = await api("POST", "/dealer-vehicles/claim", as_user="buyer3", json={"code": tok2, "share_contact": False})
        check("21.9f La ficha publica desaparece y el enlace no se puede usar dos veces", pub.status_code == 404 and again.status_code == 404 and again.json()["detail"] == "delivery_invalid", f"{pub.status_code} {again.status_code}")
        clients = (await api("GET", "/workshops/me/clients", as_user="conc")).json()
        check("21.9g Con su autorizacion el comprador queda como cliente del vendedor (nombre y contacto)", any(c.get("name") for c in clients) and len(clients) >= 1, str(clients)[:200])

        # sin compartir contacto: no se crea cliente
        r = await api("POST", DV, as_user="comp", json={**spark, "plate": "QAL-803", "model": "Sail"})
        dv3 = r.json()
        tok3 = (await api("POST", f"{DV}/{dv3['id']}/delivery", as_user="comp")).json()["token"]
        before = len((await api("GET", "/workshops/me/clients", as_user="comp")).json())
        r = await api("POST", "/dealer-vehicles/claim", as_user="buyer3", json={"code": tok3, "share_contact": False})
        after = len((await api("GET", "/workshops/me/clients", as_user="comp")).json())
        check("21.9h Sin autorizacion NO se comparte el contacto: no se crea cliente", r.status_code == 201 and before == after == 0, f"{r.status_code} {before} {after}")

        # vencimiento de la entrega y modificaciones tras entregar
        r = await api("POST", DV, as_user="comp", json={**spark, "plate": "QAL-804", "model": "Onix"})
        dv4 = r.json()
        tok4 = (await api("POST", f"{DV}/{dv4['id']}/delivery", as_user="comp")).json()["token"]
        await ctx.conn.execute("UPDATE dealer_vehicles SET delivery_expires_at = now() - interval '1 day' WHERE id=$1", uuid.UUID(dv4["id"]))
        p1 = await api("GET", f"/dealer-vehicles/delivery/{tok4}")
        p2 = await api("POST", "/dealer-vehicles/claim", as_user="buyer2", json={"code": tok4, "share_contact": False})
        check("21.11 Una entrega vencida responde 410 (vista previa y recibir)", p1.status_code == 410 and p2.status_code == 410 and p1.json()["detail"] == "delivery_expired", f"{p1.status_code} {p2.status_code}")
        r1 = await api("DELETE", f"{DV}/{dv1['id']}", as_user="conc")
        r2 = await api("PATCH", f"{DV}/{dv1['id']}", as_user="conc", json={"price_cop": 1})
        r3 = await api("POST", f"{DV}/{dv1['id']}/certify-km", as_user="conc", json={"km": 99999})
        check("21.13 Un vehiculo entregado no se puede borrar, editar ni recertificar (409)", r1.status_code == r2.status_code == r3.status_code == 409, f"{r1.status_code} {r2.status_code} {r3.status_code}")
        r = await api("GET", "/dealer-vehicles/delivery/" + "z" * 30)
        check("21.14 Un codigo de entrega inventado da 404", r.status_code == 404)
        await ctx.conn.execute("UPDATE workshops SET access_until = now() - interval '1 day' WHERE code=$1", ctx.users["comp"]["code"])
        r = await api("POST", DV, as_user="comp", json={**spark, "plate": "QAL-805"})
        g = await api("GET", DV, as_user="comp")
        await ctx.conn.execute("UPDATE workshops SET access_until = now() + interval '170 days' WHERE code=$1", ctx.users["comp"]["code"])
        check("21.15 Con el acceso vencido el aliado solo lee su inventario (402 al crear)", r.status_code == 402 and g.status_code == 200, f"{r.status_code} {g.status_code}")

        # =====================================================================
        print("\n== Suite 23: revisiones RTM del CDA, consignacion de llaveros y fotos (Fase 3b) ==")
        # =====================================================================
        RT = "/workshops/me/rtm"
        today = datetime.now(timezone.utc).date()
        def rtm_body(plate, km, **o):
            return {"plate": plate, "inspected_on": today.isoformat(), "expires_on": (today + timedelta(days=365)).isoformat(),
                    "certificate_code": f"RTM-{uuid.uuid4().hex[:8].upper()}", "result": "approved", "mileage_km": km, "notes": "", **o}

        r1 = await api("GET", RT, as_user="taller"); r2 = await api("GET", RT, as_user="conc"); r3 = await api("POST", RT, as_user="comp", json=rtm_body("QAL777", 61000))
        check("23.1 Solo un CDA tiene revisiones RTM (taller, concesionario y compraventa: 403)", r1.status_code == r2.status_code == r3.status_code == 403 and r1.json()["detail"] == "capability_not_available", f"{r1.status_code} {r2.status_code} {r3.status_code}")
        r = await api("POST", RT, as_user="cda", json=rtm_body("QAL777", 61000))
        check("23.2 Un CDA sin habilitacion del admin no puede registrar (403 not_enabled)", r.status_code == 403 and r.json()["detail"] == "not_enabled", r.text)
        r = await admin("PATCH", f"/{ctx.users['cda']['app_id']}/certification", json={"enabled": True})
        check("23.2b El admin habilita al CDA (permiso aparte de la aprobacion)", r.status_code == 200 and r.json()["can_certify_odometer"] is True, r.text)

        bad_old = rtm_body("QAL777", 61000, inspected_on=(today - timedelta(days=8)).isoformat())
        bad_exp = rtm_body("QAL777", 61000, expires_on=today.isoformat())
        bad_cert = rtm_body("QAL777", 61000, certificate_code="12")
        bad_plate = rtm_body("AB", 61000)
        resp = [await api("POST", RT, as_user="cda", json=b) for b in (bad_old, bad_exp, bad_cert, bad_plate)]
        cert_ok_form = rtm_body("QAL777", 61000, certificate_code="RTM <script>")
        resp.append(await api("POST", RT, as_user="cda", json=cert_ok_form))
        check("23.3 Fechas, vigencia, certificado y placa invalidos se rechazan con 422 (y no gastan intentos del kilometraje)",
              all(r.status_code == 422 for r in resp) and resp[0].json()["detail"] == resp[1].json()["detail"] == "rtm_dates_invalid" and resp[4].json()["detail"] == "certificate_invalid", str([r.status_code for r in resp]))

        # antifraude: QAL-777 tiene 60.500 km certificados por un concesionario en otra cuenta (suite 21) y 60.000 del propietario
        a1 = await api("POST", RT, as_user="cda", json=rtm_body("QAL777", 59000))
        a2 = await api("POST", RT, as_user="cda", json=rtm_body("QAL777", 400000))
        check("23.4 Km menor al historial de la placa en otra cuenta: 422 sin revelar la cifra; salto absurdo: 422", a1.status_code == 422 and a1.json()["detail"] == "km_below_history" and "60" not in a1.text and a2.status_code == 422 and a2.json()["detail"] == "km_jump_too_large", f"{a1.text} {a2.text}")
        cert_ok = rtm_body("QAL777", 61000)
        a3 = await api("POST", RT, as_user="cda", json=cert_ok)
        a4 = await api("POST", RT, as_user="cda", json=rtm_body("QAL777", 61000))
        check("23.4b El 3.o intento coherente se acepta y el 4.o responde 429 (3 por placa cada 24 h)", a3.status_code == 201 and a4.status_code == 429 and a4.json()["detail"] == "certify_attempts_exceeded", f"{a3.status_code} {a4.status_code}")
        insp1 = a3.json()
        check("23.4c La revision queda con vigencia, certificado y dias restantes", insp1["result"] == "approved" and insp1["days_left"] in (364, 365, 366) and insp1["claimed"] is False, str(insp1)[:200])
        dup = await api("POST", RT, as_user="cda", json={**cert_ok, "plate": "QAL-804", "certificate_code": cert_ok["certificate_code"]})
        check("23.4d Un certificado repetido en el mismo CDA se rechaza (409)", dup.status_code == 409 and dup.json()["detail"] == "certificate_exists", dup.text)

        # constancia al propietario: nada se escribe sin aceptar
        before = await ctx.conn.fetchval("SELECT count(*) FROM diagnostics d JOIN vehicles v ON v.id=d.vehicle_id WHERE v.plate='QAL-777' AND d.alert_type='cda'")
        link = await api("POST", f"{RT}/{insp1['id']}/claim-link", as_user="cda")
        tokc = link.json()["token"] if link.status_code == 200 else None
        prev = await api("GET", f"/rtm/claim/{tokc}")
        pj = prev.json() if prev.status_code == 200 else {}
        after_link = await ctx.conn.fetchval("SELECT count(*) FROM diagnostics d JOIN vehicles v ON v.id=d.vehicle_id WHERE v.plate='QAL-777' AND d.alert_type='cda'")
        check("23.5 La constancia se ve con su codigo (placa, CDA, vigencia) y NO escribe nada en la cuenta del propietario", prev.status_code == 200 and pj.get("plate") == "QAL-777" and pj.get("certificate_code") == cert_ok["certificate_code"] and before == after_link == 0, str(pj)[:200])
        r = await api("POST", "/rtm/claim", as_user="buyer2", json={"code": tokc, "share_contact": False})
        check("23.5b Quien no tiene un vehiculo con esa placa no puede aceptarla (404 no_vehicle) y el codigo sigue vigente", r.status_code == 404 and r.json()["detail"] == "no_vehicle" and (await api("GET", f"/rtm/claim/{tokc}")).status_code == 200, r.text)
        r = await api("POST", "/rtm/claim", as_user="buyer", json={"code": tokc, "share_contact": False})
        cj = r.json() if r.status_code == 201 else {}
        diag = await ctx.conn.fetchrow("SELECT alert_type, severity, cda_code, cda_expiry_date FROM diagnostics WHERE id=$1", uuid.UUID(cj["diagnostic_id"])) if cj else None
        check("23.6 El propietario acepta: se crea el diagnostico de revision con su vigencia y el km certificado entra al odometro", r.status_code == 201 and cj.get("km_added") is True and diag and diag["alert_type"] == "cda" and diag["cda_code"] == cert_ok["certificate_code"] and diag["severity"] == "info", str(cj))
        reading = await ctx.conn.fetchrow("SELECT mileage, source, certification_kind FROM odometer_readings WHERE vehicle_id=$1 AND source='cda_inspection'", uuid.UUID(cj["vehicle_id"])) if cj else None
        od = (await api("GET", f"/odometer/vehicle/{cj['vehicle_id']}", as_user="buyer")).json() if cj else {}
        check("23.6b La lectura queda 'cda_inspection' certificada por el CDA y su estado dice 'Certificado por CDA'", reading is not None and reading["mileage"] == 61000 and reading["certification_kind"] == "cda" and od.get("certification_label") == "Certificado por CDA" and od.get("current_mileage") == 61000, f"{dict(reading) if reading else None} {od}")
        again = await api("POST", "/rtm/claim", as_user="buyer", json={"code": tokc, "share_contact": False})
        clients0 = (await api("GET", "/workshops/me/clients", as_user="cda")).json()
        check("23.6c La constancia no se puede aceptar dos veces y sin autorizacion no se crea cliente", again.status_code == 404 and again.json()["detail"] == "claim_invalid" and len(clients0) == 0, f"{again.status_code} {len(clients0)}")

        # con autorizacion: queda como cliente y se le puede recordar
        near = rtm_body("QAL801", 46000, expires_on=(today + timedelta(days=20)).isoformat())
        r = await api("POST", RT, as_user="cda", json=near)
        tok2 = (await api("POST", f"{RT}/{r.json()['id']}/claim-link", as_user="cda")).json()["token"]
        await ctx.conn.execute("UPDATE profiles SET whatsapp_number='3001234567', full_name='Comprador Dos' WHERE id=$1", uuid.UUID(ctx.users["buyer2"]["id"]))
        c2 = await api("POST", "/rtm/claim", as_user="buyer2", json={"code": tok2, "share_contact": True})
        up = (await api("GET", f"{RT}/upcoming?days=45", as_user="cda")).json()
        mine = [u for u in up if u["plate"] == "QAL801"]
        check("23.7 Con su autorizacion el propietario queda como cliente del CDA y aparece en 'por vencer' con su contacto", c2.status_code == 201 and len(mine) == 1 and mine[0]["client_name"] == "Comprador Dos" and mine[0]["client_phone"] == "3001234567" and 18 <= mine[0]["days_left"] <= 20, str(mine))
        rej = await api("POST", RT, as_user="cda", json=rtm_body("QAL805", 30000, result="rejected", expires_on=(today + timedelta(days=30)).isoformat()))
        up2 = (await api("GET", f"{RT}/upcoming?days=45", as_user="cda")).json()
        check("23.7b Una revision no aprobada NO aparece en 'por vencer'; la de QAL-777 (365 dias) tampoco", rej.status_code == 201 and all(u["plate"] not in ("QAL805", "QAL777") for u in up2), str([u["plate"] for u in up2]))

        # el km del CDA no pisa un historial mas alto del propietario
        r = await api("POST", RT, as_user="cda", json=rtm_body("QAL803", 42000))
        tok3 = (await api("POST", f"{RT}/{r.json()['id']}/claim-link", as_user="cda")).json()["token"]
        veh3 = await ctx.conn.fetchval("SELECT id FROM vehicles WHERE owner_id=$1 AND plate='QAL-803'", uuid.UUID(ctx.users["buyer3"]["id"]))
        await ctx.conn.execute("INSERT INTO odometer_readings (vehicle_id, mileage, source) VALUES ($1, 50000, 'periodic')", veh3)
        c3 = await api("POST", "/rtm/claim", as_user="buyer3", json={"code": tok3, "share_contact": False})
        check("23.8 Si el km de la revision no cuadra con el odometro del propietario, se guarda la revision pero NO el kilometraje", c3.status_code == 201 and c3.json()["km_added"] is False and c3.json()["diagnostic_id"], c3.text)

        r = await api("POST", RT, as_user="cda", json=rtm_body("QAL806", 20000))
        tok4 = (await api("POST", f"{RT}/{r.json()['id']}/claim-link", as_user="cda")).json()["token"]
        await ctx.conn.execute("UPDATE rtm_inspections SET claim_expires_at = now() - interval '1 day' WHERE id=$1", uuid.UUID(r.json()["id"]))
        p1 = await api("GET", f"/rtm/claim/{tok4}"); p2 = await api("POST", "/rtm/claim", as_user="buyer", json={"code": tok4, "share_contact": False})
        p3 = await api("GET", "/rtm/claim/" + "z" * 30)
        check("23.9 Constancia vencida: 410; codigo inventado: 404", p1.status_code == 410 and p2.status_code == 410 and p3.status_code == 404, f"{p1.status_code} {p2.status_code} {p3.status_code}")
        await ctx.conn.execute("UPDATE workshops SET access_until = now() - interval '1 day' WHERE code=$1", ctx.users["cda"]["code"])
        rl = await api("GET", RT, as_user="cda"); rw = await api("POST", RT, as_user="cda", json=rtm_body("QAL807", 20000))
        await ctx.conn.execute("UPDATE workshops SET access_until = now() + interval '170 days' WHERE code=$1", ctx.users["cda"]["code"])
        check("23.10 Con el acceso vencido el CDA solo lee (402 al registrar)", rl.status_code == 200 and rw.status_code == 402, f"{rl.status_code} {rw.status_code}")

        # consignacion de llaveros al concesionario
        cg = (await api("GET", "/workshops/me/consignment", as_user="conc")).json()
        cg_taller = await api("GET", "/workshops/me/consignment", as_user="taller")
        check("23.11 Sin partner vinculado el concesionario ve 'sin cupo'; un taller no tiene esta seccion (403)", cg["linked"] is False and cg_taller.status_code == 403, f"{cg} {cg_taller.status_code}")
        pid = await ctx.conn.fetchval("INSERT INTO partners (name, contact_email, api_key_hash, api_key_prefix, quota_total, quota_used) VALUES ($1,'qa@carlink.internal',$2,'qa000000',5,3) RETURNING id", "QA Aliados partner", uuid.uuid4().hex + uuid.uuid4().hex)
        for i, st in enumerate(("available", "available", "claimed")):
            await ctx.conn.execute("INSERT INTO nfc_token_whitelist (tag_uid, status, token_prefix, provisioned_by_partner_id, activation_code_hash, claimed_at) VALUES ($1,$2,$3,$4,$5,$6)",
                                   f"QA-ALIADOS-{uuid.uuid4().hex[:8]}", st, f"qa{i}abcde", pid, uuid.uuid4().hex, datetime.now(timezone.utc) if st == "claimed" else None)
        ADM = "/admin/nfc/partners"
        bad = await http.patch(f"/api{ADM}/{pid}", json={"workshop_code": ctx.users["taller"]["code"]})
        ok_ = await http.patch(f"/api{ADM}/{pid}", json={"workshop_code": ctx.users["conc"]["code"].lower()})
        pid2 = await ctx.conn.fetchval("INSERT INTO partners (name, contact_email, api_key_hash, api_key_prefix) VALUES ($1,'qa2@carlink.internal',$2,'qa111111') RETURNING id", "QA Aliados partner 2", uuid.uuid4().hex + uuid.uuid4().hex)
        dup = await http.patch(f"/api{ADM}/{pid2}", json={"workshop_code": ctx.users["conc"]["code"]})
        check("23.12 El admin vincula el partner solo a un concesionario verificado (taller 422) y un negocio solo a un partner (409)", bad.status_code == 422 and bad.json()["detail"] == "workshop_not_eligible" and ok_.status_code == 200 and ok_.json()["workshop_code"] == ctx.users["conc"]["code"] and dup.status_code == 409, f"{bad.status_code} {ok_.status_code} {dup.status_code}")
        cg = (await api("GET", "/workshops/me/consignment", as_user="conc")).json()
        raw = json.dumps(cg)
        check("23.13 El concesionario ve cupo 5, 2 disponibles, 1 activado y NUNCA codigos de activacion ni quien los activo", cg["linked"] and cg["quota_total"] == 5 and cg["available"] == 2 and cg["claimed"] == 1 and len(cg["rows"]) == 3 and "activation" not in raw and "claimed_by" not in raw, raw[:200])
        unl = await http.patch(f"/api{ADM}/{pid}", json={"workshop_code": ""})
        check("23.13b Desvincular deja al concesionario 'sin cupo'", unl.status_code == 200 and unl.json()["workshop_code"] is None, unl.text[:120])
        await http.patch(f"/api{ADM}/{pid}", json={"workshop_code": ctx.users["conc"]["code"]})

        # fotos del vehiculo en venta
        cid = ctx.users["conc"]["id"]
        own = [f"/api/upload/files/{cid}/{uuid.uuid4()}.jpg" for _ in range(8)]
        r = await api("POST", DV, as_user="conc", json={**spark, "plate": "QAL-821", "model": "Fotos", "photo_urls": own[:3] + [own[0]]})
        dvp = r.json() if r.status_code == 201 else {}
        check("23.14 Las fotos del vehiculo: solo archivos del propio aliado, sin repetidas", r.status_code == 201 and dvp.get("photo_urls") == own[:3], r.text[:200])
        r_ext = await api("POST", DV, as_user="conc", json={**spark, "plate": "QAL-822", "photo_urls": ["https://evil.example/x.jpg"]})
        r_other = await api("POST", DV, as_user="conc", json={**spark, "plate": "QAL-823", "photo_urls": [f"/api/upload/files/{uuid.uuid4()}/{uuid.uuid4()}.jpg"]})
        check("23.14b Una foto externa o de otra cuenta se rechaza (422)", r_ext.status_code == 422 and r_other.status_code == 422, f"{r_ext.status_code} {r_other.status_code}")
        up_ = await api("PATCH", f"{DV}/{dvp['id']}", as_user="conc", json={"photo_urls": own[3:9]})
        check("23.14c Editar las fotos: maximo 6", up_.status_code == 200 and len(up_.json()["photo_urls"]) == 5 and up_.json()["photo_urls"] == own[3:8], up_.text[:200])
        await api("POST", f"{DV}/{dvp['id']}/listing", as_user="conc", json={"listed": True})
        pj = (await api("GET", f"/dealer-vehicles/public/{dvp['public_slug']}")).json()
        check("23.14d La ficha publica entrega las fotos", pj.get("photo_urls") == own[3:8], str(pj.get("photo_urls"))[:120])
        r7 = await api("POST", DV, as_user="conc", json={**spark, "plate": "QAL-824", "photo_urls": own[:7]})
        check("23.14e Mas de 6 fotos en una sola peticion se rechaza", r7.status_code == 422, str(r7.status_code))

        # =====================================================================
        print("\n== Suite 24: verificacion automatica de empresas en el RUES (Fase 4) ==")
        # =====================================================================
        from app.services import company_verification as cv
        live = await cv.verify(nit="899999068-1", name="Ecopetrol", legal_name="ECOPETROL S.A.", kind="concesionario")
        check("24.1 Consulta real al RUES (datos abiertos): una empresa publica conocida sale encontrada, activa, renovada y con digito de verificacion y nombre que coinciden",
              live.get("found") is True and live["checks"]["active"] and live["checks"]["renewed"] and live["checks"]["dv"] is True and live["checks"]["name"] and live["razon_social"].startswith("ECOPETROL"), str({k: v for k, v in live.items() if k != "checked_at"})[:300])
        bogus = await cv.verify(nit="100000005-1", name="Nada", legal_name="", kind="taller")
        check("24.1b Un NIT que no existe en el RUES sale 'not_found' (no se inventa nada)", bogus.get("status") == "not_found" and bogus.get("found") is False, str(bogus)[:200])

        await mkuser("rues")
        await submit_application("rues", "concesionario", nit="899999068-1", name="ECOPETROL", legal_name="ECOPETROL S.A.")
        vrow = await ctx.conn.fetchval("SELECT verification FROM workshop_applications WHERE id=$1", uuid.UUID(ctx.users["rues"]["app_id"]))
        vrow = json.loads(vrow) if isinstance(vrow, str) else vrow
        check("24.2 Al postular, el NIT se consulta solo y el resultado queda guardado (empresa, estado, camara, CIIU, renovacion)", vrow.get("found") is True and vrow.get("estado") == "ACTIVA" and vrow.get("camara") == "BOGOTA" and vrow.get("ultimo_ano_renovado") and "Confec" in vrow.get("source", ""), str(vrow)[:260])
        r = await admin("POST", f"/{ctx.users['rues']['app_id']}/verify")
        again = r.json()["verification"] if r.status_code == 200 else {}
        check("24.3 El admin puede repetir la consulta ('Consultar RUES') y se actualiza la fecha", r.status_code == 200 and again.get("checked_at") and again["checked_at"] != vrow["checked_at"] and again.get("status") == vrow.get("status"), r.text[:200])
        check("24.3b Consultar no aprueba ni cambia el estado de la postulacion", (await ctx.conn.fetchval("SELECT status FROM workshop_applications WHERE id=$1", uuid.UUID(ctx.users['rues']['app_id']))) == "pending")

        await mkuser("rues2")
        saved = cv.SOCRATA_URL
        cv.SOCRATA_URL = "http://127.0.0.1:9/no-existe.json"
        try:
            await submit_application("rues2", "taller")
        finally:
            cv.SOCRATA_URL = saved
        v2 = await ctx.conn.fetchval("SELECT verification FROM workshop_applications WHERE id=$1", uuid.UUID(ctx.users["rues2"]["app_id"]))
        v2 = json.loads(v2) if isinstance(v2, str) else v2
        check("24.4 Si el RUES no responde, la postulacion igual se guarda y queda 'unavailable' (el admin puede reintentar)", v2.get("status") == "unavailable" and v2.get("found") is False, str(v2)[:200])

        await mkuser("n3")
        await submit_application("n3", "cda")
        r_no = await admin("PATCH", f"/{ctx.users['n3']['app_id']}", json={"status": "approved"})
        st_no = await ctx.conn.fetchval("SELECT status FROM workshop_applications WHERE id=$1", uuid.UUID(ctx.users["n3"]["app_id"]))
        await admin("PATCH", f"/{ctx.users['n3']['app_id']}", json={"checks": {"doc_reviewed": True, "nit_confirmed": True}})
        r_half = await admin("PATCH", f"/{ctx.users['n3']['app_id']}", json={"status": "approved"})
        r_ok = await admin("PATCH", f"/{ctx.users['n3']['app_id']}", json={"status": "approved", "checks": {"contact_confirmed": True, "location_ok": True}})
        check("24.5 CDA (nivel de confianza alto): NO se aprueba con la lista de chequeo incompleta (422 checks_incomplete); completa, si", r_no.status_code == 422 and r_no.json()["detail"] == "checks_incomplete" and st_no == "pending" and r_half.status_code == 422 and r_ok.status_code == 200 and r_ok.json()["status"] == "approved", f"{r_no.status_code} {r_half.status_code} {r_ok.status_code}")
        await mkuser("n1")
        await submit_application("n1", "taller")
        r_t = await admin("PATCH", f"/{ctx.users['n1']['app_id']}", json={"status": "approved"})
        check("24.5b Un taller (nivel estandar) si se puede aprobar sin completar la lista (el panel solo advierte)", r_t.status_code == 200 and r_t.json()["status"] == "approved", r_t.text[:150])
        await mkuser("n3b")
        await submit_application("n3b", "compraventa")
        r_c = await admin("PATCH", f"/{ctx.users['n3b']['app_id']}", json={"status": "approved"})
        check("24.5c Compraventa (nivel alto) tambien exige la lista completa", r_c.status_code == 422 and r_c.json()["detail"] == "checks_incomplete", r_c.text[:150])

        # ---- estados fijos para la prueba visual ----
        if args.fixtures:
            await ctx.conn.execute("UPDATE shop_orders SET status='approved' WHERE customer_email LIKE $1 AND alliance_code <> '' AND status='pending' AND id IN (SELECT id FROM shop_orders WHERE customer_email LIKE $1 AND alliance_code <> '' ORDER BY created_at LIMIT 1)", f"{PREFIX}%{DOMAIN}")
            await ctx.conn.execute("UPDATE workshops SET access_until = now() + interval '170 days' WHERE code=$1", ctx.users["taller"]["code"])
            await ctx.conn.execute("UPDATE workshops SET access_until = now() - interval '2 days' WHERE code=$1", ctx.users["rep"]["code"])  # repuestos queda VENCIDO (solo lectura)
            await ctx.conn.execute("UPDATE workshops SET access_until = now() + interval '170 days' WHERE code=$1", ctx.users["cda"]["code"])
            await mkuser("expired")
            await submit_application("expired", "taller")
            wx = (await register("expired", await approve("expired"))).json()
            ctx.users["expired"]["code"] = wx["code"]
            await ctx.conn.execute("UPDATE workshops SET access_until = now() - interval '3 days' WHERE code=$1", wx["code"])
            # Vehiculos en venta en estados conocidos para la prueba visual (concesionario): publicado y certificado, sin publicar, y con entrega pendiente.
            await mkuser("buyer4")  # persona SIN vehiculos: recibira la entrega en el navegador
            listed = (await api("POST", DV, as_user="conc", json={**spark, "plate": "QAL-811", "model": "Spark Life", "mileage_declared": 28000})).json()
            await api("POST", f"{DV}/{listed['id']}/listing", as_user="conc", json={"listed": True})
            await api("POST", f"{DV}/{listed['id']}/certify-km", as_user="conc", json={"km": 28450})
            await api("POST", DV, as_user="conc", json={**spark, "plate": "QAL-812", "model": "Beat", "price_cop": None, "mileage_declared": 0, "description": ""})
            pending = (await api("POST", DV, as_user="conc", json={**spark, "plate": "QAL-813", "model": "Onix Turbo", "year": 2023, "mileage_declared": 9000})).json()
            await api("POST", f"{DV}/{pending['id']}/certify-km", as_user="conc", json={"km": 9120})
            pending_token = (await api("POST", f"{DV}/{pending['id']}/delivery", as_user="conc")).json()["token"]
            # Una postulacion aprobada con invitacion SIN usar: para recorrer el registro con invitacion en el navegador.
            await mkuser("invitee")
            await submit_application("invitee", "concesionario", specialties="Mazda, Kia")
            invite_token = await approve("invitee", "founder", 365)
            # Revisiones RTM del CDA para la prueba visual: una por vencer con contacto, y una constancia SIN aceptar para buyer2 (QAL-801).
            rtm_ok = await api("POST", RT, as_user="cda", json=rtm_body("QAL801", 47000, expires_on=(today + timedelta(days=40)).isoformat()))
            rtm_token = (await api("POST", f"{RT}/{rtm_ok.json()['id']}/claim-link", as_user="cda")).json()["token"]
            vphoto = (await api("POST", DV, as_user="conc", json={**spark, "plate": "QAL-831", "model": "Spark con fotos", "mileage_declared": 33000, "photo_urls": [f"/api/upload/files/{cid}/{uuid.uuid4()}.jpg" for _ in range(3)]})).json()
            await api("POST", f"{DV}/{vphoto['id']}/listing", as_user="conc", json={"listed": True})
            out = {"supabase_url": os.environ["SUPABASE_URL"], "alliance_code": code, "users": {}, "rtm_claim_token": rtm_token, "photo_slug": vphoto["public_slug"], "photo_urls": vphoto["photo_urls"], "conc_id": cid,
                   "invite_token": invite_token, "invite_nit": ctx.users["invitee"]["nit"],
                   "cert": {ctx.users[a]["nit"]: True for a in ("conc", "comp", "cda")},
                   "dealer": {"listed_slug": listed["public_slug"], "pending_delivery_token": pending_token, "delivered_plate": "QAL-801"}}
            for alias in ("taller", "conc", "cda", "comp", "rep", "conv", "expired", "buyer2", "buyer4", "invitee"):
                u = ctx.users[alias]
                sess = await sb_sign_in(u["email"], u["password"])
                out["users"][alias] = {"email": u["email"], "id": u["id"], "code": u.get("code"), "session": sess, "app_id": u.get("app_id")}
            out["admin_payload"] = {"applications": [dict(r) for r in await ctx.conn.fetch("SELECT * FROM workshop_applications WHERE email LIKE $1 ORDER BY created_at", f"{PREFIX}%{DOMAIN}")]}
            with open(args.fixtures, "w") as f:
                json.dump(out, f, default=str)
            print(f"\nFixtures visuales guardados en {args.fixtures} (contiene sesiones: borrarlo al terminar y correr --cleanup)")
    finally:
        await http.aclose()
        app.dependency_overrides.clear()
        if ctx.conn:
            await ctx.conn.close()
        if not args.fixtures:
            await cleanup()

    bad = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(bad)} de {len(results)} comprobaciones OK" + (f"; FALLARON: {[b[0] for b in bad]}" if bad else ""))
    if args.json:
        with open(args.json, "w") as f:
            json.dump([{"caso": c, "ok": ok, "detalle": d} for c, ok, d in results], f, ensure_ascii=False, indent=1)
    return 1 if bad else 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--fixtures", help="deja cuentas listas para la prueba visual y guarda sus sesiones en este archivo (NO limpia)")
    ap.add_argument("--cleanup", action="store_true", help="borra todo lo qa-aliados-*")
    ap.add_argument("--json", help="guarda los resultados en este archivo")
    sys.exit(asyncio.run(main(ap.parse_args())))
