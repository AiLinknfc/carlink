import { describe, expect, it } from 'vitest'
import {
  specialtiesMode, canonicalCity, checkNit, cityKey, emailSuggestion, formatPhone, fromScan, mergeCoverage, normalizeInstagram,
  normalizeWebsite, toggleToken, validEmail, validNit, validPhone,
} from '../tallerForm'

describe('NIT', () => {
  it('valida el dígito de verificación', () => {
    expect(validNit('900123456-8')).toBe(true)
    expect(validNit('900.123.456-8')).toBe(true)
    expect(validNit('900123456-7')).toBe(false)
  })
  it('sugiere el dígito cuando falta o está mal', () => {
    expect(checkNit('900123456')).toEqual({ status: 'missing_dv', value: '900123456', suggestion: '900123456-8' })
    expect(checkNit('900123456-1')).toMatchObject({ status: 'bad_dv', suggestion: '900123456-8' })
  })
  it('reconoce 9 + 1 dígitos pegados sin guion', () => {
    expect(checkNit('9001234568')).toEqual({ status: 'ok', value: '900123456-8' })
  })
  it('rechaza basura', () => {
    expect(checkNit('abc').status).toBe('invalid')
    expect(checkNit('12').status).toBe('invalid')
  })
})

describe('contacto', () => {
  it('teléfonos colombianos', () => {
    expect(validPhone('300 123 4567')).toBe(true)
    expect(validPhone('+57 300 123 4567')).toBe(true)
    expect(validPhone('(607) 651 2345')).toBe(true)
    expect(formatPhone('6076512345')).toBe('(607) 651 2345')
    expect(validPhone('6076512345')).toBe(true)
    expect(validPhone('12345')).toBe(false)
    expect(formatPhone('+573001234567')).toBe('300 123 4567')
  })
  it('correo y errores de tipeo', () => {
    expect(validEmail('a@b.co')).toBe(true)
    expect(validEmail('a@b')).toBe(false)
    expect(validEmail('a b@c.com')).toBe(false)
    expect(emailSuggestion('juan@gmial.com')).toBe('juan@gmail.com')
    expect(emailSuggestion('juan@gmail.com')).toBeNull()
  })
  it('web e instagram', () => {
    expect(normalizeWebsite('mitaller.com')).toBe('https://mitaller.com')
    expect(normalizeWebsite('no es web')).toBeNull()
    expect(normalizeWebsite('')).toBe('')
    expect(normalizeInstagram('https://www.instagram.com/mitaller/')).toBe('@mitaller')
    expect(normalizeInstagram('mi taller')).toBeNull()
  })
})

describe('ciudad y chips', () => {
  it('agrupa variantes de una ciudad', () => {
    expect(cityKey('Bogotá D.C.')).toBe(cityKey('bogota'))
    expect(canonicalCity('bogota')).toBe('Bogotá D.C.')
    expect(canonicalCity('Villa Rara')).toBe('Villa Rara')
  })
  it('toggleToken agrega y quita', () => {
    expect(toggleToken('', 'Frenos')).toBe('Frenos')
    expect(toggleToken('Frenos, Motor', 'frenos')).toBe('Motor')
  })
})

describe('lectura de Cámara de Comercio', () => {
  it('mapea y descarta lo inválido', () => {
    const r = fromScan({ legal_name: 'INVERSIONES PEREZ S.A.S.', nit: '900123456', city: 'duitama', phone: '3114567890', email: 'mal', business_type: 'xx' })
    expect(r).toEqual({ legal_name: 'INVERSIONES PEREZ S.A.S.', nit: '900123456-8', city: 'Duitama', phone: '311 456 7890' })
    expect(fromScan({ business_type: 'mecanica_general' })).toEqual({ business_kind: 'taller', business_type: 'mecanica_general' })
    expect(fromScan({ business_type: 'repuestos' })).toEqual({ business_kind: 'repuestos' })
  })
})

describe('mergeCoverage', () => {
  const base = [{ city: 'Duitama', count: 1 }, { city: 'Bogotá D.C.', count: 4 }]
  it('suma a la ciudad existente y agrega las nuevas', () => {
    const r = mergeCoverage(base, [
      { city: 'duitama', key: 'duitama', lat: 5.8, lng: -73, name: null },
      { city: 'Sogamoso', key: 'sogamoso', lat: null, lng: null, name: null },
    ])
    expect(r.coverage).toEqual([{ city: 'Duitama', count: 2 }, { city: 'Bogotá D.C.', count: 4 }, { city: 'Sogamoso', count: 1 }])
    expect(r.liveCount).toBe(2)
    expect(r.newCities).toBe(1)
    expect(base[0].count).toBe(1) // no muta la base
  })
})

describe('tipo de organización', () => {
  it('solo talleres y concesionarios piden especialidades/marcas', () => {
    expect(specialtiesMode('taller')).toBe('taller')
    expect(specialtiesMode('concesionario')).toBe('brands')
    expect(specialtiesMode('cda')).toBeNull()
    expect(specialtiesMode('compraventa')).toBeNull()
    expect(specialtiesMode('repuestos')).toBeNull()
    expect(specialtiesMode('')).toBeNull()
  })
})
