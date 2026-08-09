-- Rol "partner": aprovisionamiento de llaveros NFC escopeado a un cupo,
-- separado del admin único (ADMIN_USER_ID). Ver docs/PLAN_PARTNER_MODEL.md.
--
-- La ruta criptográfica del token no cambia: un partner sigue llamando
-- generate_nfc_token()/generate_human_code() exactamente igual que el admin.
-- Solo se agrega de dónde vino cada fila de nfc_token_whitelist.

create table if not exists partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_email text not null,
  contact_phone text not null default '',
  -- Igual que activation_code_hash/token_hash: la clave cruda se muestra
  -- una sola vez al crear el partner, nunca se guarda en texto plano.
  api_key_hash text not null unique,
  api_key_prefix text not null,
  quota_total integer not null default 0,
  quota_used integer not null default 0,
  status text not null default 'active' check (status in ('active', 'suspended')),
  notes text not null default '',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table nfc_token_whitelist
  add column if not exists provisioned_by_partner_id uuid references partners(id) on delete set null,
  add column if not exists partner_batch_id uuid;

create index if not exists idx_nfc_whitelist_partner on nfc_token_whitelist(provisioned_by_partner_id);
create index if not exists idx_partners_status on partners(status);
