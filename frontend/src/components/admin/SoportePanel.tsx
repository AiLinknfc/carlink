'use client'

import { useEffect, useState } from 'react'
import { supportTicketApi, type SupportTicket } from '@/lib/api'

interface Colors { bg: string; card: string; border: string; text: string; muted: string; accent: string }

const TYPE_LABEL: Record<string, string> = {
  NFC_READ_ERROR: 'Error al escanear el llavero', MILEAGE_CORRECTION: 'Corregir kilometraje', OWNER_TRANSFER: 'Transferir propiedad',
  SHOP_AFFILIATION: 'Afiliar taller', BUG_REPORT: 'Error en la plataforma',
}

/* Tickets enviados desde el modal de Soporte (migración 063). */
export default function SoportePanel({ c }: { c: Colors }) {
  const [rows, setRows] = useState<SupportTicket[]>([])
  const [filter, setFilter] = useState('open')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    supportTicketApi.list(filter || undefined).then(l => { setRows(l || []); setLoading(false) })
  }, [filter])

  const toggle = async (t: SupportTicket) => {
    const updated = await supportTicketApi.setStatus(t.id, t.status === 'open' ? 'resolved' : 'open')
    if (updated) setRows(prev => (filter && updated.status !== filter ? prev.filter(x => x.id !== t.id) : prev.map(x => (x.id === t.id ? updated : x))))
  }

  const btn = (on: boolean): React.CSSProperties => ({ padding: '7px 12px', borderRadius: 8, border: `1px solid ${c.border}`, background: on ? c.accent : 'transparent', color: on ? '#111' : c.muted, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' })

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['open', 'Abiertos'], ['resolved', 'Resueltos'], ['', 'Todos']].map(([k, l]) => <button key={k} onClick={() => setFilter(k)} style={btn(filter === k)}>{l}</button>)}
      </div>
      {loading && <div style={{ color: c.muted, padding: 20 }}>Cargando...</div>}
      {!loading && rows.length === 0 && <div style={{ color: c.muted, padding: 20 }}>No hay tickets en este estado.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map(t => (
          <div key={t.id} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 800 }}>C-{t.number} <span style={{ color: c.muted, fontWeight: 500, fontSize: 12.5 }}>· {TYPE_LABEL[t.type] || t.type}</span></div>
              <span style={{ fontSize: 12, fontWeight: 700, color: t.status === 'open' ? c.accent : '#2ecc71' }}>{t.status === 'open' ? 'Abierto' : 'Resuelto'}</span>
            </div>
            <div style={{ fontSize: 12.5, color: c.muted, margin: '6px 0' }}>
              {t.name} · <a href={`mailto:${t.email}`} style={{ color: c.accent }}>{t.email}</a>{t.plate ? ` · Placa ${t.plate}` : ''}{t.diagnostic_id ? ` · ${t.diagnostic_id}` : ''} · {new Date(t.created_at).toLocaleString('es-CO')}
            </div>
            <p style={{ margin: '0 0 10px', fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{t.message}</p>
            <button onClick={() => toggle(t)} style={btn(false)}>{t.status === 'open' ? 'Marcar resuelto' : 'Reabrir'}</button>
          </div>
        ))}
      </div>
    </div>
  )
}
