-- Endurecimiento de RLS encontrado al revisar la consulta de partners/franquicia
-- (docs/PLAN_PARTNER_MODEL.md): el backend de FastAPI conecta como el rol
-- `postgres` (dueño de las tablas), así que RLS nunca lo afecta a él — esto
-- solo cierra el único camino directo a Supabase que existe en el frontend
-- (frontend/src/app/api/vehicles/transfers/**, ver commit de fix de la lógica
-- de autorización) y deja el resto de tablas nuevas en el estado que ya
-- debieron tener desde que se crearon.

-- nfc_tokens no tenía RLS habilitado en absoluto — cualquier request que
-- llegara con rol anon/authenticated (ej. vía supabase-js desde el frontend)
-- podía leer o escribir cualquier fila sin restricción. Política: solo el
-- dueño del vehículo asociado puede leer/actualizar su propio token — mismo
-- patrón que ya usan las políticas de `vehicles`/`vehicle_transfers`.
alter table nfc_tokens enable row level security;

create policy "Users can read own vehicle tokens" on nfc_tokens
  for select using (
    exists (select 1 from vehicles v where v.id = nfc_tokens.vehicle_id and v.owner_id = auth.uid())
  );

create policy "Users can update own vehicle tokens" on nfc_tokens
  for update using (
    exists (select 1 from vehicles v where v.id = nfc_tokens.vehicle_id and v.owner_id = auth.uid())
  );

-- partners (agregada esta sesión) — nunca se lee/escribe fuera del backend
-- (que conecta como postgres, bypassa RLS igual), pero se habilita por
-- consistencia con el resto de tablas de administración NFC.
alter table partners enable row level security;

create policy "Service role manages partners" on partners
  for all to service_role using (true) with check (true);

-- Las 4 políticas de administración NFC ya existían con `roles: public,
-- using true` — es decir, a pesar de llamarse "Service role manages X" NO
-- estaban de verdad restringidas a service_role, cualquier rol (incluido
-- anon/authenticated) las pasaba. Hoy no hay ningún código que las alcance
-- directo (todo pasa por el backend, que bypassa RLS de por sí), así que no
-- es una brecha explotada — pero se corrige para que el nombre de la
-- política sea cierto y quede cerrada la puerta por si algún día se agrega
-- un acceso directo desde el frontend.
drop policy if exists "Service role manages access logs" on nfc_access_logs;
create policy "Service role manages access logs" on nfc_access_logs
  for all to service_role using (true) with check (true);

drop policy if exists "Service role manages alerts" on nfc_alerts;
create policy "Service role manages alerts" on nfc_alerts
  for all to service_role using (true) with check (true);

drop policy if exists "Service role manages token limits" on nfc_token_limits;
create policy "Service role manages token limits" on nfc_token_limits
  for all to service_role using (true) with check (true);

drop policy if exists "Service role manages whitelist" on nfc_token_whitelist;
create policy "Service role manages whitelist" on nfc_token_whitelist
  for all to service_role using (true) with check (true);

-- GET /api/vehicles/transfers/[id]/validate (frontend, ver fix de bug de
-- autorización en accept/route.ts) necesita mostrarle a un invitado SIN
-- sesión el vehículo y el nombre de quien le transfiere, antes de loguearse
-- — hoy no había ninguna política que lo permitiera, así que el endpoint
-- siempre devolvía "no encontrada" (RLS bloqueaba todo bajo el rol anon).
-- Mismo patrón de seguridad que ya usa la ficha pública NFC: el id de la
-- transferencia es un UUID no adivinable — esa es la protección, no el rol.
-- Se limita a filas 'pending' y no vencidas; una vez aceptada/cancelada/
-- expirada deja de ser visible por esta vía.
create policy "Anyone can preview a pending transfer" on vehicle_transfers
  for select using (status = 'pending' and expires_at > now());

create policy "Anyone can preview a vehicle in a pending transfer" on vehicles
  for select using (
    exists (
      select 1 from vehicle_transfers vt
      where vt.vehicle_id = vehicles.id and vt.status = 'pending' and vt.expires_at > now()
    )
  );

create policy "Anyone can preview the sender of a pending transfer" on profiles
  for select using (
    exists (
      select 1 from vehicle_transfers vt
      where vt.from_user_id = profiles.id and vt.status = 'pending' and vt.expires_at > now()
    )
  );

-- Sin esto, ni siquiera con el bug de accept/route.ts arreglado el flujo de
-- aceptar una transferencia podía terminar: no existía NINGUNA política que
-- dejara al destinatario escribir `vehicle_transfers.status` ni
-- `vehicles.owner_id` — antes de esto solo el remitente podía tocar esas
-- filas (política "Users can update own vehicles"/"...own pending
-- transfers"). Se agrega la contraparte del lado del destinatario, con la
-- MISMA condición de identidad que ya verifica el código de accept/route.ts
-- (to_user_id o email) — así queda protegido en dos capas, no solo una.
create policy "Recipients can accept their own pending transfer" on vehicle_transfers
  for update using (
    status = 'pending' and expires_at > now() and (
      to_user_id = auth.uid()
      or to_email = (select email from profiles where id = auth.uid())
    )
  )
  with check (
    to_user_id = auth.uid()
    or to_email = (select email from profiles where id = auth.uid())
  );

create policy "Recipients can claim a vehicle via an accepted transfer" on vehicles
  for update using (
    exists (
      select 1 from vehicle_transfers vt
      where vt.vehicle_id = vehicles.id
        and vt.status = 'pending'
        and vt.expires_at > now()
        and (vt.to_user_id = auth.uid() or vt.to_email = (select email from profiles where id = auth.uid()))
    )
  )
  with check (owner_id = auth.uid());
