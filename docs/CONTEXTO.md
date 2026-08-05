# CarLink — Contexto de Desarrollo

_Última actualización: 2026-08-04._

## Estado actual

- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript — producción en Vercel (`carlink.com.co`)
- **Backend**: FastAPI + SQLAlchemy async + asyncpg — producción en Railway (`api.carlink.com.co`)
- **DB**: Supabase Cloud PostgreSQL (ref `xgdshunvmeceqnzmkcsg`) — **local, staging y producción comparten la misma instancia** hasta que se separen ambientes (ver `docs/DEPLOY.md`)
- **Tipos de cuenta**: `persona` (default), `taller` (vía `POST /workshops`), `empresa`

## Panel de negocio taller/empresa (2026-08-04, sin desplegar todavía)

Migración completa de `tallerpro/` (SaaS de taller standalone con datos mock) hacia una sección
aditiva de CarLink — panel multi-cliente en `/app/negocio` (clientes, órdenes de trabajo,
inventario, citas, notificaciones, rentabilidad, documentos, diagnóstico IA, perfil del taller,
ficha pública). No reemplaza ni toca las tabs por-vehículo existentes de `/app`
(Ficha/Taller/Diagnóstico/Partes/Config). Detalle completo, fase por fase: `docs/PLAN_MIGRACION_TALLERPRO.md`.

**Vive en la rama local `feat/taller-empresa-panel` — sin push, sin desplegar** (a propósito, ver
`docs/PENDIENTES.md`). Las migraciones de DB (023–032) sí están aplicadas contra la Supabase real
(aditivas, inertes hasta que se despliegue el código).

## Arquitectura del llavero NFC (rediseñada 2026-07-27)

Antes, cualquier usuario autenticado podía autogenerar un token NFC por software (`POST /nfc/tokens`, retirado) sin relación con ningún llavero físico real. El modelo actual:

1. **Admin provisiona** un llavero físico: `POST /admin/nfc/whitelist/provision` genera el token crudo (para grabar en el chip) + un código de activación separado (para imprimir en el empaque). Ambos se devuelven una sola vez; solo se guardan sus hashes.
2. **Usuario activa** su llavero con el código impreso: `POST /nfc/activate` — reclamo atómico, rate-limited (5 intentos/10 min por usuario + IP).
3. **Ficha pública**: `GET /nfc/{token}` — valida longitud 64, hashea, busca en DB, nunca expone datos del dueño.

Migración `019_nfc_activation_codes.sql` agrega las columnas de provisión a `nfc_token_whitelist` (`activation_code_hash`, `token_hash`, `token_prefix`, `token_url_encrypted`, `status`, `claimed_by`, `claimed_vehicle_id`, `claimed_at`).

**Raw token NUNCA se almacena en DB** — solo el hash SHA-256 de 64 chars. El prefix (8 chars) es solo para display.

**Confirmado funcionando en producción de punta a punta** (provisión → activación → ficha pública) al cierre de esta sesión.

### Pendiente sobre el llavero NFC
- El carrito "Solicitar llavero NFC" sigue siendo una maqueta de UI sin backend real de pedidos/pago (decisión explícita: fuera de alcance por ahora).
- `nfc_token_limits` solo tiene semillas para `persona` y `taller` — falta agregar `empresa` para que el límite de negocio se aplique de verdad y no caiga al default de código (1).
- El rol "admin" es un solo UUID hardcodeado (`ADMIN_USER_ID` / `NEXT_PUBLIC_ADMIN_USER_ID`), no un rol basado en `account_type`. No escala a múltiples administradores.

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

- Migración `011_vehicle_transfers.sql` — tabla `vehicle_transfers`, campos en `vehicles`, RPCs `complete_vehicle_transfer` / `cancel_vehicle_transfer`
- API: POST/GET transfer, validate, accept, cancel
- Frontend: `TransferVehicleModal` (vendedor), `/transfer/accept` (comprador)
- Seguridad: solo owner inicia, email verificado, expiración 7d, cancelación vendedor, RLS

## Archivos clave

### Frontend
- `src/app/app/page.tsx` — panel principal del usuario (Ficha, Historial, Partes, NFC/activación, Cart, Found)
- `src/app/admin/page.tsx` — panel admin NFC (tokens, whitelist/provisión, alertas, límites)
- `src/app/nfc/[token]/page.tsx` — ficha pública NFC
- `src/lib/api.ts` — wrappers de API (apiGet/Post/Put/Patch/Delete, `activateNfcCode`)
- `next.config.ts` — rewrite `/api/:path*` → backend

### Backend
- `app/main.py` — FastAPI app, CORS, routers, `/api/health`
- `app/routers/nfc.py` — activación, listado/revocación de tokens, ficha pública
- `app/routers/admin.py` — provisión de llaveros, whitelist, límites, alertas
- `app/models/models.py` — ORM (Profile, Vehicle, NfcToken, NfcTokenWhitelist, NfcAccessLog, etc.)
- `app/services/crypto.py` — cifrado AES-256-GCM de URLs de llaveros (requiere `ENCRYPTION_KEY`)

## Notas de seguridad

- **Nunca hardcodear secretos** (contraseñas de DB, API keys, `ENCRYPTION_KEY`) en archivos versionados — ni en `.env.example`, ni en scripts de `tests/`, ni en archivos `.md`. Ver `docs/DEPLOY.md` para el incidente de credenciales filtradas (2026-07-27) y cómo se resolvió.
- Las variables reales viven en `backend/.env` (gitignored) para desarrollo local, y en los dashboards de Railway/Vercel para producción — nunca en el repo.
