'use client'

import { useState } from 'react'
import { useMyReviews } from '@/lib/hooks'
import { RatingPromptForm } from '@/components/RatingPrompt'
import { RatingStars } from '@/lib/icons_new'
import type { ReviewTargetType } from '@/lib/types'

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
        <RatingPromptForm
          targetType={targetType}
          initialRating={existing?.rating}
          initialComment={existing?.comment}
          initialWorkshopId={existing?.workshop_id || undefined}
          submitLabel={existing ? 'Guardar cambios' : 'Enviar calificación'}
          onCancel={existing ? () => setEditing(false) : undefined}
          onSubmit={onSubmit}
          onSuccess={() => setEditing(false)}
        />
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
