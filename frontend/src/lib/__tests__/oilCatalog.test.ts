import { describe, it, expect } from 'vitest'
import { OIL_CATALOG, getOilBrands, getOilProductsByBrand } from '../oilCatalog'

describe('getOilBrands', () => {
  it('devuelve marcas unicas en orden de aparicion', () => {
    const brands = getOilBrands().map(b => b.marca)
    expect(new Set(brands).size).toBe(brands.length)
    expect(brands[0]).toBe(OIL_CATALOG[0].marca)
    expect(brands).toContain('Liqui Moly')
  })

  it('conserva el logo de la marca y undefined si no tiene', () => {
    const brands = getOilBrands()
    expect(brands.find(b => b.marca === 'Shell')?.logo).toBe('shell.png')
    expect(brands.find(b => b.marca === 'Petronas')?.logo).toBeUndefined()
  })

  it('cubre todas las marcas del catalogo', () => {
    expect(getOilBrands().length).toBe(new Set(OIL_CATALOG.map(i => i.marca)).size)
  })
})

describe('getOilProductsByBrand', () => {
  it('ignora mayusculas y espacios', () => {
    expect(getOilProductsByBrand('  sHeLL ').length).toBe(3)
  })

  it('vacio o marca inexistente devuelve lista vacia', () => {
    expect(getOilProductsByBrand('')).toEqual([])
    expect(getOilProductsByBrand('   ')).toEqual([])
    expect(getOilProductsByBrand('Marca Fantasma')).toEqual([])
  })

  it('match exacto de marca, no parcial', () => {
    expect(getOilProductsByBrand('Mob')).toEqual([])
    expect(getOilProductsByBrand('Total')).toEqual([])
  })

  it('marca con espacio interno funciona', () => {
    expect(getOilProductsByBrand('liqui moly')).toHaveLength(2)
  })
})

describe('integridad del catalogo', () => {
  it('cada producto trae viscosidad con formato SAE y esta contenida en el nombre cuando aplica', () => {
    for (const item of OIL_CATALOG) {
      expect(item.viscosidad).toMatch(/^\d{1,2}W-\d{2}$/)
      expect(item.marca.trim()).not.toBe('')
      expect(item.producto.trim()).not.toBe('')
    }
  })

  it('no hay productos duplicados dentro de una marca', () => {
    const keys = OIL_CATALOG.map(i => `${i.marca}|${i.producto}`)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
