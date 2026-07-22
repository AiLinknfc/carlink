'use client'

import { useState, useCallback, useMemo } from 'react'
import { useParts } from '@/lib/hooks'
import PartFormModal from '@/components/PartFormModal'
import { PART_CATEGORIES } from '@/lib/part-categories'
import { isBusinessAccount } from '@/lib/constants'
import type { Part } from '@/lib/types'

interface PartesTabProps {
  vehicleId?: string
  accountType?: string
}

const CATEGORY_FILTERS = ['Todas', ...PART_CATEGORIES]

export default function PartesTab({ vehicleId, accountType }: PartesTabProps) {
  const { parts, loading, reload } = useParts(vehicleId)
  const [showForm, setShowForm] = useState(false)
  const [editPart, setEditPart] = useState<Part | null>(null)
  const [activeCategory, setActiveCategory] = useState('Todas')

  const isWorkshop = isBusinessAccount(accountType)

  const onAdd = useCallback(() => { setEditPart(null); setShowForm(true) }, [])
  const onEdit = useCallback((p: Part) => { setEditPart(p); setShowForm(true) }, [])
  const onClose = useCallback(() => { setShowForm(false); setEditPart(null) }, [])
  const onSaved = useCallback(() => { reload() }, [reload])

  const statusColor = (s: string) => s === 'ok' ? '#22c55e' : s === 'worn' ? '#f59e0b' : s === 'critical' ? '#ef4444' : '#7c786e'
  const statusLabel = (s: string) => s === 'ok' ? 'Óptimo' : s === 'worn' ? 'Desgastada' : s === 'critical' ? 'Crítica' : 'Sin datos'

  const filteredParts = useMemo(() => {
    if (activeCategory === 'Todas') return parts
    /* Las partes creadas antes de que existiera la columna no traen categoría;
       caen en "Otros" para que ninguna quede fuera de todas las pestañas. */
    return parts.filter(p => (p.category || 'Otros') === activeCategory)
  }, [parts, activeCategory])

  const getLifePct = (p: Part) => {
    if (!p.mileage_installed || !p.lifespan_mileage) return '0%'
    const current = 0
    return `${Math.min(100, (current / p.lifespan_mileage) * 100)}%`
  }

  const getBarColor = (p: Part) => {
    if (p.status === 'critical') return '#ef4444'
    if (p.status === 'worn') return '#f59e0b'
    if (p.status === 'ok') return '#22c55e'
    return '#7c786e'
  }

  return (
    <div style={{ animation: 'sectionIn .55s cubic-bezier(0.22,1,0.36,1) both', maxWidth: 960 }}>
      {/* Header */}
      <div style={{ marginBottom: 16, animation: 'textIn .5s .04s both' }}>
        <div style={{ fontSize: 12, letterSpacing: '.24em', textTransform: 'uppercase', fontWeight: 700, color: '#F5C518' }}>
          Predicciones inteligentes
        </div>
        <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 'clamp(24px,2.6vw,32px)', fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.15, margin: '2px 0 4px' }}>
          Control de partes
        </h1>
        <p style={{ color: '#b6b2a6', margin: 0, maxWidth: '62ch', fontSize: 14 }}>
          Estado de cada componente mecánico. Registra cambios, desgaste y vida útil de las piezas clave.
        </p>
      </div>

      {/* Botón agregar + Filtro de categorías */}
      <div style={{ marginBottom: 16, animation: 'textIn .5s .08s both' }}>
        {isWorkshop && (
          <button onClick={onAdd}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '11px 18px', borderRadius: 12,
              border: 'none', background: '#F5C518', color: '#111',
              fontWeight: 800, fontSize: 13, cursor: 'pointer',
              transition: 'all .18s',
              boxShadow: '0 0 20px rgba(245,197,24,0.35)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FFD84D' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F5C518' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            Agregar parte
          </button>
        )}
        {!isWorkshop && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>
            El control de partes es gestionado por el taller mecánico.
          </div>
        )}

        {/* Menú de categorías */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          <span style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700, alignSelf: 'center', marginRight: 4 }}>
            Categoría:
          </span>
          {CATEGORY_FILTERS.map(brand => {
            const isActive = activeCategory === brand
            return (
              <button
                key={brand}
                onClick={() => setActiveCategory(brand)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: `1px solid ${isActive ? '#F5C518' : 'var(--border-2)'}`,
                  background: isActive ? 'rgba(245,197,24,0.14)' : 'transparent',
                  color: isActive ? '#F5C518' : 'var(--text-3)',
                  transition: 'all .2s',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = 'rgba(245,197,24,0.4)'
                    e.currentTarget.style.color = '#d8c98a'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = 'var(--border-2)'
                    e.currentTarget.style.color = 'var(--text-3)'
                  }
                }}>
                {brand}
              </button>
            )
          })}
        </div>
      </div>

      {/* Lista de partes */}
      {!loading && filteredParts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)', fontSize: 14, border: '1px dashed var(--border-2)', borderRadius: 16 }}>
          {activeCategory === 'Todas' ? 'Sin partes registradas' : `Sin partes en categoría "${activeCategory}"`}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'textIn .5s .12s both' }}>
          {filteredParts.map((part) => (
            <div
              key={part.id}
              className="parte-row"
              onClick={() => isWorkshop ? onEdit(part) : undefined}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(140px,200px) minmax(0,1fr) 104px',
                gap: 16,
                alignItems: 'center',
                padding: '16px 20px',
                borderRadius: 16,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-1)',
                cursor: isWorkshop ? 'pointer' : 'default',
                transition: 'border-color .18s',
              }}
              onMouseEnter={e => { if (isWorkshop) e.currentTarget.style.borderColor = 'rgba(245,197,24,0.4)' }}
              onMouseLeave={e => { if (isWorkshop) e.currentTarget.style.borderColor = 'var(--border)' }}>
              {/* Nombre + indicador */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <span style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  flex: '0 0 auto',
                  background: getBarColor(part),
                  boxShadow: `0 0 10px ${getBarColor(part)}`,
                }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {part.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    {part.brand || 'Sin marca'} · {part.part_number || '—'}
                  </div>
                </div>
              </div>

              {/* Barra de progreso */}
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-3)', marginBottom: 7, columnGap: 12, rowGap: 2 }}>
                  <span style={{ whiteSpace: 'nowrap' }}>
                    Instalado: <b style={{ color: 'var(--text-1)', fontWeight: 600 }}>
                      {part.mileage_installed ? `${part.mileage_installed.toLocaleString()} km` : '—'}
                    </b>
                  </span>
                  <span style={{ whiteSpace: 'nowrap' }}>
                    Vida útil: <b style={{ color: 'var(--text-1)', fontWeight: 600 }}>
                      {part.lifespan_mileage ? `${part.lifespan_mileage.toLocaleString()} km` : '—'}
                    </b>
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 6, background: 'var(--surface-2)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: getLifePct(part),
                    background: getBarColor(part),
                    borderRadius: 6,
                    transition: 'width .6s',
                    boxShadow: `0 0 8px ${getBarColor(part)}`,
                  }} />
                </div>
              </div>

              {/* Estado */}
              <div style={{ textAlign: 'right', minWidth: 0 }}>
                <span style={{
                  display: 'inline-block',
                  padding: '6px 13px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  color: statusColor(part.status),
                  background: 'var(--surface-2)',
                  border: `1px solid ${statusColor(part.status)}`,
                }}>
                  {statusLabel(part.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && vehicleId && (
        <PartFormModal vehicleId={vehicleId} editPart={editPart} onClose={onClose} onSaved={() => { onSaved(); onClose() }} />
      )}
    </div>
  )
}
