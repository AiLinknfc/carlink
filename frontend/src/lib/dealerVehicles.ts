/* Vehículos del aliado (concesionario / compraventa): inventario, ficha pública con QR, kilometraje certificado y entrega
   al comprador (docs/PLAN_ALIADOS_NEGOCIO.md, sección 15). Cliente propio (no el `request()` compartido) porque acá importa
   el `detail` del error para decirle a la persona qué pasó. */
import { getAccessToken } from './supabase'

export interface DealerVehicle {
  id: string; plate: string; brand: string; model: string; year: number | null; color: string; vehicle_class: string
  mileage_declared: number; price_cop: number | null; description: string; photo_urls: string[]; status: 'available' | 'delivered'
  is_listed: boolean; public_slug: string; certified_km: number | null; certified_at: string | null
  certification_kind: 'dealer' | 'dealer_declared' | null; certification_label: string
  delivery_pending: boolean; delivery_expires_at: string | null; delivered_at: string | null; share_with_dealer: boolean; created_at: string
}
export interface DealerVehicleInput {
  plate: string; brand: string; model: string; year: number | null; color: string; vehicle_class: string
  mileage_declared: number; price_cop: number | null; description: string; photo_urls: string[]
}
export interface DealerPublic {
  slug: string; brand: string; model: string; year: number | null; color: string; vehicle_class: string; plate_hint: string
  mileage_km: number; mileage_label: string; mileage_certified: boolean; certified_at: string | null; price_cop: number | null
  description: string; photo_urls: string[]; dealer_name: string; dealer_city: string; dealer_code: string | null; dealer_verified: boolean
}
export interface DealerDeliveryPreview {
  plate: string; brand: string; model: string; year: number | null; color: string; mileage_km: number; mileage_label: string
  dealer_name: string; dealer_city: string; expires_at: string
}
export interface ApiResult<T> { ok: boolean; status: number; data: T | null; detail: string | null }

export async function call<T>(method: string, path: string, body?: unknown, auth = true): Promise<ApiResult<T>> {
  try {
    const headers: Record<string, string> = {}
    if (auth) { const t = await getAccessToken(); if (t) headers.Authorization = `Bearer ${t}` }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const res = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
    const json = res.status === 204 ? null : await res.json().catch(() => null)
    return { ok: res.ok, status: res.status, data: res.ok ? (json as T) : null, detail: res.ok ? null : (typeof json?.detail === 'string' ? json.detail : 'error') }
  } catch { return { ok: false, status: 0, data: null, detail: 'network' } }
}

export const dealerApi = {
  list: () => call<DealerVehicle[]>('GET', '/workshops/me/dealer-vehicles'),
  create: (b: DealerVehicleInput) => call<DealerVehicle>('POST', '/workshops/me/dealer-vehicles', b),
  update: (id: string, b: Partial<DealerVehicleInput>) => call<DealerVehicle>('PATCH', `/workshops/me/dealer-vehicles/${id}`, b),
  remove: (id: string) => call<null>('DELETE', `/workshops/me/dealer-vehicles/${id}`),
  setListing: (id: string, listed: boolean) => call<DealerVehicle>('POST', `/workshops/me/dealer-vehicles/${id}/listing`, { listed }),
  certify: (id: string, km: number) => call<DealerVehicle>('POST', `/workshops/me/dealer-vehicles/${id}/certify-km`, { km }),
  delivery: (id: string) => call<{ token: string; expires_at: string; workshop_name: string }>('POST', `/workshops/me/dealer-vehicles/${id}/delivery`),
}

export const publicDealerApi = {
  vehicle: (slug: string) => call<DealerPublic>('GET', `/dealer-vehicles/public/${encodeURIComponent(slug)}`, undefined, false),
  preview: (code: string) => call<DealerDeliveryPreview>('GET', `/dealer-vehicles/delivery/${encodeURIComponent(code)}`, undefined, false),
  claim: (code: string, share_contact: boolean) => call<{ vehicle_id: string; plate: string }>('POST', '/dealer-vehicles/claim', { code, share_contact }),
}

export const DEALER_ERRORS: Record<string, string> = {
  plate_invalid: 'La placa no es válida. Usa entre 5 y 7 letras y números, por ejemplo ABC123.',
  plate_exists: 'Ya tienes un vehículo con esa placa en tu inventario.',
  inventory_limit: 'Llegaste al máximo de vehículos en el inventario.',
  not_verified: 'Tu negocio aún no está verificado por CarLink.',
  not_enabled: 'CarLink todavía no te habilitó para certificar kilometraje. Escríbenos y lo revisamos.',
  kind_not_allowed: 'Tu tipo de negocio no puede certificar kilometraje.',
  access_expired: 'Tu acceso terminó: puedes consultar, pero no crear ni editar hasta renovar tu plan.',
  km_below_history: 'Ese kilometraje no coincide con el historial que CarLink tiene de esta placa. Revisa el valor del odómetro.',
  km_jump_too_large: 'Ese kilometraje es demasiado alto frente al historial de esta placa. Revisa que no haya un error de digitación.',
  certify_attempts_exceeded: 'Llegaste al máximo de intentos de certificación para este vehículo hoy. Vuelve a intentarlo mañana.',
  already_delivered: 'Este vehículo ya fue entregado y no se puede modificar.',
  capability_not_available: 'Tu tipo de negocio no incluye esta función.',
  plate_already_yours: 'Ya tienes un vehículo con esta placa en tu cuenta.',
  plate_reserved: 'Esta placa ya está verificada o activa en otra cuenta. Escríbenos a soporte para revisarlo.',
  keychain_required: 'Ya tienes un vehículo gratis en tu cuenta: para agregar otro necesitas un llavero NFC.',
  delivery_invalid: 'Este enlace de entrega no es válido o ya se usó. Pídele uno nuevo al vendedor.',
  delivery_expired: 'Este enlace de entrega venció. Pídele uno nuevo al vendedor.',
  certificate_invalid: 'El número de certificado no es válido: usa de 4 a 40 letras, números, guiones o puntos.',
  rtm_dates_invalid: 'Las fechas no cuadran: la revisión se registra el mismo día (o hasta 7 días después) y debe vencer después de la fecha de revisión, máximo en 2 años.',
  certificate_exists: 'Ya registraste una revisión con ese número de certificado.',
  already_claimed: 'Esa constancia ya fue aceptada por el propietario.',
  claim_invalid: 'Esta constancia no es válida o ya se usó. Pídele al CDA que genere una nueva.',
  claim_expired: 'Esta constancia venció. Pídele al CDA que genere una nueva.',
  no_vehicle: 'No tienes en tu cuenta un vehículo con esa placa. Regístralo primero y vuelve a abrir el enlace.',
  rate_limited: 'Demasiadas consultas seguidas. Intenta de nuevo en un rato.',
  network: 'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.',
}
export const dealerError = (detail: string | null) => DEALER_ERRORS[detail || ''] || 'Algo salió mal. Inténtalo de nuevo.'
export const formatKm = (n: number) => `${n.toLocaleString('es-CO')} km`
export const formatCop = (n: number) => '$' + n.toLocaleString('es-CO')
