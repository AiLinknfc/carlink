'use client'

import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '@/lib/api'
import type { AdminNotification } from '@/lib/types'

const POLL_MS = 60_000

/* Notificaciones del administrador para las campanas (Admin y app). Solo hace peticiones si
   `enabled` (el usuario es admin). Consulta el resumen cada 60 s y cuando la pestaña vuelve a
   estar visible; `latest` son las últimas sin ver para mostrar en el desplegable. */
export function useAdminNotifications(enabled: boolean) {
  const [unseen, setUnseen] = useState(0)
  const [pending, setPending] = useState(0)
  const [latest, setLatest] = useState<AdminNotification[]>([])

  const refresh = useCallback(async () => {
    if (!enabled) return
    try {
      const [s, l] = await Promise.all([adminApi.notificationsSummary(), adminApi.listNotifications({ state: 'pending', limit: 12 })])
      if (s) { setUnseen(s.unseen); setPending(s.pending) }
      if (l) setLatest(l)
    } catch { /* la campana nunca debe romper la pantalla */ }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    void refresh()
    const t = setInterval(() => { void refresh() }, POLL_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVisible) }
  }, [enabled, refresh])

  return { unseen, pending, latest, refresh }
}

export const NOTIFICATION_KIND_LABELS: Record<string, string> = {
  order_paid: 'Venta',
  order_cod: 'Contraentrega',
  support_ticket: 'Soporte',
  workshop_application: 'Taller',
  job_application: 'Empleo',
  found_request: 'Llavero encontrado',
  verification: 'Verificación',
  nfc_alert: 'Alerta NFC',
}
