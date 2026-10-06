'use client'

import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { uploadFile } from '@/lib/upload'
import { ServiceTypeIcon } from '@/lib/icons_new'
import ThemedDateInput from '@/components/ThemedDateInput'

/* Carga de historial anterior: servicios hechos ANTES de registrar el vehículo en CarLink.
   Queda marcado como "Anterior declarado", con soporte (foto o PDF del comprobante) obligatorio,
   y no cuenta para sellos ni para próximos servicios. Las reglas reales las aplica el servidor
   (maintenance_rules.py → resolve_prior_date / check_support_url / check_mileage); acá solo se
   evita mandar lo que ya se sabe inválido. */

const TYPES = [
  { id: 'Aceite', label: 'Aceite' },
  { id: 'Aire', label: 'Filtros' },
  { id: 'Combustible', label: 'Combustible' },
  { id: 'Frenos', label: 'Frenos' },
  { id: 'Refrigerante', label: 'Refrigeración' },
  { id: 'Llantas', label: 'Llantas' },
  { id: 'Suspensión', label: 'Suspensión' },
  { id: 'Batería', label: 'Batería' },
  { id: 'Transmisión', label: 'Transmisión' },
  { id: 'Otro', label: 'Otro' },
]

const MAX_FILE_MB = 10

const localISO = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

interface Props {
  vehicleId: string
  /** created_at del vehículo: el historial anterior debe ser de antes de esa fecha. */
  joinedAt?: string
  onClose: () => void
  onSaved: () => void
}

export default function PriorHistoryModal({ vehicleId, joinedAt, onClose, onSaved }: Props) {
  const [type, setType] = useState('')
  const [date, setDate] = useState('')
  const [mileage, setMileage] = useState('')
  const [workshop, setWorkshop] = useState('')
  const [cost, setCost] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Último día válido: la víspera del alta del vehículo en CarLink.
  const maxDate = (() => {
    const j = joinedAt ? new Date(joinedAt) : new Date()
    return localISO(new Date(j.getTime() - 86400000))
  })()

  const fieldStyle = {
    width: '100%', boxSizing: 'border-box' as const, padding: '11px 13px', borderRadius: 10,
    border: '1px solid var(--input-border, rgba(255,255,255,0.14))',
    background: 'var(--input-bg, rgba(255,255,255,0.04))', color: 'var(--text-1)', fontSize: 14, outline: 'none',
  }
  const labelStyle = { fontSize: 11, color: 'var(--text-3)', fontWeight: 600, display: 'block' as const, marginBottom: 5 }
  const km = parseInt(mileage, 10)
  const canSave = !!type && !!date && Number.isFinite(km) && km >= 0 && !!file && !saving

  function pickFile(f: File | null) {
    setError('')
    if (f && f.size > MAX_FILE_MB * 1024 * 1024) { setError(`El archivo supera ${MAX_FILE_MB} MB.`); return }
    setFile(f)
  }

  async function save() {
    if (!canSave || !file) return
    setSaving(true); setError('')
    try {
      const url = await uploadFile(file)
      if (!url) throw new Error('No se pudo subir el soporte. Intenta de nuevo.')
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) throw new Error('Sesión expirada')
      const res = await fetch('/api/maintenance/prior', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: vehicleId, service_type: type, description, mileage: km, date,
          workshop, cost: cost ? parseFloat(cost) : 0, support_url: url,
        }),
      })
      if (!res.ok) {
        let msg = 'No se pudo guardar el servicio.'
        try { const d = (await res.json())?.detail; if (typeof d === 'string') msg = d } catch { /* sin detalle */ }
        throw new Error(msg)
      }
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 72, background: 'rgba(4,4,4,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} className="modal-panel" style={{
        width: 480, maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto', background: 'var(--panel-bg)', color: 'var(--text-1)',
        border: '1px solid rgba(245,197,24,0.3)', borderRadius: 20, padding: 24, boxShadow: '0 40px 90px rgba(0,0,0,.6)',
      }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Cargar historial anterior</div>
        <div style={{ padding: '9px 12px', borderRadius: 10, background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.3)', fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.5, margin: '10px 0 16px' }}>
          Para servicios hechos <b>antes</b> de registrar el vehículo en CarLink. Se marcan como declarados y
          necesitan una foto o PDF del comprobante. Después de 48 horas ya no se pueden eliminar.
        </div>

        <label style={labelStyle}>Tipo de servicio *</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {TYPES.map(t => {
            const sel = type === t.id
            return (
              <button key={t.id} type="button" aria-pressed={sel} onClick={() => setType(t.id)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999, cursor: 'pointer',
                border: `1.5px solid ${sel ? 'rgba(245,197,24,0.45)' : 'var(--input-border, rgba(255,255,255,0.14))'}`,
                background: sel ? 'rgba(245,197,24,0.15)' : 'var(--input-bg, rgba(255,255,255,0.04))',
                color: sel ? '#F5C518' : 'var(--text-3)', fontSize: 12, fontWeight: sel ? 700 : 600,
              }}>
                <ServiceTypeIcon type={t.id} size={14} />{t.label}
              </button>
            )
          })}
        </div>

        <div className="regGrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Fecha del servicio *</label>
            <ThemedDateInput className="date-field" value={date} max={maxDate} onChange={e => setDate(e.target.value)} style={{ height: 40 }} />
          </div>
          <div>
            <label style={labelStyle}>Kilometraje *</label>
            <input type="number" inputMode="numeric" min={0} value={mileage} placeholder="Ej. 30000" onChange={e => setMileage(e.target.value)} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Taller</label>
            <input type="text" value={workshop} placeholder="Nombre del taller" onChange={e => setWorkshop(e.target.value)} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Costo</label>
            <input type="number" inputMode="decimal" min={0} value={cost} placeholder="Opcional" onChange={e => setCost(e.target.value)} style={fieldStyle} />
          </div>
        </div>

        <label style={labelStyle}>Descripción</label>
        <input type="text" value={description} placeholder="Ej. Cambio de aceite y filtro" onChange={e => setDescription(e.target.value)} style={{ ...fieldStyle, marginBottom: 14 }} />

        <label style={labelStyle}>Soporte (foto o PDF del comprobante) *</label>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => pickFile(e.target.files?.[0] || null)} />
        <button type="button" onClick={() => fileRef.current?.click()} style={{
          ...fieldStyle, textAlign: 'left', cursor: 'pointer',
          border: `1px dashed ${file ? 'rgba(245,197,24,0.5)' : 'var(--input-border, rgba(255,255,255,0.14))'}`,
          color: file ? '#F5C518' : 'var(--text-3)', fontWeight: 600,
        }}>
          {file ? file.name : 'Adjuntar foto o PDF'}
        </button>

        {error && <div style={{ fontSize: 12.5, color: '#ff4d6a', marginTop: 12 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button type="button" onClick={onClose} style={{ padding: '12px 18px', borderRadius: 11, border: '1px solid var(--input-border, rgba(255,255,255,0.14))', background: 'var(--input-bg, rgba(255,255,255,0.04))', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={save} disabled={!canSave} style={{
            padding: '12px 24px', borderRadius: 11, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 13,
            cursor: canSave ? 'pointer' : 'not-allowed', opacity: canSave ? 1 : 0.5, boxShadow: '0 0 20px rgba(245,197,24,0.35)',
          }}>
            {saving ? 'Guardando...' : 'Guardar historial'}
          </button>
        </div>
      </div>
    </div>
  )
}
