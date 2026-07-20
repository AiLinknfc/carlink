# Tests Pendientes

## Backend (Python + pytest)

### Unit Tests
- [ ] `tests/test_auth.py` — Verificar JWT validation con Supabase tokens
- [ ] `tests/test_nfc.py` — Verificar generación de tokens, hash SHA-256, validación
- [ ] `tests/test_vehicles.py` — CRUD de vehículos con auth
- [ ] `tests/test_maintenance.py` — CRUD de registros de mantenimiento
- [ ] `tests/test_found_requests.py` — Endpoints públicos y autenticados

### Integration Tests
- [ ] `tests/test_api_health.py` — Healthcheck endpoint
- [ ] `tests/test_cors.py` — Verificar CORS headers
- [ ] `tests/test_rate_limit.py` — Rate limiting en endpoints públicos

### Database Tests
- [ ] Verificar RLS policies funcionan correctamente
- [ ] Test cascade deletes (vehicle → maintenance, parts, etc)
- [ ] Test trigger on_auth_user_created crea profile automáticamente

---

## Frontend (TypeScript + Vitest)

### Component Tests
- [ ] `src/components/__tests__/FichaTab.test.tsx` — Renderizado con datos mock
- [ ] `src/components/__tests__/Sidebar.test.tsx` — Navegación entre tabs
- [ ] `src/components/__tests__/ServiceFormModal.test.tsx` — Formulario de servicio
- [ ] `src/components/__tests__/PartFormModal.test.tsx` — Formulario de partes

### Hook Tests
- [ ] `src/lib/__tests__/hooks.test.ts` — useMaintenance, useParts, useVehicle
- [ ] `src/lib/__tests__/api.test.ts` — apiGet, apiPost, apiPut, etc.

### Integration Tests
- [ ] Flujo completo: login → crear vehículo → agregar servicio
- [ ] NFC: crear token → acceder a ficha pública
- [ ] Theme: cambiar light/dark mode persiste en localStorage

### E2E Tests (Playwright/Cypress)
- [ ] Login con Google OAuth
- [ ] Flujo de registro de vehículo
- [ ] Generación y uso de token NFC
- [ ] Formulario de llavero perdido

---

## Cómo Ejecutar

### Backend
```bash
cd backend
pytest tests/ -v
```

### Frontend
```bash
cd frontend
npx vitest run
```

### Coverage
```bash
# Backend
pytest tests/ --cov=app --cov-report=html

# Frontend
npx vitest run --coverage
```
