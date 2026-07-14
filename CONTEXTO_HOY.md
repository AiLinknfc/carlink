# Contexto del día — CarLink

## Responsive (Frontend)
- **globals.css**: Media queries mobile-first (≤960, ≤860, ≤640, ≤380px)
- **Sidebar**: Overlay en móvil con botón hamburger, `position: fixed`
- **Layout principal**: `margin-left: 0` en móvil, sidebar-wrap responsive
- **Tablero vehicular**: grid 3→1 col, gauges reducidos (140px)
- **Fichagrid**: 2→1 col, flip-card adaptable
- **Service chips**: 3→2→1 col
- **Topbar**: botones colapsados, solo iconos en móvil
- **Panels (profile, NFC, modales)**: full-width en móvil (`modal-panel`, `profile-panel`, `nfc-panel`)
- **Grids (partes, docs, certificados, diagnóstico)**: 1 col en móvil
- **Register page**: grids 2→1 col
- **Touch**: hover effects siempre visibles

## Vehicle Transfers (Backend + Frontend)
- **Migración**: `011_vehicle_transfers.sql` — tabla `vehicle_transfers`, campos en `vehicles`, RPCs `complete_vehicle_transfer` / `cancel_vehicle_transfer`
- **API**: POST/GET transfer, validate, accept, cancel
- **Frontend**: `TransferVehicleModal` (vendedor), `/transfer/accept` (comprador con Suspense)
- **Integración**: Botón en perfil → "Transferir vehículo"
- **Seguridad**: Solo owner inicia, email verificado, expiración 7d, cancelación vendedor, RLS

## Servidores
- **Frontend**: `localhost:3000` (Next.js)
- **Backend**: `localhost:8000` (FastAPI, `.venv/bin/uvicorn app.main:app --reload`)
- **Proxy**: `next.config.ts` reescribe `/api/*` → `localhost:8000/api/*`

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