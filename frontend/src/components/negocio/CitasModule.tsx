'use client'

import { useState } from 'react'
import { useAppointments } from '@/lib/hooks'
import type { Appointment } from '@/lib/types'
import AdminModal from '@/components/admin/AdminModal'
import { negocioTokens, inputStyle, labelStyle, primaryBtnStyle, ghostBtnStyle, emptyState, SERVICE_CATEGORIES } from './shared'

const STATUS_COLOR: Record<string, string> = {
  'Pendiente': '#8f8a7a', 'Confirmada': '#3aa0ff', 'Completada': '#2ecc71', 'Cancelada': '#ff4d6a',
}

export default function CitasModule({ theme, onConverted }: { theme: 'light' | 'dark'; onConverted?: () => void }) {
  const t = negocioTokens(theme)
  const { appointments, loading, addAppointment, updateAppointment, deleteAppointment, convertAppointment } = useAppointments()
  const [modal, setModal] = useState(false)
  const [converting, setConverting] = useState<string | null>(null)
  const [error, setError] = useState('')

  const sorted = [...appointments].sort((a, b) => (a.appointment_date + a.time_slot).localeCompare(b.appointment_date + b.time_slot))

  const handleConvert = async (id: string) => {
    setConverting(id)
    setError('')
    const result = await convertAppointment(id)
    setConverting(null)
    if (result) onConverted?.()
    else setError('No se pudo convertir la cita en orden')
  }

  return (
    <div style={{ animation: 'sectionIn .4s both' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => setModal(true)} style={primaryBtnStyle(t)}>+ Nueva cita</button>
      </div>

      {error && <div style={{ color: t.danger, fontSize: 12.5, marginBottom: 10 }}>{error}</div>}
      {!loading && sorted.length === 0 && <div style={emptyState(t, 'Sin citas agendadas')} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map(a => (
          <div key={a.id} style={{
            display: 'grid', gridTemplateColumns: '120px minmax(160px,1fr) 130px 110px', gap: 14, alignItems: 'center',
            padding: '14px 18px', borderRadius: 12, background: t.cardBg, border: `1px solid ${t.subtleBorder}`,
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: t.textPrimary }}>{new Date(a.appointment_date + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</div>
              <div style={{ fontSize: 11.5, color: t.textMuted }}>{a.time_slot}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary }}>{a.client_name}</div>
              <div style={{ fontSize: 11.5, color: t.textMuted }}>{a.vehicle_plate} · {a.service_category}</div>
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: `${STATUS_COLOR[a.status] || t.textMuted}22`, color: STATUS_COLOR[a.status] || t.textMuted }}>{a.status}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {!a.converted_to_work_order_id && a.status !== 'Cancelada' && (
                <button onClick={() => handleConvert(a.id)} disabled={converting === a.id} style={{ ...ghostBtnStyle(t), padding: '6px 12px', fontSize: 11.5 }}>
                  {converting === a.id ? '…' : 'Convertir'}
                </button>
              )}
              {a.status !== 'Cancelada' && !a.converted_to_work_order_id && (
                <button onClick={() => updateAppointment(a.id, { status: 'Cancelada' })} style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              )}
              <button onClick={() => deleteAppointment(a.id)} style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" /></svg>
              </button>
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
