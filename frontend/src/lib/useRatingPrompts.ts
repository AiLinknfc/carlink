import { useCallback, useState } from 'react'
import { useMyReviews } from './hooks'
import type { ReviewTargetType } from './types'

const STORAGE_KEY = 'carlink:reviewPromptDismissed'

function dismissedKey(targetType: ReviewTargetType, workshopId?: string): string {
  return targetType === 'workshop' ? `workshop:${workshopId}` : targetType
}

function readDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function writeDismissed(set: Set<string>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
  } catch { /* localStorage no disponible (privado/incognito) — no bloquea nada */ }
}

/** Supresión unificada de los prompts de calificación contextuales — por
 * target (plataforma/producto son globales, un taller por id), no por evento:
 * cualquiera de los eventos que dispare 'platform' queda cubierto en cuanto
 * uno de ellos se calificó o se descartó, sin importar cuál haya sido. Dos
 * señales, ninguna nueva en el backend: ya calificado (GET /reviews?mine=true,
 * vía useMyReviews) o descartado ("Después", localStorage — solo evita que
 * insista en esta sesión/dispositivo, no hace falta persistirlo server-side
 * para un v1 no intrusivo). */
export function useRatingPrompts() {
  const { mine, loading, byTarget, submitReview } = useMyReviews()
  const [dismissed, setDismissed] = useState<Set<string>>(() => readDismissed())

  const shouldPrompt = useCallback((targetType: ReviewTargetType, workshopId?: string): boolean => {
    if (loading) return false
    if (targetType === 'workshop' && !workshopId) return false
    if (byTarget(targetType, workshopId)) return false
    return !dismissed.has(dismissedKey(targetType, workshopId))
  }, [loading, byTarget, dismissed])

  const dismiss = useCallback((targetType: ReviewTargetType, workshopId?: string) => {
    setDismissed(prev => {
      const next = new Set(prev)
      next.add(dismissedKey(targetType, workshopId))
      writeDismissed(next)
      return next
    })
  }, [])

  return { mine, loading, shouldPrompt, dismiss, submitReview }
}
