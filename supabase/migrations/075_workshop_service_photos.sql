-- Fotos del catalogo de servicios del taller (2026-10-14).
--
-- Aditiva: dos columnas con default, no cambia ni reinterpreta nada existente.
--
-- photo_url: foto del servicio (URL del almacenamiento propio, /api/upload/files/<id-usuario>/<uuid>.<ext>).
--   Vacio = sin foto.
-- is_featured: el taller marca hasta 4 servicios "destacados"; la ficha publica los muestra en un carrusel.
--   El limite de 4 por taller y que un destacado tenga foto se validan en el backend (workshop_services.py).

ALTER TABLE workshop_service_items
  ADD COLUMN IF NOT EXISTS photo_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;
