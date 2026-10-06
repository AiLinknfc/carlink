import { describe, it, expect } from 'vitest'
import { healthSummary } from '../vehicleHealth'
import { isFluidPart, latestFluids, viewForCategory } from '../fluids'

const item = (iconKey: string, pct: number, over: Partial<{ tracked: boolean; critical: boolean }> = {}) =>
  ({ iconKey, pct, tracked: true, critical: pct <= 0.15, ...over })

describe('healthSummary', () => {
  it('promedia solo los testigos encendidos', () => {
    const s = healthSummary([item('oil', 1), item('brakes', 0.5), item('tire', 1, { tracked: false }), item('battery', 0.9, { tracked: false })])
    expect(s.average).toBeCloseTo(0.75)
    expect(s.level).toBe('optimo')
  })

  it('sin testigos encendidos no hay datos', () => {
    expect(healthSummary([])).toMatchObject({ tracked: false, level: 'sin-datos' })
    expect(healthSummary([item('oil', 1, { tracked: false })]).level).toBe('sin-datos')
  })

  it('umbrales del promedio', () => {
    expect(healthSummary([item('filter', 0.6)]).level).toBe('optimo')
    expect(healthSummary([item('filter', 0.4)]).level).toBe('atencion')
    expect(healthSummary([item('filter', 0.2)]).level).toBe('critico')
  })

  it('un testigo crítico en rojo fuerza crítico aunque el promedio sea alto (el caso del aceite)', () => {
    const s = healthSummary([item('oil', 0), item('brakes', 1), item('tire', 1), item('temp', 1), item('filter', 1)])
    expect(s.average).toBeCloseTo(0.8)
    expect(s.level).toBe('critico')
  })

  it('cada uno de aceite, frenos, refrigeración y llantas fuerza crítico', () => {
    for (const k of ['oil', 'brakes', 'temp', 'tire']) {
      expect(healthSummary([item(k, 0.05), item('battery', 1), item('filter', 1)]).level).toBe('critico')
    }
  })

  it('un testigo rojo no crítico (filtros, batería…) fuerza al menos atención', () => {
    const s = healthSummary([item('filter', 0), item('oil', 1), item('brakes', 1), item('tire', 1), item('temp', 1)])
    expect(s.average).toBeGreaterThan(0.5)
    expect(s.level).toBe('atencion')
  })

  it('un testigo apagado en rojo no cuenta', () => {
    expect(healthSummary([item('oil', 0, { tracked: false }), item('brakes', 1)]).level).toBe('optimo')
  })
})

describe('fluids', () => {
  it('clasifica fluidos y partes por nombre, sin importar acentos', () => {
    for (const n of ['Aceite de motor', 'Refrigerante', 'Líquido de frenos', 'Liquido de frenos', 'aceite de transmisión']) expect(isFluidPart(n)).toBe(true)
    for (const n of ['Filtro de aire', 'Filtro de aceite', 'Pastillas de freno', 'Llantas', 'Batería', '']) expect(isFluidPart(n)).toBe(false)
  })

  it('latestFluids deja una fila por fluido, la más reciente, e ignora las partes', () => {
    const rows = [
      { name: 'Aceite de motor', mileage_installed: 2000 },
      { name: 'Aceite de motor', mileage_installed: 4000 },
      { name: 'Filtro de aire', mileage_installed: 2000 },
      { name: 'Refrigerante', mileage_installed: 2000 },
    ]
    const out = latestFluids(rows)
    expect(out.map(r => r.name)).toEqual(['Aceite de motor', 'Refrigerante'])
    expect(out[0].mileage_installed).toBe(4000)
  })
})


describe('viewForCategory', () => {
  it('solo fluidos (Motor = aceite) lleva a Servicios', () => {
    expect(viewForCategory(0, 1, 'partes')).toBe('servicios')
  })
  it('con piezas lleva a Partes, aunque también haya fluidos', () => {
    expect(viewForCategory(2, 0, 'servicios')).toBe('partes')
    expect(viewForCategory(2, 1, 'servicios')).toBe('partes')
  })
  it('categoría vacía no cambia la vista', () => {
    expect(viewForCategory(0, 0, 'servicios')).toBe('servicios')
    expect(viewForCategory(0, 0, 'partes')).toBe('partes')
    expect(viewForCategory(0, 0, 'todo')).toBe('todo')
  })
})
