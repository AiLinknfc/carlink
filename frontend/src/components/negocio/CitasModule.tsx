'use client'

import { useState } from 'react'
import { useAppointments, useWorkshopNotifications } from '@/lib/hooks'
import type { Appointment } from '@/lib/types'
import AdminModal from '@/components/admin/AdminModal'
import { negocioTokens, inputStyle, labelStyle, primaryBtnStyle, ghostBtnStyle, emptyState, SERVICE_CATEGORIES } from './shared'

const STATUS_COLOR: Record<string, string> = {
  'Pendiente': '#8f8a7a', 'Confirmada': '#3aa0ff', 'Completada': '#2ecc71', 'Cancelada': '#ff4d6a',
}

/* Grid de cards (no lista de filas) + filtro rápido por fecha + búsqueda —
   igual que tallerpro/src/components/AppointmentsManager.tsx
   (docs/PLAN_PARIDAD_UI_TALLERPRO.md Fase C.4). */
export default function CitasModule({ theme, onConverted }: {
  theme: 'light' | 'dark'
  /** Igual que tallerpro (AppointmentsManager → App.handleConvertAppointment):
   * al convertir, navega a Órdenes y abre de inmediato el detalle de la
   * orden recién creada — con los datos del cliente/vehículo, para que el
   * taller la complete (mano de obra, repuestos, fotos) ahí mismo, en vez
   * de solo crear una orden vacía en silencio. */
  onConverted?: (orderId: string) => void
}) {
  const t = negocioTokens(theme)
  const { appointments, loading, addAppointment, updateAppointment, deleteAppointment, convertAppointment } = useAppointments()
  const { sendNotification } = useWorkshopNotifications()
  const [modal, setModal] = useState(false)
  const [converting, setConverting] = useState<string | null>(null)
  const [notifying, setNotifying] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow'>('all')
  const [search, setSearch] = useState('')

  const todayStr = new Date().toISOString().slice(0, 10)
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

  const sorted = [...appointments].sort((a, b) => (a.appointment_date + a.time_slot).localeCompare(b.appointment_date + b.time_slot))
  const filtered = sorted.filter(a => {
    if (dateFilter === 'today' && a.appointment_date !== todayStr) return false
    if (dateFilter === 'tomorrow' && a.appointment_date !== tomorrowStr) return false
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return a.client_name.toLowerCase().includes(q) || a.vehicle_plate.toLowerCase().includes(q)
  })

  const handleConvert = async (id: string) => {
    setConverting(id)
    setError('')
    const result = await convertAppointment(id)
    setConverting(null)
    if (result) onConverted?.(result.id)
    else setError('No se pudo convertir la cita en orden')
  }

  const handleNotify = async (a: Appointment) => {
    setNotifying(a.id)
    await sendNotification({
      recipient_name: a.client_name, recipient_phone: a.client_phone, recipient_email: a.client_email,
      channel: 'WhatsApp', notification_type: 'Recordatorio Cita',
      message: `Hola ${a.client_name}, te recordamos tu cita del ${a.appointment_date} a las ${a.time_slot} para ${a.service_category || 'tu vehículo'} (${a.vehicle_plate}).`,
    })
    setNotifying(null)
  }

  return (
    <div style={{ animation: 'sectionIn .4s both' }}>
      {/* Filtro rápido por fecha + búsqueda — igual que tallerpro */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {([['all', 'Todas las citas'], ['today', `Hoy (${todayStr})`], ['tomorrow', 'Mañana']] as const).map(([val, label]) => (
            <button key={val} onClick={() => setDateFilter(val)} style={{
              padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none',
              background: dateFilter === val ? t.gold : t.subtleBorder, color: dateFilter === val ? '#111' : t.textSecondary,
            }}>{label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: '1 1 260px', maxWidth: 340 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: t.textMuted }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por cliente o placa…" style={{ ...inputStyle(t), paddingLeft: 30 }} />
          </div>
          <button onClick={() => setModal(true)} style={{ ...primaryBtnStyle(t), whiteSpace: 'nowrap' }}>+ Nueva cita</button>
        </div>
      </div>

      {error && <div style={{ color: t.danger, fontSize: 12.5, marginBottom: 10 }}>{error}</div>}
      {!loading && sorted.length === 0 && <div style={emptyState(t, 'Sin citas agendadas')} />}
      {!loading && sorted.length > 0 && filtered.length === 0 && <div style={emptyState(t, 'Ninguna cita coincide con el filtro')} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {filtered.map(a => (
          <div key={a.id} style={{
            padding: 18, borderRadius: 16, background: t.cardBg, border: `1px solid ${t.border}`,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: `1px solid ${t.subtleBorder}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: t.success, background: 'rgba(46,204,113,0.1)', padding: '3px 8px', borderRadius: 6 }}>{a.time_slot}</span>
                <span style={{ fontSize: 11.5, color: t.textMuted, fontWeight: 600 }}>{new Date(a.appointment_date + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</span>
              </div>
              <span style={{ fontSize: 9.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: `${STATUS_COLOR[a.status] || t.textMuted}22`, color: STATUS_COLOR[a.status] || t.textMuted }}>{a.status}</span>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: t.textPrimary, background: t.subtleBorder, padding: '2px 7px', borderRadius: 6 }}>{a.vehicle_plate}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>{a.vehicle_model}</span>
              </div>
              <div style={{ fontSize: 12.5, color: t.textSecondary, marginTop: 4 }}>{a.client_name}</div>
              {a.client_phone && <div style={{ fontSize: 11.5, color: t.textMuted }}>📞 {a.client_phone}</div>}
            </div>

            <div style={{ padding: 10, borderRadius: 10, background: t.subtleBorder }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.textSecondary }}>{a.service_category || 'Servicio general'}</div>
              {a.notes && <div style={{ fontSize: 11.5, color: t.textMuted, marginTop: 3, fontStyle: 'italic' }}>{a.notes}</div>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 10, borderTop: `1px solid ${t.subtleBorder}` }}>
              <button onClick={() => handleNotify(a)} disabled={notifying === a.id} style={{ background: 'transparent', border: 'none', color: '#3aa0ff', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, padding: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                {notifying === a.id ? 'Enviando…' : 'Avisar'}
              </button>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {a.status !== 'Completada' && !a.converted_to_work_order_id && (
                  <button onClick={() => handleConvert(a.id)} disabled={converting === a.id} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, border: 'none',
                    background: t.gold, color: '#111', fontSize: 11.5, fontWeight: 800, cursor: 'pointer',
                  }}>
                    {converting === a.id ? '…' : 'Convertir a orden'}
                  </button>
                )}
                <button onClick={() => deleteAppointment(a.id)} title="Eliminar" style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', padding: 4 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" /></svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <AppointmentFormModal t={t} theme={theme} onClose={() => setModal(false)} onSave={async data => { await addAppointment(data); setModal(false) }} />
      )}
    </div>
  )
}

function AppointmentFormModal({ t, theme, onClose, onSave }: {
  t: ReturnType<typeof negocioTokens>
  theme: 'light' | 'dark'
  onClose: () => void
  onSave: (data: Partial<Appointment> & { client_name: string; appointment_date: string; time_slot: string }) => void
}) {
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [vehicleModel, setVehicleModel] = useState('')
  const [serviceCategory, setServiceCategory] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState('09:00')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!clientName.trim() || !date || !time) return
    setSaving(true)
    await onSave({
      client_name: clientName, client_phone: clientPhone, vehicle_plate: vehiclePlate.toUpperCase(),
      vehicle_model: vehicleModel, service_category: serviceCategory, notes,
      appointment_date: date, time_slot: time,
    })
    setSaving(false)
  }

  return (
    <AdminModal isOpen onClose={onClose} title="Nueva cita" theme={theme} maxWidth={440}
      footer={<>
        <button onClick={onClose} style={ghostBtnStyle(t)}>Cancelar</button>
        <button onClick={save} disabled={saving || !clientName.trim()} style={primaryBtnStyle(t, saving || !clientName.trim())}>{saving ? 'Guardando…' : 'Agendar'}</button>
      </>}>
      <div><label style={labelStyle(t)}>Cliente</label><input style={inputStyle(t)} value={clientName} onChange={e => setClientName(e.target.value)} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div><label style={labelStyle(t)}>Teléfono</label><input style={inputStyle(t)} value={clientPhone} onChange={e => setClientPhone(e.target.value)} /></div>
        <div><label style={labelStyle(t)}>Placa</label><input style={inputStyle(t)} value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value)} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div><label style={labelStyle(t)}>Modelo</label><input style={inputStyle(t)} value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} /></div>
        <div>
          <label style={labelStyle(t)}>Servicio</label>
          <input style={inputStyle(t)} list="service-categories" value={serviceCategory} onChange={e => setServiceCategory(e.target.value)} placeholder="Frenos, Aceite…" />
          <datalist id="service-categories">{SERVICE_CATEGORIES.map(c => <option key={c} value={c} />)}</datalist>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div><label style={labelStyle(t)}>Fecha</label><input type="date" style={inputStyle(t)} value={date} onChange={e => setDate(e.target.value)} /></div>
        <div><label style={labelStyle(t)}>Hora</label><input type="time" style={inputStyle(t)} value={time} onChange={e => setTime(e.target.value)} /></div>
      </div>
      <div><label style={labelStyle(t)}>Notas</label><textarea rows={2} style={{ ...inputStyle(t), resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} /></div>
    </AdminModal>
  )
}
