'use client'

import { useState, useCallback, useMemo } from 'react'
import { useParts, useCurrentMileage } from '@/lib/hooks'
import { partLife, PART_LIFE_COLOR, PART_LIFE_LABEL } from '@/lib/partLife'
import { isFluidPart, latestFluids, viewForCategory, type PartesView } from '@/lib/fluids'
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
  // Sin el kilometraje actual la barra de vida útil no tiene contra qué avanzar.
  const currentKm = useCurrentMileage(vehicleId)
  const [showForm, setShowForm] = useState(false)
  const [editPart, setEditPart] = useState<Part | null>(null)
  const [activeCategory, setActiveCategory] = useState('Todas')
  /* Dos vistas: Partes (piezas físicas) y Control de servicios (fluidos: aceite, refrigerante, líquido de
     frenos, aceite de transmisión — lib/fluids.ts). */
  const [view, setView] = useState<PartesView>('todo')
  const isServices = view === 'servicios'
  const isAll = view === 'todo'

  const isWorkshop = isBusinessAccount(accountType)

  const onAdd = useCallback(() => { setEditPart(null); setShowForm(true) }, [])
  const onEdit = useCallback((p: Part) => { setEditPart(p); setShowForm(true) }, [])
  const onClose = useCallback(() => { setShowForm(false); setEditPart(null) }, [])
  const onSaved = useCallback(() => { reload() }, [reload])

  /* Estado derivado del desgaste real (km actual - km de instalación) sobre la vida útil. Antes la
     barra tenía el avance fijo en 0 y el estado salía de una columna guardada que nunca se
     recalculaba, así que nada avanzaba al subir el kilometraje. Sin kilometraje o sin vida útil se
     cae al estado guardado. */
  const lifeOf = (p: Part) => partLife(p.mileage_installed, p.lifespan_mileage, currentKm)
  const storedState = (s: string) => s === 'ok' ? 'ok' : s === 'worn' ? 'worn' : s === 'critical' ? 'critical' : 'unknown'
  const stateOf = (p: Part) => { const l = lifeOf(p); return l.state === 'unknown' ? storedState(p.status) : l.state }
  const statusColor = (p: Part) => PART_LIFE_COLOR[stateOf(p)]
  const statusLabel = (p: Part) => PART_LIFE_LABEL[stateOf(p)]

  /* La categoría manda: aplica a las dos vistas (el aceite es "Motor", el refrigerante "Enfriamiento",
     el líquido de frenos "Frenos"). Las filas creadas antes de que existiera la columna no traen
     categoría; caen en "Otros" para que ninguna quede fuera de todas las pestañas. */
  const catOf = (p: Part) => p.category || 'Otros'
  const fluidRows = useMemo(() => latestFluids(parts), [parts])
  const partRows = useMemo(() => parts.filter(p => !isFluidPart(p.name)), [parts])
  /* Por defecto ("Todas") se ven juntas las partes y los servicios. */
  const baseParts = isAll ? [...partRows, ...fluidRows] : isServices ? fluidRows : partRows
  const filteredParts = useMemo(
    () => (activeCategory === 'Todas' ? baseParts : baseParts.filter(p => (p.category || 'Otros') === activeCategory)),
    [baseParts, activeCategory],
  )

  /* Elegir una categoría lleva a la pantalla donde está lo suyo: si solo tiene fluidos (Motor = aceite)
     pasa a Servicios; si tiene piezas, a Partes. Con "Todas" o sin datos no cambia la vista. */
  const chooseCategory = (cat: string) => {
    setActiveCategory(cat)
    if (cat === 'Todas') { setView('todo'); return }
    const nParts = partRows.filter(p => catOf(p) === cat).length
    const nFluids = fluidRows.filter(p => catOf(p) === cat).length
    setView(viewForCategory(nParts, nFluids, view))
  }

  const getLifePct = (p: Part) => `${Math.round(lifeOf(p).usedFraction * 100)}%`
  const getBarColor = (p: Part) => statusColor(p)

  return (
    <div style={{ animation: 'sectionIn .55s cubic-bezier(0.22,1,0.36,1) both', maxWidth: 960 }}>
      {/* Header */}
      <div style={{ marginBottom: 16, animation: 'textIn .5s .04s both' }}>
        <div style={{ fontSize: 12, letterSpacing: '.24em', textTransform: 'uppercase', fontWeight: 700, color: '#F5C518' }}>
          Predicciones inteligentes
        </div>
        <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 'clamp(24px,2.6vw,32px)', fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.15, margin: '2px 0 4px' }}>
          {isAll ? 'Control de partes y servicios' : isServices ? 'Control de servicios' : 'Control de partes'}
        </h1>
        <p style={{ color: '#b6b2a6', margin: 0, maxWidth: '62ch', fontSize: 14 }}>
          {isAll
            ? 'Piezas físicas y fluidos del vehículo, juntos: desgaste, vida útil y próximo cambio de cada uno.'
            : isServices
              ? 'Fluidos que se renuevan por kilometraje: aceite, refrigerante, líquido de frenos y aceite de transmisión.'
              : 'Estado de cada pieza física del vehículo. Registra cambios, desgaste y vida útil de las piezas clave.'}
        </p>
      </div>

      {/* Vista: partes o servicios y fluidos */}
      <div role="tablist" aria-label="Vista" style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {([['todo', 'Todo'], ['partes', 'Partes'], ['servicios', 'Servicios']] as const).map(([key, label]) => {
          const on = view === key
          return (
            <button key={key} type="button" role="tab" aria-selected={on} onClick={() => setView(key)} style={{
              padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all .2s',
              border: `1px solid ${on ? '#F5C518' : 'var(--border-2)'}`,
              background: on ? 'rgba(245,197,24,0.14)' : 'transparent', color: on ? '#F5C518' : 'var(--text-3)',
            }}>{label}</button>
          )
        })}
      </div>

      {/* Botón agregar + Filtro de categorías */}
      <div style={{ marginBottom: 16, animation: 'textIn .5s .08s both' }}>
        {isWorkshop && !isServices && (
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
        {!isWorkshop && !isServices && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>
            El control de partes es gestionado por el taller mecánico.
          </div>
        )}

        {/* Menú de categorías: manda sobre la vista (ver chooseCategory) */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          <span style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700, alignSelf: 'center', marginRight: 4 }}>
            Categoría:
          </span>
          {CATEGORY_FILTERS.map(brand => {
            const isActive = activeCategory === brand
            return (
              <button
                key={brand}
                onClick={() => chooseCategory(brand)}
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
          {isAll ? (activeCategory === 'Todas' ? 'Aún no hay partes ni servicios registrados' : `Nada registrado en categoría "${activeCategory}"`)
            : isServices ? (activeCategory === 'Todas' ? 'Aún no hay servicios registrados. Registra un cambio de aceite o de refrigerante para empezar a controlarlos.' : `Sin servicios en categoría "${activeCategory}"`)
            : activeCategory === 'Todas' ? 'Sin partes registradas' : `Sin partes en categoría "${activeCategory}"`}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'textIn .5s .12s both' }}>
          {filteredParts.map((part) => (
            <div
              key={part.id}
              className="parte-row"
              onClick={() => isWorkshop && !isFluidPart(part.name) ? onEdit(part) : undefined}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(140px,200px) minmax(0,1fr) 104px',
                gap: 16,
                alignItems: 'center',
                padding: '16px 20px',
                borderRadius: 16,
                // Mismo amarillo plano de marca (#F5C518) que los botones primarios y las tarjetas
                // del historial de mantenimiento — texto negro, sin otra opcion de contraste.
                background: '#F5C518',
                border: '1px solid rgba(17,17,17,0.15)',
                color: '#111',
                cursor: isWorkshop && !isFluidPart(part.name) ? 'pointer' : 'default',
                transition: 'border-color .18s',
              }}
              onMouseEnter={e => { if (isWorkshop && !isFluidPart(part.name)) e.currentTarget.style.borderColor = 'rgba(17,17,17,0.4)' }}
              onMouseLeave={e => { if (isWorkshop && !isFluidPart(part.name)) e.currentTarget.style.borderColor = 'rgba(17,17,17,0.15)' }}>
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
                  <div style={{ fontSize: 11, color: 'rgba(17,17,17,0.65)' }}>
                    {isFluidPart(part.name) ? 'Servicio · fluido' : `${part.brand || 'Sin marca'} · ${part.part_number || '—'}`}
                  </div>
                </div>
              </div>

              {/* Barra de progreso */}
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', fontSize: 12, color: 'rgba(17,17,17,0.65)', marginBottom: 7, columnGap: 12, rowGap: 2 }}>
                  <span style={{ whiteSpace: 'nowrap' }}>
                    {isFluidPart(part.name) ? 'Último cambio' : 'Instalado'}: <b style={{ color: '#111', fontWeight: 600 }}>
                      {part.mileage_installed ? `${part.mileage_installed.toLocaleString()} km` : '—'}
                    </b>
                  </span>
                  <span style={{ whiteSpace: 'nowrap' }}>
                    Vida útil: <b style={{ color: '#111', fontWeight: 600 }}>
                      {part.lifespan_mileage ? `${part.lifespan_mileage.toLocaleString()} km` : '—'}
                    </b>
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 6, background: 'rgba(17,17,17,0.15)', overflow: 'hidden' }}>
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
                  color: statusColor(part),
                  background: 'rgba(17,17,17,0.08)',
                  border: `1px solid ${statusColor(part)}`,
                }}>
                  {statusLabel(part)}
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
