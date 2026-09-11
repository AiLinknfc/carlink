# Plan de alineación — Modelo de Negocio vs. app actual

_Creado: 2026-09-11. Punto de partida: `docs/MODELO_NEGOCIO.md` (v1.0, sin fecha final puesta por
el usuario) — documento rector que el usuario escribió aparte y pidió comparar contra lo que ya
existe en CarLink, para decidir cómo implementarlo._

**Este documento es un plan de revisión, no una implementación.** No se tocó código de negocio/
planes/precios en esta pasada — solo se auditó el estado real (código, no solo estas notas) y se
armó la ruta para decidir y construir. Los pendientes de ejecución que salgan de acá van a
`docs/PENDIENTES.md`, no se duplican aquí.

---

## 1. Veredicto corto

**No, hoy no están alineados.** `MODELO_NEGOCIO.md` describe un sistema de planes/suscripciones
(Básico/Premium para personas, validación + reputación + suscripción mensual para empresas,
Founder's Edition, reverse trial de 14 días) que **no existe en la app** más allá de una pieza:
un trial de 7 días para cuentas taller, y ese trial ya funciona distinto de como lo describe el
documento (ver sección 3).

Esto no es un problema de "falta pulir detalles" — falta la infraestructura entera de
suscripciones (no hay cobro recurrente, no hay columna de estado de suscripción en la base, no
hay validación RUES/reputación). Es alineable — la dirección del documento no choca con nada ya
construido — pero es un proyecto grande, no un ajuste. Ver plan de fases (sección 5) y las
decisiones que hacen falta del usuario antes de tocar código (sección 4).

---

## 2. Mapeo de terminología (documento → app)

El documento usa "Persona"/"Empresa" en abstracto; la app ya tiene sus propios términos y un
hallazgo de arquitectura ya documentado que los fija:

| Término en `MODELO_NEGOCIO.md` | Término/valor real en la app | Nota |
|---|---|---|
| "Persona natural" / modo Persona | cuenta `account_type = 'persona'` ("conductor") | Sin cambios de nombre necesarios — ya es como se llama en la DB y en `constants.ts`. |
| "Empresa validada" / modo Empresa | cuenta `account_type = 'taller'` | **`'empresa'` nunca ha sido, ni puede ser, un valor real de `profiles.account_type`** — `CHECK (account_type IN ('persona','taller'))` desde `003_multi_tenant.sql`, nunca alterado. `'empresa'`/`'business'` solo existen como estado transitorio de la UI de registro (`LoginModal.tsx`), tratados como sinónimos de `taller` vía `isBusinessAccount()`. Esto ya se investigó y cerró como hallazgo de arquitectura (`docs/PENDIENTES.md` ítem 6) — este plan lo hereda, no lo reabre. |
| "Producto físico" | Llavero NFC CarLink (`shop_orders`, Wompi) | Coincide 1:1 — es el mismo producto. |
| "Reverse trial" | El trial de 7 días de cuenta `taller` | Ver sección 3 — el mecanismo real es distinto al descrito. |

**Pregunta abierta para el usuario** (sección 4, #1): el documento deja "Empresa" genérico, pero
hoy `taller` es el único tipo de cuenta de negocio que existe. ¿"Empresa" en el documento es
siempre sinónimo de "taller" (mecánico/taller automotriz), o el usuario imagina eventualmente otro
tipo de cuenta de negocio (flotillas, concesionarios) que no sea un taller? Si es lo segundo, hace
falta una columna de negocio nueva más adelante — no se asume acá.

---

## 3. Estado real vs. el documento, sección por sección

Verificado contra el código real (no solo contra `docs/CONTEXTO.md`/`PENDIENTES.md`) el
2026-09-11 — archivos citados son los que se leyeron.

### §2 Tipos de usuario y modos

| Documento | Estado real |
|---|---|
| Persona: Básico / Premium | ❌ No existe ninguna distinción Básico/Premium para `persona`. Una cuenta persona tiene acceso completo a toda la app (Ficha, Historial, Partes, Diagnóstico, Config, Reseñas, Documentos, Gastos) sin ningún gate de plan — comprar o no el llavero NFC solo decide si esa cuenta puede *publicar una ficha pública escaneable*, no si puede usar el resto de la app. |
| Empresa: Trial / Suscripción | ⚠️ Existe el trial (7 días). La suscripción **no existe** — no hay cobro recurrente en ningún lado del código (`app/services/wompi.py` solo hace cargos únicos del checkout del llavero). El botón "Suscribirme ahora" de `SubscriptionExpiredCard.tsx` no tiene `onClick` — no lleva a ningún lado. |

### §3 Producto físico

✅ Alineado en espíritu ("no otorga acceso vitalicio a toda la app") — hoy tampoco lo otorga,
porque no hay "toda la app" con niveles que otorgar: ver arriba, persona ya tiene acceso completo
sin el llavero. El llavero hoy solo habilita la ficha pública NFC/QR de un vehículo puntual.
(Nota aparte, de esta misma sesión: la compra del llavero está pausada temporalmente — ver
`docs/PENDIENTES.md`. No afecta esta sección del plan, es una pausa de venta, no una decisión de
modelo.)

### §4 Modo Persona (4.1–4.4: año premium por dispositivo, 14 días reverse trial web, Founder's Edition)

❌ Nada de esto existe. No hay:
- Ningún campo `premium_until`/`plan`/similar en `profiles` (`backend/app/models/models.py`) — la
  tabla no tiene ninguna columna de plan/suscripción para persona, solo `account_type`,
  `verification_status` (identidad, no plan) y `whatsapp_*`.
- Ningún reverse trial de 14 días para persona vía web.
- Ningún concepto de "Founder's Edition" en código, copy, ni base de datos.

### §5 Modo Empresa

| Documento | Estado real |
|---|---|
| 5.1 Validación NIT + RUES (Apify/Verifik/KYC) | ⚠️ Parcial. `backend/app/services/colombian_nit.py` valida **formato + dígito de verificación DIAN** de verdad (algoritmo módulo 11, verificado contra un NIT real publicado) — pero **no llama a ninguna API externa** (RUES, Apify, Verifik). No confirma que la empresa exista de verdad ni que su matrícula esté ACTIVA. El propio comentario del código lo dice explícito: "esto no elimina el abuso... sí filtra el caso trivial". |
| 5.2 Validación de reputación (Interzoid, Trustpilot, Google Reviews) | ❌ No existe ninguna integración con ninguno de esos proveedores. |
| 5.3 Reverse trial Empresa 14 días → estado restringido | ⚠️ Existe un trial, pero de **7 días, no 14**, y al vencer **bloquea todo el panel de negocio** (`SubscriptionExpiredCard`, `/app/negocio` y las tabs Taller/Config de `/app`), no lo deja en "estado restringido/solo lectura" como pide el documento. Además — hallazgo nuevo de esta verificación — **el trial no se calcula ni se guarda en el backend**: `profiles` no tiene columnas `trial_ends_at`/`subscription_status` (confirmado leyendo `models.py` y `ProfileOut` en `schemas.py`, ninguna las expone), y `frontend/src/lib/constants.ts::effectiveSubscription()` calcula el trial **enteramente en el cliente** a partir de `profile.created_at` + una constante `TRIAL_DAYS = 7` duplicada en dos archivos (`nfc_provisioning.py` y `constants.ts`). Esto significa que hoy no hay ninguna fuente de verdad del lado servidor para "¿esta cuenta está en trial, vencida, o suscrita?" — es puramente derivado en el navegador. |
| 5.4 Suscripción Empresa mensual | ❌ No existe ningún flujo de pago recurrente. |

### §6 Reglas generales del reverse trial

❌/⚠️ La tabla completa del documento no tiene equivalente real — solo existe la fila "Empresa"
parcialmente (arriba), con duración distinta (7 días, no 14) y comportamiento distinto (bloqueo
total, no restringido).

### §7 Planes y precios

❌ No hay ningún plan con precio configurado en ningún lado (ni backend, ni frontend, ni Wompi) más
allá del precio único del llavero físico (`PRODUCT_PRICE_COP` en `shop_orders.py`). El documento
mismo remite los precios reales a "un documento anexo" — no existe ese anexo todavía tampoco.

### §8 Restricciones y uso justo

⚠️ Parcialmente cubierto por mecanismos que ya existen pero con otro propósito (no pensados como
enforcement de plan): rate-limiting de activación NFC (`nfc.py`, 5 intentos/10 min), límites
`nfc_token_limits` por `account_type` (accesos diarios/IPs únicas). No hay ninguna detección de
"multicuentas para reiniciar trials" ni política de suspensión de cuenta explícita.

### §9–§11 Implementación técnica / Métricas / Roadmap

No implementado — son exactamente lo que este plan reemplaza con una ruta ajustada a la
arquitectura real (sección 5).

### §12 Términos y condiciones

No hay ningún texto legal de este tipo publicado en la app todavía (ni en `/nosotros`, ni en un
`/legal` o similar) — fuera del alcance de este plan (es un documento legal, no una feature).

---

## 4. Decisiones de producto que hacen falta antes de construir nada

Estas no las puede tomar un agente por su cuenta — son decisiones de negocio reales, varias con
implicación legal/de costo. El plan de fases de la sección 5 asume que se van resolviendo en
orden, no todas de una.

1. **¿"Empresa" es siempre sinónimo de "taller"?** (sección 2). Si sí, se puede implementar todo
   sobre `account_type = 'taller'` tal como está. Si no, hace falta diseñar aparte qué es una
   cuenta "Empresa" no-taller antes de tocar código.
2. **¿Qué le quita la app HOY a una cuenta persona si se crea el plan "Básico"?** Ahity persona
   tiene acceso total gratis — pasar a un esquema Básico/Premium implica *quitarle* algo a usuarios
   actuales, no solo ofrecerles más. Hace falta una lista concreta de qué queda en Básico y qué
   pasa a requerir Premium (¿Diagnóstico IA? ¿Gastos/OCR? ¿Reseñas? ¿número de vehículos?)
   — el documento no lo especifica, es matriz de producto que falta escribir.
3. **Precios reales** (COP) de Premium Persona mensual y Premium Empresa mensual — el documento
   los deja para "anexo de pricing" que no existe.
4. **Proveedor de cobro recurrente.** Wompi (ya integrado) está armado hoy solo para cobro único
   por checkout widget (`app/services/wompi.py`) — hace falta confirmar si su API soporta cobro
   recurrente/tokenización de tarjeta de la forma en que CarLink ya lo usa, o si hace falta otro
   proveedor (o una capa de "cobrar cada mes a mano" como paso intermedio). Esto es una
   investigación técnica real, no una suposición — no se investigó en esta pasada porque depende
   de las decisiones 1–3 primero (¿para qué integrar cobro recurrente sin precios ni matriz de
   producto?).
5. **Proveedor de validación RUES y de reputación** (Apify/Verifik/KYC para RUES; Interzoid/
   Trustpilot/Google Reviews para reputación) — cada uno tiene costo por consulta y contrato propio;
   alguien (el usuario) tiene que elegir y dar de alta la cuenta/API key, igual que ya pasó con
   Resend/DeepSeek/Wompi.
6. **Cuentas taller ya existentes** — hoy hay cuentas reales usando el trial de 7 días actual (y
   algunas ya con panel de negocio en uso, ver `docs/PLAN_MIGRACION_TALLERPRO.md`, en producción
   desde 2026-08-06). El documento no dice qué pasa con cuentas creadas *antes* de que el modelo
   nuevo exista — ¿se migran a "Empresa en trial de 14 días" desde su `created_at` real, arrancan
   de cero, o quedan con su trial de 7 días como estaba? Esto necesita una decisión explícita antes
   de escribir la migración de datos.
7. **Founder's Edition** — el documento lo define como "generación limitada y numerada de
   dispositivos físicos" futura. CarLink ya vendió llaveros sin ese programa. ¿Founder's Edition
   arranca desde el próximo lote (cuando se reactiven ventas, ver `docs/PENDIENTES.md`) o se
   aplica retroactivamente a compradores ya existentes? Si es retroactivo, hace falta un criterio
   de corte (¿todos los `shop_orders.status='approved'` hasta cierta fecha?).

---

## 5. Plan de fases propuesto

Reordenado respecto al roadmap del documento (que asume que la infraestructura de planes ya existe)
para que cada fase deje algo verificable contra el sistema real antes de construir la siguiente —
mismo criterio que ya usa el resto del proyecto (`docs/SECURITY.md`, regla de verificación de
`CLAUDE.md`).

**Fase 0 — Decisiones (sección 4).** Sin código. Cierra las 7 preguntas de arriba con el usuario.
Nada de lo siguiente debería empezar a construirse sin esto — construir sobre una matriz de
producto adivinada es exactamente el tipo de retrabajo que este documento busca evitar.

**Fase 1 — Backend: mover el estado de "plan" del cliente al servidor.**
Antes de agregar planes nuevos, corregir el hallazgo de la sección 3 (§5.3): el trial de taller
hoy no tiene ninguna fuente de verdad en el servidor. Agregar `profiles.trial_ends_at` y
`profiles.subscription_status` reales (migración + `ProfileOut`/`ProfileUpdate`), calculados y
devueltos por el backend, no derivados en `constants.ts`. Esto no cambia ningún comportamiento
visible todavía — es la base sobre la que se puede construir cualquier gate de plan nuevo sin
seguir adivinando la fecha de vencimiento en el navegador. Verificación: confirmar contra la DB
real que cuentas taller existentes obtienen un `trial_ends_at` coherente con su `created_at` + 7
días actual (no se les cambia el plazo en esta fase).

**Fase 2 — Terminología y alcance ("Empresa" = "taller").** Una vez resuelta la decisión #1 de la
sección 4: si "Empresa" es "taller" sin más, esta fase es solo documentación (actualizar
`docs/CONTEXTO.md` y este plan) — no hay cambio de código, `taller` ya es el único tipo de cuenta
de negocio.

**Fase 3 — Matriz de features Básico/Premium para persona + su enforcement.** Requiere la decisión
#2. Es la fase de mayor impacto en usuarios actuales (les quita algo que hoy es gratis) — necesita
comunicación al usuario final, no solo código. Construir el gate reusando el patrón que ya existe
para taller (`isSubscriptionValid`/`SubscriptionExpiredCard`, generalizado) en vez de inventar uno
nuevo.

**Fase 4 — Cobro recurrente real.** Requiere la decisión #4 (proveedor). Sin esto, "Premium" no se
puede vender de verdad — hasta acá, cualquier gate de plan solo podría activarse a mano desde
Admin, útil para probar el resto del sistema pero no para lanzar.

**Fase 5 — Validación RUES + reputación para Empresa.** Requiere la decisión #5. Reemplaza/extiende
`colombian_nit.py` (que se mantiene — la validación de dígito verificador sigue siendo útil como
primer filtro, gratis, antes de gastar una consulta de API paga). Reverse trial pasa de 7 a 14 días
solo si el usuario confirma que quiere ese cambio (decisión #6 define cómo migra lo existente).

**Fase 6 — Producto físico + Founder's Edition.** Requiere la decisión #7 y que las ventas del
llavero se reactiven (`docs/PENDIENTES.md`). Depende de que Fase 3/4 ya existan (el "1 año Premium"
del documento no significa nada sin un sistema de Premium que otorgar).

**Fase 7 — Revalidación periódica + monitoreo de uso anómalo.** Última, sobre todo lo anterior ya
en producción y estable.

---

## 6. Fuera de alcance de este plan

- Redacción de términos y condiciones legales reales (§12 del documento) — es trabajo legal, no de
  producto/código.
- Migración de datos de cuentas taller existentes al esquema nuevo — se diseña en la Fase 1/5 una
  vez resuelta la decisión #6, no antes.
- Cualquier cambio a la pausa de venta del llavero NFC (ver `docs/PENDIENTES.md`) — son
  independientes; este plan no reactiva ni extiende esa pausa.

---

## 7. Cómo se va a verificar cada fase

Mismo criterio que el resto del proyecto (`CLAUDE.md` regla 3): cada fase que toque `profiles` o
cobros se verifica contra la Supabase real (consulta directa, no solo lectura de migración) y,
donde haya cobro de por medio, contra el proveedor real (Wompi/el que se elija) antes de darla por
cerrada — no alcanza con que compile o pasen los tests. `local`/`staging`/`producción` comparten la
misma base (`docs/DEPLOY.md`), así que cualquier migración de `profiles` en esta ruta es
irreversible sin cuidado — probar primero con una cuenta de prueba real, nunca contra una cuenta de
usuario real sin avisar.
