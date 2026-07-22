'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getPqrs, subscribePqrs, updatePqrsStatus, KIND_LABEL, STATUS_LABEL, PqrsEntry, PqrsStatus } from '@/lib/pqrs'

interface Props {
  isOpen: boolean
  onClose: () => void
  theme: 'light' | 'dark'
}

const GOLD = '#F5C518'
const STATUS_COLOR: Record<PqrsStatus, string> = { nuevo: '#F5C518', en_revision: '#5aa9ff', resuelto: '#2ecc71' }
const NEXT: Record<PqrsStatus, PqrsStatus> = { nuevo: 'en_revision', en_revision: 'resuelto', resuelto: 'nuevo' }

export function usePqrsCount(status?: PqrsStatus) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const read = () => setN(getPqrs().filter(e => (status ? e.status === status : true)).length)
    read()
    return subscribePqrs(read)
  }, [status])
  return n
}

const FILTERS: { id: 'todos' | PqrsStatus; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'nuevo', label: 'Nuevos' },
  { id: 'en_revision', label: 'En revisión' },
  { id: 'resuelto', label: 'Resueltos' },
]

export default function PqrsInbox({ isOpen, onClose, theme }: Props) {
  const [list, setList] = useState<PqrsEntry[]>([])
  const [filter, setFilter] = useState<'todos' | PqrsStatus>('todos')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    const read = () => setList(getPqrs())
    read()
    return subscribePqrs(read)
  }, [])

  const isDark = theme === 'dark'
  const panelBg = isDark ? 'rgba(14,14,14,0.98)' : 'rgba(247,246,242,0.99)'
  const border = isDark ? 'rgba(245,197,24,0.22)' : 'rgba(17,17,17,0.12)'
  const subtle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,17,0.08)'
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)'
  const textPrimary = isDark ? '#f5f3ec' : '#17171a'
  const textMuted = isDark ? '#8f8a7a' : '#7a756a'

  const shown = list.filter(e => filter === 'todos' || e.status === filter)

  const fmtDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.toLocaleDateString('es-CO')} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', justifyContent: 'flex-end' }}>
          <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />

          <motion.div className="pqrs-panel" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            style={{ position: 'relative', zIndex: 1, width: 'min(460px, 100vw)', height: '100%', display: 'flex', flexDirection: 'column', background: panelBg, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderLeft: `1px solid ${border}`, color: textPrimary }}>

            {/* Header */}
            <div style={{ padding: '18px 20px', borderBottom: `1px solid ${subtle}`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(245,197,24,0.12)', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M8 10h.01M12 10h.01M16 10h.01" /></svg>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>Bandeja PQRS</div>
                <div style={{ fontSize: 11.5, color: textMuted }}>Experiencias que reportan los usuarios</div>
              </div>
              <button onClick={onClose} aria-label="Cerrar" style={{ width: 36, height: 36, borderRadius: 10, background: cardBg, border: `1px solid ${subtle}`, color: textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Filters */}
            <div style={{ padding: '10px 20px', borderBottom: `1px solid ${subtle}`, display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {FILTERS.map(f => {
                const on = filter === f.id
                const count = f.id === 'todos' ? list.length : list.filter(e => e.status === f.id).length
                return (
                  <button key={f.id} onClick={() => setFilter(f.id)} style={{ padding: '6px 12px', borderRadius: 999, border: `1px solid ${on ? GOLD : subtle}`, background: on ? GOLD : 'transparent', color: on ? '#111' : textMuted, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {f.label} {count > 0 && <span style={{ opacity: 0.7 }}>· {count}</span>}
                  </button>
                )
              })}
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {shown.length === 0 && (
                <div style={{ textAlign: 'center', color: textMuted, fontSize: 13, marginTop: 40 }}>
                  Aún no hay reportes en esta vista.
                </div>
              )}
              {shown.map(e => {
                const open = expanded === e.id
                return (
                  <div key={e.id} style={{ borderRadius: 14, background: cardBg, border: `1px solid ${subtle}`, overflow: 'hidden' }}>
                    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: 'rgba(245,197,24,0.14)', color: GOLD }}>{KIND_LABEL[e.kind]}</span>
                          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, fontWeight: 600, letterSpacing: '.04em', color: textMuted }}>{e.ticket}</span>
                        </div>
                        <button onClick={() => updatePqrsStatus(e.id, NEXT[e.status])} title="Cambiar estado" style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, border: `1px solid ${STATUS_COLOR[e.status]}55`, background: `${STATUS_COLOR[e.status]}18`, color: STATUS_COLOR[e.status], fontSize: 11, fontWeight: 700, cursor: 'pointer', flex: '0 0 auto' }}>
                          {STATUS_LABEL[e.status]}
                        </button>
                      </div>

                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{e.categoryLabel}</div>
                      {e.carModel && <div style={{ fontSize: 12.5, color: GOLD, fontWeight: 600 }}>🚗 {e.carModel}</div>}
                      <p style={{ fontSize: 13, lineHeight: 1.55, color: isDark ? '#cfcabb' : '#3a362e', margin: 0 }}>{e.message}</p>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11, color: textMuted, marginTop: 2 }}>
                        <span>{fmtDate(e.createdAt)}</span>
                        {e.plate && <span>· Placa {e.plate}</span>}
                        {e.city && <span>· {e.city}</span>}
                        {e.email && <span>· {e.email}</span>}
                      </div>

                      {e.transcript.length > 0 && (
                        <button onClick={() => setExpanded(open ? null : e.id)} style={{ alignSelf: 'flex-start', marginTop: 2, background: 'transparent', border: 'none', padding: 0, color: textMuted, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
                          {open ? 'Ocultar conversación' : 'Ver conversación'}
                        </button>
                      )}
                    </div>

                    {open && (
                      <div style={{ padding: 12, borderTop: `1px solid ${subtle}`, display: 'flex', flexDirection: 'column', gap: 6, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
                        {e.transcript.map((m, i) => (
                          <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '86%', padding: '7px 10px', fontSize: 12, lineHeight: 1.45, borderRadius: 10, background: m.role === 'user' ? GOLD : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(17,17,17,0.05)'), color: m.role === 'user' ? '#111' : textPrimary }}>
                            {m.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ padding: '10px 20px', borderTop: `1px solid ${subtle}`, fontSize: 11, color: textMuted, textAlign: 'center' }}>
              Toca el estado para avanzarlo: Nuevo → En revisión → Resuelto
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
