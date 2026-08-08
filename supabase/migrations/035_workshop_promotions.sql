-- Sellos de fidelidad del taller (tarjeta de sellos: "a los N servicios,
-- premio"). Formaliza en supabase/migrations/ un cambio que vivía huérfano
-- en backend/migrations/002_workshop_promotions.sql (carpeta nunca
-- referenciada desde docs/DEPLOY.md ni corrida como parte del checklist
-- real) — ya estaba aplicado en la base compartida, confirmado 2026-08-08
-- contra information_schema.columns antes de escribir este archivo.
alter table workshops
  add column if not exists stamps_required integer not null default 6,
  add column if not exists promotion_description text not null default '';
