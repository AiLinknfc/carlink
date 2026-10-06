"""Utilidades compartidas de la Suite 14 automatizada (ver README.md).

Nada de secretos en el repo: la contrasena de la cuenta de pruebas viene de QA_PASSWORD (la imprime
`backend/scripts/qa_test_account.py create`); la base y Supabase se leen de backend/.env y frontend/.env.local.
"""
import json, os, re, sys, time, httpx, uuid
import datetime as dt
from pathlib import Path
from urllib.parse import urlparse
from dotenv import dotenv_values
from playwright.sync_api import sync_playwright

ROOT = str(Path(__file__).resolve().parents[2])
ENV = dotenv_values(f"{ROOT}/backend/.env"); FENV = dotenv_values(f"{ROOT}/frontend/.env.local")
EMAIL = os.environ.get("QA_EMAIL", "pruebas.features@carlink.internal")
PASSWORD = os.environ.get("QA_PASSWORD", "")
ACTIVATION_CODE = os.environ.get("QA_ACTIVATION_CODE", "6WDDSBEEE7")   # whitelist TEST-002
CHROME = os.environ.get("CHROME_PATH") or None                           # None = el Chromium que instala Playwright
BASE, API = os.environ.get("QA_BASE", "http://localhost:3000"), os.environ.get("QA_API", "http://localhost:8000/api")
OUT_DIR = Path(__file__).resolve().parent / "out"; OUT_DIR.mkdir(exist_ok=True)
RESULTS_FILE = OUT_DIR / "results.jsonl"

if not EMAIL.endswith("@carlink.internal"):
    sys.exit("Esta suite escribe y borra datos: solo corre con una cuenta @carlink.internal (cuenta de pruebas).")
SUPA = ENV["SUPABASE_URL"].rstrip("/")
REF = urlparse(SUPA).netloc.split(".")[0]
RESULTS = []

def session():
    if not PASSWORD:
        sys.exit("Falta QA_PASSWORD (la contrasena de la cuenta de pruebas).")
    r = httpx.post(f"{SUPA}/auth/v1/token?grant_type=password", headers={"apikey": FENV["NEXT_PUBLIC_SUPABASE_ANON_KEY"]},
                   json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    r.raise_for_status(); return r.json()

def api(method, path, token, **kw):
    return httpx.request(method, f"{API}{path}", headers={"Authorization": f"Bearer {token}"}, timeout=60, **kw)

def record(code, name, ok, note=""):
    RESULTS.append((code, name, ok, note))
    with open(RESULTS_FILE, "a") as f: f.write(json.dumps({"code": code, "name": name, "ok": ok, "note": note}, ensure_ascii=False) + "\n")
    print(("PASS" if ok is True else "FAIL" if ok is False else "SKIP"), code, name, ("— " + note) if note else "", flush=True)

def new_page(p, sess):
    b = p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), headless=True)
    ctx = b.new_context(viewport={"width": 1280, "height": 900})
    ctx.add_init_script(f"localStorage.setItem('sb-{REF}-auth-token', {json.dumps(json.dumps(sess))});")
    pg = ctx.new_page(); pg.set_default_timeout(20000)
    return b, ctx, pg

def app_page(p, sess, extra_init=""):
    uid = sess["user"]["id"]
    b = p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}), headless=True)
    ctx = b.new_context(viewport={"width": 1280, "height": 1000})
    ctx.add_init_script(f"localStorage.setItem('sb-{REF}-auth-token', {json.dumps(json.dumps(sess))});"
                        f"localStorage.setItem('carlink_onboarding_done_{uid}','1'); localStorage.setItem('carlink_welcomed_{uid}','1');" + extra_init)
    pg = ctx.new_page(); pg.set_default_timeout(20000)
    pg.goto(f"{BASE}/app", wait_until="networkidle", timeout=60000); pg.wait_for_timeout(2500)
    return b, ctx, pg

import asyncio, asyncpg
def sql(query, *args, fetch=False):
    async def _run():
        c = await asyncpg.connect(ENV["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://"), statement_cache_size=0)
        try:
            return await (c.fetch(query, *args) if fetch else c.execute(query, *args))
        finally:
            await c.close()
    import concurrent.futures
    with concurrent.futures.ThreadPoolExecutor(1) as ex:
        return ex.submit(lambda: asyncio.run(_run())).result()


def current_vehicle_id():
    """Id del vehiculo de la cuenta de pruebas (el que crea la parte A) y chequeo de seguridad: solo se toca
    con SQL un vehiculo de una cuenta @carlink.internal."""
    sess = session(); vs = api("GET", "/vehicles", sess["access_token"]).json()
    if not vs:
        sys.exit("La cuenta de pruebas no tiene vehiculo: corre primero la parte A (registro).")
    vid = vs[0]["id"]
    owner = sql("select p.email from vehicles v join profiles p on p.id = v.owner_id where v.id = $1", uuid.UUID(vid), fetch=True)[0]["email"]
    assert owner.endswith("@carlink.internal"), f"vehiculo de {owner}: no es de una cuenta de pruebas"
    return vid
