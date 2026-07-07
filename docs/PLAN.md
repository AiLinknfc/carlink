# CarLink — Plan de implementación

> Objetivo: llevar el frontend al nivel del diseño `Placas CarLink.dc.html`, con flujo end-to-end
> verificado, arquitectura mantenible, pruebas automatizadas y despliegue listo (Railway/Docker).
> Fecha: 2026-07-06

---

## 1. Estado actual (diagnóstico)

### Lo que ya funciona
| Área | Estado |
| --- | --- |
| Landing (placa, tipos, ciudad) | ✅ Implementado (falta forma moto y estilos por tipo de placa) |
| Login Google | ✅ Real vía Supabase OAuth (la pantalla 2 del mockup era una simulación; el OAuth real la reemplaza — correcto) |
| Registro de vehículo | ✅ Completo, con validación básica y manejo de errores |
| App: 8 pestañas | ✅ Solo lectura (ficha, historial, diagnóstico, partes, galería, certificados, documentos, taller) |
| Perfil (editar usuario/vehículo) | ✅ Modal funcional |
| Backend | ✅ 9 routers CRUD + upload R2 + Redis cache + JWT Supabase + migración SQL |
| CI | ⚠️ Solo lint/typecheck/build — **sin pruebas** |

### Brecha principal
**La app es de solo lectura.** El mockup define flujos de creación de datos que no existen:
sin ellos, todas las pestañas muestran estados vacíos para siempre.

### Funcionalidades del mockup pendientes
1. **Registrar nuevo servicio** (modal `addService` → `POST /api/maintenance`) — crítico, es la fuente de datos de toda la app.
2. **Galería**: subir imágenes (`POST /api/upload` → `POST /api/gallery`) + lightbox.
3. **Certificados**: modal agregar (`addCert`) con archivo adjunto.
4. **Documentos**: agregar documento con archivo.
5. **Diagnóstico (CDA)**: tarjeta con checks aprobados, código RTM y vencimiento; subir certificado escaneado; descargar certificado.
6. **Historial**: timeline horizontal con tarjetas por servicio (envase de aceite, chips de filtros) en vez de lista plana.
7. **Control de partes**: predicciones de reemplazo por intervalos del fabricante vs. km actual.
8. **Wallet**: personalizar fondo/logo del pase y descargar como imagen (html2canvas o equivalente).
9. **Pedir llavero NFC**: carrito/checkout con estado del pedido (badge, "pedido confirmado").
10. **Taller**: tarjeta de taller de confianza (contacto, horario, garantía, redes) en el reverso de la ficha y pestaña Taller.
11. **Toasts** de confirmación tras cada acción.
12. Landing: placa formato **moto** (274×246) y colores por tipo (taxi=amarillo, oficial=azul…), fondo canvas animado.

### Deuda técnica detectada (corregir antes de crecer)
| # | Problema | Ubicación |
| --- | --- | --- |
| D1 | **Violación de reglas de hooks**: `FichaTab` hace `return` antes de `useState/useEffect` → crash cuando `vehicle` pasa de null a valor | `frontend/src/app/app/page.tsx:70-77` |
| D2 | Helpers HTTP duplicados (`apiGet`/`apiPut` locales, fetch manual en register/callback/auth) sin manejo de errores unificado | `app/page.tsx`, `register/page.tsx`, `auth/callback/page.tsx`, `store/auth.tsx` |
| D3 | `any` en todos los datos → sin tipos de dominio TS | todo el frontend |
| D4 | `app/page.tsx` con 708 líneas: pestañas, modal y presets en un solo archivo | `frontend/src/app/app/page.tsx` |
| D5 | Cache Redis serializa `vehicle.__dict__` (incluye `_sa_instance_state`) → frágil; usar `model_dump()` de Pydantic | `backend/app/routers/vehicles.py:33,53` |
| D6 | Sin validación de formato de placa colombiana (carro `ABC123`, moto `ABC12D`) ni en front ni en back | landing, register, `schemas.py` |
| D7 | `update/delete vehicle` no invalidan `vehicles:list:{user_id}` (solo `vehicles:{id}`) → lista obsoleta hasta 120 s | `backend/app/routers/vehicles.py` |
| D8 | Countdown de la ficha usa `Date.now() + 7 días` inventado en vez de una fecha real de próximo servicio | `app/page.tsx:94` |

---

## 2. Arquitectura objetivo

### Frontend (Next.js 15, App Router)
```
frontend/src/
├── app/                      # Rutas (server components donde aplique)
│   ├── page.tsx              # Landing
│   ├── register/page.tsx
│   ├── auth/callback/page.tsx
│   └── app/page.tsx          # Shell: sidebar + tab switch (≤150 líneas)
├── components/
│   ├── ui/                   # Toast, Modal, EmptyState, SectionHeader, FileDrop
│   ├── tabs/                 # FichaTab, HistorialTab, DiagnosticoTab, PartesTab,
│   │                         # GaleriaTab, CertificadosTab, DocumentosTab, TallerTab
│   ├── modals/               # AddServiceModal, AddCertModal, NfcCartModal, ProfileModal
│   ├── Plate3D.tsx           # + variante moto
│   └── WalletPass.tsx        # Pase descargable + personalización
├── lib/
│   ├── api.ts                # Cliente HTTP único: token, errores, JSON tipado
│   ├── types.ts              # Tipos de dominio (espejo de schemas Pydantic)
│   ├── plate.ts              # Validación/formato de placa (puro, testeable)
│   ├── predictions.ts        # Intervalos por fabricante + cálculo de desgaste (puro)
│   └── constants.ts
├── hooks/
│   ├── useVehicleData.ts     # fetch + revalidación por recurso
│   └── useToast.tsx
└── store/auth.tsx
```
Principios: lógica de negocio (placa, predicciones, countdown) en **funciones puras de `lib/`**
para poder testearla sin renderizar; componentes de pestaña solo presentan; un único punto de
acceso HTTP; datos siempre tipados.

### Backend (FastAPI) — ya bien estructurado; cambios menores
- `schemas.py`: validador de placa; `model_dump()` para cache.
- Nuevo router `nfc_orders` (pedido de llavero NFC): tabla + migración `002_nfc_orders.sql`.
- `tests/` con pytest + httpx (no existe hoy).

---

## 3. Fases de implementación

### Fase 0 — Fundamentos (½ día)
- [ ] `git init` + primer commit (el repo no está versionado — prerequisito de CI y deploy).
- [ ] Corregir D1 (hooks), D5 (cache), D7 (invalidación de lista).
- [ ] `lib/api.ts` + `lib/types.ts`; migrar los fetch existentes (D2, D3).
- [ ] `lib/plate.ts` con validación de placa + aplicarla en landing, register y `schemas.py` (D6).
- [ ] Instalar tooling de pruebas: `vitest` + `@testing-library/react` (front), `pytest`, `pytest-asyncio`, `aiosqlite` (back).

### Fase 1 — Escritura de datos (el flujo completo) (1–2 días)
- [ ] `AddServiceModal`: tipo de servicio, km, fecha, taller, lubricante (marca/tipo/viscosidad), filtros, costo, próximo servicio → `POST /api/maintenance`; revalida ficha e historial.
- [ ] Subida de archivos genérica (`FileDrop` → `POST /api/upload` → URL R2).
- [ ] Galería: subir + lightbox. Certificados: `AddCertModal`. Documentos: agregar con archivo.
- [ ] Toast global (`useToast`) para confirmar cada acción.
- [ ] Countdown real: derivar fecha objetivo de `next_service_date` (agregar campo si falta) o del ritmo de km (D8).

### Fase 2 — Paridad visual con el mockup (2–3 días)
- [ ] Historial → timeline horizontal con scroll-snap, tarjetas con envase de aceite y chips de filtros.
- [ ] Diagnóstico → tarjeta CDA (checks, APROBADO, código RTM, vencimiento) alimentada de `diagnostics` + `certificates`; adjuntar escaneado; descargar.
- [ ] Partes → `lib/predictions.ts`: tabla de intervalos por marca × parte; estado ok/próximo/vencido según km.
- [ ] Ficha reverso → tarjeta de taller (datos de `service_logs`/taller registrado) con contacto/garantía/redes.
- [ ] Wallet: `WalletPass` con presets de fondo, fondo/logo propios y descarga como PNG.
- [ ] Landing: placa moto + colores por tipo de placa; fondo canvas de partículas (progresivo, sin bloquear LCP).

### Fase 3 — NFC (nuevo dominio) (1 día)
- [ ] Migración `002_nfc_orders.sql` + modelo + router `POST/GET /api/nfc-orders`.
- [ ] `NfcCartModal`: dirección, confirmación, estado del pedido; badge en el header.

### Fase 4 — Pruebas (transversal, cerrada aquí) (1–2 días)
**Backend (pytest + httpx AsyncClient, DB sqlite/postgres de test, auth mockeada):**
- [ ] Auth: token inválido → 401; perfil me GET/PUT.
- [ ] Vehicles: crear/listar/duplicado→409/aislamiento entre usuarios→404.
- [ ] Maintenance + latest; invalidación de cache.
- [ ] Un test CRUD por router restante (parts, certificates, documents, gallery, diagnostics, service-logs, nfc-orders).
- [ ] Upload: mock de R2 (moto/boto3 stub).

**Frontend (vitest + RTL):**
- [ ] `plate.ts`: formatos válidos/inválidos carro y moto.
- [ ] `predictions.ts`: estados por km e intervalos.
- [ ] `api.ts`: headers de auth, propagación de errores.
- [ ] `AddServiceModal`: validación y payload correcto (fetch mockeado).
- [ ] Countdown hook.

**E2E (Playwright, contra docker-compose):**
- [ ] Flujo feliz: landing → registro (auth stubbeada) → agregar servicio → verlo en ficha e historial.

### Fase 5 — Deploy y operación (1 día)
- [ ] CI: agregar jobs `pytest` y `vitest` (bloqueantes) + Playwright (job aparte); build de imágenes Docker en PR.
- [ ] Dockerfiles: verificación de build de ambas imágenes; healthcheck `/api/health` en compose y Railway.
- [ ] Variables: revisar `.env.example` completos; documento de secretos requeridos por entorno.
- [ ] Migraciones: mover a Alembic (ya está en requirements) para cambios futuros; `002` como primera migración gestionada.
- [ ] Logging estructurado + middleware de request-id en FastAPI; niveles por entorno.
- [ ] `README` actualizado + `CLAUDE.md` (comandos dev/test/deploy) + Dependabot/Renovate.

---

## 4. Criterios de aceptación (verificación del flujo)
1. Usuario nuevo: landing → placa+ciudad → Google → registro → app con estados vacíos y CTAs claros.
2. Registra un servicio → ficha muestra km, sellos, countdown y progreso reales; historial lo muestra en el timeline.
3. Sube imagen/certificado/documento → visible y descargable desde R2.
4. Recarga la página → sesión persiste; datos consistentes (cache invalidada correctamente).
5. Usuario B no puede ver ni tocar datos del usuario A (verificado por tests de aislamiento).
6. `docker compose up` levanta todo y pasa el flujo E2E; CI en verde con pruebas.

## 5. Riesgos y decisiones
- **Pantalla de login del mockup**: es una simulación de Google; se mantiene el OAuth real (mejor práctica; la simulación sería engañosa).
- **Predicciones de partes**: el mockup sugiere IA; se implementa determinístico (intervalos de fabricante) y queda la columna pgvector lista para una fase futura.
- **Wallet pass**: se genera imagen (PNG) como el mockup (html2canvas); un `.pkpass` real de Apple Wallet requiere certificados de Apple — fuera de alcance, documentado como mejora futura.
- **App Store / Google Play**: botones decorativos del mockup; se omiten o se dejan como enlaces deshabilitados.
