import { describe, it, expect } from 'vitest'
import { pickLifespanKm, predictNextKm } from '../servicePrediction'

describe('servicePrediction', () => {
  it('pickLifespanKm toma la pieza que se gasta primero, o el valor por defecto', () => {
    expect(pickLifespanKm([10000, 100000], 10000)).toBe(10000)
    expect(pickLifespanKm([20000, 10000], 99999)).toBe(10000)
    expect(pickLifespanKm([], 5000)).toBe(5000)
    expect(pickLifespanKm([null, undefined, 0], 5000)).toBe(5000)
  })

  it('predictNextKm suma la vida útil al kilometraje', () => {
    expect(predictNextKm(50000, 5000)).toBe(55000)
    expect(predictNextKm(50000, 10000, 0)).toBe(60000)
  })

  it('con meses, manda lo que se alcance primero', () => {
    expect(predictNextKm(50000, 5000, 6)).toBe(55000)   // 5000 km < 9000 km de 6 meses
    expect(predictNextKm(50000, 5000, 2)).toBe(53000)   // 2 meses = 3000 km
  })

  it('sin kilometraje válido o sin vida útil no predice', () => {
    expect(predictNextKm(0, 5000)).toBeNull()
    expect(predictNextKm(NaN, 5000)).toBeNull()
    expect(predictNextKm(50000, 0)).toBeNull()
  })
})
