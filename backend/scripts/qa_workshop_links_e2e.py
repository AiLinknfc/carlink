"""E2E del vinculo taller-conductor contra el API y la base REALES (docs/PLAN_VINCULO_TALLER_CONDUCTOR.md, Suite 15).

Requisitos:
  - Migracion 074 aplicada.
  - Un backend con WORKSHOP_LINKS_ENABLED=true escuchando en --api (por defecto http://localhost:8001):
        WORKSHOP_LINKS_ENABLED=true .venv/bin/uvicorn app.main:app --port 8001
  - Dos cuentas de pruebas @carlink.internal (backend/scripts/qa_test_account.py): una persona (conductor) y una
    TALLER ya registrada (NIT de pruebas 900999001-1). Las contrasenas NO se guardan: se leen del entorno.

Uso (desde backend/):
    QA_DRIVER_EMAIL=pruebas.features@carlink.internal QA_DRIVER_PASSWORD=... \\
    QA_TALLER_EMAIL=taller.pruebas@carlink.internal  QA_TALLER_PASSWORD=... \\
    .venv/bin/python scripts/qa_workshop_links_e2e.py [--api http://localhost:8001]

El vehiculo de prueba queda SIN verificar a proposito: asi se comprueba que los escenarios A y C no traen historial
del taller (solo el enlace de reclamo, escenario B, lo hace).

Crea un vehiculo, un cliente y una orden de prueba y los BORRA al terminar (aunque falle). Solo toca cuentas @carlink.internal.
"""
from __future__ import annotations

import argparse
import os
import sys

import httpx
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

PLATE = "QAL-123"
results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> bool:
    results.append((name, ok, detail))
    print(("  OK   " if ok else "  FALLA ") + name + (f"  [{detail}]" if detail and not ok else ""))
    return ok


def login(email: str, password: str) -> dict:
    assert email.lower().endswith("@carlink.internal"), "Solo cuentas @carlink.internal"
    url = os.environ["SUPABASE_URL"].rstrip("/") + "/auth/v1/token?grant_type=password"
    r = httpx.post(url, headers={"apikey": os.environ["SUPABASE_ANON_KEY"]}, json={"email": email, "password": password}, timeout=20)
    r.raise_for_status()
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def main(api: str) -> int:
    d_h = login(os.environ["QA_DRIVER_EMAIL"], os.environ["QA_DRIVER_PASSWORD"])
    t_h = login(os.environ["QA_TALLER_EMAIL"], os.environ["QA_TALLER_PASSWORD"])
    c = httpx.Client(base_url=api + "/api", timeout=30)
    made: dict = {}
    try:
        st = c.get("/workshop-links/status").json()
        if not check("flag encendido en el servidor de pruebas", st.get("enabled") is True, str(st)):
            return 1

        ws = c.get("/workshops/me", headers=t_h)
        if ws.status_code == 404 and os.environ.get("QA_TALLER_NIT"):
            # Cuenta taller aun sin taller: se registra con el NIT de pruebas (el mismo flujo que usa la interfaz).
            c.post("/workshops", headers=t_h, json={"legal_id": os.environ["QA_TALLER_NIT"], "name": "Taller E2E Vinculos", "address": "Calle 72 # 10-34", "city": "Bogota", "phone": "3000000000"})
            ws = c.get("/workshops/me", headers=t_h)
        check("la cuenta taller tiene taller registrado", ws.status_code == 200, f"{ws.status_code}")
        code = ws.json()["code"]

        # --- escenario A: QR del taller ---
        v = c.post("/vehicles", headers=d_h, json={"plate": PLATE, "city": "Bogota", "brand": "Test", "model": "QA", "year": 2020, "type": "particular"})
        check("conductor crea su vehiculo de prueba", v.status_code in (200, 201), f"{v.status_code} {v.text[:120]}")
        made["vehicle"] = v.json()["id"]
        vid = made["vehicle"]

        r = c.post("/workshop-links", headers=d_h, json={"workshop_code": code, "vehicle_id": vid, "share_contact": False})
        check("A: el conductor se vincula con el codigo del taller", r.status_code == 201, f"{r.status_code} {r.text[:120]}")
        link_id = r.json().get("id")
        r2 = c.post("/workshop-links", headers=d_h, json={"workshop_code": code, "vehicle_id": vid, "share_contact": True})
        check("A: repetir es idempotente (no duplica)", r2.status_code == 201 and r2.json()["id"] == link_id)
        mine = c.get("/workshop-links/mine", headers=d_h).json()
        check("A: aparece en 'mis vinculos'", any(x["id"] == link_id for x in mine))

        tl = c.get("/workshops/me/links", headers=t_h).json()
        row = next((x for x in tl if x["plate"] == PLATE), None)
        check("A: el taller ve al conductor vinculado (nombre y placa)", row is not None)
        check("A: el WhatsApp solo se ve si el conductor lo permitio", row is not None and "whatsapp" in row)

        # --- seguridad ---
        other = c.post("/workshop-links", headers=t_h, json={"workshop_code": code, "vehicle_id": vid})
        check("seguridad: una cuenta de taller NO puede vincularse como cliente (403)", other.status_code == 403, str(other.status_code))
        own = c.post("/workshop-links", headers=t_h, json={"workshop_code": "TLR-NOEXI", "vehicle_id": vid})
        check("seguridad: tampoco con un codigo inexistente (403 antes de mirar nada)", own.status_code == 403, str(own.status_code))
        sug = c.get("/workshop-links/candidates", headers=t_h)
        check("seguridad: una cuenta de taller no recibe sugerencias", sug.status_code == 200 and sug.json() == [], f"{sug.status_code} {sug.text[:60]}")

        # --- escenario B: cliente cargado por el taller + reclamo ---
        cl = c.post("/workshops/me/clients", headers=t_h, json={"name": "Cliente QA", "phone": "3001234567"}).json()
        made["client"] = cl["id"]
        wv = c.post("/workshops/me/vehicles", headers=t_h, json={"client_id": cl["id"], "license_plate": PLATE, "brand": "Test", "model": "QA", "mileage": 5000}).json()
        made["wv"] = wv["id"]
        # fase 4: con el flag el link por placa exige que el dueno ya haya aceptado (aqui ya acepto en A -> debe pasar)
        lk = c.post(f"/workshops/me/vehicles/{wv['id']}/link", headers=t_h)
        check("fase 4: ligar por placa funciona cuando el dueno ya acepto", lk.status_code == 200, f"{lk.status_code} {lk.text[:100]}")
        # revocar y comprobar que el taller ya no puede ligar
        c.delete(f"/workshop-links/{link_id}", headers=d_h)
        c.post(f"/workshops/me/vehicles/{wv['id']}/unlink", headers=t_h)
        lk2 = c.post(f"/workshops/me/vehicles/{wv['id']}/link", headers=t_h)
        check("fase 4: SIN consentimiento el taller no puede ligar por placa (403)", lk2.status_code == 403, f"{lk2.status_code} {lk2.text[:100]}")
        check("revocar: el taller deja de ver al conductor", not any(x["plate"] == PLATE for x in c.get("/workshops/me/links", headers=t_h).json()))

        order = c.post("/workshops/me/work-orders", headers=t_h, json={
            "workshop_vehicle_id": wv["id"], "client_id": cl["id"], "status": "Pendiente", "category": "Frenos",
            "symptoms": "Cambio de pastillas", "labor_items": [{"description": "Mano de obra", "hours": 1, "rate_per_hour": 50000}],
        })
        check("el taller crea una orden para el cliente sin cuenta vinculada", order.status_code in (200, 201), f"{order.status_code} {order.text[:100]}")
        oid = order.json()["id"]
        made["order"] = oid
        c.put(f"/workshops/me/work-orders/{oid}", headers=t_h, json={"status": "Entregado", "is_paid": True})

        # Escenarios A/C solo tienen la placa (casi publica): con el vehiculo SIN verificar no deben traer historial del taller.
        relink = c.post("/workshop-links", headers=d_h, json={"workshop_code": code, "vehicle_id": vid, "share_contact": False})
        check("A: re-vincular tras revocar funciona", relink.status_code == 201, f"{relink.status_code} {relink.text[:100]}")
        h_a = c.get(f"/maintenance/vehicle/{vid}", headers=d_h).json()
        h_a = h_a if isinstance(h_a, list) else h_a.get("items", [])
        check("seguridad: vincular por QR con vehiculo sin verificar NO trae el historial del taller", not any(h.get("source_work_order_id") for h in h_a),
              str([(h.get("service_type"), h.get("origin")) for h in h_a][:5]))

        tok = c.post(f"/workshops/me/vehicles/{wv['id']}/claim-token", headers=t_h)
        check("B: el taller genera el enlace de reclamo", tok.status_code == 200 and len(tok.json()["token"]) >= 40, f"{tok.status_code}")
        raw = tok.json()["token"]
        info = c.get(f"/workshop-links/claim/{raw}")
        check("B: el enlace muestra el taller y la placa ENMASCARADA", info.status_code == 200 and "*" in info.json()["plate_hint"] and PLATE not in info.text, info.text[:120])
        bad = c.get(f"/workshop-links/claim/{'z' * 43}")
        check("B: enlace inexistente -> 404 uniforme", bad.status_code == 404)

        cl_res = c.post("/workshop-links/claim", headers=d_h, json={"token": raw, "vehicle_id": vid, "share_contact": False})
        check("B: el conductor reclama con el enlace", cl_res.status_code == 200, f"{cl_res.status_code} {cl_res.text[:160]}")
        check("B: se sincroniza la orden entregada y pagada (retroactivo)", cl_res.status_code == 200 and cl_res.json()["synced_orders"] >= 1)
        again = c.post("/workshop-links/claim", headers=d_h, json={"token": raw, "vehicle_id": vid, "share_contact": False})
        check("B: el enlace es de un solo uso (segundo intento -> 404)", again.status_code == 404, str(again.status_code))

        hist = c.get(f"/maintenance/vehicle/{vid}", headers=d_h).json()
        hist = hist if isinstance(hist, list) else hist.get("items", [])
        rec = next((h for h in hist if h.get("source_work_order_id")), None)
        check("B: el historial del conductor trae el servicio con origen 'workshop'", rec is not None and rec.get("origin") == "workshop",
              f"{len(hist)} registros: {[(h.get('service_type'), h.get('origin'), bool(h.get('source_work_order_id'))) for h in hist][:5]}")
        check("B retroactivo: kilometraje 0 y fecha de hoy (la de la orden)", rec is not None and rec.get("mileage") == 0 and rec.get("date") == __import__("datetime").date.today().isoformat(), str(rec and (rec.get("mileage"), rec.get("date"))))
        # Regresion: el servicio traido tiene km 0 (desconocido) y fecha de hoy; no debe bloquear un servicio previo valido.
        from datetime import date, timedelta
        prev = c.post("/maintenance", headers=d_h, json={
            "vehicle_id": vid, "service_type": "Aceite", "lubricant_brand": "Shell", "lubricant_type": "5W-40", "lubricant_use": "motor",
            "mileage": 5500, "next_service_mileage": 10500, "workshop": "Taller Inventado", "date": (date.today() - timedelta(days=5)).isoformat()})
        check("B retroactivo: el km 0 traido NO bloquea un servicio anterior con km real", prev.status_code in (200, 201), f"{prev.status_code} {prev.text[:120]}")
        hist = c.get(f"/maintenance/vehicle/{vid}", headers=d_h).json()
        hist = hist if isinstance(hist, list) else hist.get("items", [])
        n_before = len(hist)
        c.post(f"/workshops/me/vehicles/{wv['id']}/link", headers=t_h)  # ya ligado: idempotente
        c.put(f"/workshops/me/work-orders/{oid}", headers=t_h, json={"status": "Entregado", "is_paid": True})
        hist2 = c.get(f"/maintenance/vehicle/{vid}", headers=d_h).json()
        hist2 = hist2 if isinstance(hist2, list) else hist2.get("items", [])
        check("B: re-guardar la orden NO duplica el historial", len(hist2) == n_before)

        # --- nucleo: el conductor no puede atribuirse un taller ---
        sv = c.post("/maintenance", headers=d_h, json={
            # plan gratuito (sin llavero activo): solo "Aceite"; exige marca y viscosidad
            "vehicle_id": vid, "service_type": "Aceite", "lubricant_brand": "Shell", "lubricant_type": "5W-40", "lubricant_use": "motor",
            "mileage": 6000, "next_service_mileage": 11000, "workshop": "Taller Inventado", "workshop_id": ws.json()["id"]})
        if sv.status_code in (200, 201):
            check("nucleo: workshop_id mandado por el conductor se ignora", sv.json().get("workshop_id") in (None, ""), str(sv.json().get("workshop_id")))
        else:
            check("nucleo: servicio de prueba del conductor", False, f"{sv.status_code} {sv.text[:120]}")

        # --- escenario C: servicio con el taller escrito a mano + el taller existe en CarLink ---
        typed = "E2E Vinculos"  # normaliza igual que "Taller E2E Vinculos"
        c.post("/maintenance", headers=d_h, json={"vehicle_id": vid, "service_type": "Aceite", "lubricant_brand": "Shell", "lubricant_type": "5W-40",
                                                   "lubricant_use": "motor", "mileage": 6500, "next_service_mileage": 11500, "workshop": typed})
        cands = c.get("/workshop-links/candidates", headers=d_h).json()
        cand = next((x for x in cands if x["workshop_code"] == code), None)
        check("C: el conductor recibe el taller como candidato (nombre normalizado)", cand is not None, str(cands)[:160])
        if cand:
            conf = c.post("/workshop-links/candidates/confirm", headers=d_h, json={"workshop_id": cand["workshop_id"], "vehicle_id": vid, "share_contact": None})
            check("C: confirmar marca los servicios como declarados, sin crear vinculo", conf.status_code == 200 and conf.json()["records_claimed"] >= 1 and conf.json()["linked"] is False, conf.text[:120])
            after = c.get(f"/maintenance/vehicle/{vid}", headers=d_h).json()
            decl = [h for h in after if h.get("workshop") == typed]
            check("C: el servicio declarado NO recibe workshop_id ni origen 'workshop'", bool(decl) and all(not h.get("workshop_id") and h.get("origin") == "user" for h in decl))
            check("C: ya no se vuelve a sugerir", not any(x["workshop_code"] == code for x in c.get("/workshop-links/candidates", headers=d_h).json()))

        # --- fase 5: QR por orden ---
        oq = c.post(f"/workshops/me/orders/{oid}/claim-token", headers=t_h)
        check("fase 5: el taller genera el QR de una orden", oq.status_code == 200 and len(oq.json()["token"]) >= 40, str(oq.status_code))
        oq_info = c.get(f"/workshop-links/claim/{oq.json()['token']}") if oq.status_code == 200 else None
        check("fase 5: el enlace de la orden abre y muestra el taller", oq_info is not None and oq_info.status_code == 200)
    finally:
        # limpieza: el borrado del vehiculo del conductor arrastra vinculos, historial y odometro; el resto es del taller de pruebas
        for path, h in ((f"/workshops/me/work-orders/{made.get('order')}", t_h), (f"/workshops/me/vehicles/{made.get('wv')}", t_h),
                        (f"/workshops/me/clients/{made.get('client')}", t_h), (f"/vehicles/{made.get('vehicle')}", d_h)):
            if "None" not in path:
                try: c.delete(path, headers=h)
                except Exception as e: print("  (limpieza)", path, e)
    bad = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(bad)}/{len(results)} verificaciones OK")
    return 1 if bad else 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--api", default="http://localhost:8001")
    sys.exit(main(ap.parse_args().api))
