import { describe, it, expect } from 'vitest'
import { formatPlate, parsePlate, validatePlate, normalizePlate, getPlateConfig } from '../plate'

describe('plate.ts', () => {
  describe('formatPlate', () => {
    it('formats particular plate', () => {
      expect(formatPlate('ABC', '123', 'particular')).toBe('ABC-123')
    })

    it('formats moto plate', () => {
      expect(formatPlate('ABC', '12D', 'moto')).toBe('ABC-12D')
    })

    it('formats publico plate', () => {
      expect(formatPlate('ABC', '123', 'publico')).toBe('ABC-123')
    })

    it('formats diplomatica plate', () => {
      expect(formatPlate('AB', '1234', 'diplomatica')).toBe('AB-1234')
    })

    it('formats carga plate', () => {
      expect(formatPlate('T', '1234', 'carga')).toBe('T-1234')
    })

    it('formats remolque plate', () => {
      expect(formatPlate('R', '12345', 'remolque')).toBe('R-12345')
    })

    it('formats clasico plate', () => {
      expect(formatPlate('ABC', '123', 'clasico')).toBe('ABC-123')
    })

    it('truncates extra characters', () => {
      expect(formatPlate('ABCD', '1234', 'particular')).toBe('ABC-123')
    })
  })

  describe('parsePlate', () => {
    it('parses particular plate with dash', () => {
      const result = parsePlate('ABC-123')
      expect(result).not.toBeNull()
      expect(result!.letters).toBe('ABC')
      expect(result!.numbers).toBe('123')
      expect(result!.type).toBe('particular')
    })

    it('parses particular plate without dash', () => {
      const result = parsePlate('ABC123')
      expect(result).not.toBeNull()
      expect(result!.letters).toBe('ABC')
      expect(result!.numbers).toBe('123')
      expect(result!.type).toBe('particular')
    })

    it('parses moto plate', () => {
      const result = parsePlate('ABC-12D')
      expect(result).not.toBeNull()
      expect(result!.letters).toBe('ABC')
      expect(result!.numbers).toBe('12D')
      expect(result!.type).toBe('moto')
    })

    it('parses diplomatica plate', () => {
      const result = parsePlate('CD-1234')
      expect(result).not.toBeNull()
      expect(result!.letters).toBe('CD')
      expect(result!.numbers).toBe('1234')
      expect(result!.type).toBe('diplomatica')
    })

    it('parses carga plate', () => {
      const result = parsePlate('T-1234')
      expect(result).not.toBeNull()
      expect(result!.letters).toBe('T')
      expect(result!.numbers).toBe('1234')
      expect(result!.type).toBe('carga')
    })

    it('parses remolque plate', () => {
      const result = parsePlate('R-12345')
      expect(result).not.toBeNull()
      expect(result!.letters).toBe('R')
      expect(result!.numbers).toBe('12345')
      expect(result!.type).toBe('remolque')
    })

    it('parses semirremolque plate', () => {
      const result = parsePlate('S-12345')
      expect(result).not.toBeNull()
      expect(result!.letters).toBe('S')
      expect(result!.numbers).toBe('12345')
      expect(result!.type).toBe('remolque')
    })

    it('returns null for invalid plate', () => {
      expect(parsePlate('12345')).toBeNull()
      expect(parsePlate('ABCDE')).toBeNull()
      expect(parsePlate('ABC-12')).toBeNull()
    })
  })

  describe('validatePlate', () => {
    it('validates particular plate', () => {
      expect(validatePlate('ABC-123', 'particular')).toBe(true)
      expect(validatePlate('abc-123', 'particular')).toBe(true)
      expect(validatePlate('AB-1234', 'particular')).toBe(false)
    })

    it('validates moto plate', () => {
      expect(validatePlate('ABC-12D', 'moto')).toBe(true)
      expect(validatePlate('ABC-123', 'moto')).toBe(false)
    })

    it('validates diplomatica plate', () => {
      expect(validatePlate('AB-1234', 'diplomatica')).toBe(true)
      expect(validatePlate('ABC-123', 'diplomatica')).toBe(false)
    })

    it('validates carga plate', () => {
      expect(validatePlate('T-1234', 'carga')).toBe(true)
      expect(validatePlate('ABC-123', 'carga')).toBe(false)
    })

    it('validates remolque plate', () => {
      expect(validatePlate('R-12345', 'remolque')).toBe(true)
      expect(validatePlate('S-12345', 'remolque')).toBe(true)
      expect(validatePlate('A-12345', 'remolque')).toBe(false)
    })
  })

  describe('normalizePlate', () => {
    it('normalizes plate with dash', () => {
      expect(normalizePlate('ABC-123')).toBe('ABC-123')
    })

    it('normalizes plate without dash', () => {
      expect(normalizePlate('ABC123')).toBe('ABC-123')
    })

    it('normalizes remolque plate', () => {
      expect(normalizePlate('R12345')).toBe('R-12345')
    })

    it('normalizes carga plate', () => {
      expect(normalizePlate('T1234')).toBe('T-1234')
    })

    it('normalizes diplomatica plate', () => {
      expect(normalizePlate('AB1234')).toBe('AB-1234')
    })

    it('normalizes moto plate', () => {
      expect(normalizePlate('ABC12D')).toBe('ABC-12D')
    })

    it('returns empty for empty input', () => {
      expect(normalizePlate('')).toBe('')
    })
  })

  describe('getPlateConfig', () => {
    it('returns correct config for each type', () => {
      expect(getPlateConfig('particular')).toEqual({ letterLen: 3, numLen: 3, placeholder: 'ABC-123' })
      expect(getPlateConfig('moto')).toEqual({ letterLen: 3, numLen: 3, placeholder: 'ABC-12D', moto: true })
      expect(getPlateConfig('diplomatica')).toEqual({ letterLen: 2, numLen: 4, placeholder: 'AB-1234' })
      expect(getPlateConfig('carga')).toEqual({ letterLen: 1, numLen: 4, placeholder: 'T-1234' })
      expect(getPlateConfig('remolque')).toEqual({ letterLen: 1, numLen: 5, placeholder: 'R-12345' })
    })
  })
})
