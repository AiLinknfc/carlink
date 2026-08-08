-- Categoría de la parte (Frenos, Motor, etc.). "Control de partes" filtraba
-- por `brand` (marca del proveedor: Bosch, NGK…) contra nombres de
-- categoría — nunca coincidían y toda pestaña distinta de "Todas" salía
-- vacía. Formaliza en supabase/migrations/ un cambio que vivía huérfano en
-- backend/migrations/004_part_category.sql (carpeta nunca referenciada
-- desde docs/DEPLOY.md) — ya estaba aplicado en la base compartida,
-- confirmado 2026-08-08 contra information_schema.columns antes de
-- escribir este archivo.
alter table parts
  add column if not exists category text not null default 'Otros';
