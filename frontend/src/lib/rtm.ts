/* Revisiones técnico-mecánicas (RTM) de un CDA y su constancia al propietario (docs/PLAN_ALIADOS_NEGOCIO.md, sección 16). */
import { call } from './dealerVehicles'

export interface RtmInspection {
  id: string; plate: string; inspected_on: string; expires_on: string; days_left: number; certificate_code: string
  result: 'approved' | 'rejected'; mileage_km: number; notes: string; claim_pending: boolean; claimed: boolean
  claimed_at: string | null; share_with_cda: boolean; client_name: string | null; client_phone: string | null; created_at: string
}
export interface RtmInput {
  plate: string; inspected_on: string; expires_on: string; certificate_code: string; result: 'approved' | 'rejected'; mileage_km: number; notes: string
}
export interface RtmClaimPreview {
  plate: string; cda_name: string; cda_city: string; result: 'approved' | 'rejected'; inspected_on: string; expires_on: string
  certificate_code: string; mileage_km: number; expires_at: string
}
export interface Consignment {
  linked: boolean; partner_name: string | null; status: string | null; quota_total: number; available: number; claimed: number; other: number
  rows: { token_prefix: string | null; status: string; claimed_at: string | null; created_at: string }[]
}

export const rtmApi = {
  list: () => call<RtmInspection[]>('GET', '/workshops/me/rtm'),
  upcoming: (days = 45) => call<RtmInspection[]>('GET', `/workshops/me/rtm/upcoming?days=${days}`),
  create: (b: RtmInput) => call<RtmInspection>('POST', '/workshops/me/rtm', b),
  claimLink: (id: string) => call<{ token: string; expires_at: string; workshop_name: string }>('POST', `/workshops/me/rtm/${id}/claim-link`),
  consignment: () => call<Consignment>('GET', '/workshops/me/consignment'),
}
export const publicRtmApi = {
  preview: (code: string) => call<RtmClaimPreview>('GET', `/rtm/claim/${encodeURIComponent(code)}`, undefined, false),
  claim: (code: string, share_contact: boolean) => call<{ vehicle_id: string; plate: string; diagnostic_id: string; km_added: boolean }>('POST', '/rtm/claim', { code, share_contact }),
}

/** yyyy-mm-dd en la hora local (los <input type="date"> trabajan con eso). */
export function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return isoDate(new Date(y, m - 1, d + days))
}
/** "vence en 12 días" / "venció hace 3 días" / "vence hoy". */
export function daysLabel(n: number): string {
  if (n === 0) return 'vence hoy'
  if (n > 0) return `vence en ${n} ${n === 1 ? 'día' : 'días'}`
  return `venció hace ${-n} ${n === -1 ? 'día' : 'días'}`
}
export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-CO')
}
/** Enlace de WhatsApp para recordarle la renovación al cliente que autorizó compartir su contacto. */
export function reminderLink(phone: string, plate: string, cda: string, daysLeft: number): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 10) return null
  const to = digits.length === 10 ? `57${digits}` : digits
  const msg = `Hola, te escribe ${cda}. La revisión técnico-mecánica de tu vehículo ${plate} ${daysLabel(daysLeft)}. Cuando quieras agendamos tu cita.`
  return `https://wa.me/${to}?text=${encodeURIComponent(msg)}`
}
