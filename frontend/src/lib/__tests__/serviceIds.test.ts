import { describe, it, expect } from 'vitest'
import { canonicalServiceId, sameService } from '../serviceIds'

describe('serviceIds', () => {
  it('lleva las grafías sin tilde de Inicio al id canónico del formulario', () => {
    expect(canonicalServiceId('Bateria')).toBe('Batería')
    expect(canonicalServiceId('Suspension')).toBe('Suspensión')
    expect(canonicalServiceId('Transmision')).toBe('Transmisión')
  })
  it('deja igual los ids que ya son canónicos y los demás', () => {
    for (const id of ['Batería', 'Suspensión', 'Transmisión', 'Aceite', 'Aire', 'Frenos', 'Otro']) expect(canonicalServiceId(id)).toBe(id)
    expect(canonicalServiceId(undefined)).toBe('')
    expect(canonicalServiceId('')).toBe('')
  })
  it('sameService compara sin importar la tilde', () => {
    expect(sameService('Bateria', 'Batería')).toBe(true)
    expect(sameService('Transmision', 'Transmisión')).toBe(true)
    expect(sameService('Aceite', 'Frenos')).toBe(false)
  })
})
