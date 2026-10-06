import { describe, it, expect } from 'vitest'
import { FUEL_OPTIONS, fuelLabel, showsParticleFilter } from '../fuelType'

describe('fuelType', () => {
  it('muestra el filtro de partículas en diésel y con combustible sin definir', () => {
    expect(showsParticleFilter('diesel')).toBe(true)
    expect(showsParticleFilter('')).toBe(true)
    expect(showsParticleFilter(undefined)).toBe(true)
  })

  it('lo oculta en gasolina, gas, híbrido y eléctrico', () => {
    for (const f of ['gasolina', 'gas', 'hibrido', 'electrico']) expect(showsParticleFilter(f)).toBe(false)
  })

  it('fuelLabel devuelve la etiqueta o vacío', () => {
    expect(fuelLabel('diesel')).toBe('Diésel')
    expect(fuelLabel('')).toBe('')
    expect(fuelLabel('raro')).toBe('')
    expect(FUEL_OPTIONS.map(o => o.value)).toContain('hibrido')
  })
})
