'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

/* ── Service type definitions ── */
const SERVICE_TYPES = [
  {
    id: 'Aceite',
    label: 'Cambio de aceite',
    icon: '🛢️',
    fields: [
      { key: 'lubricant_brand', label: 'Marca del aceite', type: 'text', placeholder: 'Ej. Mobil 1' },
      { key: 'lubricant_type', label: 'Tipo / viscosidad', type: 'text', placeholder: 'Ej. 5W-30' },
      { key: 'oil_filter', label: 'Filtro de aceite', type: 'checkbox' },
      { key: 'next_service_mileage', label: 'Próximo servicio (km)', type: 'number', placeholder: 'Ej. 15000' },
    ],
  },
  {
    id: 'Aire',
    label: 'Filtro de aire',
    icon: '💨',
    fields: [
      { key: 'air_filter', label: 'Filtro de aire reemplazado', type: 'checkbox' },
      { key: 'air_flow', label: 'Flujo de aire verificado', type: 'checkbox' },
    ],
  },
  {
    id: 'Combustible',
    label: 'Sistema de combustible',
    icon: '⛽',
    fields: [
      { key: 'fuel_filter', label: 'Filtro de combustible', type: 'checkbox' },
      { key: 'injection_check', label: 'Inyección revisada', type: 'checkbox' },
    ],
  },
  {
    id: 'Frenos',
    label: 'Sistema de frenos',
    icon: '🔧',
    fields: [
      { key: 'brake_pads', label: 'Pastillas', type: 'select', options: ['OK', 'Desgaste medio', 'Reemplazar'] },
      { key: 'brake_discs', label: 'Discos', type: 'select', options: ['OK', 'Desgaste medio', 'Reemplazar'] },
      { key: 'brake_fluid', label: 'Líquido de frenos', type: 'checkbox' },
    ],
  },
  {
    id: 'Refrigerante',
    label: 'Sistema de refrigeración',
    icon: '🌡️',
    fields: [
      { key: 'coolant_level', label: 'Nivel de refrigerante', type: 'select', options: ['OK', 'Bajo', 'Reemplazar'] },
      { key: 'coolant_temp', label: 'Temperatura', type: 'select', options: ['Normal', 'Alta', 'Baja'] },
    ],
  },
  {
    id: 'Llantas',
    label: 'Llantas',
    icon: '⚙️',
    fields: [
      { key: 'tire_pressure', label: 'Presión verificada', type: 'checkbox' },
      { key: 'tire_rotation', label: 'Rotación realizada', type: 'checkbox' },
      { key: 'tire_tread', label: 'Labrado', type: 'select', options: ['OK', 'Desgaste medio', 'Reemplazar'] },
    ],
  },
  {
    id: 'Suspensión',
    label: 'Suspensión',
    icon: '🔩',
    fields: [
      { key: 'suspension_check', label: 'Revisión general', type: 'checkbox' },
      { key: 'shock_absorbers', label: 'Amortiguadores', type: 'select', options: ['OK', 'Desgaste medio', 'Reemplazar'] },
    ],
  },
  {
    id: 'Batería',
    label: 'Batería / eléctrico',
    icon: '🔋',
    fields: [
      { key: 'battery_check', label: 'Batería verificada', type: 'checkbox' },
      { key: 'battery_voltage', label: 'Voltaje', type: 'text', placeholder: 'Ej. 12.6V' },
    ],
  },
  {
    id: 'Transmisión',
    label: 'Transmisión',
    icon: '🔧',
    fields: [
      { key: 'transmission_oil', label: 'Aceite de transmisión', type: 'checkbox' },
      { key: 'transmission_check', label: 'Revisión general', type: 'checkbox' },
    ],
  },
  {
    id: 'Otro',
    label: 'Otro servicio',
    icon: '📋',
    fields: [
      { key: 'custom_service', label: 'Describe el servicio', type: 'text', placeholder: 'Ej. Alineación y balanceo' },
    ],
  },
]

const SERVICE_ICONS: Record<string, string> = {
  Aceite: '🛢️', Aire: '💨', Combustible: '⛽', Frenos: '🔧',
  Refrigerante: '🌡️', Llantas: '⚙️', Suspensión: '🔩', Batería: '🔋',
  Transmisión: '🔧', Otro: '📋',
}

function buildDescription(type: string, extra: Record<string, any>): string {
  const parts: string[] = []
  if (type === 'Aceite') {
    if (extra.lubricant_brand) parts.push(`Aceite ${extra.lubricant_brand}`)
    if (extra.lubricant_type) parts.push(extra.lubricant_type)
    if (extra.oil_filter) parts.push('Filtro de aceite cambiado')
    return parts.join(' · ') || 'Cambio de aceite'
  }
  if (type === 'Aire') {
    if (extra.air_filter) parts.push('Filtro de aire reemplazado')
    if (extra.air_flow) parts.push('Flujo verificado')
    return parts.join(' · ') || 'Servicio de filtro de aire'
  }
  if (type === 'Combustible') {
    if (extra.fuel_filter) parts.push('Filtro de combustible')
    if (extra.injection_check) parts.push('Inyección revisada')
    return parts.join(' · ') || 'Servicio de combustible'
  }
  if (type === 'Frenos') {
    if (extra.brake_pads) parts.push(`Pastillas: ${extra.brake_pads}`)
    if (extra.brake_discs) parts.push(`Discos: ${extra.brake_discs}`)
    if (extra.brake_fluid) parts.push('Líquido de frenos')
    return parts.join(' · ') || 'Revisión de frenos'
  }
  if (type === 'Refrigerante') {
    if (extra.coolant_level) parts.push(`Nivel: ${extra.coolant_level}`)
    if (extra.coolant_temp) parts.push(`Temperatura: ${extra.coolant_temp}`)
    return parts.join(' · ') || 'Revisión de refrigerante'
  }
  if (type === 'Llantas') {
    if (extra.tire_pressure) parts.push('Presión verificada')
    if (extra.tire_rotation) parts.push('Rotación')
    if (extra.tire_tread) parts.push(`Labrado: ${extra.tire_tread}`)
    return parts.join(' · ') || 'Servicio de llantas'
  }
  if (type === 'Suspensión') {
    if (extra.suspension_check) parts.push('Revisión general')
    if (extra.shock_absorbers) parts.push(`Amortiguadores: ${extra.shock_absorbers}`)
    return parts.join(' · ') || 'Revisión de suspensión'
  }
  if (type === 'Batería') {
    if (extra.battery_check) parts.push('Batería verificada')
    if (extra.battery_voltage) parts.push(`Voltaje: ${extra.battery_voltage}`)
    return parts.join(' · ') || 'Revisión de batería'
  }
  if (type === 'Transmisión') {
    if (extra.transmission_oil) parts.push('Aceite de transmisión')
    if (extra.transmission_check) parts.push('Revisión general')
    return parts.join(' · ') || 'Revisión de transmisión'
  }
  if (type === 'Otro' && extra.custom_service) return extra.custom_service
  return 'Servicio de mantenimiento'
}

interface Props {
  vehicleId: string
  editRecord?: any
  onClose: () => void
  onSaved: () => void
}

export default function ServiceFormModal({ vehicleId, editRecord, onClose, onSaved }: Props) {
  const [step, setStep] = useState<'type' | 'form'>(editRecord ? 'form' : 'type')
  const [serviceType, setServiceType] = useState(editRecord?.service_type || '')
  const [mileage, setMileage] = useState(editRecord?.mileage?.toString() || '')
  const [date, setDate] = useState(editRecord?.date ? editRecord.date.slice(0, 10) : new Date().toISOString().slice(0, 10))
  const [workshop, setWorkshop] = useState(editRecord?.workshop || '')
  const [workshopId, setWorkshopId] = useState(editRecord?.workshop_id || '')
  const [wsResults, setWsResults] = useState<any[]>([])
  const [wsSearching, setWsSearching] = useState(false)
  const [showWsDropdown, setShowWsDropdown] = useState(false)
  const wsTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const wsRef = useRef<HTMLDivElement>(null)
  const [cost, setCost] = useState(editRecord?.cost?.toString() || '')
  const [extra, setExtra] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const modalRef = useRef<HTMLDivElement>(null)

  /* Parse description into extra fields when editing */
  useEffect(() => {
    if (!editRecord) return
    const desc = (editRecord.description || '').toLowerCase()
    const e: Record<string, any> = {}
    if (desc.includes('filtro de aceite') || desc.includes('filtro aceite')) e.oil_filter = true
    if (desc.includes('filtro de aire') || desc.includes('flujo verific')) e.air_filter = true; e.air_flow = true
    if (desc.includes('filtro de combustible')) e.fuel_filter = true
    if (desc.includes('inyección') || desc.includes('inyeccion')) e.injection_check = true
    if (desc.includes('pastillas')) e.brake_pads = 'Desgaste medio'
    if (desc.includes('discos')) e.brake_discs = 'Desgaste medio'
    if (desc.includes('líquido') || desc.includes('liquido')) e.brake_fluid = true
    if (desc.includes('nivel')) e.coolant_level = 'OK'
    if (desc.includes('temperatura')) e.coolant_temp = 'Normal'
    if (desc.includes('presión') || desc.includes('presion')) e.tire_pressure = true
    if (desc.includes('rotación') || desc.includes('rotacion')) e.tire_rotation = true
    if (desc.includes('labrado')) e.tire_tread = 'OK'
    e.lubricant_brand = editRecord.lubricant_brand || ''
    e.lubricant_type = editRecord.lubricant_type || ''
    e.next_service_mileage = editRecord.next_service_mileage?.toString() || ''
    setExtra(e)
  }, [editRecord])

  /* Workshop search with debounce */
  const searchWorkshops = useCallback(async (q: string) => {
    if (q.length < 2) { setWsResults([]); setShowWsDropdown(false); return }
    setWsSearching(true)
    try {
      const res = await fetch(`/api/workshops/search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setWsResults(data)
        setShowWsDropdown(data.length > 0)
      }
    } catch {}
    setWsSearching(false)
  }, [])

  const handleWsInput = (val: string) => {
    setWorkshop(val)
    setWorkshopId('')
    clearTimeout(wsTimeout.current)
    wsTimeout.current = setTimeout(() => searchWorkshops(val), 250)
    setShowWsDropdown(true)
  }

  const selectWorkshop = (ws: any) => {
    setWorkshop(ws.name)
    setWorkshopId(ws.id)
    setShowWsDropdown(false)
    setWsResults([])
  }

  /* Close dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wsRef.current && !wsRef.current.contains(e.target as Node)) {
        setShowWsDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function setField(key: string, val: any) {
    setExtra(prev => ({ ...prev, [key]: val }))
  }

  async function handleSave() {
    if (!serviceType) { setError('Selecciona un tipo de servicio'); return }
    if (!mileage) { setError('Ingresa el kilometraje'); return }
    setSaving(true); setError('')

    const desc = buildDescription(serviceType, extra)
    const body: Record<string, any> = {
      vehicle_id: vehicleId,
      service_type: serviceType,
      description: desc,
      mileage: parseInt(mileage),
      date,
      workshop: workshop || 'Taller no registrado',
      workshop_id: workshopId || null,
      cost: cost ? parseFloat(cost) : 0,
      lubricant_brand: extra.lubricant_brand || '',
      lubricant_type: extra.lubricant_type || '',
      next_service_mileage: extra.next_service_mileage ? parseInt(extra.next_service_mileage) : null,
    }

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) throw new Error('No token')

      const url = editRecord
        ? `/api/maintenance/${editRecord.id}`
        : '/api/maintenance'
      const method = editRecord ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await res.text())
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editRecord) return
    if (!confirm('¿Eliminar este servicio?')) return
    setSaving(true)
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) throw new Error('No token')
      const res = await fetch(`/api/maintenance/${editRecord.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(await res.text())
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e.message || 'Error al eliminar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 72,
      background: 'rgba(4,4,4,0.72)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div ref={modalRef} onClick={e => e.stopPropagation()} style={{
        width: 540, maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto',
        background: '#141414', border: '1px solid rgba(245,197,24,0.3)',
        borderRadius: 22, padding: 24,
        boxShadow: '0 40px 90px rgba(0,0,0,.6)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(245,197,24,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              {serviceType ? SERVICE_ICONS[serviceType] || '📋' : '🔧'}
            </span>
            <div>
              <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 20, textTransform: 'uppercase', lineHeight: 1 }}>
                {editRecord ? 'Editar servicio' : 'Nuevo servicio'}
              </div>
              <div style={{ fontSize: 11, color: '#7c786e', marginTop: 2 }}>
                {editRecord ? `#${editRecord.id?.slice(0, 8)}` : 'Registra un servicio'}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 34, height: 34, borderRadius: 9,
            border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)',
            color: '#b6b2a6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Step 1: choose type */}
        {step === 'type' && (
          <div>
            <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, marginBottom: 12 }}>
              Selecciona el tipo de servicio
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {SERVICE_TYPES.map(st => (
                <button key={st.id} onClick={() => { setServiceType(st.id); setStep('form') }} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                  borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#f5f3ec', fontSize: 14, fontWeight: 600, transition: 'all .15s',
                }}>
                  <span style={{ fontSize: 20 }}>{st.icon}</span>
                  <span>{st.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: fill form */}
        {step === 'form' && (
          <div>
            {/* Service type (editable) */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#9a968a', fontWeight: 600, display: 'block', marginBottom: 5 }}>Tipo de servicio</label>
              <select value={serviceType} onChange={e => setServiceType(e.target.value)} style={{
                width: '100%', padding: '11px 13px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)',
                color: '#f5f3ec', fontSize: 14, outline: 'none', cursor: 'pointer',
              }}>
                {SERVICE_TYPES.map(st => (
                  <option key={st.id} value={st.id}>{st.label}</option>
                ))}
              </select>
            </div>

            {/* Type-specific fields */}
            {(() => {
              const stDef = SERVICE_TYPES.find(st => st.id === serviceType)
              if (!stDef) return null
              return (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#F5C518', fontWeight: 700, marginBottom: 10 }}>
                    Detalles — {stDef.label}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {stDef.fields.map((f: any) => {
                      if (f.type === 'checkbox') {
                        return (
                          <label key={f.key} style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px',
                            borderRadius: 10, background: 'rgba(255,255,255,0.03)',
                            border: `1px solid ${extra[f.key] ? 'rgba(245,197,24,0.4)' : 'rgba(255,255,255,0.1)'}`,
                            cursor: 'pointer', fontSize: 13, color: '#d8d4c8', fontWeight: 500,
                            transition: 'all .15s',
                          }}>
                            <input type="checkbox" checked={!!extra[f.key]} onChange={e => setField(f.key, e.target.checked)}
                              style={{ width: 17, height: 17, accentColor: '#F5C518', cursor: 'pointer' }} />
                            {f.label}
                          </label>
                        )
                      }
                      if (f.type === 'select') {
                        return (
                          <div key={f.key}>
                            <label style={{ fontSize: 11, color: '#9a968a', fontWeight: 600, display: 'block', marginBottom: 5 }}>{f.label}</label>
                            <select value={extra[f.key] || ''} onChange={e => setField(f.key, e.target.value)} style={{
                              width: '100%', padding: '11px 13px', borderRadius: 10,
                              border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)',
                              color: '#f5f3ec', fontSize: 14, outline: 'none', cursor: 'pointer',
                            }}>
                              <option value="">Seleccionar…</option>
                              {f.options?.map((o: string) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </div>
                        )
                      }
                      return (
                        <div key={f.key}>
                          <label style={{ fontSize: 11, color: '#9a968a', fontWeight: 600, display: 'block', marginBottom: 5 }}>{f.label}</label>
                          <input type={f.type} value={extra[f.key] || ''} onChange={e => setField(f.key, e.target.value)}
                            placeholder={f.placeholder} style={{
                              width: '100%', padding: '11px 13px', borderRadius: 10,
                              border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)',
                              color: '#f5f3ec', fontSize: 14, outline: 'none',
                            }} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            {/* Common fields */}
            <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, marginBottom: 12 }}>Datos generales</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: '#9a968a', fontWeight: 600, display: 'block', marginBottom: 5 }}>Kilometraje *</label>
                <input type="number" value={mileage} onChange={e => setMileage(e.target.value)}
                  placeholder="Ej. 50000" style={{
                    width: '100%', padding: '11px 13px', borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)',
                    color: '#f5f3ec', fontSize: 14, outline: 'none',
                  }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#9a968a', fontWeight: 600, display: 'block', marginBottom: 5 }}>Fecha</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{
                  width: '100%', padding: '11px 13px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)',
                  color: '#f5f3ec', fontSize: 14, outline: 'none',
                }} />
              </div>
              <div ref={wsRef} style={{ position: 'relative' }}>
                <label style={{ fontSize: 11, color: '#9a968a', fontWeight: 600, display: 'block', marginBottom: 5 }}>Taller</label>
                <div style={{ position: 'relative' }}>
                  <input type="text" value={workshop} onChange={e => handleWsInput(e.target.value)}
                    onFocus={() => { if (wsResults.length > 0) setShowWsDropdown(true) }}
                    placeholder="Nombre o código TLR-XXXXX"
                    style={{
                      width: '100%', padding: '11px 13px', borderRadius: 10,
                      border: workshopId ? '1px solid rgba(46,204,113,0.5)' : '1px solid rgba(255,255,255,0.14)',
                      background: 'rgba(255,255,255,0.04)',
                      color: '#f5f3ec', fontSize: 14, outline: 'none',
                    }} />
                  {wsSearching && (
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(245,197,24,0.2)', borderTopColor: '#F5C518', animation: 'spin .6s linear infinite', display: 'inline-block' }} />
                  )}
                </div>
                {showWsDropdown && wsResults.length > 0 && (
                  <div style={{
                    position: 'absolute', zIndex: 80, top: '100%', left: 0, right: 0, marginTop: 4,
                    background: '#1a1a1e', border: '1px solid rgba(245,197,24,0.2)', borderRadius: 10,
                    maxHeight: 200, overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,.6)',
                  }}>
                    {wsResults.map(ws => (
                      <button key={ws.id} onClick={() => selectWorkshop(ws)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 13px',
                          background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)',
                          color: '#f5f3ec', fontSize: 13, cursor: 'pointer', textAlign: 'left',
                        }}>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#F5C518', fontWeight: 700, flex: '0 0 auto' }}>{ws.code}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>
                            {ws.name}
                            {ws.is_verified && <span style={{ color: '#2ecc71', marginLeft: 4 }}>✓</span>}
                          </div>
                          <div style={{ fontSize: 11, color: '#7c786e' }}>{ws.city}{ws.address ? ` · ${ws.address}` : ''}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {workshopId && (
                  <div style={{ fontSize: 11, color: '#2ecc71', marginTop: 4, fontWeight: 600 }}>✓ Taller registrado</div>
                )}
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#9a968a', fontWeight: 600, display: 'block', marginBottom: 5 }}>Costo</label>
                <input type="number" value={cost} onChange={e => setCost(e.target.value)}
                  placeholder="$0" style={{
                    width: '100%', padding: '11px 13px', borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)',
                    color: '#f5f3ec', fontSize: 14, outline: 'none',
                  }} />
              </div>
            </div>

            {/* Preview */}
            <div style={{
              padding: '12px 14px', borderRadius: 10, marginBottom: 16,
              background: 'rgba(245,197,24,0.06)', border: '1px solid rgba(245,197,24,0.2)',
              fontSize: 13, color: '#d8c98a',
            }}>
              <span style={{ fontWeight: 700, color: '#F5C518' }}>Vista previa:</span>{' '}
              {buildDescription(serviceType, extra)}
              {mileage && ` · ${parseInt(mileage).toLocaleString()} km`}
            </div>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 13 }}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { if (!editRecord) setStep('type') }} disabled={!editRecord && step === 'form' ? false : false}
                style={{
                  padding: '12px 18px', borderRadius: 11,
                  border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)',
                  color: '#a8a496', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                {editRecord ? 'Cancelar' : 'Cambiar tipo'}
              </button>
              {editRecord && (
                <button onClick={handleDelete} disabled={saving} style={{
                  padding: '12px 18px', borderRadius: 11,
                  border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)',
                  color: '#f87171', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>
                  Eliminar
                </button>
              )}
              <div style={{ flex: 1 }} />
              <button onClick={handleSave} disabled={saving} style={{
                padding: '12px 24px', borderRadius: 11, border: 'none',
                background: saving ? '#8a7a3c' : '#F5C518', color: '#111',
                fontWeight: 800, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: '0 0 20px rgba(245,197,24,0.35)',
              }}>
                {saving && <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#111', animation: 'spin .6s linear infinite', display: 'inline-block' }} />}
                {editRecord ? 'Guardar cambios' : 'Registrar servicio'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
