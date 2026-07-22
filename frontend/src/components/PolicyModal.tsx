'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import jsPDF from 'jspdf'

export type PolicyTab = 'warranty' | 'privacy' | 'support'

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

  const handleDownload = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const w = doc.internal.pageSize.getWidth()
    const margin = 20
    const contentW = w - margin * 2
    let y = 0

    const gold = [245, 197, 24] as const
    const dark = [20, 20, 20] as const
    const muted = [120, 120, 120] as const
    const green = [46, 204, 113] as const

    const drawHeader = () => {
      doc.setFillColor(...dark)
      doc.rect(0, 0, w, 42, 'F')
      doc.setFillColor(...gold)
      doc.rect(0, 42, w, 1.2, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(22)
      doc.setTextColor(255, 255, 255)
      doc.text('CARLINK', margin, 18)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...muted)
      doc.text('FICHA TECNICA DIGITAL · EXPEDIENTE LEGAL', margin, 25)
      doc.setFontSize(8)
      doc.text(`Placa: ${plateText}  |  Ciudad: ${city}  |  Generado: ${new Date().toLocaleDateString('es-CO')}`, margin, 32)
      doc.setFontSize(7)
      doc.setTextColor(...gold)
      doc.text('carlink.com.co', w - margin, 18, { align: 'right' })
      y = 52
    }

    const sectionTitle = (title: string) => {
      doc.setFillColor(245, 197, 24, 0.08)
      doc.roundedRect(margin, y - 4, contentW, 9, 2, 2, 'F')
      doc.setFillColor(...gold)
      doc.rect(margin, y - 4, 2.5, 9, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...dark)
      doc.text(title, margin + 6, y + 2)
      y += 14
    }

    const bodyText = (text: string) => {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(60, 60, 60)
      const lines = doc.splitTextToSize(text, contentW)
      doc.text(lines, margin, y)
      y += lines.length * 4.5 + 4
    }

    const bulletItem = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...dark)
      doc.text(label, margin + 2, y)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(60, 60, 60)
      const lines = doc.splitTextToSize(value, contentW - 6)
      doc.text(lines, margin + 2, y + 4)
      y += lines.length * 4 + 7
    }

    const drawFooter = () => {
      const fh = doc.internal.pageSize.getHeight()
      doc.setFillColor(...dark)
      doc.rect(0, fh - 18, w, 18, 'F')
      doc.setFillColor(...gold)
      doc.rect(0, fh - 18, w, 0.6, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(180, 180, 180)
      doc.text('CarLink S.A.S. · Bogotá D.C., Colombia · soporte@ailink.com.co · +57 316 497 6104', margin, fh - 10)
      doc.text('Documento generado automáticamente. Válido sin firma.', margin, fh - 5)
      doc.setTextColor(...gold)
      doc.text('carlink.com.co', w - margin, fh - 10, { align: 'right' })
    }

    drawHeader()

    if (active === 'privacy') {
      sectionTitle('POLITICA DE PRIVACIDAD Y PROTECCION DE DATOS')
      bodyText('Ley Estatutaria 1581 de 2012 · Habeas Data · Decreto 1377 de 2013')
      bodyText(`CarLink S.A.S., con domicilio en Bogota D.C., Colombia, es responsable del tratamiento de los datos asociados a la ficha tecnica digital y al llavero NFC de la placa ${plateText}.`)

      bulletItem('A. DATOS RECOLECTADOS:', `Placa (${plateText}), ciudad de expedicion (${city}), marca/modelo/ano, kilometraje, historial de servicios, piezas, fotos de evidencia, recibos escaneados y correo de tu cuenta Google.`)
      bulletItem('B. FINALIDAD:', 'Proveer la ficha tecnica verificable del vehiculo; permitir el escaneo NFC/QR por talleres autorizados; asegurar trazabilidad y control de garantias; prevenir fraude de kilometraje.')
      bulletItem('C. SEGURIDAD:', 'Transmision con TLS 1.3 y cifrado AES-256. El chip NFC usa un identificador UID unico e inmutable con firma criptografica. Ningun dato personal viaja en texto plano en la etiqueta.')
      bulletItem('D. TUS DERECHOS (Habeas Data):', 'Conocer, actualizar, rectificar y suprimir tus datos, y revocar el consentimiento escribiendo a soporte@ailink.com.co con el asunto "HABEAS DATA - ${plateText}".')

    } else if (active === 'warranty') {
      sectionTitle('TERMINOS DE GARANTIA · CARLINK Y RED DE TALLERES')
      bodyText('Garantia automotriz certificada con respaldo de la red de talleres afiliados.')

      bulletItem('A. SERVICIOS DE MANTENIMIENTO:', 'Garantia de 12 MESES o 15.000 KM (lo que ocurra primero) sobre todo servicio registrado y firmado digitalmente en la plataforma. Ampara mano de obra y refacciones del taller afiliado.')
      bulletItem('B. HARDWARE (LLAVERO NFC):', 'Garantia de por vida contra defectos de fabricacion y desmagnetizacion. Soporta de -40 C a 120 C, rayos UV, humedad extrema y lavados a presion; si falla la lectura por desgaste, lo reponemos sin costo.')
      bulletItem('C. EXCLUSIONES:', 'Danos por accidentes, colisiones o fuego que destruyan el chip; manipulacion o perforacion intencional; mantenimientos en talleres que no firmen digitalmente en la plataforma.')
      bulletItem('D. RECLAMOS:', 'El conductor acude a un taller de la red; el mecanico escanea la placa con su telefono y la plataforma valida al instante si el plazo sigue vigente, autorizando el servicio sin tickets fisicos.')

    } else {
      sectionTitle('SOPORTE TECNICO · CARLINK')
      bulletItem('PLACA ACTIVA:', plateText)
      bulletItem('CIUDAD DE REGISTRO:', city)
      bulletItem('ESTADO NFC:', 'Activo y certificado')
      bulletItem('CANAL DE SOPORTE:', 'soporte@ailink.com.co')
      bulletItem('WHATSAPP:', '+57 316 497 6104')
      bodyText('Nuestro equipo tecnico responde en menos de 2 horas habiles. Para incidencias criticas con el chip NFC, contacta directamente por WhatsApp.')
    }

    drawFooter()
    doc.save(`CarLink_${active}_${plateText}.pdf`)
  }

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

  const PRIVACY = [
    { title: '1. Responsable del tratamiento', text: <>«CarLink S.A.S.», con domicilio en Bogotá D.C., Colombia, es responsable del tratamiento de los datos asociados a tu ficha técnica digital y al llavero NFC de la placa <b style={{ color: textPrimary }}>{plateText}</b>, conforme a la <b style={{ color: textPrimary }}>Ley Estatutaria 1581 de 2012</b> y el Decreto 1377 de 2013 (Habeas Data).</> },
    { title: '2. Datos personales recolectados', text: <>Placa (<b style={{ color: textPrimary }}>{plateText}</b>), ciudad de expedición (<b style={{ color: textPrimary }}>{city}</b>), marca, modelo y año, kilometraje, historial de servicios, piezas reemplazadas, fotos de evidencia, recibos escaneados y el correo de tu cuenta de Google.</> },
    { title: '3. Finalidad del tratamiento', text: <>Proveer la ficha técnica verificable del vehículo, permitir el escaneo del llavero NFC o el QR por talleres autorizados, asegurar la trazabilidad y el control de garantías, y prevenir el fraude de kilometraje en compraventas.</> },
    { title: '4. Seguridad y cifrado', text: <>Toda transmisión viaja por túneles TLS 1.3 con cifrado AES-256. El llavero NFC usa un identificador UID único e inmutable con firma criptográfica; ningún dato personal se guarda en texto plano en la etiqueta física.</> },
    { title: '5. Tus derechos (Habeas Data)', text: <>Puedes conocer, actualizar, rectificar y suprimir tus datos, o revocar el consentimiento en cualquier momento escribiendo a <b style={{ color: GOLD }}>soporte@ailink.com.co</b> con el asunto «HABEAS DATA - {plateText}».</> },
  ]

  const WARRANTY = [
    { title: '1. Garantía del llavero NFC', text: <>El llavero o sticker inteligente CarLink tiene <b style={{ color: textPrimary }}>garantía de por vida</b> contra defectos de fabricación y desmagnetización. Soporta de -40°C a 120°C, rayos UV, humedad extrema y lavados a presión; si falla la lectura por desgaste, lo reponemos sin costo.</> },
    { title: '2. Cobertura de servicios técnicos', text: <>Las reparaciones registradas bajo tu ficha CarLink cuentan con <b style={{ color: textPrimary }}>12 meses o 15.000 km</b> de cobertura (lo que ocurra primero). La fecha y el kilometraje en la base de datos inmutable son la prueba para cualquier reclamo.</> },
    { title: '3. Exclusiones de la garantía', text: <>Queda sin efecto por: daño derivado de accidentes, colisiones o fuego que destruyan el chip o la antena; manipulación o perforación intencional del dispositivo; o mantenimientos hechos en talleres que no firmen digitalmente en la plataforma.</> },
    { title: '4. Proceso para reclamos', text: <>El conductor acude a un taller de la red; el mecánico escanea la placa con su teléfono y la plataforma valida al instante si el plazo sigue vigente, autorizando el servicio sin tickets físicos ni burocracia.</> },
  ]

  const sections = active === 'privacy' ? PRIVACY : active === 'warranty' ? WARRANTY : []
  const accent = active === 'warranty' ? GREEN : GOLD
  const intro = active === 'privacy'
    ? { icon: Ic.cpu, title: 'Criptografía avanzada en CarLink', text: 'Usamos chips NFC pasivos con seguridad a nivel de circuito integrado. El silicio no contiene datos legibles en texto plano: tu información solo se revela cuando escaneas de forma autorizada en un taller certificado de la red.' }
    : { icon: Ic.wrench, title: 'Garantía automotriz certificada CarLink', text: 'Los talleres de la red se comprometen a respaldar la mano de obra registrada en la plataforma. El kilometraje actúa como sello inmutable de vigencia, con claridad total para ambas partes.' }

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
                      <div style={{ display: 'flex', gap: 14, padding: 16, borderRadius: 16, background: active === 'warranty' ? 'rgba(46,204,113,0.06)' : 'rgba(245,197,24,0.06)', border: `1px solid ${active === 'warranty' ? 'rgba(46,204,113,0.18)' : 'rgba(245,197,24,0.18)'}` }}>
                        <span style={{ flex: '0 0 auto', marginTop: 2 }}>{intro.icon(accent)}</span>
                        <div>
                          <h4 style={{ fontSize: 13.5, fontWeight: 700, margin: '0 0 4px' }}>{intro.title}</h4>
                          <p style={{ fontSize: 12.5, lineHeight: 1.6, color: textSecondary, margin: 0 }}>{intro.text}</p>
                        </div>
                      </div>
                      {sections.map(s => (
                        <div key={s.title}>
                          <h3 style={h3}>{sectionDot(accent)}{s.title}</h3>
                          <p style={body}>{s.text}</p>
                        </div>
                      ))}
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
                          <a href="https://wa.me/573164976104" target="_blank" rel="noreferrer" style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, color: GREEN, background: isDark ? '#000' : 'rgba(0,0,0,0.04)', border: `1px solid ${subtle}`, borderRadius: 9, padding: '9px', textDecoration: 'none' }}>+57 316 497 6104</a>
                          <a href="mailto:soporte@ailink.com.co" style={{ textAlign: 'center', fontSize: 12.5, color: GOLD, textDecoration: 'none' }}>soporte@ailink.com.co</a>
                        </div>
                        <div style={{ padding: 16, borderRadius: 14, background: cardBg, border: `1px solid ${subtle}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <span style={{ ...label, color: GOLD, letterSpacing: '.14em' }}>Autodiagnóstico</span>
                          <p style={{ fontSize: 12, lineHeight: 1.55, color: textMuted, margin: 0 }}>Descarga el estado de tu placa y los registros del sistema para agilizar tu ticket.</p>
                          <button onClick={handleDownload} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', borderRadius: 10, background: 'transparent', border: `1px solid ${subtle}`, color: textPrimary, fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>
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
                <span style={{ padding: '2px 7px', borderRadius: 6, background: cardBg, border: `1px solid ${subtle}`, color: GREEN }}>v1.0</span>
                <span>ID: {plateText}-AES-256</span>
              </div>
              <button onClick={handleDownload} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 11, background: cardBg, border: `1px solid ${subtle}`, color: textPrimary, fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>
                {Ic.download(GOLD)}<span>Descargar documento completo</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
