from common import *

def style(pg, loc, props):
    return loc.evaluate("(el, props) => { const c = getComputedStyle(el); return props.map(p => c[p]) }", props)

def run():
    sess = session(); uid = sess["user"]["id"]
    with sync_playwright() as p:
        b, ctx, pg = new_page(p, sess)
        pg.goto(f"{BASE}/app", wait_until="networkidle", timeout=60000); pg.wait_for_timeout(2000)
        pg.get_by_text("Comenzar").click(); pg.wait_for_timeout(1000)
        save = pg.get_by_role("button", name="Guardar vehiculo")
        # A1 — botón gris hasta tener placa, ciudad, combustible y kilometraje
        stages = [save.is_disabled()]
        pg.get_by_role("button", name="Particular", exact=True).click(); pg.wait_for_timeout(300)  # el tipo de placa también es obligatorio
        pg.locator("input.wizard-plate-input").nth(0).fill("QAT"); pg.locator("input.wizard-plate-input").nth(1).fill("123")
        stages.append(save.is_disabled())
        city = pg.get_by_placeholder("Elige o escribe"); city.click(); city.type("Bog", delay=60); pg.wait_for_timeout(500)
        pg.get_by_text("Bogotá", exact=True).first.click(); pg.wait_for_timeout(300)
        stages.append(save.is_disabled())
        # El combustible ya no se pide en el wizard (2026-10-15): se completa luego en el panel lateral > Corregir datos.
        fuel_asked = pg.get_by_text("Selecciona el combustible").count() > 0
        stages.append(save.is_disabled())   # sin kilometraje sigue gris, aunque ya no haya combustible
        km = pg.get_by_placeholder("Ej. 52000"); km.focus(); pg.wait_for_timeout(300)
        note_active = pg.get_by_role("note").get_attribute("data-active") == "true"
        km.fill("50000")
        stages.append(save.is_disabled())
        warn = pg.get_by_text("Ten cuidado con este dato").count() > 0
        record("A1", "Guardar vehículo gris hasta placa, ciudad y kilometraje; aviso visible",
               stages == [True, True, True, True, False] and warn, f"estados={stages} aviso={warn}")
        record("A2", "El wizard no pide combustible y el aviso del kilometraje se resalta al enfocarlo", not fuel_asked and note_active,
               f"combustible_pedido={fuel_asked} aviso_resaltado={note_active}")
        record("A3", "Escanear frente y reverso prellena combustible/propietario/licencia", None, "requiere foto de tarjeta real (OCR); verificado aparte con texto sintético")
        # crear
        save.click(); pg.wait_for_timeout(2500)
        veh = api("GET", "/vehicles", sess["access_token"]).json()
        ok = len(veh) == 1 and veh[0]["fuel_type"] in ("", None)
        odo = api("GET", f"/odometer/vehicle/{veh[0]['id']}", sess["access_token"]).json() if veh else {}
        record("A4a", "Vehículo creado sin combustible (se completa luego) y con kilometraje inicial", ok and odo.get("current_mileage") == 50000 and odo.get("state") == "ok",
               f"fuel={veh[0]['fuel_type'] if veh else None} odo={odo}")
        record("A4b", "Wizard no envía solo a revisión (queda sin verificar)", bool(veh) and veh[0]["verification_status"] == "unverified", f"status={veh[0]['verification_status'] if veh else None}")
        pg.screenshot(path=str(OUT_DIR / "A_after_save.png"))
        b.close()
    return veh[0]["id"] if veh else None

if __name__ == "__main__":
    vid = run(); print("VEHICLE", vid)
