# Panel del taller y ficha pública del taller (2026-10-14)

> **Este documento es solo del modo TALLER.** No describe nada del modo conductor (la ficha del vehículo, `/nfc/[token]`, "Mi perfil" del conductor).
> Si algo de aquí menciona al conductor es únicamente para marcar la frontera. Estado: **en local, sin commitear ni desplegado**.

Relacionados: `PLAN_VINCULO_TALLER_CONDUCTOR.md` (vínculo por QR y pin del mapa, fases 0 a 5), `PLAN_PARIDAD_UI_TALLERPRO.md` (panel de negocio),
Suite 15 de `PRUEBAS_FUNCIONALES.md` (casos 15.18 a 15.26 de este documento).

---

## 1. Glosario: taller y conductor no son lo mismo

| | **Modo TALLER** (este documento) | **Modo CONDUCTOR** (no se toca aquí) |
|---|---|---|
| Tipo de cuenta | `profiles.account_type` = `taller` o `empresa` (`isBusinessAccount`) | `persona` |
| Panel principal | `/app/negocio` (`frontend/src/app/app/negocio/page.tsx`) | `/app` (`frontend/src/app/app/page.tsx`) |
| Perfil | **Panel lateral derecho** "Perfil y configuración del taller" (botón con su nombre, arriba a la derecha) | Panel lateral derecho "Mi perfil" (datos personales y del vehículo) |
| Ficha pública | `/taller/<codigo>` (código `TLR-XXXXX`), página `frontend/src/app/(public)/taller/[code]/page.tsx` | `/nfc/<token>` (ficha del vehículo por llavero NFC/QR) |
| Qué publica | Nombre, contacto, catálogo, equipo, ubicación, reseñas del **taller** | Datos del **vehículo** y su historial |
| Calificaciones | Las **recibe** (reseñas de clientes) | Las **da** al taller (aviso `RatingPromptBanner`) |

Reglas de frontera que se verificaron:
- Una cuenta de taller **no puede vincularse como cliente** de ningún taller (servidor: 403). Ver sección 6.
- `/app` redirige las cuentas de taller a `/app/negocio`; el panel de negocio avisa "Esto es para talleres y empresas" a una cuenta conductor.
- Nada de lo de este documento cambia el modo conductor. Los arreglos de la misma sesión que sí tocan al conductor (fechas, botón "Registrar nuevo servicio",
  privacidad de `/nfc/[token]`) están en `PLAN_VINCULO_TALLER_CONDUCTOR.md` y `PENDIENTES.md`, no aquí.

**Una sola sesión por navegador.** La sesión vive en `localStorage` (Supabase). Si se abre taller en una pestaña y conductor en otra del **mismo** navegador
(incluido el modo incógnito), la última cuenta que inicia sesión reemplaza a la otra en **todas** las pestañas. No es un fallo: para probar las dos cuentas a la
vez hay que usar navegadores o perfiles distintos (ventana normal + incógnito, o Chrome + otro navegador). Caso 15.19.

---

## 2. Panel "Perfil y configuración del taller"

- **Dónde:** `/app/negocio`, botón de perfil arriba a la derecha (tu nombre con la flecha). Es un **panel lateral derecho de altura completa**
  (560 px, `max-width: 100vw`), con la misma forma que "Mi perfil" del conductor. **No** es un modal centrado y **no** está en el menú lateral izquierdo
  (se probó un grupo "Configuración" en el menú izquierdo y se revirtió: no era lo pedido).
- **Componente:** `frontend/src/components/negocio/PerfilModule.tsx`, montado en un panel dentro de `negocio/page.tsx` (`showPerfilModal`).
  `PerfilModule` acepta un prop opcional `section` (sin usar hoy): si se pasa, oculta las pestañas internas y muestra solo esa sección.
- **Pestañas internas:** Datos del taller, Ubicación, Mecánicos, Servicios. (**Reseñas se retiró**, sección 5.)

### Datos del taller
Ficha pública (interruptor publicada/oculta), nombre, **NIT (solo lectura)**, **teléfono**, **descripción**, eslogan, tipo, email, horario, IVA, encargado y
cargo, especialidades, redes (Instagram, Facebook, sitio web, WhatsApp) y sellos de fidelidad.
Teléfono y descripción se agregaron porque se pedían en el registro inicial y no había forma de editarlos después (`WorkshopUpdate` ya los aceptaba).

### Ubicación
Dirección, ciudad y **pin del mapa** (`WorkshopLocationEditor.tsx`, fase 0b del plan del vínculo): "Guardar dirección y ubicar" geocodifica con Nominatim
(aproximado), el taller arrastra el pin o toca el mapa y "Guardar ubicación". Solo se acepta un punto dentro de Colombia. Guardar otra cosa no mueve el pin;
una dirección nueva que no se ubica lo borra.

### Servicios (catálogo con fotos)
Ver sección 4.

---

## 3. Ficha pública del taller `/taller/<codigo>`

Página pública, sin sesión: `GET /api/workshops/{code}` trae mecánicos activos, catálogo y reseñas en una sola respuesta. Un taller con la ficha oculta responde
404 "Workshop profile is not published".

### Estructura (todo el taller en **un solo card**, como la ficha del vehículo del conductor, más ancho: 780 px)
1. Encabezado: logo CarLink y sello "Verificado" si aplica.
2. **Identidad + QR al frente:** a la izquierda código, nombre, eslogan, píldoras (ciudad, teléfono, horario, calificación) y especialidades y descripción;
   a la derecha el **QR de la ficha**, siempre visible, con "Escanea esta ficha" y **Descargar PNG** debajo (solo PNG). En móvil el QR pasa debajo, centrado.
   El patrón negro se agrandó (160 px, margen interno mínimo) sin invadir el margen blanco. *No se probó escaneándolo con un lector.*
3. **Catálogo de servicios y Ubicación al mismo nivel** (`.taller-pair`): dos columnas de 260 px de alto en pantallas anchas; apiladas en móvil.
   - **Catálogo = carrusel grande** con nombre, categoría y precio **dentro de la imagen**.
   - **Ubicación = mapa incrustado** (no modal) con la dirección y "Cómo llegar" dentro del mapa.
   - Si falta uno de los dos, el otro ocupa todo el ancho.
4. Dos columnas: "Otros servicios" (los que no están en el carrusel, filas compactas) y a la derecha Equipo y Contacto.
- **Fuera del card, debajo, en este orden:** "¿Eres cliente de…?" (CTA del vínculo, solo con el flag encendido) y "Reseñas de clientes".

### Carrusel del catálogo (`FeaturedCarousel` en la misma página)
- Muestra los servicios **destacados con foto (máx. 4)**; si el taller no destacó ninguno, los **primeros 4 con foto**.
- Avanza solo cada 4 s; se pausa con el cursor, el foco o al tocar; se desliza con el dedo; flechas y puntos (con fondo oscuro para verse sobre fotos claras).
- **No avanza solo** si el sistema pide "reducir movimiento". Con una sola foto no hay controles.
- Altura fija de 260 px (no se usa `aspect-ratio` + `min-height`: en móvil ensanchaba la imagen y la sacaba del card).

### Mapa (`frontend/src/components/WorkshopMap.tsx`)
- Solo aparece si el taller confirmó su pin (`latitude`/`longitude` no nulos). Leaflet con `dynamic({ ssr: false })`.
- En pantallas táctiles un dedo desplaza la página y no el mapa (pellizco y botones +/- sí hacen zoom). Zoom arriba a la derecha, atribución de
  OpenStreetMap arriba a la izquierda (abajo va la dirección sobre el mapa).
- "Cómo llegar" abre `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lon>`.

### Reseñas (en la ficha)
Siempre visibles: promedio, estrellas y lista con la respuesta del taller si existe; sin reseñas dice "Aún no hay reseñas de clientes."

### Responsive verificado
1280, 768, 390 y 320 px sin scroll horizontal.

---

## 4. Catálogo de servicios con fotos

**Migración `supabase/migrations/075_workshop_service_photos.sql`** (aditiva, con default; aplicada a mano en la base compartida el 2026-10-14):
`workshop_service_items.photo_url TEXT NOT NULL DEFAULT ''` y `is_featured BOOLEAN NOT NULL DEFAULT FALSE`. Ya están en el modelo `WorkshopServiceItem`.

**Reglas (servidor, `backend/app/routers/workshop_services.py`):**
| Regla | Respuesta |
|---|---|
| Máximo **4 destacados** por taller (`MAX_FEATURED`; se bloquea la fila del taller para que dos peticiones a la vez no se pasen) | 409 "Solo puedes destacar hasta 4 servicios" |
| Un destacado necesita foto | 422 "Un servicio destacado necesita foto" |
| Quitar la foto a un destacado lo deja **sin destacar** (libera cupo) | 200 |
| La foto solo puede ser un archivo **subido por el propio usuario**: `/api/upload/files/<id-usuario>/<uuid>.<ext>`. Ni URL externa, ni archivo de otro usuario, ni `javascript:` | 422 "La foto debe ser un archivo subido desde tu cuenta" |

**Interfaz (panel > Perfil > Servicios):** cada servicio tiene un recuadro de foto (tocar para subir o cambiar), "Quitar foto", botón **Destacar** y el contador
"Destacados: n/4". El alta de servicio también admite foto y destacar. Validación en el cliente: debe ser imagen y pesar ≤ 5 MB.
Las fotos se suben con `POST /api/upload` (almacenamiento R2 propio, protegido por sesión) y se sirven sin sesión por `GET /api/upload/files/<key>` (proxy).

**Comportamiento a recordar:** una foto subida **sin destacar** igualmente aparece en el carrusel si el taller no destacó ninguno (fallback de la sección 3).
En cuanto destaque uno, el carrusel muestra solo los destacados.

Pendiente de formato (no se tocó): las horas estimadas se muestran como `0.00h`.

---

## 5. Reseñas: qué se retiró y qué sigue funcionando

- **Se retiró** la pestaña "Reseñas" del panel del taller: ya **no se pueden registrar reseñas a mano** desde la interfaz ni **responder** desde ahí.
  La base tenía 0 reseñas, así que no se perdió ningún dato.
- **Sigue funcionando** la calificación del **cliente** (modo conductor): `POST /api/reviews` con `target_type=workshop` guarda una reseña
  (`source = cliente_autenticado`, una por cliente y taller, se edita si repite) y recalcula `workshops.rating`. El taller la **ve** en su ficha pública.
- **Decisiones abiertas** (no se hicieron, a la espera del dueño):
  1. **Responder reseñas:** hoy nadie puede escribir `manager_response` desde la interfaz (la ficha sí la muestra si existe). Propuesta: botón "Responder"
     en la ficha, visible solo para el dueño con sesión.
  2. **Cerrar `POST /api/workshops/me/reviews`:** sigue abierto; un taller podría crear reseñas propias por API e inflar su puntaje. Recomendado cerrarlo.
  3. Verificar con un conductor real que el aviso de calificar al taller sí se muestra: la base tiene la encuesta `workshop_service` pero el código busca
     `workshop_service_registered`; 0 reseñas sugiere que quizá nunca apareció. Los servicios que llegan por el vínculo (etiqueta "Del taller") no disparan el aviso.

---

## 6. Blindajes del modo taller

- **Una cuenta de taller/empresa no se vincula como cliente** (`backend/app/routers/workshop_links.py`, `_require_driver`): `POST /api/workshop-links`,
  `POST /api/workshop-links/claim` y `POST /api/workshop-links/candidates/confirm` responden **403**; `GET /candidates` devuelve `[]`.
  En la ficha pública, un taller con sesión no ve el botón "Registrar mi vehículo con este taller": ve un aviso y no se navega ni se guarda ningún pendiente.
  `WorkshopLinkPrompt` ya no se monta para cuentas de negocio (`!isBusiness`). El flag `WORKSHOP_LINKS_ENABLED` sigue apagado por defecto.
- **Foto del catálogo**: solo archivos propios (sección 4).
- **Un `.env` local con el flag encendido ya no rompe los tests:** `tests/conftest.py` apaga el flag por defecto en pytest (las pruebas que lo necesitan usan `flag_on`).

---

## 7. Cómo se verificó (y qué no)

Todo contra el backend y el frontend **locales** y la **base compartida**, con **cuentas desechables `@carlink.internal`** que se borraron al terminar
(se comprobó en la base que no quedó nada).

- **E2E del vínculo** (`backend/scripts/qa_workshop_links_e2e.py`, backend aparte en el 8001 con el flag encendido): **31/31**, incluido que la cuenta de taller recibe 403.
- **Fotos del catálogo, de punta a punta** (fotos reales subidas): crear servicios con foto, destacar 4, el quinto da 409, destacado sin foto 422, foto externa y de otro
  usuario 422, quitar foto des-destaca, la ficha pública trae los 4 y las fotos se sirven sin sesión. En Chromium real: el carrusel avanza solo, se pausa con el cursor,
  no avanza con movimiento reducido, sin scroll horizontal a 1280 y 320 px; el panel muestra "Destacados: 4/4" y las miniaturas.
- **Mapa:** sin pin no aparece la sección; con pin hay mapa con un marcador y mosaicos cargados, no hay `dialog`, el enlace "Cómo llegar" lleva a las coordenadas
  correctas, sin scroll horizontal a 1280 y 320 px.
- **Catálogo + ubicación al mismo nivel:** a 1280 y 768 px miden lo mismo (260) y empiezan a la misma altura; a 320 px quedan apilados.
- **Automáticas:** pytest 310 pasan (`test_workshop_service_photos.py`: 12, y 4 nuevos de cuenta de taller en `test_workshop_links.py`), vitest 238 pasan
  (+1 fallo esperado), `tsc` limpio.
- **Casos manuales** en la Suite 15: 15.18 (taller no se vincula), 15.19 (una sola sesión por navegador), 15.20 (ficha a 320 px), 15.21 a 15.25 (fotos, destacados,
  carrusel, movimiento reducido, foto ajena) y 15.26 (mapa).

**No se probó:** subir la foto desde el selector de archivos del panel (se hizo por API, igual que la interfaz); el límite de 5 MB ni el rechazo de archivos que no son
imagen; el deslizamiento táctil del carrusel y del mapa en un celular real; el aspecto con fotos reales de un taller (las capturas de prueba usaron imágenes generadas,
salvo una con las fotos reales del taller de pruebas); escanear el QR con un lector; el flujo con el flag **encendido en producción** (sigue apagado).

---

## 8. Archivos tocados (solo modo taller)

Backend: `routers/workshop_services.py`, `routers/workshop_links.py` (403 a cuentas de taller), `models/models.py` (`WorkshopServiceItem`), `schemas/schemas.py`,
`tests/test_workshop_service_photos.py`, `tests/test_workshop_links.py`, `tests/conftest.py`, `scripts/qa_workshop_links_e2e.py`,
`supabase/migrations/075_workshop_service_photos.sql`.
Frontend: `app/(public)/taller/[code]/page.tsx` (ficha), `components/WorkshopMap.tsx` (nuevo), `components/negocio/PerfilModule.tsx`,
`app/app/negocio/page.tsx` (panel lateral), `lib/types.ts`.

## 9. Pendientes

Ver la sección "Panel del taller y ficha pública" de `docs/PENDIENTES.md` (única lista de pendientes). Resumen: decisiones sobre reseñas, probar a mano lo que
no se cubrió, commit y push (siempre a `develop` + PR a `master`), encender el flag en producción solo tras la Suite 15.
