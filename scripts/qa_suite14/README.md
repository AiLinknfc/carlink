# Suite 14 automatizada (Chromium real)

Automatiza la **Suite 14** de `docs/PRUEBAS_FUNCIONALES.md` (odómetro, historial anterior, tarjeta, aceite/filtros/batería
por tipo de vehículo, Control de partes, venta y analítica). Maneja un Chromium real contra el frontend y el backend
**locales** y la **base compartida**, con la cuenta de pruebas, y consulta/ajusta la base para lo que la pantalla no muestra.

> **Es destructiva sobre la cuenta de pruebas:** crea un vehículo, registra servicios, activa el llavero `TEST-002`, y
> manipula fechas/estado de ese vehículo en la base. Solo corre con cuentas `@carlink.internal` y solo toca el vehículo
> de esa cuenta. **Termina siempre con `reset`** (ver abajo).

## Requisitos

1. Backend (`uvicorn`, puerto 8000) y frontend (`npm run dev`, puerto 3000) corriendo en local.
2. Cuenta de pruebas **sin vehículo y con el código libre**: `cd backend && python scripts/qa_test_account.py reset`
   (si no existe: `create`, que imprime la contraseña; el código de activación `TEST-002` se provisiona desde Admin o
   como se hizo el 2026-10-05, ver `docs/PRUEBAS_FUNCIONALES.md`).
3. Un entorno aparte con las dependencias (no van en el venv del backend):
   ```bash
   python3 -m venv /tmp/qa-venv && /tmp/qa-venv/bin/pip install -r scripts/qa_suite14/requirements.txt
   /tmp/qa-venv/bin/playwright install chromium     # o CHROME_PATH=/ruta/a/chrome si ya hay un Chromium (si Playwright pide otra versión: `CHROME_PATH=$(ls ~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome | tail -1)`)
   ```

## Cómo correrla

```bash
export QA_PASSWORD='...'                 # la contraseña de pruebas.features@carlink.internal (no se guarda en archivos)
/tmp/qa-venv/bin/python scripts/qa_suite14/run_suite14.py            # todo, en orden
/tmp/qa-venv/bin/python scripts/qa_suite14/run_suite14.py --solo g   # una parte
/tmp/qa-venv/bin/python scripts/qa_suite14/run_suite14.py --desde d  # desde una parte (las anteriores deben haber corrido)
cd backend && python scripts/qa_test_account.py reset                 # SIEMPRE al terminar
```

Variables opcionales: `QA_EMAIL`, `QA_ACTIVATION_CODE` (por defecto `6WDDSBEEE7`), `CHROME_PATH`, `QA_BASE`, `QA_API`.
Los resultados quedan en `scripts/qa_suite14/out/results.jsonl` (ignorado por git) y se resumen al final; el código de
salida es 1 si algo falla.

## Partes (cada una deja el estado de la siguiente)

| Parte | Cubre |
|---|---|
| `a1` registro | botón gris hasta tener todo, desplegable de combustible, vehículo con kilometraje inicial, sin envío automático a revisión |
| `a2` aceite y reglas | wizard de 4 pasos, errores de kilometraje legibles, predicción del próximo servicio, reglas del servidor (fecha, km, aceite sin datos) |
| `a3` calendario y aviso | calendario propio amarillo y limitado a 30 días, aviso periódico de kilometraje |
| `b` filtros | opciones de carro, exclusivas, marca y referencia, próximo servicio por filtro (activa el llavero) |
| `d` partes y salud | vistas Todo/Partes/Servicios, categoría manda, barra, contador, salud "Crítico · Aceite" |
| `c` caja y transmisión | pasos y piezas propias; no mueven la Ficha ni la ficha pública; "Ver ficha pública" abre localhost |
| `e` batería | wizard de 4 pasos, voltaje, "solo revisada" no renueva |
| `f` historial anterior | soporte obligatorio, sin efectos en piezas/odómetro, reglas del servidor |
| `g` tarjeta y venta | enviar a revisión, documento cifrado/enmascarado, confirmación a mano, venta 403/409/200 |
| `h` tipo de vehículo | moto, placa de carga, Suspensión desde Inicio, pasarela de aceites |
| `i` datos inválidos | testigo de aceite al día/media vida, "Revisa este registro", card sin "0 km" |
| `analytics` | la cuenta de pruebas no cuenta en las métricas (usa el venv del backend vía subprocess, con `cwd=backend/`) |

**Repetir una parte:** solo la `g` se puede repetir sola (restablece su propio estado). Las demás registran servicios
y suman datos: para repetirlas, `reset` y correr todo de nuevo.

## Lo que NO cubre (se prueba a mano)

- **A3:** escaneo con OCR de una tarjeta real (necesita la foto).
- **E4:** pedido de prueba con correo `@carlink.internal` en la analítica (necesita un pedido con pago).
- La **aprobación del admin** se simula en la base (no hay sesión de admin).

## Gotchas aprendidos

- `Siguiente` aparece también como flecha de las pasarelas: el botón del wizard es el **último** del DOM.
- Los textos con `text-transform: uppercase` se leen en mayúsculas con `inner_text`: comparar sin distinguir caso.
- Esperar ≥ 2,5 s tras guardar antes de leer el error del servidor.
- El tipo de placa (Particular, Moto...) también es obligatorio en el wizard.
- El runner usa `sql()` en un hilo aparte (la API sync de Playwright ya tiene un event loop corriendo).
