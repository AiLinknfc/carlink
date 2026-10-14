import { describe, it, expect } from 'vitest'
import { parseLocalDate, formatLocalDate } from '@/lib/dates'

describe('parseLocalDate', () => {
  it('una fecha YYYY-MM-DD cae en el mismo dia local, sin importar la zona', () => {
    const d = parseLocalDate('2026-10-14')
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 14])
  })
  it('un timestamp con hora se interpreta como instante', () => {
    expect(parseLocalDate('2026-10-14T13:58:49Z').toISOString()).toBe('2026-10-14T13:58:49.000Z')
  })
  it('formatLocalDate devuelve vacio sin valor', () => {
    expect(formatLocalDate(null)).toBe('')
    expect(formatLocalDate('2026-10-14', 'en-US')).toBe('10/14/2026')
  })
})
