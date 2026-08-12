-- Reseñas enviadas por usuarios autenticados (no manuales) sobre 3 focos distintos:
-- plataforma, producto (llavero NFC/CarLink en general) y taller que los atendió.
-- Plataforma/producto no tenían ninguna tabla — se crea `reviews`. La reseña de taller
-- se integra a `workshop_reviews` (ya existente, alimenta workshops.rating y la ficha
-- pública /taller/{code}) en vez de vivir en un pool aparte, distinguida por `source`.

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('platform', 'product')),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type)
);

CREATE INDEX IF NOT EXISTS idx_reviews_target ON reviews(target_type, rating);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'service_role_all_on_reviews' AND polrelid = 'reviews'::regclass) THEN
    CREATE POLICY "service_role_all_on_reviews"
      ON reviews
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE reviews IS 'Reseñas de usuarios autenticados sobre la plataforma o el producto (llavero NFC/CarLink en general). Las de taller viven en workshop_reviews (columna source).';

-- Extiende workshop_reviews para admitir reseñas enviadas por un cliente autenticado
-- desde la app, además de las manuales que ya carga el taller desde su panel.
ALTER TABLE workshop_reviews
  ADD COLUMN IF NOT EXISTS submitted_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual_taller'
    CHECK (source IN ('manual_taller', 'cliente_autenticado'));

-- Un usuario autenticado como máximo una reseña por taller (reenviar = editar).
-- Las filas manuales (submitted_by_user_id NULL) no quedan afectadas.
CREATE UNIQUE INDEX IF NOT EXISTS idx_workshop_reviews_user_once
  ON workshop_reviews(workshop_id, submitted_by_user_id)
  WHERE submitted_by_user_id IS NOT NULL;
