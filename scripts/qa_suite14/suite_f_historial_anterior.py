from common import *
VID = None
def nxt(pg): return pg.get_by_role("button", name="Siguiente", exact=True).last
def goto_tab(pg, name): pg.locator("button", has_text=name).first.click(); pg.wait_for_timeout(1500)

def run():
    global VID; VID = VID or current_vehicle_id()
    # Las lecturas se habían envejecido a mano en la prueba del aviso periódico: se devuelven a fechas realistas
    # (el inicial al alta; el resto, después), porque en uso real el servidor las fecha al recibirlas.
    sql("UPDATE odometer_readings SET recorded_at = now() WHERE vehicle_id = $1 AND source <> 'initial'", uuid.UUID(VID))
    sql("UPDATE odometer_readings SET recorded_at = now() - interval '1 hour' WHERE vehicle_id = $1 AND source = 'initial'", uuid.UUID(VID))
    sess = session(); tok = sess["access_token"]
    with sync_playwright() as p:
        b, ctx, pg = app_page(p, sess)
        # ---- Historial anterior
        goto_tab(pg, "Historial")
        pg.get_by_role("button", name="Cargar historial anterior").click(); pg.wait_for_timeout(600)
        save = pg.get_by_role("button", name="Guardar historial")
        gated = save.is_disabled()
        pg.get_by_role("button", name="Aceite", exact=True).click()
        pg.locator("button.date-field").first.click(); pg.wait_for_timeout(300)
        dlg = pg.get_by_role("dialog", name="Calendario")
        today_d = dt.date.today(); yday = today_d - dt.timedelta(days=1)
        today_disabled = dlg.get_by_role("button", name=str(today_d.day), exact=True).first.is_disabled()
        dlg.get_by_role("button", name=str(yday.day), exact=True).first.click(); pg.wait_for_timeout(300)
        pg.get_by_placeholder("Ej. 30000").fill("30000")
        still_disabled = save.is_disabled()   # falta el soporte
        pg.locator("input[type=file]").set_input_files(str(Path(__file__).resolve().parent / "soporte.png")); pg.wait_for_timeout(300)
        enabled = not save.is_disabled()
        record("F6", "Historial anterior: no se puede guardar sin soporte; hoy (día del alta) está deshabilitado en el calendario", gated and still_disabled and enabled and today_disabled, f"vacío={gated} sin soporte={still_disabled} con soporte habilitado={enabled} hoy deshabilitado={today_disabled}")
        n_read_before = len(sql("select 1 from odometer_readings where vehicle_id = $1", uuid.UUID(VID), fetch=True))
        n_parts_before = len(api("GET", f"/parts/vehicle/{VID}", tok).json())
        save.click(); pg.wait_for_timeout(3000)
        prior = [r for r in api("GET", f"/maintenance/vehicle/{VID}", tok).json() if r["origin"] == "prior"]
        n_read_after = len(sql("select 1 from odometer_readings where vehicle_id = $1", uuid.UUID(VID), fetch=True))
        n_parts_after = len(api("GET", f"/parts/vehicle/{VID}", tok).json())
        record("F7", "Historial anterior guardado como 'prior' con soporte, sin lectura de odómetro ni piezas ni próximo servicio",
               len(prior) == 1 and prior[0]["support_url"].startswith("/api/upload/files/") and prior[0]["next_service_mileage"] is None and n_read_before == n_read_after and n_parts_before == n_parts_after,
               f"origin={prior[0]['origin'] if prior else None} lecturas {n_read_before}->{n_read_after} piezas {n_parts_before}->{n_parts_after}")
        goto_tab(pg, "Historial"); pg.wait_for_timeout(800)
        txt = pg.inner_text("body")
        record("F8", "El historial muestra 'Anterior declarado' y 'Ver soporte'", "Anterior declarado" in txt and "Ver soporte" in txt)
        b.close()
    # API: reglas del anterior
    prior = [r for r in api("GET", f"/maintenance/vehicle/{VID}", tok).json() if r["origin"] == "prior"]
    joined = api("GET", f"/vehicles/{VID}", tok).json()["created_at"][:10]
    base = {"vehicle_id": VID, "service_type": "Aceite", "mileage": 30000, "support_url": prior[0]["support_url"] if prior else "/api/upload/files/x/y.png"}
    r = api("POST", "/maintenance/prior", tok, json={**base, "date": joined, "mileage": 100})
    record("F9a", "API: historial anterior con la fecha del alta (o posterior) -> 422 'debe ser de antes de registrar'", r.status_code == 422 and "antes de registrar" in r.text, f"alta={joined} {r.text[:90]}")
    yd = (dt.date.today() - dt.timedelta(days=1)).isoformat()
    r = api("POST", "/maintenance/prior", tok, json={**base, "date": yd, "mileage": 99000})
    record("F9b", "API: kilometraje del anterior mayor al inicial -> 422", r.status_code == 422, r.text[:100])
    r = api("POST", "/maintenance/prior", tok, json={**base, "date": yd, "support_url": "https://evil.example/x.jpg"})
    record("F9c", "API: soporte ajeno/inventado -> 422", r.status_code == 422 and "soporte" in r.text.lower(), r.text[:100])
    pid = prior[0]["id"] if prior else None
    r = api("PUT", f"/maintenance/{pid}", tok, json={"vehicle_id": VID, "service_type": "Aceite", "mileage": 30000})
    record("F9d", "API: el historial anterior no se edita (403)", r.status_code == 403, r.text[:100])

if __name__ == "__main__":
    run()
