'use client'

import { useState } from 'react'
import { useWorkshopNotifications } from '@/lib/hooks'
import AdminModal from '@/components/admin/AdminModal'
import { negocioTokens, inputStyle, labelStyle, primaryBtnStyle, ghostBtnStyle, emptyState } from './shared'

const TYPES = ['Recordatorio Cita', 'Inicio Mantenimiento', 'Vehículo Listo', 'Mantenimiento Preventivo Pendiente', 'Presupuesto Aprobación']
const CHANNELS = ['Email', 'WhatsApp', 'SMS']

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  enviado: { label: 'Enviado', color: '#2ecc71' },
  simulado: { label: 'Simulado', color: '#8f8a7a' },
  fallido: { label: 'Fallido', color: '#ff4d6a' },
}

export default function NotificacionesModule({ theme }: { theme: 'light' | 'dark' }) {
  const t = negocioTokens(theme)
  const { notifications, loading, sendNotification } = useWorkshopNotifications()
  const [modal, setModal] = useState(false)

  return (
    <div style={{ animation: 'sectionIn .4s both' }}>
      <div style={{ padding: 14, borderRadius: 12, background: 'rgba(245,197,24,0.06)', border: `1px solid ${t.border}`, marginBottom: 16, fontSize: 12.5, color: t.textMuted }}>
        Solo el canal <b style={{ color: t.textPrimary }}>Email</b> se envía de verdad hoy. WhatsApp/SMS quedan
        registrados como <b style={{ color: t.textPrimary }}>simulado</b> hasta contratar un proveedor.
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => setModal(true)} style={primaryBtnStyle(t)}>+ Enviar notificación</button>
      </div>

      {!loading && notifications.length === 0 && <div style={emptyState(t, 'Sin notificaciones enviadas')} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {notifications.map(n => {
          const st = STATUS_LABEL[n.status] || { label: n.status, color: t.textMuted }
          return (
            <div key={n.id} style={{ padding: '13px 18px', borderRadius: 12, background: t.cardBg, border: `1px solid ${t.subtleBorder}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: t.textPrimary }}>{n.recipient_name} · {n.notification_type}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 10.5, color: t.textMuted }}>{n.channel}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: `${st.color}22`, color: st.color }}>{st.label.toUpperCase()}</span>
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: t.textMuted, marginTop: 4 }}>{n.message}</div>
              <div style={{ fontSize: 10.5, color: t.textMuted, marginTop: 4 }}>{new Date(n.sent_at).toLocaleString('es-CO')}</div>
            </div>
          )
        })}
      </div>

      {modal && (
        <NotificationFormModal t={t} theme={theme} onClose={() => setModal(false)} onSend={async data => { await sendNotification(data); setModal(false) }} />
      )}
    </div>
  )
}

function NotificationFormModal({ t, theme, onClose, onSend }: {
  t: ReturnType<typeof negocioTokens>
  theme: 'light' | 'dark'
  onClose: () => void
  onSend: (data: any) => void
}) {
  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [channel, setChannel] = useState('Email')
  const [type, setType] = useState(TYPES[0])
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const send = async () => {
    if (!recipientName.trim() || !message.trim()) return
    setSending(true)
    await onSend({ recipient_name: recipientName, recipient_phone: recipientPhone, recipient_email: recipientEmail, channel, notification_type: type, message })
    setSending(false)
  }

  return (
    <AdminModal isOpen onClose={onClose} title="Enviar notificación" theme={theme} maxWidth={440}
      footer={<>
        <button onClick={onClose} style={ghostBtnStyle(t)}>Cancelar</button>
        <button onClick={send} disabled={sending || !recipientName.trim() || !message.trim()} style={primaryBtnStyle(t, sending || !recipientName.trim() || !message.trim())}>{sending ? 'Enviando…' : 'Enviar'}</button>
      </>}>
      <div><label style={labelStyle(t)}>Destinatario</label><input style={inputStyle(t)} value={recipientName} onChange={e => setRecipientName(e.target.value)} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div><label style={labelStyle(t)}>Teléfono</label><input style={inputStyle(t)} value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} /></div>
        <div><label style={labelStyle(t)}>Email</label><input style={inputStyle(t)} value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={labelStyle(t)}>Canal</label>
          <select style={inputStyle(t)} value={channel} onChange={e => setChannel(e.target.value)}>
            {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle(t)}>Tipo</label>
          <select style={inputStyle(t)} value={type} onChange={e => setType(e.target.value)}>
            {TYPES.map(ty => <option key={ty} value={ty}>{ty}</option>)}
          </select>
        </div>
      </div>
      <div><label style={labelStyle(t)}>Mensaje</label><textarea rows={3} style={{ ...inputStyle(t), resize: 'vertical' }} value={message} onChange={e => setMessage(e.target.value)} /></div>
      {channel !== 'Email' && (
        <div style={{ fontSize: 11.5, color: t.textMuted }}>Este canal no tiene proveedor contratado — quedará registrado como &quot;simulado&quot;.</div>
      )}
    </AdminModal>
  )
}
