'use client'

import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '@/lib/api'
import { NOTIFICATION_KIND_LABELS } from '@/lib/useAdminNotifications'
import type { AdminNotification } from '@/lib/types'
import ThemedDateInput from '@/components/ThemedDateInput'

interface Colors { bg: string; card: string; border: string; text: string; muted: string; accent: string }
type State = 'all' | 'unseen' | 'pending' | 'resolved'

const FIELD: React.CSSProperties = { background: 'transparent', color: 'inherit', border: '1px solid rgba(128,128,128,0.4)', borderRadius: 8, padding: '7px 10px', fontSize: 13 }
const BTN: React.CSSProperties = { border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }

function Field({ c, label, children }: { c: Colors; label: string; children: React.ReactNode }) {
  return <label style={{ fontSize: 12, color: c.muted, display: 'flex', flexDirection: 'column', gap: 4 }}>{label}{children}</label>
}

/* Una sola bandeja para todo lo que requiere atención: ventas, soporte, postulaciones, verificaciones y
   alertas de seguridad NFC. Pendientes por defecto: lo resuelto desaparece (queda en "Resueltas"). Una
   notificación vista se ve más tenue; abrirla la marca como vista. */
export default function NotificationsPanel({ c, refreshKey, unseenCount, onOpen, onChanged }: {
  c: Colors
  refreshKey: number
  unseenCount: number
  onOpen: (n: AdminNotification) => void
  onChanged: () => void
}) {
  const [items, setItems] = useState<AdminNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState<State>('pending')
  const [kind, setKind] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const r = await adminApi.listNotifications({ state, kind: kind || undefined, date_from: from || undefined, date_to: to || undefined, limit: 200 })
    if (r) setItems(r)
    setLoading(false)
  }, [state, kind, from, to])

  useEffect(() => { void load() }, [load, refreshKey])

  async function setResolved(id: string, resolved: boolean) {
    await adminApi.updateNotification(id, { resolved })
    onChanged()
  }
  async function markAllSeen() {
    await adminApi.markAllNotificationsSeen()
    onChanged()
  }
  const filtered = state !== 'pending' || kind || from || to

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <Field c={c} label="Estado">
          <select value={state} onChange={e => setState(e.target.value as State)} style={FIELD}>
            <option value="pending">Pendientes</option><option value="unseen">Sin ver</option>
            <option value="resolved">Resueltas (historial)</option><option value="all">Todas</option>
          </select>
        </Field>
        <Field c={c} label="Tipo">
          <select value={kind} onChange={e => setKind(e.target.value)} style={FIELD}>
            <option value="">Todos</option>
            {Object.entries(NOTIFICATION_KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field c={c} label="Desde"><ThemedDateInput value={from} onChange={e => setFrom(e.target.value)} style={FIELD} /></Field>
        <Field c={c} label="Hasta"><ThemedDateInput value={to} onChange={e => setTo(e.target.value)} style={FIELD} /></Field>
        {filtered && <button onClick={() => { setState('pending'); setKind(''); setFrom(''); setTo('') }} style={{ ...BTN, background: 'transparent', color: c.muted, border: `1px solid ${c.border}` }}>Limpiar filtros</button>}
        {unseenCount > 0 && <button onClick={markAllSeen} style={{ ...BTN, background: '#F5C518', color: '#111' }}>Marcar todas como vistas ({unseenCount})</button>}
      </div>

      {items.map(n => (
        <div key={n.id} onClick={() => onOpen(n)} style={{
          cursor: 'pointer', background: c.card, border: `1px solid ${!n.seen_at ? c.accent : c.border}`, borderRadius: 12, padding: 16,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
          opacity: n.resolved_at ? 0.5 : n.seen_at ? 0.6 : 1,
        }}>
          <div style={{ minWidth: 0, flex: '1 1 280px' }}>
            <div style={{ fontWeight: n.seen_at ? 500 : 700, fontSize: 14 }}>
              <span style={{ color: n.severity === 'critical' ? '#ff4d6a' : n.severity === 'warning' ? '#ff8a3d' : c.accent }}>{NOTIFICATION_KIND_LABELS[n.kind] || n.kind}</span>
              {' · '}{n.title}
            </div>
            {n.body && <div style={{ fontSize: 12, color: c.muted, marginTop: 4, whiteSpace: 'pre-line' }}>{n.body}</div>}
            <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>
              {new Date(n.created_at).toLocaleString('es-CO')}{n.resolved_at ? ` · atendida ${new Date(n.resolved_at).toLocaleString('es-CO')}` : ''}
            </div>
          </div>
          <div onClick={e => e.stopPropagation()}>
            {!n.resolved_at
              ? <button onClick={() => setResolved(n.id, true)} style={{ ...BTN, background: '#F5C518', color: '#111' }}>Resolver</button>
              : <button onClick={() => setResolved(n.id, false)} style={{ ...BTN, background: 'transparent', color: c.muted, border: `1px solid ${c.border}`, fontWeight: 500 }}>Reabrir</button>}
          </div>
        </div>
      ))}
      {items.length === 0 && !loading && <div style={{ color: c.muted, padding: 20, textAlign: 'center' }}>Nada pendiente</div>}
    </div>
  )
}
