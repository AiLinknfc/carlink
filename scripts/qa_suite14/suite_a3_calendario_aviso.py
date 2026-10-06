from common import *
from suite_a2_aceite import oil_to_general

def run(vid=None):
    vid = vid or current_vehicle_id()
    sess = session(); tok = sess["access_token"]
    with sync_playwright() as p:
        b, ctx, pg = app_page(p, sess)
        # Calendario propio (sin <input type=date>) y amarillo
        oil_to_general(pg)
        has_native = pg.locator("input[type=date]").count()
        pg.locator("button.date-field").first.click(); pg.wait_for_timeout(400)
        dlg = pg.get_by_role("dialog", name="Calendario")
        visible = dlg.count() == 1
        today_btn = dlg.get_by_role("button", name="Hoy"); 
        info = dlg.evaluate("el => { const c = getComputedStyle(el); return [c.borderRadius, c.borderTopColor] }") if visible else None
        today = str(dt.date.today().day)
        # elegir hoy y verificar color de día seleccionado al reabrir
        today_btn.click(); pg.wait_for_timeout(300)
        pg.locator("button.date-field").first.click(); pg.wait_for_timeout(300)
        sel = dlg.get_by_role("button", name=today, exact=True).first
        bg = sel.evaluate("el => getComputedStyle(el).backgroundColor"); rad = sel.evaluate("el => getComputedStyle(el).borderRadius")
        disabled = dlg.locator("button:disabled").count()
        # días futuros: deshabilitados (hoy+3 si cae en el mismo mes)
        record("A10", "Calendario propio: sin input date nativo, día elegido amarillo, esquinas redondeadas, con días deshabilitados fuera de rango",
               has_native == 0 and visible and bg == "rgb(245, 197, 24)" and disabled > 0,
               f"nativos={has_native} panelRadius={info} díaElegido={bg} radio={rad} deshabilitados={disabled}")
        # navegar 2 meses atrás: todo deshabilitado (más de 30 días)
        for _ in range(2): dlg.get_by_role("button", name="Mes anterior").click()
        pg.wait_for_timeout(200)
        enabled_old = dlg.locator("button:not(:disabled)").filter(has_text=re.compile(r"^\d+$")).count()
        record("A11", "Calendario: no deja elegir fechas de hace más de 30 días", enabled_old == 0, f"días habilitados 2 meses atrás={enabled_old}")
        pg.keyboard.press("Escape")
        b.close()
        # Aviso periódico
        sql("UPDATE odometer_readings SET recorded_at = now() - interval '100 days' WHERE vehicle_id = $1", uuid.UUID(vid))
        b, ctx, pg = app_page(p, sess)
        txt = pg.inner_text("body")
        shown = "Actualiza el kilometraje de tu vehículo" in txt
        pg.get_by_role("button", name="Ahora no").click(); pg.wait_for_timeout(300)
        hidden = "Actualiza el kilometraje de tu vehículo" not in pg.inner_text("body")
        record("A12a", "Aviso periódico (100 días sin lectura) aparece y 'Ahora no' lo oculta", shown and hidden, f"visible={shown} oculto={hidden}")
        b.close()
        b, ctx, pg = app_page(p, sess)
        pg.get_by_label("Kilometraje actual").fill("40000"); pg.get_by_role("button", name="Guardar", exact=True).click(); pg.wait_for_timeout(2500)
        err = "es menor al de un registro anterior" in pg.inner_text("body")
        pg.get_by_label("Kilometraje actual").fill("54000"); pg.get_by_role("button", name="Guardar", exact=True).click(); pg.wait_for_timeout(2500)
        gone = "Actualiza el kilometraje de tu vehículo" not in pg.inner_text("body")
        odo = api("GET", f"/odometer/vehicle/{vid}", tok).json()
        record("A12b", "Aviso: valor menor da error; valor mayor se guarda y desaparece", err and gone and odo["current_mileage"] == 54000 and odo["state"] == "ok", f"error={err} desaparece={gone} odo={odo}")
        b.close()

