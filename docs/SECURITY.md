# Security Checklist — CarLink

_Última actualización: 2026-07-27._

## Antes de desplegar a producción

### Backend
- [x] Rate limiting vía Redis en `nfc.py` (`_check_rate`, `_check_activate_rate`), con fallback transparente si Redis no está disponible
- [x] `ADMIN_USER_ID` configurado en variables de entorno (Railway)
- [ ] CORS `allow_origins` en `main.py` incluye solo dominios de producción
- [ ] Supabase RLS habilitado en todas las tablas nuevas (`nfc_token_limits`, `nfc_access_logs`, `nfc_alerts`, `nfc_token_whitelist`)
- [ ] `SMTP_USER` y `SMTP_PASS` configurados (email service)
- [ ] Verificar que `ENVIRONMENT=production` en Railway (no `development`)

### Frontend
- [ ] `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_API_URL` apuntan a producción (no tunnel ni localhost)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` son de producción
- [ ] `NEXT_PUBLIC_ADMIN_USER_ID` configurado en Vercel — **requiere rebuild sin caché para tomar efecto**, ver `docs/DEPLOY.md`
- [ ] Supabase Redirect URLs incluyen solo dominios de producción
- [x] No hay tokens raw en `localStorage` — desde el rediseño de activación (2026-07-27) el frontend nunca conoce el token crudo, solo el servidor lo cifra/descifra

### Llavero NFC (modelo de activación, 2026-07-27)
- [x] Un token solo se crea reclamando un llavero físico provisionado por admin (`POST /nfc/activate`), no por autogeneración
- [x] El código de activación se hashea (SHA-256) antes de guardarse; nunca se persiste en texto plano
- [x] `POST /nfc/activate` tiene rate limit propio (5 intentos/10 min por usuario + IP) y mensaje de error genérico (no distingue "no existe" de "ya usado")
- [x] El reclamo de un código es atómico (`UPDATE ... WHERE status='available'`) — resiste condiciones de carrera si el mismo código se reutiliza
- [ ] `ENCRYPTION_KEY` configurada en Railway — sin ella, "Copiar enlace" no puede recuperar la URL de ningún llavero (ya no hay respaldo en `localStorage`)
- [ ] Whitelist de UIDs físicos cargada antes de distribuir chips (`POST /admin/nfc/whitelist/provision`)
- [ ] Límites por `account_type` configurados en `nfc_token_limits` — falta la fila `empresa` (solo existen `persona` y `taller`)
- [ ] Alertas configuradas (escaneos frecuentes, múltiples IPs, horario nocturno)

### Infraestructura
- [ ] Variables de entorno configuradas tanto en Railway (backend) como en Vercel (frontend) — son dashboards separados, no se comparten
- [ ] Migraciones: confirmar que `019_nfc_activation_codes.sql` (y todo lo anterior) esté aplicado en la base real — ver checklist manual en `docs/DEPLOY.md`
- [ ] Redis accesible desde el backend (`REDIS_URL`)
- [ ] HTTPS habilitado en el dominio custom del backend (`api.carlink.com.co`) — verificar que el certificado TLS esté emitido, no solo el genérico de Railway

## Incidente: credenciales filtradas en el repo (2026-07-27)

Un commit (`desplegando ambientes en produccion`) subió `tests/test_nfc_flow.sh` con la contraseña real de Postgres y el `ENCRYPTION_KEY` de producción hardcodeados en texto plano, ya pusheado a GitHub. Se resolvió rotando ambos secretos (no se reescribió el historial de git — el usuario decidió que rotar era suficiente). Ver `docs/DEPLOY.md` para el detalle completo.

**Reglas para no repetirlo:**
- Nunca hardcodear secretos reales en `.env.example` (debe quedar siempre vacío/plantilla) ni en scripts dentro de `tests/`.
- Los archivos `.md` versionados (`CONTEXTO.md`, este archivo, etc.) tampoco son lugar para contraseñas o claves reales, aunque sea "solo para referencia rápida en desarrollo" — ya pasó una vez con la DB password en `CONTEXTO.md`.
- Si un secreto queda expuesto en un commit ya pusheado, rotarlo de inmediato es más importante que limpiar el historial de git.
