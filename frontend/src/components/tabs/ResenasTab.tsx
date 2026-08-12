'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useMyReviews } from '@/lib/hooks'
import StarRatingInput from '@/components/StarRatingInput'
import { RatingStars } from '@/lib/icons_new'
import type { ReviewTargetType } from '@/lib/types'

interface WorkshopHit { id: string; code: string; name: string; city: string; address: string; is_verified: boolean }

const CARDS: { targetType: ReviewTargetType; title: string; hint: string }[] = [
  { targetType: 'platform', title: 'La plataforma CarLink', hint: '¿Qué tal tu experiencia usando la app?' },
  { targetType: 'product', title: 'El llavero NFC / producto', hint: 'Calidad física, activación, uso del llavero.' },
  { targetType: 'workshop', title: 'El taller que te atendió', hint: 'Busca el taller y califica el servicio recibido.' },
]

function ReviewCard({
  targetType, title, hint, existing, onSubmit,
}: {
  targetType: ReviewTargetType
  title: string
  hint: string
  existing?: { rating: number; comment: string; workshop_id: string | null }
  onSubmit: (rating: number, comment: string, workshopId?: string) => Promise<unknown>
}) {
  const [editing, setEditing] = useState(!existing)
  const [rating, setRating] = useState(existing?.rating || 0)
  const [comment, setComment] = useState(existing?.comment || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [workshop, setWorkshop] = useState('')
  const [workshopId, setWorkshopId] = useState(existing?.workshop_id || '')
  const [wsResults, setWsResults] = useState<WorkshopHit[]>([])
  const [showWsDropdown, setShowWsDropdown] = useState(false)
  const wsRef = useRef<HTMLDivElement>(null)
  const wsTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (existing) { setRating(existing.rating); setComment(existing.comment) }
  }, [existing])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wsRef.current && !wsRef.current.contains(e.target as Node)) setShowWsDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const searchWorkshops = useCallback(async (q: string) => {
    if (q.length < 2) { setWsResults([]); setShowWsDropdown(false); return }
    try {
      const res = await fetch(`/api/workshops/search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setWsResults(data)
        setShowWsDropdown(data.length > 0)
      }
    } catch { /* silencioso, igual que el resto de buscadores de taller de la app */ }
  }, [])

  const handleWsInput = (val: string) => {
    setWorkshop(val)
    setWorkshopId('')
    clearTimeout(wsTimeout.current)
    wsTimeout.current = setTimeout(() => searchWorkshops(val), 250)
  }

  const selectWorkshop = (ws: WorkshopHit) => {
    setWorkshop(ws.name)
    setWorkshopId(ws.id)
    setShowWsDropdown(false)
    setWsResults([])
  }

  const canSave = rating > 0 && (targetType !== 'workshop' || !!workshopId)

  const save = async () => {
    if (!canSave) { setError(targetType === 'workshop' ? 'Elegí un taller de la lista.' : 'Elegí una calificación.'); return }
    setSaving(true)
    setError('')
    const result = await onSubmit(rating, comment, targetType === 'workshop' ? workshopId : undefined)
    setSaving(false)
    if (!result) { setError('No se pudo guardar. Intenta de nuevo.'); return }
    setEditing(false)
  }

  return (
    <div style={{
      border: '1px solid var(--border-2)', borderRadius: 16, padding: 20,
      background: 'rgba(255,255,255,0.02)', animation: 'sectionIn .4s both',
    }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{title}</div>
      <p style={{ color: 'var(--text-2)', fontSize: 13, margin: '0 0 14px' }}>{hint}</p>

      {!editing && existing ? (
        <div>
          <RatingStars rating={existing.rating} size={17} />
          {existing.comment && <p style={{ color: 'var(--text-2)', fontSize: 13, margin: '8px 0 0', lineHeight: 1.5 }}>{existing.comment}</p>}
          <button onClick={() => setEditing(true)} style={{
            marginTop: 12, background: 'none', border: 'none', color: '#F5C518', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0,
          }}>Editar calificación</button>
        </div>
      ) : (
        <div>
          {targetType === 'workshop' && (
            <div ref={wsRef} style={{ position: 'relative', marginBottom: 12 }}>
              <input type="text" value={workshop} onChange={e => handleWsInput(e.target.value)}
                onFocus={() => { if (wsResults.length > 0) setShowWsDropdown(true) }}
                placeholder="Nombre o código del taller (ej. TLR-XXXXX)"
                style={{
                  width: '100%', padding: '11px 13px', borderRadius: 10,
                  border: workshopId ? '1px solid rgba(46,204,113,0.5)' : '1px solid var(--border-2)',
                  background: 'rgba(255,255,255,0.04)', color: 'var(--text-1)', fontSize: 14, outline: 'none',
                }} />
              {showWsDropdown && wsResults.length > 0 && (
                <div style={{
                  position: 'absolute', zIndex: 20, top: '100%', left: 0, right: 0, marginTop: 4,
                  background: '#1a1a1e', border: '1px solid rgba(245,197,24,0.2)', borderRadius: 10,
                  maxHeight: 200, overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,.6)',
                }}>
                  {wsResults.map(ws => (
                    <button key={ws.id} onClick={() => selectWorkshop(ws)} style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 13px',
                      background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)',
                      color: '#f5f3ec', fontSize: 13, cursor: 'pointer', textAlign: 'left',
                    }}>
                      <span style={{ fontSize: 11, color: '#F5C518', fontWeight: 700 }}>{ws.code}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{ws.name}</div>
                        <div style={{ fontSize: 11, color: '#7c786e' }}>{ws.city}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <StarRatingInput value={rating} onChange={setRating} />

          <textarea value={comment} onChange={e => setComment(e.target.value)}
            placeholder="Contanos tu experiencia (opcional)" rows={3}
            style={{
              width: '100%', marginTop: 12, padding: '11px 13px', borderRadius: 10,
              border: '1px solid var(--border-2)', background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-1)', fontSize: 13.5, outline: 'none', resize: 'vertical', fontFamily: 'inherit',
            }} />

          {error && <div style={{ color: '#ff4d6a', fontSize: 12, marginTop: 8 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button onClick={save} disabled={saving} style={{
              padding: '10px 18px', borderRadius: 10, border: 'none', background: '#F5C518',
              color: '#111', fontWeight: 700, fontSize: 13, cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}>{saving ? 'Guardando...' : existing ? 'Guardar cambios' : 'Enviar calificación'}</button>
            {existing && (
              <button onClick={() => { setEditing(false); setRating(existing.rating); setComment(existing.comment); setError('') }} style={{
                padding: '10px 18px', borderRadius: 10, border: '1px solid var(--border-2)', background: 'transparent',
                color: 'var(--text-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}>Cancelar</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ResenasTab() {
  const { mine, loading, byTarget, submitReview } = useMyReviews()

  return (
    <div style={{ animation: 'sectionIn .4s both' }}>
      <div style={{ marginBottom: 22, animation: 'textIn .5s .04s both' }}>
        <div style={{ fontSize: 12, letterSpacing: '.24em', textTransform: 'uppercase', fontWeight: 700, color: '#F5C518' }}>
          Tu opinión
        </div>
        <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 'clamp(24px,2.6vw,32px)', fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.15, margin: '2px 0 4px' }}>
          Calificar
        </h1>
        <p style={{ color: 'var(--text-2)', margin: 0, maxWidth: '60ch', fontSize: 14 }}>
          Calificá la plataforma, el producto o el taller que te atendió. Podés editar tu calificación cuando quieras.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)', fontSize: 14 }}>Cargando...</div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {CARDS.map(card => {
            // Plataforma/producto son singleton (máximo 1 reseña por usuario) — acá
            // sí mostramos el estado "ya calificaste". Taller no tiene un target fijo
            // hasta que el usuario busca uno en el formulario, así que esta tarjeta
            // siempre arranca en modo envío; si busca un taller que ya calificó,
            // reenviar edita esa reseña (mismo upsert del backend), sin pre-cargarla.
            const found = byTarget(card.targetType, undefined)
            const existing = found ? { rating: found.rating, comment: found.comment, workshop_id: found.workshop_id } : undefined
            return (
              <ReviewCard
                key={card.targetType}
                targetType={card.targetType}
                title={card.title}
                hint={card.hint}
                existing={existing}
                onSubmit={(rating, comment, workshopId) =>
                  submitReview({ target_type: card.targetType, rating, comment, workshop_id: workshopId })
                }
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
