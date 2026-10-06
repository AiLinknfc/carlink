import { describe, it, expect } from 'vitest'
import { useOptions, lifespanFor, USE_INFO, isLubricantUse, useSummary } from '../lubricantUse'
import { isFluidPart } from '../fluids'

describe('lubricantUse', () => {
  it('todos los vehículos ofrecen motor, caja y transmisión (una moto automática o scooter usa aceite de transmisión)', () => {
    for (const kind of ['carro', 'pesado', 'moto'] as const) {
      expect(useOptions(kind).map(o => o.key)).toEqual(['motor', 'caja', 'transmision'])
    }
  })
  it('cada caso tiene su pieza, que cuenta como fluido en Control de servicios', () => {
    expect(Object.values(USE_INFO).map(u => u.part)).toEqual(['Aceite de motor', 'Aceite de caja', 'Aceite de transmisión'])
    for (const u of Object.values(USE_INFO)) expect(isFluidPart(u.part)).toBe(true)
  })
  it('la vida útil depende del caso y del fluido', () => {
    expect(lifespanFor('caja')).toEqual({ km: 50000, months: 48 })
    expect(lifespanFor('transmision', 'ATF Dexron VI')).toEqual({ km: 60000, months: 48 })
    expect(lifespanFor('transmision', 'CVT')).toEqual({ km: 40000, months: 36 })
    expect(lifespanFor('transmision', 'algo raro').km).toBe(60000)
  })
  it('validación de caso y descripción', () => {
    expect(isLubricantUse('caja')).toBe(true)
    expect(isLubricantUse('freno')).toBe(false)
    expect(useSummary('transmision')).toBe('Aceite de transmisión')
  })
})
