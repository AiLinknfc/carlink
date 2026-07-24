# CarLink — Contexto de Desarrollo

> Última actualización: 2026-07-21

## Estado Actual

- **Frontend**: Next.js 15 + React 19 + TypeScript en `localhost:3000`
- **Backend**: FastAPI + SQLAlchemy async + asyncpg en `localhost:8000`
- **DB**: Supabase Cloud PostgreSQL (ref: `xgdshunvmeceqnzmkcsg`)
- **Tipo de cuenta**: `"persona"` (default) y `"taller"` (set via `POST /workshops`)

## Servidores

- Frontend: `localhost:3000` (Next.js)
- Backend: `localhost:8000` (FastAPI, `.venv/bin/uvicorn app.main:app --reload`)
- Proxy: `next.config.ts` reescribe `/api/*` → `localhost:8000/api/*`

## Tunnel Local (para testing desde celular)

- Frontend tunnel: `https://r47l0w5x-3000.use.devtunnels.ms`
- `NEXT_PUBLIC_SITE_URL` actualizado en `.env` y `.env.local` con la URL del tunnel
- Supabase → Authentication → URL Configuration → Redirect URL agregado
- **NOTA**: Si el tunnel cambia de URL, actualizar redirect URL en Supabase y `NEXT_PUBLIC_SITE_URL`

### Si el tunnel cambia de URL (paso a paso)
1. Copiar la nueva URL del tunnel
2. Actualizar `NEXT_PUBLIC_SITE_URL` en `frontend/.env` y `frontend/.env.local`
3. Ir a Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
4. Eliminar la URL anterior, agregar la nueva: `https://NUEVA-URL/auth/callback`
5. Guardar, reiniciar frontend: `cd frontend && npx next dev --port 3000`

## Variables clave (.env.local)

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Configuración OAuth (Supabase + Google)

- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/auth/callback`
- Google Cloud: Authorized redirect URI = `http://localhost:3000/auth/callback`

## Arquitectura Clave

- Tema: `document.documentElement.dataset.theme = theme` en `page.tsx`; CSS variables en `globals.css`
- `tDark = theme !== 'light'` para inline style switching
- NFC token flow: frontend genera SHA-256 → `POST /nfc/tokens` (almacena hash+prefix) → raw token se guarda en `localStorage` con key `nfc_raw_{id}`
- **Raw token NUNCA se almacena en DB** — solo el hash de 64 chars. El prefix (8 chars) es solo para display
- NFC rewrite: `/api/:path*` → `http://localhost:8000/api/:path*`
- Backend `GET /nfc/{token}`: valida len==64, hashea, busca en DB

## Responsive (Frontend)

- **globals.css**: Media queries mobile-first (≤960, ≤860, ≤640, ≤380px)
- **Sidebar**: Overlay en móvil con botón hamburger, `position: fixed`
- **Tablero vehicular**: grid 3→1 col, gauges reducidos (140px)
- **Fichagrid**: 2→1 col, flip-card adaptable
- **Service chips**: 3→2→1 col
- **Topbar**: botones colapsados, solo iconos en móvil
- **Panels**: full-width en móvil (`modal-panel`, `profile-panel`, `nfc-panel`)
- **Grids**: 1 col en móvil (partes, docs, certificados, diagnóstico)
- **Touch**: hover effects siempre visibles

## Vehicle Transfers

- **Migración**: `011_vehicle_transfers.sql` — tabla `vehicle_transfers`, campos en `vehicles`, RPCs
- **API**: POST/GET transfer, validate, accept, cancel
- **Frontend**: `TransferVehicleModal` (vendedor), `/transfer/accept` (comprador con Suspense)
- **Seguridad**: Solo owner inicia, email verificado, expiración 7d, cancelación vendedor, RLS

## Archivos Clave

### Frontend
- `src/app/app/page.tsx` — Main app: FichaTab, HistorialTab, PartesTab, Profile/NFC/Cart/Found panels
- `src/app/nfc/[token]/page.tsx` — NFC public page
- `src/store/auth.tsx` — Auth context
- `src/lib/api.ts` — API wrappers (apiGet, apiPost, apiPut, apiPatch, apiDelete)
- `src/lib/types.ts` — Shared TypeScript types
- `next.config.ts` — Rewrites `/api/:path*` → `http://localhost:8000/api/:path*`

### Backend
- `app/main.py` — FastAPI app, CORS, all routers
- `app/routers/nfc.py` — NFC routes (public + tokens CRUD)
- `app/routers/found_requests.py` — Found request CRUD
- `app/routers/auth.py` — GET /me, PUT /me
- `app/models/models.py` — Profile, Vehicle, Workshop, FoundRequest, NfcToken, MaintenanceRecord
- `app/schemas/schemas.py` — Pydantic schemas
- `app/dependencies.py` — get_current_user, verify_vehicle
- `app/utils.py` — Shared utilities (validate_upload_file)
