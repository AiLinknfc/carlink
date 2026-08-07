'use client'

import { useState } from 'react'
import { useWorkshopNotifications } from '@/lib/hooks'
import { workshopApi } from '@/lib/api'
import { negocioTokens, inputStyle, labelStyle, primaryBtnStyle } from './shared'

const TEMPLATES: { label: string; type: string; build: (name: string, plate: string) => string }[] = [
  { label: '🔔 Recordatorio Cita', type: 'Recordatorio Cita', build: (n, p) => `Hola ${n}! Te recordamos tu cita agendada en el taller para el vehículo con placa ${p}. ¡Te esperamos! 🔧` },
  { label: '✅ Vehículo Listo', type: 'Vehículo Listo', build: (n, p) => `Estimado/a ${n}, ¡buenas noticias! 🎉 Tu vehículo (${p}) ya está listo para entrega. Puedes pasar a retirarlo. 🔑` },
  { label: '🔧 Inicio Mantención', type: 'Inicio Mantenimiento', build: (n, p) => `Hola ${n}, te informamos que hemos iniciado los trabajos en tu vehículo (${p}). Te mantendremos informado del progreso. 🛠️` },
  { label: '🗓️ Preventivo pendiente', type: 'Mantenimiento Preventivo Pendiente', build: (n, p) => `Hola ${n}! 🗓️ Es momento de agendar el mantenimiento preventivo de tu vehículo (${p}) para proteger su motor. 🚘` },
  { label: '📋 Presupuesto', type: 'Presupuesto Aprobación', build: (n, p) => `Estimado/a ${n}, hemos completado la revisión técnica de tu vehículo (${p}). Por favor responde para confirmar la autorización del presupuesto. 📋` },
]

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  enviado: { label: 'Enviado', color: '#2ecc71' },
  simulado: { label: 'Simulado', color: '#8f8a7a' },
  fallido: { label: 'Fallido', color: '#ff4d6a' },
}

/* Compositor + historial en la misma pantalla (2/3 + 1/3), no un modal —
   igual que tallerpro/src/components/NotificationsCenter.tsx
   (docs/PLAN_PARIDAD_UI_TALLERPRO.md Fase C.5). */
export default function NotificacionesModule({ theme }: { theme: 'light' | 'dark' }) {
  const t = negocioTokens(theme)
  const { notifications, loading, sendNotification } = useWorkshopNotifications()

  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [channel, setChannel] = useState<'WhatsApp' | 'SMS' | 'Email'>('WhatsApp')
  const [type, setType] = useState(TEMPLATES[0].type)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  const applyTemplate = (tmpl: typeof TEMPLATES[number]) => {
    setType(tmpl.type)
    setMessage(tmpl.build(recipientName || 'cliente', vehiclePlate || 'tu vehículo'))
  }

  // "Mejorar con IA" — igual que tallerpro (NotificationsCenter.tsx:
  // handleGenerateWithAi), pero por el DeepSeek propio de CarLink en vez de
  // Gemini. Si ya hay un borrador (plantilla aplicada o texto propio), la IA
  // lo pule; si el campo está vacío, redacta desde cero con el contexto
  // disponible (tipo de aviso, cliente, placa).
  const improveWithAi = async () => {
    setAiLoading(true)
    setAiError('')
    const result = await workshopApi.aiImproveNotification({
      notification_type: type, client_name: recipientName, vehicle_plate: vehiclePlate, draft: message,
    })
    setAiLoading(false)
    if (result?.message) setMessage(result.message)
    else setAiError('La IA no está disponible ahora mismo — probá con una plantilla.')
  }

  const send = async () => {
    if (!recipientName.trim() || !message.trim()) return
    setSending(true)
    setSent(false)
    const result = await sendNotification({
      recipient_name: recipientName, recipient_phone: recipientPhone, recipient_email: recipientEmail,
      channel, notification_type: type, message,
    })
    setSending(false)
    if (result) {
      setSent(true)
      setTimeout(() => setSent(false), 2500)
      // Igual que tallerpro: WhatsApp abre wa.me con el mensaje ya listo.
      if (channel === 'WhatsApp' && recipientPhone) {
        window.open(`https://wa.me/${recipientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank')
      }
    }
  }

  return (
    <div style={{ animation: 'sectionIn .4s both', display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(240px,1fr)', gap: 20, alignItems: 'start' }}>
      {/* Compositor */}
      <div style={{ padding: 20, borderRadius: 16, background: negocioTokens(theme).cardBg, border: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: t.gold, fontWeight: 700 }}>Redactar y enviar</div>
          {/* "Mejorar con IA" — igual que tallerpro (NotificationsCenter.tsx),
              con el DeepSeek propio de CarLink en vez de Gemini. */}
          <button onClick={improveWithAi} disabled={aiLoading} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10, border: 'none',
            background: t.gold, color: '#111', fontSize: 11.5, fontWeight: 800, cursor: aiLoading ? 'default' : 'pointer',
            opacity: aiLoading ? 0.6 : 1, flex: '0 0 auto',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9z" /><path d="M19 15l.8 2.3L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.7z" /></svg>
            {aiLoading ? 'Redactando…' : 'Mejorar con IA'}
          </button>
        </div>
        {aiError && <div style={{ fontSize: 11.5, color: t.danger, marginTop: -8 }}>{aiError}</div>}
        <div style={{ fontSize: 12, color: t.textMuted, marginTop: -8 }}>
          Solo el canal <b style={{ color: t.textPrimary }}>Email</b> se envía de verdad hoy. WhatsApp abre directo con el mensaje listo (tú lo mandas); SMS queda registrado como <b style={{ color: t.textPrimary }}>simulado</b> hasta contratar un proveedor.
        </div>

        <div>
          <label style={labelStyle(t)}>Plantillas rápidas</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {TEMPLATES.map(tmpl => (
              <button key={tmpl.type} onClick={() => applyTemplate(tmpl)} style={{
                padding: '7px 12px', borderRadius: 10, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', border: 'none',
                background: type === tmpl.type ? t.gold : t.subtleBorder, color: type === tmpl.type ? '#111' : t.textSecondary,
              }}>{tmpl.label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={labelStyle(t)}>Cliente</label><input style={inputStyle(t)} value={recipientName} onChange={e => setRecipientName(e.target.value)} /></div>
          <div><label style={labelStyle(t)}>Placa</label><input style={inputStyle(t)} value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value.toUpperCase())} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={labelStyle(t)}>Teléfono (WhatsApp)</label><input style={inputStyle(t)} value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} /></div>
          <div><label style={labelStyle(t)}>Email</label><input style={inputStyle(t)} value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} /></div>
        </div>

        <div>
          <label style={labelStyle(t)}>Canal de envío</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['WhatsApp', 'SMS', 'Email'] as const).map(ch => (
              <button key={ch} onClick={() => setChannel(ch)} style={{
                flex: 1, padding: '9px 0', borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                border: `1px solid ${channel === ch ? t.gold : t.subtleBorder}`,
                background: channel === ch ? 'rgba(245,197,24,0.14)' : 'transparent',
                color: channel === ch ? t.gold : t.textSecondary,
              }}>{ch}</button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle(t)}>Mensaje</label>
          <textarea rows={4} style={{ ...inputStyle(t), resize: 'vertical' }} value={message} onChange={e => setMessage(e.target.value)} placeholder="Elige una plantilla o escribe tu propio mensaje…" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={send} disabled={sending || !recipientName.trim() || !message.trim()} style={primaryBtnStyle(t, sending || !recipientName.trim() || !message.trim())}>
            {sending ? 'Enviando…' : channel === 'WhatsApp' ? 'Enviar por WhatsApp' : 'Enviar notificación'}
          </button>
          {sent && <span style={{ fontSize: 12.5, color: t.success, fontWeight: 700 }}>¡Enviada!</span>}
        </div>
      </div>

      {/* Historial */}
      <div style={{ padding: 18, borderRadius: 16, background: t.cardBg, border: `1px solid ${t.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: `1px solid ${t.subtleBorder}`, marginBottom: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: t.textPrimary }}>Historial de envíos</div>
          <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, background: t.subtleBorder, padding: '3px 9px', borderRadius: 999 }}>{notifications.length}</span>
        </div>
        <div style={{ maxHeight: 480, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {!loading && notifications.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 8px', color: t.textMuted, fontSize: 12.5 }}>No hay envíos registrados aún</div>
          )}
          {notifications.map(n => {
            const st = STATUS_LABEL[n.status] || { label: n.status, color: t.textMuted }
            return (
              <div key={n.id} style={{ padding: '10px 2px', borderTop: `1px solid ${t.subtleBorder}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: t.textPrimary }}>{n.recipient_name}</span>
                  <span style={{ fontSize: 10, color: t.textMuted }}>{new Date(n.sent_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: t.success, background: 'rgba(46,204,113,0.1)', padding: '2px 6px', borderRadius: 5 }}>{n.channel}</span>
                  <span style={{ fontSize: 10.5, color: t.textMuted }}>{n.notification_type}</span>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: st.color, marginLeft: 'auto' }}>{st.label.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4, fontStyle: 'italic', background: t.subtleBorder, padding: 7, borderRadius: 8, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  &quot;{n.message}&quot;
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
