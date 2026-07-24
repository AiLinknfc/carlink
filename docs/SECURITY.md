# Security Checklist — CarLink

## Antes de desplegar a producción

### Backend
- [ ] CORS `allow_origins` en `main.py` incluye solo dominios de producción
- [ ] `ADMIN_USER_ID` configurado en variables de entorno
- [ ] Rate limiting in-memory reemplazado por Redis en `nfc.py`
- [ ] Supabase RLS habilitado en todas las tablas nuevas (nfc_token_limits, nfc_access_logs, nfc_alerts, nfc_token_whitelist)
- [ ] `SMTP_USER` y `SMTP_PASS` configurados (email service)
- [ ] Verificar que `DEBUG=False` en producción
- [ ] Verificar que `SECRET_KEY` no está hardcodeado

### Frontend
- [ ] `NEXT_PUBLIC_SITE_URL` apunta a producción (no tunnel)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` son de producción
- [ ] Supabase Redirect URLs incluyen solo dominios de producción
- [ ] No hay tokens raw en `localStorage` de producción (solo en dev)

### NFC Admin
- [ ] `ADMIN_USER_ID` coincide con el UUID del usuario admin en Supabase
- [ ] Endpoints admin protegidos con `get_current_admin`
- [ ] Whitelist de UIDs cargada antes de distribuir chips
- [ ] Límites por cuenta type configurados (persona: 1 token/vehículo, taller: configurable)
- [ ] Alertas configuradas (frequent scans, multiple IPs, nighttime)

### Infraestructura
- [ ] Variables de entorno configuradas en el host de despliegue
- [ ] Base de datos: migraciones 013-015 ejecutadas
- [ ] Redis accesible desde el backend
- [ ] HTTPS habilitado en el dominio
- [ ] Rate limiting global configurado (Cloudflare, nginx, etc.)
