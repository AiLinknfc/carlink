-- Reseñas: etiquetar con el evento/servicio específico que las disparó, no
-- solo la categoría (plataforma/producto/taller) — pedido del usuario tras
-- ver "Producto" en Admin sin saber si era del carrito de compras o de la
-- activación del llavero. Vacío = reseña general enviada desde "Calificar"
-- (ResenasTab.tsx), sin evento puntual. Ver docs/PENDIENTES.md.

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS context TEXT DEFAULT '';

COMMENT ON COLUMN reviews.context IS 'Evento/servicio específico que disparó la reseña (ej. "Activación de llavero", "Proceso de compra") — vacío si fue una calificación general desde la sección Calificar.';
