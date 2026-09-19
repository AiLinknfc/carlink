# Pruebas funcionales de CarLink (documento único)

Este es el **único** checklist de pruebas funcionales manuales del proyecto — si en algún
momento se arma una lista de casos de prueba en otro doc o en una conversación, se mueve acá
(mismo criterio que `docs/PENDIENTES.md` con los pendientes). No reemplaza `pytest`/`vitest`
(esos cubren lógica unitaria); esto cubre flujos completos, de punta a punta, contra el backend
y el frontend corriendo de verdad — la clase de bug que un test unitario no agarra (ej. un botón
verde que debería ser amarillo, o un `useEffect` que nunca se vuelve a disparar).

## Cómo usar esto

1. **Nunca contra una cuenta real** — usar siempre la cuenta de pruebas (ver abajo). Si hace
   falta un llavero NFC activado, usar el código de prueba (`TEST-002`, ver abajo), no uno real.
2. Antes de desplegar (o después de tocar código de una sección de abajo), correr los casos de
   esa sección contra `npm run dev` (frontend) + `uvicorn --reload` (backend) locales, **ambos
   apuntando a la Supabase real** — local/staging/producción comparten la misma base
   (`CLAUDE.md`), así que probar en local ya prueba contra datos reales.
3. Marcar cada caso: ✅ pasa / ❌ falla / — no aplica esta vez. Si algo que pasaba antes ahora
   falla, es una regresión — no desplegar hasta resolverlo.
4. Los casos marcados **[hallazgo conocido]** fallan a propósito hoy — están documentados en
   `docs/PENDIENTES.md`, no son una regresión nueva. Si alguna vez empiezan a pasar, avisar para
   sacar la marca.
5. Después de cada corrida, resetear la cuenta de pruebas (no dejar datos de prueba sueltos en
   la base real).

## Cuenta de pruebas

Script único para crear/resetear/borrar, `backend/scripts/qa_test_account.py` (requiere el venv
de `backend/`, mismas variables de entorno que el backend — `SUPABASE_URL`,
`SUPABASE_SERVICE_KEY`, `DATABASE_URL`). La contraseña **nunca se guarda en ningún archivo** —
sólo se imprime en la terminal al crear la cuenta (política de `docs/SECURITY.md`, no
hardcodear secretos); copiarla de ahí cuando haga falta.

```bash
cd backend && source .venv/bin/activate

# Primera vez, o si la cuenta ya no existe
python scripts/qa_test_account.py create
# imprime email + password — copiarlos, no se guardan en ningún lado

# Antes de cada ronda de pruebas — deja la cuenta intacta, solo limpia sus datos
python scripts/qa_test_account.py reset

# Sólo si de verdad no hace falta la cuenta nunca más (no es lo mismo que "reiniciar")
python scripts/qa_test_account.py delete
```

`reset` borra el/los vehículo(s) de la cuenta (en cascada se van sus llaveros, documentos y
mantenimiento), libera de vuelta a `available` el código de activación de prueba
(`TEST-002` por default — pasar `--tag OTRO-UID` si se usa uno distinto), y limpia
WhatsApp/nombre. No toca el `id` de usuario ni la contraseña.

**Después de resetear, abrir una ventana de incógnito nueva** (o borrar del navegador las
claves `carlink_onboarding_*` de localStorage) antes de entrar — el wizard guarda ahí qué pasos
ya completó, y ese estado no vive en la base de datos.

**Código de activación de prueba**: `BHXEMCAKW7` (whitelist `tag_uid='TEST-002'`). `reset` lo
deja siempre disponible de nuevo. Si algún día se gasta/rompe, provisionar uno nuevo desde
`/admin` → NFC → Whitelist → "Provisionar llavero" con un `tag_uid` tipo `TEST-00N`, y actualizar
el default en `qa_test_account.py`.

---

## Suite 1 — Registro / Onboarding (cuenta persona)

Cubre: `frontend/src/components/onboarding/*`, `frontend/src/app/auth/callback/page.tsx`,
`frontend/src/app/register/page.tsx`.

| # | Caso | Cómo probarlo | Resultado esperado |
|---|------|----------------|---------------------|
| 1.1 | Cuenta persona nueva sin vehículo entra a `/app` | Login con la cuenta de pruebas recién reseteada | Aterriza en `/app` (no en `/register`) con el wizard abierto en "Bienvenida" |
| 1.2 | Bienvenida minimalista | Ver el paso 1 del wizard | Solo saludo + botón "Comenzar" — sin lista de pasos, sin botón "Atras", sin "X" para cerrar |
| 1.3 | Orden de campos en Vehículo | Ver el paso 2 | En este orden: Tipo de placa (tiles), Placa, Ciudad — no un `<select>` para el tipo |
| 1.4 | Los 3 campos son obligatorios | Dejar alguno vacío | "Guardar vehiculo" queda deshabilitado hasta completar Tipo + Placa + Ciudad |
| 1.5 | Cambiar tipo de placa reformatea | Elegir "Particular", escribir una placa completa, después tocar "Moto" | La placa tecleada se borra (no queda una placa vieja con el formato equivocado) |
| 1.6 | Formato Moto | Tipo "Moto", escribir en el segundo campo | Arma automático 2 dígitos + 1 letra (ej. "12D"), no acepta cualquier combinación |
| 1.7 | Formato Remolque | Tipo "Remolque", escribir letras | Sólo acepta `R` o `S` en el único campo de letra |
| 1.8 | Formato Diplomática/Carga | Tipo "Diplomática" (2+4) o "Carga" (1+4) | El largo máximo de cada campo cambia acorde — mismas reglas que `CartModal.tsx` y el hero de `/` |
| 1.9 | Registrar tarjeta de propiedad (opcional) | Botón "Registrar tarjeta de propiedad", subir una foto real y legible | Autocompleta lo que el OCR lea (placa/ciudad/marca/modelo/año/color) sin mostrar un formulario nuevo; aviso de "con buena luz" visible antes de subir |
| 1.10 | La tarjeta queda archivada | Tras guardar el vehículo, ir a Documentos | Aparece "Tarjeta de propiedad" con la foto subida |
| 1.11 | Placa/ciudad prellenadas desde la landing | Sin sesión, en `/`, escribir una placa+ciudad y tocar "Crear mi ficha" o iniciar sesión | El wizard trae esos datos precargados (incluido el tipo real detectado de la placa), editables antes de guardar |
| 1.12 | Guardar vehículo avanza directo | Completar los 3 campos y guardar | Pasa directo al paso WhatsApp — sin pantalla intermedia de "Vehiculo registrado" |
| 1.13 | WhatsApp no publica solo | Cargar un número y guardar | Avanza directo al paso Llavero — sin pantalla "Numero guardado". El número queda guardado pero **`whatsapp_enabled` sigue en `false`** (verificar con `SELECT whatsapp_enabled, whatsapp_number FROM profiles WHERE email=...` — debe mostrar el número con `enabled=false`) |
| 1.14 | El número se ve al instante en el perfil | Sin recargar la página, abrir "Mi perfil" | El campo WhatsApp (debajo del nombre) ya muestra el número recién guardado |
| 1.15 | Activar llavero real | Paso Llavero, código `BHXEMCAKW7` | "Llavero activado", botón dice **"Terminar"** (no "Continuar") — es el último paso |
| 1.16 | El topbar se entera al instante | Tras activar, sin recargar, mirar el botón "Llavero NFC" del topbar y el estado en Inicio | El badge del topbar muestra el llavero nuevo y el estado "Llavero: Activo" de Inicio ya lo refleja — **este fue un bug real (2026-09-15): antes quedaba desactualizado hasta recargar** |
| 1.17 | Llavero ya activo no vuelve a pedir código | Cerrar el wizard sin terminar (o entrar de nuevo con la cuenta ya con llavero activo) | El paso Llavero muestra directo "Llavero activado", nunca el formulario de código |
| 1.18 | Sin "Omitir" si ya está hecho | Con el llavero ya activado | El pie del wizard no muestra "Omitir por ahora" (no tiene sentido omitir algo ya hecho) |
| 1.19 | Cuenta taller nunca ve este wizard | Crear/usar una cuenta `taller` | Nunca se dispara `OnboardingWizard` — la cuenta va directo a `/app/negocio` |
| 1.20 | Reanudar tras cerrar sesión a mitad de camino | Cerrar la pestaña en medio del paso Vehículo (sin guardar), volver a entrar | Retoma en el mismo paso, con lo que ya estaba tecleado (placa/ciudad/tipo) |

## Suite 2 — Completar datos desde el perfil

Cubre: `frontend/src/app/app/page.tsx` (modal "Mi perfil"), `frontend/src/components/ColorPickerButton.tsx`.

| # | Caso | Cómo probarlo | Resultado esperado |
|---|------|----------------|---------------------|
| 2.1 | WhatsApp siempre visible | Abrir "Mi perfil" | Campo WhatsApp debajo de "Nombre completo", editable sin importar si la ficha está publicada |
| 2.2 | Guardar el perfil no publica WhatsApp | Cambiar el nombre o el número desde acá y guardar | `whatsapp_enabled` no cambia (verificar en la base) |
| 2.3 | Marca en tiles | "Datos del vehículo" → Marca | Grilla de tiles amarillos al seleccionar, no un `<select>` |
| 2.4 | Modelo con sugerencias | Elegir una marca, escribir en Modelo | Aparecen sugerencias acordes a marca+tipo+año |
| 2.5 | Selector de color circular | Campo Color | Botón circular con el color actual; al tocarlo abre una ventana para elegir entre los colores definidos, con aro amarillo en el seleccionado |
| 2.6 | Guardar corrobora en la base | Cambiar marca/modelo/color y guardar | `GET /vehicles/{id}` (o consulta directa) refleja los valores nuevos |

## Suite 3 — Publicar ficha / Contacto WhatsApp

Cubre: `frontend/src/app/app/page.tsx` (panel "Llavero NFC" → "Publicar mi perfil"),
`backend/app/routers/nfc.py` (ficha pública).

| # | Caso | Cómo probarlo | Resultado esperado |
|---|------|----------------|---------------------|
| 3.1 | Sin número no deja activar | Con `whatsapp_number=''`, tocar el toggle "Contacto WhatsApp" | No se activa; mensaje "No tenés WhatsApp registrado — agrégalo desde tu perfil" |
| 3.2 | Toggle sin input propio | Mirar la sección "Contacto WhatsApp" | No hay campo de texto ni botón "Guardar" ahí — sólo el switch |
| 3.3 | Activar publica el número real | Con número ya guardado, activar el toggle | Escanear el QR/NFC sin sesión (o `GET /nfc/{token}` público) muestra el WhatsApp |
| 3.4 | Desactivar lo saca de la ficha pública | Apagar el toggle | La ficha pública deja de mostrar el WhatsApp |

## Suite 4 — Compra de llavero (checkout)

Cubre: `frontend/src/components/CartModal.tsx`, `backend/app/routers/vehicles.py::check_plate`.

| # | Caso | Cómo probarlo | Resultado esperado |
|---|------|----------------|---------------------|
| 4.1 | Compra desde la landing (sin sesión) | En `/`, ir al carrito sin loguearse | Salta directo a "Envío" (paso de placa omitido) |
| 4.2 | **[hallazgo conocido, `docs/PENDIENTES.md` #12f]** Comprar el primer llavero desde adentro de la app | Con un vehículo ya registrado gratis (sin llavero), abrir el carrito desde el topbar o desde el CTA "sin cupo" de la Ficha | Hoy bloquea "Continuar" con "Ya tienes esta placa registrada... contáctanos" — **falla a propósito, no es una regresión nueva** hasta que se arregle `plate-check` para distinguir "tuya sin llavero" de "tuya con llavero" |
| 4.3 | Placa de otra cuenta sí bloquea | Escribir la placa de un vehículo de otra cuenta | Bloquea con "Verifica tu cuenta", correcto — este caso sí debe seguir fallando siempre (es la protección real) |

---

## Automatizado (referencia, no reemplaza lo de arriba)

- Backend: `cd backend && pytest tests/ -v` (última cifra conocida: ver `docs/PENDIENTES.md`).
- Frontend: `cd frontend && npx vitest run`.
- Estos cubren lógica unitaria/aislada — no reemplazan correr esta guía a mano contra el sistema
  real antes de desplegar (regla dura del proyecto, `CLAUDE.md` punto 3).

## Cómo agregar una sección nueva

Cuando se construya o se toque una parte grande de la app (ej. el panel taller/empresa, el flujo
de transferencia de vehículo), agregar acá una tabla nueva con el mismo formato — número de
caso, cómo probarlo, resultado esperado — en vez de dejar la lista de verificación sólo en la
conversación donde se construyó. Si un caso falla a propósito por un hallazgo ya conocido,
marcarlo **[hallazgo conocido]** con el link al ítem de `docs/PENDIENTES.md`, no dejarlo como si
fuera a pasar.
