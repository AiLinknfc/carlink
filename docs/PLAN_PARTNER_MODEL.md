# Plan: rol "partner" (aprovisionamiento escopeado, no el admin único)

_Creado: 2026-08-08, a partir de una consulta explícita del usuario sobre si el modelo actual
("cerrado", solo se usa el dispositivo activando un código que viene en cada empaque/llavero)
podría abrirse de forma controlada a socios/aliados comerciales (tipo franquicia) sin comprometer
la seguridad. Ver la respuesta completa dada en el chat — resumen de las decisiones abajo._

## Contexto y decisión

Hoy `ADMIN_USER_ID` es un único UUID hardcodeado (`app/dependencies.py::get_current_admin`) que
controla **todo** `/admin/*`: aprovisionar llaveros, ver logs de acceso de cualquier usuario,
alertas, inventario, límites por cuenta. No existe ningún nivel intermedio. Ya estaba anotado como
pendiente #8 de `docs/PENDIENTES.md` ("Rol admin sigue siendo un solo UUID hardcodeado... mejor con
una conversación corta primero") — esta conversación fue esa charla.

**Confirmado en la consulta**: compartir la cuenta admin real con un socio, o crear una segunda
cuenta admin, sería peligroso — acceso total e irrevocable de forma selectiva, sin cupos, sin
trazabilidad de qué generó cada quién. La alternativa segura es un **rol nuevo, separado**, con
acceso **solo** a aprovisionar dentro de un cupo asignado, sin visibilidad de nada ajeno a sus
propios lotes.

**La ruta criptográfica no cambia en nada.** Un partner llama exactamente
`generate_nfc_token()` + `generate_human_code()` de `app/services/nfc_provisioning.py` — las
mismas funciones que ya usa `POST /admin/nfc/whitelist/provision`. Nunca se guarda un token o
código crudo; solo su hash. Lo único nuevo es **quién** puede llamar a esa generación, con qué
límite, y con qué trazabilidad de origen.

## Diseño

### DB — `supabase/migrations/040_partner_program.sql`
```sql
create table if not exists partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_email text not null,
  contact_phone text not null default '',
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
```
`api_key_hash` sigue el mismo patrón que `activation_code_hash`/`token_hash`: la clave cruda del
partner (`secrets.token_urlsafe(32)`, prefijo `pk_partner_`) se muestra **una sola vez** al
crearlo, nunca se guarda en texto plano. `api_key_prefix` (primeros 12 caracteres) es solo para que
el admin pueda identificar la clave en una lista sin poder reconstruirla.

### Backend
- `app/models/models.py` — clase `Partner`.
- `app/schemas/schemas.py` — `PartnerCreate`/`PartnerCreateOut` (con la api key cruda, una vez),
  `PartnerOut` (sin la clave), `PartnerUpdate` (cupo/estado), `PartnerMeOut` (cupo + usados +
  restante), `PartnerProvisionRequest` (`quantity: int, batch_note: str, tag_uids: list[str] | None`),
  `PartnerProvisionOut` (lista de `{activation_code, token_url, qr_url}`, una vez — mismo shape que
  `NfcWhitelistProvisionOut`), `PartnerBatchOut`.
- `app/dependencies.py` — `get_current_partner`: header `X-Partner-Api-Key`, hash SHA-256, busca
  por `api_key_hash`, exige `status == 'active'`. Falla cerrado (401 sin header/no encontrado, 403
  si está suspendido) — mismo estilo que `get_current_admin`.
- `app/routers/partners.py` (nuevo, prefix `/partners`, todo bajo `get_current_partner`):
  - `GET /partners/me` — cupo total/usado/restante, nombre, estado.
  - `POST /partners/me/provision` — valida `quota_used + quantity <= quota_total` (400 si no
    alcanza), genera `quantity` filas de `nfc_token_whitelist` con
    `provisioned_by_partner_id=partner.id` y un `partner_batch_id` compartido por el lote,
    incrementa `quota_used` de forma atómica. Si no vienen `tag_uids` propios, genera
    placeholders únicos (`partner:{partner_id}:{batch_id}:{i}`) — `tag_uid` no participa en la
    validación de seguridad en la activación real (solo es metadata de inventario, confirmado
    revisando `nfc.py`), así que no hace falta que el partner tenga ya el UID físico.
  - `GET /partners/me/batches` — lista de lotes propios (conteo generado/reclamado por
    `partner_batch_id`). Nunca expone `claimed_by` (identidad del cliente final) — un partner no
    debe ver quién activó qué, solo si ya se activó.
- `app/routers/admin.py` (agregado, sigue bajo `get_current_admin`, sin ruta nueva fuera de admin):
  - `POST /admin/partners` — crea partner, devuelve la api key cruda una vez.
  - `GET /admin/partners` — lista todos con su cupo.
  - `PATCH /admin/partners/{id}` — cambiar cupo total o `status` (suspender/reactivar).
  - `GET /admin/partners/{id}/batches` — trazabilidad completa de todos los lotes de un partner,
    para el admin (a diferencia de `/partners/me/batches`, que un partner solo ve los propios).

### Frontend
- `frontend/src/app/partner/page.tsx` — panel de prueba, visualmente en línea con `/admin` (mismos
  acentos dorados, misma tipografía) pero **una sola pantalla**, sin sidebar de módulos: pantalla
  de "ingresar API key" (se guarda en `sessionStorage`, no en `localStorage` — se pierde al cerrar
  la pestaña, coherente con que es un secreto compartido y no una sesión de usuario) → cupo
  restante → formulario "Provisionar N llaveros" → tabla de códigos generados (una sola vez,
  igual que el modal de aprovisionamiento de `/admin`) → lista de lotes propios.
- `frontend/src/app/admin/page.tsx` — nueva sub-sección "Partners" (crear partner, ver cupos,
  suspender) dentro de Admin NFC, para que el admin real gestione partners sin tocar SQL a mano.

## Alcance de esta pasada

Construido **"listo para cuando el proyecto madure"**, a pedido explícito del usuario — es decir:
el sistema completo (DB, backend, panel de prueba) queda funcional y probado, pero **no se crea
ningún partner real todavía**. `/partner` sirve para que el propio usuario pruebe el flujo
end-to-end con una clave de prueba generada por él mismo desde `/admin`, no para repartir accesos
reales a terceros. Ver `docs/PENDIENTES.md` para lo que falta antes de dar un acceso real a un
socio (contrato, límites de negocio, decisión de qué partners existen).

## Verificación
- Migración `040` corrida y verificada contra la base real (`information_schema`, igual que las
  anteriores).
- `POST /admin/partners` → partner de prueba → `POST /partners/me/provision` con la clave cruda
  devuelta → confirmar en DB que las filas de `nfc_token_whitelist` quedan con
  `provisioned_by_partner_id`/`partner_batch_id` correctos y `quota_used` incrementado.
  Confirmar que un `provision` que excede el cupo devuelve 400 y no crea nada.
  Activar uno de los códigos generados por el flujo normal (`POST /nfc/activate`, sin cambios) y
  confirmar que funciona exactamente igual que un llavero aprovisionado por el admin — la ruta
  criptográfica no distingue origen.
- `npx tsc --noEmit` en frontend antes de cerrar.

## Ampliación: llaveros de campaña + control estricto de QR (2026-08-09)

El usuario aclaró el caso de uso real: crear partners **por campaña** (ej. un evento donde se
reparten llaveros), reusando el mismo modelo de arriba, pero con **control estricto sobre los
tokens y los QR generados** — y trasladar la generación de QR, que hoy vivía como autoservicio en
modo persona, a control exclusivo de admin/partner.

- **`GET /partners/me/tokens`** (nuevo) — llaveros propios del partner, uno por fila (a diferencia
  de `/me/batches`, que agrega), con `qr_url` de cada uno. Igual que `qr_url` en general, no es de
  un solo uso — se puede volver a pedir cuando haga falta, filtrable por `batch_id` para manejar
  una campaña puntual. A propósito no expone `claimed_by`.
- **`GET /admin/nfc/whitelist`** ahora también devuelve `provisioned_by_partner_id`,
  `partner_batch_id` y `partner_name` por fila — la pestaña Whitelist (que ya tenía "Ver QR" por
  fila) ahora también muestra de qué partner/campaña viene cada llavero, con un filtro por origen.
- **`QrCodePanel.tsx`** — se agregó "Descargar las 3 variantes" (Simple/Estándar/Máxima
  resistencia, los mismos niveles `M/Q/H` que ya existían) para no tener que reabrir el panel tres
  veces por token.
- **El botón "Ver código QR" se sacó por completo del modo persona** (`FichaTab.tsx` y la sección
  de "Mis llaveros" en `app/app/page.tsx`) — la generación/manipulación de QR ahora es exclusiva
  de Admin NFC (pestaña Whitelist) y del panel `/partner`. El endpoint `GET /nfc/tokens/{id}/url`
  que alimentaba esos botones sigue existiendo tal cual (lo sigue usando "Copiar enlace", que no se
  tocó) — solo se dejó de pedir/usar su campo `qr_url` desde esas dos pantallas.

### Verificación
- `GET /partners/me/tokens` probado contra la DB real: crear partner → provisionar 2 → confirmar
  que la lista devuelve ambos con `qr_url` presente y sin `claimed_by`; confirmar que
  `GET /admin/nfc/whitelist` muestra esas mismas filas con `partner_name` correcto. Limpiado
  después.
- `npx tsc --noEmit`, `npx vitest run` (29/29) y `pytest` (47/47) sin regresiones.
