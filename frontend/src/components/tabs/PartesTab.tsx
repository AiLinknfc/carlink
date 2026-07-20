'use client'

import { useState, useCallback, useMemo } from 'react'
import { useParts } from '@/lib/hooks'
import PartFormModal from '@/components/PartFormModal'
import type { Part } from '@/lib/types'

interface PartesTabProps {
  vehicleId?: string
}

const BRANDS = ['Todas', 'Frenos', 'Motor', 'Suspensión', 'Eléctrico', 'Filtros', 'Transmisión', 'Enfriamiento']

export default function PartesTab({ vehicleId }: PartesTabProps) {
  const { parts, loading, reload } = useParts(vehicleId)
  const [showForm, setShowForm] = useState(false)
  const [editPart, setEditPart] = useState<Part | null>(null)
  const [activeBrand, setActiveBrand] = useState('Todas')

  const onAdd = useCallback(() => { setEditPart(null); setShowForm(true) }, [])
  const onEdit = useCallback((p: Part) => { setEditPart(p); setShowForm(true) }, [])
  const onClose = useCallback(() => { setShowForm(false); setEditPart(null) }, [])
  const onSaved = useCallback(() => { reload() }, [reload])

  const statusColor = (s: string) => s === 'ok' ? '#22c55e' : s === 'worn' ? '#f59e0b' : s === 'critical' ? '#ef4444' : '#7c786e'
  const statusLabel = (s: string) => s === 'ok' ? 'Óptimo' : s === 'worn' ? 'Desgastada' : s === 'critical' ? 'Crítica' : 'Sin datos'

  const filteredParts = useMemo(() => {
    if (activeBrand === 'Todas') return parts
    return parts.filter(p => p.brand?.toLowerCase() === activeBrand.toLowerCase())
  }, [parts, activeBrand])

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
      <div style={{ marginBottom: 22, animation: 'textIn .5s .04s both' }}>
        <div style={{ fontSize: 12, letterSpacing: '.24em', textTransform: 'uppercase', fontWeight: 700, color: '#F5C518' }}>
          Predicciones inteligentes
        </div>
        <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: 'clamp(30px,3.8vw,46px)', letterSpacing: '.01em', margin: '8px 0 8px', textTransform: 'uppercase' }}>
          Control de partes
        </h1>
        <p style={{ color: '#b6b2a6', margin: 0, maxWidth: '62ch', fontSize: 14 }}>
          Estado de cada componente mecánico. Registra cambios, desgaste y vida útil de las piezas clave.
        </p>
      </div>

      {/* Botón agregar + Filtro de categorías */}
      <div style={{ marginBottom: 22, animation: 'textIn .5s .08s both' }}>
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

        {/* Menú de categorías */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          <span style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, alignSelf: 'center', marginRight: 4 }}>
            Categoría:
          </span>
          {BRANDS.map(brand => {
            const isActive = activeBrand === brand
            return (
              <button
                key={brand}
                onClick={() => setActiveBrand(brand)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: `1px solid ${isActive ? '#F5C518' : 'rgba(255,255,255,0.12)'}`,
                  background: isActive ? 'rgba(245,197,24,0.14)' : 'transparent',
                  color: isActive ? '#F5C518' : '#9a968a',
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
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                    e.currentTarget.style.color = '#9a968a'
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
        <div style={{ textAlign: 'center', padding: 40, color: '#7c786e', fontSize: 14, border: '1px dashed rgba(255,255,255,0.12)', borderRadius: 16 }}>
          {activeBrand === 'Todas' ? 'Sin partes registradas' : `Sin partes en categoría "${activeBrand}"`}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'textIn .5s .12s both' }}>
          {filteredParts.map((part) => (
            <div
              key={part.id}
              onClick={() => onEdit(part)}
              style={{
                display: 'grid',
                gridTemplateColumns: '200px minmax(0,1fr) 104px',
                gap: 18,
                alignItems: 'center',
                padding: '16px 20px',
                borderRadius: 16,
                background: '#141414',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                cursor: 'pointer',
                transition: 'border-color .18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,197,24,0.4)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}>
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
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#7c786e' }}>
                    {part.brand || 'Sin marca'} · {part.part_number || '—'}
                  </div>
                </div>
              </div>

              {/* Barra de progreso */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9a968a', marginBottom: 7, gap: 8 }}>
                  <span style={{ whiteSpace: 'nowrap' }}>
                    Instalado: <b style={{ color: '#d8d4c8', fontWeight: 600 }}>
                      {part.mileage_installed ? `${part.mileage_installed.toLocaleString()} km` : '—'}
                    </b>
                  </span>
                  <span style={{ whiteSpace: 'nowrap' }}>
                    Vida útil: <b style={{ color: '#d8d4c8', fontWeight: 600 }}>
                      {part.lifespan_mileage ? `${part.lifespan_mileage.toLocaleString()} km` : '—'}
                    </b>
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 6, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
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
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '6px 13px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  color: statusColor(part.status),
                  background: 'rgba(255,255,255,0.04)',
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
