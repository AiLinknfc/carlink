from common import *
VID = None
def nxt(pg): return pg.get_by_role("button", name="Siguiente", exact=True).last
def goto_tab(pg, name): pg.locator("button", has_text=name).first.click(); pg.wait_for_timeout(1500)

def run():
    global VID; VID = VID or current_vehicle_id()
    sess = session(); tok = sess["access_token"]
    with sync_playwright() as p:
        b, ctx, pg = app_page(p, sess)
        # ---- Batería desde Inicio (id sin tilde) → wizard de 4 pasos
        pg.get_by_text("Bateria y sistema electrico", exact=True).first.click(); pg.wait_for_timeout(900)
        t = pg.inner_text("body")
        opts = " | ".join(x.inner_text().replace("\n", " ") for x in pg.get_by_role("radio").all())
        record("F1", "Inicio > Batería abre el wizard de 4 pasos con los tipos de carro (MF, convencional, AGM/EFB, híbrido/eléctrico)",
               "PASO 1 DE 4" in t.upper() and all(x in opts for x in ["Sin mantenimiento (MF)", "Convencional", "AGM / EFB", "Híbrido / eléctrico"]), opts[:160])
        nxt(pg).click(); pg.wait_for_timeout(400)
        record("F2", "Batería: no avanza sin elegir el tipo", "Elige el tipo de batería" in pg.inner_text("body"))
        pg.get_by_role("radio").nth(2).click(); nxt(pg).click(); pg.wait_for_timeout(500)
        t = pg.inner_text("body")
        v = pg.get_by_placeholder("Ej. 12.6")
        v.fill("12.7"); ok1 = "Carga completa" in pg.inner_text("body")
        v.fill("11.5"); ok2 = "Descargada" in pg.inner_text("body")
        v.fill("99"); nxt(pg).click(); pg.wait_for_timeout(400)
        blocked = "El voltaje no es válido" in pg.inner_text("body") and "PASO 2 DE 4" in pg.inner_text("body").upper()
        record("F3", "Medición: 12,7 V = carga completa, 11,5 V = descargada, 99 V bloquea el paso", "Cambié la batería" in t and "Solo la revisé" in t and ok1 and ok2 and blocked, f"{ok1} {ok2} {blocked}")
        v.fill("12.7"); nxt(pg).click(); pg.wait_for_timeout(500)
        pg.get_by_placeholder("Ej. 50000").fill("56000"); nxt(pg).click(); pg.wait_for_timeout(700)
        nsk = pg.get_by_placeholder("Se calcula automaticamente").input_value()
        pg.get_by_role("button", name="Registrar servicio").click(); pg.wait_for_timeout(2500)
        parts = api("GET", f"/parts/vehicle/{VID}", tok).json(); bat = [x for x in parts if x["name"] == "Batería"]
        recs = [r for r in api("GET", f"/maintenance/vehicle/{VID}", tok).json() if r["service_type"] == "Batería"]
        record("F4", "Batería AGM/EFB cambiada: próximo servicio a 48 meses (72.000 km) y la pieza guarda tipo y meses",
               nsk == "128000" and len(bat) == 1 and "Vida útil: 48 meses" in bat[0]["notes"] and "AGM / EFB" in bat[0]["notes"] and len(recs) == 1 and recs[0]["service_type"] == "Batería",
               f"próximo={nsk} notas={bat[0]['notes'] if bat else None} desc={recs[0]['description'] if recs else None}")
        # Solo revisión: no renueva la pieza
        inst_before = bat[0]["mileage_installed"]
        pg.get_by_text("Bateria y sistema electrico", exact=True).first.click(); pg.wait_for_timeout(900)
        pg.get_by_role("radio").nth(0).click(); nxt(pg).click(); pg.wait_for_timeout(400)
        pg.get_by_text("Solo la revisé").click(); pg.get_by_placeholder("Ej. 12.6").fill("12.5"); nxt(pg).click(); pg.wait_for_timeout(400)
        pg.get_by_placeholder("Ej. 50000").fill("56500"); nxt(pg).click(); pg.wait_for_timeout(700)
        nsk2 = pg.get_by_placeholder("Se calcula automaticamente").input_value()
        pg.get_by_role("button", name="Registrar servicio").click(); pg.wait_for_timeout(2500)
        bat2 = [x for x in api("GET", f"/parts/vehicle/{VID}", tok).json() if x["name"] == "Batería"]
        record("F5", "Batería 'solo revisada': no renueva la pieza y el próximo servicio queda a ~6 meses (9.000 km)",
               bat2[0]["mileage_installed"] == inst_before and nsk2 == "65500", f"instalada antes={inst_before} después={bat2[0]['mileage_installed']} próximo={nsk2}")
        b.close()

if __name__ == "__main__":
    run()
