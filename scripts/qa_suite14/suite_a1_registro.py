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
        # A2 — combustible: desplegable de una fila, sin "sin definir", amarillo y redondeado
        combo = pg.get_by_role("button", name="Combustible", exact=False).first if False else pg.get_by_text("Selecciona el combustible")
        combo.click(); pg.wait_for_timeout(300)
        opts = pg.get_by_role("option") if pg.get_by_role("option").count() else pg.locator("[role=listbox] > *")
        labels = [o.inner_text().strip() for o in (opts.all() if hasattr(opts, "all") else [])]
        panel_radius = None
        try:
            panel = pg.locator("[role=listbox]").first
            panel_radius = style(pg, panel, ["borderRadius", "borderTopColor"])
        except Exception as e:
            panel_radius = str(e)[:60]
        pg.get_by_text("Gasolina", exact=True).first.click(); pg.wait_for_timeout(300)
        stages.append(save.is_disabled())
        pg.get_by_placeholder("Ej. 52000").fill("50000")
        stages.append(save.is_disabled())
        warn = pg.get_by_text("Ten cuidado con este dato").count() > 0
        record("A1", "Guardar vehículo gris hasta placa, ciudad, combustible y kilometraje; aviso visible",
               stages == [True, True, True, True, False] and warn, f"estados={stages} aviso={warn}")
        no_undefined = not any("sin definir" in l.lower() for l in labels)
        record("A2", "Combustible = desplegable de una fila, sin 'sin definir'", len(labels) == 5 and no_undefined,
               f"opciones={labels} panel={panel_radius}")
        record("A3", "Escanear frente y reverso prellena combustible/propietario/licencia", None, "requiere foto de tarjeta real (OCR); verificado aparte con texto sintético")
        # crear
        save.click(); pg.wait_for_timeout(2500)
        veh = api("GET", "/vehicles", sess["access_token"]).json()
        ok = len(veh) == 1 and veh[0]["fuel_type"] == "gasolina"
        odo = api("GET", f"/odometer/vehicle/{veh[0]['id']}", sess["access_token"]).json() if veh else {}
        record("A4a", "Vehículo creado con combustible y kilometraje inicial", ok and odo.get("current_mileage") == 50000 and odo.get("state") == "ok",
               f"fuel={veh[0]['fuel_type'] if veh else None} odo={odo}")
        record("A4b", "Wizard no envía solo a revisión (queda sin verificar)", bool(veh) and veh[0]["verification_status"] == "unverified", f"status={veh[0]['verification_status'] if veh else None}")
        pg.screenshot(path=str(OUT_DIR / "A_after_save.png"))
        b.close()
    return veh[0]["id"] if veh else None

if __name__ == "__main__":
    vid = run(); print("VEHICLE", vid)
