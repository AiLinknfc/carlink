'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { ServiceTypeIcon, Icon, FiltroAceiteIcon, FiltroAireIcon, FiltroCombustibleIcon, FiltroParticulasIcon, FiltroHabitaculoIcon, FiltroTransmisionIcon } from '@/lib/icons_new'
import { useTheme } from '@/store/theme'
import { filterOptions, chosenFilter, filterLifespanKm, vehicleKindOf, filterBrands, ALL_FILTER_KEYS, type FilterIcon } from '@/lib/filterCatalog'
import { pickLifespanKm, predictNextKm } from '@/lib/servicePrediction'
import { LUBRICANT_RULES, getLubricantRule } from '@/lib/lubricantRules'
import OilPicker from '@/components/OilPicker'
import { canonicalServiceId } from '@/lib/serviceIds'
import { useOptions, USE_INFO, lifespanFor, isLubricantUse, useSummary, GEAR_VISCOSITIES, GEAR_SPECS, TRANSMISSION_FLUIDS, DRIVETRAIN_BRANDS, type LubricantUse } from '@/lib/lubricantUse'
import ThemedSuggestInput from '@/components/ThemedSuggestInput'
import { batteryOptions, batteryOptionByKey, interpretVoltage, parseVoltage, VOLTAGE_LABEL, BATTERY_REVIEW_MONTHS, DEFAULT_BATTERY_MONTHS } from '@/lib/batteryCatalog'
import ThemedDateInput from '@/components/ThemedDateInput'

/* Opciones de frenos: revisar y reemplazar en un mismo control. La última es la
   única que renueva la pieza en Control de partes. */
const REPLACED = 'Reemplazado hoy'
const REPAIRED = 'Reparado hoy'
const BRAKE_OPTIONS = ['Revisado — OK', 'Revisado — desgaste medio', REPLACED]
const FLUID_OPTIONS = ['Revisado — OK', 'Revisado — nivel bajo', REPLACED]
const ABS_OPTIONS = ['Revisado — OK', 'Revisado — falla detectada', REPAIRED]
/* Valores que cuentan como intervención y renuevan la pieza. */
const ACTION_VALUES = new Set([REPLACED, REPAIRED])

/* Fecha local en AAAA-MM-DD. toISOString() da la fecha UTC, que de noche en Colombia ya es
   "mañana". */
const localISO = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
/* Mismo tope que el servidor (maintenance_rules.py MAX_BACKDATE_DAYS): la fecha del servicio
   no puede ser futura ni de hace más de 30 días. */
const MAX_BACKDATE_DAYS = 30

/* El servidor responde {"detail": "..."}; mostrar solo el mensaje. */
async function readApiError(res: Response): Promise<string> {
  const text = await res.text()
  try {
    const d = JSON.parse(text)?.detail
    if (typeof d === 'string') return d
  } catch { /* no era JSON */ }
  return text
}

/* Un cambio de aceite exige decir qué aceite se usó (marca y viscosidad): de eso depende la vida
   útil que se predice. Mismo criterio que el servidor (maintenance_rules.check_oil_used). */
function oilProblem(extra: Record<string, any>): string {
  if (!String(extra.lubricant_brand || '').trim() || !String(extra.lubricant_type || '').trim()) {
    return extra.lubricant_use === 'transmision'
      ? 'Indica el lubricante utilizado: la marca y el tipo de fluido son obligatorios.'
      : 'Indica el aceite utilizado: elige la marca y la viscosidad antes de continuar.'
  }
  return ''
}

/* Paso 1 del servicio Filtros: UNA card por filtro y la elección es exclusiva —cada filtro tiene su
   propio ciclo de vida útil, así que el próximo servicio nunca se mezcla entre filtros. Las opciones
   dependen del tipo de vehículo (moto o carro), que se detecta solo (lib/filterCatalog.ts). */
const FILTER_ICONS: Record<FilterIcon, (p: { size?: number }) => React.ReactNode> = {
  oil: FiltroAceiteIcon, air: FiltroAireIcon, cabin: FiltroHabitaculoIcon,
  fuel: FiltroCombustibleIcon, transmission: FiltroTransmisionIcon, particle: FiltroParticulasIcon,
}
const hasFilterSelected = (extra: Record<string, any>) => chosenFilter(extra) !== null

/* Servicios que se registran con el wizard de 3 pasos (Producto o Filtros /
   Datos generales / Confirmar). El resto usa el formulario plano. */
const WIZARD_TYPES = new Set(['Aceite', 'Aire', 'Batería'])

/* Pasos del wizard por rol: Aceite y Filtros tienen 3; la batería suma una etapa de Medición
   (acción + voltaje) entre el tipo y los datos generales. */
type StepRole = 'use' | 'detail' | 'measure' | 'general' | 'confirm'
const stepRolesFor = (serviceType: string): StepRole[] =>
  serviceType === 'Batería' ? ['detail', 'measure', 'general', 'confirm']
    : serviceType === 'Aceite' ? ['use', 'detail', 'general', 'confirm'] // primero: ¿lubricante de motor, caja o transmisión?
    : ['detail', 'general', 'confirm']

/* ── Service type definitions ── */
const SERVICE_TYPES = [
  {
    id: 'Aceite',
    label: 'Cambio de aceite',
    fields: [
      { key: 'lubricant_brand', label: 'Marca del aceite', type: 'text', placeholder: 'Ej. Mobil 1' },
      { key: 'lubricant_type', label: 'Tipo / viscosidad', type: 'autocomplete', placeholder: 'Ej. 5W-30' },
    ],
    partNames: ['Aceite de motor'],
    partCategory: 'Motor',
  },
  {
    id: 'Aire',
    label: 'Filtros',
    fields: [
      /* El filtro se elige con cards exclusivas (lib/filterCatalog.ts) en el paso 1 del wizard; sus
         claves viven en `replacements`, no se listan acá. El flujo de aire solo aplica al filtro de aire. */
      { key: 'air_flow', label: 'Flujo de aire verificado', type: 'checkbox' },
    ],
    /* Solo se renueva el filtro que se marcó: marcar uno no debe reiniciar la
       vida útil del otro. */
    partNames: [],
    replacements: [
      { key: 'oil_filter', part: 'Filtro de aceite' },
      { key: 'air_filter', part: 'Filtro de aire' },
      { key: 'cabin_filter', part: 'Filtro de habitáculo' },
      { key: 'fuel_filter', part: 'Filtro de combustible' },
      { key: 'transmission_filter', part: 'Filtro de transmisión' },
      { key: 'particle_filter', part: 'Filtro de partículas' },
    ],
    partCategory: 'Filtros',
  },
  {
    id: 'Combustible',
    label: 'Sistema de combustible',
    fields: [
      { key: 'injection_check', label: 'Inyección revisada', type: 'checkbox' },
    ],
    /* El filtro de combustible se registra en "Filtros"; acá solo la inyección. */
    partNames: [],
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
    /* Los campos se piden en el wizard: el tipo en el paso 1 y la medición (acción, voltaje, verificada)
       en el paso 2. Si solo se revisó, la batería no se renueva (ver handleSave). */
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
      /* El aceite de transmisión (y el de caja) se registra desde Aceite > "¿Para qué es el lubricante?":
         tiene su propia pieza y ciclo. Acá solo queda la revisión general de la transmisión. */
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
  'Filtro de aceite': 10000,
  'Filtro de aire': 15000,
  'Filtro de habitáculo': 15000,
  'Filtro de transmisión': 60000,
  'Filtro de combustible': 20000,
  'Filtro de partículas': 100000,
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

function buildDescription(type: string, extra: Record<string, any>): string {
  const parts: string[] = []
  if (type === 'Aceite') {
    const use: LubricantUse = isLubricantUse(extra.lubricant_use) ? extra.lubricant_use : 'motor'
    if (extra.lubricant_brand) parts.push(`${useSummary(use)} ${extra.lubricant_brand}`)
    if (extra.lubricant_type) parts.push(extra.lubricant_type)
    if (use === 'caja' && extra.lubricant_product) parts.push(extra.lubricant_product)
    return parts.join(' · ') || (use === 'motor' ? 'Cambio de aceite' : `Cambio de ${useSummary(use).toLowerCase()}`)
  }
  if (type === 'Batería') {
    const bt = batteryOptionByKey(extra.battery_type)
    parts.push(extra.battery_action === 'review' ? 'Batería revisada' : 'Batería reemplazada')
    if (bt && bt.key !== 'other') parts.push(bt.label)
    if (String(extra.battery_voltage || '').trim()) parts.push(`Voltaje ${String(extra.battery_voltage).trim().replace(/v$/i, '')} V`)
    if (extra.battery_check) parts.push('Verificada')
    return parts.join(' · ')
  }
  if (type === 'Aire') {
    if (extra.oil_filter) parts.push('Filtro de aceite reemplazado')
    if (extra.air_filter) parts.push('Filtro de aire reemplazado')
    if (extra.cabin_filter) parts.push('Filtro de habitáculo reemplazado')
    if (extra.fuel_filter) parts.push('Filtro de combustible reemplazado')
    if (extra.transmission_filter) parts.push('Filtro de transmisión reemplazado')
    if (extra.particle_filter) parts.push('Filtro de partículas reemplazado')
    if (extra.air_flow) parts.push('Flujo verificado')
    if (extra.filter_brand?.trim()) parts.push(`Marca ${extra.filter_brand.trim()}`)
    if (extra.filter_reference?.trim()) parts.push(`Ref. ${extra.filter_reference.trim()}`)
    return parts.join(' · ') || 'Servicio de filtros'
  }
  if (type === 'Combustible') {
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
  defaultServiceType?: string
  /** Combustible del vehículo ('' = sin definir): decide si se ofrece el filtro de partículas. */
  fuelType?: string
  /** Clase (body_type) y categoría de placa (type) del vehículo: de ahí se detecta moto o carro y se
   * ofrecen sus filtros. */
  vehicleBodyType?: string
  vehiclePlateType?: string
  latestMileage?: number
  hideServiceType?: boolean
  onClose: () => void
  /** Si el alta (no edicion) trae un taller registrado adjunto, se manda esa
   * info — la usa app/page.tsx para ofrecer calificar ese taller. */
  onSaved: (newWorkshop?: { workshopId: string; workshopName: string }) => void
}

export default function ServiceFormModal({ vehicleId, editRecord, defaultServiceType, fuelType, vehicleBodyType, vehiclePlateType, latestMileage, hideServiceType, onClose, onSaved }: Props) {
  const { theme } = useTheme()
  const isDark = theme !== 'light'
  const textPrimary = isDark ? '#f5f3ec' : '#17171a'
  const textMuted = isDark ? '#7c786e' : '#7a756a'
  const textSecondary = isDark ? '#b6b2a6' : '#5c584e'
  const panelBg = isDark ? 'rgba(14,14,14,0.98)' : 'rgba(247,246,242,0.99)'
  const border = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(17,17,17,0.1)'
  const btnGhostBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'
  const inputBg = isDark ? 'rgba(255,255,255,0.04)' : '#ffffff'
  const [step, setStep] = useState<'type' | 'form'>(editRecord ? 'form' : defaultServiceType ? 'form' : 'type')
  const [serviceType, setServiceType] = useState(canonicalServiceId(editRecord?.service_type || defaultServiceType || ''))
  const [mileage, setMileage] = useState(editRecord?.mileage?.toString() || (latestMileage != null && !editRecord ? String(latestMileage) : ''))
  const [date, setDate] = useState(editRecord?.date ? editRecord.date.slice(0, 10) : localISO(new Date()))
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
  /* Wizard de 3 pasos, solo para Aceite (ver icons_new no — plan del cambio en
     docs, resumen: Producto / Datos generales / Confirmar). El resto de tipos
     de servicio sigue con el formulario plano de siempre, sin este estado. */
  const [aceiteStep, setAceiteStep] = useState(1)
  const wizard = WIZARD_TYPES.has(serviceType)
  const stepRoles = stepRolesFor(serviceType)
  const totalSteps = stepRoles.length
  /* Qué se muestra en el paso actual (en servicios sin wizard no aplica: se ve todo). */
  const role: StepRole = stepRoles[Math.min(aceiteStep, totalSteps) - 1]
  const vehicleKind = vehicleKindOf(vehicleBodyType, vehiclePlateType)
  /* Para qué sirve el lubricante (solo Aceite): motor por defecto. */
  const lubricantUse: LubricantUse = isLubricantUse(extra.lubricant_use) ? extra.lubricant_use : 'motor'
  /* Vida útil de una pieza: en Filtros depende del tipo de vehículo (el filtro de aceite de una moto se
     cambia mucho antes que el de un carro). */
  const partLifespan = (name: string): number | undefined =>
    (serviceType === 'Aire' ? filterLifespanKm(vehicleKind, name) : undefined) ?? PART_LIFESPAN_KM[name]

  /* Parse description into extra fields when editing */
  useEffect(() => {
    if (!editRecord) return
    const desc = (editRecord.description || '').toLowerCase()
    const e: Record<string, any> = {}
    if (desc.includes('filtro de aceite') || desc.includes('filtro aceite')) e.oil_filter = true
    if (desc.includes('filtro de aire')) e.air_filter = true
    if (desc.includes('flujo verific')) e.air_flow = true
    if (desc.includes('filtro de combustible')) e.fuel_filter = true
    if (desc.includes('filtro de part')) e.particle_filter = true
    if (desc.includes('filtro de habit')) e.cabin_filter = true
    if (desc.includes('filtro de transmis')) e.transmission_filter = true
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
    e.lubricant_product = editRecord.lubricant_product || ''
    e.lubricant_use = isLubricantUse(editRecord.lubricant_use) ? editRecord.lubricant_use : 'motor'
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

  /* Predicción automática del "Próximo servicio (km)": se recalcula al cambiar el kilometraje, el
     tipo de servicio, la viscosidad o las piezas que se marcan como renovadas. Antes solo corría
     para Aceite con una viscosidad conocida y para tipos con valor fijo, así que con un aceite sin
     viscosidad (o escrita libre) —y con Filtros— el campo quedaba vacío al digitar el kilometraje.
     Ahora siempre hay una vida útil: la de la viscosidad, la de la pieza que se gasta primero o la
     del tipo de servicio. */
  const replacedSignature = ((SERVICE_TYPES.find(st => st.id === serviceType) as any)?.replacements || [])
    .filter((r: { key: string }) => extra[r.key] === true || ACTION_VALUES.has(extra[r.key]))
    .map((r: { part: string }) => r.part).join('|')
  useEffect(() => {
    if (editRecord || !serviceType) return
    const milVal = parseInt(mileage) || 0
    if (milVal <= 0) return

    const defaultKm = DEFAULT_LIFESPAN_KM[serviceType] || 0
    let lifeKm = defaultKm
    let lifeMonths: number | null = null
    if (serviceType === 'Aceite' && lubricantUse !== 'motor') {
      // Caja o transmisión: ciclo propio del caso (y del tipo de fluido en transmisión).
      const l = lifespanFor(lubricantUse, extra.lubricant_type)
      lifeKm = l.km; lifeMonths = l.months
    } else if (serviceType === 'Aceite') {
      const rule = getLubricantRule(extra.lubricant_type)
      if (rule) { lifeKm = rule.lifespanKm; lifeMonths = rule.lifespanMonths }
    } else if (serviceType === 'Batería') {
      // La batería envejece por tiempo: meses del tipo elegido (o 6 si solo se revisó) → km a 1.500/mes.
      lifeMonths = extra.battery_action === 'review' ? BATTERY_REVIEW_MONTHS : (batteryOptionByKey(extra.battery_type)?.months ?? DEFAULT_BATTERY_MONTHS)
      lifeKm = lifeMonths * 1500
    } else if (replacedSignature) {
      lifeKm = pickLifespanKm(replacedSignature.split('|').map((name: string) => partLifespan(name)), defaultKm)
    }
    const next = predictNextKm(milVal, lifeKm, lifeMonths)
    if (next != null) setExtra(prev => ({ ...prev, next_service_mileage: String(next) }))
  }, [mileage, extra.lubricant_type, serviceType, editRecord, replacedSignature, extra.battery_type, extra.battery_action, lubricantUse])

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

    if (serviceType === 'Aire' && !editRecord && !hasFilterSelected(extra) && !extra.air_flow) {
      setError('Elige el filtro que reemplazaste')
      return
    }
    if (serviceType === 'Aceite' && !editRecord) {
      const problem = oilProblem(extra)
      if (problem) { setError(problem); if (aceiteStep !== 1) setAceiteStep(1); return }
    }
    if (serviceType === 'Batería' && !editRecord && !extra.battery_type) {
      setError('Elige el tipo de batería'); if (aceiteStep !== 1) setAceiteStep(1); return
    }
    // El próximo servicio es futuro: igual al kilometraje actual (o menor) es un error de digitación.
    const nextKm = extra.next_service_mileage ? parseInt(extra.next_service_mileage) : null
    if (nextKm != null && nextKm <= milVal) {
      setError('El próximo servicio (km) debe ser mayor al kilometraje actual.')
      return
    }

    setSaving(true); setError('')

    const desc = buildDescription(serviceType, extra)

    // Piezas que este servicio renueva: las fijas del tipo de servicio, más las que el usuario
    // marcó explícitamente como reemplazadas. Un diagnóstico ("Requiere cambio") no renueva nada:
    // la pieza sigue siendo la vieja. Antes esto disparaba dos llamadas aparte a /api/parts DESPUÉS
    // de guardar el servicio — si el usuario cerraba la pestaña o fallaba la red justo ahí, el
    // servicio quedaba guardado pero la pieza nunca se sincronizaba (encontrado 2026-09-30 con
    // datos reales: Frenos/Llantas en el historial sin su pieza en Control de Partes). Ahora viaja
    // en el mismo body y el backend la sincroniza en la misma transacción (ver maintenance.py).
    const stDef = SERVICE_TYPES.find(st => st.id === serviceType) as any
    // Una batería que solo se revisó (medición) no se renueva: sigue siendo la misma pieza.
    const batteryReviewOnly = serviceType === 'Batería' && extra.battery_action === 'review'
    const batteryType = serviceType === 'Batería' ? batteryOptionByKey(extra.battery_type) : undefined
    const replacedNames: string[] = batteryReviewOnly ? [] : [
      // Aceite: la pieza depende del lubricante (motor, caja o transmisión).
      ...(serviceType === 'Aceite' ? [USE_INFO[lubricantUse].part] : (stDef?.partNames || [])),
      ...((stDef?.replacements || []) as { key: string; part: string }[])
        .filter(r => extra[r.key] === true || ACTION_VALUES.has(extra[r.key]))
        .map(r => r.part),
    ]
    let lifeKm: number | null = null
    let lifeMonths: number | null = null
    if (serviceType === 'Aceite' && lubricantUse !== 'motor') {
      const l = lifespanFor(lubricantUse, extra.lubricant_type)
      lifeKm = l.km; lifeMonths = l.months
    } else if (serviceType === 'Aceite') {
      const rule = getLubricantRule(extra.lubricant_type)
      if (rule) { lifeKm = rule.lifespanKm; lifeMonths = rule.lifespanMonths }
    } else if (serviceType === 'Batería') {
      lifeMonths = batteryType?.months ?? DEFAULT_BATTERY_MONTHS
      lifeKm = lifeMonths * 1500
    }
    const replacedParts = stDef ? replacedNames.map(partName => ({
      name: partName,
      category: (serviceType === 'Aceite' ? USE_INFO[lubricantUse].category : stDef.partCategory) || 'Otros',
      lifespan_mileage: ((serviceType === 'Aceite' || serviceType === 'Batería') && lifeKm != null)
        ? lifeKm
        : (partLifespan(partName) ?? DEFAULT_LIFESPAN_KM[serviceType] ?? null),
      // Los meses de vida útil (y el tipo de batería) viajan en las notas de la pieza: la Ficha los lee de ahí.
      notes: lifeMonths ? `Vida útil: ${lifeMonths} meses${batteryType ? ` · Tipo: ${batteryType.label}` : ''}` : '',
      // Marca y referencia del filtro instalado (opcionales): quedan en la pieza, en Control de partes.
      ...(serviceType === 'Aire' ? { brand: (extra.filter_brand || '').trim(), part_number: (extra.filter_reference || '').trim() } : {}),
    })) : []

    const body: Record<string, any> = {
      vehicle_id: vehicleId,
      service_type: serviceType,
      description: desc,
      mileage: parseInt(mileage),
      date,
      workshop: workshop || 'Taller no registrado',
      cost: cost ? parseFloat(cost) : 0,
      lubricant_brand: extra.lubricant_brand || '',
      lubricant_type: extra.lubricant_type || '',
      lubricant_product: extra.lubricant_product || '',
      lubricant_use: serviceType === 'Aceite' ? lubricantUse : 'motor',
      next_service_mileage: extra.next_service_mileage ? parseInt(extra.next_service_mileage) : null,
      replaced_parts: replacedParts,
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
      if (!res.ok) throw new Error(await readApiError(res))

      // Prompt de calificación de taller solo en alta nueva (no en ediciones,
      // para no volver a preguntar cada vez que se retoca el mismo registro).
      onSaved(!editRecord && workshopId ? { workshopId, workshopName: workshop } : undefined)
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
      if (!res.ok) throw new Error(await readApiError(res))
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e.message || 'Error al eliminar')
    } finally {
      setSaving(false)
    }
  }

  /* Avanzar en el wizard de Aceite. Al salir del paso 2 (Datos generales) exige
     lo mismo que ya exigía handleSave al guardar — así el aviso llega un paso
     antes en vez de recién al final. */
  function handleAceiteNext() {
    if (role === 'detail' && serviceType === 'Batería' && !editRecord && !extra.battery_type) {
      setError('Elige el tipo de batería')
      return
    }
    if (role === 'measure' && serviceType === 'Batería') {
      const raw = String(extra.battery_voltage || '').trim()
      if (raw && interpretVoltage(parseVoltage(raw)) === 'invalida') {
        setError('El voltaje no es válido: escribe lo que marca el multímetro (ej. 12.6).')
        return
      }
    }
    if (role === 'detail' && serviceType === 'Aceite' && !editRecord) {
      const problem = oilProblem(extra)
      if (problem) { setError(problem); return }
    }
    if (role === 'detail' && serviceType === 'Aire' && !editRecord && !hasFilterSelected(extra) && !extra.air_flow) {
      setError('Elige el filtro que reemplazaste')
      return
    }
    if (role === 'general') {
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
    }
    setError('')
    setAceiteStep(prev => Math.min(prev + 1, totalSteps))
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
              <ServiceTypeIcon type={serviceType || 'Otro'} size={19} />
            </span>
            <div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 800, lineHeight: 1.15 }}>
                {editRecord ? 'Editar servicio' : 'Nuevo servicio'}
              </div>
              <div style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>
                {editRecord ? `#${editRecord.id?.slice(0, 8)}` : 'Registra un servicio'}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 34, height: 34, borderRadius: 9,
            border: `1px solid ${border}`, background: btnGhostBg,
            color: textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Step 1: choose type */}
        {step === 'type' && (
          <div>
            <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: textMuted, fontWeight: 700, marginBottom: 12 }}>
              Selecciona el tipo de servicio
            </div>
            <div className="regGrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {SERVICE_TYPES.map(st => (
                <button key={st.id} onClick={() => { setServiceType(st.id); setStep('form') }} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                  borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                  background: btnGhostBg, border: `1px solid ${border}`,
                  color: textPrimary, fontSize: 14, fontWeight: 600, transition: 'all .15s',
                }}>
                  <span style={{ color: '#F5C518', display: 'flex' }}><ServiceTypeIcon type={st.id} size={20} /></span>
                  <span>{st.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: fill form */}
        {step === 'form' && (
          <div>
            {/* Service type (editable) — en el wizard de Aceite solo se ve en el
               paso 1: cambiarlo a mitad del wizard no tendría sentido. */}
            {!hideServiceType && (!wizard || role === 'detail') && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: textMuted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Tipo de servicio</label>
              <select value={serviceType} onChange={e => setServiceType(e.target.value)} style={{
                width: '100%', padding: '11px 13px', borderRadius: 10,
                border: `1px solid ${border}`, background: inputBg,
                color: textPrimary, fontSize: 14, outline: 'none', cursor: 'pointer',
              }}>
                {SERVICE_TYPES.map(st => (
                  <option key={st.id} value={st.id}>{st.label}</option>
                ))}
              </select>
            </div>
            )}

            {/* Wizard de Aceite: registro corto en 3 pasos (Producto / Datos
               generales / Confirmar) en vez del formulario plano de siempre —
               el resto de tipos de servicio no entra acá. */}
            {wizard && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: textMuted, fontWeight: 700 }}>
                    Paso {aceiteStep} de {totalSteps}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#F5C518' }}>
                    {role === 'use' ? 'Lubricante' : role === 'detail' ? (serviceType === 'Aire' ? 'Filtros' : serviceType === 'Batería' ? 'Tipo de batería' : 'Producto') : role === 'measure' ? 'Medición' : role === 'general' ? 'Datos generales' : 'Confirmar'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {Array.from({ length: totalSteps }, (_, i) => i + 1).map(n => (
                    <div key={n} style={{ flex: 1, height: 4, borderRadius: 3, background: n <= aceiteStep ? '#F5C518' : border }} />
                  ))}
                </div>
              </div>
            )}

            {/* Type-specific fields */}
            {/* Aceite, paso 1: ¿para qué es el lubricante? Cada caso pide sus propios datos. */}
            {serviceType === 'Aceite' && role === 'use' && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#F5C518', fontWeight: 700, marginBottom: 10 }}>
                  ¿Para qué es el lubricante?
                </div>
                <div role="radiogroup" aria-label="Tipo de lubricante" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {useOptions(vehicleKind).map(o => {
                    const on = lubricantUse === o.key
                    return (
                      <button key={o.key} type="button" role="radio" aria-checked={on}
                        onClick={() => setExtra(prev => (prev.lubricant_use ?? 'motor') === o.key && prev.lubricant_use ? prev
                          // Otro caso, otros datos: no se arrastran la marca ni el tipo del anterior.
                          : { ...prev, lubricant_use: o.key, lubricant_brand: '', lubricant_type: '', lubricant_product: '' })}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                          background: on ? 'rgba(245,197,24,0.12)' : btnGhostBg,
                          border: `1px solid ${on ? 'rgba(245,197,24,0.6)' : border}`, color: textPrimary, transition: 'all .15s',
                        }}>
                        <span style={{ color: '#F5C518', display: 'flex', flex: '0 0 auto' }}><ServiceTypeIcon type="Aceite" size={26} /></span>
                        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{o.label}</span>
                          <span style={{ fontSize: 11.5, color: on ? '#F5C518' : textMuted }}>{o.desc}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
                <div style={{ fontSize: 11, color: textMuted, marginTop: 8, lineHeight: 1.5 }}>
                  En el siguiente paso se piden los datos de ese lubricante. Si cambiaste más de uno, registra cada uno por separado.
                </div>
              </div>
            )}

            {(!wizard || role === 'detail') && (() => {
              const stDef = SERVICE_TYPES.find(st => st.id === serviceType)
              if (!stDef) return null
              return (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#F5C518', fontWeight: 700, marginBottom: 10 }}>
                    Detalles — {stDef.label}{serviceType === 'Aceite' ? ` · ${USE_INFO[lubricantUse].label}` : ''}
                  </div>
                  {serviceType === 'Aire' && (
                    <div style={{ marginBottom: 12 }}>
                      <div role="radiogroup" aria-label="Filtro que reemplazaste" className="regGrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {filterOptions(vehicleKind, fuelType).map(o => {
                          const on = !!extra[o.key]
                          const Icon = FILTER_ICONS[o.icon]
                          return (
                            <button key={o.key} type="button" role="radio" aria-checked={on}
                              /* Exclusivo: elegir uno desmarca los demás (y el flujo de aire, que solo
                                 aplica al filtro de aire). */
                              onClick={() => setExtra(prev => {
                                const next: Record<string, any> = { ...prev }
                                ALL_FILTER_KEYS.forEach(k => { next[k] = false })
                                if (!prev[o.key]) { next.filter_brand = ''; next.filter_reference = '' } // otro filtro, otro repuesto
                                next[o.key] = true
                                if (o.key !== 'air_filter') next.air_flow = false
                                return next
                              })}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px',
                                borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                                background: on ? 'rgba(245,197,24,0.12)' : btnGhostBg,
                                border: `1px solid ${on ? 'rgba(245,197,24,0.6)' : border}`,
                                color: textPrimary, transition: 'all .15s',
                              }}>
                              <span style={{ color: '#F5C518', display: 'flex', flex: '0 0 auto' }}><Icon size={30} /></span>
                              <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <span style={{ fontSize: 13.5, fontWeight: 700 }}>{o.label}</span>
                                <span style={{ fontSize: 11, color: on ? '#F5C518' : textMuted, fontWeight: 600 }}>{on ? 'Reemplazado' : o.hint}</span>
                                {o.note && <span style={{ fontSize: 10.5, color: textMuted }}>{o.note}</span>}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                      <div style={{ fontSize: 11, color: textMuted, marginTop: 8, lineHeight: 1.5 }}>
                        Elige un solo filtro por registro: cada uno tiene su propio ciclo de vida útil. Si cambiaste varios, registra cada uno por separado.
                      </div>
                      {/* Al elegir el filtro se abre, en este mismo paso, la marca y la referencia (opcionales). */}
                      {hasFilterSelected(extra) && (
                        <div className="regGrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                          <div>
                            <label style={{ fontSize: 11, color: textMuted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Marca <span style={{ fontWeight: 400 }}>(opcional)</span></label>
                            <ThemedSuggestInput value={extra.filter_brand || ''} onChange={v => setField('filter_brand', v)}
                              suggestions={filterBrands(vehicleKind)} placeholder="Ej. Mann-Filter"
                              style={{ padding: '11px 13px', fontSize: 14 }}
                              theme={{ inputBg: 'var(--input-bg)', inputBorder: 'var(--input-border)', inputText: 'var(--text-1)', accent: '#F5C518', muted: 'var(--text-3)', panelBg: 'var(--panel-bg)' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, color: textMuted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Referencia <span style={{ fontWeight: 400 }}>(opcional)</span></label>
                            <input type="text" value={extra.filter_reference || ''} maxLength={80} onChange={e => setField('filter_reference', e.target.value)}
                              placeholder="Ej. C 25 114" style={{
                                width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 10,
                                border: `1px solid ${border}`, background: inputBg, color: textPrimary, fontSize: 14, outline: 'none',
                              }} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {serviceType === 'Batería' && (
                    <div>
                      <div role="radiogroup" aria-label="Tipo de batería" className="regGrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {batteryOptions(vehicleKind).map(o => {
                          const on = extra.battery_type === o.key
                          return (
                            <button key={o.key} type="button" role="radio" aria-checked={on}
                              onClick={() => setField('battery_type', o.key)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px',
                                borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                                background: on ? 'rgba(245,197,24,0.12)' : btnGhostBg,
                                border: `1px solid ${on ? 'rgba(245,197,24,0.6)' : border}`,
                                color: textPrimary, transition: 'all .15s',
                              }}>
                              <span style={{ color: '#F5C518', display: 'flex', flex: '0 0 auto' }}><ServiceTypeIcon type="Batería" size={26} /></span>
                              <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <span style={{ fontSize: 13.5, fontWeight: 700 }}>{o.label}</span>
                                <span style={{ fontSize: 11, color: textMuted }}>{o.spec}</span>
                                <span style={{ fontSize: 11, color: on ? '#F5C518' : textMuted, fontWeight: 600 }}>Dura ~{o.months} meses</span>
                                {o.note && <span style={{ fontSize: 10.5, color: textMuted }}>{o.note}</span>}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                      <div style={{ fontSize: 11, color: textMuted, marginTop: 8, lineHeight: 1.5 }}>
                        Las opciones salen del tipo de vehículo. La vida útil de cada tipo define cuándo se predice el próximo cambio.
                      </div>
                    </div>
                  )}
                  {serviceType === 'Aceite' && lubricantUse !== 'motor' && (() => {
                    const chip = (on: boolean): React.CSSProperties => ({
                      padding: '7px 13px', borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: on ? 700 : 600, transition: 'all .15s',
                      border: `1.5px solid ${on ? 'rgba(245,197,24,0.45)' : border}`,
                      background: on ? 'rgba(245,197,24,0.15)' : inputBg, color: on ? '#F5C518' : textMuted,
                    })
                    const lab: React.CSSProperties = { fontSize: 11, color: textMuted, fontWeight: 600, display: 'block', marginBottom: 6 }
                    const typeOptions = lubricantUse === 'caja' ? GEAR_VISCOSITIES : TRANSMISSION_FLUIDS.map(f => f.label)
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                          <label style={lab}>Marca <span style={{ color: '#F5C518' }}>*</span></label>
                          <ThemedSuggestInput value={extra.lubricant_brand || ''} onChange={v => setField('lubricant_brand', v)}
                            suggestions={DRIVETRAIN_BRANDS} placeholder="Ej. Motul"
                            style={{ padding: '11px 13px', fontSize: 14 }}
                            theme={{ inputBg: 'var(--input-bg)', inputBorder: 'var(--input-border)', inputText: 'var(--text-1)', accent: '#F5C518', muted: 'var(--text-3)', panelBg: 'var(--panel-bg)' }} />
                        </div>
                        <div>
                          <label style={lab}>{lubricantUse === 'caja' ? 'Viscosidad' : 'Tipo de fluido'} <span style={{ color: '#F5C518' }}>*</span></label>
                          <div role="radiogroup" aria-label={lubricantUse === 'caja' ? 'Viscosidad' : 'Tipo de fluido'} style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {typeOptions.map(t => (
                              <button key={t} type="button" role="radio" aria-checked={extra.lubricant_type === t}
                                onClick={() => setField('lubricant_type', t)} style={chip(extra.lubricant_type === t)}>{t}</button>
                            ))}
                          </div>
                        </div>
                        {lubricantUse === 'caja' ? (
                          <div>
                            <label style={lab}>Norma <span style={{ fontWeight: 400 }}>(opcional)</span></label>
                            <div role="radiogroup" aria-label="Norma" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {GEAR_SPECS.map(t => (
                                <button key={t} type="button" role="radio" aria-checked={extra.lubricant_product === t}
                                  onClick={() => setField('lubricant_product', extra.lubricant_product === t ? '' : t)} style={chip(extra.lubricant_product === t)}>{t}</button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label style={lab}>Producto <span style={{ fontWeight: 400 }}>(opcional)</span></label>
                            <input type="text" value={extra.lubricant_product || ''} maxLength={80} onChange={e => setField('lubricant_product', e.target.value)}
                              placeholder="Ej. Multi ATF" style={{
                                width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 10,
                                border: `1px solid ${border}`, background: inputBg, color: textPrimary, fontSize: 14, outline: 'none',
                              }} />
                          </div>
                        )}
                      </div>
                    )
                  })()}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(serviceType === 'Batería' || (serviceType === 'Aceite' && lubricantUse !== 'motor') ? [] : stDef.fields).filter((f: any) => f.key !== 'air_flow' || !!extra.air_filter).map((f: any) => {
                      /* Marca del aceite (solo Aceite): en vez del texto libre
                         genérico, autocomplete contra el catálogo de aceites/
                         (frontend/src/lib/oilCatalog.ts) con logo de marca, y un
                         campo nuevo de Producto justo debajo, filtrado por esa
                         marca — al elegir un producto se autocompletan solos
                         Producto y Tipo/viscosidad. Si la marca no está en el
                         catálogo o el usuario prefiere escribir libre, ambos
                         campos siguen funcionando como texto normal (no bloquea
                         nada, mismo criterio que ya tenía el campo de viscosidad). */
                      /* Aceite usado (obligatorio): pasarela visual de marcas y productos (OilPicker). Elegir
                         un producto completa marca, producto y viscosidad; si la marca no está en el
                         catálogo se escribe a mano. */
                      if (f.key === 'lubricant_brand' && serviceType === 'Aceite') {
                        return (
                          <OilPicker key={f.key}
                            brand={extra.lubricant_brand || ''} product={extra.lubricant_product || ''}
                            onBrand={marca => setExtra(prev => ({ ...prev, lubricant_brand: marca, lubricant_product: marca === prev.lubricant_brand ? prev.lubricant_product : '' }))}
                            onProduct={item => setExtra(prev => ({ ...prev, lubricant_brand: item.marca, lubricant_product: item.producto, lubricant_type: item.viscosidad }))}
                            onBrandText={t => setExtra(prev => ({ ...prev, lubricant_brand: t, lubricant_product: '' }))}
                            onProductText={t => setField('lubricant_product', t)} />
                        )
                      }
                      if (f.type === 'checkbox') {
                        return (
                          <label key={f.key} style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px',
                            borderRadius: 10, background: btnGhostBg,
                            border: `1px solid ${extra[f.key] ? 'rgba(245,197,24,0.4)' : border}`,
                            cursor: 'pointer', fontSize: 13, color: textPrimary, fontWeight: 500,
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
                            <label style={{ fontSize: 11, color: textMuted, fontWeight: 600, display: 'block', marginBottom: 5 }}>{f.label}</label>
                            <select value={extra[f.key] || ''} onChange={e => setField(f.key, e.target.value)} style={{
                              width: '100%', padding: '11px 13px', borderRadius: 10,
                              border: `1px solid ${border}`, background: inputBg,
                              color: textPrimary, fontSize: 14, outline: 'none', cursor: 'pointer',
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
                            <label style={{ fontSize: 11, color: textMuted, fontWeight: 600, display: 'block', marginBottom: 5 }}>{f.label}{serviceType === 'Aceite' && <span style={{ color: '#F5C518' }}> *</span>}</label>
                            <input
                              type="text" value={val}
                              onChange={e => { setField(f.key, e.target.value); setViscDropdownOpen(true) }}
                              onFocus={() => setViscDropdownOpen(true)}
                              placeholder={f.placeholder}
                              style={{
                                width: '100%', padding: '11px 13px', borderRadius: 10,
                                border: val && LUBRICANT_RULES[val.toUpperCase()] ? '1px solid rgba(245,197,24,0.5)' : `1px solid ${border}`,
                                background: inputBg,
                                color: textPrimary, fontSize: 14, outline: 'none',
                              }}
                            />
                            {viscDropdownOpen && suggestions.length > 0 && val.length > 0 && (
                              <div style={{
                                position: 'absolute', zIndex: 80, top: '100%', left: 0, right: 0, marginTop: 4,
                                background: isDark ? '#1a1a1e' : '#fff', border: '1px solid rgba(245,197,24,0.25)', borderRadius: 10,
                                maxHeight: 200, overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,.6)',
                              }}>
                                {suggestions.map(s => {
                                  const rule = LUBRICANT_RULES[s]
                                  return (
                                    <button key={s} onClick={() => { setField(f.key, s); setViscDropdownOpen(false) }}
                                      style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                                        padding: '10px 13px', background: 'transparent', border: 'none',
                                        borderBottom: `1px solid ${border}`, cursor: 'pointer', textAlign: 'left',
                                      }}>
                                      <div>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary }}>{s}</div>
                                        <div style={{ fontSize: 11, color: textMuted }}>{rule.label} · {rule.lifespanKm.toLocaleString()} km / {rule.lifespanMonths} meses</div>
                                      </div>
                                      <span style={{ display: 'flex', color: '#F5C518' }}><Icon type="Check" size={14} strokeWidth={2.4} /></span>
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
                          <label style={{ fontSize: 11, color: textMuted, fontWeight: 600, display: 'block', marginBottom: 5 }}>{f.label}</label>
                          <input type={f.type} value={extra[f.key] || ''} onChange={e => setField(f.key, e.target.value)}
                            placeholder={f.placeholder} style={{
                              width: '100%', padding: '11px 13px', borderRadius: 10,
                              border: `1px solid ${border}`, background: inputBg,
                              color: textPrimary, fontSize: 14, outline: 'none',
                            }} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            {/* Batería, paso 2: qué se hizo y la medición de voltaje (la etapa extra del wizard). */}
            {serviceType === 'Batería' && role === 'measure' && (() => {
              const action = extra.battery_action === 'review' ? 'review' : 'replace'
              const raw = String(extra.battery_voltage || '').trim()
              const state = raw ? interpretVoltage(parseVoltage(raw)) : null
              const chip = (on: boolean): React.CSSProperties => ({
                padding: '8px 14px', borderRadius: 999, cursor: 'pointer', fontSize: 12.5, fontWeight: on ? 700 : 600, transition: 'all .15s',
                border: `1.5px solid ${on ? 'rgba(245,197,24,0.45)' : border}`,
                background: on ? 'rgba(245,197,24,0.15)' : inputBg, color: on ? '#F5C518' : textMuted,
              })
              return (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#F5C518', fontWeight: 700, marginBottom: 10 }}>Medición</div>
                  <label style={{ fontSize: 11, color: textMuted, fontWeight: 600, display: 'block', marginBottom: 6 }}>¿Qué hiciste?</label>
                  <div role="radiogroup" aria-label="Acción" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                    <button type="button" role="radio" aria-checked={action === 'replace'} onClick={() => setField('battery_action', 'replace')} style={chip(action === 'replace')}>Cambié la batería</button>
                    <button type="button" role="radio" aria-checked={action === 'review'} onClick={() => setField('battery_action', 'review')} style={chip(action === 'review')}>Solo la revisé</button>
                  </div>
                  <label style={{ fontSize: 11, color: textMuted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Voltaje en reposo <span style={{ fontWeight: 400 }}>(opcional)</span></label>
                  <input type="text" inputMode="decimal" value={extra.battery_voltage || ''} placeholder="Ej. 12.6"
                    onChange={e => setField('battery_voltage', e.target.value)} style={{
                      width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 10, fontSize: 14, outline: 'none',
                      border: state === 'invalida' ? '1.5px solid #ff4d6a' : raw ? '1px solid rgba(245,197,24,0.5)' : `1px solid ${border}`,
                      background: inputBg, color: textPrimary,
                    }} />
                  {state && (
                    <div style={{ fontSize: 12, marginTop: 6, fontWeight: 600, color: state === 'ok' || state === 'aceptable' ? '#F5C518' : state === 'baja' ? '#ffb020' : '#ff4d6a' }}>
                      {VOLTAGE_LABEL[state]}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: textMuted, marginTop: 6, lineHeight: 1.5 }}>
                    Mide con el motor apagado y en reposo: 12,6 V o más es carga completa; menos de 12,0 V, descargada.
                  </div>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', marginTop: 12, borderRadius: 10, background: btnGhostBg,
                    border: `1px solid ${extra.battery_check ? 'rgba(245,197,24,0.4)' : border}`, cursor: 'pointer', fontSize: 13, color: textPrimary, fontWeight: 500,
                  }}>
                    <input type="checkbox" checked={!!extra.battery_check} onChange={e => setField('battery_check', e.target.checked)}
                      style={{ width: 17, height: 17, accentColor: '#F5C518', cursor: 'pointer' }} />
                    Batería verificada (prueba de carga)
                  </label>
                </div>
              )
            })()}

            {/* Common fields */}
            {(!wizard || role === 'general') && <>
            <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: textMuted, fontWeight: 700, marginBottom: 12 }}>Datos generales</div>
            <div className="regGrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, alignItems: 'start' }}>
              <div>
                <label style={{ fontSize: 11, color: textMuted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Kilometraje actual *</label>
                <input type="number" value={mileage} onChange={e => setMileage(e.target.value)}
                  placeholder="Ej. 50000" style={{
                    width: '100%', padding: '11px 13px', borderRadius: 10,
                    border: mileage && latestMileage != null && !editRecord
                      ? parseInt(mileage) < latestMileage
                        ? '1.5px solid #ff4d6a'
                        : parseInt(mileage) > latestMileage + 100000
                          ? '1.5px solid #ffb020'
                          : '1px solid rgba(245,197,24,0.5)'
                      : '1px solid rgba(255,255,255,0.14)',
                    background: inputBg,
                    color: textPrimary, fontSize: 14, outline: 'none',
                  }} />
                {mileage && latestMileage != null && !editRecord && parseInt(mileage) < latestMileage ? (
                  <div style={{ fontSize: 11, color: '#ff4d6a', marginTop: 4, lineHeight: 1.3 }}>No puede ser menor al último registrado ({latestMileage.toLocaleString()} km)</div>
                ) : latestMileage != null && !editRecord ? (
                  <div style={{ fontSize: 10.5, color: textMuted, marginTop: 4, lineHeight: 1.3 }}>Último registrado: {latestMileage.toLocaleString()} km</div>
                ) : null}
              </div>
              <div>
                <label style={{ fontSize: 11, color: textMuted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Fecha</label>
                <ThemedDateInput className="date-field" value={date} onChange={e => setDate(e.target.value)} style={{ height: 40 }}
                  min={(() => {
                    const limit = localISO(new Date(Date.now() - MAX_BACKDATE_DAYS * 86400000))
                    const own = editRecord?.date?.slice(0, 10)
                    return own && own < limit ? own : limit
                  })()}
                  max={localISO(new Date())} />
              </div>
              <div ref={wsRef} style={{ position: 'relative' }}>
                <label style={{ fontSize: 11, color: textMuted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Taller</label>
                <div style={{ position: 'relative' }}>
                  <input type="text" value={workshop} onChange={e => handleWsInput(e.target.value)}
                    onFocus={() => { if (wsResults.length > 0) setShowWsDropdown(true) }}
                    placeholder="Nombre o código TLR-XXXXX"
                    style={{
                      width: '100%', padding: '11px 13px', borderRadius: 10,
                      border: workshopId ? '1px solid rgba(245,197,24,0.5)' : `1px solid ${border}`,
                      background: inputBg,
                      color: textPrimary, fontSize: 14, outline: 'none',
                    }} />
                  {wsSearching && (
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(245,197,24,0.2)', borderTopColor: '#F5C518', animation: 'spin .6s linear infinite', display: 'inline-block' }} />
                  )}
                </div>
                {showWsDropdown && wsResults.length > 0 && (
                  <div style={{
                    position: 'absolute', zIndex: 80, top: '100%', left: 0, right: 0, marginTop: 4,
                    background: isDark ? '#1a1a1e' : '#fff', border: '1px solid rgba(245,197,24,0.2)', borderRadius: 10,
                    maxHeight: 200, overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,.6)',
                  }}>
                    {wsResults.map(ws => (
                      <button key={ws.id} onClick={() => selectWorkshop(ws)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 13px',
                          background: 'transparent', border: 'none',                           borderBottom: `1px solid ${border}`,
                          color: textPrimary, fontSize: 13, cursor: 'pointer', textAlign: 'left',
                        }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: '#F5C518', fontWeight: 700, flex: '0 0 auto' }}>{ws.code}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>
                            {ws.name}
                            {ws.is_verified && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4, verticalAlign: 'middle' }}><path d="M20 6L9 17l-5-5"/></svg>}
                          </div>
                          <div style={{ fontSize: 11, color: textMuted }}>{ws.city}{ws.address ? ` · ${ws.address}` : ''}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {workshopId && (
                  <div style={{ fontSize: 11, color: '#F5C518', marginTop: 4, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>Taller registrado</div>
                )}
              </div>
              <div>
                <label style={{ fontSize: 11, color: textMuted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Costo</label>
                <input type="number" value={cost} onChange={e => setCost(e.target.value)}
                  placeholder="$0" style={{
                    width: '100%', padding: '11px 13px', borderRadius: 10,
                    border: `1px solid ${border}`, background: inputBg,
                    color: textPrimary, fontSize: 14, outline: 'none',
                  }} />
              </div>
            </div>
            </>}

            {/* Lubricant rule prediction — auto from type/viscosity (paso 3 del wizard) */}
            {serviceType === 'Aceite' && role === 'confirm' && lubricantUse !== 'motor' && (() => {
              const l = lifespanFor(lubricantUse, extra.lubricant_type)
              return (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#F5C518', fontWeight: 700, marginBottom: 10 }}>Predicción de vida útil</div>
                  <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(245,197,24,0.06)', border: '1px solid rgba(245,197,24,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#F5C518' }}>{USE_INFO[lubricantUse].label}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#d8c98a' }}>{extra.lubricant_type}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 20, fontSize: 12, color: '#d8c98a', flexWrap: 'wrap' }}>
                      <div><span style={{ color: '#8a7a3c' }}>Vida útil:</span> <b>{l.km.toLocaleString()} km</b></div>
                      <div><span style={{ color: '#8a7a3c' }}>Tiempo:</span> <b>{l.months} meses</b></div>
                    </div>
                  </div>
                </div>
              )
            })()}
            {serviceType === 'Aceite' && role === 'confirm' && lubricantUse === 'motor' && (() => {
              const rule = getLubricantRule(extra.lubricant_type)
              if (!rule) return (
                <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: btnGhostBg, border: `1px solid ${border}`, fontSize: 12, color: textMuted }}>
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

            {/* Programación + Vista previa — en Aceite, paso 3 (Confirmar); en el
               resto de tipos de servicio siempre visibles, sin wizard. */}
            {(!wizard || role === 'confirm') && <>
            {/* Common field: Próximo servicio (km) — auto-calculated, editable */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#F5C518', fontWeight: 700, marginBottom: 10 }}>
                Programación
              </div>
              <div>
                <label style={{ fontSize: 11, color: textMuted, fontWeight: 600, display: 'block', marginBottom: 5 }}>Proximo servicio (km)</label>
                <input type="number" value={extra.next_service_mileage || ''} onChange={e => setField('next_service_mileage', e.target.value)}
                  placeholder="Se calcula automaticamente" style={{
                    width: '100%', padding: '11px 13px', borderRadius: 10,
                    border: extra.next_service_mileage ? '1px solid rgba(245,197,24,0.4)' : `1px solid ${border}`,
                    background: inputBg,
                    color: textPrimary, fontSize: 14, outline: 'none',
                  }} />
                {extra.next_service_mileage && (
                  <div style={{ fontSize: 11, color: textMuted, marginTop: 4 }}>
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
                  <span style={{ display: 'block', marginTop: 2, fontSize: 11, color: textMuted }}>
                    {rule.label} · {rule.lifespanKm.toLocaleString()} km / {rule.lifespanMonths} meses
                  </span>
                ) : null
              })()}
              {serviceType === 'Aceite' && extra.lubricant_product && (
                <span style={{ display: 'block', marginTop: 2, fontSize: 11, color: textMuted }}>
                  Producto: {extra.lubricant_product}
                </span>
              )}
            </div>
            </>}

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 13 }}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              {wizard && aceiteStep > 1 ? (
                <button onClick={() => { setError(''); setAceiteStep(prev => Math.max(1, prev - 1)) }}
                  style={{
                    padding: '12px 18px', borderRadius: 11,
                    border: `1px solid ${border}`, background: btnGhostBg,
                    color: textSecondary, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                  Atrás
                </button>
              ) : (
                <button onClick={() => { if (!editRecord) { setStep('type'); setAceiteStep(1) } }} disabled={!editRecord && step === 'form' ? false : false}
                  style={{
                    padding: '12px 18px', borderRadius: 11,
                    border: `1px solid ${border}`, background: btnGhostBg,
                    color: textSecondary, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                  {editRecord ? 'Cancelar' : 'Cambiar tipo'}
                </button>
              )}
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
              {wizard && aceiteStep < totalSteps ? (
                <button onClick={handleAceiteNext} style={{
                  padding: '12px 24px', borderRadius: 11, border: 'none',
                  background: '#F5C518', color: '#111',
                  fontWeight: 800, fontSize: 13, cursor: 'pointer',
                  boxShadow: '0 0 20px rgba(245,197,24,0.35)',
                }}>
                  Siguiente
                </button>
              ) : (
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
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
