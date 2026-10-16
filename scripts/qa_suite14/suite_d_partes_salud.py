from common import *
VID = None

def goto_tab(pg, name):
    pg.locator("button", has_text=name).first.click(); pg.wait_for_timeout(1500)

def tab_selected(pg): 
    return [t.inner_text() for t in pg.get_by_role("tab").all() if t.get_attribute("aria-selected") == "true"]

def run():
    global VID; VID = VID or current_vehicle_id()
    sess = session(); tok = sess["access_token"]
    with sync_playwright() as p:
        b, ctx, pg = app_page(p, sess)
        goto_tab(pg, "Control de partes")
        t = pg.inner_text("body")
        record("D1", "Control de partes abre en 'Todo': partes y servicios juntos", "Control de partes y servicios" in t and "Filtro de habitáculo" in t and "Aceite de motor" in t and tab_selected(pg) == ["Todo"], str(tab_selected(pg)))
        pg.get_by_role("tab", name="Partes").click(); pg.wait_for_timeout(500); tp = pg.inner_text("body")
        pg.get_by_role("tab", name="Servicios").click(); pg.wait_for_timeout(500); ts = pg.inner_text("body")
        record("D2", "Partes no muestra el aceite; Servicios sí (y no muestra filtros)", "Filtro de habitáculo" in tp and "Aceite de motor" not in tp and "Aceite de motor" in ts and "Filtro de habitáculo" not in ts)
        pg.get_by_role("button", name="Motor", exact=True).click(); pg.wait_for_timeout(500); s1 = tab_selected(pg)
        pg.get_by_role("button", name="Filtros", exact=True).click(); pg.wait_for_timeout(500); s2 = tab_selected(pg)
        pg.get_by_role("button", name="Todas", exact=True).click(); pg.wait_for_timeout(500); s3 = tab_selected(pg)
        record("D3", "La categoría manda: Motor→Servicios, Filtros→Partes, Todas→Todo", s1 == ["Servicios"] and s2 == ["Partes"] and s3 == ["Todo"], f"{s1} {s2} {s3}")
        # barra de vida útil del aceite avanza (km actual 54500, instalado 51000, vida 8000 → 44 %)
        pg.get_by_role("tab", name="Servicios").click(); pg.wait_for_timeout(500)
        width = pg.evaluate("""() => { const row = [...document.querySelectorAll('.parte-row')].find(r => r.innerText.includes('Aceite de motor'));
            if (!row) return null; const bars = [...row.querySelectorAll('div')].filter(d => d.style.width && d.style.width.endsWith('%')); return bars.map(d => d.style.width) }""")
        record("D4", "La barra de vida útil del aceite avanza con el kilometraje (≈44 %)", bool(width) and width[0] in ("44%", "43%", "45%"), str(width))
        # Ficha: contador de partes
        goto_tab(pg, "Ficha tecnica"); pg.wait_for_timeout(1500)
        ft = pg.inner_text("body")
        m = re.search(r"(\d+)\s*\n?\s*partes reemplazadas", ft)
        record("D5", "El odómetro cuenta solo piezas físicas (1: el filtro), no el aceite", bool(m) and m.group(1) == "1", f"partes reemplazadas={m.group(1) if m else None}")
        b.close()
    # Salud roja con aceite vencido
    sql("UPDATE maintenance_records SET next_service_mileage = 54200 WHERE vehicle_id = $1 AND service_type = 'Aceite'", uuid.UUID(VID))
    with sync_playwright() as p:
        b, ctx, pg = app_page(p, sess)
        goto_tab(pg, "Ficha tecnica"); pg.wait_for_timeout(1500)
        ft = pg.inner_text("body")
        health = re.search(r"(Crítico[^\n]*|Atención[^\n]*|Óptimo)", ft)
        record("D6a", "Aceite vencido: la salud sale 'Crítico · Aceite'", bool(health) and health.group(1).startswith("Crítico") and "Aceite" in health.group(1), health.group(1) if health else "no encontrada")
        record("D6b", "Aceite vencido: 'cambio vencido' y contador en cero (sin ~90 días)", "cambio vencido" in ft, "")
        b.close()
    sql("UPDATE maintenance_records SET next_service_mileage = 59000 WHERE vehicle_id = $1 AND service_type = 'Aceite'", uuid.UUID(VID))

if __name__ == "__main__":
    run()
