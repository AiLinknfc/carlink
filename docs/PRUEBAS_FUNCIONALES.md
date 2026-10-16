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

**Código de activación de prueba**: `6WDDSBEEE7` (whitelist `tag_uid='TEST-002'`, provisionado el 2026-10-05; el anterior ya no existía en la base). `reset` lo
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

**Automatizadas (2026-10-02)**: `cd frontend && npm test` corre `src/components/__tests__/CartModal.test.tsx`
(validación de envío, total $39.900, creación de orden sin mandar precio, Wompi aprobado/rechazado/error).
No reemplaza la prueba manual con el widget real de Wompi.

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

## Suite 11 — Ticket de soporte y responsive en pantallas de 320 px (2026-09-21)

- [ ] Soporte > enviar con nombre, correo válido, tipo y mensaje de 10+ caracteres: muestra "Tu ticket es C-100xx" y la fila aparece en Admin > Soporte
- [ ] Mensaje de menos de 10 caracteres y correo inválido muestran error claro; sin internet muestra el aviso de conexión
- [ ] Tras generar un autodiagnóstico, el ticket queda con su ID (visible en Admin > Soporte)
- [ ] Admin > Soporte: filtros Abiertos/Resueltos/Todos, "Marcar resuelto" y "Reabrir"
- [ ] A 320 px de ancho: `/taller`, `/nosotros`, `/blog`, `/blog/<slug>`, `/trabaja` y los 4 textos de "Legal y soporte" no tienen scroll horizontal
- [ ] A 320 px: header de `/taller` muestra logo, "Iniciar sesión" y el interruptor de tema completos; en Nosotros/Blog/Trabaja aparece la fila de enlaces desplazable
- [ ] A 320 px: las pestañas del modal legal se desplazan en una fila y el contenido se lee sin recortes; el pie tiene los botones a ancho completo
- [ ] Botón "Descargar guía" de la home tiene el mismo tamaño y tipografía que "Únete a la comunidad"

## Suite 12 — Seguridad del vehículo, selector de placa y topbar móvil (2026-09-30)

Cubre `SeguridadTab.tsx`, `SafetyFormModal.tsx`, `/api/safety`, `/api/ocr/safety`, el selector de
placa de `InicioView.tsx` y el topbar móvil de `frontend/src/app/app/page.tsx`. No probado contra
el sistema real todavía — solo automatizado (`pytest`/`vitest`, en verde) y revisión de código.

- [ ] Inicio > "Verificar elementos" > cada tarjeta (extintor, botiquín, kit de carretera, otro) abre `SafetyFormModal` y registra a mano; el estado (en orden/por vencer/vencido/faltan N) se ve correcto en Seguridad
- [ ] Escanear/subir foto de una etiqueta real de extintor o botiquín prellena el formulario vía `POST /api/ocr/safety`; **requiere `DEEPSEEK_API_KEY` en Railway (`docs/PENDIENTES.md`) — sin ella el endpoint responde con el formulario vacío, no falla, así que probarlo primero contra local con la key puesta**
- [ ] Cuenta con 2+ vehículos: flechas de la placa en Inicio pasan de uno a otro (navegación circular, "Vehículo N de M"), y el estado (llavero, documentos, verificación, servicios, Seguridad) del vehículo anterior desaparece de inmediato (no se mezcla con el nuevo mientras carga)
- [ ] Cuenta con 1 solo vehículo: no aparecen flechas ni el indicador "Vehículo N de M"
- [ ] A 560 px o menos: las grillas de "Registrar servicio" y "Verificar elementos" quedan en 2 columnas
- [ ] A 400 px o menos: la placa del selector se ve completa (sin desborde) — revisar en Chrome/Safari reales, `zoom` (no soportado en Firefox) se usa para achicarla `[hallazgo conocido, ver revisión de arquitectura 2026-09-30]`
- [ ] En <= 900px: el botón de menú queda fijo a la derecha, el logo CarLink aparece arriba a la izquierda, y los botones se ocultan uno a uno (desde el que toca el logo) según el ancho disponible, sin reacomodar los que quedan
- [ ] Menú lateral: el ícono de Seguridad (cono de tráfico) navega a la pestaña Seguridad
- [ ] Plan gratuito: confirmar si Seguridad debería bloquearse como el resto de secciones — hoy no lo está `[pendiente de decisión de negocio, ver docs/PENDIENTES.md]`

## Suite 13 — Defensa automática de llaveros NFC y notificaciones del admin (2026-10-01)

Qué se prueba: que el sistema **pausa solo** un llavero con actividad de clonado/fuga/rastreo, avisa, y que
un uso normal no se toca. Lógica en `backend/app/services/alerts.py` (umbrales: 10 conexiones distintas o 200
lecturas en 24 h; apagable con `NFC_AUTO_PAUSE_ENABLED=false`). Se corre **antes de cada deploy que toque
`nfc.py`, `alerts.py` o `admin_notify.py`** y después de cambiar un umbral.

**Automatizada (primero esto)** — `cd backend && python scripts/qa_nfc_attack_sim.py`. Crea un usuario
desechable con 4 vehículos/llaveros contra la Supabase real, lanza los ataques por HTTP y lo borra todo al
terminar (residuo 0). Tarda ~1-2 min. Debe terminar con todas las comprobaciones en PASS:

| Caso | Ataque simulado | Resultado esperado |
|---|---|---|
| A | Uso normal: 3 conexiones, 2 lecturas cada una | Fichas 200; llavero activo; sin alerta |
| B | URL filtrada: lecturas desde 12 conexiones distintas | Llavero pausado (`paused_security`), alerta `auto_paused` ya resuelta, aviso al admin en el historial; lectura posterior 404 con "pausado por seguridad" |
| C | Bot desde 8 conexiones × 26 lecturas (208/día) | Llavero pausado por volumen |
| D | Una sola IP con 45 lecturas seguidas | Aparecen 429 (límite por IP); el llavero NO se pausa (una IP no puede pausar el llavero de otro) |
| E | 30 tokens adivinados al azar | Todo 404/429; ningún llavero afectado |
| F | El dueño reactiva el llavero pausado | 200, vuelve a `active` y la ficha responde |
| Z | Limpieza | Sin ningún dato de la simulación |

**Manual (después del deploy, con ADMIN_EMAIL y RESEND_API_KEY ya en Railway)**

- [ ] **Límite por IP en producción (caso D, que la simulación omite sin Redis):** `T=$(python3 -c "import secrets;print(secrets.token_hex(32))"); for i in $(seq 1 40); do curl -s -o /dev/null -w "%{http_code}\n" https://api.carlink.com.co/api/nfc/$T; done | sort | uniq -c` debe mostrar **429** en las últimas ~10 (límite: 30/min por IP). Si salen 40 × 404, el límite está apagado (falta `REDIS_URL` en Railway). `[hallazgo 2026-10-01: en producción dio 40 × 404, ver docs/PENDIENTES.md]`
- [ ] **IP real en el registro de lecturas:** tras el deploy, escanear un llavero de prueba y mirar `nfc_access_logs.ip_address` de esa lectura: debe ser la IP del celular, no `100.64.0.x` (red interna de Railway). Si sigue saliendo `100.64.0.x`, `client_ip()` en `app/utils.py` no está leyendo el encabezado correcto de Railway.
- [ ] Provocar el caso B con un llavero de la cuenta de pruebas (no uno real): llega el correo al admin ("Llavero pausado automáticamente") y el correo al dueño.
- [ ] En Admin > Notificaciones, filtro "Resueltas (historial)": aparece la entrada, sin contar en la campana.
- [ ] En la app del dueño > Mis llaveros: el llavero aparece pausado y el botón Reactivar lo devuelve a la vida.
- [ ] Un llavero de la cuenta admin (demostraciones) **no** se pausa aunque lo lean muchas conexiones.
- [ ] Una venta de prueba contraentrega: aparece como pendiente sin ver en la campana de Admin y de la app, y llega el correo.
- [ ] Abrir la notificación la deja atenuada (vista); resolverla la hace desaparecer de Pendientes.

**Hallazgos que dejó la simulación (todos corregidos el 2026-10-01 salvo Redis):** (1) la pausa se deshacía porque la lectura que la disparaba terminaba en error y `get_db` revierte la transacción: ahora la pausa corre en su propia sesión; (2) al reactivar, la actividad vieja volvía a pausar el llavero en la primera lectura: la ventana de análisis empieza en la última pausa; (3) lecturas simultáneas creaban dos alertas: bloqueo `FOR NO KEY UPDATE`; (4) en producción las IP registradas son del proxy de Railway (`100.64.0.x`), no del visitante: se excluyen del conteo y se lee la IP real del encabezado; (5) sin `REDIS_URL` no hay límite de peticiones por IP (ver abajo). Además: con 2 o más llaveros personales activos en el mismo vehículo la ficha
pública respondía 500 (`MultipleResultsFound` en `_has_ficha_access`). Corregido el 2026-10-01; el caso A/B
de la simulación usa un vehículo por llavero, así que **agregar a mano el caso "2 llaveros en el mismo
vehículo -> la ficha responde 200"** cuando se pruebe con un kit.

## Suite 14 — Odómetro, historial anterior, tarjeta completa, venta y analítica (2026-10-05)

Cuenta: `pruebas.features@carlink.internal` (contraseña: la que imprimió `create`; no se guarda). Código de
llavero: `6WDDSBEEE7`. Entrar en ventana de incógnito. Antes de empezar: `python scripts/qa_test_account.py reset`.
Para las pruebas de OCR hace falta `DEEPSEEK_API_KEY` en el backend local (`backend/.env` ya la tiene) y
una tarjeta de propiedad real o una foto legible de una.

**A. Registro del vehículo y odómetro**
- [ ] Wizard, paso Vehículo: "Guardar vehículo" sigue gris hasta tener placa, ciudad y **kilometraje**. El aviso "Ten cuidado con este dato" es visible y, al enfocar el campo de kilometraje, se resalta y pulsa (con "reducir movimiento" solo se resalta).
- [ ] Combustible: el wizard y "Agregar vehículo" **ya no lo piden** (2026-10-15). Se elige después en el panel lateral > Corregir datos (desplegable de una fila, sin "sin definir"), y es obligatorio para enviar a revisión. Si el escaneo de la tarjeta lo lee, se guarda solo.
- [ ] Escanear frente y reverso: se prellenan combustible, propietario y los datos de la licencia (se ven luego en Mi perfil > Detalles del vehículo). Al terminar el wizard el vehículo queda **sin verificar** (no se envía solo a revisión) y las fotos aparecen en Documentos. `[requiere DEEPSEEK_API_KEY]`
- [ ] En la base, `vehicles.card_data` trae todo lo leído (aunque sea inválido, p. ej. un VIN de 16 caracteres) y `fuel_type` queda guardado.
- [ ] Selector de fecha (en Registrar servicio, Historial anterior, Documentos, Seguridad, etc.): al abrirlo el calendario es **amarillo** (día elegido en #F5C518), con esquinas redondeadas y sin ningún azul; en tema claro y oscuro. Dentro de un modal con scroll no queda cortado.
- [ ] Registrar servicio: al digitar el kilometraje, "Próximo servicio (km)" se llena solo para **todos** los tipos (Aceite con y sin viscosidad, Filtros). En Filtros, marcar solo el de partículas cambia la predicción a 100.000 km; desmarcarlo vuelve a la de los otros filtros.
- [ ] Registrar con 50000 km. En Inicio **no** aparece el aviso de kilometraje (ya hay lectura inicial).
- [ ] Registrar un servicio de Aceite con 49000 km: error legible "menor al de un registro anterior" (no JSON crudo).
- [ ] Registrar Aceite con 51000 km: pasa. Con 200000 km: error "muy alto comparado con el último".
- [ ] Fecha del servicio: el selector no deja elegir fechas futuras ni de hace más de 30 días. Forzarlo por la API (`POST /api/maintenance` con `date` de hace 45 días) responde 422.
- [ ] Aviso periódico: en la base, `UPDATE odometer_readings SET recorded_at = now() - interval '100 days' WHERE vehicle_id = ...`; recargar Inicio: aparece "Actualiza el kilometraje". "Ahora no" lo oculta hasta cerrar la pestaña. Ingresar menos que el actual: error; ingresar más: se guarda y desaparece.

- [ ] Registrar servicio > Aceite empieza con **¿Para qué es el lubricante?**: Motor, Caja de cambios y Transmisión (moto: solo Motor y Caja); son 4 pasos. Motor sigue el flujo de marcas y viscosidad; Caja pide marca, viscosidad (75W-90...) y norma opcional; Transmisión pide marca y tipo de fluido (ATF, CVT, DCT...). Sin marca y tipo/viscosidad no avanza. Cambiar de caso borra los datos del anterior.
- [ ] Con **solo** un aceite de caja o de transmisión registrado (sin aceite de motor), la Ficha técnica no muestra su marca, viscosidad ni próximo cambio (sigue "sin datos" de aceite), y la ficha pública tampoco. Lo único que toman es el kilometraje (el odómetro sube) y su fila en Control de partes > Servicios.
- [ ] Registrar un aceite de **caja** o de **transmisión** no cambia el testigo, la cuenta regresiva ni el dial de aceite de motor; aparece en Control de partes > Servicios como "Aceite de caja" / "Aceite de transmisión" (categoría Transmisión), con su propia vida útil.
- [ ] Registrar servicio > Aceite, paso 1: pasarela horizontal de **marcas con logo** (con flechas y buscador que la filtra). Al elegir una marca aparece otra pasarela con sus **productos** (viscosidad y tipo de base); elegir un producto completa marca, producto y viscosidad. "Otra marca" permite escribirla.
- [ ] "Siguiente" en el paso 1 **no avanza** sin marca y viscosidad (mensaje "Indica el aceite utilizado"). Forzar el `POST /api/maintenance` de Aceite sin esos datos responde 422.
- [ ] Digitar 2000 km en el paso 2: en el paso 3 "Próximo servicio" ya viene predicho según la viscosidad elegida (p. ej. 5W-30 → 10.000). Poner el mismo valor que el kilometraje (2000) o menor: error "debe ser mayor al kilometraje actual", en pantalla y en la API (422).

**B. Control de partes**
- [ ] Registrar Filtros con un **carro**: aparecen aceite, aire del motor, habitáculo / A/C, combustible y transmisión (y Partículas solo si es diésel o sin combustible definido). Con una **moto** (placa de moto o clase Moto): solo aceite, aire y combustible, sin que el usuario elija el tipo.
- [ ] Al elegir un filtro aparecen, en el mismo paso 1, **Marca** (con sugerencias) y **Referencia**, opcionales; siguen siendo 3 pasos. Tras guardar, Control de partes muestra "marca · referencia" en esa pieza. Cambiar de filtro limpia ambos campos.
- [ ] Las cards son **exclusivas**: elegir una desmarca la anterior; "Siguiente" no avanza sin elegir una. "Flujo de aire verificado" solo aparece con el filtro de aire.
- [ ] Cada filtro predice su propio próximo servicio (habitáculo 15.000 km, transmisión 60.000, aceite de moto 5.000...) y en Control de partes solo se renueva la pieza de ese filtro, con la vida útil de su tipo de vehículo.
- [ ] Control de partes: cada pieza muestra la barra con **avance** > 0 % al registrar un servicio posterior con más kilometraje, o una lectura periódica mayor. El color pasa de verde a naranja desde media vida y a rojo con ≤ 15 %.
- [ ] Una pieza con menos km que su instalación muestra 0 %, nunca negativo.

- [ ] Ficha > tablero: el testigo de **Aceite** (gota) aparece junto a los demás, primero. Tras registrar el primer aceite sale en **verde** ("Al día"); al pasar la mitad de su vida útil, naranja; con 15 % o menos, rojo. Al pasar el mouse el odómetro muestra los km que faltan para el cambio. Cuenta para el promedio de "Salud vehículo".

- [ ] Control de partes tiene las vistas **Partes** y **Servicios**. Con solo un cambio de aceite registrado, "Partes" no lo muestra y "Servicios" sí, con su barra avanzando al subir el kilometraje. El contador del odómetro dice 0 partes reemplazadas (el aceite no es una pieza).
- [ ] Por defecto (categoría **Todas**, pestaña **Todo**) Control de partes muestra juntas las partes y los servicios (aceite incluido); las pestañas Partes y Servicios filtran cada grupo.
- [ ] La categoría manda: con solo aceite registrado, elegir **Motor** pasa solo a la vista Servicios y muestra el aceite; elegir **Frenos** (si hay pastillas) vuelve a Partes. "Todas" no cambia la vista. En Servicios el filtro por categoría también aplica (Enfriamiento = refrigerante).
- [ ] Salud del vehículo: con el aceite vencido (kilometraje actual ≥ próximo cambio) la salud sale en **rojo** con el motivo ("Crítico · Aceite") aunque los demás testigos estén bien. Con un filtro vencido y lo demás bien: naranja ("Atención"). Los testigos sin datos no entran en el promedio.
- [ ] Cambio de aceite con 0 km restantes: el contador del "Próximo cambio de aceite" está en 0 y dice "cambio vencido" (no aparecen ~90 días). Con un cambio reciente muestra la fecha de la regla que llegue primero (kilómetros o meses de la viscosidad).
- [ ] Un registro de aceite viejo con próximo servicio igual al kilometraje: la Ficha dice "Revisa este registro" y la card del historial no muestra "Vida útil 0 km".

- [ ] Desde **Inicio**, tocar la card Batería (y Suspensión / Transmisión) abre el formulario de ese servicio con sus campos (Inicio manda el id sin tilde; el formulario lo normaliza). Hallazgo 2026-10-05: sin eso la card de Batería abría un formulario sin campos.
- [ ] Registrar servicio > Batería es un wizard de **4 pasos** (Tipo, Medición, Datos generales, Confirmar). El tipo se ofrece según el vehículo (carro: MF, convencional, AGM/EFB, híbrido/eléctrico; moto: MF/AGM, convencional, litio; camión/bus: 12/24 V MF) y no avanza sin elegirlo.
- [ ] Medición: el voltaje 12,7 dice "Carga completa", 11,5 "Descargada"; un valor imposible (99) bloquea el paso. Con "Solo la revisé" no se renueva la batería en Control de partes y el próximo servicio queda a ~6 meses; con "Cambié la batería" el próximo servicio depende del tipo (AGM/EFB 48 meses, convencional 24...). El testigo de batería de la Ficha usa los meses del tipo elegido.

**C. Historial anterior**
- [ ] Historial > "Cargar historial anterior": no deja guardar sin soporte; con foto o PDF y fecha anterior al alta, queda como "Anterior declarado" con "Ver soporte" (el enlace abre el archivo).
- [ ] Fecha igual o posterior al alta del vehículo: error "debe ser de antes de registrar el vehículo".
- [ ] Kilometraje mayor al inicial: error. No aparece botón de editar en ese registro; la API `PUT` responde 403.
- [ ] Ese registro **no** cambia ninguna barra de Control de partes ni el "próximo servicio".

**D. Tarjeta, verificación y venta**
- [ ] Mi perfil > Datos del vehículo: Combustible es el mismo desplegable temático, no un select azul nativo.
- [ ] "Detalles del vehículo": cada campo con marca verde o roja; el documento del propietario se ve enmascarado (`•••••456`); guardar sin tocarlo no lo borra.
- [ ] "Enviar a revisión" está deshabilitado hasta que no haya campos en rojo; forzar el `POST /vehicles/{id}/verification` con la tarjeta incompleta responde 422 con la lista.
- [ ] En la base, `card_data->>'owner_document'` empieza con `enc1:` (cifrado), nunca el número en claro.
- [ ] Aprobar la verificación desde Admin. Intentar activar "Publicar en venta" **sin** confirmar: mensaje de que falta confirmar a mano; la API responde 409.
- [ ] Confirmar a mano: el botón solo se habilita con las casillas marcadas una por una. Después se puede publicar. Editar cualquier dato invalida la confirmación.

**E. Ficha pública y analítica**
- [ ] Activar el llavero con `6WDDSBEEE7`; "Ver ficha pública" abre `localhost:3000/nfc/...` con la ficha (en local y producción responden lo mismo: misma base).
- [ ] Analítica (Admin): hacer 5 visitas con la cuenta de pruebas y con la del admin; el conteo de visitantes y las páginas vistas **no** suben. Visitantes de otros navegadores sí cuentan.
- [ ] Un pedido de prueba con un correo `@carlink.internal` no suma a "Pago aprobado (pedidos)".

**Versión automatizada:** `scripts/qa_suite14/` (ver su `README.md`) repite esta suite de punta a punta con un Chromium
real: `QA_PASSWORD=... python scripts/qa_suite14/run_suite14.py`. Deja el vehículo y los datos de la cuenta de pruebas,
así que **siempre termina con `qa_test_account.py reset`**. Cubre lo que se lista en el resultado de abajo; el OCR de una
tarjeta real, el pedido con pago y la aprobación del admin siguen siendo a mano.

### Resultado de la corrida de la Suite 14 (2026-10-05)

Corrida automatizada con un Chromium real (Playwright, sin pantalla) contra el frontend y el backend locales y la
base compartida, con la cuenta de pruebas y el código `6WDDSBEEE7`, más consultas directas a la base para lo que
la pantalla no muestra. **72 comprobaciones pasan, 0 fallan, 2 no se pudieron correr** (A3 y E4, abajo). Al
terminar se reseteó la cuenta de pruebas (sus vehículos y llavero se borran; el código vuelve a estar libre).

| Bloque | Casos | Resultado |
|---|---|---|
| A. Registro, kilometraje, fechas | gris hasta tener todo, desplegable de combustible, lectura inicial, aceite 49.000/200.000/51.000 km, calendario amarillo y limitado a 30 días, aviso periódico, reglas del servidor (fecha, km, próximo servicio, aceite sin datos) | Pasan (A3 omitido) |
| B. Filtros | carro: 5 opciones, exclusivas, flujo de aire solo con aire, marca y referencia en la pieza, próximo servicio por filtro | Pasan |
| C. Aceite de caja y transmisión | pasos propios, piezas propias, aparecen en Servicios, **no** mueven el próximo cambio de aceite de la Ficha | Pasan |
| D. Control de partes, salud | vistas Todo/Partes/Servicios, categoría manda, barra avanza (44 %), contador solo de piezas, salud "Crítico · Aceite" con aceite vencido | Pasan |
| E. Ficha pública y analítica | llavero, ficha pública con el aceite de **motor**, "Ver ficha pública" abre localhost, la cuenta de pruebas no cuenta | Pasan (E4 omitido) |
| F. Batería e historial anterior | wizard de 4 pasos, voltaje, "solo revisada" no renueva, historial anterior con soporte obligatorio y sin efectos en piezas/odómetro | Pasan |
| G. Tarjeta, verificación y venta | enviar a revisión bloqueado, documento cifrado y enmascarado, confirmación casilla por casilla, venta 403/409/200, edición invalida la confirmación | Pasan |
| H. Tipo de vehículo | moto (3 filtros, litio, transmisión), placa de carga (12/24 V), Suspensión desde Inicio, pasarela de aceites | Pasan |

**No se pudieron correr:** **A3** (escanear frente y reverso con OCR: necesita la foto de una tarjeta real; solo se
verificó con texto sintético) y **E4** (un pedido de prueba con correo `@carlink.internal`: necesita crear un
pedido con pago). La verificación del admin en G se **simuló** en la base (no hay sesión de admin en la corrida).

**Hallazgos de la corrida (corregidos):** (1) el formulario de servicio validaba el kilometraje solo contra los
servicios, así que un vehículo recién registrado (sin servicios) no avisaba hasta el último paso — ahora valida
contra el odómetro; (2) la barra lateral mostraba "0 · particular · " cuando el año o el color no están definidos —
ahora omite lo vacío. **Observaciones sin corregir** (en `docs/PENDIENTES.md`): "Tipo" del perfil sigue siendo un
`<select>` nativo; el alta del vehículo se compara en UTC (un servicio anterior con la fecha local de hoy puede
pasar el límite de "antes del alta" cerca de la medianoche).

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

---

## Suite 15 — Vínculo taller-conductor por QR y pin del mapa (2026-10-14)

Plan y diseño: `docs/PLAN_VINCULO_TALLER_CONDUCTOR.md`. Cuentas: `taller.pruebas@carlink.internal` (taller, NIT `900999001-1`) y
`pruebas.features@carlink.internal` (conductor). Requiere la migración 074 aplicada. **Primero** correr las suites 1 a 14 con el flag
APAGADO (es el estado de producción) para comprobar que nada cambió; después encender `WORKSHOP_LINKS_ENABLED=true` en un backend
local aparte (`--port 8001`) y correr `backend/scripts/qa_workshop_links_e2e.py` (automatiza A, B, seguridad, fase 4 y núcleo).

| # | Caso | Cómo probarlo | Resultado esperado |
|---|---|---|---|
| 15.1 | Flag apagado = nada nuevo | Con el flag apagado abrir `/taller/<codigo>`, `/app`, Clientes y Órdenes del panel taller | No hay botón "Registrar mi vehículo con este taller", ni "Enlace para el cliente", ni "QR de vinculación", ni aviso de vínculo; `GET /api/workshop-links/mine` da 404 |
| 15.2 | Pin: ubicar por dirección | menú lateral > Configuración > Ubicación: escribir dirección y ciudad y "Guardar dirección y ubicar" | Aparece el pin (o el mensaje de que no se encontró); `workshops.latitude/longitude` quedan guardados |
| 15.3 | Pin: confirmar a mano | Arrastrar el pin o tocar el mapa y "Guardar ubicación" | Se guarda; recargar conserva la posición; un punto fuera de Colombia se rechaza |
| 15.4 | Pin en la ficha del conductor | Servicio del conductor ligado a ese taller por el vínculo (15.8) con georreferencia ON | El mapa de la ficha pública dibuja el pin; con georreferencia OFF no sale nombre ni pin |
| 15.5 | A: QR del taller, cuenta nueva | Abrir `/taller/<codigo>` sin sesión > "Registrar mi vehículo..." > registrarse > asistente | Tras el asistente aparece "Vincular con <taller>"; al aceptar, el taller lo ve en Clientes CarLink |
| 15.6 | A: no compartir WhatsApp | Aceptar sin marcar WhatsApp | El taller ve nombre y placa pero "Sin WhatsApp compartido" |
| 15.7 | A: "Ahora no" | Rechazar el aviso | No vuelve a aparecer; no hay vínculo |
| 15.8 | B: enlace de reclamo | Taller: Clientes > vehículo > "Enlace para el cliente" > abrir en incógnito | Muestra el taller y la placa enmascarada; iniciar sesión/registrarse > aviso con la placa preseleccionada |
| 15.9 | B: un solo uso y vencimiento | Reclamar dos veces el mismo enlace; generar uno nuevo y probar el viejo | El segundo intento y el enlace viejo dan "Enlace no válido o vencido" |
| 15.10 | B: historial retroactivo | Orden Entregada y pagada de un cliente sin cuenta; luego reclamar | El servicio llega al historial con la fecha de la orden, etiqueta "Del taller", sin editar ni borrar (403); el odómetro del conductor NO sube |
| 15.11 | B: placa distinta | Reclamar eligiendo un vehículo con otra placa | Rechazado con "La placa de tu vehículo no coincide" |
| 15.12 | Fase 4: ligar sin consentimiento | Taller: "Vincular" por placa a un vehículo cuyo dueño NO aceptó | 403 "El dueño del vehículo debe aceptar el vínculo primero" |
| 15.13 | Revocar | El conductor quita el vínculo | El taller deja de verlo y sus nuevas órdenes ya no llegan; lo ya sincronizado se conserva |
| 15.14 | C: candidatos | Conductor con servicios escritos "Aceitosos"; el taller "Aceitosos S.A.S." se registra | Aviso "¿Este es tu taller?"; confirmar marca los servicios como declarados (sin etiqueta "Del taller"); "No es mi taller" no insiste |
| 15.15 | Núcleo intacto | Conductor manda `workshop_id` en un servicio | Se ignora (`origin` sigue `user`) |
| 15.16 | Orden QR | Orden > "QR de vinculación" | Genera enlace/QR; al reclamarlo el origen del vínculo es `order_qr` |
| 15.17 | 320 px | Modales de enlace, aviso del conductor y editor de pin a 320 px | Sin scroll horizontal; botones tocables |
| 15.18 | Cuenta de taller no se vincula como cliente | Con sesión de TALLER abierta, entrar a `/taller/<codigo>` (de cualquier taller) | El aviso "¿Eres cliente de…?" no trae botón: dice que una cuenta de taller no puede vincularse. No navega ni cambia de panel. Por API: `POST /api/workshop-links` y `/claim` con token de taller dan 403; `/candidates` da `[]` |
| 15.19 | Una sola sesión por navegador | Abrir taller en una pestaña y conductor en OTRA pestaña del mismo navegador (también en incógnito) | Es esperado que la sesión sea una sola: la última cuenta que inicia sesión reemplaza a la otra en TODAS las pestañas. Para probar las dos cuentas a la vez usar navegadores o perfiles distintos (ej. ventana normal + incógnito, o Chrome + otro navegador). No es un fallo de seguridad ni de la app |
| 15.20 | Ficha pública del taller | Abrir `/taller/<codigo>` sin sesión y a 320 px | Un solo card con encabezado, QR siempre visible, catálogo, equipo y contacto; fuera del card, debajo: "¿Eres cliente de…?" (solo con el flag encendido) y "Reseñas de clientes" (siempre, con "Aún no hay reseñas" si no hay). Sin scroll horizontal |
| 15.21 | Foto en un servicio | Panel > Perfil > Servicios: tocar el recuadro de foto de un servicio y subir una imagen | La foto aparece en la fila; una imagen > 5 MB o un archivo que no es imagen se rechaza con mensaje; "Quitar foto" la borra |
| 15.22 | Destacar servicios (máx. 4) | Destacar servicios con foto uno por uno hasta 4; intentar el quinto | El contador marca n/4; el quinto da el mensaje de límite y no se destaca (por API: 409). Un servicio sin foto no se puede destacar (422). Quitar la foto a un destacado lo deja sin destacar |
| 15.23 | Carrusel en la ficha pública | Abrir `/taller/<codigo>` con 2 a 4 destacados | Carrusel "Servicios destacados": avanza solo cada 4 s, se detiene con el cursor o al tocar, se desliza con el dedo, flechas y puntos funcionan; con 1 destacado no hay controles; sin destacados no aparece |
| 15.24 | Carrusel a 320 px y movimiento reducido | Misma ficha a 320 px; con "reducir movimiento" activado en el sistema | Sin scroll horizontal, texto legible sobre la foto; con movimiento reducido no avanza solo |
| 15.25 | Foto de otra cuenta o externa | Por API: `PUT /api/workshops/me/services/<id>` con `photo_url` de https externo o de archivo de otro usuario | 422 "La foto debe ser un archivo subido desde tu cuenta" |
| 15.26 | Mapa en la ficha pública | Taller con pin guardado (Perfil > Ubicación): abrir `/taller/<codigo>`; luego uno sin pin | Con pin: sección "Ubicación" dentro del card con dirección, botón "Cómo llegar" y el mapa con el pin (no es un modal); a 320 px sin scroll horizontal; en celular un dedo desplaza la página y el pellizco hace zoom. Sin pin: la sección no aparece |
| 15.27 | A con vehículo sin verificar no trae historial | Taller con orden Entregada y pagada de la placa X; el conductor (vehículo X sin verificar) se vincula por el QR del taller | El vínculo se crea y el taller lo ve, pero el historial del conductor NO recibe el servicio de la orden; con el enlace de reclamo (15.8) sí llega |
| 15.28 | Km 0 retroactivo no bloquea | Tras 15.10, registrar un servicio de aceite con fecha de hace 5 días y km real | Se acepta (antes: "mayor al de un registro posterior (0 km)") |
| 15.29 | Topbar fijo en celular | `/app` a 320 y 390 px: bajar el scroll en Inicio y en una pestaña larga | El logo y los botones siguen arriba con la franja translúcida; sin scroll horizontal; claro y oscuro; en escritorio igual que antes |
| 15.30 | Pantalla de espera de la autenticación | Iniciar sesión con correo (y registrarse; luego con Google) | Anillo amarillo con candado (nunca el logo de Google), frases "Verificando… / Cifrando… / Autenticando…" y en el callback "Preparando tu sesión / Abriendo tu garaje"; con reducir movimiento no anima |

## Registro de ejecución — Aliados de negocio, suites 18 a 22 (2026-10-17)

**Entorno**: backend y frontend locales contra la Supabase real compartida, con las migraciones 077 a 080 aplicadas. Cuentas desechables `qa-aliados-*@carlink.internal` creadas y **borradas al terminar** (0 residuos verificado con `--cleanup`); ningún correo real se envió (se interceptaron). Navegador: Chromium en escritorio (1280x900) y celular (390x844).

| Prueba | Cómo se corre | Resultado |
|---|---|---|
| Funcional automática (suites 18 a 24) | `backend/scripts/qa_aliados_e2e.py` (backend en proceso, base real) | **119 de 119 OK** (corrida final 2026-10-17; el script con `--json archivo` guarda el detalle) |
| Visual y de interfaz (suites 18 a 22) | `backend/scripts/qa_aliados_visual.mjs` (Playwright, 46 capturas) | **Todo OK tras las correcciones de abajo** (corrida completa de 91 comprobaciones + repeticiones de los escenarios corregidos) |
| Unitarias | `pytest` / `vitest` / `tsc` | backend 387 OK, frontend 269 OK (+1 fallo esperado preexistente), tsc limpio |

**Capturas** (escritorio `-desk` y celular `-mob`): no se guardan en el repositorio (decisión 2026-10-17); `qa_aliados_visual.mjs` las regenera en la carpeta `OUT` que se le indique. Nombres:
- `18-1-form-*`: formulario por tipo (taller, concesionario). `18-3-admin-postulaciones-*`: Admin con lista de chequeo, invitación y habilitar certificación. `18-4-registro-invitacion-*`: registro con invitación.
- `19-panel-<tipo>-*`: panel de taller, concesionario, compraventa, CDA, repuestos, convenio y acceso vencido (solo lectura).
- `20-1-alianza-panel-*`, `20-2-checkout-con-descuento-*`: código de alianza y checkout con $32.900.
- `21-1-inventario-*`, `21-2-agregar-vehiculo-*`, `21-3-certificar-*`, `21-4-ficha-qr-*`, `21-5-ficha-publica-*`, `21-6-entrega-*`, `21-7-ficha-comprador-*`: vehículos en venta de punta a punta.
- `22-1-terminos-desk`: términos v2.5.

### Hallazgos de la prueba visual (errores reales de la aplicación, ya corregidos)
1. **Inicio del panel de un concesionario/compraventa/CDA/repuestos mostraba el panel del taller** (órdenes activas, rentabilidad, alertas de repuestos, "Ingresar vehículo", asistente de diagnóstico IA), aunque el menú estaba bien. Ahora esos tipos tienen su propio inicio ("Mi negocio": tipo, verificación, clientes, vehículos en venta, citas o stock según el tipo, y llaveros recomendados) — `ResumenAliadoModule`.
2. **La insignia junto al nombre decía "TALLER" para cualquier negocio**. Ahora dice TALLER, CDA, CONCESIONARIO, COMPRAVENTA o REPUESTOS.
3. **`/register?mode=empresa` mandaba al inicio incluso a quien ya había iniciado sesión** (redirigía mientras la sesión aún cargaba): rompía el enlace de invitación abierto en otra pestaña. Ahora espera a que cargue la sesión.
4. **La vista previa de la entrega mostraba la placa sin guion** (`QAL813`) distinta de la que queda en la cuenta del comprador (`QAL-813`). Ahora son iguales.
5. Hallazgo preexistente, **no corregido**: en la ficha de un vehículo sin ningún servicio de aceite, el tablero muestra el kilometraje actual dentro del recuadro "KM PARA CAMBIO DE ACEITE" (p. ej. "45,000"), lo que confunde. Anotado en `PENDIENTES.md`.

**Fase 4 y ajustes de interfaz (2026-10-17)**: funcional 119 de 119 (suites 18 a 24; la única falla inicial fue un NIT de prueba que sí existe en el RUES) y visual 95 de 95 + 22 de 22 (escenarios V25 del formulario, la ficha pública, el pie y la estela).

**Fase 3b (misma fecha)**: funcional 110 de 110 y visual 91 de 91 (88 en la corrida completa y las 3 restantes tras corregir la prueba: "Cargando…" capturado antes de tiempo, un botón ambiguo y la etiqueta "Certificado por CDA" que ahora corresponde en la ficha del comprador). Capturas nuevas: `23-1` a `23-8` (revisiones, por vencer, constancia con QR, constancia sin y con sesión, consignación, ficha con fotos, formulario con fotos).

Errores de la propia prueba corregidos en el camino (no eran de la aplicación): textos en mayúsculas por estilo (`text-transform`), `&amp;` del HTML, esperas cortas por la lentitud del servidor de desarrollo, un "Cerrar" ambiguo y el asistente de bienvenida de una cuenta nueva tapando la ficha.

### Comprobaciones manuales que quedan por ti (no se automatizan)
- ★ 21.12: iniciar sesión **de verdad** (Google o correo) desde `/entrega/<código>` y comprobar que vuelve ahí (la prueba usó una sesión inyectada).
- ★ 19.x / 18.x con un **celular real** y con el tema claro (la prueba corrió con el tema oscuro).
- Correo real de aprobación recibido en una bandeja (la prueba verificó el contenido, no la entrega SMTP).
- Pago real en Wompi sandbox con código de alianza (20.4 verificó el pedido y el monto, no el widget).
- Revisión de un abogado de los textos legales v2.5 (22.3).

---

## Suite 24 — Verificación automática de empresas en el RUES, Fase 4 (2026-10-17)

Requiere la migración 082. **Automatizada** (`qa_aliados_e2e.py`; consulta el RUES de verdad) y **visual** (bloque en Admin > Postulaciones).

| # | Caso | Resultado esperado | Auto | Visual |
|---|---|---|---|---|
| 24.1 | Consulta real | Una empresa pública conocida sale encontrada, ACTIVA, renovada, con DV y nombre que coinciden; un NIT inexistente sale `not_found` (nada inventado) | sí | — |
| 24.2 | Al postular | El NIT se consulta solo y queda guardado (empresa, estado, cámara, CIIU, renovación) | sí | V18.3 |
| 24.3 | "Consultar RUES" | El admin repite la consulta y se actualiza la fecha; no cambia el estado de la postulación | sí | V18.3 |
| 24.4 | RUES caído | La postulación igual se guarda y queda `unavailable` | sí | — |
| 24.5 | Nivel alto | CDA y compraventa no se aprueban con la lista de chequeo incompleta (422 `checks_incomplete`); un taller sí (el panel solo advierte) | sí | — |
| 24.6 ★ | Aviso al aprobar | Con resultado "con problemas" o "no encontrada" el aviso de aprobar lo menciona | — | a mano |
| 24.7 ★ | `revalidate_businesses.py` | Lista los negocios verificados con su estado en el RUES (solo lee) | — | a mano |

## Suite 25 — Ajustes de interfaz del 2026-10-17

Casos **visuales** automatizados (`qa_aliados_visual.mjs`, escenarios V25) en escritorio y celular.

| # | Caso | Resultado esperado |
|---|---|---|
| 25.1 | Ayudas del formulario | Botón "?" junto a cada etiqueta con mensaje flotante (clic, mouse, foco); no quedan textos fijos de ayuda bajo los campos; Escape lo cierra; el mensaje cabe en la pantalla (320 px incluido) |
| 25.2 | Alineación | Los campos de una misma fila tienen el mismo `top` y todos miden 46 px; "Ver en mapa" mide igual que la dirección |
| 25.3 | Escáner y documento | El escáner dice "Cámara de Comercio o RUT (cualquiera de los dos sirve)"; ya no hay botón de subir documento al final |
| 25.4 | Pie de página | Solo Instagram y Facebook, en dorado CarLink; sin el ícono de WhatsApp (el enlace de texto de contacto sigue) |
| 25.5 | Estela del mouse | Sigue en la landing; no hay canvas de partículas en `/app/negocio` ni en `/app` |
| 25.6 | Ficha pública del taller | Sin "Nuestro equipo" ni descripción; Contacto con dirección, teléfono, correo y horario en tarjetas compactas, y WhatsApp, Instagram, Facebook y sitio web como íconos redondos dorados con hipervínculo (nueva pestaña); cabe en laptop de 640 px de alto y en 320 px sin scroll horizontal. El Contacto va en una segunda columna junto al nombre, el QR no cambia; un correo/nombre/especialidad muy largos se cortan con límites (correo en 2 líneas, especialidades máx. 4 + "+N") sin tapar nada |
| 25.7 | Reseñas | Ya no hay tarjeta de reseñas al pie; la calificación del encabezado (en dorado, con estrellas) abre un modal con promedio, estrellas, comentarios, "cliente verificado" y respuesta del taller; se cierra con su botón y con Escape |
| 26.1 | Selector de tipo de negocio | El formulario no tiene `<select>`/`<datalist>` nativos; el desplegable es el amarillo de CarLink (hover y opción elegida), en tema claro y oscuro, escritorio y celular (V26.1) |
| 26.2 | Escanear y subir | "Escanear Cámara de Comercio o RUT" abre el escáner con cámara (Tomar foto, Usar esta foto, Escape cierra); el botón de texto "Subir foto o PDF" abre el selector de archivos (V26.2) |
| 26.3 | Logos de aliados en /taller | `GET /api/workshop-applications/public-allies` (solo aprobados con logo autorizado); el logo más reciente toma la primera posición de "Marcas y aliados" sin recargar, no crece la franja y enlaza a su ficha (V26.3, pytest) |
| 26.4 | Condiciones del logo | `POST /api/workshop-applications/upload?kind=logo` solo acepta PNG/JPG/WebP legibles, lado menor >= 120 px, <= 6000 px, proporción ancho/alto entre 0,4 y 5, no en blanco (422 con código `logo_*`); recorta márgenes, reduce a máx. 600x300 y guarda PNG (pytest `test_logo_image.py`; el formulario muestra el motivo en claro) |
| 26.6 | Logo opcional | El formulario se envía sin logo (el backend ya no responde `logo_required`); sin logo no aparece la casilla de autorizar mostrarlo y `logo_authorized` queda en falso; la postulación en Admin muestra "Sin logo"; el perfil público no muestra imagen. Con logo, el perfil público lo muestra sobre una placa clara junto al nombre (pytest + captura del perfil con y sin logo) |
| 26.7 | Logo desde el panel lateral | En `/app/negocio` > "Perfil y configuración del taller" (panel derecho), campo Logo con vista previa, "Subir/Cambiar logo" y "Quitar"; un logo muy pequeño se rechaza con mensaje claro; al subir se normaliza (`POST /api/workshops/me/logo`) y aparece al instante en el campo, la cabecera del panel y el botón de perfil de la barra superior; `GET /api/workshops/<codigo>` lo devuelve; "Quitar" lo borra (V27.1, 11 de 11) |
| 26.5 ★ | Logo real en la franja | Subir un logo real (con y sin fondo transparente), aprobarlo con la autorización marcada y ver cómo queda en "Marcas y aliados" y en el perfil público. Sin logo, el negocio no sale en la franja |
| 25.8 ★ | Ayuda en celular real | Tocar "?" abre el mensaje, tocar afuera lo cierra, no se corta por el borde |
| 25.9 ★ | Estela en la app | Mover el mouse por `/app` y `/app/negocio` ya no deja estela amarilla |

## Suite 23 — Revisiones RTM del CDA, consignación de llaveros y fotos, Fase 3b (2026-10-17)

Requiere las migraciones 077 a 081. **Automatizada** (`qa_aliados_e2e.py`) y **visual** (`qa_aliados_visual.mjs`). ★ = además a mano.

| # | Caso | Resultado esperado | Auto | Visual |
|---|---|---|---|---|
| 23.1 | Quién tiene revisiones | Solo el CDA; taller, concesionario y compraventa reciben 403 | sí | V19 cda |
| 23.2 | CDA sin habilitación | 403 `not_enabled`; el admin lo habilita aparte de la aprobación | sí | V23.1 |
| 23.3 | Datos inválidos | Fechas viejas/futuras/vigencia absurda, certificado y placa inválidos: 422 sin gastar intentos | sí | — |
| 23.4 | Antifraude de kilometraje | Menos que el historial de la placa en otra cuenta: 422 sin cifras; salto absurdo: 422; el 4.º intento por placa en 24 h: 429; certificado repetido: 409 | sí | — |
| 23.5 | Constancia | Con el código se ve la revisión; **no escribe nada** en la cuenta del propietario; quien no tiene el vehículo recibe `no_vehicle` y el código sigue vigente | sí | V23.5 |
| 23.6 | El propietario acepta | Diagnóstico de revisión con vigencia + lectura `cda_inspection` "Certificado por CDA"; no se acepta dos veces; sin autorización no se crea cliente | sí | V23.5b-d |
| 23.7 | Con autorización | Queda como cliente del CDA y sale en "Por vencer" con contacto; las no aprobadas y las de vigencia larga no salen | sí | V23.3 |
| 23.8 | Km que no cuadra | Se guarda la revisión pero NO el kilometraje | sí | — |
| 23.9 | Constancia vencida / inventada | 410 / 404 | sí | — |
| 23.10 | Acceso vencido del CDA | Lee; registrar da 402 | sí | — |
| 23.11 | Consignación sin partner | "Sin cupo"; un taller no tiene la sección (403) | sí | — |
| 23.12 | Vincular partner | Solo a un concesionario verificado (taller 422); un negocio, un partner (409) | sí | — |
| 23.13 | Vista del concesionario | Cupo, disponibles, activados y listado; nunca códigos ni compradores; desvincular lo deja "sin cupo" | sí | V23.6 |
| 23.14 | Fotos | Solo archivos propios, sin repetidas, máximo 6; externas/ajenas 422; la ficha pública las entrega | sí | V23.7, V23.8 |
| 23.15 ★ | Registrar una revisión real desde la interfaz | Aviso de éxito, aparece en el historial, genera enlace y QR de constancia | — | V23.2, V23.4 |
| 23.16 ★ | Subir fotos reales desde el formulario | Miniaturas con botón para quitar; se ven en la ficha pública | — | V23.7, V23.8 |
| 23.17 ★ | Llegar a `/constancia/<código>` sin sesión e iniciar sesión | Vuelve a la constancia (no a `/app`) | — | V23.5 (sesión inyectada) |

## Suite 21 — Vehículos del aliado, kilometraje certificado y entrega, Fase 3 (2026-10-17)

Requiere las migraciones 077 a 080. **Automatizada** (`backend/scripts/qa_aliados_e2e.py`, base real con cuentas desechables que se borran) y **visual** (`backend/scripts/qa_aliados_visual.mjs`, Chromium en escritorio y en celular). Los casos con ★ se prueban a mano además.

| # | Caso | Resultado esperado | Auto | Visual |
|---|---|---|---|---|
| 21.1 | Concesionario y compraventa agregan un vehículo | Placa normalizada, enlace público de 8 caracteres, no publicado; taller, CDA y repuestos reciben 403 | sí | V21.1 |
| 21.2 | Placa repetida / inválida | 409 `plate_exists` / 422 | sí | V21.2 |
| 21.3 | Publicar y abrir la ficha pública | Responde sin placa completa (`QAL•••`) ni contacto; km sin certificar dice "Declarado por el vendedor"; inexistente da 404 | sí | V21.5 |
| 21.4 | Negocio que deja de estar verificado | La ficha se oculta (404) y no puede publicar (403) | sí | — |
| 21.5 | Certificar sin habilitación | 403 `not_enabled`; el admin habilita solo concesionario/compraventa (taller 422) y el listado muestra el permiso | sí | V18.3c |
| 21.6 | Certificar / declarar | Concesionario: "Certificado por concesionario"; compraventa: "Declarado por compraventa verificada"; la ficha pública muestra el km certificado; no se puede bajar | sí | V21.3, V21.5 |
| 21.7 | Antifraude de odómetro | Menos que el historial de la placa en otra cuenta: 422 `km_below_history` sin cifras; salto absurdo: 422; máximo 3 intentos por vehículo cada 24 h (el 4.º da 429 aunque el valor sea bueno); pasada la ventana un valor coherente se acepta | sí | — |
| 21.8 | Generar la entrega | Un solo uso; vista previa con placa, km y vendedor; generar otro invalida el anterior; solo se guarda el hash | sí | V21.4, V21.6 |
| 21.9 | El comprador recibe el vehículo | 201; aparece en su cuenta (placa con guion, marca y modelo); su odómetro tiene la lectura `dealer_delivery` certificada; el vendedor lo ve "entregado" y retirado de la venta; la ficha pública desaparece; el enlace no se reusa; con autorización queda como cliente del vendedor, sin ella no | sí | V21.6, V21.7 |
| 21.10 | Cuenta persona que ya tiene un vehículo | 403 `keychain_required` y el código sigue vigente | sí | — |
| 21.11 | Entrega vencida | 410 en la vista previa y al recibir | sí | — |
| 21.12 ★ | Iniciar sesión desde la entrega | Sin sesión: botón de iniciar sesión; al volver, sigue en `/entrega/<código>` (no en `/app`) | — | V21.6 |
| 21.13 | Vehículo entregado | No se borra, edita ni recertifica (409) | sí | — |
| 21.14 | Código de entrega inventado | 404 | sí | — |
| 21.15 | Acceso vencido del aliado | Lee su inventario; crear da 402 | sí | — |
| 21.16 ★ | Ficha del comprador | "Certificado por concesionario · <nombre>" junto al kilometraje | sí (API) | V21.7 |

## Suite 22 — Texto legal v2.5 (2026-10-17)
- [ ] 22.1 Términos de uso: versión 2.5 con fecha del 17 de octubre de 2026; sección 3 (tipos de negocio, aprobación previa, acceso gratuito, solo lectura, fichas y entrega, qué significa la etiqueta de kilometraje) y sección 3A (código de alianza). Visual: V22.1.
- [ ] 22.2 Política de privacidad: datos de código de alianza y de entrega de vehículos, lectura de la Cámara de Comercio por el proveedor de IA y servicio de mapas. Descargar el PDF y comprobar que sale lo mismo.
- [ ] 22.3 ★ Revisión de un abogado de las secciones 3 y 3A y de la mención de certificar información de vehículos (pendiente, ver `PENDIENTES.md`).

## Suite 20 — Código de alianza y descuento de llaveros, Fase 2 (2026-10-16)

Requiere las migraciones 077 a 079. Usar un negocio de prueba verificado (creado con invitación) y Wompi en sandbox; borrar los pedidos de prueba al terminar.
- [ ] 20.1 Panel > "Código de alianza": muestra `TLR-XXXXX`, el enlace `/?ref=...`, "Copiar enlace" y "Compartir por WhatsApp"; 0 llaveros al inicio. Un negocio sin verificar ve el aviso de que aún no da descuento.
- [ ] 20.2 Abrir el enlace `/?ref=TLR-XXXXX` en otra ventana (sin sesión) y entrar a comprar: el campo de código aparece prellenado y aplicado; el total pasa de $39.900 a $32.900 y se ve "Descuento por alianza con <negocio>".
- [ ] 20.3 Cantidad 3: el descuento es $21.000 y el total $98.700; cambiar la cantidad actualiza el descuento.
- [ ] 20.4 Pagar con Wompi sandbox: el monto del widget es el rebajado; el pedido queda con `alliance_code`, `discount_cents` y el monto cobrado; Admin > Pedidos muestra "Alianza TLR-XXXXX (-$7.000)".
- [ ] 20.5 Código inexistente, mal escrito o de un negocio sin verificar: "no existe o no está activo" y el total no cambia.
- [ ] 20.6 Con sesión del dueño del negocio, su propio código responde "No puedes usar tu propio código".
- [ ] 20.7 Dejar vencer el acceso del negocio (`access_until` en el pasado): su código deja de dar descuento.
- [ ] 20.8 Superar el tope (30 llaveros en 30 días, o bajar `ALLIANCE_MONTHLY_CAP_UNITS` para probar): "alcanzó el máximo de descuentos de este mes".
- [ ] 20.9 Con un código válido, mandar `POST /api/shop/orders` a mano con `amount_in_cents`/`discount_cents` inventados: se ignoran y el monto lo calcula el servidor.
- [ ] 20.10 Pedido contraentrega con código: el correo y la notificación muestran el monto con descuento. Pedido sin código: igual que antes ($39.900 por unidad).
- [ ] 20.11 En el panel, tras el pedido pagado, las cifras suben (llaveros este mes, en total, pedidos) y no aparece ningún dato del comprador.
- [ ] 20.12 Términos de uso: la sección 3A y la versión 2.4 se ven en el modal y en el PDF.

## Suite 19 — Capacidades por tipo y periodo de acceso, Fase 1 (2026-10-16)

Requiere las migraciones 077 y 078 aplicadas. Crear negocios de prueba (uno por tipo) con postulación e invitación reales; borrarlos al terminar.
- [ ] 19.1 Aprobar con "6 meses gratis": el correo dice 6 meses; al crear la cuenta, `GET /workshops/me` devuelve `access_plan=founder`, `access_until` a ~180 días de hoy y `access_status=active`.
- [ ] 19.2 Aprobar como "Convenio": `access_plan=convenio`, `access_until=null`, el menú lateral no muestra aviso de vencimiento.
- [ ] 19.3 Taller: el menú muestra Mi taller, Clientes, Órdenes, Inventario, Citas, Notificaciones y Rentabilidad, y los botones de Diagnóstico IA y Nueva orden.
- [ ] 19.4 Concesionario / compraventa: solo Mi taller, Clientes y Notificaciones; `GET /api/workshops/me/work-orders` responde 403 `capability_not_available`.
- [ ] 19.5 CDA: Mi taller, Clientes, Citas y Notificaciones; sin órdenes ni inventario. Repuestos: Mi taller, Inventario y Notificaciones.
- [ ] 19.6 Vencer el acceso a mano (`access_until` en el pasado): el panel sigue abierto con el aviso rojo "modo solo lectura"; `GET` funciona y `POST /api/workshops/me/inventory` responde 402 `access_expired`; el botón "Renovar mi plan" abre WhatsApp.
- [ ] 19.7 Restaurar `access_until` al futuro: vuelve a escribir sin cerrar sesión.
- [ ] 19.8 Cuenta de conductor con meses de antigüedad que registra un negocio con invitación: ya no ve "Suscripción vencida" (el reloj no sale de `profiles.created_at`).
- [ ] 19.9 La ficha pública del vehículo de prueba de un negocio con acceso vigente sigue activa pasados 7 días; con el acceso vencido responde `trial_expired`.
- [ ] 19.10 Un negocio nuevo sin invitación (flag apagado) queda en `trial` de 7 días, como antes.
- [ ] 19.11 `GET /api/workshops/{code}` (ficha pública) NO incluye `capabilities` ni `access_*`.

## Suite 18 — Aliados de negocio, Fase 0: tipo, validación e invitación (2026-10-16)

Requiere la migración 077 aplicada. Usar un correo propio y un NIT de prueba válido; borrar las filas y el taller de prueba al terminar.
- [ ] 18.1 Formulario: "Tipo de negocio" con 4 opciones; "Tipo de taller" y "Especialidades" solo con Taller; "Marcas que vendes" solo con Concesionario; Compraventa y Repuestos sin ninguno de los dos.
- [ ] 18.2 Enviar como Compraventa: llega sin subtipo ni especialidades (ver en Admin > Postulaciones).
- [ ] 18.3 Admin: marcar la lista de chequeo persiste al recargar; "Aprobar" avisa de lo que falta marcar.
- [ ] 18.4 Aprobar: llega al correo "Tu registro fue exitoso" con el enlace; el panel muestra "Invitación enviada, vence el ...".
- [ ] 18.5 Abrir el enlace sin sesión: lleva al inicio de sesión de negocio y, al entrar, a `/register?mode=empresa` con los datos precargados, el NIT bloqueado y el aviso de postulación aprobada.
- [ ] 18.6 Crear la cuenta: el taller nace verificado, con su logo y el tipo de la postulación; el panel marca la invitación como usada; abrir el enlace otra vez da "ya se usó".
- [ ] 18.7 Cambiar el NIT por otro (por API) rechaza con "El NIT no coincide"; un token inventado da "no es válido".
- [ ] 18.8 "Reenviar invitación": llega un correo nuevo y el enlace anterior deja de servir. Pasar una aprobada a Rechazada invalida su invitación sin usar.
- [ ] 18.9 Registro sin invitación sigue funcionando (flag apagado); con `WORKSHOP_INVITE_REQUIRED=true` responde "invite_required".

## Suite 17 — Formulario de postulación de talleres y mapa en vivo (2026-10-16)

Usar NIT de prueba válidos; borrar después las filas creadas en `workshop_applications`.
- [ ] 17.1 Escribir `900123456` en NIT y salir del campo: avisa que falta el dígito y "Usar 900123456-8" lo corrige.
- [ ] 17.2 Correo `juan@gmial.com`: ofrece `juan@gmail.com`. Teléfono `12345`: error. Enviar vacío: marca en rojo y lleva al primer error.
- [ ] 17.3 "Ver en mapa" con dirección y ciudad: el pin aparece, se puede arrastrar o tocar el mapa; "Confirmar" deja el botón en "Ubicación confirmada". Cambiar la dirección invalida la confirmación.
- [ ] 17.4 "Escanear Cámara de Comercio" con una foto y un PDF: llena los campos (marcados "Del documento"), adjunta el archivo; una imagen ilegible muestra aviso y deja llenar a mano.
- [ ] 17.5 Ya no existen "Vehículos atendidos" ni "Foto de la fachada".
- [ ] 17.6 Enviar una postulación en Duitama: la tarjeta pasa de 1 a 2 talleres, "Talleres en red" y el círculo del mapa suben y aparece el pin. Una ciudad nueva aparece como círculo nuevo. Marcarla "Rechazada" en Admin la quita.
- [ ] 17.7 320 px y escritorio: sin scroll horizontal; el modal del mapa cabe y se puede cerrar con Escape.

## Suite 16 — Ciberseguridad y resistencia a carga (2026-10-15, por ejecutar)

Origen: auditoría de seguridad del 2026-10-15 (hallazgos S1–S16 en `docs/PENDIENTES.md` → "Ciberseguridad"). **Todo se corre
contra local o staging con la cuenta de `backend/scripts/qa_test_account.py`, nunca producción** (comparten base de Supabase y
hay llaveros reales; ver `docs/INCIDENT_RESPONSE.md`). Antes de cada prueba de carga avisar y tener `curl /api/health` a mano
para confirmar recuperación.

Herramientas: OWASP ZAP, Schemathesis, Nuclei, k6/Locust, Bandit, Semgrep, pip-audit, npm audit, Trivy, Gitleaks, Burp Community.

| # | Caso | Cómo probar | Resultado esperado |
|---|---|---|---|
| 16.1 | Dependencias frontend | `cd frontend && npm audit --omit=dev` | 0 críticas/altas (hoy: 1 crítica, 4 altas; Next.js) |
| 16.2 | Dependencias backend e imagen | `pip-audit -r backend/requirements.txt`; `trivy image` de la imagen del backend | Sin críticas/altas sin justificar |
| 16.3 | Secretos en git | `gitleaks detect` sobre todo el historial | Solo el incidente de 2026-07-27 (ya rotado) |
| 16.4 | Análisis estático | `bandit -r backend/app`; `semgrep --config auto` | Sin hallazgos altos sin revisar |
| 16.5 | Cabeceras de seguridad (frontend) | `curl -sI https://<staging>/`; securityheaders.com | CSP, X-Content-Type-Options, frame-ancestors/X-Frame-Options, Referrer-Policy, Permissions-Policy presentes (hoy solo HSTS) |
| 16.6 | `/docs` y `/openapi.json` | `curl -s -o /dev/null -w "%{http_code}" <api>/docs` con `ENVIRONMENT=production` | 404 (hoy 200) |
| 16.7 | CORS | `curl -H "Origin: https://evil.example" -I <api>/api/health` y preflight con método raro | Sin `access-control-allow-origin` para orígenes ajenos; métodos/cabeceras acotados |
| 16.8 | Rate limit `POST /shop/orders` | 30 POST seguidos desde una IP | 429 pasado el umbral (hoy ilimitado) |
| 16.9 | Rate limit `POST /waitlist` | Ídem | 429; no se disparan correos sin límite |
| 16.10 | Rate limit OCR e IA | 20 POST seguidos a `/ocr/scan` y `/workshops/me/ai-diagnose` con la cuenta QA | 429 y sin saturar CPU; el resto de la API sigue respondiendo |
| 16.11 | Rate limit `/shop/orders/{ref}/confirm` y `GET /shop/orders/{ref}` | Ráfaga con referencias inventadas | 429; no hay llamada a Wompi por cada petición |
| 16.12 | Redis caído | Apuntar `REDIS_URL` a un host inexistente y repetir 16.8 y el límite NFC | La API no devuelve 500; política definida (hoy falla abierto) |
| 16.13 | IP del cliente | Enviar `X-Forwarded-For: 1.2.3.4, 5.6.7.8` en tickets, analytics y found_requests | El límite cuenta la IP real del proxy (última entrada), no la inventada ni la del proxy compartido |
| 16.14 | Upload: SVG con script | Subir `x.svg` con `<script>` y abrir `/api/upload/files/<key>` | Rechazado (415/400) o servido como descarga con `nosniff`; nunca ejecuta |
| 16.15 | Upload: tipo falso | `.html` o `.exe` con `Content-Type: image/png` | Rechazado por magic bytes |
| 16.16 | Upload: tamaño | Archivo de 200 MB, y 5 subidas simultáneas | Corta antes de cargarlo entero en memoria; el servicio no se cae |
| 16.17 | Upload: extensión | Nombre `a.php.jpg`, `a.`, `a/../b` | La clave en R2 usa extensión de lista permitida |
| 16.18 | IDOR vehículos/documentos/gallery/odómetro/partes | Con cuentas A y B, usar el id de A con el token de B en cada endpoint | 404/403 siempre |
| 16.19 | IDOR taller (clientes, órdenes, inventario, citas) | Ídem con dos talleres | 404/403 siempre |
| 16.20 | Escalada de rol | Cuenta persona contra `/admin/*`, `/partners/*` y `/workshops/me/*` | 403 |
| 16.21 | Fuerza bruta de códigos | 50 intentos a `/nfc/activate`, clave de partner y código de vínculo de taller | Bloqueo tras el umbral; mensaje genérico |
| 16.22 | Webhooks | Wompi y WhatsApp: firma inválida, vacía, repetida (replay) y con timestamp viejo | 400/401; el replay no duplica efectos |
| 16.23 | Carga | k6: 50–200 usuarios virtuales sobre `/api/health`, `/nfc/*` público y un endpoint autenticado | p95 aceptable; 0 errores 5xx; el pool de BD (20+10) no se agota; recuperación al terminar |
| 16.24 | Tiempos de espera | Simular DeepSeek/Wompi/Supabase lento (timeout largo) | Las peticiones cortan por timeout y no acumulan conexiones |
| 16.25 | Cuerpos grandes | JSON de 5 MB a `/shop/orders`, `/waitlist` y tickets; strings de 1 MB | 413/422; sin consumo desmedido |
| 16.26 | Escaneo ZAP | ZAP baseline y luego full scan con `openapi.json` de staging | Sin altos sin triaje |
| 16.27 | Fuzzing API | `schemathesis run <staging>/openapi.json --checks all` | Sin 500 |

Registrar resultado y fecha por caso al ejecutar; cada fallo se vuelve ítem en `docs/PENDIENTES.md` → "Ciberseguridad".
