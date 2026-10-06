import { describe, it, expect } from 'vitest'
import { partLife } from '../partLife'

describe('partLife', () => {
  it('avanza con el kilometraje', () => {
    expect(partLife(10000, 10000, 10000).usedFraction).toBe(0)
    expect(partLife(10000, 10000, 12500).usedFraction).toBeCloseTo(0.25)
    expect(partLife(10000, 10000, 15000).usedFraction).toBeCloseTo(0.5)
  })

  it('umbrales de estado', () => {
    expect(partLife(0, 10000, 4000).state).toBe('ok')
    expect(partLife(0, 10000, 5000).state).toBe('worn')   // queda el 50 %
    expect(partLife(0, 10000, 8500).state).toBe('critical') // queda el 15 %
    expect(partLife(0, 10000, 10000).state).toBe('expired')
    expect(partLife(0, 10000, 25000)).toMatchObject({ usedFraction: 1, remainingKm: 0, state: 'expired' })
  })

  it('sin datos suficientes es desconocido', () => {
    for (const args of [[null, 10000, 5000], [0, null, 5000], [0, 0, 5000], [0, 10000, null]] as const) {
      expect(partLife(args[0], args[1], args[2]).state).toBe('unknown')
    }
  })

  it('un kilometraje menor al de instalación no da vida negativa', () => {
    expect(partLife(50000, 10000, 40000)).toMatchObject({ usedFraction: 0, remainingKm: 10000 })
  })
})
