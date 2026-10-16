/* Código de alianza (docs/PLAN_ALIADOS_NEGOCIO.md, sección 5). El enlace que comparte un negocio lleva `?ref=TLR-XXXXX`;
   se guarda unos días en el navegador y el checkout lo prellena. El descuento real lo calcula SIEMPRE el servidor. */

const KEY = 'carlink_alliance_ref'
const TTL_MS = 30 * 86400000
export const CODE_RE = /^TLR-[A-Z0-9]{5}$/

export function normalizeCode(raw: string | null | undefined): string | null {
  const c = (raw || '').trim().toUpperCase()
  return CODE_RE.test(c) ? c : null
}

/** Guarda el `?ref=` de la URL actual si es un código válido. Devuelve el código guardado o null. */
export function captureAllianceRef(search: string): string | null {
  const code = normalizeCode(new URLSearchParams(search).get('ref'))
  if (!code) return null
  try { localStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() })) } catch { /* sin almacenamiento */ }
  return code
}

export function getStoredAllianceRef(now = Date.now()): string | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const { code, at } = JSON.parse(raw) as { code?: string; at?: number }
    if (!at || now - at > TTL_MS) { localStorage.removeItem(KEY); return null }
    return normalizeCode(code)
  } catch { return null }
}

export function clearAllianceRef(): void {
  try { localStorage.removeItem(KEY) } catch { /* sin almacenamiento */ }
}

export interface AllianceCheck {
  valid: boolean
  reason?: 'invalid' | 'inactive' | 'self' | 'limit' | null
  workshop_name?: string | null
  discount_per_unit_cop: number
  discount_cop: number
  total_cop: number
}

export const ALLIANCE_REASON_TEXT: Record<string, string> = {
  invalid: 'Ese código no existe o no está activo.',
  inactive: 'Ese aliado no tiene el descuento disponible por ahora.',
  self: 'No puedes usar tu propio código de alianza.',
  limit: 'Ese código alcanzó el máximo de descuentos de este mes.',
}
