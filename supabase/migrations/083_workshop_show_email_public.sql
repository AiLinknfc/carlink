-- Interruptor de privacidad del correo del taller (2026-10-16): por defecto se sigue mostrando en la ficha publica
-- (comportamiento actual); el dueno puede ocultarlo desde Perfil y configuracion. El correo siempre sigue disponible
-- para el propio taller y para CarLink; solo deja de salir en GET /workshops/{code}.
-- Aditiva: una columna booleana con default. El modelo ya selecciona la columna: aplicarla ANTES de levantar el backend.
ALTER TABLE workshops
  ADD COLUMN IF NOT EXISTS show_email_public BOOLEAN NOT NULL DEFAULT TRUE;
