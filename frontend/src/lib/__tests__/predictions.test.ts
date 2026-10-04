import { describe, it, expect } from 'vitest'
import { predictPart } from '../predictions'

describe('predictPart', () => {
  it('parte reemplazada: todo en cero sin importar el km', () => {
    const p = predictPart({ status: 'replaced', mileage_installed: 1000, lifespan_mileage: 5000 }, 99999)
    expect(p).toMatchObject({ status: 'replaced', remaining_km: 0, life_pct: 0, mileage_next: 0, label: 'Reemplazado' })
  })

  it('parte nueva: ok con km restantes y proximo cambio', () => {
    const p = predictPart({ mileage_installed: 10000, lifespan_mileage: 10000 }, 12000)
    expect(p.status).toBe('ok')
    expect(p.life_pct).toBeCloseTo(20)
    expect(p.remaining_km).toBe(8000)
    expect(p.mileage_next).toBe(20000)
    expect(p.label).toBe('Bien')
  })

  it('umbrales: 70% es worn, 90% es critical, justo debajo no', () => {
    const at = (km: number) => predictPart({ mileage_installed: 0, lifespan_mileage: 100 }, km).status
    expect(at(69)).toBe('ok')
    expect(at(70)).toBe('worn')
    expect(at(89)).toBe('worn')
    expect(at(90)).toBe('critical')
  })

  it('pasado de vida util: porcentaje tope 100 y restante 0, nunca negativo', () => {
    const p = predictPart({ mileage_installed: 0, lifespan_mileage: 1000 }, 5000)
    expect(p.life_pct).toBe(100)
    expect(p.remaining_km).toBe(0)
    expect(p.status).toBe('critical')
    expect(p.label).toBe('Urgente')
  })

  it('km actual menor al de instalacion (dato inconsistente) no da porcentaje negativo', () => {
    const p = predictPart({ mileage_installed: 5000, lifespan_mileage: 1000 }, 4000)
    expect(p.life_pct).toBe(0)
    expect(p.remaining_km).toBe(1000)
  })

  it('null/undefined usan defaults: instalado en 0 y vida util 50000', () => {
    const p = predictPart({ mileage_installed: null, lifespan_mileage: null }, 25000)
    expect(p.life_pct).toBeCloseTo(50)
    expect(p.mileage_next).toBe(50000)
  })

  it('vida util 0 o negativa se trata como sin dato y usa el default de 50000', () => {
    for (const lifespan_mileage of [0, -100]) {
      const p = predictPart({ mileage_installed: 0, lifespan_mileage }, 25000)
      expect(p.life_pct).toBeCloseTo(50)
      expect(p.remaining_km).toBe(25000)
      expect(p.mileage_next).toBe(50000)
      expect(p.status).toBe('ok')
    }
  })

  it('el estado manual critical/worn gana sobre el calculado', () => {
    expect(predictPart({ mileage_installed: 0, lifespan_mileage: 100000, status: 'critical' }, 10).status).toBe('critical')
    expect(predictPart({ mileage_installed: 0, lifespan_mileage: 100000, status: 'worn' }, 10).status).toBe('worn')
  })

  // BUG conocido (docs/PENDIENTES.md, 2026-10-03): predictions.ts:29-30 deja que un status manual
  // 'worn' rebaje un 'critical' calculado (95% de vida util se muestra como "Proximo"). El estado
  // manual solo deberia poder subir la severidad, nunca bajarla. Decision de negocio pendiente;
  // cuando se arregle, este test pasa y vitest avisa para quitar el `.fails`.
  it.fails('un status manual worn no debe rebajar un critical calculado', () => {
    const p = predictPart({ mileage_installed: 0, lifespan_mileage: 100, status: 'worn' }, 95)
    expect(p.status).toBe('critical')
  })

  it('colores y etiquetas son consistentes con el estado', () => {
    const c = predictPart({ mileage_installed: 0, lifespan_mileage: 100 }, 95)
    expect(c.color).toBe('#ef4444')
    const w = predictPart({ mileage_installed: 0, lifespan_mileage: 100 }, 75)
    expect([w.label, w.color]).toEqual(['Próximo', '#f59e0b'])
  })
})
