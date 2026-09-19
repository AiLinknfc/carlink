'use client'

import { useState, useEffect } from 'react'
import { apiGet, apiPost } from '@/lib/api'
import { uploadFile, scanVehicleCard } from '@/lib/upload'
import { formatPlate, parsePlate, getPlateConfig, plateShowsCountryLabel, PLATE_TYPE_LABELS, type PlateType } from '@/lib/plate'
import { CITIES } from '@/lib/constants'
import { normalizeBodyType, matchColorKeyword } from '@/lib/vehicleBrands'
import ThemedSuggestInput from '@/components/ThemedSuggestInput'
import CameraCapture from '@/components/CameraCapture'
import { getDraft, saveDraft } from './OnboardingWizard'
import { SUPPORT_WHATSAPP } from '@/lib/checkout'

const SUGGEST_THEME = { inputBg: 'var(--input-bg)', inputBorder: 'var(--input-border)', inputText: 'var(--text-1)', accent: '#F5C518', muted: 'var(--text-3)', panelBg: 'var(--panel-bg)' }

const PLATE_TYPE_KEYS = Object.keys(PLATE_TYPE_LABELS) as PlateType[]

interface Props {
  userId: string
  theme: 'light' | 'dark'
  vehicle?: any
  onCreated: (vehicle: any) => void
  onContinue?: () => void
}

/* Placa + Ciudad + Tipo son los obligatorios (2026-09-15, rediseño pedido por
   el usuario) — el backend ya acepta un vehículo con marca/modelo/año/color
   vacíos (VehicleCreate: sólo `plate` es obligatorio en el schema, el resto
   tiene default "" / 0), así que no hace falta pedirlos acá.

   "Tipo" es el TIPO DE PLACA (particular/moto/publico/diplomatica/carga/
   remolque/clasico — @/lib/plate, las mismas 7 categorías y las mismas
   reglas de largo de letras/números) — no una carrocería (Sedán/SUV/etc,
   eso vive en `body_type`, ver más abajo). Antes este paso usaba
   VEHICLE_TYPES (carrocería) con una inferencia simplista moto/no-moto,
   distinta de las reglas reales que ya usan tanto el hero de la landing
   (`app/page.tsx`) como el checkout del llavero (`CartModal.tsx`) — eso
   hacía que una placa de taxi/diplomática/carga/remolque no validara con el
   largo correcto acá (2026-09-15, corregido a pedido del usuario: "mismas
   reglas de validación... no te equivoques en el wizard"). La carrocería se
   sigue completando después desde el perfil si no se dedujo del escaneo.

   Escaneo de la tarjeta de propiedad, frente y reverso (2026-09-18, antes
   sólo se pedía el frente): el frente corre OCR y completa placa/ciudad/
   marca/modelo/año/color/carrocería/nombre; el reverso sólo se archiva como
   documento, no aporta datos estructurados — el bloque entero sigue siendo
   opcional (el usuario puede completar todo a mano si no tiene la tarjeta),
   pero si escanea se le pide de una vez el reverso. */
export default function StepVehiculo({ userId, theme, vehicle, onCreated, onContinue }: Props) {
  const isDark = theme !== 'light'
  const textPrimary = 'var(--text-1)'
  const textMuted = 'var(--text-3)'
  const inputBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(17,17,17,0.04)'
  const inputBorder = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(17,17,17,0.12)'

  const [plateLetters, setPlateLetters] = useState(() => getDraft(userId, 'vehiculo_plateLetters'))
  const [plateNumbers, setPlateNumbers] = useState(() => getDraft(userId, 'vehiculo_plateNumbers'))
  const [city, setCity] = useState(() => getDraft(userId, 'vehiculo_city'))
  // Sin default (2026-09-15, pedido del usuario): los 3 campos son
  // obligatorios de verdad — nada se da por elegido hasta que el usuario (o
  // la landing, ver el efecto de abajo) lo llena. Un borrador viejo que ya
  // no sea una de las 7 claves válidas se descarta (ver `plateTypeValid`).
  const [plateTypeRaw, setPlateTypeRaw] = useState(() => getDraft(userId, 'vehiculo_type'))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Datos silenciosos leídos de la tarjeta escaneada — no se muestran como
  // campos, viajan tal cual en el POST /vehicles. El usuario los completa
  // más adelante desde su perfil si no escaneó nada.
  const [ocrData, setOcrData] = useState<{ brand: string; model: string; year: number; color: string; bodyType: string; ownerName: string }>({ brand: '', model: '', year: 0, color: '', bodyType: '', ownerName: '' })
  const [frontFile, setFrontFile] = useState<File | null>(null)
  const [backFile, setBackFile] = useState<File | null>(null)
  // Qué cara está por capturar la cámara — reemplaza el `showCam: boolean`
  // de antes, ahora que hay dos capturas posibles (2026-09-18).
  const [camSide, setCamSide] = useState<'frente' | 'reverso' | null>(null)
  const [scanning, setScanning] = useState(false)
  // Separado de `scanning` (2026-09-19) — si compartieran el mismo flag, el
  // botón "Escanear frente" (ya con frontFile) parpadearía a "Leyendo..."
  // mientras corre el OCR de respaldo del reverso.
  const [backScanning, setBackScanning] = useState(false)
  const [scanHint, setScanHint] = useState<string | null>(null)
  // Chequeo de placa duplicada contra la base real — mismo patrón que
  // CartModal.tsx (GET /vehicles/plate-check), pedido explícito del usuario
  // (2026-09-19): "las validaciones deben establecerse de la misma manera
  // como lo están en el carrito de compras". Antes acá el único aviso era
  // el genérico "No se pudo agregar el vehiculo" que tira POST /vehicles
  // al toparse con la restricción UNIQUE(owner_id, plate) — no explicaba
  // la causa real.
  const [plateExists, setPlateExists] = useState(false)
  const [plateOwnedByYou, setPlateOwnedByYou] = useState(false)
  // Otra cuenta la registró gratis y sin verificar: no bloquea, sólo se avisa.
  const [plateClaimable, setPlateClaimable] = useState(false)
  const [plateChecking, setPlateChecking] = useState(false)

  const plateTypeValid = PLATE_TYPE_KEYS.includes(plateTypeRaw as PlateType)
  const plateType = (plateTypeValid ? plateTypeRaw : 'particular') as PlateType
  const plateConfig = getPlateConfig(plateType)
  const plate = formatPlate(plateLetters, plateNumbers, plateType)
  const plateComplete = plateLetters.length === plateConfig.letterLen && plateNumbers.length === (plateConfig.moto ? 3 : plateConfig.numLen)
  const canSubmit = plateComplete && !!city && plateTypeValid && !saving && !plateExists && !plateChecking

  // Recupera placa/ciudad si el usuario ya las había escrito en la landing
  // (hero público, antes de loguearse) — mismo sessionStorage que ya usaba
  // el registro viejo. `parsePlate` ya detecta el tipo real (de las 7
  // categorías) a partir de la forma de la placa, así que se usa tal cual
  // en vez de asumir sólo moto/particular. Sólo si el paso todavía está
  // vacío (no pisa un borrador en curso ni un vehículo ya cargado), y el
  // usuario puede corregir cualquier dato acá antes de continuar. Se
  // consume una sola vez.
  useEffect(() => {
    if (vehicle || plateLetters || plateNumbers) return
    if (typeof window === 'undefined') return
    const savedPlate = sessionStorage.getItem('carlink_plate')
    const savedCity = sessionStorage.getItem('carlink_city')
    if (savedPlate) {
      const parsed = parsePlate(savedPlate)
      if (parsed) {
        setPlateLetters(parsed.letters)
        setPlateNumbers(parsed.numbers)
        setPlateTypeRaw(parsed.type)
      }
      sessionStorage.removeItem('carlink_plate')
    }
    if (savedCity) {
      if (CITIES.includes(savedCity)) setCity(savedCity)
      sessionStorage.removeItem('carlink_city')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Si el usuario vuelve "Atras" a este paso ya completado (`vehicle` viene
  // seteado desde el wizard), no hay nada más que pedir acá — avanza solo,
  // sin pantalla intermedia (2026-09-15, mismo criterio que StepWhatsapp).
  useEffect(() => {
    if (vehicle) onContinue?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle])

  useEffect(() => {
    if (vehicle) return
    saveDraft(userId, 'vehiculo_plateLetters', plateLetters)
  }, [plateLetters, userId, vehicle])
  useEffect(() => {
    if (vehicle) return
    saveDraft(userId, 'vehiculo_plateNumbers', plateNumbers)
  }, [plateNumbers, userId, vehicle])
  useEffect(() => {
    if (vehicle) return
    saveDraft(userId, 'vehiculo_city', city)
  }, [city, userId, vehicle])
  useEffect(() => {
    if (vehicle) return
    saveDraft(userId, 'vehiculo_type', plateTypeRaw)
  }, [plateTypeRaw, userId, vehicle])

  // Ciudad por defecto "Colombia" sólo para moto (2026-09-19, pedido del
  // usuario): la tarjeta de una moto muchas veces no trae ningún municipio
  // en ningún lado (a diferencia de un carro), así que exigir uno real
  // trababa el registro. Sigue siendo editable — si el usuario encuentra o
  // sabe el municipio real, lo escribe encima. Se limpia sola si cambia a
  // otro tipo de placa y el valor seguía siendo ese default sin tocar.
  useEffect(() => {
    if (plateShowsCountryLabel(plateType) && !city) setCity('Colombia')
    else if (!plateShowsCountryLabel(plateType) && city === 'Colombia') setCity('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plateType])

  // Chequeo de placa duplicada, debounced — mismo timing/patrón que
  // CartModal.tsx (400ms, GET /vehicles/plate-check, público).
  useEffect(() => {
    if (!plateComplete) {
      setPlateExists(false)
      setPlateOwnedByYou(false)
      setPlateClaimable(false)
      setPlateChecking(false)
      return
    }
    let cancelled = false
    setPlateChecking(true)
    const timer = setTimeout(async () => {
      const res = await apiGet<{ exists: boolean; owned_by_you: boolean; reserved_by_other?: boolean }>(`/vehicles/plate-check?plate=${encodeURIComponent(plate)}`)
      if (cancelled) return
      // Bloquea si ya es tuya o si otra cuenta la tiene verificada / con
      // llavero activo. Un registro gratuito sin verificar de otra cuenta no
      // reserva la placa: se puede seguir y reclamarla verificando la tarjeta.
      const owned = res?.owned_by_you ?? false
      const reserved = res?.reserved_by_other ?? false
      setPlateExists((res?.exists ?? false) && (owned || reserved))
      setPlateOwnedByYou(owned)
      setPlateClaimable((res?.exists ?? false) && !owned && !reserved)
      setPlateChecking(false)
    }, 400)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [plate, plateComplete])

  // Mismas reglas de formato que CartModal.tsx (checkout del llavero) y el
  // hero de la landing (app/page.tsx): moto arma "2 dígitos + 1 letra" en
  // vez de aceptar cualquier combinación, y remolque sólo admite R o S
  // (Remolque/Semirremolque) en su única letra.
  const handleLetters = (v: string) => {
    let val = v.toUpperCase().replace(/[^A-Z]/g, '').slice(0, plateConfig.letterLen)
    if (plateType === 'remolque') val = val.replace(/[^RS]/g, '')
    setPlateLetters(val)
  }
  const handleNumbers = (v: string) => {
    const raw = v.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (plateConfig.moto) {
      const digits = raw.replace(/[^0-9]/g, '').slice(0, 2)
      const letter = raw.replace(/[^A-Z]/g, '').slice(0, 1)
      setPlateNumbers(digits + letter)
    } else {
      setPlateNumbers(raw.replace(/[^0-9]/g, '').slice(0, plateConfig.numLen))
    }
  }

  const handleFrontCapture = async (file: File) => {
    setFrontFile(file)
    setScanning(true)
    setScanHint(null)
    // Cada escaneo nuevo reemplaza al anterior: se descartan los datos leídos
    // antes, así nunca quedan mezclados con los de otra tarjeta si esta
    // lectura falla o trae menos campos.
    setOcrData({ brand: '', model: '', year: 0, color: '', bodyType: '', ownerName: '' })
    try {
      const data = await scanVehicleCard(file)
      if (!data) { setScanHint('No pudimos leer la tarjeta — completa placa y ciudad a mano.'); return }
      const filled: string[] = []
      let parsedType: PlateType | null = null
      if (data.plate) {
        const parsed = parsePlate(data.plate)
        if (parsed) { setPlateLetters(parsed.letters); setPlateNumbers(parsed.numbers); setPlateTypeRaw(parsed.type); parsedType = parsed.type; filled.push('placa') }
      }
      if (data.city && CITIES.includes(data.city)) { setCity(data.city); filled.push('ciudad') }
      // Carrocería: primero se intenta deducir del campo "CLASE" que trae
      // la tarjeta; si no matchea nada conocido pero la placa es de moto,
      // se asume "Moto" igual — cubre el caso reportado de una moto
      // escaneada mostrando "Sedán" en el perfil (2026-09-18).
      const bodyType = normalizeBodyType(data.vehicle_class) || (parsedType === 'moto' ? 'Moto' : '')
      setOcrData({
        brand: data.brand || '',
        model: data.model || '',
        year: data.year && data.year > 1900 ? data.year : 0,
        color: matchColorKeyword(data.color),
        bodyType,
        // Nombre del propietario según la tarjeta — NO se escribe en el
        // nombre de la cuenta (2026-09-19: la cuenta no necesariamente es
        // la misma persona que figura en la tarjeta, ej. auto de un
        // familiar o todavía no traspasado). Viaja como `owner_name`, un
        // campo propio del vehículo, en el POST /vehicles.
        ownerName: data.owner_name || '',
      })
      if (data.brand || data.model) filled.push('datos del vehiculo')
      if (bodyType) filled.push('tipo de vehiculo')
      if (data.owner_name) filled.push('nombre del propietario')
      setScanHint(filled.length
        ? `Leimos: ${filled.join(', ')}. Revisa los datos antes de continuar.`
        : 'No pudimos leer datos claros — completa placa y ciudad a mano.')
    } finally {
      setScanning(false)
      setCamSide(null)
    }
  }

  const handleBackCapture = async (file: File) => {
    setBackFile(file)
    setCamSide(null)
    // El reverso también se lee (2026-09-18): en varias tarjetas el nombre del
    // propietario, la ciudad del organismo de tránsito u otros datos están de
    // ese lado, y antes no se leía si el frente ya había traído la ciudad.
    // Nunca pisa lo que el frente (o el usuario) ya completó: sólo llena lo
    // que sigue vacío. "Colombia" no cuenta como ciudad ya completada: es el
    // default de moto sin dato real.
    setBackScanning(true)
    try {
      const data = await scanVehicleCard(file)
      if (!data) { setScanHint('Reverso registrado. No pudimos leerlo — completa los datos a mano.'); return }
      const filled: string[] = []
      if (data.city && CITIES.includes(data.city) && (!city || city === 'Colombia')) {
        setCity(data.city)
        filled.push('ciudad')
      }
      setOcrData(prev => {
        const next = { ...prev }
        if (!prev.ownerName && data.owner_name) { next.ownerName = data.owner_name; filled.push('nombre del propietario') }
        if (!prev.brand && data.brand) { next.brand = data.brand; filled.push('marca') }
        if (!prev.model && data.model) next.model = data.model
        if (!prev.year && data.year && data.year > 1900) next.year = data.year
        if (!prev.color && data.color) next.color = matchColorKeyword(data.color)
        if (!prev.bodyType) next.bodyType = normalizeBodyType(data.vehicle_class) || prev.bodyType
        return next
      })
      setScanHint(filled.length ? `Reverso registrado. Leimos: ${filled.join(', ')}.` : 'Reverso registrado.')
    } finally {
      setBackScanning(false)
    }
  }

  /* Best-effort: si falla acá el vehículo ya quedó creado, no bloquea el
     wizard — la tarjeta se puede volver a subir después desde Documentos. */
  const archiveCardPhoto = async (vehicleId: string, file: File, side: 'frente' | 'reverso'): Promise<string | null> => {
    try {
      const url = await uploadFile(file, 'documents')
      if (!url) return null
      await apiPost('/documents', {
        vehicle_id: vehicleId,
        name: side === 'reverso' ? 'Tarjeta de propiedad (reverso)' : 'Tarjeta de propiedad',
        type: 'propiedad',
        file_url: url,
        notes: `status=vigente;type=propiedad;side=${side}`,
      })
      return url
    } catch (e) { console.warn(`No se pudo archivar la tarjeta de propiedad (${side})`, e); return null }
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    // Mismo fallback moto->Moto de la captura, pero acá cubre también el
    // caso sin escaneo: tipo de placa "moto" elegido a mano ya alcanza para
    // no mostrar "Sedán" a lo ciego en el perfil (2026-09-18).
    const bodyType = ocrData.bodyType || (plateType === 'moto' ? 'Moto' : '')
    const created = await apiPost('/vehicles', {
      plate, city, type: plateType,
      brand: ocrData.brand, model: ocrData.model, year: ocrData.year, color: ocrData.color,
      body_type: bodyType, owner_name: ocrData.ownerName,
    })
    if (!created) {
      setSaving(false)
      setError('No se pudo agregar el vehiculo — revisa la placa e intenta de nuevo.')
      return
    }
    const frontUrl = frontFile ? await archiveCardPhoto(created.id, frontFile, 'frente') : null
    const backUrl = backFile ? await archiveCardPhoto(created.id, backFile, 'reverso') : null
    // Las dos caras ya están guardadas: se envían solas a revisión del admin
    // (la misma verificación del perfil), así el usuario no las sube de nuevo.
    // Con una sola cara queda sin enviar; el perfil pide la que falta.
    if (frontUrl && backUrl) {
      const sent = await apiPost(`/vehicles/${created.id}/verification`, { verification_doc_url: frontUrl, verification_doc_url_back: backUrl })
      if (sent) created.verification_status = 'pending'
    }
    saveDraft(userId, 'vehiculo_plateLetters', '')
    saveDraft(userId, 'vehiculo_plateNumbers', '')
    saveDraft(userId, 'vehiculo_city', '')
    saveDraft(userId, 'vehiculo_type', '')
    setSaving(false)
    onCreated(created)
  }

  if (vehicle) {
    // Sin pantalla de "Vehiculo registrado" (2026-09-15, pedido del
    // usuario) — antes se quedaba ahí sin ningún botón para avanzar si el
    // usuario volvía "Atras" a este paso ya completado. El dato ya está
    // guardado (persiste solo, no hace falta notificarlo acá); el efecto de
    // arriba avanza directo al siguiente paso.
    return null
  }

  const labelStyle = { fontSize: 11, color: textMuted, fontWeight: 700 as const, display: 'block' as const, marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '.06em' }
  const cardBoxStyle = { padding: 14, borderRadius: 12, background: isDark ? 'rgba(245,197,24,0.06)' : 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.25)' }

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 800, color: textPrimary, marginBottom: 4 }}>Tu vehiculo</div>
      <div style={{ fontSize: 12, color: textMuted, marginBottom: 16 }}>Tipo de placa, placa y ciudad para empezar — el resto lo completas cuando quieras desde tu perfil.</div>

      {/* Tarjeta de propiedad primero (2026-09-18, reordenado a pedido del
         usuario): es el camino más rápido — si la tenés a mano, escaneala y
         completamos todo por vos. Los campos manuales quedan debajo, para
         cuando no la tengas encima. */}
      <div style={{ ...cardBoxStyle, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: textPrimary, marginBottom: 2 }}>Tenes la tarjeta de propiedad a mano?</div>
        <div style={{ fontSize: 11.5, color: textMuted, marginBottom: 12, lineHeight: 1.5 }}>
          Escaneala (frente y reverso) y completamos tipo, placa, ciudad y los datos del vehiculo por vos. Asegurate de que se vea clara, con buena luz.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setCamSide('frente')} disabled={scanning} style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 10, border: 'none',
            background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 12.5, cursor: scanning ? 'default' : 'pointer', opacity: scanning ? 0.6 : 1,
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
            {scanning ? 'Leyendo...' : frontFile ? 'Frente registrado' : 'Escanear frente'}
          </button>
          {/* Reverso: color neutro hasta que se escanea; recién ahí pasa a
             amarillo, igual que "Frente registrado". */}
          {frontFile && (
            <button onClick={() => setCamSide('reverso')} disabled={backScanning} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 10,
              border: backFile ? '1px solid transparent' : '1px solid var(--input-border)',
              background: backFile ? '#F5C518' : 'var(--input-bg)', color: backFile ? '#111' : 'var(--text-2)', fontWeight: 800, fontSize: 12.5,
              cursor: backScanning ? 'default' : 'pointer', opacity: backScanning ? 0.6 : 1,
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
              {backScanning ? 'Leyendo...' : backFile ? 'Reverso registrado' : 'Escanear reverso'}
            </button>
          )}
        </div>
        {scanHint && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${isDark ? 'rgba(245,197,24,0.2)' : 'rgba(245,197,24,0.3)'}`, fontSize: 12, color: isDark ? '#d8c98a' : '#8a6d00', lineHeight: 1.5 }}>
            {scanHint}
            {/* El escaneo se puede repetir — el botón de arriba ya lo
               permite (no queda bloqueado), pero sin este link no era obvio
               que un escaneo que salió mal se puede reintentar
               (2026-09-19, pedido del usuario). */}
            {frontFile && !scanning && (
              <>
                {' '}
                <button type="button" onClick={() => setCamSide('frente')} style={{ padding: 0, border: 'none', background: 'transparent', color: 'inherit', fontWeight: 700, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                  Volver a escanear documento
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: '#F5C518', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
        No la tenes a mano? Completa los datos manualmente
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Tipo de placa</label>
        {/* Tiles, no <select> ni texto libre (2026-09-15) — son sólo 7
           categorías cerradas y cada una cambia el largo válido de la
           placa, así que necesita selección estricta (no algo que se pueda
           tipear mal) con el resaltado amarillo de la guía de diseño. */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PLATE_TYPE_KEYS.map(pt => {
            const isSelected = plateTypeRaw === pt
            return (
              <button key={pt} type="button" onClick={() => {
                // Limpia placa/numeros al cambiar de tipo (2026-09-15) —
                // mismo criterio que CartModal.tsx. Sin esto, el valor
                // tecleado bajo el tipo anterior quedaba pegado: invisible
                // para Moto/Particular (mismo largo, 3+3) pero inconsistente
                // para el resto (ej. Diplomática, 2+4) — el usuario veía la
                // placa "sin cambiar" al tocar otro tipo.
                setPlateTypeRaw(pt)
                setPlateLetters('')
                setPlateNumbers('')
              }}
                style={{
                  padding: '7px 13px', borderRadius: 999, cursor: 'pointer',
                  border: `1.5px solid ${isSelected ? 'rgba(245,197,24,0.45)' : inputBorder}`,
                  background: isSelected ? 'rgba(245,197,24,0.15)' : inputBg,
                  color: isSelected ? '#F5C518' : textMuted,
                  fontSize: 12, fontWeight: isSelected ? 700 : 600, transition: 'all .15s',
                }}>
                {PLATE_TYPE_LABELS[pt]}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Placa</label>
          {/* Misma altura (46px, border-box) que Ciudad (2026-09-15) — sin
             esto, el font-display más grande de la placa la hacía ver más
             alta que el otro campo. Placeholder gris (2026-09-18,
             .wizard-plate-input en globals.css) — sin eso heredaba el
             mismo amarillo del texto ya tecleado, fácil de confundir. */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input className="wizard-plate-input" value={plateLetters} onChange={e => handleLetters(e.target.value)} maxLength={plateConfig.letterLen} placeholder={'A'.repeat(plateConfig.letterLen)}
              style={{ width: '100%', height: 46, boxSizing: 'border-box', padding: '0 11px', borderRadius: 10, border: `1px solid ${inputBorder}`, background: inputBg, color: '#F5C518', fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '.03em', outline: 'none' }} />
            <span style={{ padding: '0 5px', color: '#F5C518', fontFamily: 'var(--font-display)', fontSize: 16 }}>-</span>
            <input className="wizard-plate-input" value={plateNumbers} onChange={e => handleNumbers(e.target.value)} maxLength={plateConfig.moto ? 3 : plateConfig.numLen} placeholder={plateConfig.placeholder.split('-')[1]}
              style={{ width: '100%', height: 46, boxSizing: 'border-box', padding: '0 11px', borderRadius: 10, border: `1px solid ${inputBorder}`, background: inputBg, color: '#F5C518', fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '.03em', outline: 'none' }} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Ciudad</label>
          <ThemedSuggestInput value={city} onChange={setCity} suggestions={CITIES} placeholder="Elige o escribe"
            style={{ height: 46, boxSizing: 'border-box', padding: '0 11px', fontSize: 13 }} theme={SUGGEST_THEME} />
        </div>
      </div>

      {/* Placa duplicada — mismo aviso que CartModal.tsx, antes de intentar
         guardar (2026-09-19). */}
      {plateExists && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" style={{ flex: '0 0 auto', marginTop: 1 }}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          <span style={{ fontSize: 11.5, color: '#ef4444', lineHeight: 1.5 }}>
            {plateOwnedByYou
              ? 'Ya tenés esta placa registrada en tu cuenta. '
              : 'Esta placa ya está verificada o activa en otra cuenta. Si es tuya, inicia sesión con la cuenta donde la registraste. '}
            <a href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(`¡Hola CarLink! Quiero registrar la placa ${plate} y el sistema me dice que ya está registrada. ¿Me ayudan a verificarlo?`)}`}
              target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: '#ef4444' }}>
              Contactanos
            </a>.
          </span>
        </div>
      )}

      {plateClaimable && !plateExists && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.3)', fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 4 }}>
          Esta placa ya fue registrada por otra cuenta sin verificar. Puedes continuar: al verificar tu tarjeta de propiedad, la placa quedará a tu nombre.
        </div>
      )}

      {error && <div style={{ fontSize: 12, color: '#ff4d6a', margin: '12px 0 0' }}>{error}</div>}

      {/* Sin "Atras" (2026-09-15, pedido del usuario) — ver comentario en
         OnboardingWizard.tsx. */}
      <button onClick={handleSubmit} disabled={!canSubmit}
        style={{
          width: '100%', padding: 13, borderRadius: 12, border: 'none', marginTop: 16,
          background: saving ? 'rgba(245,197,24,0.4)' : '#F5C518', color: '#111',
          fontWeight: 800, fontSize: 14, cursor: canSubmit ? 'pointer' : 'not-allowed',
          opacity: canSubmit ? 1 : 0.5, transition: 'all .16s',
        }}>
        {saving ? 'Guardando...' : 'Guardar vehiculo'}
      </button>

      {camSide && (
        <CameraCapture
          onCapture={camSide === 'frente' ? handleFrontCapture : handleBackCapture}
          onClose={() => setCamSide(null)}
        />
      )}
    </div>
  )
}
