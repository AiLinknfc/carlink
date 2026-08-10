# CarLink — Contexto de Desarrollo

_Última actualización: 2026-08-09._

## Estado actual

- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript — producción en Vercel (`carlink.com.co`)
- **Backend**: FastAPI + SQLAlchemy async + asyncpg — producción en Railway (`api.carlink.com.co`)
- **DB**: Supabase Cloud PostgreSQL (ref `xgdshunvmeceqnzmkcsg`) — **local, staging y producción comparten la misma instancia** hasta que se separen ambientes (ver `docs/DEPLOY.md`)
- **Tipos de cuenta**: la columna `profiles.account_type` **solo admite `'persona'` o `'taller'` por
  constraint de DB** (`003_multi_tenant.sql`). `'empresa'`/`'business'` **nunca llegan a la base** —
  son solo un estado transitorio de la UI de registro/login (`LoginModal.tsx`) que termina creando
  una cuenta `'taller'`; el frontend los trata como sinónimos vía `isBusinessAccount()`. Ver
  `docs/PENDIENTES.md` → "Hallazgos de arquitectura" #1 (esto invalida el pendiente histórico de
  "agregar fila `empresa` a `nfc_token_limits`" — no hay tal fila posible).

## Panel de negocio taller/empresa (2026-08-04 → 2026-08-06, EN PRODUCCIÓN)

Migración completa de `tallerpro/` (SaaS de taller standalone con datos mock) hacia una sección
aditiva de CarLink — panel multi-cliente en `/app/negocio` (clientes, órdenes de trabajo,
inventario, citas, notificaciones, rentabilidad, documentos, diagnóstico IA, perfil del taller,
ficha pública), más paridad visual con tallerpro y facturación automática al entregar/cobrar una
orden. No reemplaza ni toca las tabs por-vehículo existentes de `/app`
(Ficha/Taller/Diagnóstico/Partes/Config). Detalle completo, fase por fase: `docs/PLAN_MIGRACION_TALLERPRO.md`,
`docs/PLAN_PARIDAD_UI_TALLERPRO.md`, `docs/PLAN_FACTURACION_AUTOMATICA.md`.

**Ya está en `master` y desplegado en producción** — verificado 2026-08-07:
`api.carlink.com.co/api/health` responde `version 1.0.2`, igual que el código de `master`.
Todas las migraciones de DB (023–034) están aplicadas contra la Supabase real. Lo que sigue
pendiente (variable de entorno de IA sin confirmar, verificación visual de PDFs, etc.) vive en
`docs/PENDIENTES.md` — **ese es el único lugar donde se lleva la lista de pendientes**, no lo
repitas acá.

## Arquitectura del llavero NFC (rediseñada 2026-07-27; rol partner agregado 2026-08-08)

Antes, cualquier usuario autenticado podía autogenerar un token NFC por software (`POST /nfc/tokens`, retirado) sin relación con ningún llavero físico real. El modelo actual:

1. **Admin provisiona** un llavero físico: `POST /admin/nfc/whitelist/provision` genera el token crudo (para grabar en el chip) + un código de activación separado (para imprimir en el empaque). Ambos se devuelven una sola vez; solo se guardan sus hashes.
2. **Usuario activa** su llavero con el código impreso: `POST /nfc/activate` — reclamo atómico, rate-limited (5 intentos/10 min por usuario + IP).
3. **Ficha pública**: `GET /nfc/{token}` — valida longitud 64, hashea, busca en DB, nunca expone datos del dueño.

Migración `019_nfc_activation_codes.sql` agrega las columnas de provisión a `nfc_token_whitelist` (`activation_code_hash`, `token_hash`, `token_prefix`, `token_url_encrypted`, `status`, `claimed_by`, `claimed_vehicle_id`, `claimed_at`).

**Raw token NUNCA se almacena en DB** — solo el hash SHA-256 de 64 chars. El prefix (8 chars) es solo para display.

**Confirmado funcionando en producción de punta a punta** (provisión → activación → ficha pública) al cierre de esta sesión.

**Rol partner (2026-08-08, migraciones `040`/`041`)** — aprovisionamiento escopeado para llaveros de
campaña/evento, separado del admin único: tabla `partners` (cupo, api key propia hasheada, status),
`nfc_token_whitelist.provisioned_by_partner_id`/`partner_batch_id` para atribución. Un partner
(`GET/POST /partners/me/*`, header `X-Partner-Api-Key`) solo ve y aprovisiona dentro de su propio
cupo, nunca nada de otro partner ni del admin; el admin también puede asignar un llavero a un
partner directo desde `/admin` sin repartirle ninguna api key. La ruta criptográfica (arriba) no
cambia — reusa exactamente `generate_nfc_token`/`generate_human_code`. La generación/descarga de QR
(`QrCodePanel.tsx`, niveles Simple/Estándar/Máxima resistencia) vive solo en Admin NFC → Whitelist y
en `/partner` — se sacó por completo del modo persona (`FichaTab.tsx`, `app/app/page.tsx`).
Detalle completo, decisiones y verificación: `docs/PLAN_PARTNER_MODEL.md`.

### Pendiente sobre el llavero NFC
Lista completa y actualizada en `docs/PENDIENTES.md` (única fuente de verdad de pendientes).

## Checkout de llavero NFC (Wompi, 2026-08-08, EN PRODUCCIÓN)

`CartModal.tsx` (landing pública y `/app`) cobra un llavero nuevo con Wompi (sandbox activo,
credenciales de producción listas pero comentadas en `backend/.env`, ver `docs/SECURITY.md`).
`backend/app/routers/shop_orders.py` + `app/services/wompi.py`: el monto siempre se calcula
server-side (`PRODUCT_PRICE_COP`, nunca se confía en lo que mande el cliente), la confirmación
(`POST /shop/orders/{reference}/confirm` y el webhook) siempre re-verifica `reference` y
`amount_in_cents` contra la respuesta real de la API de Wompi antes de aceptar un cambio de estado.
"Mis pedidos" (cliente, siempre de solo lectura, siempre las órdenes propias) vive separado de la
cola de despacho ("Pedidos" dentro de Admin NFC, que ve todo y tiene los botones de
marcar enviado/entregado) — nunca se gestiona desde el modo cliente aunque quien mire sea la cuenta
admin. Correo real (pago confirmado, enviado, notificación al admin) implementado pero **sin salir
todavía** — `SMTP_USER`/`SMTP_PASS` vacíos, ver `docs/PENDIENTES.md`.

## Sistema de gastos y escaneo de recibos (2026-08-10)

Tabla `vehicle_expenses` (migración `042`) con RLS por `owner_id`. CRUD completo vía
`backend/app/routers/expenses.py`. Campos específicos para combustible (litros, precio/litro,
tipo, kilometraje).

**OCR: DeepSeek como proveedor único (decisión 2026-08-10).** No se usa ningún otro proveedor de IA
para escaneo de recibos. La pipeline es:

1. **RapidOCR** (gratis, local, `rapidocr-onnxruntime`) → extrae texto crudo de la imagen
2. **DeepSeek API** (`deepseek-chat`, ~$0.002/recibo) → estructura el texto en campos tipados

Razones: DeepSeek maneja bien contextos en español, precios colombianos, nombres de estaciones
de servicio. Tesseract/RapidOCR solo extraen texto plano sin entender semántica. No se justifica
agregar otro proveedor de IA para esta功能. El endpoint es `POST /api/expenses/scan`.

## Servidores locales

- **Frontend**: `localhost:3000` (`npm run dev`)
- **Backend**: `localhost:8000` (`.venv/bin/uvicorn app.main:app --reload`)
- **Proxy**: `next.config.ts` reescribe `/api/:path*` → `${NEXT_PUBLIC_API_URL}/api/:path*` (default `http://localhost:8000`)

## Responsive (Frontend)

- `globals.css`: media queries mobile-first (≤960, ≤860, ≤640, ≤380px)
- Sidebar: overlay en móvil con botón hamburger, `position: fixed`
- Layout principal: `margin-left: 0` en móvil, sidebar-wrap responsive
- Tablero vehicular: grid 3→1 col, gauges reducidos (140px)
- Panels (profile, NFC, modales): full-width en móvil
- Touch: hover effects siempre visibles

## Vehicle Transfers

- Migración `011_vehicle_transfers.sql` — tabla `vehicle_transfers`, campos en `vehicles`.
- API: `frontend/src/app/api/vehicles/transfers/**` + `[id]/transfer` — la **única** parte de
  CarLink que llama a Supabase directo con `@supabase/supabase-js` en vez de pasar por el backend
  de FastAPI (que conecta como `postgres` y por lo tanto nunca depende de RLS). Por eso acá, a
  diferencia del resto del proyecto, **RLS es el límite de seguridad real**, no algo secundario —
  cualquier cambio en este subsistema debe re-verificarse con simulación de rol real (ver
  `docs/SECURITY.md`), no solo con revisión de código.
- Frontend: `TransferVehicleModal` (vendedor), `/transfer/accept` (comprador).
- **2026-08-09 — auditado y con una vulnerabilidad real encontrada y corregida** (no teórica: un bug
  de autorización dejaba que cualquier usuario aceptara la transferencia pendiente de otro y se
  quedara con su vehículo; además faltaban las políticas RLS que hacían falta para que la
  aceptación legítima funcionara en absoluto). `vehicle_transfers` tenía 0 filas en producción al
  momento de la auditoría — no hay evidencia de explotación. Detalle completo, root cause y
  verificación: `docs/SECURITY.md` → "Hallazgo: vulnerabilidad real en transferencia de vehículos",
  `supabase/migrations/041_rls_hardening.sql`.

## Archivos clave

### Frontend
- `src/app/app/page.tsx` — panel principal del usuario (Ficha, Historial, Partes, NFC/activación, Cart, Found)
- `src/app/admin/page.tsx` — panel admin NFC (tokens, whitelist/provisión, alertas, límites, Pedidos, Partners)
- `src/app/partner/page.tsx` — panel de prueba del rol partner (api key propia, sin sesión de Supabase)
- `src/app/nfc/[token]/page.tsx` — ficha pública NFC
- `src/components/QrCodePanel.tsx` — generación/descarga de QR (Simple/Estándar/Máxima resistencia), solo en Admin/`/partner`
- `src/components/CartModal.tsx` — checkout Wompi del llavero
- `src/lib/api.ts` — wrappers de API (apiGet/Post/Put/Patch/Delete, `activateNfcCode`, `partnerApi.*`)
- `next.config.ts` — rewrite `/api/:path*` → backend

### Backend
- `app/main.py` — FastAPI app, CORS, routers, `/api/health`
- `app/routers/nfc.py` — activación, listado/revocación de tokens, ficha pública
- `app/routers/admin.py` — provisión de llaveros, whitelist, límites, alertas, gestión de partners
- `app/routers/partners.py` — autoservicio del rol partner (`/partners/me/*`)
- `app/routers/shop_orders.py` + `app/services/wompi.py` — checkout del llavero
- `app/models/models.py` — ORM (Profile, Vehicle, NfcToken, NfcTokenWhitelist, NfcAccessLog, Partner, ShopOrder, etc.)
- `app/services/crypto.py` — cifrado AES-256-GCM de URLs de llaveros (requiere `ENCRYPTION_KEY`)
- `app/services/colombian_nit.py` — validación real de NIT (dígito de verificación DIAN) al registrar un taller

## Notas de seguridad

- **Nunca hardcodear secretos** (contraseñas de DB, API keys, `ENCRYPTION_KEY`) en archivos versionados — ni en `.env.example`, ni en scripts de `tests/`, ni en archivos `.md`. Ver `docs/DEPLOY.md` para el incidente de credenciales filtradas (2026-07-27) y cómo se resolvió.
- Las variables reales viven en `backend/.env` (gitignored) para desarrollo local, y en los dashboards de Railway/Vercel para producción — nunca en el repo.
