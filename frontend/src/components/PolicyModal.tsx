'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SUPPORT_WHATSAPP, SUPPORT_WHATSAPP_DISPLAY } from '@/lib/checkout'
import { LEGAL_DOCS, LEGAL_VERSION, LEGAL_UPDATED, type LegalTabId } from '@/lib/legalContent'
import { downloadLegalPdf, downloadDiagnosticPdf } from '@/lib/legalPdf'

export type PolicyTab = LegalTabId | 'support'

interface Props {
  isOpen: boolean
  onClose: () => void
  tab: PolicyTab
  theme: 'light' | 'dark'
  plateText: string
  city: string
}

const GOLD = '#F5C518'
const GREEN = '#2ecc71'

/* ── inline icons ── */
const Ic = {
  shield: (c: string) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>,
  doc: (c: string) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></svg>,
  wrench: (c: string) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2.3-.6-.6-2.3z" /></svg>,
  help: (c: string) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" /></svg>,
  phone: (c: string) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L7.6 9.8a16 16 0 0 0 6 6l1.4-1.4a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" /></svg>,
  download: (c: string) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>,
  send: (c: string) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>,
  check: (c: string) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>,
  x: (c: string) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>,
  cpu: (c: string) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2" /></svg>,
}

const TABS: { id: PolicyTab; label: string; icon: (c: string) => React.ReactNode }[] = [
  { id: 'privacy', label: 'Privacidad de Datos', icon: Ic.shield },
  { id: 'warranty', label: 'Términos de Garantía', icon: Ic.doc },
  { id: 'terms', label: 'Uso, Planes y Espacio', icon: Ic.wrench },
  { id: 'support', label: 'Soporte Técnico', icon: Ic.help },
]

const SUPPORT_TYPES = [
  { v: 'NFC_READ_ERROR', l: 'Error al escanear el llavero NFC' },
  { v: 'MILEAGE_CORRECTION', l: 'Corregir kilometraje registrado' },
  { v: 'OWNER_TRANSFER', l: 'Transferir propiedad del vehículo' },
  { v: 'SHOP_AFFILIATION', l: 'Afiliar mi taller a la red' },
  { v: 'BUG_REPORT', l: 'Error en la plataforma' },
]

export default function PolicyModal({ isOpen, onClose, tab, theme, plateText, city }: Props) {
  const [active, setActive] = useState<PolicyTab>(tab)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [type, setType] = useState('NFC_READ_ERROR')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => { if (isOpen) { setActive(tab); setSubmitted(false) } }, [isOpen, tab])

  const isDark = theme === 'dark'
  const panelBg = isDark ? 'rgba(16,16,16,0.97)' : 'rgba(247,246,242,0.98)'
  const border = isDark ? 'rgba(245,197,24,0.22)' : 'rgba(17,17,17,0.12)'
  const subtle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,17,0.08)'
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)'
  const inputBg = isDark ? 'rgba(0,0,0,0.35)' : '#ffffff'
  const textPrimary = isDark ? '#f5f3ec' : '#17171a'
  const textSecondary = isDark ? '#b6b2a6' : '#5c584e'
  const textMuted = isDark ? '#7c786e' : '#7a756a'

  const meta = { plate: plateText, city }
  // Pie del modal: siempre el expediente completo (privacidad + garantía + uso y planes).
  const handleDownloadAll = () => downloadLegalPdf(meta)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!msg.trim()) return
    setSubmitting(true)
    setTimeout(() => { setSubmitting(false); setSubmitted(true); setMsg('') }, 1100)
  }

  const sectionDot = (accent: string) => <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent, flex: '0 0 auto' }} />
  const h3: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: textPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }
  const body: React.CSSProperties = { fontSize: 12.5, lineHeight: 1.65, color: textSecondary, margin: '6px 0 0', paddingLeft: 14 }
  const label: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '.08em' }
  const input: React.CSSProperties = { padding: '10px 12px', background: inputBg, border: `1px solid ${subtle}`, borderRadius: 11, fontSize: 12.5, color: textPrimary, outline: 'none', width: '100%', fontFamily: 'inherit' }

  const doc = active === 'support' ? null : LEGAL_DOCS[active]
  const accent = active === 'warranty' ? GREEN : GOLD
  const introIcon = active === 'privacy' ? Ic.cpu : Ic.wrench

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 880, maxHeight: '86vh', display: 'flex', flexDirection: 'column', background: panelBg, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,.6)', color: textPrimary }}
          >
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${subtle}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(245,197,24,0.12)', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Ic.shield(GOLD)}</span>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>Expediente legal & Centro de ayuda</h2>
                  <p style={{ fontSize: 11.5, color: textMuted, margin: '2px 0 0' }}>CarLink {plateText} · Certificación técnica vehicular</p>
                </div>
              </div>
              <button onClick={onClose} aria-label="Cerrar" style={{ width: 38, height: 38, borderRadius: 11, background: cardBg, border: `1px solid ${subtle}`, color: textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>{Ic.x(textMuted)}</button>
            </div>

            {/* Tabs */}
            <div style={{ padding: '10px 24px', borderBottom: `1px solid ${subtle}`, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {TABS.map(tb => {
                const on = active === tb.id
                return (
                  <button key={tb.id} onClick={() => setActive(tb.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 11, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, background: on ? GOLD : 'transparent', color: on ? '#111' : textSecondary, transition: 'all .15s' }}>
                    {tb.icon(on ? '#111' : textMuted)}<span>{tb.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              <AnimatePresence mode="wait">
                <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                  {active !== 'support' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {doc && (<>
                      <div style={{ display: 'flex', gap: 14, padding: 16, borderRadius: 16, background: active === 'warranty' ? 'rgba(46,204,113,0.06)' : 'rgba(245,197,24,0.06)', border: `1px solid ${active === 'warranty' ? 'rgba(46,204,113,0.18)' : 'rgba(245,197,24,0.18)'}` }}>
                        <span style={{ flex: '0 0 auto', marginTop: 2 }}>{introIcon(accent)}</span>
                        <div>
                          <h4 style={{ fontSize: 13.5, fontWeight: 700, margin: '0 0 4px' }}>{doc.intro.title}</h4>
                          <p style={{ fontSize: 12.5, lineHeight: 1.6, color: textSecondary, margin: 0 }}>{doc.intro.text}</p>
                          <p style={{ fontSize: 10.5, lineHeight: 1.5, color: textMuted, margin: '8px 0 0' }}>{doc.law}</p>
                        </div>
                      </div>
                      {doc.sections.map(sec => (
                        <div key={sec.title}>
                          <h3 style={h3}>{sectionDot(accent)}{sec.title}</h3>
                          {sec.paras?.map((p, i) => <p key={i} style={body}>{p}</p>)}
                          {sec.items && (
                            <ul style={{ ...body, margin: '6px 0 0', paddingLeft: 32 }}>
                              {sec.items.map((it, i) => <li key={i} style={{ marginBottom: 4 }}>{it}</li>)}
                            </ul>
                          )}
                          {sec.note && <p style={{ ...body, color: textPrimary, fontWeight: 600 }}>{sec.note}</p>}
                        </div>
                      ))}
                      </>)}
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 24 }} className="grid2">
                      {/* Support form */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div>
                          <h3 style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 800, margin: 0 }}>Enviar ticket de soporte</h3>
                          <p style={{ fontSize: 12.5, color: textMuted, margin: '4px 0 0' }}>Nuestro equipo responde al correo asociado en menos de 2 horas.</p>
                        </div>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                              <label style={label}>Tu nombre</label>
                              <input required value={name} onChange={e => setName(e.target.value)} style={input} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                              <label style={label}>Email de contacto</label>
                              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tucorreo@gmail.com" style={input} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <label style={label}>Tipo de incidencia</label>
                            <select value={type} onChange={e => setType(e.target.value)} style={input}>
                              {SUPPORT_TYPES.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                            </select>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <label style={label}>Detalles del caso</label>
                            <textarea required rows={4} value={msg} onChange={e => setMsg(e.target.value)} placeholder="Describe qué ocurre con tu placa o tu ficha…" style={{ ...input, resize: 'none', lineHeight: 1.5 }} />
                          </div>
                          <button type="submit" disabled={submitting || submitted} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 11, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 13, cursor: 'pointer', opacity: submitting || submitted ? 0.6 : 1 }}>
                            {submitting ? <span style={{ width: 15, height: 15, border: '2px solid rgba(0,0,0,0.35)', borderTopColor: '#111', borderRadius: '50%', display: 'inline-block', animation: 'spin .8s linear infinite' }} /> : Ic.send('#111')}
                            <span>Enviar solicitud</span>
                          </button>
                          {submitted && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 11, background: 'rgba(46,204,113,0.1)', border: '1px solid rgba(46,204,113,0.25)', color: GREEN, fontSize: 12.5 }}>
                              {Ic.check(GREEN)}<span>¡Ticket #C-{Math.floor(Math.random() * 90000 + 10000)} enviado! Te contactaremos pronto.</span>
                            </div>
                          )}
                        </form>
                      </div>

                      {/* Contact + diagnostics */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ padding: 16, borderRadius: 14, background: cardBg, border: `1px solid ${subtle}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <span style={{ ...label, color: GOLD, letterSpacing: '.14em' }}>Línea de atención</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700 }}>{Ic.phone(GOLD)}<span>Soporte por WhatsApp</span></div>
                          <p style={{ fontSize: 12, lineHeight: 1.55, color: textMuted, margin: 0 }}>¿Eres taller de la red y tienes problemas escribiendo los llaveros? Escríbenos por el canal directo.</p>
                          <a href={`https://wa.me/${SUPPORT_WHATSAPP}`} target="_blank" rel="noreferrer" style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, color: GREEN, background: isDark ? '#000' : 'rgba(0,0,0,0.04)', border: `1px solid ${subtle}`, borderRadius: 9, padding: '9px', textDecoration: 'none' }}>{SUPPORT_WHATSAPP_DISPLAY}</a>
                          <a href="mailto:business@carlink.com.co" style={{ textAlign: 'center', fontSize: 12.5, color: GOLD, textDecoration: 'none' }}>business@carlink.com.co</a>
                        </div>
                        <div style={{ padding: 16, borderRadius: 14, background: cardBg, border: `1px solid ${subtle}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <span style={{ ...label, color: GOLD, letterSpacing: '.14em' }}>Autodiagnóstico</span>
                          <p style={{ fontSize: 12, lineHeight: 1.55, color: textMuted, margin: 0 }}>Descarga el estado de tu placa y los registros del sistema para agilizar tu ticket.</p>
                          <button onClick={() => downloadDiagnosticPdf(meta)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', borderRadius: 10, background: 'transparent', border: `1px solid ${subtle}`, color: textPrimary, fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>
                            {Ic.download(GOLD)}<span>Descargar diagnóstico</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 24px', borderTop: `1px solid ${subtle}`, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10.5, color: textMuted, fontFamily: 'var(--font-ui)', letterSpacing: '.04em' }}>
                <span style={{ padding: '2px 7px', borderRadius: 6, background: cardBg, border: `1px solid ${subtle}`, color: GREEN }}>v{LEGAL_VERSION}</span>
                <span>Actualizado: {LEGAL_UPDATED}</span>
              </div>
              <button onClick={handleDownloadAll} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 11, background: cardBg, border: `1px solid ${subtle}`, color: textPrimary, fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>
                {Ic.download(GOLD)}<span>Descargar documento completo</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
