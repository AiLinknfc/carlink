-- Taller/Empresa panel — paso 8/9: log de notificaciones y documentos emitidos.

CREATE TABLE IF NOT EXISTS workshop_notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT DEFAULT '',
  recipient_email TEXT DEFAULT '',
  channel TEXT NOT NULL DEFAULT 'Email',
  notification_type TEXT NOT NULL,
  message TEXT NOT NULL,
  -- 'enviado' (email real vía services/email.py) | 'simulado' (WhatsApp/SMS sin
  -- proveedor contratado aún, ver docs/PLAN_MIGRACION_TALLERPRO.md §2) | 'fallido'
  status TEXT NOT NULL DEFAULT 'simulado',
  vehicle_plate TEXT DEFAULT '',
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workshop_notifications_log_workshop ON workshop_notifications_log(workshop_id);
CREATE INDEX IF NOT EXISTS idx_workshop_notifications_log_sent_at ON workshop_notifications_log(workshop_id, sent_at DESC);

ALTER TABLE workshop_notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages workshop_notifications_log"
  ON workshop_notifications_log FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS workshop_issued_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  doc_number TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  client_name TEXT NOT NULL,
  client_tax_id TEXT DEFAULT '',
  recipient_role TEXT DEFAULT '',
  vehicle_plate TEXT DEFAULT '',
  vehicle_model TEXT DEFAULT '',
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  amount NUMERIC(12,2),
  mechanic_name TEXT DEFAULT '',
  validity_months INTEGER,
  details TEXT DEFAULT '',
  issued_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Emitido',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workshop_id, doc_number)
);

CREATE INDEX IF NOT EXISTS idx_workshop_issued_documents_workshop ON workshop_issued_documents(workshop_id);
CREATE INDEX IF NOT EXISTS idx_workshop_issued_documents_order ON workshop_issued_documents(work_order_id);

ALTER TABLE workshop_issued_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages workshop_issued_documents"
  ON workshop_issued_documents FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON COLUMN workshop_notifications_log.status IS 'enviado = email real entregado; simulado = WhatsApp/SMS registrado sin envío real (sin proveedor contratado); fallido = intento de envío real que falló';
COMMENT ON TABLE workshop_issued_documents IS 'Facturas/garantías/certificados numerados que emite el taller — doc_number único por taller';
