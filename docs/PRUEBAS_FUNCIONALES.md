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
| 1.21 | Registro con correo: sin nombre, con repetir contraseña | Modal > "Crear una" (cuenta persona) | Muestra Correo, Contraseña y Repite la contraseña (sin nombre); contraseñas distintas no envían; sin subtítulo con placa en registro ni en inicio de sesión |
| 1.22 | Magic link de confirmación | Registrar un correo real nuevo | Pantalla "Revisa tu correo"; llega el enlace; sin abrirlo, iniciar sesión vuelve a esa pantalla; al abrirlo aterriza en `/auth/callback` con sesión. `mailer_autoconfirm=false` verificado en la Supabase real 2026-09-20; **falta probar la entrega real del correo y que la URL de callback esté permitida en Supabase** |
| 1.23 | Reenviar enlace | En "Revisa tu correo" tocar "Reenviar enlace" | Aviso "Enlace reenviado" y botón bloqueado 60 s |

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

## Suite 5 — Plan gratuito, tarjeta de propiedad y toggles (post-deploy 2026-09-18)

Cubre: `backend/app/services/plan.py`, `vehicles.py`, `StepVehiculo.tsx`, `OnboardingWizard.tsx`,
`DocumentosTab.tsx`, `FileCard.tsx`, panel de perfil y toggles de `app/app/page.tsx`. Ninguno de estos
casos se había probado en navegador ni contra el servidor desplegado cuando se escribió esta suite.

**Antes de empezar:** esperar a que Railway y Vercel terminen el deploy y confirmar que el commit
desplegado es el del merge (un "Redeploy" sobre una fila vieja reconstruye código viejo; ver
`docs/DEPLOY.md`). Resetear la cuenta de pruebas (`python scripts/qa_test_account.py reset`), usar
ventana de incógnito, y repetir lo visual (5.2, 5.3, 5.13) a 360 px de ancho.

| # | Caso | Cómo probarlo | Resultado esperado |
|---|------|----------------|---------------------|
| 5.1 | Pantalla final del wizard | Completar el wizard (cuenta reseteada, incógnito) | Se queda "Configuración finalizada" hasta tocar "Comenzar recorrido"; recién ahí arranca el tutorial |
| 5.2 | Pasos centrados y compactos | Mirar el indicador de pasos y el paso 3 (WhatsApp) | Círculos simétricos de borde a borde; "Omitir por ahora" pegado al contenido, sin hueco |
| 5.3 | Tutorial en pantalla chica | Repetir a 360px de ancho | Tarjeta centrada y por encima de todo, marco amarillo visible en cada paso |
| 5.4 | Reverso neutro hasta escanear | Paso Vehículo, escanear solo el frente | "Escanear reverso" neutro; amarillo solo tras escanearlo |
| 5.5 | Envío automático desde el wizard | Escanear frente y reverso, terminar el wizard | El aviso final dice que la tarjeta se envió a revisión; en `/admin` aparece en Verificaciones |
| 5.6 | Una sola cara no se envía | Escanear solo una cara | Vehículo queda "Sin verificar"; nada en la cola del admin |
| 5.7 | Perfil: caras ya cargadas bloqueadas | Perfil → Datos del vehículo, tras 5.5/5.6 | "Frente cargado" / "Reverso cargado" sin poder volver a escanear; la cara que falta sigue habilitada |
| 5.8 | Perfil: envío manual | Escanear las caras desde el perfil | No se envía solo: hay que tocar "Enviar a revisión" |
| 5.9 | Documentos: frente y reverso | Documentos → Tarjeta de propiedad | Solo el frente en la vista previa; al ampliar, flechas para ver el reverso; sin botón de subir archivo |
| 5.10 | Propietario leído | Escanear una tarjeta real | El nombre del propietario se llena (frente o reverso); si no, el aviso dice qué sí leyó |
| 5.11 | Plan gratuito: servicios | Cuenta sin llavero activo → Inicio | Solo Aceite se puede registrar; los demás con candado y abren el panel del llavero |
| 5.12 | Plan gratuito: publicar | Sin llavero, intentar encender ficha pública o "Vender" | Aviso "Activa tu llavero NFC…"; el toggle no se queda encendido |
| 5.13 | Agregar vehículo | Perfil → Agregar vehículo sin llavero comprado | Botón atenuado con el mismo nombre; al pasar el mouse y al tocar dice "Comprar llavero para agregar" |
| 5.14 | Activar llavero redirige | Activar el código `BHXEMCAKW7` desde el panel del llavero | Aviso y, en ~1 s, abre la ficha pública; "Copiar enlace" y "Revocar" siguen en la lista |
| 5.15 | Toggles fiables | Georreferenciación, Perdí mi llavero, Vender: encender/apagar rápido y recargar | Cambian al instante, un solo cambio por toque, el valor se mantiene tras recargar y al cambiar de vehículo |
| 5.16 | Placa: un solo texto | Landing, carrito, menú lateral, ficha NFC con moto y con carro | Moto: "COLOMBIA" debajo del número; carro: ciudad (o "CIUDAD" hasta elegirla); nunca los dos |
| 5.17 | Reserva de placas | Con otra cuenta, registrar una placa ya verificada | El wizard la bloquea; si solo estaba registrada gratis sin verificar, deja seguir con aviso |

## Suite 7 — Textos legales y PDF (2026-09-20)

Cubre: `legalContent.ts`, `legalPdf.ts`, `PolicyModal.tsx`, enlaces de pie de landing y casilla de
`LoginModal`. Sin backend. No probado en navegador real cuando se escribió.

- [ ] Pie de la landing: 4 enlaces (Garantía, Uso/Planes/Espacio, Privacidad, Soporte) abren el modal en la pestaña correcta
- [ ] Registro: la casilla enlaza a Privacidad, Términos de Uso y Garantía
- [ ] Modal claro y oscuro: viñetas, avisos en negrita y scroll legibles en móvil (375 px)
- [ ] "Descargar documento completo" baja un PDF de ~7 páginas con las 3 secciones, encabezado y "Página X de Y"
- [ ] El PDF no tiene caracteres rotos (tildes, ñ, ¿, ¡) ni texto cortado por el pie
- [ ] Soporte > "Descargar diagnóstico" baja la hoja de autodiagnóstico (1 página)
- [ ] Lo que dice el texto coincide con el sistema: 10 MB por archivo, plan gratis = 1 vehículo + aceite

## Suite 8 — Landing /taller y postulaciones de talleres (2026-09-21)

Cubre: `app/(public)/taller/(landing)`, `PostulacionForm.tsx`, `routers/workshop_applications.py`,
pestaña "Postulaciones" de `/admin`, migración `062`. La API y la pestaña se probaron con
`TestClient` contra la base real (con limpieza); **el clic a clic del formulario en un navegador y el
correo real siguen sin probarse**.

- [ ] `/taller` carga; `/shop` y `/shop/x` redirigen (308) a `/`; `/taller/TLR-XXXXX` (ficha de un taller) conserva su propio título
- [ ] Hero conserva la animación (tarjetas que se van al tocar el NFC); en móvil el nav no se sale de pantalla
- [ ] Orden: hero, problema, beneficios, cómo funciona, panel, cobertura, planes, respaldo, vehículos certificados, postulación, FAQ
- [ ] Formulario: sin tipo/logo/consentimiento no envía; NIT con dígito malo muestra el error; logo SVG rechazado; logo de más de 2 MB rechazado
- [ ] Envío válido: mensaje de éxito, fila `pending` en `workshop_applications` con `consent_version` y `logo_authorized` correctos; enviarlo dos veces con el mismo NIT no duplica
- [ ] NIT que ya es un taller registrado muestra "ya está registrado"
- [ ] Llegan los correos: aviso al admin y acuse al postulante (requiere `ADMIN_EMAIL` y `RESEND_API_KEY`)
- [ ] Admin > Postulaciones: lista con logo, filtros por estado, notas, Contactada / Aprobar / Rechazar; Aprobar manda el correo con el enlace a `/register?mode=empresa`
- [ ] Enlace "Política de Privacidad" del formulario abre el modal; pie de la landing abre los 4 textos legales
- [ ] Analítica: aparecen `taller_form_start` y `taller_form_submit`

## Suite 9 — Nosotros, Trabaja con nosotros y Blog (2026-09-21)

Cubre: `app/(public)/(company)/*`, `components/company/*`, `lib/blog.ts`, `SiteFooter.tsx`. Revisado
en pantalla (escritorio) con Chromium; móvil, tema claro y el envío del formulario de empleo sin probar.

- [ ] `/nosotros`, `/blog`, `/blog/<slug>`, `/trabaja` muestran el mismo header (Nosotros, Blog, Para talleres, Trabaja con nosotros) y el footer único
- [ ] Un slug inexistente devuelve 404; una entrada con `published: false` no aparece en el listado ni en el sitemap
- [ ] `/nosotros` muestra "Blog y noticias" con las 3 últimas entradas y enlace a `/blog`
- [ ] Tema claro: legible en las cuatro páginas; el botón de tema del header alterna
- [ ] Trabaja: no envía sin la casilla de autorización de datos; el enlace/correo de eliminación de datos es visible
- [ ] Los textos de Nosotros ya no dicen "inalterable" ni "imposible de alterar"

## Suite 10 — Autodiagnóstico de soporte (2026-09-21)

Cubre: `lib/diagnostics.ts`, `legalPdf.ts::downloadDiagnosticPdf`, tarjeta de `PolicyModal.tsx`. La
recolección se probó en Chromium contra el backend local; el PDF se revisó con datos de muestra.

- [ ] Soporte > Autodiagnóstico > "Generar reporte" baja `CarLink_DX-AAAAMMDD-XXXX.pdf` y muestra el resumen con el ID
- [ ] Con el backend caído: "Servidor de CarLink" sale con FALLA y la recomendación correspondiente
- [ ] Sin sesión: "No hay sesión iniciada"; con sesión: correo enmascarado y vigencia del acceso
- [ ] Android con Chrome: "Lectura NFC ... Disponible"; iPhone: nota de que lee con la cámara/sistema; computador: aviso de que no lee NFC
- [ ] "Copiar ID" copia el ID; el PDF menciona ese mismo ID
- [ ] Ningún dato sensible en el PDF (sin tokens, contraseñas ni correo completo)

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
