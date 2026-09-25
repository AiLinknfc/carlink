-- Catalogo de encuestas gestionable desde Admin (pestaña "Encuestas").
-- Hasta ahora los prompts de calificacion flotantes estaban fijos en el codigo
-- (app/app/page.tsx y OrderTrackingModal). Ahora cada encuesta es una fila: se puede
-- editar su texto, activar/desactivar, y Admin ve donde y cuando aparece.
-- El frontend cae a un catalogo por defecto (igual a estas semillas) si esta tabla no existe
-- todavia, asi que aplicar esta migracion ANTES de desplegar el backend es lo unico obligatorio.

CREATE TABLE IF NOT EXISTS surveys (
  key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  hint TEXT NOT NULL DEFAULT '',
  target_type TEXT NOT NULL CHECK (target_type IN ('platform', 'product', 'workshop')),
  trigger_key TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  timing TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'service_role_all_on_surveys' AND polrelid = 'surveys'::regclass) THEN
    CREATE POLICY "service_role_all_on_surveys"
      ON surveys
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

INSERT INTO surveys (key, title, hint, target_type, trigger_key, location, timing, position) VALUES
  ('app_satisfaction', '¿Qué tal tu experiencia con CarLink?',
   'Ya llevas un tiempo usando la app — tu opinión nos ayuda a mejorarla.',
   'platform', 'usage_milestone', 'App del cliente, tarjeta flotante abajo a la derecha',
   'A los 30 dias del registro, o cuando ya tiene un vehiculo y al menos 3 servicios registrados (lo que ocurra primero)', 1),
  ('ease_of_use', '¿Qué tan fácil fue registrar tu servicio?',
   'Acabas de guardar tu primer servicio — cuéntanos si fue simple o si algo te frenó.',
   'platform', 'first_service_registered', 'App del cliente, tarjeta flotante abajo a la derecha',
   'Justo despues de guardar el primer servicio de mantenimiento del usuario', 2),
  ('keychain_setup', '¿Qué tal el llavero NFC?',
   'Acabas de activarlo — cuéntanos qué te pareció el producto y si fue fácil dejarlo listo.',
   'product', 'keychain_activated', 'App del cliente, tarjeta flotante abajo a la derecha',
   'Justo despues de activar un llavero con su codigo de activacion', 3),
  ('keychain_found_notice', '¿El llavero funcionó cuando lo necesitaste?',
   'Alguien te avisó que encontró tu vehículo — cuéntanos qué tal fue la experiencia.',
   'platform', 'found_notice_opened', 'App del cliente, tarjeta flotante abajo a la derecha',
   'Cuando el dueño abre un aviso de "llavero encontrado" (alguien escaneo su llavero y le dejo un mensaje)', 4),
  ('purchase_experience', '¿Cómo fue tu compra?',
   'Tu pedido ya fue entregado — cuéntanos qué te pareció el proceso y el producto.',
   'product', 'order_delivered', 'Seguimiento del pedido, ventana centrada (interrumpe; unico caso asi)',
   'Cuando el usuario abre el seguimiento de un pedido ya entregado', 5),
  ('workshop_service', '¿Cómo te fue en tu taller?',
   'Acabas de registrar un servicio con este taller — cuéntanos qué tal la atención.',
   'workshop', 'workshop_service_registered', 'App del cliente, tarjeta flotante abajo a la derecha',
   'Justo despues de registrar un servicio hecho en un taller aliado (una vez por taller)', 6)
ON CONFLICT (key) DO NOTHING;

-- Cada respuesta queda atada a la encuesta que la origino.
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS survey_key TEXT;

-- Respuestas existentes: hasta hoy habia como maximo una por (usuario, target_type),
-- asi que el `context` guardado identifica la encuesta de forma univoca.
UPDATE reviews SET survey_key = CASE
  WHEN target_type = 'product' AND context = 'Proceso de compra' THEN 'purchase_experience'
  WHEN target_type = 'product' THEN 'keychain_setup'
  WHEN target_type = 'platform' AND context = 'Aviso de llavero encontrado' THEN 'keychain_found_notice'
  ELSE 'app_satisfaction'
END
WHERE survey_key IS NULL;

-- La unicidad pasa de (usuario, target_type) a (usuario, encuesta): con varias encuestas
-- por categoria, un usuario puede responder cada una una vez (reenviar = editar).
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_user_id_target_type_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_user_survey ON reviews(user_id, survey_key) WHERE survey_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_survey ON reviews(survey_key);
