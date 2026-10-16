import { describe, expect, it, vi } from 'vitest'

vi.mock('../supabase', () => ({ supabase: {}, getAccessToken: async () => null, apiUrl: (p: string) => `/api${p}` }))
import { addDays, daysLabel, isoDate, reminderLink } from '../rtm'

describe('revisiones RTM: ayudas de fechas y recordatorio', () => {
  it('suma días sin saltarse el cambio de mes ni de año', () => {
    expect(addDays('2026-10-17', 365)).toBe('2027-10-17')
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
    expect(addDays('2026-02-27', 2)).toBe('2026-03-01')
  })
  it('formatea una fecha local', () => { expect(isoDate(new Date(2026, 0, 5))).toBe('2026-01-05') })
  it('dice cuánto falta en español', () => {
    expect(daysLabel(10)).toBe('vence en 10 días')
    expect(daysLabel(1)).toBe('vence en 1 día')
    expect(daysLabel(0)).toBe('vence hoy')
    expect(daysLabel(-3)).toBe('venció hace 3 días')
  })
  it('arma el WhatsApp solo con un celular válido', () => {
    const l = reminderLink('300 123 4567', 'ABC-123', 'CDA Duitama', 12)!
    expect(l.startsWith('https://wa.me/573001234567?text=')).toBe(true)
    expect(decodeURIComponent(l)).toContain('ABC-123 vence en 12 días')
    expect(reminderLink('123', 'ABC-123', 'CDA', 5)).toBeNull()
  })
})
