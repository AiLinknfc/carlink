-- Vinculo taller-conductor por QR (2026-10-14) - docs/PLAN_VINCULO_TALLER_CONDUCTOR.md
--
-- Aditiva: dos tablas nuevas y una columna nullable. No cambia ni reinterpreta nada existente.
--
-- workshop_client_links: "este conductor (con este vehiculo) es cliente de este taller". Siempre lo inicia
--   el conductor y acepta que comparte; el vinculo NO crea historial verificado (la etiqueta "Del taller"
--   sigue naciendo solo de una orden de trabajo).
-- workshop_claim_tokens: enlace de un solo uso (hash, caduca) que el taller le da a un cliente para que
--   reclame su historial al registrarse. work_order_id (nullable) lo liga a una orden concreta (QR por orden).
-- maintenance_records.claimed_workshop_id: "el conductor dice que fue en este taller". NUNCA alimenta la
--   etiqueta "Del taller" ni se confia como verificado.

CREATE TABLE IF NOT EXISTS workshop_client_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  origin TEXT NOT NULL DEFAULT 'qr_taller' CHECK (origin IN ('qr_taller', 'claim_link', 'name_match', 'order_qr')),
  consent_share_contact BOOLEAN NOT NULL DEFAULT FALSE,
  consent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workshop_id, vehicle_id)
);
CREATE INDEX IF NOT EXISTS idx_wcl_workshop ON workshop_client_links (workshop_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_wcl_user ON workshop_client_links (user_id);

CREATE TABLE IF NOT EXISTS workshop_claim_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  workshop_vehicle_id UUID NOT NULL REFERENCES workshop_vehicles(id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wct_workshop_vehicle ON workshop_claim_tokens (workshop_vehicle_id);

ALTER TABLE maintenance_records
  ADD COLUMN IF NOT EXISTS claimed_workshop_id UUID REFERENCES workshops(id) ON DELETE SET NULL;

-- Mismo criterio de RLS que el resto (041): sin politicas; solo el backend (rol de servicio) accede.
ALTER TABLE workshop_client_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_claim_tokens ENABLE ROW LEVEL SECURITY;
