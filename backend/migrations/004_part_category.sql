-- Migration: Add category to parts table
-- Run this against your Supabase/PostgreSQL database
--
-- Hasta ahora "Control de partes" filtraba por la columna `brand`, que guarda la
-- marca del proveedor (Bosch, NGK…), contra nombres de categoría (Frenos, Motor…).
-- Nunca coincidían, así que toda pestaña distinta de "Todas" salía vacía.

ALTER TABLE parts
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Otros';
