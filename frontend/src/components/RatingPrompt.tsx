'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import StarRatingInput from '@/components/StarRatingInput'
import type { ReviewTargetType } from '@/lib/types'

interface WorkshopHit { id: string; code: string; name: string; city: string; address: string; is_verified: boolean }

/** Formulario de calificación (estrellas + comentario + buscador de taller si
 * aplica) — usado tanto por la tarjeta de gestión de ResenasTab.tsx como por
 * los prompts contextuales (RatingPromptBanner/RatingPromptModal) que salen
 * tras un evento real de la app. Una sola implementación, tres presentaciones. */
export function RatingPromptForm({
  targetType, initialRating = 0, initialComment = '', initialWorkshopId = '',
  initialWorkshopName = '', submitLabel = 'Enviar calificación', compact = false,
  onSubmit, onSuccess, onCancel, cancelLabel = 'Cancelar',
}: {
  targetType: ReviewTargetType
  initialRating?: number
  initialComment?: string
  initialWorkshopId?: string
  initialWorkshopName?: string
  submitLabel?: string
  compact?: boolean
  onSubmit: (rating: number, comment: string, workshopId?: string) => Promise<unknown>
  onSuccess?: () => void
  onCancel?: () => void
  cancelLabel?: string
}) {
  const [rating, setRating] = useState(initialRating)
  const [comment, setComment] = useState(initialComment)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [workshop, setWorkshop] = useState(initialWorkshopName)
  const [workshopId, setWorkshopId] = useState(initialWorkshopId)
  const [wsResults, setWsResults] = useState<WorkshopHit[]>([])
  const [showWsDropdown, setShowWsDropdown] = useState(false)
  const wsRef = useRef<HTMLDivElement>(null)
  const wsTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

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
    onSuccess?.()
  }

  return (
    <div>
      {targetType === 'workshop' && !initialWorkshopId && (
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

      <StarRatingInput value={rating} onChange={setRating} size={compact ? 22 : 26} />

      {!compact || rating > 0 ? (
        <textarea value={comment} onChange={e => setComment(e.target.value)}
          placeholder="Contanos tu experiencia (opcional)" rows={compact ? 2 : 3}
          style={{
            width: '100%', marginTop: 12, padding: '11px 13px', borderRadius: 10,
            border: '1px solid var(--border-2)', background: 'rgba(255,255,255,0.04)',
            color: 'var(--text-1)', fontSize: 13.5, outline: 'none', resize: 'vertical', fontFamily: 'inherit',
          }} />
      ) : null}

      {error && <div style={{ color: '#ff4d6a', fontSize: 12, marginTop: 8 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button onClick={save} disabled={saving} style={{
          padding: compact ? '9px 16px' : '10px 18px', borderRadius: 10, border: 'none', background: '#F5C518',
          color: '#111', fontWeight: 700, fontSize: 13, cursor: saving ? 'default' : 'pointer',
          opacity: saving ? 0.6 : 1,
        }}>{saving ? 'Guardando...' : submitLabel}</button>
        {onCancel && (
          <button onClick={onCancel} style={{
            padding: compact ? '9px 16px' : '10px 18px', borderRadius: 10, border: '1px solid var(--border-2)', background: 'transparent',
            color: 'var(--text-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}>{cancelLabel}</button>
        )}
      </div>
    </div>
  )
}

interface PromptShellProps {
  title: string
  hint: string
  targetType: ReviewTargetType
  workshopId?: string
  workshopName?: string
  onSubmit: (rating: number, comment: string, workshopId?: string) => Promise<unknown>
  onDismiss: () => void
}

/** Prompt no intrusivo — tarjeta flotante, no bloquea nada, se descarta con
 * "Después" (dismiss() de useRatingPrompts, no vuelve a salir en esta sesión
 * salvo que se limpie localStorage). */
export function RatingPromptBanner({ title, hint, targetType, workshopId, workshopName, onSubmit, onDismiss }: PromptShellProps) {
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!done) return
    const t = setTimeout(onDismiss, 2400)
    return () => clearTimeout(t)
  }, [done, onDismiss])

  if (done) {
    return (
      <div style={{
        position: 'fixed', right: 20, bottom: 20, zIndex: 70, maxWidth: 340, padding: '16px 18px',
        borderRadius: 14, background: 'rgba(16,16,16,0.96)', backdropFilter: 'blur(14px)',
        border: '1px solid rgba(245,197,24,0.4)', color: '#fff8e6', fontSize: 13.5, fontWeight: 600,
        animation: 'toastIn .4s both',
      }}>¡Gracias por calificar!</div>
    )
  }
  return (
    <div style={{
      position: 'fixed', right: 20, bottom: 20, zIndex: 70, maxWidth: 340, width: 'calc(100vw - 40px)',
      padding: 18, borderRadius: 16, background: 'rgba(16,16,16,0.97)', backdropFilter: 'blur(14px)',
      border: '1px solid rgba(245,197,24,0.35)', boxShadow: '0 24px 60px rgba(0,0,0,.4)',
      color: '#f5f3ec', animation: 'toastIn .4s both',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
          <p style={{ color: '#a8a496', fontSize: 12.5, margin: '3px 0 0', lineHeight: 1.4 }}>{hint}</p>
        </div>
        <button onClick={onDismiss} aria-label="Cerrar" style={{ background: 'none', border: 'none', color: '#7c786e', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 2 }}>×</button>
      </div>
      <div style={{ marginTop: 12 }}>
        <RatingPromptForm
          targetType={targetType} initialWorkshopId={workshopId} initialWorkshopName={workshopName}
          compact submitLabel="Enviar" cancelLabel="Después" onCancel={onDismiss}
          onSubmit={onSubmit} onSuccess={() => setDone(true)}
        />
      </div>
    </div>
  )
}

/** Igual que el banner pero interrumpe — reservado para "pedido entregado"
 * (pedido explícito del usuario, único caso que usa modal en vez de banner). */
export function RatingPromptModal({ title, hint, targetType, workshopId, workshopName, onSubmit, onDismiss }: PromptShellProps) {
  const [done, setDone] = useState(false)
  return (
    <div onClick={onDismiss} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(4,4,4,0.74)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 400, padding: 24, borderRadius: 20,
        background: 'var(--surface-1, #141414)', border: '1px solid var(--border-2)',
        color: 'var(--text-1)', animation: 'sectionIn .3s both',
      }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>¡Gracias por calificar!</div>
            <button onClick={onDismiss} style={{ marginTop: 10, padding: '9px 18px', borderRadius: 10, border: 'none', background: '#F5C518', color: '#111', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cerrar</button>
          </div>
        ) : (
          <>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{title}</div>
            <p style={{ color: 'var(--text-2)', fontSize: 13, margin: '0 0 14px' }}>{hint}</p>
            <RatingPromptForm
              targetType={targetType} initialWorkshopId={workshopId} initialWorkshopName={workshopName}
              submitLabel="Enviar calificación" cancelLabel="Ahora no" onCancel={onDismiss}
              onSubmit={onSubmit} onSuccess={() => setDone(true)}
            />
          </>
        )}
      </div>
    </div>
  )
}
