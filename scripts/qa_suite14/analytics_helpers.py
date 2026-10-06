"""Ayudas del chequeo de analitica (token de la cuenta de pruebas, envio de eventos)."""
import asyncio, sys, uuid, httpx, json
sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parents[2] / "backend"))
from dotenv import dotenv_values
ROOT = str(__import__("pathlib").Path(__file__).resolve().parents[2])
ENV = dotenv_values(f"{ROOT}/backend/.env"); FENV = dotenv_values(f"{ROOT}/frontend/.env.local")
def token():
    r = httpx.post(f"{ENV['SUPABASE_URL'].rstrip('/')}/auth/v1/token?grant_type=password", headers={"apikey": FENV["NEXT_PUBLIC_SUPABASE_ANON_KEY"]},
                   json={"email": "pruebas.features@carlink.internal", "password": __import__("os").environ["QA_PASSWORD"]}, timeout=30); return r.json()["access_token"]
def post(events, tok=None):
    h = {"Authorization": f"Bearer {tok}"} if tok else {}
    return httpx.post("http://localhost:8000/api/analytics/events", json={"events": events}, headers=h, timeout=30).status_code
def ev(anon, path="/shop"): return {"anon_id": anon, "session_id": "s-" + anon, "event": "page_view", "path": path, "device": "desktop"}
