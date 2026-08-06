-- Toggle "Publicar mi ficha pública" en Perfil del taller (panel de negocio).
-- Controla si GET /workshops/{code} (ficha pública + su código QR) responde
-- o no. Default true para no des-publicar ninguna ficha existente.
alter table workshops
  add column if not exists is_published boolean not null default true;
