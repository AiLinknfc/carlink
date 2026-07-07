# CarLink

Plataforma de mantenimiento vehicular. Tu placa es tu identidad digital.

## Stack

| Capa       | Tecnología                                                            |
| ---------- | --------------------------------------------------------------------- |
| Frontend   | Next.js 15 (App Router) + React 19 + TypeScript                       |
| Backend    | FastAPI (Python 3.12+) + SQLAlchemy async + pgvector                  |
| Base datos | Supabase PostgreSQL + pgvector (embeddings 384-dim)                   |
| Cache      | Redis 7 (Upstash-compatible), fallback transparente si no hay REDIS_URL |
| Storage    | Cloudflare R2 (S3-compatible, sin cargos de egress)                   |
| Auth       | Supabase Auth + Google OAuth                                          |
| Contenedor | Docker multi-stage (backend + frontend)                               |
| Deploy     | Railway (preparado para AWS ECS / Kubernetes)                         |

## Estructura

```
carlink/
├── backend/           # FastAPI
│   ├── app/
│   │   ├── main.py            # Entrada FastAPI
│   │   ├── config.py          # Pydantic Settings
│   │   ├── database.py        # SQLAlchemy async engine
│   │   ├── dependencies.py    # JWT bearer
│   │   ├── models/            # SQLAlchemy ORM (9 modelos)
│   │   ├── schemas/           # Pydantic request/response
│   │   ├── routers/           # 9 routers: auth, vehicles, mantenimiento, etc.
│   │   └── services/          # auth (JWKS), cache (Redis), storage (R2)
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/          # Next.js 15
│   ├── src/
│   │   ├── app/               # App Router pages
│   │   ├── components/        # Sidebar, Plate3D
│   │   ├── lib/               # Supabase client
│   │   └── store/             # AuthProvider context
│   ├── next.config.ts
│   └── .env.example
├── supabase/
│   └── migrations/
│       └── 001_schema.sql     # Migración completa
├── docker/
│   ├── Dockerfile.frontend
│   └── docker-compose.yml
├── .github/workflows/ci.yml
└── railway.json
```

## Desarrollo local

### 1. Clonar y configurar

```bash
git clone <repo>
cd carlink

# Backend
cd backend
cp .env.example .env   # editar con tus credenciales
```

Variables requeridas en `backend/.env`:

| Variable                     | Descripción                              |
| ---------------------------- | ---------------------------------------- |
| `SUPABASE_URL`               | URL del proyecto Supabase                |
| `SUPABASE_SERVICE_ROLE_KEY`  | Service Role Key (tabla `auth.users`)    |
| `SUPABASE_JWT_SECRET`        | JWT secret de Supabase (para validación) |
| `R2_ENDPOINT`                | Endpoint S3 de Cloudflare R2             |
| `R2_ACCESS_KEY_ID`           | Access Key ID de R2                      |
| `R2_SECRET_ACCESS_KEY`       | Secret Access Key de R2                   |
| `R2_BUCKET`                  | Nombre del bucket R2                     |
| `R2_PUBLIC_URL`              | URL pública del bucket                   |
| `REDIS_URL`                  | _(opcional)_ Redis / Upstash URL         |

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload  # http://localhost:8000
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local
```

| Variable                        | Descripción                      |
| ------------------------------- | -------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL del proyecto Supabase        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon Key de Supabase             |
| `NEXT_PUBLIC_API_URL`           | URL del backend (default `http://localhost:8000`) |

```bash
npm install
npm run dev  # http://localhost:3000
```

### 3. Base de datos

Ejecutar `supabase/migrations/001_schema.sql` en el SQL Editor de Supabase.

### 4. Docker (todo junto)

```bash
docker compose -f docker/docker-compose.yml up --build
```

## API endpoints

| Método | Ruta                     | Descripción               |
| ------ | ------------------------ | ------------------------- |
| GET    | `/api/health`            | Healthcheck               |
| POST   | `/api/auth/google`       | Login / register Google   |
| GET    | `/api/auth/me`           | Perfil del usuario actual |
| POST   | `/api/vehicles`          | Registrar vehículo        |
| GET    | `/api/vehicles`          | Listar vehículos          |
| GET    | `/api/vehicles/{id}`     | Detalle vehículo          |
| GET    | `/api/maintenance`       | Historial mantenimiento   |
| POST   | `/api/maintenance`       | Agregar registro          |
| GET    | `/api/parts`             | Control de partes         |
| POST   | `/api/parts`             | Agregar parte             |
| GET    | `/api/diagnostics`       | Diagnósticos              |
| POST   | `/api/diagnostics`       | Agregar diagnóstico       |
| GET    | `/api/certificates`      | Certificados              |
| POST   | `/api/certificates`      | Agregar certificado       |
| GET    | `/api/documents`         | Documentos                |
| POST   | `/api/documents`         | Agregar documento         |
| GET    | `/api/gallery`           | Galería de imágenes       |
| POST   | `/api/gallery`           | Subir imagen              |
| GET    | `/api/service-logs`      | Bitácora de taller        |
| POST   | `/api/service-logs`      | Agregar entrada           |
| POST   | `/api/upload`            | Subir archivo a R2        |

## Deploy (Railway)

1. Subir repo a GitHub
2. Crear proyecto en Railway → "Deploy from GitHub repo"
3. Railway detecta `railway.json` y construye el backend
4. Agregar variables de entorno en Railway Dashboard
5. _(Opcional)_ Agregar servicio frontend con `Dockerfile.frontend`

Para AWS ECS / Kubernetes: construir las imágenes con los Dockerfiles incluidos y subirlas a ECR.

## pgvector

La columna `description_embedding` y `notes_embedding` (384-dim) están listas en las tablas `vehicles`, `maintenance_records`, `parts`, `service_logs`. Para indexar:

```sql
CREATE INDEX idx_vehicle_embedding ON vehicles
  USING ivfflat (description_embedding vector_cosine_ops)
  WITH (lists = 100);
```

## Licencia

MIT
