from common import *
import datetime as dt

def oil_to_general(pg):
    """Aceite → Motor → Mobil / Mobil 1 ESP 5W-30 → llega al paso de datos generales."""
    pg.get_by_text("Cambio de aceite", exact=True).first.click(); pg.wait_for_timeout(800)
    pg.get_by_role("button", name="Siguiente", exact=True).last.click(); pg.wait_for_timeout(500)       # Motor por defecto
    pg.get_by_role("button", name="Mobil", exact=True).first.click(); pg.wait_for_timeout(300)
    pg.get_by_text("Mobil 1 ESP 5W-30", exact=True).first.click(); pg.wait_for_timeout(300)
    pg.get_by_role("button", name="Siguiente", exact=True).last.click(); pg.wait_for_timeout(500)

def run(vid=None):
    vid = vid or current_vehicle_id()
    sess = session(); tok = sess["access_token"]
    with sync_playwright() as p:
        b, ctx, pg = app_page(p, sess)
        # sin aviso de kilometraje (ya hay lectura inicial)
        record("A5", "En Inicio no aparece el aviso de kilometraje con lectura inicial", "Registra el kilometraje" not in pg.inner_text("body") and "Actualiza el kilometraje" not in pg.inner_text("body"))
        # 49000 → error legible (menor al último)
        oil_to_general(pg)
        txt = pg.inner_text("body")
        record("A6a", "Aceite: pasos Lubricante → Producto → Datos generales (4 en total)", "PASO 3 DE 4" in txt.upper() or "Paso 3 de 4" in txt, "")
        pg.get_by_placeholder("Ej. 50000").fill("49000")
        pg.get_by_role("button", name="Siguiente", exact=True).last.click(); pg.wait_for_timeout(500)
        t = pg.inner_text("body")
        record("A6", "Kilometraje 49000: error legible (no JSON crudo)", "no puede ser menor al último registrado" in t and "{" not in t.split("menor")[0][-30:], re.findall(r"El kilometraje[^.]*\.", t)[:1].__str__())
        pg.get_by_placeholder("Ej. 50000").fill("200000")
        pg.get_by_role("button", name="Siguiente", exact=True).last.click(); pg.wait_for_timeout(500)
        t = pg.inner_text("body")
        record("A8", "Kilometraje 200000: error 'muy alto comparado con el último'", "muy alto comparado" in t)
        # 51000 pasa y predice próximo servicio
        pg.get_by_placeholder("Ej. 50000").fill("51000")
        pg.get_by_role("button", name="Siguiente", exact=True).last.click(); pg.wait_for_timeout(700)
        nxt = pg.get_by_placeholder("Se calcula automaticamente").input_value()
        record("A7", "Kilometraje 51000 pasa; Próximo servicio ya viene predicho (5W-30)", nxt == "59000", f"próximo servicio={nxt}")
        pg.get_by_role("button", name="Registrar servicio").click(); pg.wait_for_timeout(2500)
        recs = api("GET", f"/maintenance/vehicle/{vid}", tok).json()
        record("A7b", "El servicio queda guardado (Aceite, motor, Mobil 5W-30)", len(recs) == 1 and recs[0]["service_type"] == "Aceite" and recs[0]["lubricant_use"] == "motor" and recs[0]["lubricant_type"] == "5W-30",
               str([(r["service_type"], r["lubricant_use"], r["lubricant_type"], r["mileage"], r["next_service_mileage"]) for r in recs]))
        b.close()
    # Reglas por API (servidor)
    base = {"vehicle_id": vid, "service_type": "Aceite", "lubricant_brand": "Mobil", "lubricant_type": "5W-30"}
    old = (dt.date.today() - dt.timedelta(days=45)).isoformat()
    r = api("POST", "/maintenance", tok, json={**base, "mileage": 52000, "date": old})
    record("A9a", "API: fecha de hace 45 días → 422", r.status_code == 422 and "30 días" in r.text, r.text[:90])
    fut = (dt.date.today() + dt.timedelta(days=5)).isoformat()
    r = api("POST", "/maintenance", tok, json={**base, "mileage": 52000, "date": fut})
    record("A9b", "API: fecha futura → 422", r.status_code == 422 and "futura" in r.text, r.text[:90])
    r = api("POST", "/maintenance", tok, json={**base, "mileage": 45000})
    record("A9c", "API: kilometraje menor al anterior → 422", r.status_code == 422 and "menor" in r.text, r.text[:90])
    r = api("POST", "/maintenance", tok, json={"vehicle_id": vid, "service_type": "Aceite", "mileage": 52000})
    record("A9d", "API: aceite sin marca ni viscosidad → 422", r.status_code == 422 and "aceite utilizado" in r.text, r.text[:90])
    r = api("POST", "/maintenance", tok, json={**base, "mileage": 2000, "next_service_mileage": 2000})
    record("A9e", "API: próximo servicio igual al kilometraje → 422", r.status_code == 422, r.text[:90])

