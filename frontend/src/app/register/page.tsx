'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/store/auth'
import { useTheme } from '@/store/theme'
import { supabase, apiUrl } from '@/lib/supabase'
import { formatPlate, getPlateConfig, type PlateType } from '@/lib/plate'
import ThemedSuggestInput from '@/components/ThemedSuggestInput'
import { CAR_BRANDS, MOTO_BRANDS, VEHICLE_TYPES, plateTypeFor, modelSuggestions, COLORS } from '@/lib/vehicleBrands'

/* Registro de taller/empresa — el modo persona se sacó de acá (2026-09-15):
   el registro del primer vehículo de una cuenta persona ahora vive en el
   wizard de onboarding (`components/onboarding/`), no en esta página. Esta
   página queda exclusiva para el alta de un taller (POST /workshops), que no
   pasa por el wizard (ver guard `!isBusiness` en app/app/page.tsx) —
   `RegisterPageWrapper` de abajo redirige a /app cualquier visita que no
   traiga `?mode=empresa`. */
function RegisterPage() {
  const router = useRouter()
  const { user } = useAuth()

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

  const { isDark } = useTheme()
  const tk = {
    pageBg: isDark ? '#060606' : '#f7f6f2',
    cardBg: isDark ? 'rgba(14,14,14,0.74)' : 'rgba(255,255,255,0.88)',
    cardBorder: isDark ? 'rgba(245,197,24,0.2)' : 'rgba(17,17,17,0.1)',
    cardShadow: isDark ? '0 24px 60px rgba(0,0,0,.5)' : '0 24px 60px rgba(17,17,17,0.1)',
    labelColor: isDark ? '#7c786e' : '#8a8578',
    inputBg: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(17,17,17,0.04)',
    inputBorder: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(17,17,17,0.12)',
    inputText: isDark ? '#f5f3ec' : '#17171a',
    accent: '#F5C518',
    accentText: '#111',
    muted: isDark ? '#b6b2a6' : '#6f6a5f',
    sectionTitle: isDark ? '#7c786e' : '#8a8578',
    chipBg: isDark ? 'rgba(245,197,24,0.06)' : 'rgba(245,197,24,0.08)',
    hintBg: isDark ? 'rgba(46,204,113,0.06)' : 'rgba(46,204,113,0.08)',
    hintText: isDark ? '#5be89a' : '#1a7a3e',
    errorBg: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
    errorBorder: isDark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.2)',
    errorText: '#ef4444',
    titleColor: isDark ? '#f5f3ec' : '#17171a',
    subtitleColor: isDark ? '#b6b2a6' : '#6f6a5f',
    btnDisabled: '#7c786e',
    btnShadow: '0 0 24px rgba(245,197,24,0.4)',
    scanHintBorder: isDark ? 'rgba(245,197,24,0.2)' : 'rgba(245,197,24,0.3)',
  }

  const wsPlate = formatPlate(wsPlateLetters, wsPlateNumbers, plateTypeFor(wsType))
  const wsPlateType: PlateType = plateTypeFor(wsType)
  const wsPlateConfig = getPlateConfig(wsPlateType)

  useEffect(() => {
    if (!user) { router.push('/'); return }
    // Si ya tiene taller registrado, no volver a mostrar este formulario.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.access_token) return
      fetch(apiUrl('/workshops/me'), { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then(r => { if (r.ok) return r.json() })
        .then(d => { if (d?.id) router.push('/app/negocio') })
        .catch(() => {})
    })
  }, [user, router])

  const years = useMemo(() => {
    const y = new Date().getFullYear()
    return Array.from({ length: y - 1980 + 1 }, (_, i) => y - i)
  }, [])

  const wsModels = useMemo(() => modelSuggestions(wsBrand, wsType, wsYear), [wsBrand, wsType, wsYear])

  const wsBrandList = wsType === 'Moto' ? MOTO_BRANDS : CAR_BRANDS

  const wsBrandTiles = useMemo(() => wsBrandList.map(b => ({
    name: b, initial: b[0],
    onClick: () => setWsBrand(b),
    bg: wsBrand === b ? 'rgba(245,197,24,0.15)' : 'transparent',
    border: wsBrand === b ? 'rgba(245,197,24,0.4)' : tk.inputBorder,
    fg: wsBrand === b ? tk.accent : tk.muted,
    badge: wsBrand === b ? tk.accent : tk.inputBg,
    mark: wsBrand === b ? '#111' : tk.muted,
  })), [wsBrandList, wsBrand, isDark])

  /* Si cambian de carrocería (ej. Auto -> Moto) y la marca elegida no existe
     en la lista nueva, se limpia marca + modelo en vez de dejar una
     combinación imposible (Chevrolet con tipo Moto). */
  useEffect(() => {
    if (wsBrand && !wsBrandList.includes(wsBrand)) { setWsBrand(''); setWsModel('') }
  }, [wsType]) // eslint-disable-line react-hooks/exhaustive-deps

  const colorTiles = useMemo(() => COLORS.map(c => ({
    name: c.name, dot: c.hex,
    onClick: () => setWsColor(c.name),
    bg: wsColor === c.name ? 'rgba(245,197,24,0.15)' : 'transparent',
    border: wsColor === c.name ? 'rgba(245,197,24,0.4)' : tk.inputBorder,
    fg: wsColor === c.name ? tk.accent : tk.muted,
  })), [wsColor, isDark])

  if (!user) return null

  /* ── Empresa registration ── */
  const doRegister = async () => {
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
      if (res.ok) { window.location.href = '/app/negocio'; return }
      const rb = await res.text()
      try { setErrorMsg(JSON.parse(rb).detail || rb) } catch { setErrorMsg(rb || `Error ${res.status}`) }
    } catch { setErrorMsg('Error de conexión') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: tk.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 760, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 24, animation: 'fadeUp .5s both' }}>
          <div style={{ fontSize: 12, letterSpacing: '.24em', textTransform: 'uppercase', fontWeight: 700, color: tk.accent }}>
            Un último paso
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px,4vw,46px)', letterSpacing: '.01em', margin: '8px 0 6px', textTransform: 'uppercase', color: tk.titleColor }}>
            Registra tu taller
          </h1>
          <p style={{ color: tk.subtitleColor, margin: 0, fontSize: 15 }}>
            Tu taller aparecerá en las búsquedas de tus clientes.
          </p>
        </div>

        <div style={{ background: tk.cardBg, backdropFilter: 'blur(22px)', border: `1px solid ${tk.cardBorder}`, borderRadius: 20, padding: 22, boxShadow: tk.cardShadow, animation: 'fadeUp .55s .06s both' }}>

          <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: tk.labelColor, fontWeight: 700, marginBottom: 12 }}>Datos del taller</div>

          <div className="regGrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: tk.labelColor, fontWeight: 700, display: 'block', marginBottom: 6 }}>NIT / RUT *</label>
              <input value={wsLegalId} onChange={e => setWsLegalId(e.target.value)} placeholder="Ej. 12345678-9"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: `1px solid ${tk.inputBorder}`, background: tk.inputBg, color: tk.inputText, fontSize: 15, outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: tk.labelColor, fontWeight: 700, display: 'block', marginBottom: 6 }}>Nombre del taller *</label>
              <input value={wsName} onChange={e => setWsName(e.target.value)} placeholder="Ej. Taller Pérez"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: `1px solid ${tk.inputBorder}`, background: tk.inputBg, color: tk.inputText, fontSize: 15, outline: 'none' }} />
            </div>
          </div>

          <div className="regGrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: tk.labelColor, fontWeight: 700, display: 'block', marginBottom: 6 }}>Dirección</label>
              <input value={wsAddress} onChange={e => setWsAddress(e.target.value)} placeholder="Cra 7 #45-12"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: `1px solid ${tk.inputBorder}`, background: tk.inputBg, color: tk.inputText, fontSize: 15, outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: tk.labelColor, fontWeight: 700, display: 'block', marginBottom: 6 }}>Ciudad</label>
              <input value={wsCity} onChange={e => setWsCity(e.target.value)} placeholder="Bogotá"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: `1px solid ${tk.inputBorder}`, background: tk.inputBg, color: tk.inputText, fontSize: 15, outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: tk.labelColor, fontWeight: 700, display: 'block', marginBottom: 6 }}>Teléfono</label>
              <input value={wsPhone} onChange={e => setWsPhone(e.target.value)} placeholder="300 123 4567"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: `1px solid ${tk.inputBorder}`, background: tk.inputBg, color: tk.inputText, fontSize: 15, outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: tk.labelColor, fontWeight: 700, display: 'block', marginBottom: 6 }}>Descripción</label>
              <input value={wsDescription} onChange={e => setWsDescription(e.target.value)} placeholder="Especialistas en frenos"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: `1px solid ${tk.inputBorder}`, background: tk.inputBg, color: tk.inputText, fontSize: 15, outline: 'none' }} />
            </div>
          </div>

          {/* Optional test vehicle */}
          <div style={{ marginBottom: 14, padding: 14, borderRadius: 12, background: tk.chipBg, border: `1px solid ${tk.scanHintBorder}` }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: tk.muted, fontWeight: 600 }}>
              <input type="checkbox" checked={wsHasVehicle} onChange={e => setWsHasVehicle(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: '#F5C518', cursor: 'pointer' }} />
              Registrar vehículo de prueba (opcional — para talleres certificados que necesitan ficha técnica)
            </label>

            {wsHasVehicle && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: tk.labelColor, fontWeight: 700, marginBottom: 8 }}>Vehículo de prueba</div>
                <p style={{ fontSize: 11.5, color: tk.hintText, lineHeight: 1.5, margin: '0 0 12px', padding: '10px 12px', borderRadius: 10, background: tk.hintBg }}>
                  Esta cuenta es exclusiva para tu negocio — este es el único vehículo que incluye ficha de
                  prueba gratis de 7 días. Si además querés una ficha personal para tu propio carro, usá otra
                  cuenta para eso. Y si más adelante querés agregar otro vehículo a este negocio, vas a
                  necesitar comprar y activar un llavero NFC para él.
                </p>
                <div className="regGrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 10, color: tk.sectionTitle, fontWeight: 600, display: 'block', marginBottom: 4 }}>Placa</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                      <input value={wsPlateLetters} onChange={e => setWsPlateLetters(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, wsPlateConfig.letterLen))} maxLength={wsPlateConfig.letterLen} placeholder={'A'.repeat(wsPlateConfig.letterLen)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${tk.inputBorder}`, background: tk.inputBg, color: tk.accent, fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: '.03em', outline: 'none' }} />
                      <span style={{ padding: '0 8px', color: tk.accent, fontFamily: 'var(--font-display)', fontSize: 18 }}> - </span>
                      <input value={wsPlateNumbers} onChange={e => setWsPlateNumbers(e.target.value.toUpperCase().replace(wsPlateConfig.moto ? /[^0-9A-Z]/g : /[^0-9]/g, '').slice(0, wsPlateConfig.moto ? 3 : wsPlateConfig.numLen))} maxLength={wsPlateConfig.moto ? 3 : wsPlateConfig.numLen} placeholder={wsPlateConfig.moto ? '12D' : wsPlateConfig.placeholder.split('-')[1]}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${tk.inputBorder}`, background: tk.inputBg, color: tk.accent, fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: '.03em', outline: 'none' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: tk.sectionTitle, fontWeight: 600, display: 'block', marginBottom: 4 }}>Modelo</label>
                    <ThemedSuggestInput value={wsModel} onChange={setWsModel} suggestions={wsModels}
                      placeholder={wsModels.length ? `Elige o escribe (ej. ${wsModels[0]})` : (wsBrand ? 'Escribe el modelo' : 'Selecciona la marca')}
                      style={{ padding: '10px 12px', fontSize: 14 }}
                      theme={{ inputBg: tk.inputBg, inputBorder: tk.inputBorder, inputText: tk.inputText, accent: tk.accent, muted: tk.muted, panelBg: tk.cardBg }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: tk.sectionTitle, fontWeight: 600, display: 'block', marginBottom: 4 }}>Año</label>
                    <select value={wsYear} onChange={e => setWsYear(Number(e.target.value))} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${tk.inputBorder}`, background: tk.inputBg, color: tk.inputText, fontSize: 14, outline: 'none', cursor: 'pointer' }}>
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: tk.sectionTitle, fontWeight: 600, display: 'block', marginBottom: 4 }}>Tipo</label>
                    <select value={wsType} onChange={e => setWsType(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${tk.inputBorder}`, background: tk.inputBg, color: tk.inputText, fontSize: 14, outline: 'none', cursor: 'pointer' }}>
                      {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <label style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: tk.labelColor, fontWeight: 700, display: 'block', marginBottom: 6 }}>Marca</label>
                  <div className="regBrandGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(80px,1fr))', gap: 7 }}>
                    {wsBrandTiles.map(b => (
                      <button key={b.name} onClick={() => setWsBrand(b.name)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '8px 4px', borderRadius: 10, cursor: 'pointer', background: b.bg, border: `1.5px solid ${b.border}` }}>
                        <span style={{ width: 30, height: 30, borderRadius: 8, background: b.badge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 14, color: b.mark }}>{b.initial}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: b.fg }}>{b.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <label style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: tk.labelColor, fontWeight: 700, display: 'block', marginBottom: 6 }}>Color</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {colorTiles.map(c => (
                      <button key={c.name} onClick={c.onClick} title={c.name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 999, cursor: 'pointer', background: c.bg, border: `1.5px solid ${c.border}`, color: c.fg, fontSize: 11, fontWeight: 600 }}>
                        <span style={{ width: 12, height: 12, borderRadius: '50%', background: c.dot, border: `1px solid ${tk.inputBorder}` }} />
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ padding: 12, borderRadius: 12, background: tk.hintBg, border: `1px solid ${tk.hintBg.replace('0.06', '0.2').replace('0.08', '0.2')}`, marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: tk.hintText, lineHeight: 1.5 }}>
              <b>Código único de taller</b> — Al registrarte, se generará automáticamente un código <b>TLR-XXXXX</b> único. Comparte este código con tus clientes para que te encuentren al instante.
            </div>
          </div>

          {errorMsg && (
            <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: tk.errorBg, border: `1px solid ${tk.errorBorder}`, color: tk.errorText, fontSize: 13, fontWeight: 600 }}>
              {errorMsg}
            </div>
          )}
          <button onClick={doRegister} disabled={saving} style={{ marginTop: 14, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 15, borderRadius: 13, border: 'none', background: saving ? tk.btnDisabled : '#F5C518', color: '#111', fontWeight: 800, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: tk.btnShadow }}>
            {saving ? 'Registrando taller...' : 'Crear taller'}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function RegisterPageWrapper() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEmpresa = searchParams.get('mode') === 'empresa'

  // Cualquier visita a /register que no sea el alta de taller se manda a
  // /app — el registro del primer vehículo de una cuenta persona ahora
  // vive en el wizard de onboarding, no acá (2026-09-15).
  useEffect(() => {
    if (!isEmpresa) router.replace('/app')
  }, [isEmpresa, router])

  if (!isEmpresa) return null
  return <RegisterPage />
}

export default function RegisterPageSuspense() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Cargando...</div>}>
      <RegisterPageWrapper />
    </Suspense>
  )
}
