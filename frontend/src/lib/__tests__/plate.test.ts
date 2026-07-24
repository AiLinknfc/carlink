import { describe, it, expect } from 'vitest'
import { formatPlate, parsePlate } from '../plate'

describe('plate.ts', () => {
  describe('formatPlate', () => {
    it('formats Colombian car plate', () => {
      expect(formatPlate('ABC', '123')).toBe('ABC-123')
    })

    it('formats with type parameter', () => {
      expect(formatPlate('ABC', '123', 'car')).toBe('ABC-123')
    })
  })

  describe('parsePlate', () => {
    it('parses formatted plate', () => {
      const result = parsePlate('ABC-123')
      expect(result).not.toBeNull()
      expect(result!.letters).toBe('ABC')
      expect(result!.numbers).toBe('123')
    })

    it('parses unformatted plate', () => {
      const result = parsePlate('ABC123')
      expect(result).not.toBeNull()
      expect(result!.letters).toBe('ABC')
      expect(result!.numbers).toBe('123')
    })
  })
})
