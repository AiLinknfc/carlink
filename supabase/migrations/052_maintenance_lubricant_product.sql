-- Registro de Aceite en 3 pasos (wizard con autocompletado de catálogo de
-- marcas/productos, ver docs del cambio en ServiceFormModal.tsx / oilCatalog.ts).
--
-- Guarda el producto exacto del catálogo que el usuario eligió (ej. "Mobil 1 ESP
-- 5W-30"), o queda vacío si escribió la marca/viscosidad libre en vez de elegir
-- un producto listado. Puramente aditiva: default '' para no romper filas
-- existentes, y lubricant_brand/lubricant_type siguen poblándose exactamente
-- igual que antes — este campo es solo un detalle extra que hoy únicamente
-- consume el propio formulario (vista previa del paso de confirmación).
ALTER TABLE maintenance_records
  ADD COLUMN IF NOT EXISTS lubricant_product TEXT DEFAULT '';
