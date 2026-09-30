import { useCallback, useState } from 'react'
import { useMyReviews } from './hooks'
import type { Survey } from './types'

const STORAGE_KEY = 'carlink:surveyPromptDismissed'

function dismissedKey(survey: Survey, workshopId?: string): string {
  return survey.target_type === 'workshop' ? `${survey.key}:${workshopId}` : survey.key
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

/** Supresión de los prompts flotantes de encuesta — por encuesta (una de taller, por taller),
 * no por evento. Dos señales, ninguna nueva en el backend: ya respondida (GET /reviews?mine=true,
 * vía useMyReviews) o descartada ("Después", localStorage — solo evita que insista en este
 * dispositivo). El catálogo de encuestas y su estado activo viene de Admin (lib/surveys.ts). */
export function useRatingPrompts() {
  const { mine, loading, bySurvey, submitReview } = useMyReviews()
  const [dismissed, setDismissed] = useState<Set<string>>(() => readDismissed())

  const shouldPrompt = useCallback((survey: Survey | undefined, workshopId?: string): boolean => {
    if (!survey || loading) return false
    if (survey.target_type === 'workshop' && !workshopId) return false
    if (bySurvey(survey.key, survey.target_type, workshopId)) return false
    return !dismissed.has(dismissedKey(survey, workshopId))
  }, [loading, bySurvey, dismissed])

  const dismiss = useCallback((survey: Survey, workshopId?: string) => {
    setDismissed(prev => {
      const next = new Set(prev)
      next.add(dismissedKey(survey, workshopId))
      writeDismissed(next)
      return next
    })
  }, [])

  return { mine, loading, shouldPrompt, dismiss, submitReview }
}
