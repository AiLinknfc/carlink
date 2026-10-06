import { describe, it, expect } from 'vitest'
import { cardDataFromScan, mergeCardData } from '../vehicleCard'

describe('vehicleCard', () => {
  it('extrae solo los campos de card_data con valor y mapea el documento del propietario', () => {
    const scan = { vin: ' 3MZ ', document_number: '79.123.456', engine_number: null, doors: '', cilindraje: 2000, brand: 'Mazda' }
    expect(cardDataFromScan(scan)).toEqual({ vin: '3MZ', owner_document: '79.123.456', cilindraje: '2000' })
    expect(cardDataFromScan(null)).toEqual({})
  })

  it('mergeCardData no pisa lo que ya estaba', () => {
    expect(mergeCardData({ vin: 'USER', doors: '' }, { vin: 'OCR', doors: '4', cilindraje: '1600' }))
      .toEqual({ vin: 'USER', doors: '4', cilindraje: '1600' })
  })
})
