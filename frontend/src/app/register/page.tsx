'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/store/auth'
import { CITIES } from '@/lib/constants'
import { supabase, apiUrl } from '@/lib/supabase'
import { formatPlate, PLATE_LETTERS, PLATE_NUMBERS } from '@/lib/plate'
import { scanVehicleCard } from '@/lib/upload'

const BRANDS = [
  'Chevrolet', 'Renault', 'Mazda', 'Toyota', 'Nissan', 'Kia', 'Hyundai',
  'Volkswagen', 'Ford', 'Suzuki', 'BMW', 'Mercedes-Benz', 'Audi', 'Mitsubishi',
]

const VEHICLE_TYPES = ['Sedán', 'SUV', 'Camioneta', 'Moto', 'Deportivo', 'Hatchback', 'Pickup', 'Furgoneta']

const COLORS = [
  { name: 'Blanco', hex: '#ffffff' }, { name: 'Negro', hex: '#111111' },
  { name: 'Plateado', hex: '#c0c0c0' }, { name: 'Gris', hex: '#6b7280' },
  { name: 'Rojo', hex: '#dc2626' }, { name: 'Azul', hex: '#2563eb' },
  { name: 'Verde', hex: '#16a34a' }, { name: 'Dorado', hex: '#ca8a04' },
  { name: 'Naranja', hex: '#ea580c' }, { name: 'Marrón', hex: '#78350f' },
]

export default function RegisterPage() {
  const router = useRouter()
  const { user, profile } = useAuth()

  /* mode: persona (vehicle owner) or empresa (workshop) */
  const [mode, setMode] = useState<'persona' | 'empresa'>('persona')

/* Persona fields */
  const [brand, setBrand] = useState('')
  const [regName, setRegName] = useState('')
  const [regDocument, setRegDocument] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanHint, setScanHint] = useState<string | null>(null)
  const [regPlateLetters, setRegPlateLetters] = useState('')
  const [regPlateNumbers, setRegPlateNumbers] = useState('')
  const [regCity, setRegCity] = useState('Bogotá')
  const [regModel, setRegModel] = useState('')
  const [regYear, setRegYear] = useState(new Date().getFullYear())
  const [regType, setRegType] = useState(VEHICLE_TYPES[0])
  const [regColor, setRegColor] = useState(COLORS[0].name)

  /* Empresa fields */
  const [wsLegalId, setWsLegalId] = useState('')
  const [wsName, setWsName] = useState('')
  const [wsAddress, setWsAddress] = useState('')
  const [wsCity, setWsCity] = useState('')
  const [wsPhone, setWsPhone] = useState('')
  const [wsDescription, setWsDescription] = useState('')
  const [wsHasVehicle, setWsHasVehicle] = useState(false)
  const [wsPlateLetters, setWsPlateLetters] = useState('')
  const [wsPlateNumbers, setWsPlateNumbers] = useState('')
  const [wsBrand, setWsBrand] = useState('')
  const [wsModel, setWsModel] = useState('')
  const [wsYear, setWsYear] = useState(new Date().getFullYear())
  const [wsType, setWsType] = useState(VEHICLE_TYPES[0])
  const [wsColor, setWsColor] = useState(COLORS[0].name)

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const regPlate = formatPlate(regPlateLetters, regPlateNumbers)
  const wsPlate = formatPlate(wsPlateLetters, wsPlateNumbers)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPlate = sessionStorage.getItem('carlink_plate')
      const savedCity = sessionStorage.getItem('carlink_city')
      if (savedPlate) {
        const parsed = savedPlate.match(/^([A-Z]{3})-?(\d{3})$/i)
        if (parsed) {
          setRegPlateLetters(parsed[1])
          setRegPlateNumbers(parsed[2])
        }
        sessionStorage.removeItem('carlink_plate')
      }
      if (savedCity) { setRegCity(savedCity); sessionStorage.removeItem('carlink_city') }
    }
  }, [])

  useEffect(() => {
    if (!user) { router.push('/'); return }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.access_token) return
      fetch(apiUrl('/vehicles'), { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then(r => { if (r.ok) return r.json() })
        .then(d => { if (d?.length) router.push('/app') })
        .catch(() => {})
    })
  }, [user, router])

  const years = useMemo(() => {
    const y = new Date().getFullYear()
    return Array.from({ length: y - 1980 + 1 }, (_, i) => y - i)
  }, [])

  const brandTiles = useMemo(() => BRANDS.map(b => ({
    name: b, initial: b[0],
    onClick: () => { setBrand(b); setWsBrand(b) },
    bg: brand === b || wsBrand === b ? 'rgba(245,197,24,0.15)' : 'transparent',
    border: brand === b || wsBrand === b ? 'rgba(245,197,24,0.4)' : 'rgba(255,255,255,0.1)',
    fg: brand === b || wsBrand === b ? '#F5C518' : '#b6b2a6',
    badge: brand === b || wsBrand === b ? '#F5C518' : 'rgba(255,255,255,0.06)',
    mark: brand === b || wsBrand === b ? '#111' : '#b6b2a6',
  })), [brand, wsBrand])

  const colorTiles = useMemo(() => COLORS.map(c => ({
    name: c.name, dot: c.hex,
    onClick: () => { setRegColor(c.name); setWsColor(c.name) },
    bg: regColor === c.name || wsColor === c.name ? 'rgba(245,197,24,0.15)' : 'transparent',
    border: regColor === c.name || wsColor === c.name ? 'rgba(245,197,24,0.4)' : 'rgba(255,255,255,0.1)',
    fg: regColor === c.name || wsColor === c.name ? '#F5C518' : '#b6b2a6',
  })), [regColor, wsColor])

  if (!user) return null

  /* Prellenado desde la tarjeta de propiedad. Sólo rellena campos vacíos o los
     que el OCR sí pudo leer; el usuario revisa y corrige antes de guardar. */
  const handleScanCard = async (file: File) => {
    setScanning(true)
    setScanHint(null)
    try {
      const data = await scanVehicleCard(file)
      if (!data) { setScanHint('No pudimos leer la tarjeta. Completa los datos a mano.'); return }
      const filled: string[] = []
      if (data.plate) {
        const m = data.plate.toUpperCase().match(/([A-Z]{3})-?(\d{3})/)
        if (m) { setRegPlateLetters(m[1]); setRegPlateNumbers(m[2]); filled.push('placa') }
      }
      if (data.city && CITIES.includes(data.city)) { setRegCity(data.city); filled.push('ciudad') }
      if (data.brand) { setBrand(data.brand); filled.push('marca') }
      if (data.model) { setRegModel(data.model); filled.push('modelo') }
      if (data.year && data.year > 1900) { setRegYear(data.year); filled.push('año') }
      if (data.color) {
        const match = COLORS.find(c => c.name.toLowerCase() === data.color!.toLowerCase())
        setRegColor(match ? match.name : data.color)
        filled.push('color')
      }
      if (data.owner_name) { setRegName(data.owner_name); filled.push('propietario') }
      if (data.document_number) { setRegDocument(data.document_number.replace(/[^0-9A-Za-z.-]/g, '')); filled.push('documento') }
      setScanHint(filled.length
        ? `Leímos: ${filled.join(', ')}. Revisa que esté correcto antes de continuar.`
        : 'No pudimos leer datos claros. Completa el formulario a mano.')
    } finally { setScanning(false) }
  }

  /* ── Persona registration ── */
  const doRegisterPersona = async () => {
    setErrorMsg('')
    const plate = formatPlate(regPlateLetters, regPlateNumbers)
    if (!plate || !brand || !regModel || !regName || !regDocument.trim()) {
      setErrorMsg('Completa todos los campos obligatorios')
      return
    }
    setSaving(true)
    const token = (await supabase.auth.getSession()).data.session?.access_token
    if (!token) { setErrorMsg('Sesión expirada'); setSaving(false); return }
    try {
      /* El documento de identidad queda en el perfil: es el dato que luego se
         contrasta con la tarjeta de propiedad al pedir la verificación. */
      await fetch(apiUrl('/auth/me'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ full_name: regName, document_number: regDocument.trim() }),
      }).catch(() => {})
      const res = await fetch(apiUrl('/vehicles'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plate, city: regCity, brand, model: regModel, year: regYear, type: regType, color: regColor }),
      })
      if (res.ok) { window.location.href = '/app'; return }
      const body = await res.text()
      try { setErrorMsg(JSON.parse(body).detail || body) } catch { setErrorMsg(body || `Error ${res.status}`) }
    } catch (e: any) { setErrorMsg('Error de conexión') }
    finally { setSaving(false) }
  }

  /* ── Empresa registration ── */
  const doRegisterEmpresa = async () => {
    setErrorMsg('')
    if (!wsLegalId || !wsName) {
      setErrorMsg('Completa NIT/RUT y nombre del taller')
      return
    }
    if (wsHasVehicle && !wsPlate) {
      setErrorMsg('Ingresa la placa del vehículo de prueba')
      return
    }
    setSaving(true)
    const token = (await supabase.auth.getSession()).data.session?.access_token
    if (!token) { setErrorMsg('Sesión expirada'); setSaving(false); return }
    try {
      const body: Record<string, any> = {
        legal_id: wsLegalId,
        name: wsName,
        address: wsAddress,
        city: wsCity,
        phone: wsPhone,
        description: wsDescription,
      }
      if (wsHasVehicle) {
        body.plate = wsPlate.toUpperCase()
        body.brand = wsBrand
        body.model = wsModel
        body.year = wsYear
        body.vehicle_type = wsType
        body.color = wsColor
        body.vehicle_city = wsCity
      }
      const res = await fetch(apiUrl('/workshops'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (res.ok) { window.location.href = '/app'; return }
      const rb = await res.text()
      try { setErrorMsg(JSON.parse(rb).detail || rb) } catch { setErrorMsg(rb || `Error ${res.status}`) }
    } catch { setErrorMsg('Error de conexión') }
    finally { setSaving(false) }
  }

  const doRegister = mode === 'persona' ? doRegisterPersona : doRegisterEmpresa

  return (
    <div style={{ minHeight: '100vh', background: '#060606', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 760, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 24, animation: 'fadeUp .5s both' }}>
          <div style={{ fontSize: 12, letterSpacing: '.24em', textTransform: 'uppercase', fontWeight: 700, color: '#F5C518' }}>
            Un último paso, {profile?.full_name?.split(' ')[0] || 'usuario'}
          </div>
          <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: 'clamp(30px,4vw,46px)', letterSpacing: '.01em', margin: '8px 0 6px', textTransform: 'uppercase' }}>
            {mode === 'persona' ? 'Registra tu vehículo' : 'Registra tu taller'}
          </h1>
          <p style={{ color: '#b6b2a6', margin: 0, fontSize: 15 }}>
            {mode === 'persona' ? 'Estos datos alimentan tu ficha técnica y las predicciones de mantenimiento.' : 'Tu taller aparecerá en las búsquedas de tus clientes.'}
          </p>
        </div>

        {/* Mode selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, justifyContent: 'center' }}>
          {(['persona', 'empresa'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setErrorMsg('') }}
              style={{
                padding: '10px 24px', borderRadius: 999, cursor: 'pointer',
                border: mode === m ? '2px solid #F5C518' : '1px solid rgba(255,255,255,0.14)',
                background: mode === m ? 'rgba(245,197,24,0.12)' : 'rgba(255,255,255,0.03)',
                color: mode === m ? '#F5C518' : '#b6b2a6',
                fontWeight: 700, fontSize: 14, transition: 'all .15s',
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}>
              {m === 'persona'
                ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>Persona</>
                : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2.3-.6-.6-2.3z"/></svg>Empresa (Taller)</>}
            </button>
          ))}
        </div>

        <div style={{ background: 'rgba(14,14,14,0.74)', backdropFilter: 'blur(22px)', border: '1px solid rgba(245,197,24,0.2)', borderRadius: 20, padding: 22, boxShadow: '0 24px 60px rgba(0,0,0,.5)', animation: 'fadeUp .55s .06s both' }}>

          {mode === 'persona' ? (
            <>
              {/* ── PERSONA MODE: vehicle registration ── */}
              <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, marginBottom: 10 }}>Marca del vehículo</div>
              <div className="regGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(90px,1fr))', gap: 9, marginBottom: 20 }}>
                {brandTiles.map(b => (
                  <button key={b.name} onClick={b.onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '12px 6px', borderRadius: 13, cursor: 'pointer', background: b.bg, border: `1.5px solid ${b.border}` }}>
                    <span style={{ width: 40, height: 40, borderRadius: 10, background: b.badge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Anton',sans-serif", fontSize: 18, color: b.mark }}>{b.initial}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: b.fg }}>{b.name}</span>
                  </button>
                ))}
              </div>

              {/* Atajo: leer la tarjeta de propiedad y prellenar. No verifica nada. */}
              <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 13, background: 'rgba(245,197,24,0.06)', border: '1px dashed rgba(245,197,24,0.35)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#f5f3ec' }}>¿Tienes la tarjeta de propiedad a mano?</div>
                    <div style={{ fontSize: 11.5, color: '#9a968a', marginTop: 3, lineHeight: 1.5 }}>Escanéala y llenamos el formulario por ti. Luego revisas los datos.</div>
                  </div>
                  <label style={{
                    flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '10px 16px', borderRadius: 11, border: 'none', background: '#F5C518', color: '#111',
                    fontWeight: 800, fontSize: 12.5, cursor: scanning ? 'default' : 'pointer', opacity: scanning ? 0.6 : 1,
                  }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    {scanning ? 'Leyendo…' : 'Escanear tarjeta'}
                    <input type="file" accept="image/*,application/pdf" disabled={scanning} style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleScanCard(f) }} />
                  </label>
                </div>
                {scanHint && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(245,197,24,0.2)', fontSize: 12, color: '#d8c98a', lineHeight: 1.5 }}>{scanHint}</div>
                )}
              </div>

              <div className="regGrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, display: 'block', marginBottom: 6 }}>Nombre del propietario</label>
                  <input value={regName} onChange={e => setRegName(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 15, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, display: 'block', marginBottom: 6 }}>Documento de identidad</label>
                  <input value={regDocument} onChange={e => setRegDocument(e.target.value.replace(/[^0-9A-Za-z.-]/g, ''))} placeholder="Ej. 1020304050" style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 15, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, display: 'block', marginBottom: 6 }}>Modelo / línea</label>
                  <input value={regModel} onChange={e => setRegModel(e.target.value)} placeholder="Ej. Mazda 3 Grand Touring" style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 15, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, display: 'block', marginBottom: 6 }}>Año</label>
                  <select value={regYear} onChange={e => setRegYear(Number(e.target.value))} style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 15, outline: 'none', cursor: 'pointer' }}>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, display: 'block', marginBottom: 6 }}>Tipo</label>
                  <select value={regType} onChange={e => setRegType(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 15, outline: 'none', cursor: 'pointer' }}>
                    {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, display: 'block', marginBottom: 8 }}>Color</label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {colorTiles.map(c => (
                    <button key={c.name} onClick={c.onClick} title={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', borderRadius: 999, cursor: 'pointer', background: c.bg, border: `1.5px solid ${c.border}`, color: c.fg, fontSize: 12, fontWeight: 600 }}>
                      <span style={{ width: 15, height: 15, borderRadius: '50%', background: c.dot, border: '1px solid rgba(255,255,255,.3)' }} />
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="regGrid" style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, display: 'block', marginBottom: 6 }}>Placa *</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    <input value={regPlateLetters} onChange={e => setRegPlateLetters(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3))} maxLength={3} placeholder="ABC"
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#F5C518', fontFamily: "'Anton',sans-serif", fontSize: 20, letterSpacing: '.03em', outline: 'none' }} />
                    <span style={{ padding: '0 8px', color: '#F5C518', fontFamily: "'Anton',sans-serif", fontSize: 20 }}> - </span>
                    <input value={regPlateNumbers} onChange={e => setRegPlateNumbers(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))} maxLength={3} placeholder="123"
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#F5C518', fontFamily: "'Anton',sans-serif", fontSize: 20, letterSpacing: '.03em', outline: 'none' }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, display: 'block', marginBottom: 6 }}>Ciudad de expedición</label>
                  <select value={regCity} onChange={e => setRegCity(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 15, outline: 'none', cursor: 'pointer' }}>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* ── EMPRESA MODE: workshop registration ── */}
              <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, marginBottom: 12 }}>Datos del taller</div>

              <div className="regGrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, display: 'block', marginBottom: 6 }}>NIT / RUT *</label>
                  <input value={wsLegalId} onChange={e => setWsLegalId(e.target.value)} placeholder="Ej. 12345678-9"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 15, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, display: 'block', marginBottom: 6 }}>Nombre del taller *</label>
                  <input value={wsName} onChange={e => setWsName(e.target.value)} placeholder="Ej. Taller Pérez"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 15, outline: 'none' }} />
                </div>
              </div>

              <div className="regGrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, display: 'block', marginBottom: 6 }}>Dirección</label>
                  <input value={wsAddress} onChange={e => setWsAddress(e.target.value)} placeholder="Cra 7 #45-12"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 15, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, display: 'block', marginBottom: 6 }}>Ciudad</label>
                  <input value={wsCity} onChange={e => setWsCity(e.target.value)} placeholder="Bogotá"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 15, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, display: 'block', marginBottom: 6 }}>Teléfono</label>
                  <input value={wsPhone} onChange={e => setWsPhone(e.target.value)} placeholder="300 123 4567"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 15, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, display: 'block', marginBottom: 6 }}>Descripción</label>
                  <input value={wsDescription} onChange={e => setWsDescription(e.target.value)} placeholder="Especialistas en frenos"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 15, outline: 'none' }} />
                </div>
              </div>

              {/* Optional test vehicle */}
              <div style={{ marginBottom: 14, padding: 14, borderRadius: 12, background: 'rgba(245,197,24,0.06)', border: '1px solid rgba(245,197,24,0.2)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: '#d8c98a', fontWeight: 600 }}>
                  <input type="checkbox" checked={wsHasVehicle} onChange={e => setWsHasVehicle(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: '#F5C518', cursor: 'pointer' }} />
                  Registrar vehículo de prueba (opcional — para talleres certificados que necesitan ficha técnica)
                </label>

                {wsHasVehicle && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, marginBottom: 8 }}>Vehículo de prueba</div>
                    <div className="regGrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 10, color: '#9a968a', fontWeight: 600, display: 'block', marginBottom: 4 }}>Placa</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                          <input value={wsPlateLetters} onChange={e => setWsPlateLetters(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3))} maxLength={3} placeholder="ABC"
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#F5C518', fontFamily: "'Anton',sans-serif", fontSize: 18, letterSpacing: '.03em', outline: 'none' }} />
                          <span style={{ padding: '0 8px', color: '#F5C518', fontFamily: "'Anton',sans-serif", fontSize: 18 }}> - </span>
                          <input value={wsPlateNumbers} onChange={e => setWsPlateNumbers(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))} maxLength={3} placeholder="123"
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#F5C518', fontFamily: "'Anton',sans-serif", fontSize: 18, letterSpacing: '.03em', outline: 'none' }} />
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: '#9a968a', fontWeight: 600, display: 'block', marginBottom: 4 }}>Modelo</label>
                        <input value={wsModel} onChange={e => setWsModel(e.target.value)} placeholder="Mazda 3"
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 14, outline: 'none' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: '#9a968a', fontWeight: 600, display: 'block', marginBottom: 4 }}>Año</label>
                        <select value={wsYear} onChange={e => setWsYear(Number(e.target.value))} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 14, outline: 'none', cursor: 'pointer' }}>
                          {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: '#9a968a', fontWeight: 600, display: 'block', marginBottom: 4 }}>Tipo</label>
                        <select value={wsType} onChange={e => setWsType(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 14, outline: 'none', cursor: 'pointer' }}>
                          {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <label style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, display: 'block', marginBottom: 6 }}>Marca</label>
                      <div className="regGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(80px,1fr))', gap: 7 }}>
                        {brandTiles.map(b => (
                          <button key={b.name} onClick={() => setWsBrand(b.name)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '8px 4px', borderRadius: 10, cursor: 'pointer', background: b.bg, border: `1.5px solid ${b.border}` }}>
                            <span style={{ width: 30, height: 30, borderRadius: 8, background: b.badge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Anton',sans-serif", fontSize: 14, color: b.mark }}>{b.initial}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: b.fg }}>{b.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <label style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, display: 'block', marginBottom: 6 }}>Color</label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {colorTiles.map(c => (
                          <button key={c.name} onClick={() => setWsColor(c.name)} title={c.name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 999, cursor: 'pointer', background: c.bg, border: `1.5px solid ${c.border}`, color: c.fg, fontSize: 11, fontWeight: 600 }}>
                            <span style={{ width: 12, height: 12, borderRadius: '50%', background: c.dot, border: '1px solid rgba(255,255,255,.3)' }} />
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ padding: 12, borderRadius: 12, background: 'rgba(46,204,113,0.06)', border: '1px solid rgba(46,204,113,0.2)', marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: '#5be89a', lineHeight: 1.5 }}>
                  <b>ℹ️ Código único de taller</b> — Al registrarte, se generará automáticamente un código <b>TLR-XXXXX</b> único. Comparte este código con tus clientes para que te encuentren al instante.
                </div>
              </div>
            </>
          )}

          {errorMsg && (
            <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13, fontWeight: 600 }}>
              {errorMsg}
            </div>
          )}
          <button onClick={doRegister} disabled={saving} style={{ marginTop: 14, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 15, borderRadius: 13, border: 'none', background: saving ? '#7c786e' : '#F5C518', color: '#111', fontWeight: 800, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 0 24px rgba(245,197,24,0.4)' }}>
            {saving ? (mode === 'persona' ? 'Registrando...' : 'Registrando taller...') : (mode === 'persona' ? 'Registrar y entrar' : 'Crear taller')}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
