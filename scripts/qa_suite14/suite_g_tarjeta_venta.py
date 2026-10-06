from common import *
VID = None
CARD = {"license_number": "10012345678", "owner_document": "79123456", "vin": "3MZBN1V70KM123456", "engine_number": "PE12345678",
        "chassis_number": "3MZBN1V70KM123456", "cilindraje": "2000", "service": "particular", "capacity": "5", "doors": "4", "registration_date": "2019-03-15"}

def open_profile(pg):
    # La card de Perfil dice "Sin verificar" o "Verificado" segun el estado del vehiculo.
    for label in ("Sin verificar", "Verificado"):
        if pg.get_by_text(label, exact=True).count():
            pg.get_by_text(label, exact=True).first.click(); pg.wait_for_timeout(1800); return
    raise RuntimeError("no se encontro la card de Perfil")

def run():
    global VID; VID = VID or current_vehicle_id()
    sess = session(); tok = sess["access_token"]
    # Esta parte se puede repetir: deja el vehiculo sin verificar, sin datos de tarjeta ni confirmacion.
    sql("update vehicles set verification_status='unverified', verified_at=null, card_data='{}'::jsonb, card_confirmed_at=null, "
        "card_confirmed_digest='', sell_enabled=false, brand='', model='', year=0, color='', owner_name='' where id = $1", uuid.UUID(VID))
    # 1) Incompleto: UI y API
    r = api("POST", f"/vehicles/{VID}/verification", tok, json={"verification_doc_url": "/api/upload/files/a.jpg", "verification_doc_url_back": "/api/upload/files/b.jpg"})
    errs = (r.json().get("detail") or {}).get("errors", {}) if r.status_code == 422 else {}
    with sync_playwright() as p:
        b, ctx, pg = app_page(p, sess); open_profile(pg)
        btn_disabled = pg.get_by_role("button", name="Enviar a revisión").is_disabled()
        no_native_fuel = not any("Gasolina" in s.evaluate("e => [...e.options].map(o => o.text).join()") for s in pg.locator("select").all())
        record("G1", "Perfil: Combustible NO es un select nativo (desplegable temático)", no_native_fuel and "Combustible" in pg.inner_text("body"))
        record("G2", "Enviar a revisión deshabilitado con la tarjeta incompleta; la API responde 422 con la lista de campos", btn_disabled and "license_number" in errs and len(errs) >= 10, f"botón deshabilitado={btn_disabled}; campos con error={len(errs)}")
        b.close()
    # 2) Completar los datos (como los dejaría el OCR + el usuario) y revisar cifrado
    r = api("PUT", f"/vehicles/{VID}", tok, json={"brand": "Mazda", "model": "3", "year": 2019, "color": "Gris", "body_type": "Auto",
                                                  "owner_name": "JUAN CARLOS PEREZ GOMEZ", "card_data": CARD})
    enc = sql("select card_data->>'owner_document' as d from vehicles where id = $1", uuid.UUID(VID), fetch=True)[0]["d"]
    got = api("GET", f"/vehicles/{VID}", tok).json()["card_data"]["owner_document"]
    record("G3", "Documento del propietario cifrado en la base ('enc1:') y enmascarado hacia el cliente", r.status_code == 200 and enc.startswith("enc1:") and "79123456" not in enc and got == "•••••456", f"base={enc[:12]}… cliente={got}")
    with sync_playwright() as p:
        b, ctx, pg = app_page(p, sess); open_profile(pg)
        t = pg.inner_text("body")
        complete = "Todos los datos de la tarjeta están completos" in t
        doc_masked = pg.get_by_placeholder("Cédula o NIT, solo números").input_value() == "•••••456"
        save_disabled = pg.get_by_role("button", name="Guardar y validar").is_disabled()
        record("G4", "Detalles del vehículo: todo en verde, documento enmascarado, 'Guardar y validar' sin cambios deshabilitado", complete and doc_masked and save_disabled, f"completo={complete} enmascarado={doc_masked} guardar deshabilitado={save_disabled}")
        # editar otro campo y guardar sin tocar el documento → el documento no se borra
        pg.get_by_placeholder("Ej. 4").fill("5"); pg.get_by_role("button", name="Guardar y validar").click(); pg.wait_for_timeout(2000)
        enc2 = sql("select card_data->>'owner_document' as d, card_data->>'doors' as doors from vehicles where id = $1", uuid.UUID(VID), fetch=True)[0]
        record("G5", "Guardar sin tocar el documento no lo borra ni lo cambia", enc2["d"] == enc and enc2["doors"] == "5", f"doc igual={enc2['d'] == enc} puertas={enc2['doors']}")
        pg.get_by_placeholder("Ej. 4").fill("4"); pg.get_by_role("button", name="Guardar y validar").click(); pg.wait_for_timeout(1500)
        b.close()
    # 3) Venta: sin verificar → 403
    r1 = api("PUT", f"/vehicles/{VID}", tok, json={"sell_enabled": True})
    record("G6", "API: publicar en venta sin verificar → 403", r1.status_code == 403, f"HTTP {r1.status_code} {r1.text[:80]}")
    # admin aprueba (simulado en la base: no hay sesión de admin en la prueba)
    sql("UPDATE vehicles SET verification_status = 'verified', verified_at = now() WHERE id = $1", uuid.UUID(VID))
    r2 = api("PUT", f"/vehicles/{VID}", tok, json={"sell_enabled": True})
    record("G7", "API: verificado pero sin confirmar a mano → 409 'Confirma a mano'", r2.status_code == 409 and "Confirma" in r2.text, f"HTTP {r2.status_code} {r2.text[:90]}")
    with sync_playwright() as p:
        b, ctx, pg = app_page(p, sess); open_profile(pg)
        boxes = pg.locator("[data-card-confirm] input[type=checkbox]")
        n = boxes.count()
        confirm_btn = pg.get_by_role("button", name="Confirmar que todos los datos son correctos")
        dis0 = confirm_btn.is_disabled()
        for i in range(n - 1): boxes.nth(i).check()
        dis1 = confirm_btn.is_disabled()
        boxes.nth(n - 1).check(); dis2 = confirm_btn.is_disabled()
        record("G8", "Confirmación manual: solo se habilita con todas las casillas marcadas una por una", n >= 17 and dis0 and dis1 and not dis2, f"casillas={n} deshabilitado: vacío={dis0}, faltando una={dis1}, todas={dis2}")
        confirm_btn.click(); pg.wait_for_timeout(2500)
        confirmed_ui = "Datos confirmados a mano" in pg.inner_text("body")
        chk = api("GET", f"/vehicles/{VID}/card-check", tok).json()
        record("G9", "Confirmar a mano guarda la confirmación vigente", confirmed_ui and chk["confirmed"], f"ui={confirmed_ui} servidor={chk['confirmed']}")
        b.close()
    r3 = api("PUT", f"/vehicles/{VID}", tok, json={"sell_enabled": True})
    record("G10", "API: verificado y confirmado → se puede publicar en venta", r3.status_code == 200 and r3.json()["sell_enabled"], f"HTTP {r3.status_code}")
    api("PUT", f"/vehicles/{VID}", tok, json={"sell_enabled": False})
    api("PUT", f"/vehicles/{VID}", tok, json={"brand": "Kia"})
    chk2 = api("GET", f"/vehicles/{VID}/card-check", tok).json()
    record("G11", "Cambiar cualquier dato invalida la confirmación", chk2["confirmed"] is False, f"confirmed tras editar la marca={chk2['confirmed']}")
    api("PUT", f"/vehicles/{VID}", tok, json={"brand": "Mazda"})

if __name__ == "__main__":
    run()
