-- Taller/Empresa panel — paso 9/9: reseñas mostradas en la ficha pública del taller.

CREATE TABLE IF NOT EXISTS workshop_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_date DATE NOT NULL DEFAULT CURRENT_DATE,
  comment TEXT DEFAULT '',
  vehicle_model TEXT DEFAULT '',
  is_verified_client BOOLEAN NOT NULL DEFAULT false,
  manager_response TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workshop_reviews_workshop ON workshop_reviews(workshop_id);
CREATE INDEX IF NOT EXISTS idx_workshop_reviews_date ON workshop_reviews(workshop_id, review_date DESC);

ALTER TABLE workshop_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages workshop_reviews"
  ON workshop_reviews FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE workshop_reviews IS 'Reseñas de clientes mostradas en la ficha pública del taller (/taller/{code}) y usadas para workshops.rating';
