# Deployment Guide — CarLink

## Ambientes

| Entorno | Frontend | Backend | DB | Uso |
|---------|----------|---------|----|-----|
| **Local** | `localhost:3000` | `localhost:8000` | Supabase Cloud | Desarrollo |
| **Staging** | Vercel (preview) | Railway | Supabase Cloud (mismo) | QA antes de prod |
| **Production** | Vercel | Railway | Supabase Cloud | Usuarios reales |

## Variables de entorno

### Backend (Railway)
```
DATABASE_URL=postgresql://...
SUPABASE_JWT_SECRET=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_USER_ID=<UUID del usuario admin en Supabase>
ENCRYPTION_KEY=<64 chars hex, 32 bytes — openssl rand -hex 32>
FRONTEND_URL=https://carlink.app
REDIS_URL=redis://...
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
ENVIRONMENT=production
PORT=8000
CORS_ORIGINS=https://carlink.app,https://www.carlink.app
```

**`ENCRYPTION_KEY` es obligatoria para el flujo NFC, no opcional**: desde la migración 019, un token solo se crea vía `/nfc/activate` (nunca en el navegador), así que el frontend nunca tiene el token crudo — la única forma de que "Copiar enlace" funcione es recuperar la URL cifrada del servidor. Sin `ENCRYPTION_KEY`, `encrypt_url()` (`app/services/crypto.py`) degrada silenciosamente y ningún llavero activado podrá mostrar su enlace. Verificar que esté seteada es parte del checklist de post-despliegue.

**`FRONTEND_URL` la usa `POST /admin/nfc/whitelist/provision`** para construir la URL que se graba en cada chip físico (`{FRONTEND_URL}/nfc/{token}`). Si queda mal configurada, los llaveros ya despachados apuntan a la URL equivocada.

### Frontend (Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=https://carlink.app
NEXT_PUBLIC_API_URL=https://api.carlink.app
```

## Arquitectura de despliegue

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Vercel    │────▶│   Railway    │────▶│  Supabase    │
│  (Frontend) │     │  (Backend)   │     │  (Postgres)  │
│  Next.js    │     │  FastAPI     │     │              │
└─────────────┘     └──────────────┘     └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Upstash    │
                    │   (Redis)    │
                    └──────────────┘
```

## Checklist de despliegue

### Pre-despliegue
1. Comprar dominio (ej. `carlink.app`)
2. Configurar DNS apuntando a Vercel (frontend) y Railway (backend)
3. Configurar variables de entorno en Vercel y Railway
4. Configurar `ADMIN_USER_ID` con el UUID real del admin
5. Ejecutar migraciones 013-015 en Supabase
6. Cargar whitelist de UIDs de chips NFC
7. Verificar CORS y redirect URLs en Supabase

### Despliegue
1. `git push origin main` → triggers deploy automático
2. Verificar frontend en Vercel (build exitoso)
3. Verificar backend en Railway (healthcheck `/api/health`)
4. Probar flujo completo: login → crear vehículo → generar token NFC
5. Probar admin panel: `/admin` → stats, tokens, alerts, whitelist, limits
6. Verificar que el NFC público funciona con token real

### Post-despliegue
1. Monitorear logs de Railway por errores
2. Verificar rate limiting funciona
3. Verificar alertas se crean correctamente
4. Probar desde celular (QR code del llavero NFC)

## CI/CD

### GitHub Actions (futuro)
```yaml
name: CI
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -r requirements.txt
      - run: pytest tests/ -v
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd frontend && npm ci
      - run: cd frontend && npx tsc --noEmit
      - run: cd frontend && npx vitest run
```

## Migraciones en producción

**Local, staging y producción comparten la misma instancia de Supabase** (ver tabla de Ambientes arriba) — no hay separación de base de datos entre entornos todavía. Hasta que exista un proyecto Supabase separado para dev/staging (ver sección siguiente), cualquier migración nueva debe correrse manualmente contra esta única base y quedar registrada aquí de inmediato — de lo contrario el código y el esquema real se desincronizan silenciosamente (esto ya pasó con las migraciones 016 y 017, corridas en el código antes que en la base).

```bash
# Conectar a Supabase
psql "postgresql://postgres:<password>@db.xgdshunvmeceqnzmkcsg.supabase.co:5432/postgres"

# Ejecutar migraciones en orden — mantener esta lista al día con supabase/migrations/
\i supabase/migrations/013_nfc_admin_tokens.sql
\i supabase/migrations/014_nfc_token_limits_access_logs.sql
\i supabase/migrations/015_nfc_alerts_whitelist.sql
\i supabase/migrations/016_nfc_token_url_encrypted.sql
\i supabase/migrations/017_increase_persona_token_limit.sql
\i supabase/migrations/018_revert_persona_token_limit_to_1.sql
\i supabase/migrations/019_nfc_activation_codes.sql
\i supabase/migrations/020_job_applications.sql
\i supabase/migrations/021_nfc_qr_slug.sql
\i supabase/migrations/022_nfc_tag_inventory.sql
\i supabase/migrations/023_workshop_profile_extend.sql
\i supabase/migrations/024_workshop_mechanics.sql
\i supabase/migrations/025_workshop_service_items.sql
\i supabase/migrations/026_workshop_clients_vehicles.sql
\i supabase/migrations/027_work_orders.sql
\i supabase/migrations/028_workshop_inventory.sql
\i supabase/migrations/029_appointments.sql
\i supabase/migrations/030_workshop_notifications_documents.sql
\i supabase/migrations/031_workshop_reviews.sql
```

**Nota sobre 023–031 (2026-08-04)**: modelo de datos del panel nuevo de taller/empresa (migración de
`tallerpro/`, ver `docs/PLAN_MIGRACION_TALLERPRO.md`). Todas aditivas — ninguna toca columnas ni
tablas existentes. Aplicadas y verificadas contra la base real de producción (13 tablas nuevas +
columnas nuevas en `workshops` confirmadas por consulta directa a `information_schema`).

**Nota sobre 017/018**: la 017 subió el límite de llaveros activos de `persona` a 2 sin una razón de producto documentada. Se decidió revertir a 1 (un token = un llavero, sin excepción) — la 018 corrige esto. Correr ambas en orden dado que no se puede confirmar si la 017 ya se aplicó antes en producción; el resultado neto es 1 de cualquier forma.

**Nota sobre 019**: cambia el modelo de creación de llaveros de raíz. Antes, cualquier usuario autenticado podía generar un token NFC por software (sin relación con un llavero físico real) — `POST /nfc/tokens` fue retirado. Ahora un token solo nace de un llavero físico que CarLink provisiona de antemano (`POST /admin/nfc/whitelist/provision`, que genera el token pre-grabado + un código de activación) y el usuario lo reclama con `POST /nfc/activate`. **Esta migración debe correr antes de desplegar el backend nuevo** — a diferencia de 016/017, aquí no hay código defensivo que tolere la ausencia de las columnas nuevas; si no se aplica primero, `/nfc/activate` y `/admin/nfc/whitelist/provision` fallan con error 500 de columna inexistente.

**Regla:** cada vez que se agregue un archivo a `supabase/migrations/`, en el mismo PR se debe (1) correrlo contra la base real y (2) añadir su línea `\i` aquí. Este checklist es actualmente la única fuente de verdad de qué se aplicó — no hay tabla de control de versión de esquema (ver "Pendiente: separación de ambientes" abajo).

### Pendiente: separación de ambientes

El estado actual (una sola base de datos para los tres entornos) es la causa raíz de varios bugs de producción recientes: migraciones corridas de forma inconsistente, código defensivo agregado para tolerar un esquema desconocido en vez de corregirlo. Recomendado:

1. Crear un proyecto Supabase separado para desarrollo/staging (plan free sirve).
2. `local` y `staging` apuntan al proyecto nuevo; solo `production` (Railway prod + Vercel prod) apunta al proyecto actual.
3. Adoptar `supabase migration up` (o Alembic) en vez de `\i` manual, para que las migraciones aplicadas queden registradas en una tabla y el comando sea idempotente/rastreable por entorno.

## Lecciones del despliegue de la reactivación NFC (2026-07-27)

**Redeploys de Railway pueden tardar varios minutos y "Redeploy" en la fila equivocada revive un deployment viejo.** En esta sesión, un fix ya correcto tardó ~40 minutos en verse reflejado en producción porque:
- El auto-deploy desde GitHub no es instantáneo — puede tardar varios minutos en iniciar el build.
- Dar clic en "Redeploy" sobre una fila vieja de la lista de Deployments **reconstruye ese commit viejo**, no el más reciente — y visualmente es indistinguible de "el fix no llegó".
- Una de las filas correctas llegó a existir en la lista pero fue removida antes de poder promoverla.

**Cómo verificar sin ambigüedad que un deploy nuevo está realmente en producción**: no repruebes el bug directamente primero — agrega temporalmente un marcador trivial y verificable (por ejemplo, cambiar el `version` de `GET /api/health`) y haz polling de ese endpoint hasta ver el valor nuevo. Solo después de confirmar el marcador, vuelve a probar el bug real. Esto evita confundir "el deploy no ha terminado" con "el fix no funciona".

**Variables `NEXT_PUBLIC_*` en Vercel se inyectan en tiempo de build, no en runtime.** Agregar o cambiar una y darle "Redeploy" sin desmarcar "Use existing Build Cache" puede dejar el valor viejo (o ninguno) compilado en el bundle del navegador. Verificar esto es posible sin acceso al dashboard: el HTML de cualquier página trae las rutas de sus chunks JS (`/_next/static/chunks/app/.../page-<hash>.js`); si el hash del chunk no cambió tras el redeploy, no hubo rebuild real.

**El CLI de Railway (`railway login`) abre un callback OAuth en `127.0.0.1` de la máquina donde corre** — debe ejecutarlo el usuario en su propia terminal (o vía el prefijo `!` en Claude Code), nunca desde el entorno sandboxeado de un agente, que no tiene navegador real para completar el flujo.
