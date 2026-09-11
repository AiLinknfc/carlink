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
WOMPI_PRIVATE_KEY=prv_...
WOMPI_EVENTS_SECRET=...
WOMPI_INTEGRITY_SECRET=...
```

**`WOMPI_*` — checkout del llavero NFC (`app/routers/shop_orders.py`, `app/services/wompi.py`)**: las
tres son del dashboard de Wompi (Desarrolladores > Secretos para integración técnica). Elegir
sandbox (`prv_test_...`) o producción (`prv_prod_...`) se hace solo con qué llave privada se
configura acá — `wompi.py` elige el host de la API (`sandbox.wompi.co` / `production.wompi.co`)
mirando el prefijo, no hay una variable de ambiente separada que se pueda desincronizar. También
hay que configurar la URL de este endpoint (`https://<backend>/api/shop/webhooks/wompi`) como
webhook de "Eventos" en el dashboard de Wompi — si no, los pagos solo se confirman por el camino
activo (`POST /shop/orders/{reference}/confirm`, que dispara el frontend) y no hay respaldo si la
persona cierra la pestaña antes de que ese llamado termine.

**`ENCRYPTION_KEY` es obligatoria para el flujo NFC, no opcional**: desde la migración 019, un token solo se crea vía `/nfc/activate` (nunca en el navegador), así que el frontend nunca tiene el token crudo — la única forma de que "Copiar enlace" funcione es recuperar la URL cifrada del servidor. Sin `ENCRYPTION_KEY`, `encrypt_url()` (`app/services/crypto.py`) degrada silenciosamente y ningún llavero activado podrá mostrar su enlace. Verificar que esté seteada es parte del checklist de post-despliegue.

**`FRONTEND_URL` la usa `POST /admin/nfc/whitelist/provision`** para construir la URL que se graba en cada chip físico (`{FRONTEND_URL}/nfc/{token}`). Si queda mal configurada, los llaveros ya despachados apuntan a la URL equivocada.

### Frontend (Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=https://carlink.app
NEXT_PUBLIC_API_URL=https://api.carlink.app
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_...
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

### Confirmar que un deploy realmente aterrizó (procedimiento, adoptado 2026-08)
Railway puede tardar varios minutos y sus redeploys son lentos/confusos (ver "Lecciones del
despliegue de la reactivación NFC" más abajo) — no asumir que un deploy terminó solo porque pasó
tiempo. Antes de cada push a `master`, bumpear `version` en `GET /api/health`
(`backend/app/main.py`). Después del push, hacer poll de `https://api.carlink.com.co/api/health`
hasta que el `version` devuelto coincida con el que se acaba de subir — recién ahí se confirma que
el backend nuevo está sirviendo tráfico real, en vez de confundir "el deploy no ha terminado" con
"el feature no funciona". Usado dos veces con éxito (bump a `1.0.1` y a `1.0.2`, este último
específicamente para diagnosticar una caída de producción).

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
\i supabase/migrations/032_diagnostic_cda_fields.sql
\i supabase/migrations/033_workshop_ficha_public_toggle.sql
\i supabase/migrations/034_parts_workshop_attribution.sql
\i supabase/migrations/035_workshop_promotions.sql
\i supabase/migrations/036_part_category.sql
\i supabase/migrations/037_profile_verification.sql
\i supabase/migrations/038_shop_orders.sql
\i supabase/migrations/039_shop_orders_fulfillment.sql
\i supabase/migrations/040_partner_program.sql
\i supabase/migrations/041_rls_hardening.sql
\i supabase/migrations/042_vehicle_expenses.sql
\i supabase/migrations/043_waitlist_leads.sql
\i supabase/migrations/044_customer_reviews.sql
\i supabase/migrations/045_review_context.sql
\i supabase/migrations/046_shop_orders_payment_method.sql
\i supabase/migrations/047_lost_keychain_toggle.sql
\i supabase/migrations/048_fix_nfc_active_defaults.sql
\i supabase/migrations/049_georeference_workshops.sql
\i supabase/migrations/050_waitlist_leads_contact_type.sql
\i supabase/migrations/051_whatsapp_click_tracking.sql
```

**Nota sobre 050 (2026-09-11, confirmada aplicada contra la base real)**: agrega
`waitlist_leads.contact_type` (`email`|`phone`, `NOT NULL`) para poder segmentar leads por canal en
campañas de marketing. Backfill de las 24 filas existentes por heurística (`@` → email, si no
→ phone; 23 email / 1 phone) — ver `app/services/contact_validation.py` para la validación real
que corre en el backend desde ahora en adelante. Aditiva, ya aplicada — verificado por consulta
directa a `information_schema.columns` (columna presente, `NOT NULL`) más el índice
`idx_waitlist_leads_contact_type`.

**Nota sobre 051 (2026-09-11, confirmada aplicada contra la base real)**: tabla nueva
`whatsapp_clicks` (`intent`, `source`, `user_id` opcional, `created_at`) — tracking mínimo de los 8
botones/links `wa.me` reales de la app (`POST /api/analytics/whatsapp-click`, público, best-effort)
para medir volumen real por motivo antes de la primera campaña de publicidad, ver
`docs/PENDIENTES.md`. Resumen agregado en `GET /api/analytics/whatsapp-clicks/summary`
(admin-only). Aditiva, ya aplicada — verificado por consulta directa a
`information_schema.columns` + `pg_indexes`, y con 6 clicks de prueba reales (uno por cada
`intent`) contra el backend local, confirmados en la tabla y borrados después.

**Nota sobre 049 (2026-09-07, confirmada aplicada 2026-09-09)**: agrega `workshops.latitude`/
`workshops.longitude` (georreferenciación para mostrar talleres en mapa) y
`vehicles.georeference_enabled` (toggle de la ficha pública, `NOT NULL DEFAULT false`). Aditiva.
**Esta línea y la de 047/048 faltaban en este checklist** — las tres ya estaban aplicadas contra
la base real (confirmado por consulta directa a `information_schema.columns` para la 049; 047/048
ya documentadas en `docs/CONTEXTO.md`/`docs/PENDIENTES.md`), pero nunca se agregó su `\i` acá,
violando la regla de abajo. Corregido en la auditoría de 2026-09-09.

**Nota sobre 048/047**: ver `docs/CONTEXTO.md` (`nfc_active` default fix, toggle de llavero
perdido) — aplicadas y verificadas en su momento, solo faltaba esta línea.

**Nota sobre 046 (2026-08-12)**: agrega `payment_method` (`wompi`|`cod`) a `shop_orders` — antes
no había forma de distinguir un pedido contraentrega de uno pagado con Wompi, así que un pedido
contraentrega quedaba en `status='pending'` para siempre (sin ninguna ruta que lo moviera a
`approved` fuera del webhook de Wompi) y el panel admin no tenía ningún botón para cerrarlo. Ahora
`POST /shop/orders/{reference}/mark-paid` (admin-only) permite aprobar un pedido `cod` a mano —
rechaza explícitamente los `wompi` para que no se pueda marcar pagado un pedido con pasarela real
sin que Wompi lo haya confirmado. Aditiva (default `'wompi'` para las 9 órdenes ya existentes),
aplicada y verificada contra la base real (`information_schema` + conteo de filas).

**Nota sobre 039 (2026-08-08)**: agrega `fulfillment_status`/`shipped_at`/`delivered_at`/
`tracking_note` a `shop_orders` — estado del *envío*, separado del estado del *pago* (`status`,
ya real desde 038). Lo mueve un admin a mano desde "Mis pedidos"
(`PATCH /shop/orders/{reference}/fulfillment`, requiere `ADMIN_USER_ID`), dispara el correo
"tu llavero ya salió" al cliente. Aditiva, aplicada y verificada contra la base real.

**Nota sobre 038 (2026-08-08)**: crea `shop_orders` — checkout real del llavero NFC pagado con
Wompi (reemplaza la maqueta que solo vivía en `localStorage`, docs/PENDIENTES.md ítem 14). Tabla
nueva, no toca nada existente. Aplicada y verificada contra la base real (columnas confirmadas por
`information_schema`, y una orden de prueba real de principio a fin contra el sandbox de Wompi —
ver la nota de arriba sobre `WOMPI_*`).

**Nota sobre 035–037 (2026-08-08)**: `backend/migrations/` existía en paralelo a `supabase/migrations/`
con su propia numeración (002–005), nunca referenciada desde este checklist ni desde ningún otro
lugar del repo — un segundo historial de migraciones huérfano, con números que además chocan con los
de `supabase/migrations/002–005` (contenido distinto). Las tres con cambio de esquema real
(`002_workshop_promotions`, `004_part_category`, `005_profile_verification`) ya estaban aplicadas en
la base compartida — confirmado por consulta directa a `information_schema.columns` antes de
reescribirlas acá como 035/036/037 (aditivas, `IF NOT EXISTS`, re-corridas sin efecto para verificar).
La carpeta `backend/migrations/` se borró. **`003_clean slate.sql` no se migró**: era un `DELETE FROM
maintenance_records; DELETE FROM parts;` de un solo uso para reiniciar datos de prueba — destructivo y
no idempotente, no pertenece a un historial de migraciones re-corrible. Se perdió intencionalmente al
borrar la carpeta (queda en el historial de git si hace falta consultarlo).

**Nota sobre 034 (2026-08-05)**: agrega `parts.workshop_id`/`parts.source_work_order_id` y
`maintenance_records.source_work_order_id` — docs/PLAN_FACTURACION_AUTOMATICA.md Paso 3. Cuando un
taller entrega y cobra una orden de un vehículo vinculado a una cuenta CarLink real, se crean solos
un registro de historial y una `Part` por cada repuesto realmente reemplazado; estas columnas
marcan la procedencia (para que el cliente no pueda editarlos) y dan idempotencia. Aditiva, sin
tocar columnas existentes. Aplicada y verificada contra la base real (columnas confirmadas por
`information_schema`).

**Nota sobre 033 (2026-08-05)**: agrega `workshops.is_published` (default `true`) — toggle "Publicar
mi ficha pública" en Perfil del taller (panel de negocio, docs/PLAN_PARIDAD_UI_TALLERPRO.md).
`GET /workshops/{code}` (la ficha pública y su QR) devuelve 404 si el taller lo apagó. Aditiva,
default true, no des-publica ninguna ficha existente. Aplicada y verificada contra la base real
(columna confirmada por consulta directa a `information_schema`).

**Nota sobre 032 (2026-08-04)**: agrega columnas CDA/RTM reales a `diagnostics` (Fase 6 de
`docs/PLAN_MIGRACION_TALLERPRO.md`) — corrige un dato quemado preexistente de `DiagnosticoTab.tsx`
(código y fecha de vencimiento inventados en el cliente). Aplicada y verificada contra la base real.

**Nota sobre 023–031 (2026-08-04)**: modelo de datos del panel nuevo de taller/empresa (migración de
`tallerpro/`, ver `docs/PLAN_MIGRACION_TALLERPRO.md`). Todas aditivas — ninguna toca columnas ni
tablas existentes. Aplicadas y verificadas contra la base real de producción (13 tablas nuevas +
columnas nuevas en `workshops` confirmadas por consulta directa a `information_schema`).

**Nota sobre 017/018**: la 017 subió el límite de llaveros activos de `persona` a 2 sin una razón de producto documentada. Se decidió revertir a 1 (un token = un llavero, sin excepción) — la 018 corrige esto. Correr ambas en orden dado que no se puede confirmar si la 017 ya se aplicó antes en producción; el resultado neto es 1 de cualquier forma.

**Nota sobre 019**: cambia el modelo de creación de llaveros de raíz. Antes, cualquier usuario autenticado podía generar un token NFC por software (sin relación con un llavero físico real) — `POST /nfc/tokens` fue retirado. Ahora un token solo nace de un llavero físico que CarLink provisiona de antemano (`POST /admin/nfc/whitelist/provision`, que genera el token pre-grabado + un código de activación) y el usuario lo reclama con `POST /nfc/activate`. **Esta migración debe correr antes de desplegar el backend nuevo** — a diferencia de 016/017, aquí no hay código defensivo que tolere la ausencia de las columnas nuevas; si no se aplica primero, `/nfc/activate` y `/admin/nfc/whitelist/provision` fallan con error 500 de columna inexistente.

**Regla:** cada vez que se agregue un archivo a `supabase/migrations/`, en el mismo PR se debe (1) correrlo contra la base real y (2) añadir su línea `\i` aquí. Este checklist es actualmente la única fuente de verdad de qué se aplicó — no hay tabla de control de versión de esquema (ver "Pendiente: separación de ambientes" abajo).

### Pendiente: separación de ambientes
_(Tracked también en `docs/PENDIENTES.md` #9 — esa es la lista única de pendientes del proyecto;
esta sección se deja acá porque tiene el detalle del plan de 3 pasos.)_

El estado actual (una sola base de datos para los tres entornos) es la causa raíz de varios bugs de producción recientes: migraciones corridas de forma inconsistente, código defensivo agregado para tolerar un esquema desconocido en vez de corregirlo. Recomendado:

1. Crear un proyecto Supabase separado para desarrollo/staging (plan free sirve).
2. `local` y `staging` apuntan al proyecto nuevo; solo `production` (Railway prod + Vercel prod) apunta al proyecto actual.
3. Adoptar `supabase migration up` (o Alembic) en vez de `\i` manual, para que las migraciones aplicadas queden registradas en una tabla y el comando sea idempotente/rastreable por entorno.

### Modelo de ramas: `master` protegido + `develop` (adoptado 2026-09-09)

Hasta ahora existía una sola rama (`master`), sin protección — la única barrera contra un push
directo a producción era la disciplina (regla ya vigente: nunca pushear sin autorización fresca
del usuario). Esto reduce el riesgo a nivel de código, en paralelo e independiente de la
separación de DB de arriba (que sigue bloqueada en que el usuario cree el proyecto Supabase
nuevo — el modelo de ramas no depende de eso).

- **`master`** = siempre desplegable, es lo que Railway/Vercel producción sirven. Nunca se le
  hace push directo — solo vía PR desde `develop` (o un hotfix puntual), con CI en verde.
- **`develop`** = integración del trabajo en curso. Ramas `feature/*` se mergean acá primero.
- Flujo: `feature/algo` → PR a `develop` (CI en verde) → merge → cuando `develop` tiene algo
  listo para producción → PR de `develop` a `master` (CI en verde) → merge → deploy automático.

**Pendiente de configurar por el usuario** (requiere acceso admin al repo en GitHub — no se
puede hacer desde un entorno de agente sin `gh` autenticado con esos permisos):
1. Push de la rama `develop` a `origin` (con autorización fresca — no asumida por este doc).
2. GitHub → Settings → Branches → Branch protection rules → agregar regla para `master`:
   exigir PR antes de merge, exigir que el check de CI (`.github/workflows/ci.yml`) pase, y
   opcionalmente exigir 1 aprobación.
3. Opcional: cambiar la rama por defecto del repo a `develop`, para que nuevos clones/PRs
   apunten ahí en vez de a `master`.

## Lecciones del despliegue de la reactivación NFC (2026-07-27)

**Redeploys de Railway pueden tardar varios minutos y "Redeploy" en la fila equivocada revive un deployment viejo.** En esta sesión, un fix ya correcto tardó ~40 minutos en verse reflejado en producción porque:
- El auto-deploy desde GitHub no es instantáneo — puede tardar varios minutos en iniciar el build.
- Dar clic en "Redeploy" sobre una fila vieja de la lista de Deployments **reconstruye ese commit viejo**, no el más reciente — y visualmente es indistinguible de "el fix no llegó".
- Una de las filas correctas llegó a existir en la lista pero fue removida antes de poder promoverla.

**Cómo verificar sin ambigüedad que un deploy nuevo está realmente en producción**: no repruebes el bug directamente primero — agrega temporalmente un marcador trivial y verificable (por ejemplo, cambiar el `version` de `GET /api/health`) y haz polling de ese endpoint hasta ver el valor nuevo. Solo después de confirmar el marcador, vuelve a probar el bug real. Esto evita confundir "el deploy no ha terminado" con "el fix no funciona".

**Variables `NEXT_PUBLIC_*` en Vercel se inyectan en tiempo de build, no en runtime.** Agregar o cambiar una y darle "Redeploy" sin desmarcar "Use existing Build Cache" puede dejar el valor viejo (o ninguno) compilado en el bundle del navegador. Verificar esto es posible sin acceso al dashboard: el HTML de cualquier página trae las rutas de sus chunks JS (`/_next/static/chunks/app/.../page-<hash>.js`); si el hash del chunk no cambió tras el redeploy, no hubo rebuild real.

**El CLI de Railway (`railway login`) abre un callback OAuth en `127.0.0.1` de la máquina donde corre** — debe ejecutarlo el usuario en su propia terminal (o vía el prefijo `!` en Claude Code), nunca desde el entorno sandboxeado de un agente, que no tiene navegador real para completar el flujo.
