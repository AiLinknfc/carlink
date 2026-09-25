import type { SafetyItem, SafetyKind } from './types'

export const KIND_LABEL: Record<SafetyKind, string> = {
  extintor: 'Extintor',
  botiquin: 'Botiquín',
  kit_carretera: 'Kit de carretera',
  otro: 'Otro elemento',
}

/* Elementos del kit de carretera que se revisan uno a uno. */
export const KIT_ITEMS: { key: string; label: string }[] = [
  { key: 'gato', label: 'Gato' },
  { key: 'llave_ruedas', label: 'Llave de ruedas' },
  { key: 'triangulos', label: 'Triángulos/conos' },
  { key: 'chaleco', label: 'Chaleco reflectivo' },
  { key: 'herramientas', label: 'Herramientas' },
]

export const EXPIRY_WARN_DAYS = 30

export type Tone = 'ok' | 'warn' | 'bad' | 'none'
export interface SafetyStatus { tone: Tone; label: string }

/** Parsea 'YYYY-MM-DD' como fecha local (sin desfase de zona horaria). */
export function parseDay(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function formatDay(iso: string | null | undefined): string {
  const d = parseDay(iso)
  return d ? d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}

export function daysUntil(iso: string | null | undefined, today: Date = new Date()): number | null {
  const d = parseDay(iso)
  if (!d) return null
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((d.getTime() - base.getTime()) / 86400000)
}

function expiryStatus(iso: string | null, today?: Date): SafetyStatus {
  const days = daysUntil(iso, today)
  if (days === null) return { tone: 'none', label: 'Sin fecha de vencimiento' }
  if (days < 0) return { tone: 'bad', label: `Vencido hace ${Math.abs(days)} día${Math.abs(days) === 1 ? '' : 's'}` }
  if (days <= EXPIRY_WARN_DAYS) return { tone: 'warn', label: days === 0 ? 'Vence hoy' : `Vence en ${days} día${days === 1 ? '' : 's'}` }
  return { tone: 'ok', label: 'Vigente' }
}

export function kitMissing(item: Pick<SafetyItem, 'checklist'>): string[] {
  return KIT_ITEMS.filter(k => !item.checklist?.[k.key]).map(k => k.label)
}

/** Estado resumido de un elemento (lo que se muestra en su etiqueta de color). */
export function safetyStatus(item: SafetyItem, today?: Date): SafetyStatus {
  if (item.kind === 'kit_carretera') {
    if (!item.checklist || Object.keys(item.checklist).length === 0) return { tone: 'none', label: 'Sin revisar' }
    const missing = kitMissing(item)
    return missing.length === 0
      ? { tone: 'ok', label: 'Completo' }
      : { tone: 'warn', label: `Faltan ${missing.length} elemento${missing.length === 1 ? '' : 's'}` }
  }
  if (item.kind === 'botiquin') {
    const expiry = item.expiry_date ? expiryStatus(item.expiry_date, today) : null
    if (expiry && expiry.tone === 'bad') return expiry
    if (item.missing_items.length > 0) return { tone: 'warn', label: `Faltan ${item.missing_items.length} elemento${item.missing_items.length === 1 ? '' : 's'}` }
    if (expiry && expiry.tone === 'warn') return expiry
    return item.review_date ? { tone: 'ok', label: 'Completo' } : { tone: 'none', label: 'Sin revisar' }
  }
  return expiryStatus(item.expiry_date, today)
}

export const TONE_COLOR: Record<Tone, string> = { ok: '#2ecc71', warn: '#ffb020', bad: '#ff4d6a', none: '#8f8a7a' }
