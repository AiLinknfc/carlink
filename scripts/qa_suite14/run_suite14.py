"""Corre la Suite 14 (docs/PRUEBAS_FUNCIONALES.md) de punta a punta con un Chromium real.

Uso (ver README.md):  QA_PASSWORD=... python scripts/qa_suite14/run_suite14.py [--desde a2] [--solo g]

Orden (cada parte deja el estado que necesita la siguiente):
  a1 registro (crea el vehiculo)  a2 aceite y reglas  a3 calendario y aviso  b filtros (activa el llavero)
  d partes y salud  c aceite de caja/transmision  e bateria  f historial anterior  g tarjeta y venta
  h tipo de vehiculo  i ficha con datos invalidos  analytics
"""
import argparse, json, os, subprocess, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common  # noqa: E402  (valida QA_PASSWORD y que la cuenta sea @carlink.internal)

PARTES = [
    ("a1", "suite_a1_registro"), ("a2", "suite_a2_aceite"), ("a3", "suite_a3_calendario_aviso"), ("b", "suite_b_filtros"),
    ("d", "suite_d_partes_salud"), ("c", "suite_c_caja_transmision"), ("e", "suite_e_bateria"),
    ("f", "suite_f_historial_anterior"), ("g", "suite_g_tarjeta_venta"), ("h", "suite_h_tipo_vehiculo"), ("i", "suite_i_ficha_datos_invalidos"),
    ("analytics", None),
]

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--desde", help="empezar en esta parte (p. ej. d); las anteriores deben haber corrido ya")
    ap.add_argument("--solo", help="correr solo esta parte")
    args = ap.parse_args()
    keys = [k for k, _ in PARTES]
    start = keys.index(args.desde) if args.desde else 0
    if not args.desde and not args.solo:
        common.RESULTS_FILE.write_text("")
    for key, modname in PARTES:
        if args.solo and key != args.solo: continue
        if keys.index(key) < start: continue
        print(f"\n=== Parte {key} ===", flush=True)
        # Un error viejo de esta parte (de una corrida anterior) no debe quedar mezclado con el resultado nuevo.
        old = [l for l in common.RESULTS_FILE.read_text().splitlines() if json.loads(l)["code"] != f"{key}-ERROR"]
        common.RESULTS_FILE.write_text("".join(l + "\n" for l in old))
        if modname is None:
            env = dict(os.environ)
            py = Path(common.ROOT) / "backend/.venv/bin/python"
            out = subprocess.run([str(py), str(Path(__file__).resolve().parent / "analytics_scope_check.py")], capture_output=True, text=True, env=env, cwd=str(Path(common.ROOT) / "backend"))  # app.config lee backend/.env desde el cwd
            line = next((l for l in out.stdout.splitlines() if l.startswith("{")), "")
            try:
                d = json.loads(line); ok = d["contado en métricas (cuenta de pruebas)"] == 0 and d["contado en métricas (visitante real)"] == 1
            except Exception:
                d, ok = {"salida": (out.stdout + out.stderr)[-200:]}, False
            common.record("E3", "La cuenta de pruebas no cuenta en la analitica; un visitante real si", ok, json.dumps(d, ensure_ascii=False))
            continue
        try:
            mod = __import__(modname)
            mod.run()
        except Exception as e:  # una parte que se rompe no debe tapar lo demas, pero queda como fallo
            common.record(f"{key}-ERROR", f"La parte {key} se interrumpio", False, f"{type(e).__name__}: {str(e)[:200]}")
    rows = {}
    for l in common.RESULTS_FILE.read_text().splitlines():
        r = json.loads(l); rows[r["code"]] = r
    ok = sum(1 for r in rows.values() if r["ok"] is True); fail = [r for r in rows.values() if r["ok"] is False]; skip = [r for r in rows.values() if r["ok"] is None]
    print(f"\nRESUMEN: {ok} pasan, {len(fail)} fallan, {len(skip)} omitidos (de {len(rows)})")
    for r in fail: print("  FALLA", r["code"], r["name"], "-", r["note"])
    for r in skip: print("  OMITIDO", r["code"], r["name"])
    sys.exit(1 if fail else 0)

if __name__ == "__main__":
    main()
