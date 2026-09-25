import { describe, it, expect } from 'vitest'
import { safetyStatus, daysUntil, KIT_ITEMS } from '../safety'
import type { SafetyItem } from '../types'

const TODAY = new Date(2026, 8, 25) // 25 sep 2026

const base: SafetyItem = {
  id: '1', vehicle_id: 'v', kind: 'extintor', name: '', purchase_date: null, expiry_date: null,
  recharge_date: null, review_date: null, restock_date: null, missing_items: [], checklist: {},
  details: {}, notes: '', file_url: '', created_at: '2026-01-01T00:00:00Z',
}

describe('safetyStatus', () => {
  it('extintor: vencido, por vencer, vigente y sin fecha', () => {
    expect(safetyStatus({ ...base, expiry_date: '2026-09-01' }, TODAY).tone).toBe('bad')
    expect(safetyStatus({ ...base, expiry_date: '2026-10-10' }, TODAY).tone).toBe('warn')
    expect(safetyStatus({ ...base, expiry_date: '2027-03-01' }, TODAY).tone).toBe('ok')
    expect(safetyStatus(base, TODAY).tone).toBe('none')
  })

  it('vence hoy cuenta como por vencer, no como vencido', () => {
    expect(daysUntil('2026-09-25', TODAY)).toBe(0)
    expect(safetyStatus({ ...base, expiry_date: '2026-09-25' }, TODAY).label).toBe('Vence hoy')
  })

  it('botiquin: faltantes avisa; vencido gana sobre faltantes', () => {
    const b = { ...base, kind: 'botiquin' as const, review_date: '2026-08-01' }
    expect(safetyStatus(b, TODAY).tone).toBe('ok')
    expect(safetyStatus({ ...b, missing_items: ['gasas', 'alcohol'] }, TODAY).label).toBe('Faltan 2 elementos')
    expect(safetyStatus({ ...b, missing_items: ['gasas'], expiry_date: '2026-01-01' }, TODAY).tone).toBe('bad')
  })

  it('kit de carretera: sin revisar, incompleto y completo', () => {
    const k = { ...base, kind: 'kit_carretera' as const }
    expect(safetyStatus(k, TODAY).tone).toBe('none')
    const all = Object.fromEntries(KIT_ITEMS.map(i => [i.key, true]))
    expect(safetyStatus({ ...k, checklist: all }, TODAY).tone).toBe('ok')
    expect(safetyStatus({ ...k, checklist: { ...all, gato: false, chaleco: false } }, TODAY).label).toBe('Faltan 2 elementos')
  })
})
