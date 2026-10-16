# Plan — Aliados de negocio: talleres, concesionarios, compraventas y proveedores (2026-10-16)

_Estado: **Fases 0, 1, 2, 3, 3b y 4 construidas y probadas en local, sin desplegar** (secciones 6 y 13 a 18). Las aseguradoras siguen fuera (decisión 2026-10-17). Los pendientes viven en `docs/PENDIENTES.md`
(sección "Aliados de negocio"); este documento es el diseño, las decisiones y el plan de pruebas._

## 1. Qué se quiere lograr

CarLink deja de pensar solo en talleres. Los clientes B2B son:

| Tipo (`business_kind`) | Qué es | Estado |
|---|---|---|
| `taller` | Taller o servicio automotriz (mecánica, latonería, llantas, lubricentro, CDA...) | Existe hoy |
| `concesionario` | Vende vehículos nuevos o usados de una o varias marcas | Nuevo |
| `compraventa` | Compra y vende vehículos usados | Nuevo |
| `repuestos` | Proveedor de repuestos, accesorios o insumos | Existe como subtipo; pasa a tipo |
| `aseguradora` | — | **Fuera por ahora** (decidido 2026-10-16: no hay caso de uso claro) |

Ideas de negocio detrás:

1. **Validación manual** de cada negocio por el admin; a futuro, consulta a una API de una entidad (RUES o proveedor) para asegurar que la empresa existe.
2. **Aprobación con correo** al cliente: "registro exitoso, puede continuar con el registro en la app".
3. Los aliados **sugieren llaveros** a sus clientes; si la compra pasa por ellos, el cliente tiene **descuento** por la alianza.
4. Concesionarios y compraventas **publican la ficha técnica** del vehículo con QR; el comprador la escanea y queda **vinculado** al vendedor, que además **certifica el kilometraje** con el que sale el vehículo.
5. Concesionarios y compraventas **no tienen todos los módulos** del menú de taller (sin órdenes de trabajo, inventario, citas, rentabilidad...), pero sí registrar vehículos y llevar el historial de sus clientes.

## 2. Decisiones tomadas (2026-10-16)

1. **No se crean tipos de cuenta nuevos.** `profiles.account_type` sigue siendo `persona | taller` (el `CHECK` de la base solo admite esos dos). El tipo
   de organización vive en `workshops.business_kind`, con valor por defecto `taller`: ningún taller actual cambia.
2. **Capacidades por tipo, aplicadas en el backend** (no solo ocultando el menú). Ver sección 3.
3. **Aseguradoras quedan fuera** hasta definir qué harían en CarLink.
4. **Compraventas (y concesionarios) deben estar verificadas** por el admin; solo después de verificadas certifican kilometraje.
5. **Las especialidades solo aplican a talleres** (a concesionarios se les pide "marcas que vende"; a compraventas y proveedores no se les pide nada).
6. **Descuento de llaveros por alianza**: ver sección 5.

## 3. Capacidades por tipo (Fase 1) — **matriz v1, reemplazada por la v2 de la sección 10**

| Capacidad | taller | concesionario | compraventa | repuestos |
|---|---|---|---|---|
| Perfil, ficha pública y QR | Sí | Sí | Sí | Sí |
| Clientes y vehículos con historial | Sí | Sí | Sí | No |
| Registrar vehículos propios | Sí | Sí | Sí | No |
| Órdenes de trabajo | Sí | **No** | **No** | No |
| Inventario, citas, rentabilidad, diagnóstico IA | Sí | **No** | **No** | Inventario sí (por definir) |
| Certificar kilometraje de entrega | Opcional | Sí, **solo verificado** | Sí, **solo verificado** | No |
| Código de alianza y descuento de llaveros | Sí | Sí | Sí | Sí |

Implementación prevista: `app/services/capabilities.py` con el mapa tipo -> capacidades; `GET /workshops/me` devuelve `capabilities`; un
`require_capability("work_orders")` en los routers de órdenes, inventario, citas, rentabilidad y diagnóstico; el menú de `/app/negocio` se dibuja con esa lista.

## 4. Fases

| Fase | Contenido | Estado |
|---|---|---|
| **0** | Tipo de organización en el formulario; especialidades solo para talleres; lista de chequeo del admin; invitación de un solo uso al aprobar; correo de "registro exitoso"; registro con invitación (NIT debe coincidir, negocio nace verificado) | **Construida en local** |
| 1 | Modelo de capacidades, gating en el backend, menú dinámico, plan/espacio/prueba gratis por tipo | Sin empezar |
| 2 | Código de alianza y descuento de llaveros (checkout, atribución, reporte) | Sin empezar |
| 3 | Vehículos del aliado: ficha técnica pública con QR, vínculo del comprador (reusa `PLAN_VINCULO_TALLER_CONDUCTOR.md` y `vehicle_transfers`), lectura de odómetro certificada | Sin empezar |
| 4 | API de verificación de empresas (RUES u otro proveedor), aseguradoras | Sin empezar |

## 5. Descuento de llaveros por alianza (Fase 2)

**Hechos**: el precio real es **$39.900** por llavero (constante `PRODUCT_PRICE_COP` en `shop_orders.py`, igual a `CartModal.tsx`). El "Kit CarLink"
existe en `lib/checkout.ts` pero está apagado (`KIT_ORDER_ENABLED = false`) y no tiene SKU en el backend. Hoy **no existe ningún mecanismo de descuento**.

**Propuesta** (a confirmar con el costo real del llavero):

| Concepto | Valor propuesto | Comentario |
|---|---|---|
| Descuento por llavero | **$7.000 fijos** (el llavero queda en $32.900, equivale a 17,5 %) | Un monto fijo se comunica mejor que un porcentaje. El 20 % serían $7.980: casi lo mismo, pero un número redondo evita centavos en Wompi |
| Descuento por kit | **$10.000** | Solo cuando el kit tenga SKU y se active |
| Tope por pedido | El que ya tiene el carrito (10 unidades) | Evita compras masivas disfrazadas de alianza |

Reglas de diseño:
- El descuento se calcula **siempre en el servidor** al crear el pedido (misma regla que el monto hoy); el cliente solo manda el código. La verificación de monto de Wompi
  (`amount_in_cents`) sigue funcionando porque el monto final queda guardado en la orden. Probar también contraentrega.
- Se guarda `referred_by_workshop_id` y `discount_cents` en `shop_orders`: la atribución queda lista para pagar **comisión** más adelante, aunque hoy solo se descuente al cliente.
- El código de alianza es el `TLR-XXXXX` del aliado y solo vale si el aliado está aprobado y verificado. El monto del descuento sale de una tabla de configuración (no del código).
- El enlace/QR del aliado lleva `?ref=` (ya previsto en el plan del vínculo) y se guarda hasta el checkout.
- Antes de lanzarlo: revisar `LEGAL_01` y `LEGAL_02` (hoy cubren el partner de provisión masiva, no descuentos ni comisiones).

## 6. Fase 0 — qué se construyó

**Migración `077_business_kind_and_invites.sql`** (aditiva): `workshops.business_kind`; en `workshop_applications`: `business_kind`, `checks` (JSON), `invite_token_hash`,
`invite_expires_at`, `invite_used_at`, `invite_used_by` y un índice único parcial sobre el hash.

**Backend**
- `POST /workshop-applications` valida `business_kind`; el subtipo (`business_type`) solo se exige y se guarda para talleres; las especialidades se descartan para compraventas y proveedores.
- `PATCH /admin/workshop-applications/{id}` con `status=approved` genera una invitación (`services/workshop_invites.py`): token aleatorio, solo se guarda su hash, vence a los 14 días, y envía el
  correo **"Tu registro fue exitoso"** con el enlace personal. Volver a pendiente/contactada/rechazada invalida la invitación sin usar. `checks` se guarda desde el mismo `PATCH`.
- `POST /admin/workshop-applications/{id}/resend-invite`: invitación nueva (la anterior deja de servir); no si ya se usó.
- `GET /workshop-applications/invite/{token}` (público, con límite por IP): datos básicos de la postulación aprobada para precargar el registro; 404/410 si no existe, venció o se usó.
- `POST /workshops` acepta `invite_token`: con invitación válida el **NIT debe coincidir**, el negocio nace con `business_kind` de la postulación, `is_verified = true`, logo y especialidades de la
  postulación y el pin que la persona confirmó en el mapa (si la dirección no cambió); la invitación se gasta (con bloqueo de fila contra doble uso). Sin invitación sigue funcionando igual salvo que
  `WORKSHOP_INVITE_REQUIRED=true` (apagado por defecto: no rompe el registro actual).

**Frontend**
- Formulario `/taller`: primero "Tipo de negocio" (4 tipos); "Tipo de taller" solo si es taller; "Especialidades" solo para talleres, "Marcas que vendes" para concesionarios.
- Admin > Postulaciones: tipo y subtipo, **lista de chequeo** (documento, NIT en el RUES con enlace, contacto, ubicación y logo), aviso de lo no marcado al aprobar, estado de la invitación y "Reenviar invitación".
- `/register?mode=empresa&invite=...`: guarda la invitación (sobrevive al inicio de sesión), precarga y bloquea el NIT, avisa que la postulación fue aprobada y muestra errores claros (venció, ya usada, NIT distinto).

**Aún no se hizo (a propósito)**: el menú y las reglas no cambian por tipo (Fase 1); un `concesionario` o `compraventa` que se registre hoy ve el panel completo de taller.
Hasta que exista la Fase 1 conviene **no aprobar** postulaciones que no sean de taller o aprobarlas sabiendo que verán módulos que no les corresponden.

## 7. Riesgos y huecos conocidos

1. **`account_type != 'persona'` significa "acceso completo"** en `plan.py`, `storage_quota.py`, `nfc.py` y `vehicles.py`. Un concesionario hereda hoy prueba gratis de 7 días y espacio sin tope (Fase 1 lo define por tipo).
2. **Placas**: solo un vehículo verificado o con llavero activo reserva la placa. Un concesionario con decenas de vehículos choca con esa regla y con el 409 si la placa ya está en otra cuenta; falta el flujo (Fase 3).
3. **Kilometraje**: el odómetro es de solo agregar y rechaza saltos de más de 100.000 km. La lectura de entrega necesita una fuente nueva (`dealer_delivery`) y el vendedor certificador; **nunca** reutilizar la etiqueta "Del taller", que nace solo de una orden de trabajo.
4. **Fraude de odómetro**: una compraventa que certifica un km falso es justo lo que el odómetro busca evitar; por eso solo certifica si está verificada y la etiqueta siempre muestra quién certificó.
5. **Privacidad (Ley 1581)**: ver datos de clientes exige consentimiento explícito del conductor (ya es el principio del vínculo QR).
6. **Textos que dicen "taller"** (landing `/taller`, ficha `/taller/[code]`, panel): revisar en la Fase 1.
7. **El enlace de invitación va por correo**: quien lo reciba puede crear la cuenta; por eso es de un solo uso, vence y exige el mismo NIT.
8. **Rate limit sin Redis** (hoy no hay `REDIS_URL` en Railway): los límites por IP de invitación, `/scan` y `/geocode` no se aplican hasta configurarlo.

## 8. Preguntas abiertas

- Costo real de un llavero, para confirmar que $7.000 de descuento (y $10.000 por kit) dejan margen.
- ¿Los proveedores de repuestos usan inventario? (hoy sí, por ser panel de taller)
- ¿Habrá comisión para el aliado, y desde cuándo?
- ¿Qué haría una aseguradora en CarLink? (se retoma en la Fase 4)

## 9. Pruebas

`docs/PRUEBAS_FUNCIONALES.md` → Suite 18 (Fase 0). Automatizadas: `backend/tests/test_workshop_applications.py` (invitación, tipos, correo) y `frontend/src/lib/__tests__/tallerForm.test.ts`.

---

# Revisión 2026-10-16 (tarde): CDA, niveles de confianza y periodo de acceso

_Estado: **propuesta por confirmar**. No hay código nuevo de esta revisión. Solo se aprobarán talleres por ahora._

## 10. Actor nuevo: Centro de Diagnóstico Automotor (CDA) y matriz v2

**Qué existe hoy**: el CDA no es un tipo; es un taller cuyo `workshop_type` (texto libre) contiene "cda" (`vehicle_invoices.py`). Ya hay campos reales de revisión técnico-mecánica
en `diagnostics` (`cda_code`, `cda_expiry_date`, `cda_checks`, `cda_cert_url`, migración 032) y el módulo de diagnóstico los usa.

**Por qué merece tipo propio (`cda`)**: su certificado es un documento con valor legal y **la revisión registra el kilometraje**; por eso es la fuente más fiable para el odómetro
(más que un taller, un concesionario o una compraventa). Además puede avisar a sus clientes cuándo vence la revisión. Por normativa los CDA suelen tener objeto exclusivo (no reparan): confirmar con un abogado antes de darles órdenes de trabajo; la propuesta es que **no** las tengan.

### Niveles de confianza (qué se exige para aprobar y para certificar)

| Nivel | Tipos | Para aprobar | Para certificar kilometraje |
|---|---|---|---|
| **N1 estándar** | taller, repuestos | Lista de chequeo (Fase 0) | Taller: lectura propia de una orden, con su etiqueta |
| **N2 reforzado** | concesionario | N1 completa + documento que acredite la actividad (CIIU de comercio de vehículos) | Sí, solo si está verificado; entrega de vehículos |
| **N3 alto** | CDA, compraventa | N1 **obligatoria completa** (sin marcar no se aprueba) + validación por llamada o videollamada; CDA además resolución de habilitación y acreditación ONAC | Solo con permiso aparte `can_certify_odometer` (ver abajo) |

Controles de nivel alto propuestos: (1) el permiso de certificar km es una bandera **separada** de la aprobación (aprobar da el panel, no el poder de certificar); (2) cada certificación queda en un registro de solo
agregar, con autor, hora del servidor y sin edición; (3) una lectura no puede ser menor que la última registrada y se marca si contradice la de un CDA; (4) revalidación cada 6 a 12 meses (ya prevista en `MODELO_NEGOCIO.md`); (5) recomendar segundo factor de autenticación a estas cuentas; (6) el admin puede revocar el permiso sin cerrar la cuenta.

**Punto de atención con las compraventas**: tienen conflicto de interés (un kilometraje bajo les conviene). Propuesta: sus lecturas se muestran como **"Declarado por compraventa verificada"**, con un peso menor que
**"Certificado por CDA"**; el valor de la compraventa es el vínculo y la ficha, no ser árbitro del odómetro. Se puede subir de categoría con el tiempo, según su historial sin disputas.

### Matriz v2 (propuesta)

| Capacidad | taller | **cda** | concesionario | compraventa | repuestos |
|---|---|---|---|---|---|
| Nivel de confianza | N1 | **N3** | N2 | **N3** | N1 |
| Perfil, ficha pública y QR | Sí | Sí | Sí | Sí | Sí |
| Clientes y vehículos con historial | Sí | Sí | Sí | Sí | No |
| Órdenes de trabajo, inventario, rentabilidad, diagnóstico IA | Sí | No | No | No | Inventario |
| Citas | Sí | Sí (agenda de revisiones) | No | No | No |
| Registrar revisiones RTM (código, vigencia, chequeos) y avisar vencimientos | No | **Sí** | No | No | No |
| Certificar kilometraje | Etiqueta "Del taller" | **Certificado por CDA** | Certificado, si verificado | Declarado, si verificado y con permiso | No |
| Publicar vehículos en venta con ficha técnica y QR | No | No | Sí | Sí | No |
| **Código de alianza** (descuento $7.000 por llavero / $10.000 por kit al cliente) | Sí | Sí, con topes y revisión | Sí | Sí, con topes y revisión | Sí |
| **Distribuir llaveros en lote** (stock a consignación, modelo partner existente) | No | No | **Sí** | No | No |

Distribuir llaveros: el modelo `partners` ya existe (cupo, clave propia, atribución por lote). Para el concesionario se reutiliza (cupo acotado, entrega con cada vehículo vendido). Para el resto solo código de alianza, sin stock físico.
Inventario de vehículos: un concesionario con decenas de vehículos choca con la regla "un llavero por vehículo adicional" y con la reserva de placas; la ficha de un **vehículo en venta** es otro concepto (Fase 3) y no debe exigir llavero.

## 11. Periodo de acceso y planes: lo que hay hoy (verificado 2026-10-16)

| Hecho | Dónde | Consecuencia |
|---|---|---|
| El reloj de 7 días se cuenta desde `profiles.created_at` (la creación de la **cuenta**), no desde el negocio ni la aprobación | `lib/constants.ts` `effectiveSubscription` | Quien tenía cuenta de conductor y luego registra su taller ve "Suscripción vencida" el mismo día |
| El backend **no** envía `subscription_status`, `subscription_plan` ni `trial_ends_at` (`ProfileOut` no los tiene; ninguna tabla los guarda) | `schemas.py`, migraciones | El frontend siempre calcula por su cuenta; no hay dato real que administrar |
| El vencimiento solo **oculta la pantalla** (`SubscriptionExpiredCard`); la API de talleres sigue respondiendo todo | `app/negocio/page.tsx`, `dependencies.verify_workshop` | No hay bloqueo real |
| El botón "Suscribirme ahora" **no hace nada** y no existe cobro recurrente (Wompi solo se usa para llaveros) | `SubscriptionExpiredCard.tsx`, `shop_orders.py` | No hay forma de convertir a pago |
| Hay **otro** reloj de 7 días, este sí en el backend: la ficha pública del vehículo de prueba (`token_type='trial'`, `TRIAL_DAYS = 7`) | `nfc_provisioning.py`, `nfc.py` `_has_ficha_access` | Con un año de acceso, la ficha de prueba caería a los 7 días y parecería un error |
| Tres versiones distintas: landing "7 días de prueba / $79.900 al mes", `MODELO_NEGOCIO.md` "14 días y estado restringido" y el Sidebar "Prueba gratuita · N días" | `taller/(landing)/page.tsx`, `docs/MODELO_NEGOCIO.md` | Hay que unificar antes de prometer un año |
| Solo existe **1 taller** en la base (cuenta de pruebas, 2026-10-14) | consulta real | No hay datos que migrar: es el mejor momento para definir el modelo |

### Propuesta de modelo de acceso

- **Datos** (migración nueva, Fase 1): en `workshops`, `access_plan` (`founder` | `trial` | `subscription` | `convenio`), `access_until` y `access_granted_at`. En `workshop_applications`, `grant_days` que el admin fija al aprobar (365 por defecto para el programa fundador; distinto para CDA o concesionarios según el convenio).
- **Cuándo empieza el año**: al **crear la cuenta con la invitación** (no al registrarse en la app como conductor, ni al aprobar). Así quien tarda dos semanas en completar el registro no pierde tiempo.
- **Una sola fuente de verdad**: `GET /auth/me` devuelve `subscription_status`, `subscription_plan` y `trial_ends_at` calculados desde `access_until`; el frontend ya los lee, así que casi no cambia. El texto del Sidebar pasa de "Prueba gratuita" a "Año de acceso gratuito · quedan N días".
- **Al vencer**: estado **restringido de solo lectura** (como dice `MODELO_NEGOCIO.md` 5.3), aplicado en el backend: se puede ver y exportar, no crear órdenes ni registros. No se borra ni se expulsa.
- **Ficha del vehículo de prueba**: para talleres con acceso vigente, su validez sigue a `access_until` en vez de 7 días fijos.
- **Cobro** (Fase 5, antes del primer vencimiento: los primeros caducan ~octubre 2027): hoy no existe. Opciones: (a) enlace de pago de Wompi y el admin marca pagado (rápido, manual); (b) cobro recurrente con Wompi (más trabajo, requiere validar con ellos). Recomiendo (a) para empezar y avisos por correo a los 60, 30 y 7 días. Quien pague mantiene el **precio congelado** durante el ciclo (ya lo dice `MODELO_NEGOCIO.md`).
- **Planes posibles**: Aliado fundador (12 meses sin costo, luego mensualidad), Taller aliado ($79.900 al mes en la landing; el precio final se fija después), Convenio (sin mensualidad, a cambio de distribuir llaveros u otra contraprestación, para concesionarios y alianzas), Restringido (lectura).

## 12. Qué cambia si se confirma

1. `business_kind` suma `cda` (CHECK, esquemas, formulario y panel). La migración `077` **aún no está aplicada**, así que se corrige ahí mismo sin migración nueva.
2. La Fase 1 se amplía: capacidades v2 **y** modelo de acceso (columnas, `/auth/me`, solo lectura en el backend, ficha de prueba atada al acceso).
3. Textos: landing (planes, FAQ, "7 días"), `MODELO_NEGOCIO.md` y el panel pasan a decir lo mismo.
4. Orden sugerido: Fase 1 (capacidades + acceso) -> Fase 2 (descuento) -> Fase 3 (vehículos, ficha de venta, km certificado, RTM) -> Fase 5 (cobro).

### Preguntas para confirmar la matriz
- ¿Los CDA y los concesionarios también tienen un año gratis, o su acceso va por convenio sin mensualidad?
- ¿Compraventa: de acuerdo con "Declarado por compraventa verificada" (peso menor que el CDA) en lugar de "Certificado"?
- ¿Concesionario: distribución de llaveros a consignación con el modelo partner (cupo acotado), o solo código de alianza al inicio?
- ¿El año gratis arranca al crear la cuenta con la invitación (propuesto) o al aprobar?
- ¿Se le permite a un CDA tener órdenes de trabajo, o se confirma que no (objeto exclusivo)?

---

## 13. Decisiones confirmadas (2026-10-16, noche) y Fase 1 construida

Respuestas a las preguntas de la sección 12 ("sí a todo", tomando la opción recomendada en cada una):
1. **Año gratis también para CDA y concesionarios**, ajustable por postulación: el admin elige al aprobar 12, 6, 3 o 1 mes gratis, o **convenio** (sin vencimiento y sin mensualidad).
2. **Compraventa**: sus lecturas de kilometraje serán "Declarado por compraventa verificada", con menos peso que "Certificado por CDA" (se construye en la Fase 3).
3. **Concesionario**: distribución de llaveros a consignación con el modelo partner (cupo acotado) desde el inicio (Fase 2/3).
4. **El año arranca al crear la cuenta con la invitación**, no al aprobar.
5. **CDA sin órdenes de trabajo** (confirmar con abogado).
- Descuento: **$7.000 por llavero y $10.000 por kit** (Fase 2).
- **Solo se aprueban talleres** por ahora (decisión del dueño del producto).

### Fase 1 — qué se construyó

**Migraciones** (aditivas, **pendientes de aplicar** a la base compartida, en este orden):
- `077_business_kind_and_invites.sql` (ajustada: `business_kind` admite también `cda`).
- `078_workshop_access.sql`: `workshops.access_plan` (`trial | founder | subscription | convenio`), `access_until`, `access_granted_at`; `workshop_applications.grant_plan` y `grant_days`.
  El `UPDATE` de la migración le da un año desde su creación al único negocio existente (la cuenta de pruebas) para que nada se bloquee al estrenar el modelo.

**Backend**
- `services/capabilities.py`: la matriz v2 (qué incluye cada tipo). Un tipo desconocido recibe solo lo básico, nunca el panel completo.
- `services/workshop_access.py`: `effective_until`, `is_active`, `grant`, `subscription_fields`. `access_until` nulo solo significa "sin vencimiento" en convenio; en otro plan equivale a "empezó + 7 días" (nunca un bloqueo de golpe).
- `services/workshop_gate.py`: dependencia `workshop_gate("capacidad")` montada en los 11 routers del panel (órdenes, inventario, citas, clientes, documentos, notificaciones, diagnóstico IA, mecánicos, catálogo, reseñas y vínculos).
  **403 `capability_not_available`** si el tipo no incluye la función; **402 `access_expired`** si el acceso venció y la petición escribe (leer sigue funcionando: modo solo lectura). Una prueba recorre todas las rutas `/workshops/me/*` y falla si alguna queda sin compuerta.
- `POST /workshops` concede el acceso al crear la cuenta: con invitación, el plan y los días que fijó el admin; sin invitación, `trial` de 7 días como hasta hoy.
- `GET/PUT /workshops/me` devuelven `capabilities`, `access_plan`, `access_until` y `access_status` (modelo `WorkshopMeOut`; la ficha pública **no** los expone). `GET /auth/me` devuelve `subscription_status`, `subscription_plan` y `trial_ends_at` para las cuentas con negocio: el frontend ya sabía leerlos y deja de calcular desde `profiles.created_at`.
- La ficha pública del vehículo de prueba de un negocio dura lo que su acceso (antes 7 días fijos).
- El correo de aprobación menciona el acceso concedido (p. ej. "gratuito durante 12 meses, contados desde el día en que crees tu cuenta").
- El admin fija `grant_plan` y `grant_days` en el mismo `PATCH` que aprueba; se aplican al crear la cuenta.

**Frontend**
- Menú del panel filtrado por `capabilities`; el botón de Diagnóstico IA y el de Nueva Orden solo aparecen si el tipo los incluye (`lib/capabilities.ts`).
- Acceso vencido: ya no se tapa todo con una tarjeta; se ve el panel con un aviso rojo "modo solo lectura" y un botón "Renovar mi plan" que abre WhatsApp de soporte. El botón de nueva orden se oculta.
- Menú lateral: "Acceso gratuito de aliado fundador · quedan N meses" (o días) y "Acceso terminado · solo lectura".
- `effectiveSubscription` respeta un `expired` explícito del backend en vez de recalcularlo con la fecha de creación de la cuenta.
- Admin > Postulaciones: selector "Acceso al crear la cuenta" (12/6/3/1 meses o convenio) y el formulario/registro aceptan el tipo `cda`.
- Textos de la landing y del blog: "7 días de prueba" pasa a "12 meses para los primeros talleres aliados".

### Lo que la Fase 1 NO cubre (a propósito)
- **Textos legales** (`lib/legalContent.ts`, línea ~322, "período de prueba de 7 días"): es texto jurídico versionado (`LEGAL_VERSION`); cambiarlo requiere revisión legal y subir la versión. Hoy contradice la landing.
- **Cobro**: "Renovar mi plan" solo abre WhatsApp. El cobro real (enlace de pago de Wompi y marcado manual) es la Fase 5, antes del primer vencimiento (~octubre 2027).
- **Pantalla "Resumen"** de un concesionario/compraventa/CDA todavía muestra tarjetas de órdenes (en cero) y el módulo Perfil sigue diciendo "Tipo de taller": pulido de la Fase 3.
- Los tabs de la cuenta de negocio dentro de `/app` (rutas por vehículo) no pasan por esta compuerta; el panel `/app/negocio` sí.
- No hay aviso por correo antes de vencer (60, 30 y 7 días): Fase 5.

---

## 14. Fase 2 construida: código de alianza y descuento de llaveros (2026-10-16)

**Reglas** (todas decididas y aplicadas en el servidor; el cliente solo manda el código):
- El código es el `TLR-XXXXX` del negocio. Descuento: **$7.000 por llavero** (`ALLIANCE_DISCOUNT_PER_KEYCHAIN_COP`); el llavero queda en $32.900. El descuento del **kit ($10.000)** está en la configuración (`ALLIANCE_DISCOUNT_PER_KIT_COP`) pero **no se aplica todavía**: el kit no tiene producto propio en el backend (`KIT_ORDER_ENABLED = false`).
- Solo da descuento un negocio **verificado** (aprobado por el admin y creado con invitación) y con **acceso vigente**. Un negocio sin verificar o inexistente responde igual ("no existe o no está activo"): no se enumeran negocios.
- **Sin autodescuento**: el dueño del negocio no puede usar su propio código estando con sesión iniciada.
- **Tope**: 30 llaveros con descuento por negocio en 30 días (`ALLIANCE_MONTHLY_CAP_UNITS`); cuentan los pedidos pagados y los pendientes de las últimas 48 horas (un pedido abandonado no bloquea el cupo para siempre).
- El monto cobrado (`shop_orders.amount_in_cents`) ya incluye el descuento, así que la verificación de monto de Wompi, el webhook y los reportes de ingresos no cambian. Se guardan `alliance_workshop_id`, `alliance_code` y `discount_cents` (atribución lista para una futura comisión; hoy solo descuenta al comprador).
- Si el código deja de servir entre que se validó y se pagó, la creación del pedido responde 422 `alliance_<motivo>` y el checkout revalida y avisa, en vez de cobrar un monto distinto al que se vio.

**Migración `079_alliance_discount.sql`** (aditiva, **pendiente de aplicar**; requiere 078): columnas en `shop_orders` + índice parcial.

**Backend**: `services/alliances.py` (normalizar, resolver, descuento, elegibilidad, unidades del mes); `GET /shop/alliance/{code}?quantity=` (público, 30 consultas por hora por IP, devuelve el nombre del negocio solo si su ficha es pública); `POST /shop/orders` acepta `alliance_code`; `GET /workshops/me/alliance` (compuerta `alianza`, que tienen todos los tipos) con código, enlace, elegibilidad y cantidades agregadas, **nunca datos del comprador**.

**Frontend**: `?ref=TLR-XXXXX` de cualquier página pública se guarda 30 días (`AllianceRefCapture`, `lib/alliance.ts`); el checkout (`CartModal`) prellena y valida el código, muestra la línea "Descuento por alianza con X" y el total rebajado, y revalida al cambiar la cantidad; sección **"Código de alianza"** en el panel de negocio (código, enlace para copiar o compartir por WhatsApp, llaveros del mes y totales); el admin ve el código y el descuento en cada pedido.

**Texto legal** (`lib/legalContent.ts`, versión **2.4**, 16 de octubre de 2026): la sección 3 describe los tipos de negocio, la aprobación previa y el acceso gratuito con paso a solo lectura (reemplaza "7 días de prueba"); la nueva sección **3A** cubre el código de alianza (descuento del comprador, límites, uso indebido, sin comisión ni representación); la política de privacidad suma la atribución del código, la lectura automática de la Cámara de Comercio con el proveedor de IA y el servicio de mapas.

### Lo que la Fase 2 NO cubre
- **Comisión** al aliado: solo se registra la atribución. Si se acuerda una comisión, va por escrito (la sección 3A lo dice) y se construye aparte.
- **Distribución de llaveros en lote** al concesionario (modelo partner): se decidió para el inicio, pero se construye con la Fase 3 junto con la ficha de vehículos.
- **Kit**: ver arriba.
- El enlace/QR del negocio lleva al inicio (`/?ref=`); aún no hay un CTA "compra tu llavero con descuento" dentro de su ficha pública `/taller/[code]`.
- Los textos legales del PDF se regeneran solos (misma fuente), pero quien aceptó la versión 2.3 no vuelve a aceptar: valorar si hace falta un aviso a talleres ya registrados (hoy solo existe la cuenta de pruebas).

---

## 15. Fase 3 (parte principal): vehículos del aliado, kilometraje certificado y entrega (2026-10-17)

**Qué se construyó**: concesionarios y compraventas tienen una sección **"Vehículos en venta"** en su panel. Registran su inventario, publican la ficha pública con QR, certifican (o declaran) el kilometraje de salida y entregan el vehículo al comprador con un enlace/QR de un solo uso.

**Decisiones de diseño**
- El inventario vive en una tabla propia (`dealer_vehicles`, migración `080`), **no** en `vehicles`: así un concesionario con decenas de unidades no choca con la reserva de placas ni con el cupo de llaveros. El vehículo pasa a la cuenta del comprador solo cuando éste recibe la entrega (`claim`), con las mismas reglas de siempre (placa ya propia, placa reservada por otra cuenta, cupo de llaveros de una cuenta persona).
- **Pesos distintos del kilometraje** (decisión del dueño, 2026-10-16): concesionario verificado y habilitado = **"Certificado por concesionario"**; compraventa verificada y habilitada = **"Declarado por compraventa verificada"** (conflicto de interés: un km bajo le conviene); sin certificar = **"Declarado por el vendedor"**. La etiqueta nunca se confunde con "Del taller" (que nace solo de una orden de trabajo).
- **Permiso aparte de la aprobación**: `workshops.can_certify_odometer` lo da el admin a mano (botón "Habilitar" en Postulaciones, solo para concesionario/compraventa ya verificado y con cuenta). Aprobar da el panel; no da el poder de certificar. Además se exige negocio verificado, con acceso vigente.
- **Antifraude de odómetro**: el km certificado se compara con el mayor registrado en CarLink para esa placa en **cualquier** cuenta (normalizando guiones): no puede ser menor ni saltar más de 100.000 km (regla existente `MAX_MILEAGE_JUMP`); tampoco baja de lo que el mismo aliado ya certificó. El mensaje de rechazo **no revela la cifra** de la otra cuenta. Como esa comparación respondería sí/no y permitiría adivinar el km de un vehículo ajeno probando valores, se limita a **3 intentos por vehículo cada 24 h** (cuentan aunque fallen).
- **Ficha pública** (`/v/<código de 8>`): sin placa completa (`ABC•••`) ni datos de contacto; se oculta (404) si el vehículo se entrega, se retira o el negocio deja de estar verificado o con acceso. Solo un negocio verificado puede publicar.
- **Entrega** (`/entrega/<código>`): código de un solo uso, 14 días, solo se guarda su hash (`secrets.token_urlsafe`); generar otro invalida el anterior. El comprador ve el vehículo y su km con la etiqueta, y **decide** si comparte su nombre y WhatsApp (si acepta, el vendedor lo ve en Clientes con el vehículo ligado; si no, no se crea ningún cliente). La lectura de odómetro del comprador queda como `dealer_delivery` con el negocio y el tipo de certificación; su ficha muestra "Certificado por concesionario · <nombre>".
- Un vehículo entregado no se puede borrar, editar ni recertificar (es parte del historial del comprador).

**Backend**: `routers/dealer_vehicles.py` (panel con compuerta `vehiculos_venta`, público y comprador), `services/dealer_vehicles.py` (reglas), `PATCH /admin/workshop-applications/{id}/certification`, `OdometerStatus` con `certified_by` y `certification_label`. **Frontend**: `VehiculosVentaModule`, `QrLinkModal`, `/v/[slug]`, `/entrega/[code]`, `ClaimLinkModal` reutilizado con otra ruta, etiqueta en `FichaTab`, redirección tras iniciar sesión (`auth/callback`, solo a `/entrega/<código>`). **Texto legal v2.5** (17 de octubre de 2026): sección 3 (fichas, entrega y qué significa la etiqueta de kilometraje) y privacidad (datos de la entrega).

**Migración `080_dealer_vehicles.sql`** (pendiente de aplicar; requiere 077 a 079): tabla `dealer_vehicles`, `workshops.can_certify_odometer`, columnas de certificación en `odometer_readings` y el `CHECK` de `source` ahora admite `dealer_delivery` (única sentencia no puramente aditiva: reemplaza el `CHECK` por uno que incluye los valores anteriores).

**Verificación (2026-10-17)**: 83 comprobaciones funcionales contra la base real y 46 capturas en navegador (escritorio y celular); la prueba visual encontró y se corrigió que el inicio de los negocios que no son talleres mostraba el panel del taller (ahora tienen `ResumenAliadoModule`), la insignia "TALLER" en todos los tipos y una redirección prematura en el registro con invitación. Detalle y evidencia: `PRUEBAS_FUNCIONALES.md` → "Registro de ejecución".

### Lo que la Fase 3 NO cubre todavía (queda para la 3b)
- **Registro de revisiones técnico-mecánicas del CDA** y aviso de vencimiento a sus clientes (el CDA hoy solo tiene clientes y citas).
- **Consignación de llaveros en lote al concesionario** con el modelo partner (cupo acotado).
- Integración con el **vínculo taller-conductor** (`PLAN_VINCULO_TALLER_CONDUCTOR.md`, aún con el flag apagado): la entrega crea un cliente del vendedor, pero no un `workshop_client_link`.
- Fotos del vehículo y varios medios en la ficha pública; filtros o un listado público de todos los vehículos del aliado.
- Revocar la entrega de un vehículo ya recibido (disputas): hoy se resolvería por soporte.
- Limitar la compraventa a "declarar" es una decisión de producto; puede revisarse con el historial de cada aliado sin disputas.

---

## 16. Fase 3b: revisiones RTM del CDA, consignación de llaveros y fotos (2026-10-17)

**Pendiente resuelto**: el tablero de la ficha mostraba el kilometraje actual dentro de "KM · PARA CAMBIO DE ACEITE"; ahora el rótulo es "KM · ODÓMETRO".

### Revisiones técnico-mecánicas (CDA)
- Sección "Revisiones RTM" del CDA (capacidad `revisiones`). **Registrar** exige CDA verificado, con acceso vigente y habilitado por el admin (`can_certify_odometer`, el mismo permiso aparte de la aprobación; el botón de Postulaciones ahora también aplica a los CDA). Datos: placa, certificado (4 a 40 caracteres, único por CDA), resultado, fecha de revisión (hoy o hasta 7 días atrás), vigencia (hasta 2 años) y kilometraje.
- **Antifraude de nivel alto**: el km se compara con el historial de la placa en cualquier cuenta (no puede ser menor ni saltar más de 100.000) y con el mayor km de revisiones previas de esa placa; el rechazo no revela cifras; **3 intentos por CDA y placa cada 24 h** (`km_certify_attempts`; las validaciones de formato no gastan intentos).
- **El CDA nunca escribe en la cuenta del propietario.** Genera una **constancia** (enlace/QR `/constancia/<código>`, un solo uso, 30 días, solo se guarda el hash). El propietario, con sesión, debe tener un vehículo con esa placa (si no: `no_vehicle`); al aceptar se crea un diagnóstico de revisión (alerta `cda` con certificado y vigencia; severidad crítica si no fue aprobada) y, **si el km cuadra con su odómetro**, una lectura `cda_inspection` con `certification_kind='cda'` ("**Certificado por CDA**", la de mayor peso). Si no cuadra se guarda la revisión sin el kilometraje. Su nombre y WhatsApp solo se comparten si lo autoriza (queda como cliente del CDA).
- **Por vencer**: la última revisión aprobada de cada placa que vence en 45 días, con botón de recordatorio por WhatsApp solo para quienes compartieron contacto. El recordatorio es manual (no hay envío automático: las plantillas de WhatsApp siguen bloqueadas).

### Consignación de llaveros (concesionario)
Sección de solo lectura "Llaveros en consignación": cupo, disponibles, activados y un listado por prefijo del llavero. El admin vincula un partner existente a un **concesionario verificado** (botón en el panel de Partners; un negocio solo puede tener un partner; `partners.workshop_id`). Nunca se muestra el código de activación ni quién lo activó. El aprovisionamiento físico sigue siendo del admin/partner (los chips se programan fuera del panel).

### Fotos de los vehículos en venta
Hasta 6 fotos por vehículo, solo archivos subidos por el propio aliado (mismo control que el catálogo de servicios del taller), sin repetidas; miniatura en la tarjeta del inventario y galería en la ficha pública.

**Migración `081_phase3b_rtm_consignment_photos.sql`** (aplicada 2026-10-17): `rtm_inspections`, `km_certify_attempts`, `partners.workshop_id`, `dealer_vehicles.photo_urls` y dos `CHECK` de `odometer_readings` ampliados (`cda_inspection`, `cda`). **Texto legal v2.6.**

### Verificación
**110 de 110** comprobaciones funcionales contra la base real (suites 18 a 23) y **101 comprobaciones visuales** en escritorio y celular (88 de la corrida completa + las repetidas tras corregir la prueba); sin residuos en la base. Detalle: `PRUEBAS_FUNCIONALES.md` → Suite 23 y "Registro de ejecución". Hallazgo de la prueba: al llegar una revisión del CDA, la ficha del comprador pasa a decir **"Certificado por CDA"** (lectura de mayor peso) en vez de la del concesionario: es el comportamiento esperado.

### Lo que sigue sin cubrirse
- Aviso **automático** de vencimiento (correo/WhatsApp) a los propietarios; hoy solo hay lista y recordatorio manual del CDA.
- Que el propietario vea en su ficha una cuenta regresiva de la RTM propia (hoy queda como diagnóstico `cda` y su vigencia).
- Consignación con **entrega por unidad** (asociar un llavero concreto a un vehículo vendido) y con reposición de cupo desde el panel.
- Verificación automática de la habilitación del CDA ante el Ministerio de Transporte/ONAC (hoy la hace el admin a mano con la lista de chequeo).

---

## 17. Fase 4: verificación automática de empresas en el RUES (2026-10-17)

**Fuente**: dataset abierto del RUES de Confecámaras en datos.gov.co (`c82u-588k`, "Personas Naturales, Personas Jurídicas y ESAL"), API Socrata **sin clave ni costo**, licencia **CC BY-SA 4.0** (atribución a Confecámaras visible en el panel). Se probó en vivo: una consulta por NIT tarda menos de un segundo. No se contrató ningún proveedor de pago (Verifik y similares dan además representantes legales y establecimientos, a cambio de créditos; se pueden enchufar en `company_verification.py` si algún día hacen falta).

**Qué hace** (`services/company_verification.py`, migración `082`: `workshop_applications.verification` JSON): consulta el NIT (o la cédula, para personas naturales) y guarda si existe, si la matrícula está **ACTIVA**, si **renovó** (se renueva a más tardar el 31 de marzo), si el **dígito de verificación** coincide y, de forma orientativa, si el **nombre** y la **actividad económica (CIIU)** cuadran con el tipo de negocio. Estados: `ok`, `review` (en regla pero nombre o actividad por revisar), `fail` (inactiva, sin renovar o DV distinto), `not_found`, `unavailable`.
- Corre sola al llegar la postulación (mejor esfuerzo y con tope de tiempo: si el RUES no responde, la postulación se guarda igual) y el admin puede repetirla con **"Consultar RUES"**.
- **Es una ayuda, nunca decide**: no aprueba ni rechaza; el panel advierte al aprobar si salió "con problemas" o "no encontrada".
- **Nivel de confianza alto** (CDA y compraventa): no se pueden aprobar con la lista de chequeo manual incompleta (`checks_incomplete`); para los demás tipos es una advertencia.
- Solo se consulta con dígitos de 6 a 15 caracteres (nunca texto libre en el filtro). De CarLink sale únicamente el NIT de un negocio, nunca datos de personas.
- `backend/scripts/revalidate_businesses.py` repasa los negocios ya verificados y lista los que dejaron de estar en regla (solo lee; la decisión es del admin). MODELO_NEGOCIO.md pide revalidar cada 6 a 12 meses.
- Texto legal **v2.7** (privacidad: consulta del NIT en el RUES).

**Vehículos: el RUES no sirve.** Es el registro mercantil (empresas), no el de tránsito. Los vehículos están en el **RUNT**, que no ofrece una API pública (su consulta web exige placa y documento del propietario). Si más adelante se quiere validar contra el RUNT, la propuesta es que lo haga el propio dueño (su consulta, con su documento, adjuntada como soporte), no una consulta automática de CarLink.

**Lo que no cubre**: la habilitación de un CDA ante el Ministerio de Transporte o ONAC (el RUES no la trae; sigue siendo de la lista de chequeo del admin); representantes legales (el dataset básico los trae a veces, pero no se usan); aseguradoras (fuera por decisión del dueño del producto).

**Verificación**: 24 pruebas unitarias nuevas y la Suite 24 contra la base real y el RUES de verdad (consulta de una empresa pública conocida, NIT inexistente, resultado guardado al postular, repetir la consulta, RUES caído, reglas de nivel alto). Hallazgo de la prueba: algunos NIT "inventados" coinciden con empresas reales del RUES (por eso la prueba usa un NIT verificado como inexistente).

---

## 18. Ajustes de interfaz pedidos el 2026-10-17

- **Formulario de postulación**: las ayudas pasan a un botón circular "?" junto a la etiqueta con mensaje flotante (`HelpTip`: mouse, foco del teclado o toque; Escape o tocar afuera lo cierra; nunca se sale de la pantalla en celular). El formulario queda más corto, todos los campos miden 46 px y las filas están alineadas (el botón "Ver en mapa" mide lo mismo que la dirección). Se retiró el botón de subir la Cámara de Comercio/RUT: el escáner acepta **cualquiera de los dos** (foto o PDF) y ya adjunta el archivo; sin escáner, la verificación del NIT en el RUES reemplaza ese documento. Los atajos de la razón social ("Igual al nombre comercial", "Persona natural") viven dentro de su mensaje de ayuda.
- **Pie de página**: se quitó el botón de WhatsApp (redundante con el enlace de texto de contacto); Instagram y Facebook pasan del color de marca de cada red al dorado de CarLink.
- **Estela del mouse** (fondo animado `BgParticles`): se desactivó en la aplicación (`/app` y `/app/negocio`); sigue solo en la landing y las páginas públicas. Es una prueba: para volver a activarla basta reponer `<BgParticles />` en esas dos páginas.
- **Ficha pública del taller**: se eliminó "Nuestro equipo" y la descripción; en ese espacio va **Contacto** (dirección, teléfono, WhatsApp, correo, horario, sitio web, Instagram y Facebook, solo lo que el taller cargó); las reseñas se unificaron: tocar la calificación (en el encabezado o en la tarjeta) abre un **modal** con el promedio, el reparto por estrellas y cada comentario con su fecha, vehículo, "cliente verificado" y la respuesta del taller.
- Nota de privacidad: el **correo del taller** ya viajaba en la API pública de la ficha; ahora además se muestra. Si algún taller no quiere que se vea, hay que añadir un interruptor en el Perfil (anotado en `PENDIENTES.md`).

### 18b. Segunda tanda de ajustes (2026-10-16, noche)

- **Selectores siempre amarillos**: el "Tipo de negocio" del formulario era un `<select>` nativo (azul). Ahora el formulario, Vehículos en venta, Revisiones y el panel de Admin usan `ThemedSelect`, `ThemedSuggestInput` y `ThemedDateInput`. Regla dura 7 en `CLAUDE.md`.
- **Escáner**: el texto "Escanear Cámara de Comercio o RUT" abre la cámara (`ScanCameraModal`: encuadre, tomar foto, repetir, usar); debajo, el botón de texto "Subir foto o PDF" para elegir un archivo.
- **Logos de aliados en /taller**: `GET /api/workshop-applications/public-allies` (aprobados con logo autorizado, el más reciente primero, cache 60 s). La franja "Marcas y aliados" pone al aliado más nuevo en la primera posición, se refresca sola (al cargar, cada minuto y al volver a la pestaña) y no crece: el último patrocinador fijo cede su lugar. Enlaza a la ficha pública si ya existe.
- **Condiciones del logo** (`services/logo_image.py`): PNG/JPG/WebP legible, lado menor >= 120 px, <= 6000 px, proporción ancho/alto entre 0,4 y 5, no en blanco; se recortan los márgenes, se reduce a máx. 600x300 y se guarda como PNG. Aplica al formulario (`/upload?kind=logo`) y al panel del taller.
- **Logo opcional**: ya no es obligatorio para postularse. Sin logo no hay casilla de autorización ni aparición en la franja; con logo, siempre se muestra en la **ficha pública** (aunque no haya autorizado la franja: lo subió el propio negocio).
- **Logo editable en el panel lateral** (`/app/negocio` > Perfil y configuración del taller): `POST`/`DELETE /api/workshops/me/logo`; se ve en el campo, la cabecera del panel y el botón de perfil.
- **Ficha pública**: Contacto en una segunda columna junto al nombre (el QR no cambia), redes como íconos dorados con hipervínculo, reseñas solo en el modal (se quitó la tarjeta inferior); correo en máx. 2 líneas y especialidades máx. 4 con "+N".

