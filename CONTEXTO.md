# CarLink — Contexto de Desarrollo (12 Jul 2026)

## Estado Actual
- **Frontend**: Next.js 15 + React 19 + TypeScript en `localhost:3000`
- **Backend**: FastAPI + SQLAlchemy async + asyncpg en `localhost:8000`
- **DB**: Supabase Cloud PostgreSQL (ref: `xgdshunvmeceqnzmkcsg`)
- **DB password**: `JUMeS2lWw5TjxuCU`
- **Tipo de cuenta**: `"persona"` (default) y `"taller"` (set via `POST /workshops`)

## Tunnel Local (para testing desde celular)
- Frontend tunnel: `https://r47l0w5x-3000.use.devtunnels.ms`
- `NEXT_PUBLIC_SITE_URL` actualizado en `.env` y `.env.local` con la URL del tunnel
- Supabase → Authentication → URL Configuration → Redirect URL agregado: `https://r47l0w5x-3000.use.devtunnels.ms/auth/callback`
- **NOTA**: Si el tunnel cambia de URL (nueva sesión VS Code), hay que actualizar el redirect URL en Supabase y `NEXT_PUBLIC_SITE_URL`

### Si el tunnel cambia de URL (paso a paso)
1. Copiar la nueva URL del tunnel que VS Code te asigne
2. Actualizar `NEXT_PUBLIC_SITE_URL` en estos archivos:
   - `frontend/.env` → línea `NEXT_PUBLIC_SITE_URL=...`
   - `frontend/.env.local` → línea `NEXT_PUBLIC_SITE_URL=...`
3. Ir a **https://supabase.com/dashboard** → proyecto `xgdshunvmeceqnzmkcsg`
4. **Authentication** → **URL Configuration** → **Redirect URLs**
5. Eliminar la URL del tunnel anterior
6. Agregar la nueva URL: `https://NUEVA-URL/auth/callback`
7. Guardar
8. Reiniciar el frontend: `cd frontend && npx next dev --port 3000`
9. Verificar: abrir `https://NUEVA-URL/app` en el celular

## Arquitectura Clave
- Tema: `document.documentElement.dataset.theme = theme` en `page.tsx`; CSS variables en `globals.css`
- `tDark = theme !== 'light'` para inline style switching
- NFC token flow: frontend genera SHA-256 → `POST /nfc/tokens` (almacena hash+prefix) → raw token se guarda en `localStorage` con key `nfc_raw_{id}`
- **Raw token NUNCA se almacena en DB** — solo el hash de 64 chars. El prefix (8 chars) es solo para display
- NFC rewrite: `/api/:path*` → `http://localhost:8000/api/:path*`
- Backend `GET /nfc/{token}`: valida len==64, hashea, busca en DB
- Token activo de prueba: raw `4d0013f0d32f27888b802e3fccb4d477264dbf3ce2c652800699f7b2b6556853` → prefix `4d0013f0`

## Migraciones Aplicadas
| # | Archivo | Descripción |
|---|---------|-------------|
| 007 | `007_vehicle_sale_fields.sql` | `sell_enabled`, `sell_price`, `sell_city`, `sell_zip`, `sell_phone`, `sell_description` en vehicles |
| 008 | `008_found_requests.sql` | Tabla `found_requests` + `whatsapp_enabled`/`whatsapp_number` en profiles |
| 009 | `009_vehicle_condition.sql` | `vehicle_condition` en vehicles, `rating` en workshops |
| 010 | `010_found_requests_phone.sql` | `finder_phone` en found_requests |

## Funcionalidades Implementadas

### NFC Public Page (`/nfc/[token]`)
- Header CarLink + badge Verificada
- Placa en font Anton con espaciado reducido (`letterSpacing: .02em`)
- Rating del taller (estrellas + "X/5")
- Sección venta (condicional a `sell_enabled`): vehículo, año, color, tipo, precio, ciudad, contacto, descripción, fecha publicación
- Ficha técnica: lubricante, kilometraje, próximo servicio (barra de progreso), servicios (sellos), taller, último servicio
- Footer: "Cualquiera con este enlace podrá ver esta versión resumida de tu ficha — sin datos personales sensibles."
- **Botón Volver**: solo si autenticado, posición absoluta arriba del card, fondo negro, texto gris sutil
- **Botón fondo dark/light**: alterna colores de todo el card con variables dinámicas (`cPrimary`, `cSecondary`, `cMuted`, `cPlate`)
- **Botón descargar PNG**: usa `html-to-image` a 2x resolución, descarga como `CarLink-{PLACA}.png`
- **Sección llavero perdido**: flujo estratégico (auth primero → teléfono si no autentica)
- **WhatsApp directo**: si owner tiene `whatsapp_enabled=true`, botón verde directo a wa.me
- **Tokens cortos**: si len != 64, muestra "Enlace incompleto" en vez de error genérico
- **Contacto propietario**: backend retorna `owner_whatsapp` y `owner_name` desde perfil

### NFC Public Page — Colores Dinámicos
```typescript
const isDark = cardBg === 'dark'
const cPrimary = isDark ? '#f5f3ec' : '#17171a'
const cSecondary = isDark ? '#c9c6ba' : '#555'
const cMuted = isDark ? '#a8a496' : '#777'
const cFaint = isDark ? '#7c786e' : '#999'
const cPlate = isDark ? '#f5f3ec' : '#17171a'
```

### Backend — NFC Endpoint (`routers/nfc.py`)
Retorna: plate, brand, model, year, color, type, vehicle_id, current_mileage, next_service_mileage, lubricant_brand, lubricant_type, total_services, latest_service_date, workshop_name, workshop_rating, sell_enabled, sell_price, sell_city, sell_zip, sell_phone, sell_description, vehicle_condition, published_at, owner_whatsapp, owner_name

### Lost Key System
- **Modelo**: `FoundRequest` con `finder_phone`, `finder_name`, `message`, `contact_method`
- **Endpoint autenticado**: `POST /found-requests` (requiere JWT)
- **Endpoint público**: `POST /found-requests/public` (sin auth, requiere nombre + teléfono)
- **Email service**: `services/email.py` — envía HTML al propietario cuando alguien reporta su llavero (configurable via SMTP_HOST, SMTP_USER, SMTP_PASS)
- **Panel notificaciones**: bell icon con badge rojo, lista de reportes con nombre, fecha, mensaje, botón llamada (tel), botón WhatsApp, info vehículo

### Profile Panel
- Toggle WhatsApp (green) + input número
- Toggle "Vender vehículo" + campos: precio, ciudad, zip, teléfono, descripción
- Guarda via `apiPut('/auth/me')` + `apiPut('/vehicles/{id}')`
- Botón "Ver ficha pública" → abre `/nfc/{rawToken}` en nueva pestaña (usa localStorage)

### FichaTab
- Botón "Ver ficha pública" / "Publicar ficha pública" — abre en nueva pestaña via `window.open()`
- Si no hay raw token en localStorage, muestra toast "Genera un llavero NFC primero"
- Al crear token: `localStorage.setItem('nfc_raw_{id}', rawToken)`
- Al revocar token: `localStorage.removeItem('nfc_raw_{id}')`

## Archivos Clave

### Frontend
- `src/app/app/page.tsx` — Main app (~1363 lines): FichaTab, HistorialTab, PartesTab, AppPage, Profile/NFC/Cart/Found panels
- `src/app/nfc/[token]/page.tsx` — NFC public page (V2 styles, dynamic bg, download, lost key)
- `src/store/auth.tsx` — Auth context (Profile interface con whatsapp_enabled, whatsapp_number)
- `src/lib/api.ts` — API wrappers (apiGet, apiPost, apiPut, apiPatch, apiDelete)
- `src/lib/supabase.ts` — `apiUrl()` returns `/api${path}`
- `next.config.ts` — Rewrites `/api/:path*` → `http://localhost:8000/api/:path*`

### Backend
- `app/main.py` — FastAPI app, CORS, all routers
- `app/routers/nfc.py` — NFC routes (public + tokens CRUD)
- `app/routers/found_requests.py` — Found request CRUD (POST, POST /public, GET, PATCH /read)
- `app/routers/auth.py` — GET /me, PUT /me (WhatsApp fields)
- `app/models/models.py` — Profile, Vehicle, Workshop, FoundRequest, NfcToken, MaintenanceRecord
- `app/schemas/schemas.py` — NfcTokenInfoPublic, VehicleOut/Update, ProfileOut/Update, FoundRequestCreate/Out
- `app/services/email.py` — Email HTML notifications
- `app/dependencies.py` — get_current_user (JWT verification)

## Cosas Pendientes / A Revisar Para Despliegue

### Crítico
1. **URLs de tunnel hardcodeadas**: `NEXT_PUBLIC_SITE_URL` en `.env` y `.env.local` apuntan al tunnel. Cambiar a la URL de producción antes de desplegar
2. **Supabase Redirect URL**: El tunnel URL está en la lista de redirect URLs. Agregar la URL de producción y remover el tunnel
3. **SMTP no configurado**: `services/email.py` tiene `SMTP_USER=""` y `SMTP_PASS=""` — el email no se envía. Configurar variables de entorno SMTP en producción
4. **`vehicle_condition` eliminado del perfil**: El campo sigue en la DB y en el modelo, pero se removió el selector del UI. Si se quiere usar, hay que re-agregarlo al perfil

### Seguridad
5. **CORS**: Verificar que `allow_origins` en `main.py` incluya solo dominios de producción
6. **Rate limiting**: El endpoint público NFC usa rate limiting in-memory. En producción usar Redis via `cache.py`

### UI/UX
7. **Lost key sin auth**: El formulario público funciona sin autenticación — verificar que el backend maneja correctamente los casos sin token
8. **Tokens en localStorage**: Los raw tokens se guardan en `localStorage`. Si el usuario limpia el storage, pierde los links. Considerar alternativa más persistente

### Despliegue
9. **Migraciones**: Ejecutar las migraciones 007-010 en la DB de producción
10. **Variables de entorno**: Verificar que todas las env vars estén configuradas en el entorno de despliegue
11. **Puerto backend**: El frontend asume backend en `localhost:8000`. En producción configurar la URL correcta del backend
