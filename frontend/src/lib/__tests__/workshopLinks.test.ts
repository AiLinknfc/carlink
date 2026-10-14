import { describe, it, expect, beforeEach, vi } from 'vitest'

// workshopLinks importa el cliente de Supabase y el API, que piden variables de entorno: aca no se usan.
vi.mock('@/lib/supabase', () => ({ apiUrl: (p: string) => p, getAccessToken: async () => null }))
vi.mock('@/lib/api', () => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiDelete: vi.fn() }))
import { candidateKey, clearPending, dismissCandidate, dismissedCandidates, maskPlate, readPending, rememberPending } from '@/lib/workshopLinks'

// El entorno de vitest es node (sin localStorage): uno minimo en memoria.
const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v) },
  removeItem: (k: string) => { store.delete(k) },
  clear: () => store.clear(),
})

describe('maskPlate (mismo resultado que mask_plate del backend)', () => {
  it('enmascara el medio de la placa', () => {
    expect(maskPlate('ZYM-35C')).toBe('ZY***C')
    expect(maskPlate('abc123')).toBe('AB***3')
  })
  it('placas cortas no se enmascaran', () => {
    expect(maskPlate('ab')).toBe('AB')
  })
})

describe('pendiente de vinculo', () => {
  beforeEach(() => localStorage.clear())

  it('guarda y lee un QR de taller y un enlace de reclamo', () => {
    rememberPending({ kind: 'ref', code: 'TLR-ABCDE' })
    expect(readPending()).toEqual({ kind: 'ref', code: 'TLR-ABCDE' })
    rememberPending({ kind: 'claim', token: 'x'.repeat(30) })
    expect(readPending()).toEqual({ kind: 'claim', token: 'x'.repeat(30) })
  })
  it('clearPending lo borra', () => {
    rememberPending({ kind: 'ref', code: 'TLR-ABCDE' })
    clearPending()
    expect(readPending()).toBeNull()
  })
  it('ignora contenido corrupto o de forma inesperada', () => {
    localStorage.setItem('carlink_pending_workshop_link', '{not json')
    expect(readPending()).toBeNull()
    localStorage.setItem('carlink_pending_workshop_link', JSON.stringify({ kind: 'otro', code: 1 }))
    expect(readPending()).toBeNull()
  })
})

describe('candidatos descartados', () => {
  beforeEach(() => localStorage.clear())
  it('recuerda sin duplicar', () => {
    const k = candidateKey('w1', 'v1')
    dismissCandidate(k); dismissCandidate(k); dismissCandidate(candidateKey('w2', 'v1'))
    expect(dismissedCandidates()).toEqual(['w1:v1', 'w2:v1'])
  })
})
