from common import *
VID = None

def radios(pg): return [r.inner_text().replace("\n", " ") for r in pg.get_by_role("radio").all()]
def nxt(pg): return pg.get_by_role("button", name="Siguiente", exact=True).last

def run():
    global VID; VID = VID or current_vehicle_id()
    sess = session(); tok = sess["access_token"]
    # El wizard ya no pide combustible (2026-10-15): el caso B1 es "carro gasolina", asi que se fija aqui como lo haria el panel lateral.
    api("PUT", f"/vehicles/{VID}", tok, json={"fuel_type": "gasolina"})
    # Activar el llavero de prueba (necesario para ficha pública y registrar servicios que no sean aceite)
    r = api("POST", "/nfc/activate", tok, json={"activation_code": "6WDDSBEEE7", "vehicle_id": VID})
    record("E0", "Activar el llavero de prueba con el código 6WDDSBEEE7", r.status_code == 201, f"HTTP {r.status_code} {r.text[:80]}")
    with sync_playwright() as p:
        b, ctx, pg = app_page(p, sess)
        # --- Filtros (carro)
        pg.get_by_text("Aceite, aire, combustible y mas", exact=True).first.click(); pg.wait_for_timeout(900)
        opts = radios(pg); joined = " | ".join(opts)
        carro_ok = all(x in joined for x in ["Aceite", "Aire del motor", "Habitáculo / A/C", "Combustible", "Transmisión"]) and "Partículas" not in joined
        record("B1", "Filtros (carro gasolina): aceite, aire del motor, habitáculo/A/C, combustible y transmisión; sin partículas", carro_ok and "PASO 1 DE 3" in pg.inner_text("body").upper(), joined[:200])
        rd = pg.get_by_role("radio")
        rd.nth(0).click(); rd.nth(1).click()
        checked = [x.get_attribute("aria-checked") for x in rd.all()]
        record("B2", "Cards de filtro exclusivas (elegir una desmarca la otra)", checked.count("true") == 1 and checked[1] == "true", str(checked))
        flujo_air = pg.get_by_text("Flujo de aire verificado").count() == 1
        rd.nth(2).click(); flujo_cabin = pg.get_by_text("Flujo de aire verificado").count() == 0
        record("B3", "'Flujo de aire verificado' solo con el filtro de aire", flujo_air and flujo_cabin, f"con aire={flujo_air} con habitáculo={flujo_cabin}")
        brand_ref = pg.get_by_placeholder("Ej. C 25 114").count() == 1 and pg.get_by_placeholder("Ej. Mann-Filter").count() == 1
        record("B4", "Al elegir un filtro aparecen Marca y Referencia (mismo paso, 3 pasos)", brand_ref and "PASO 1 DE 3" in pg.inner_text("body").upper())
        # registrar habitáculo con marca/ref
        pg.get_by_placeholder("Ej. Mann-Filter").fill("Bosch"); pg.get_by_placeholder("Ej. C 25 114").fill("0 986 AF4 121")
        nxt(pg).click(); pg.wait_for_timeout(500)
        pg.get_by_placeholder("Ej. 50000").fill("54500"); nxt(pg).click(); pg.wait_for_timeout(700)
        nsk = pg.get_by_placeholder("Se calcula automaticamente").input_value()
        pg.get_by_role("button", name="Registrar servicio").click(); pg.wait_for_timeout(2500)
        parts = api("GET", f"/parts/vehicle/{VID}", tok).json()
        hab = [x for x in parts if x["name"] == "Filtro de habitáculo"]
        record("B5", "Filtro de habitáculo: próximo servicio a 15.000 km y la pieza guarda marca y referencia",
               nsk == "69500" and len(hab) == 1 and hab[0]["brand"] == "Bosch" and hab[0]["part_number"] == "0 986 AF4 121" and hab[0]["lifespan_mileage"] == 15000,
               f"próximo={nsk} pieza={[(x['name'], x['brand'], x['part_number'], x['lifespan_mileage']) for x in hab]}")
        b.close()

if __name__ == "__main__":
    run()
