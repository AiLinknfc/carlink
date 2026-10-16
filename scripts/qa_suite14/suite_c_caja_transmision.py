from common import *
VID = None
def nxt(pg): return pg.get_by_role("button", name="Siguiente", exact=True).last
def goto_tab(pg, name): pg.locator("button", has_text=name).first.click(); pg.wait_for_timeout(1500)

def public_ficha(tok):
    url = None
    toks = api("GET", f"/nfc/tokens?vehicle_id={VID}", tok).json()
    t = next(x for x in toks if x["is_active"])
    u = api("GET", f"/nfc/tokens/{t['id']}/url", tok).json()["url"]
    raw = u.rstrip("/").split("/")[-1]
    return httpx.get(f"{API}/nfc/{raw}", timeout=30).json()

def run():
    global VID; VID = VID or current_vehicle_id()
    sess = session(); tok = sess["access_token"]
    before = public_ficha(tok)
    with sync_playwright() as p:
        b, ctx, pg = app_page(p, sess)
        ficha_before = (goto_tab(pg, "Ficha tecnica"), pg.inner_text("body"))[1]
        # --- Aceite de CAJA
        pg.locator("button", has_text="Inicio").first.click(); pg.wait_for_timeout(800)
        pg.get_by_text("Cambio de aceite", exact=True).first.click(); pg.wait_for_timeout(800)
        pg.get_by_role("radio").nth(1).click(); nxt(pg).click(); pg.wait_for_timeout(500)
        t = pg.inner_text("body")
        caja_ui = "75W-90" in t and "API GL-5" in t and "Buscar marca de aceite" not in t
        pg.get_by_placeholder("Ej. Motul").fill("Motul"); pg.get_by_role("radio", name="75W-90").click(); pg.get_by_role("radio", name="API GL-5").click()
        nxt(pg).click(); pg.wait_for_timeout(500)
        pg.get_by_placeholder("Ej. 50000").fill("55000"); nxt(pg).click(); pg.wait_for_timeout(700)
        nsk = pg.get_by_placeholder("Se calcula automaticamente").input_value()
        pg.get_by_role("button", name="Registrar servicio").click(); pg.wait_for_timeout(2500)
        recs = api("GET", f"/maintenance/vehicle/{VID}", tok).json()
        caja = [r for r in recs if r["lubricant_use"] == "caja"]
        record("C1", "Aceite de caja: pide marca, viscosidad (75W-90) y norma; próximo servicio a 50.000 km", caja_ui and len(caja) == 1 and nsk == "105000" and caja[0]["lubricant_brand"] == "Motul",
               f"ui={caja_ui} próximo={nsk} registro={[(r['lubricant_use'], r['lubricant_type'], r['lubricant_product'], r['next_service_mileage']) for r in caja]}")
        # --- Aceite de TRANSMISIÓN
        pg.get_by_text("Cambio de aceite", exact=True).first.click(); pg.wait_for_timeout(800)
        pg.get_by_role("radio").nth(2).click(); nxt(pg).click(); pg.wait_for_timeout(500)
        t = pg.inner_text("body"); trans_ui = all(x in t for x in ["ATF Dexron VI", "CVT", "DCT / DSG"])
        pg.get_by_placeholder("Ej. Motul").fill("Castrol"); pg.get_by_role("radio", name="ATF Dexron VI").click()
        nxt(pg).click(); pg.wait_for_timeout(500)
        pg.get_by_placeholder("Ej. 50000").fill("55500"); nxt(pg).click(); pg.wait_for_timeout(700)
        pg.get_by_role("button", name="Registrar servicio").click(); pg.wait_for_timeout(2500)
        recs = api("GET", f"/maintenance/vehicle/{VID}", tok).json()
        tr = [r for r in recs if r["lubricant_use"] == "transmision"]
        record("C2", "Aceite de transmisión: pide marca y tipo de fluido (ATF, CVT, DCT)", trans_ui and len(tr) == 1 and tr[0]["next_service_mileage"] == 55500 + 60000, f"ui={trans_ui} registro={[(r['lubricant_type'], r['next_service_mileage']) for r in tr]}")
        parts = api("GET", f"/parts/vehicle/{VID}", tok).json()
        names = {x["name"] for x in parts}
        record("C3", "Caja y transmisión crean sus propias piezas (Aceite de caja / de transmisión), categoría Transmisión",
               {"Aceite de caja", "Aceite de transmisión"} <= names and all(x["category"] == "Transmisión" for x in parts if x["name"] in ("Aceite de caja", "Aceite de transmisión")), str(sorted(names)))
        goto_tab(pg, "Control de partes"); pg.get_by_role("tab", name="Servicios").click(); pg.wait_for_timeout(500)
        ts = pg.inner_text("body")
        record("C4", "Control de partes > Servicios lista motor, caja y transmisión", all(x in ts for x in ["Aceite de motor", "Aceite de caja", "Aceite de transmisión"]))
        goto_tab(pg, "Ficha tecnica"); pg.wait_for_timeout(500)
        t = pg.inner_text("body"); m = re.search(r"PR[ÓO]XIMO CAMBIO DE ACEITE[\s\S]{0,140}", t, re.I)
        seg = re.sub(r"\s+", " ", m.group(0)) if m else ""
        record("C5", "Caja y transmision NO cambian el proximo cambio de aceite de la Ficha (sigue siendo el del motor, 59.000 km)",
               "59,000 km" in seg and "105,000" not in seg and "115,500" not in seg, seg[:110])
        b.close()
    after = public_ficha(tok)
    record("E1", "Ficha pública responde con el próximo servicio y lubricante del MOTOR (no de caja/transmisión)",
           after.get("next_service_mileage") == 59000 and after.get("lubricant_brand") == "Mobil" and after.get("lubricant_type") == "5W-30" and after.get("plate") == "QAT-123",
           f"next={after.get('next_service_mileage')} marca={after.get('lubricant_brand')} tipo={after.get('lubricant_type')} km actual={after.get('current_mileage')}")

if __name__ == "__main__":
    run()
