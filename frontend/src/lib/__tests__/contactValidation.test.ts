import { describe, it, expect } from 'vitest'
import { checkContact } from '../contactValidation'

describe('checkContact', () => {
  it('vacio o solo espacios es empty (no invalid)', () => {
    expect(checkContact('')).toEqual({ status: 'empty' })
    expect(checkContact('   \t ')).toEqual({ status: 'empty' })
  })

  it('correo valido, con espacios alrededor', () => {
    expect(checkContact('  ana@ejemplo.co ')).toEqual({ status: 'valid', type: 'email' })
  })

  it('correos mal formados son invalidos', () => {
    for (const bad of ['ana@', '@ejemplo.co', 'ana@ejemplo', 'ana ejemplo@x.co', 'a@@b.co']) {
      expect(checkContact(bad).status).toBe('invalid')
    }
  })

  it('celular colombiano sin indicativo se valida contra CO', () => {
    expect(checkContact('3124033960')).toEqual({ status: 'valid', type: 'phone' })
    expect(checkContact('312 403 3960')).toEqual({ status: 'valid', type: 'phone' })
  })

  it('con indicativo propio se valida contra ese pais', () => {
    expect(checkContact('+57 312 403 3960')).toEqual({ status: 'valid', type: 'phone' })
    expect(checkContact('+14155552671')).toEqual({ status: 'valid', type: 'phone' })
  })

  it('numeros demasiado cortos o con letras son invalidos y no lanzan', () => {
    expect(checkContact('12345').status).toBe('invalid')
    expect(checkContact('abcdefghij').status).toBe('invalid')
    expect(checkContact('+').status).toBe('invalid')
    expect(checkContact('+999999999999999999999').status).toBe('invalid')
  })
})
