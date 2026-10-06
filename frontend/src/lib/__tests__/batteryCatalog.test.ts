import { describe, it, expect } from 'vitest'
import { batteryOptions, batteryOptionByKey, interpretVoltage, parseVoltage, batteryMonthsFromNotes } from '../batteryCatalog'
import { vehicleKindOf } from '../filterCatalog'

describe('vehicleKindOf (con pesados)', () => {
  it('moto, pesado o carro', () => {
    expect(vehicleKindOf('Moto', '')).toBe('moto')
    expect(vehicleKindOf('Camión', 'particular')).toBe('pesado')
    expect(vehicleKindOf('Bus', '')).toBe('pesado')
    expect(vehicleKindOf('Sedán', 'carga')).toBe('pesado')
    expect(vehicleKindOf('SUV', 'particular')).toBe('carro')
    expect(vehicleKindOf('Camioneta', 'particular')).toBe('carro')
    expect(vehicleKindOf('Furgoneta', 'particular')).toBe('carro') // una van liviana no es un vehículo pesado
    expect(vehicleKindOf('Pickup', 'particular')).toBe('carro')
  })
})

describe('batteryOptions', () => {
  it('carro: MF, convencional, AGM/EFB e híbrido/eléctrico, más "otra"', () => {
    expect(batteryOptions('carro').map(o => o.key)).toEqual(['car_mf', 'car_conv', 'car_agm', 'car_hybrid', 'other'])
  })
  it('moto: MF/AGM, convencional y litio', () => {
    expect(batteryOptions('moto').map(o => o.key)).toEqual(['moto_mfagm', 'moto_conv', 'moto_lithium', 'other'])
  })
  it('camión / bus: 12/24 V MF', () => {
    expect(batteryOptions('pesado').map(o => o.key)).toEqual(['heavy_mf', 'other'])
  })
  it('cada tipo tiene su propia vida útil', () => {
    expect(batteryOptionByKey('car_conv')!.months).toBe(24)
    expect(batteryOptionByKey('car_agm')!.months).toBe(48)
    expect(batteryOptionByKey('moto_lithium')!.months).toBe(60)
  })
})

describe('voltaje', () => {
  it('interpreta una batería de 12 V', () => {
    expect(interpretVoltage(12.8)).toBe('ok')
    expect(interpretVoltage(12.5)).toBe('aceptable')
    expect(interpretVoltage(12.2)).toBe('baja')
    expect(interpretVoltage(11.5)).toBe('descargada')
  })
  it('más de 18 V es un sistema de 24 V', () => {
    expect(interpretVoltage(25.4)).toBe('ok')
    expect(interpretVoltage(23)).toBe('descargada')
  })
  it('valores imposibles no son válidos', () => {
    for (const v of [0, 3, 40, NaN]) expect(interpretVoltage(v)).toBe('invalida')
  })
  it('parseVoltage acepta coma y la unidad', () => {
    expect(parseVoltage('12,6V')).toBeCloseTo(12.6)
    expect(parseVoltage('12.6 V')).toBeCloseTo(12.6)
    expect(parseVoltage('')).toBeNaN()
  })
})

describe('batteryMonthsFromNotes', () => {
  it('lee los meses guardados en la pieza o usa 24', () => {
    expect(batteryMonthsFromNotes('Vida útil: 48 meses · Tipo: AGM / EFB')).toBe(48)
    expect(batteryMonthsFromNotes('')).toBe(24)
    expect(batteryMonthsFromNotes(null)).toBe(24)
  })
})
