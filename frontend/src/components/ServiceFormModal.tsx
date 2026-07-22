'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { ServiceIcon } from '@/lib/icons_new'

/* Opciones de frenos: revisar y reemplazar en un mismo control. La última es la
   única que renueva la pieza en Control de partes. */
const REPLACED = 'Reemplazado hoy'
const REPAIRED = 'Reparado hoy'
const BRAKE_OPTIONS = ['Revisado — OK', 'Revisado — desgaste medio', REPLACED]
const FLUID_OPTIONS = ['Revisado — OK', 'Revisado — nivel bajo', REPLACED]
const ABS_OPTIONS = ['Revisado — OK', 'Revisado — falla detectada', REPAIRED]
/* Valores que cuentan como intervención y renuevan la pieza. */
const ACTION_VALUES = new Set([REPLACED, REPAIRED])

/* ── Service type definitions ── */
const SERVICE_TYPES = [
  {
    id: 'Aceite',
    label: 'Cambio de aceite',
    fields: [
      { key: 'lubricant_brand', label: 'Marca del aceite', type: 'text', placeholder: 'Ej. Mobil 1' },
      { key: 'lubricant_type', label: 'Tipo / viscosidad', type: 'autocomplete', placeholder: 'Ej. 5W-30' },
      { key: 'oil_filter', label: 'Filtro de aceite', type: 'checkbox' },
    ],
    partNames: ['Aceite de motor'],
    partCategory: 'Motor',
  },
  {
    id: 'Aire',
    label: 'Filtro de aire',
    fields: [
      { key: 'air_filter', label: 'Filtro de aire reemplazado', type: 'checkbox' },
      { key: 'air_flow', label: 'Flujo de aire verificado', type: 'checkbox' },
    ],
    partNames: ['Filtro de aire'],
    partCategory: 'Filtros',
  },
  {
    id: 'Combustible',
    label: 'Sistema de combustible',
    fields: [
      { key: 'fuel_filter', label: 'Filtro de combustible', type: 'checkbox' },
      { key: 'injection_check', label: 'Inyección revisada', type: 'checkbox' },
    ],
    partNames: ['Filtro de combustible'],
    partCategory: 'Filtros',
  },
  {
    id: 'Frenos',
    label: 'Sistema de frenos',
    fields: [
      { key: 'brake_pads', label: 'Pastillas', type: 'select', options: BRAKE_OPTIONS },
      { key: 'brake_discs', label: 'Discos', type: 'select', options: BRAKE_OPTIONS },
      { key: 'handbrake', label: 'Freno de mano', type: 'select', options: BRAKE_OPTIONS },
      { key: 'brake_fluid', label: 'Líquido de frenos', type: 'select', options: FLUID_OPTIONS },
      { key: 'abs', label: 'Sistema ABS', type: 'select', options: ABS_OPTIONS },
    ],
    /* Un solo control por componente: las dos primeras opciones son diagnóstico
       y no tocan nada; REPLACED es la acción y renueva la pieza. */
    partNames: [],
    replacements: [
      { key: 'brake_pads', part: 'Pastillas de freno' },
      { key: 'brake_discs', part: 'Discos de freno' },
      { key: 'handbrake', part: 'Freno de mano' },
      { key: 'brake_fluid', part: 'Líquido de frenos' },
      { key: 'abs', part: 'Sistema ABS' },
    ],
    partCategory: 'Frenos',
  },
  {
    id: 'Refrigerante',
    label: 'Sistema de refrigeración',
    fields: [
      { key: 'coolant_level', label: 'Nivel de refrigerante', type: 'select', options: ['OK', 'Bajo', 'Reemplazar'] },
      { key: 'coolant_temp', label: 'Temperatura', type: 'select', options: ['Normal', 'Alta', 'Baja'] },
    ],
    partNames: ['Refrigerante'],
    partCategory: 'Enfriamiento',
  },
  {
    id: 'Llantas',
    label: 'Llantas',
    fields: [
      { key: 'tire_pressure', label: 'Presión verificada', type: 'checkbox' },
      { key: 'tire_rotation', label: 'Rotación realizada', type: 'checkbox' },
      { key: 'tire_tread', label: 'Labrado', type: 'select', options: ['OK', 'Desgaste medio', 'Reemplazar'] },
    ],
    partNames: ['Llantas'],
    partCategory: 'Llantas',
  },
  {
    id: 'Suspensión',
    label: 'Suspensión',
    fields: [
      { key: 'suspension_check', label: 'Revisión general', type: 'checkbox' },
      { key: 'shock_absorbers', label: 'Amortiguadores', type: 'select', options: ['OK', 'Desgaste medio', 'Reemplazar'] },
    ],
    partNames: ['Amortiguadores'],
    partCategory: 'Suspensión',
  },
  {
    id: 'Batería',
    label: 'Batería / eléctrico',
    fields: [
      { key: 'battery_check', label: 'Batería verificada', type: 'checkbox' },
      { key: 'battery_voltage', label: 'Voltaje', type: 'text', placeholder: 'Ej. 12.6V' },
    ],
    partNames: ['Batería'],
    partCategory: 'Eléctrico',
  },
  {
    id: 'Transmisión',
    label: 'Transmisión',
    fields: [
      { key: 'transmission_oil', label: 'Aceite de transmisión', type: 'checkbox' },
      { key: 'transmission_check', label: 'Revisión general', type: 'checkbox' },
    ],
    partNames: ['Transmisión'],
    partCategory: 'Transmisión',
  },
  {
    id: 'Otro',
    label: 'Otro servicio',
    fields: [
      { key: 'custom_service', label: 'Describe el servicio', type: 'text', placeholder: 'Ej. Alineación y balanceo' },
    ],
    partNames: [],
  },
]

/* Default lifespan per service type (km) — used for non-Aceite services */
const DEFAULT_LIFESPAN_KM: Record<string, number> = {
  Aceite: 5000,
  Aire: 10000,
  Combustible: 20000,
  Frenos: 20000,
  Refrigerante: 30000,
  Llantas: 40000,
  Suspensión: 25000,
  Batería: 36000,
  Transmisión: 40000,
}

/* Vida útil por pieza (km). Los componentes de un mismo servicio no duran lo
   mismo: unas pastillas no aguantan lo que un disco, así que un único valor por
   tipo de servicio no alcanza para predecir cuándo falla cada una. */
const PART_LIFESPAN_KM: Record<string, number> = {
  'Aceite de motor': 5000,
  'Filtro de aire': 10000,
  'Filtro de combustible': 20000,
  'Pastillas de freno': 20000,
  'Discos de freno': 60000,
  'Freno de mano': 40000,
  'Líquido de frenos': 40000,
  'Sistema ABS': 60000,
  'Refrigerante': 30000,
  'Llantas': 40000,
  'Amortiguadores': 50000,
  'Batería': 36000,
  'Transmisión': 40000,
}

/* Lubricant rules — viscosity/brand → lifespan (km + months) and price tier */
interface LubricantRule {
  lifespanKm: number
  lifespanMonths: number
  label: string
}
const LUBRICANT_RULES: Record<string, LubricantRule> = {
  /* Sintéticos */
  '0W-20':  { lifespanKm: 10000, lifespanMonths: 12, label: 'Sintético premium' },
  '0W-30':  { lifespanKm: 10000, lifespanMonths: 12, label: 'Sintético premium' },
  '0W-40':  { lifespanKm: 10000, lifespanMonths: 12, label: 'Sintético premium' },
  '5W-20':  { lifespanKm: 8000,  lifespanMonths: 10, label: 'Sintético' },
  '5W-30':  { lifespanKm: 8000,  lifespanMonths: 10, label: 'Sintético' },
  '5W-40':  { lifespanKm: 8000,  lifespanMonths: 10, label: 'Sintético' },
  /* Semi-sintéticos */
  '10W-30': { lifespanKm: 7000,  lifespanMonths: 8,  label: 'Semi-sintético' },
  '10W-40': { lifespanKm: 6000,  lifespanMonths: 7,  label: 'Semi-sintético' },
  '10W-50': { lifespanKm: 6000,  lifespanMonths: 7,  label: 'Semi-sintético' },
  '15W-40': { lifespanKm: 5000,  lifespanMonths: 6,  label: 'Mineral mejorado' },
  '15W-50': { lifespanKm: 5000,  lifespanMonths: 6,  label: 'Mineral mejorado' },
  /* Minerales */
  '20W-40': { lifespanKm: 4000,  lifespanMonths: 5,  label: 'Mineral' },
  '20W-50': { lifespanKm: 4000,  lifespanMonths: 5,  label: 'Mineral' },
  '25W-50': { lifespanKm: 4000,  lifespanMonths: 5,  label: 'Mineral' },
  '25W-60': { lifespanKm: 4000,  lifespanMonths: 5,  label: 'Mineral' },
  '30':     { lifespanKm: 4000,  lifespanMonths: 5,  label: 'Mineral' },
  '40':     { lifespanKm: 4000,  lifespanMonths: 5,  label: 'Mineral' },
  '50':     { lifespanKm: 4000,  lifespanMonths: 5,  label: 'Mineral' },
  '60':     { lifespanKm: 3500,  lifespanMonths: 4,  label: 'Mineral' },
}

function getLubricantRule(type?: string): LubricantRule | null {
  if (!type) return null
  const key = type.trim().toUpperCase()
  return LUBRICANT_RULES[key] || null
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
    if (extra.handbrake) parts.push(`Freno de mano: ${extra.handbrake}`)
    if (extra.brake_fluid) parts.push(`Líquido: ${extra.brake_fluid}`)
    if (extra.abs) parts.push(`ABS: ${extra.abs}`)
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
  latestMileage?: number
  onClose: () => void
  onSaved: () => void
}

export default function ServiceFormModal({ vehicleId, editRecord, latestMileage, onClose, onSaved }: Props) {
  const [step, setStep] = useState<'type' | 'form'>(editRecord ? 'form' : 'type')
  const [serviceType, setServiceType] = useState(editRecord?.service_type || '')
  const [mileage, setMileage] = useState(editRecord?.mileage?.toString() || (latestMileage != null && !editRecord ? String(latestMileage) : ''))
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
  const [viscDropdownOpen, setViscDropdownOpen] = useState(false)
  const viscInputRef = useRef<HTMLDivElement>(null)

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

  /* Close viscosity dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (viscInputRef.current && !viscInputRef.current.contains(e.target as Node)) {
        setViscDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* Auto-calculate next_service_mileage when mileage or lubricant type changes.
     Uses BOTH km and time: picks whichever threshold is reached FIRST. */
  useEffect(() => {
    if (editRecord) return
    const milVal = parseInt(mileage) || 0
    if (milVal <= 0) return

    if (serviceType === 'Aceite') {
      const rule = getLubricantRule(extra.lubricant_type)
      if (rule) {
        const kmBased = milVal + rule.lifespanKm
        // Time-based: estimate km at date + lifespanMonths using avg 1500 km/month default
        const today = new Date()
        const futureDate = new Date(today)
        futureDate.setMonth(futureDate.getMonth() + rule.lifespanMonths)
        const monthsAhead = rule.lifespanMonths
        const avgKmPerMonth = 1500
        const timeBased = milVal + Math.round(avgKmPerMonth * monthsAhead)
        // Pick the LOWER of the two (reaches threshold first)
        const autoNext = Math.min(kmBased, timeBased)
        setExtra(prev => ({ ...prev, next_service_mileage: String(autoNext) }))
        return
      }
    }

    // Non-Aceite services: use DEFAULT_LIFESPAN_KM
    if (serviceType && serviceType !== 'Aceite') {
      const lifeKm = DEFAULT_LIFESPAN_KM[serviceType] || 0
      if (lifeKm > 0) {
        const autoNext = milVal + lifeKm
        setExtra(prev => ({ ...prev, next_service_mileage: String(autoNext) }))
      }
    }
  }, [mileage, extra.lubricant_type, serviceType, editRecord])

  function setField(key: string, val: any) {
    setExtra(prev => ({ ...prev, [key]: val }))
  }

  async function handleSave() {
    if (!serviceType) { setError('Selecciona un tipo de servicio'); return }
    if (!mileage) { setError('Ingresa el kilometraje'); return }

    const milVal = parseInt(mileage)
    if (!editRecord && latestMileage != null && milVal < latestMileage) {
      setError(`El kilometraje no puede ser menor al último registrado (${latestMileage.toLocaleString()} km). Verifica el valor.`)
      return
    }
    if (!editRecord && latestMileage != null && milVal > latestMileage + 100000) {
      setError(`El kilometraje ingresado es muy alto comparado con el último registrado (${latestMileage.toLocaleString()} km). Verifica que no haya error de digitación.`)
      return
    }

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

      // Auto-create/update Part records — use lubricant rules for Aceite
      {
        const stDef = SERVICE_TYPES.find(st => st.id === serviceType) as any
        /* Piezas a renovar: las fijas del tipo de servicio, más las que el
           usuario marcó explícitamente como reemplazadas. Un diagnóstico
           ("Requiere cambio") no renueva nada: la pieza sigue siendo la vieja. */
        const replacedNames: string[] = [
          ...(stDef?.partNames || []),
          ...((stDef?.replacements || []) as { key: string; part: string }[])
            .filter(r => ACTION_VALUES.has(extra[r.key]))
            .map(r => r.part),
        ]
        if (stDef && replacedNames.length > 0) {
          const milVal = parseInt(mileage)
          let lifeKm: number | null = null
          let lifeMonths: number | null = null
          if (serviceType === 'Aceite') {
            const rule = getLubricantRule(extra.lubricant_type)
            if (rule) { lifeKm = rule.lifespanKm; lifeMonths = rule.lifespanMonths }
          }
          for (const partName of replacedNames) {
            /* El aceite manda su regla de lubricante; el resto toma la vida útil
               de la pieza, y sólo si no la hay cae al valor del tipo de servicio.
               Antes quedaba en null y la pieza nacía sin predicción. */
            const partLife = (serviceType === 'Aceite' && lifeKm != null)
              ? lifeKm
              : (PART_LIFESPAN_KM[partName] ?? DEFAULT_LIFESPAN_KM[serviceType] ?? null)
            try {
              const existing = await fetch(`/api/parts/vehicle/${vehicleId}`, {
                headers: { Authorization: `Bearer ${token}` },
              }).then(r => r.ok ? r.json() : []).then((parts: any[]) =>
                parts.find((p: any) => p.name === partName)
              )
              if (existing) {
                /* Sólo los campos que cambian: lifespan_mileage sólo si lo
                   sabemos, para no borrar el que ya tuviera la pieza.
                   updated_at lo maneja el servidor. */
                const patch: Record<string, unknown> = { mileage_installed: milVal, status: 'ok' }
                if (partLife != null) patch.lifespan_mileage = partLife
                const r = await fetch(`/api/parts/${existing.id}`, {
                  method: 'PUT',
                  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify(patch),
                })
                if (!r.ok) console.warn('No se pudo actualizar la pieza', partName, await r.text())
              } else {
                await fetch('/api/parts', {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    vehicle_id: vehicleId,
                    name: partName,
                    category: stDef.partCategory || 'Otros',
                    brand: '',
                    status: 'ok',
                    mileage_installed: milVal,
                    lifespan_mileage: partLife,
                    notes: lifeMonths ? `Vida útil: ${lifeMonths} meses` : '',
                  }),
                })
              }
            } catch (e) { console.warn('Fallo al sincronizar la pieza', partName, e) }
          }
        }
      }

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
      <div ref={modalRef} onClick={e => e.stopPropagation()} className="modal-panel" style={{
        width: 480, maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto',
        background: 'var(--panel-bg)', color: 'var(--text-1)', border: '1px solid rgba(245,197,24,0.3)',
        borderRadius: 20, padding: 24,
        boxShadow: '0 40px 90px rgba(0,0,0,.6)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(245,197,24,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5C518' }}>
              <ServiceIcon type={serviceType || 'Otro'} size={19} />
            </span>
            <div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 800, lineHeight: 1.15 }}>
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
            <div className="regGrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {SERVICE_TYPES.map(st => (
                <button key={st.id} onClick={() => { setServiceType(st.id); setStep('form') }} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                  borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#f5f3ec', fontSize: 14, fontWeight: 600, transition: 'all .15s',
                }}>
                  <span style={{ color: '#F5C518', display: 'flex' }}><ServiceIcon type={st.id} size={20} /></span>
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
                      if (f.type === 'autocomplete') {
                        const val = extra[f.key] || ''
                        const suggestions = Object.keys(LUBRICANT_RULES).filter(k =>
                          k.toLowerCase().includes(val.toLowerCase()) && k !== val
                        ).slice(0, 8)
                        return (
                          <div key={f.key} ref={viscInputRef} style={{ position: 'relative' }}>
                            <label style={{ fontSize: 11, color: '#9a968a', fontWeight: 600, display: 'block', marginBottom: 5 }}>{f.label}</label>
                            <input
                              type="text" value={val}
                              onChange={e => { setField(f.key, e.target.value); setViscDropdownOpen(true) }}
                              onFocus={() => setViscDropdownOpen(true)}
                              placeholder={f.placeholder}
                              style={{
                                width: '100%', padding: '11px 13px', borderRadius: 10,
                                border: val && LUBRICANT_RULES[val.toUpperCase()] ? '1px solid rgba(245,197,24,0.5)' : '1px solid rgba(255,255,255,0.14)',
                                background: 'rgba(255,255,255,0.04)',
                                color: '#f5f3ec', fontSize: 14, outline: 'none',
                              }}
                            />
                            {viscDropdownOpen && suggestions.length > 0 && val.length > 0 && (
                              <div style={{
                                position: 'absolute', zIndex: 80, top: '100%', left: 0, right: 0, marginTop: 4,
                                background: '#1a1a1e', border: '1px solid rgba(245,197,24,0.25)', borderRadius: 10,
                                maxHeight: 200, overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,.6)',
                              }}>
                                {suggestions.map(s => {
                                  const rule = LUBRICANT_RULES[s]
                                  return (
                                    <button key={s} onClick={() => { setField(f.key, s); setViscDropdownOpen(false) }}
                                      style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                                        padding: '10px 13px', background: 'transparent', border: 'none',
                                        borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', textAlign: 'left',
                                      }}>
                                      <div>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: '#f5f3ec' }}>{s}</div>
                                        <div style={{ fontSize: 11, color: '#7c786e' }}>{rule.label} · {rule.lifespanKm.toLocaleString()} km / {rule.lifespanMonths} meses</div>
                                      </div>
                                      <span style={{ fontSize: 11, color: '#F5C518', fontWeight: 700 }}>✓</span>
                                    </button>
                                  )
                                })}
                              </div>
                            )}
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
            <div className="regGrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: '#9a968a', fontWeight: 600, display: 'block', marginBottom: 5 }}>Kilometraje actual *</label>
                {latestMileage != null && !editRecord && (
                  <div style={{ fontSize: 10, color: '#6f6a5f', marginBottom: 4, height: 14, overflow: 'hidden' }}>Último: {latestMileage.toLocaleString()} km</div>
                )}
                {latestMileage == null || editRecord ? <div style={{ height: 19 }} /> : null}
                <input type="number" value={mileage} onChange={e => setMileage(e.target.value)}
                  placeholder="Ej. 50000" style={{
                    width: '100%', padding: '11px 13px', borderRadius: 10,
                    border: mileage && latestMileage != null && !editRecord
                      ? parseInt(mileage) < latestMileage
                        ? '1.5px solid #ff4d6a'
                        : parseInt(mileage) > latestMileage + 100000
                          ? '1.5px solid #ffb020'
                          : '1px solid rgba(46,204,113,0.5)'
                      : '1px solid rgba(255,255,255,0.14)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#f5f3ec', fontSize: 14, outline: 'none',
                  }} />
                {mileage && latestMileage != null && !editRecord && parseInt(mileage) < latestMileage && (
                  <div style={{ fontSize: 11, color: '#ff4d6a', marginTop: 4, lineHeight: 1.3 }}>No puede ser menor al último registrado ({latestMileage.toLocaleString()} km)</div>
                )}
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#9a968a', fontWeight: 600, display: 'block', marginBottom: 5 }}>Fecha</label>
                <input type="date" className="date-field" value={date} onChange={e => setDate(e.target.value)} />
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
                        <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 11, color: '#F5C518', fontWeight: 700, flex: '0 0 auto' }}>{ws.code}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>
                            {ws.name}
                            {ws.is_verified && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4, verticalAlign: 'middle' }}><path d="M20 6L9 17l-5-5"/></svg>}
                          </div>
                          <div style={{ fontSize: 11, color: '#7c786e' }}>{ws.city}{ws.address ? ` · ${ws.address}` : ''}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {workshopId && (
                  <div style={{ fontSize: 11, color: '#2ecc71', marginTop: 4, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>Taller registrado</div>
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

            {/* Lubricant rule prediction — auto from type/viscosity */}
            {serviceType === 'Aceite' && (() => {
              const rule = getLubricantRule(extra.lubricant_type)
              if (!rule) return (
                <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 12, color: '#6f6a5f' }}>
                  Selecciona un tipo de viscosidad para calcular la vida útil automáticamente.
                </div>
              )
              const milVal = parseInt(mileage) || 0
              const futureDate = new Date()
              futureDate.setMonth(futureDate.getMonth() + rule.lifespanMonths)
              const predictedDateStr = futureDate.toLocaleDateString('es', { month: 'short', year: 'numeric' })
              return (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#F5C518', fontWeight: 700, marginBottom: 10 }}>
                    Predicción de vida útil
                  </div>
                  <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(245,197,24,0.06)', border: '1px solid rgba(245,197,24,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#F5C518' }}>{rule.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#d8c98a' }}>{extra.lubricant_type}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 20, fontSize: 12, color: '#d8c98a', flexWrap: 'wrap' }}>
                      <div><span style={{ color: '#8a7a3c' }}>Vida útil:</span> <b>{rule.lifespanKm.toLocaleString()} km</b></div>
                      <div><span style={{ color: '#8a7a3c' }}>Tiempo:</span> <b>{rule.lifespanMonths} meses</b></div>
                      {milVal > 0 && <div><span style={{ color: '#8a7a3c' }}>Estimado:</span> <b>{predictedDateStr}</b></div>}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Common field: Próximo servicio (km) — auto-calculated, editable */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#F5C518', fontWeight: 700, marginBottom: 10 }}>
                Programación
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#9a968a', fontWeight: 600, display: 'block', marginBottom: 5 }}>Próximo servicio (km)</label>
                <input type="number" value={extra.next_service_mileage || ''} onChange={e => setField('next_service_mileage', e.target.value)}
                  placeholder="Se calcula automáticamente" style={{
                    width: '100%', padding: '11px 13px', borderRadius: 10,
                    border: extra.next_service_mileage ? '1px solid rgba(245,197,24,0.4)' : '1px solid rgba(255,255,255,0.14)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#f5f3ec', fontSize: 14, outline: 'none',
                  }} />
                {extra.next_service_mileage && (
                  <div style={{ fontSize: 11, color: '#6f6a5f', marginTop: 4 }}>
                    {parseInt(extra.next_service_mileage).toLocaleString()} km
                    {mileage ? ` (${(parseInt(extra.next_service_mileage) - parseInt(mileage)).toLocaleString()} km desde ahora)` : ''}
                  </div>
                )}
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
              {extra.next_service_mileage && (
                <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: '#8a7a3c' }}>
                  Próximo servicio: {parseInt(extra.next_service_mileage).toLocaleString()} km
                </span>
              )}
              {serviceType === 'Aceite' && (() => {
                const rule = getLubricantRule(extra.lubricant_type)
                return rule ? (
                  <span style={{ display: 'block', marginTop: 2, fontSize: 11, color: '#6f6a5f' }}>
                    {rule.label} · {rule.lifespanKm.toLocaleString()} km / {rule.lifespanMonths} meses
                  </span>
                ) : null
              })()}
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
