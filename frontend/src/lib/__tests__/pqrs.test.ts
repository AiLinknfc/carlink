// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getPqrs, addPqrs, updatePqrsStatus, subscribePqrs } from '../pqrs'

const base = { kind: 'queja' as const, category: 'app', categoryLabel: 'App', message: 'No abre', transcript: [] }

beforeEach(() => { window.localStorage.clear() })

describe('pqrs', () => {
  it('addPqrs crea ticket PQ-NNNNN, estado nuevo y fecha ISO', () => {
    const e = addPqrs(base)
    expect(e.ticket).toMatch(/^PQ-\d{5}$/)
    expect(e.status).toBe('nuevo')
    expect(new Date(e.createdAt).toISOString()).toBe(e.createdAt)
    expect(e.id).toBeTruthy()
  })

  it('las entradas nuevas quedan primero y persisten', () => {
    const a = addPqrs({ ...base, message: 'A' })
    const b = addPqrs({ ...base, message: 'B' })
    expect(getPqrs().map(e => e.message)).toEqual(['B', 'A'])
    expect(a.id).not.toBe(b.id)
  })

  it('updatePqrsStatus cambia solo la entrada indicada', () => {
    const a = addPqrs({ ...base, message: 'A' })
    const b = addPqrs({ ...base, message: 'B' })
    updatePqrsStatus(a.id, 'resuelto')
    const list = getPqrs()
    expect(list.find(e => e.id === a.id)?.status).toBe('resuelto')
    expect(list.find(e => e.id === b.id)?.status).toBe('nuevo')
  })

  it('updatePqrsStatus con id inexistente no altera nada', () => {
    addPqrs(base)
    updatePqrsStatus('zzz', 'resuelto')
    expect(getPqrs()[0].status).toBe('nuevo')
  })

  it('JSON corrupto o no-arreglo en localStorage devuelve lista vacia', () => {
    window.localStorage.setItem('carlink_pqrs', '{no es json')
    expect(getPqrs()).toEqual([])
    window.localStorage.setItem('carlink_pqrs', '{"a":1}')
    expect(getPqrs()).toEqual([])
  })

  it('addPqrs sobre almacenamiento corrupto arranca de cero sin lanzar', () => {
    window.localStorage.setItem('carlink_pqrs', 'basura')
    expect(() => addPqrs(base)).not.toThrow()
    expect(getPqrs()).toHaveLength(1)
  })

  it('subscribePqrs avisa en la misma pestana, filtra el storage por clave y se puede cancelar', () => {
    const cb = vi.fn()
    const off = subscribePqrs(cb)
    addPqrs(base)
    expect(cb).toHaveBeenCalledTimes(1)
    window.dispatchEvent(new StorageEvent('storage', { key: 'otra_cosa' }))
    expect(cb).toHaveBeenCalledTimes(1)
    window.dispatchEvent(new StorageEvent('storage', { key: 'carlink_pqrs' }))
    expect(cb).toHaveBeenCalledTimes(2)
    off()
    addPqrs(base)
    expect(cb).toHaveBeenCalledTimes(2)
  })
})
