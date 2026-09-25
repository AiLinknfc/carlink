import { useEffect, useState, useCallback } from 'react'
import { surveysApi } from './api'
import type { Survey } from './types'

/* Eventos de la app que pueden disparar una encuesta. El código que los dispara vive en
   app/app/page.tsx y OrderTrackingModal; Admin (pestaña "Encuestas") solo puede editar el
   texto de una encuesta y activarla/desactivarla — un evento nuevo requiere código. */
export type SurveyTrigger =
  | 'usage_milestone'
  | 'first_service_registered'
  | 'keychain_activated'
  | 'found_notice_opened'
  | 'order_delivered'
  | 'workshop_service_registered'

/* Catálogo por defecto: idéntico a las semillas de supabase/migrations/064_surveys.sql. Se usa
   solo si el backend no responde, para que los prompts no desaparezcan por una falla de red. */
export const DEFAULT_SURVEYS: Survey[] = [
  { key: 'app_satisfaction', trigger_key: 'usage_milestone', target_type: 'platform', title: '¿Qué tal tu experiencia con CarLink?', hint: 'Ya llevas un tiempo usando la app — tu opinión nos ayuda a mejorarla.' },
  { key: 'ease_of_use', trigger_key: 'first_service_registered', target_type: 'platform', title: '¿Qué tan fácil fue registrar tu servicio?', hint: 'Acabas de guardar tu primer servicio — cuéntanos si fue simple o si algo te frenó.' },
  { key: 'keychain_setup', trigger_key: 'keychain_activated', target_type: 'product', title: '¿Qué tal el llavero NFC?', hint: 'Acabas de activarlo — cuéntanos qué te pareció el producto y si fue fácil dejarlo listo.' },
  { key: 'keychain_found_notice', trigger_key: 'found_notice_opened', target_type: 'platform', title: '¿El llavero funcionó cuando lo necesitaste?', hint: 'Alguien te avisó que encontró tu vehículo — cuéntanos qué tal fue la experiencia.' },
  { key: 'purchase_experience', trigger_key: 'order_delivered', target_type: 'product', title: '¿Cómo fue tu compra?', hint: 'Tu pedido ya fue entregado — cuéntanos qué te pareció el proceso y el producto.' },
  { key: 'workshop_service', trigger_key: 'workshop_service_registered', target_type: 'workshop', title: '¿Cómo te fue en tu taller?', hint: 'Acabas de registrar un servicio con este taller — cuéntanos qué tal la atención.' },
]

let cached: Survey[] | null = null

/** Encuestas activas, gestionadas desde Admin. Mientras carga no devuelve ninguna (no hay
 * prompt); si Admin desactivó una, `forTrigger` la devuelve undefined y el prompt no sale. */
export function useSurveys() {
  const [surveys, setSurveys] = useState<Survey[] | null>(cached)

  useEffect(() => {
    if (cached) return
    let alive = true
    surveysApi.active().then(res => {
      cached = Array.isArray(res) ? res : DEFAULT_SURVEYS
      if (alive) setSurveys(cached)
    })
    return () => { alive = false }
  }, [])

  const forTrigger = useCallback(
    (trigger: SurveyTrigger): Survey | undefined => surveys?.find(s => s.trigger_key === trigger),
    [surveys]
  )
  return { surveys, forTrigger }
}
