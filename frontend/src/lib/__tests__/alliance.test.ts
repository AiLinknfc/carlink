import { beforeEach, describe, expect, it } from 'vitest'
import { captureAllianceRef, clearAllianceRef, getStoredAllianceRef, normalizeCode } from '../alliance'

class MemStorage {
  private m = new Map<string, string>()
  getItem(k: string) { return this.m.get(k) ?? null }
  setItem(k: string, v: string) { this.m.set(k, v) }
  removeItem(k: string) { this.m.delete(k) }
}
beforeEach(() => { (globalThis as unknown as { localStorage: MemStorage }).localStorage = new MemStorage() })

describe('código de alianza', () => {
  it('normaliza y rechaza lo que no tiene forma de código', () => {
    expect(normalizeCode(' tlr-ab12c ')).toBe('TLR-AB12C')
    expect(normalizeCode('TLR-AB12')).toBeNull()
    expect(normalizeCode('<script>')).toBeNull()
    expect(normalizeCode(null)).toBeNull()
  })
  it('guarda el ?ref= de la URL y lo devuelve', () => {
    expect(captureAllianceRef('?utm=x&ref=tlr-ab12c')).toBe('TLR-AB12C')
    expect(getStoredAllianceRef()).toBe('TLR-AB12C')
  })
  it('ignora un ?ref= inválido y no pisa el guardado', () => {
    captureAllianceRef('?ref=TLR-AB12C')
    expect(captureAllianceRef('?ref=hola')).toBeNull()
    expect(getStoredAllianceRef()).toBe('TLR-AB12C')
  })
  it('vence a los 30 días y se puede borrar', () => {
    captureAllianceRef('?ref=TLR-AB12C')
    expect(getStoredAllianceRef(Date.now() + 31 * 86400000)).toBeNull()
    captureAllianceRef('?ref=TLR-AB12C')
    clearAllianceRef()
    expect(getStoredAllianceRef()).toBeNull()
  })
})
