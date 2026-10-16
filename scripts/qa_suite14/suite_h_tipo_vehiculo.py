from common import *
VID = None
def nxt(pg): return pg.get_by_role("button", name="Siguiente", exact=True).last
def radios(pg): return " | ".join(x.inner_text().replace("\n", " ") for x in pg.get_by_role("radio").all())

def run():
    global VID; VID = VID or current_vehicle_id()
    sess = session(); tok = sess["access_token"]
    orig = sql("select type, body_type from vehicles where id = $1", uuid.UUID(VID), fetch=True)[0]
    try:
        # ---- Moto: se detecta sola (categoría de placa 'moto'), con body_type 'Auto' como el caso real de ZYM-35C
        sql("update vehicles set type = 'moto', body_type = 'Auto' where id = $1", uuid.UUID(VID))
        with sync_playwright() as p:
            b, ctx, pg = app_page(p, sess)
            pg.get_by_text("Aceite, aire, combustible y mas", exact=True).first.click(); pg.wait_for_timeout(900)
            r = radios(pg)
            record("H1", "Moto (placa moto): Filtros ofrece solo aceite, aire y combustible, sin que el usuario elija el tipo", r.count("Cada ~") == 3 and "Habitáculo" not in r and "Transmisión" not in r, r[:200])
            pg.keyboard.press("Escape"); pg.reload(wait_until="networkidle"); pg.wait_for_timeout(1500)
            pg.get_by_text("Bateria y sistema electrico", exact=True).first.click(); pg.wait_for_timeout(900)
            r = radios(pg)
            record("H2", "Moto: Batería ofrece MF/AGM, convencional y litio (no AGM/EFB ni híbrido)", all(x in r for x in ["MF / AGM", "Convencional", "Litio"]) and "AGM / EFB" not in r and "Híbrido" not in r, r[:200])
            pg.reload(wait_until="networkidle"); pg.wait_for_timeout(1500)
            pg.get_by_text("Cambio de aceite", exact=True).first.click(); pg.wait_for_timeout(800)
            r = radios(pg)
            record("H3", "Moto: Aceite también ofrece Transmisión (scooter / moto automática)", all(x in r for x in ["Motor", "Caja de cambios", "Transmisión"]), r[:200])
            b.close()
        # ---- Pesado (placa de carga): batería 12/24 V
        sql("update vehicles set type = 'carga', body_type = 'Pickup' where id = $1", uuid.UUID(VID))
        with sync_playwright() as p:
            b, ctx, pg = app_page(p, sess)
            pg.get_by_text("Bateria y sistema electrico", exact=True).first.click(); pg.wait_for_timeout(900)
            r = radios(pg)
            record("H4", "Placa de carga (pesado): Batería ofrece 12 V / 24 V MF", "12 V / 24 V" in r and "AGM / EFB" not in r, r[:200])
            b.close()
    finally:
        sql("update vehicles set type = $2, body_type = $3 where id = $1", uuid.UUID(VID), orig["type"], orig["body_type"])
    # ---- Suspensión desde Inicio (id sin tilde) abre su formulario con campos
    with sync_playwright() as p:
        b, ctx, pg = app_page(p, sess)
        pg.get_by_text("Amortiguadores, bujes", exact=True).first.click(); pg.wait_for_timeout(900)
        t = pg.inner_text("body")
        record("H5", "Inicio > Suspension abre su formulario con campos (id sin tilde normalizado)", "DETALLES — SUSPENSIÓN" in t.upper() and "Amortiguadores" in t, "")
        pg.reload(wait_until="networkidle"); pg.wait_for_timeout(1500)
        # ---- Pasarela de aceites: logos, buscador, 'otra marca', productos con viscosidad
        pg.get_by_text("Cambio de aceite", exact=True).first.click(); pg.wait_for_timeout(700)
        nxt(pg).click(); pg.wait_for_timeout(500)
        logos = pg.locator("img[src^='/oil-brands/']").count()
        total_cards = pg.locator("button[aria-pressed]").count()
        pg.get_by_label("Buscar marca de aceite").fill("Shell"); pg.wait_for_timeout(300)
        filtered = pg.locator("button[aria-pressed]").filter(has_text=re.compile("Shell|Otra marca")).count()
        shown_after = pg.locator("button[aria-pressed]").count()
        pg.get_by_label("Buscar marca de aceite").fill(""); 
        pg.get_by_role("button", name="Mobil", exact=True).first.click(); pg.wait_for_timeout(300)
        prod = pg.get_by_text("5W-30", exact=True).count() >= 1
        record("H6", "Pasarela de aceites: marcas con logo, buscador que filtra, 'Otra marca' y productos con viscosidad", logos >= 8 and shown_after == 2 and prod and pg.get_by_text("Otra marca").count() == 1, f"logos={logos} tarjetas={total_cards} tras buscar 'Shell'={shown_after} productos con viscosidad={prod}")
        b.close()
    # ---- Ficha pública desde la app (abre localhost, no producción)
    with sync_playwright() as p:
        b, ctx, pg = app_page(p, sess)
        with ctx.expect_page() as newp:
            pg.get_by_text("Ver ficha publica", exact=True).first.click()
        np_ = newp.value; np_.wait_for_load_state("networkidle"); np_.wait_for_timeout(2500)
        body = np_.inner_text("body")
        record("E2", "'Ver ficha pública' abre la ficha en local (localhost) con la placa del vehículo", np_.url.startswith("http://localhost:3000/nfc/") and "QAT-123" in body.replace(" ", "").upper().replace("QAT123", "QAT-123") or "QAT" in body, f"url={np_.url[:40]}… placa visible={'QAT' in body}")
        b.close()

if __name__ == "__main__":
    run()
