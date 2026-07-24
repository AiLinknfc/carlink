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
REDIS_URL=redis://...
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
ENVIRONMENT=production
PORT=8000
CORS_ORIGINS=https://carlink.app,https://www.carlink.app
```

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

```bash
# Conectar a Supabase
psql "postgresql://postgres:<password>@db.xgdshunvmeceqnzmkcsg.supabase.co:5432/postgres"

# Ejecutar migraciones en orden
\i supabase/migrations/013_nfc_admin_tokens.sql
\i supabase/migrations/014_nfc_token_limits_access_logs.sql
\i supabase/migrations/015_nfc_alerts_whitelist.sql
```
