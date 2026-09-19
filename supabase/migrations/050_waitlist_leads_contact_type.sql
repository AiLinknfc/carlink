-- Tipifica el contacto del waitlist (email vs celular) para poder segmentar
-- por canal en campañas de marketing/seguimiento (docs/PENDIENTES.md) —
-- antes "contact" era texto libre sin garantía de formato ni de a qué canal
-- corresponde. Validación real (correo vs celular, con indicativo o sin él)
-- ahora vive en app/services/contact_validation.py y corre en el backend
-- antes de guardar cualquier lead nuevo.
--
-- Backfill de las filas existentes con una heurística simple (si tiene "@"
-- es email, si no es phone) — esas filas se guardaron antes de que existiera
-- esta validación, así que no están garantizado-normalizadas, pero sí quedan
-- tipificadas para poder filtrarlas en campañas.
ALTER TABLE waitlist_leads ADD COLUMN IF NOT EXISTS contact_type TEXT;

UPDATE waitlist_leads
SET contact_type = CASE WHEN contact LIKE '%@%' THEN 'email' ELSE 'phone' END
WHERE contact_type IS NULL;

ALTER TABLE waitlist_leads ALTER COLUMN contact_type SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_waitlist_leads_contact_type ON waitlist_leads(contact_type);
