/* Vínculo taller-conductor por QR (docs/PLAN_VINCULO_TALLER_CONDUCTOR.md): llamadas al API y el "pendiente"
   que se guarda mientras la persona inicia sesión o se registra. Todo es de mejor esfuerzo: si el backend lo
   tiene apagado (flag) las llamadas devuelven null y la interfaz simplemente no muestra nada. */
import { apiUrl } from '@/lib/supabase'
import { apiDelete, apiGet, apiPost } from '@/lib/api'

export type PendingLink = { kind: 'ref'; code: string } | { kind: 'claim'; token: string }

const PENDING_KEY = 'carlink_pending_workshop_link'
const DISMISSED_KEY = 'carlink_workshop_candidates_dismissed'

export function rememberPending(p: PendingLink) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(p)) } catch {}
}
export function readPending(): PendingLink | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (p?.kind === 'ref' && typeof p.code === 'string') return p
    if (p?.kind === 'claim' && typeof p.token === 'string') return p
  } catch {}
  return null
}
export function clearPending() {
  try { localStorage.removeItem(PENDING_KEY) } catch {}
}

/* Candidatos que la persona ya descartó ("No es mi taller"), para no insistir. */
export function dismissedCandidates(): string[] {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]') } catch { return [] }
}
export function dismissCandidate(key: string) {
  try { localStorage.setItem(DISMISSED_KEY, JSON.stringify([...new Set([...dismissedCandidates(), key])])) } catch {}
}
export const candidateKey = (workshopId: string, vehicleId: string) => `${workshopId}:${vehicleId}`

/** Misma regla que `mask_plate` del backend: ABC123 -> AB***3. */
export function maskPlate(plate: string): string {
  const p = plate.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return p.length <= 3 ? p : `${p.slice(0, 2)}${'*'.repeat(p.length - 3)}${p.slice(-1)}`
}

export interface WorkshopLink {
  id: string; workshop_code: string; workshop_name: string; workshop_city: string
  vehicle_id: string; plate: string; origin: string; consent_share_contact: boolean; created_at: string
}
export interface ClaimInfo { workshop_code: string; workshop_name: string; plate_hint: string; brand: string; model: string }
export interface Candidate {
  workshop_id: string; workshop_code: string; workshop_name: string; workshop_city: string
  vehicle_id: string; typed_names: string[]; record_count: number
}
export interface TallerLink {
  id: string; client_name: string; plate: string; brand: string; model: string
  whatsapp: string | null; origin: string; created_at: string
}
export interface ClaimToken { token: string; expires_at: string; workshop_name: string }

let enabledCache: Promise<boolean> | null = null
/** ¿El vínculo está encendido en el servidor? Público, se consulta una vez por carga de página. */
export function linksEnabled(): Promise<boolean> {
  if (!enabledCache) {
    enabledCache = fetch(apiUrl('/workshop-links/status'))
      .then(r => (r.ok ? r.json() : { enabled: false }))
      .then(j => !!j?.enabled)
      .catch(() => false)
  }
  return enabledCache
}

/** Info pública del enlace de reclamo: fetch propio para distinguir "no válido" de un error de red. */
export async function claimInfo(token: string): Promise<ClaimInfo | 'invalid' | null> {
  try {
    const res = await fetch(apiUrl(`/workshop-links/claim/${encodeURIComponent(token)}`))
    if (res.status === 404) return 'invalid'
    return res.ok ? await res.json() : null
  } catch { return null }
}

export const linksApi = {
  create: (workshop_code: string, vehicle_id: string, share_contact: boolean) =>
    apiPost<WorkshopLink>('/workshop-links', { workshop_code, vehicle_id, share_contact }),
  claim: (token: string, vehicle_id: string, share_contact: boolean) =>
    apiPost<{ link: WorkshopLink; synced_orders: number }>('/workshop-links/claim', { token, vehicle_id, share_contact }),
  mine: () => apiGet<WorkshopLink[]>('/workshop-links/mine'),
  revoke: (id: string) => apiDelete(`/workshop-links/${id}`),
  candidates: () => apiGet<Candidate[]>('/workshop-links/candidates'),
  confirmCandidate: (workshop_id: string, vehicle_id: string, share_contact: boolean | null) =>
    apiPost<{ records_claimed: number; linked: boolean }>('/workshop-links/candidates/confirm', { workshop_id, vehicle_id, share_contact }),
  tallerLinks: () => apiGet<TallerLink[]>('/workshops/me/links'),
  vehicleClaimToken: (workshopVehicleId: string) => apiPost<ClaimToken>(`/workshops/me/vehicles/${workshopVehicleId}/claim-token`),
  orderClaimToken: (orderId: string) => apiPost<ClaimToken>(`/workshops/me/orders/${orderId}/claim-token`),
}
