# Plan: vínculo taller - conductor por QR (2026-10-14)

Estado (2026-10-14): **construido en local, sin commitear ni desplegar, con el flag apagado.** Fases 0, 0b, 1, 2, 3, 4 y 5 escritas con pruebas
unitarias (pytest y vitest). Migración 074 aplicada y `backend/scripts/qa_workshop_links_e2e.py` pasa 30/30 contra la base real (API). **Falta** la parte de interfaz de la
Suite 15 en navegador real, el commit/push y encender el flag en producción.
Las 5 decisiones de la sección 7 se tomaron con las propuestas de este documento (el dueño del producto no respondió una por una); cambiar
cualquiera es barato mientras el flag siga apagado. Los pendientes viven en `docs/PENDIENTES.md`
(sección "Vínculo taller-conductor"); este documento es el diseño y el plan de pruebas.

## 1. Qué se quiere lograr

1. Un taller registrado genera y comparte **su QR**; el cliente (con o sin cuenta CarLink) lo escanea y registra
   su información **asociada a ese taller** (compró algo, hizo un servicio).
2. **El taller no pierde historia**: lo que atiende a alguien que aún no tiene cuenta queda guardado y se
   entrega cuando esa persona se registra.
3. **El conductor no pierde historia**: si ya tiene servicios con un taller que todavía no estaba en CarLink,
   se pueden relacionar después, cuando el taller se registre.
4. Sin tocar el núcleo: reglas de integridad del historial, etiqueta "Del taller" y órdenes de trabajo siguen igual.

## 2. Lo que ya existe (verificado leyendo el código)

| Pieza | Dónde | Sirve para |
|---|---|---|
| Ficha pública del taller con **QR** (`TLR-XXXXX`) | `frontend/src/app/(public)/taller/[code]`, `FichaQr`; `GET /workshops/{code}` | Es el QR a compartir: ya existe y es público por diseño |
| Clientes y vehículos del taller | `workshop_clients`, `workshop_vehicles` (con `linked_vehicle_id`) | Guardan al cliente aunque no tenga cuenta |
| Órdenes de trabajo -> historial del cliente | `work_orders.py` `_sync_client_records_if_linked` | Crean `maintenance_records` con `workshop_id` y `source_work_order_id`; idempotente |
| Buscador de taller en el formulario de servicio | `ServiceFormModal.tsx` | Ofrece elegir taller, **pero** ver 2.1 |
| Mapa de la ficha pública | `ServiceHistoryMap.tsx` | Solo dibuja talleres con `latitude/longitude` |

### 2.1 Dos hallazgos que condicionan el diseño

- **El servidor ignora el `workshop_id` que manda un usuario** (`MODELO_OPERATIVO.md` sección 2). Es una regla
  deliberada: solo las órdenes del taller ponen la etiqueta "Del taller". Por eso elegir un taller en el
  formulario **hoy no sirve para el mapa ni para el vínculo**, y no debe "arreglarse" dejando pasar el id.
  (Corrección a lo dicho antes en la conversación: el formulario guarda el id en el cliente, pero el servidor lo descarta.)
- **Nadie escribe `workshops.latitude/longitude`**. Sin eso no hay pines aunque el servicio esté ligado.
- **Hueco de seguridad existente** (por lectura de código, no probado en vivo): `POST /api/workshops/me/vehicles/{id}/link`
  vincula por **placa exacta** sin consentimiento del dueño. Cualquier taller registrado (hay trial de 7 días)
  podría vincular un vehículo ajeno y, al entregar y pagar una orden, **escribir historial "Del taller" en el
  vehículo de otra persona**. El diseño nuevo reemplaza ese paso por uno con consentimiento (fase 4).

## 3. Principios

1. **Vínculo y procedencia son cosas distintas.** Un vínculo dice "este conductor es cliente de este taller". La
   etiqueta "Del taller" sigue naciendo solo de una orden de trabajo. Escanear un QR nunca crea historial verificado.
2. **Siempre inicia el conductor.** El taller no puede vincular a nadie por su cuenta; solo ofrece QR/enlaces. El
   conductor acepta qué comparte (nombre, WhatsApp, placa) y puede revocar.
3. **Solo aditivo.** Tablas nuevas y una columna nullable. Nada se renombra ni se reinterpreta. Detrás de un flag
   (`WORKSHOP_LINKS_ENABLED`), apagado por defecto.
4. **El QR público no es un secreto.** Cualquiera puede escanearlo; por eso solo permite "iniciar un vínculo
   propio", nunca ver datos de otros. Lo que sí identifica a una persona concreta (enlace de reclamo) es
   de un solo uso, caduca y se guarda con hash.
5. **Privacidad de la ficha pública se respeta**: un vínculo no revela el nombre del taller si el vehículo está en modo privado.

## 4. Diseño

### 4.1 Datos (migración nueva, aditiva; recordar que local/staging/producción comparten la base)

- `workshop_client_links`: `id, workshop_id, vehicle_id, user_id, status (active|revoked), origin (qr_taller|claim_link|name_match),
  consent_share_contact bool, consent_at, created_at, revoked_at`. Único `(workshop_id, vehicle_id)`.
- `workshop_claim_tokens`: `id, workshop_id, workshop_vehicle_id (nullable), token_hash, expires_at (7 días), used_at, used_by_user_id, created_at`.
- `maintenance_records.claimed_workshop_id` (nullable): "el conductor dice que fue en este taller". **Nunca** alimenta la
  etiqueta "Del taller" ni se confía como verificado; solo permite mostrar "taller declarado" y, si el taller tiene
  coordenadas, el pin del mapa marcado como no verificado.
- Fase 0 (independiente): geocodificar `workshops.address` -> `latitude/longitude` (al crear/editar y un script para los existentes).

### 4.2 Los tres escenarios

**A. Cliente sin cuenta escanea el QR del taller.** La ficha `/taller/TLR-X` muestra "Registra tu vehículo y tus servicios con
[Taller]". El código `TLR-X` viaja como `?ref=` y se guarda (localStorage + parámetro del registro). Al terminar el alta del
vehículo, el asistente muestra una pantalla de consentimiento y crea el `workshop_client_link`. El taller ve al nuevo cliente
CarLink en su panel solo si el conductor aceptó compartir contacto.

**B. El taller atendió a alguien sin cuenta.** El taller ya carga cliente y vehículo (`workshop_clients/vehicles`) y sus
órdenes quedan en sus tablas: no se pierde nada. Desde el panel genera un **enlace/QR de reclamo** para ese cliente (se envía
por WhatsApp). Cuando la persona se registra y lo abre, confirma que el vehículo es suyo (la placa debe coincidir con la de
su vehículo) y acepta el vínculo. Recién ahí se **sincroniza hacia atrás** lo ya entregado y pagado (idempotente por
`source_work_order_id`, con la función que ya existe). A verificar en la fase 2: que ese historial retroactivo conserve las
fechas de la orden y no choque con la regla "no anterior a 30 días" (hoy aplica a lo declarado por el usuario).

**C. El conductor tiene servicios con un taller que se registra después.** Hoy esos servicios guardan el nombre en texto libre.
Cuando se crea un taller, el sistema calcula **candidatos** por nombre normalizado + ciudad (+ teléfono si coincide). No
vincula solo: en la app del conductor aparece "¿Este es tu taller? Aceitosos -> Taller Aceitosos S.A.S. (Bogotá)". Si confirma,
se llena `claimed_workshop_id` en esos registros y se ofrece el vínculo (escenario A). El taller nunca ve los datos del
conductor hasta que este acepte. Coincidencias de nombre son sugerencias, no pruebas.

### 4.4 Precisión de la geocodificación (medida el 2026-10-14)
Con direcciones colombianas con numeración, Nominatim/OSM da resultados aproximados o ninguno: de 3 direcciones de prueba en
Bogotá, una dio un punto dudoso (~8 km de lo esperado), una no encontró nada y una cayó cerca; además hubo un timeout. Por eso el pin
es una **sugerencia**. Mejora pendiente (fase 0b): que el taller vea y arrastre el pin en su perfil para confirmarlo, o cambiar de
proveedor si la tasa de acierto no alcanza. Hasta entonces un taller sin coordenadas simplemente no sale en el mapa.

### 4.3 QR por orden (opcional, fase 5)
Un QR de un solo uso impreso en la orden o factura que apunta a una sola orden. Es la forma más fuerte de verificar un servicio
puntual, pero agrega superficie; se decide después de ver el uso real de A y B.

## 5. Fases (cada una se puede desplegar y probar sola)

| Fase | Entrega | Riesgo para el núcleo |
|---|---|---|
| 0 | **Hecha en local (2026-10-14), sin desplegar:** `services/geocoding.py` (Nominatim), se llama al crear el taller y al cambiar dirección/ciudad; `scripts/geocode_workshops.py` (simulacro por defecto, `--apply`). Límite: ver 4.4 | Ninguno (solo escribe lat/long, mejor esfuerzo) |
| 1 | Migración + `?ref=` + consentimiento en el asistente + `workshop_client_links` (escenario A), tras flag | Bajo: el asistente solo agrega un paso condicional |
| 2 | Panel taller "Clientes CarLink" + enlace/QR de reclamo + sincronización retroactiva (escenario B) | Medio: toca `work_orders` sync; se prueba idempotencia |
| 3 | Candidatos de taller al registrarse + aviso en la app del conductor (escenario C) + `claimed_workshop_id` | Bajo |
| 4 | Reemplazar el vínculo por placa (`/link`) por el flujo con consentimiento y retirar el endpoint viejo | Medio: cambia un flujo existente del taller |
| 5 | QR por orden (opcional) | Bajo |

## 6. Pruebas

**Automáticas (pytest / vitest), por fase:**
- Regresión del núcleo (siempre, antes de todo): un usuario que manda `workshop_id` en un servicio sigue siendo ignorado; `claimed_workshop_id`
  no produce la etiqueta "Del taller"; registros `origin=workshop` siguen sin poder editarse (403).
- Tokens de reclamo: de un solo uso, caducan, hash en base, 404 uniforme si es inválido/usado/vencido, rate limit.
- Consentimiento: sin aceptar no se crea vínculo ni el taller ve contacto; revocar corta el acceso y deja de sincronizar.
- Seguridad: un taller no puede vincular un vehículo sin el consentimiento del dueño; un usuario no puede vincularse a un taller inexistente ni a uno no publicado.
- Sincronización retroactiva: idempotente (correrla dos veces no duplica), respeta fechas de la orden, solo órdenes entregadas y pagadas.
- Candidatos (escenario C): normalización de nombres (tildes, mayúsculas, "S.A.S."), no auto-vincula, no expone datos al taller.
- Privacidad: con `georeference_enabled=false` el vínculo no filtra el nombre del taller en la ficha pública (curl a `/api/nfc/{token}`).
- Frontend: parseo/guardado de `?ref=`, paso de consentimiento, flag apagado = asistente idéntico al actual.

**Manuales (agregar "Suite 15" a `docs/PRUEBAS_FUNCIONALES.md`):** con `taller.pruebas@carlink.internal` (NIT `900999001-1`) y
`pruebas.features@carlink.internal`: A completo con cuenta nueva; B completo (cliente sin cuenta -> reclamo -> historial retroactivo);
C (servicio con texto libre -> registrar taller -> confirmar candidato); revocar; 320 px; flag apagado; que `/shop` y el resto de
suites 1-14 sigan igual.

**Despliegue:** la migración se aplica a mano (ver `DEPLOY.md`), es solo aditiva; flag apagado en producción hasta pasar la Suite 15;
seguir `INCIDENT_RESPONSE.md` y verificar con `curl` contra el proceso local antes de pedir el push; push solo a `develop` + PR a `master`.

## 7. Decisiones abiertas (las toma el dueño del producto)

1. ¿Qué ve el taller del conductor vinculado: solo nombre y placa, o también WhatsApp? (propuesta: placa y nombre siempre; WhatsApp solo si el conductor lo marca).
2. ¿El vínculo del escenario A se crea al instante al terminar el alta o el conductor debe confirmarlo después? (propuesta: al instante, con la pantalla de consentimiento).
3. ¿El candidato de nombre (escenario C) basta con nombre+ciudad o se exige además teléfono? (propuesta: nombre+ciudad, pero siempre confirma el conductor).
4. ¿QR por orden (fase 5) entra en este alcance o se aplaza?
5. ¿El vínculo da algo al conductor (sellos de fidelidad por taller ya existen en la ficha pública)? Propuesta: reutilizar los sellos para que el vínculo tenga un beneficio visible.
