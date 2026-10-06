from common import *
VID = None
def goto_tab(pg, name): pg.locator("button", has_text=name).first.click(); pg.wait_for_timeout(1800)
def run():
    global VID; VID = VID or current_vehicle_id()
    sess = session(); tok = sess["access_token"]
    record("E4", "Un pedido de prueba con correo @carlink.internal no suma a 'Pago aprobado (pedidos)'", None, "requiere crear un pedido de la tienda con pago; cubierto solo por la prueba unitaria de la condicion SQL")
    q = "UPDATE maintenance_records SET next_service_mileage = $2 WHERE vehicle_id = $1 AND service_type = 'Aceite' AND lubricant_use = 'motor' AND mileage = 51000"
    def oil_title():
        with sync_playwright() as p2:
            b2, c2, g2 = app_page(p2, sess)
            g2.locator("button", has_text="Ficha tecnica").first.click(); g2.wait_for_timeout(1800)
            t = g2.locator("button[title^='Aceite']").first.get_attribute("title"); b2.close(); return t
    mid = oil_title()
    sql(q, uuid.UUID(VID), 70000)
    try: fresh = oil_title()
    finally: sql(q, uuid.UUID(VID), 59000)
    record("I1", "Testigo de Aceite (gota): 'Al dia' con vida de sobra y 'Media vida' pasada la mitad", fresh is not None and "Al día" in fresh and mid is not None and "Media vida" in mid, f"con vida de sobra: {fresh!r}; pasada la mitad: {mid!r}")
    # Registro de aceite con próximo servicio igual al kilometraje (el caso del dato viejo 2000/2000)
    old_next = sql("select next_service_mileage as n from maintenance_records where vehicle_id = $1 and service_type = 'Aceite' and lubricant_use = 'motor' and next_service_mileage = 59000", uuid.UUID(VID), fetch=True)[0]["n"]
    sql("UPDATE maintenance_records SET next_service_mileage = mileage WHERE vehicle_id = $1 AND service_type = 'Aceite' AND lubricant_use = 'motor' AND next_service_mileage = 59000", uuid.UUID(VID))
    try:
        with sync_playwright() as p:
            b, ctx, pg = app_page(p, sess)
            goto_tab(pg, "Ficha tecnica"); ft = pg.inner_text("body")
            record("I2", "Registro de aceite con próximo servicio = kilometraje: la Ficha dice 'Revisa este registro' (no verde)", "Revisa este registro" in ft, "")
            goto_tab(pg, "Historial"); pg.wait_for_timeout(1000)
            ht = pg.inner_text("body")
            # la card del aceite de motor (51.000 km) no debe mostrar 'Vida útil 0 km'
            record("I3", "La card del historial no muestra 'Vida útil 0 km' con intervalo cero", not re.search(r"VIDA ÚTIL\s*\n?\s*0 km", ht, re.I), "")
            b.close()
    finally:
        sql("UPDATE maintenance_records SET next_service_mileage = $2 WHERE vehicle_id = $1 AND service_type = 'Aceite' AND lubricant_use = 'motor' AND next_service_mileage = mileage", uuid.UUID(VID), old_next)

if __name__ == "__main__":
    run()
