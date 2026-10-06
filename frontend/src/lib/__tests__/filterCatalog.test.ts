import { describe, it, expect } from 'vitest'
import { filterOptions, filterLifespanKm, vehicleKindOf, chosenFilter, ALL_FILTER_KEYS } from '../filterCatalog'

describe('vehicleKindOf', () => {
  it('detecta moto por la clase o por la categoría de placa', () => {
    expect(vehicleKindOf('Moto', 'particular')).toBe('moto')
    expect(vehicleKindOf('Sedán', 'moto')).toBe('moto')
    expect(vehicleKindOf(' moto ', '')).toBe('moto')
  })
  it('todo lo demás usa las opciones de carro', () => {
    for (const b of ['Sedán', 'SUV', 'Camioneta', '', undefined, null]) expect(vehicleKindOf(b as any, 'particular')).toBe('carro')
  })
})

describe('filterOptions', () => {
  it('carro: aceite, aire, habitáculo, combustible y transmisión, de más a menos popular', () => {
    expect(filterOptions('carro', 'gasolina').map(o => o.label)).toEqual(['Aceite', 'Aire del motor', 'Habitáculo / A/C', 'Combustible', 'Transmisión'])
  })
  it('carro diésel o sin combustible definido suma el filtro de partículas; gasolina no', () => {
    expect(filterOptions('carro', 'diesel').map(o => o.key)).toContain('particle_filter')
    expect(filterOptions('carro', '').map(o => o.key)).toContain('particle_filter')
    expect(filterOptions('carro', 'gasolina').map(o => o.key)).not.toContain('particle_filter')
  })
  it('camión y bus (pesado) usan las opciones de carro', () => {
    expect(vehicleKindOf('Camión', 'particular')).toBe('pesado')
    expect(filterOptions('pesado', 'diesel').map(o => o.key)).toEqual(filterOptions('carro', 'diesel').map(o => o.key))
  })
  it('moto: solo aceite, aire y combustible (nunca habitáculo ni transmisión)', () => {
    const o = filterOptions('moto', 'diesel')
    expect(o.map(x => x.key)).toEqual(['oil_filter', 'air_filter', 'fuel_filter'])
  })
  it('cada filtro tiene su propia vida útil y las claves no se repiten dentro de un vehículo', () => {
    for (const kind of ['carro', 'moto'] as const) {
      const opts = filterOptions(kind, 'diesel')
      expect(new Set(opts.map(x => x.key)).size).toBe(opts.length)
      expect(new Set(opts.map(x => x.part)).size).toBe(opts.length)
    }
    expect(new Set(filterOptions('carro', 'diesel').map(o => o.lifespanKm)).size).toBeGreaterThan(3)
  })
})

describe('filterLifespanKm / chosenFilter', () => {
  it('el filtro de aceite de una moto dura menos que el de un carro', () => {
    expect(filterLifespanKm('moto', 'Filtro de aceite')).toBe(5000)
    expect(filterLifespanKm('carro', 'Filtro de aceite')).toBe(10000)
    expect(filterLifespanKm('carro', 'Filtro de habitáculo')).toBe(15000)
    expect(filterLifespanKm('moto', 'Filtro de habitáculo')).toBeUndefined()
  })
  it('chosenFilter devuelve el único filtro marcado', () => {
    expect(chosenFilter({})).toBeNull()
    expect(chosenFilter({ cabin_filter: true, oil_filter: false })).toBe('cabin_filter')
    expect(ALL_FILTER_KEYS).toContain('transmission_filter')
  })
})
