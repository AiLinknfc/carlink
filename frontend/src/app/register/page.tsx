'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/store/auth'
import { CITIES } from '@/lib/constants'
import { supabase, apiUrl } from '@/lib/supabase'

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

  const [brand, setBrand] = useState('')
  const [regName, setRegName] = useState('')
  const [regPlate, setRegPlate] = useState('')
  const [regCity, setRegCity] = useState('Bogotá')

  const [regModel, setRegModel] = useState('')
  const [regYear, setRegYear] = useState(new Date().getFullYear())
  const [regType, setRegType] = useState(VEHICLE_TYPES[0])
  const [regColor, setRegColor] = useState(COLORS[0].name)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPlate = sessionStorage.getItem('carlink_plate')
      const savedCity = sessionStorage.getItem('carlink_city')
      if (savedPlate) { setRegPlate(savedPlate); sessionStorage.removeItem('carlink_plate') }
      if (savedCity) { setRegCity(savedCity); sessionStorage.removeItem('carlink_city') }
    }
  }, [])

  useEffect(() => {
    if (!user) { router.push('/'); return }
    const token = supabase.auth.getSession().then(({ data: { session } }) => session?.access_token)
    token.then(t => {
      if (!t) return
      fetch(apiUrl('/vehicles'), { headers: { Authorization: `Bearer ${t}` } })
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
    onClick: () => setBrand(b),
    bg: brand === b ? 'rgba(245,197,24,0.15)' : 'transparent',
    border: brand === b ? 'rgba(245,197,24,0.4)' : 'rgba(255,255,255,0.1)',
    fg: brand === b ? '#F5C518' : '#b6b2a6',
    badge: brand === b ? '#F5C518' : 'rgba(255,255,255,0.06)',
    mark: brand === b ? '#111' : '#b6b2a6',
  })), [brand])

  const colorTiles = useMemo(() => COLORS.map(c => ({
    name: c.name, dot: c.hex,
    onClick: () => setRegColor(c.name),
    bg: regColor === c.name ? 'rgba(245,197,24,0.15)' : 'transparent',
    border: regColor === c.name ? 'rgba(245,197,24,0.4)' : 'rgba(255,255,255,0.1)',
    fg: regColor === c.name ? '#F5C518' : '#b6b2a6',
  })), [regColor])

  if (!user) return null

  const doRegister = async () => {
    setErrorMsg('')
    if (!regPlate || !brand || !regModel || !regName) {
      setErrorMsg('Completa todos los campos obligatorios')
      return
    }
    setSaving(true)
    const token = (await supabase.auth.getSession()).data.session?.access_token

    try {
      const res = await fetch(apiUrl('/vehicles'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plate: regPlate.toUpperCase(), city: regCity, brand, model: regModel, year: regYear, type: regType, color: regColor }),
      })
      if (res.ok) {
        window.location.href = '/app'
        return
      }
      let msg = `Error ${res.status}`
      try {
        const body = await res.text()
        console.error('Error al registrar:', { status: res.status, body })
        try {
          const parsed = JSON.parse(body)
          msg = typeof parsed.detail === 'string' ? parsed.detail : body
        } catch {
          msg = body || `Error ${res.status}`
        }
      } catch {
        msg = `Error ${res.status}`
      }
      setErrorMsg(msg)
    } catch (e) {
      console.error('Error de conexión:', e)
      setErrorMsg('Error de conexión con el servidor')
    }
    finally { setSaving(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060606', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 760, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 24, animation: 'fadeUp .5s both' }}>
          <div style={{ fontSize: 12, letterSpacing: '.24em', textTransform: 'uppercase', fontWeight: 700, color: '#F5C518' }}>
            Un último paso, {profile?.full_name?.split(' ')[0] || 'usuario'}
          </div>
          <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: 'clamp(30px,4vw,46px)', letterSpacing: '.01em', margin: '8px 0 6px', textTransform: 'uppercase' }}>Registra tu vehículo</h1>
          <p style={{ color: '#b6b2a6', margin: 0, fontSize: 15 }}>Estos datos alimentan tu ficha técnica y las predicciones de mantenimiento.</p>
        </div>

        <div style={{ background: 'rgba(14,14,14,0.74)', backdropFilter: 'blur(22px)', border: '1px solid rgba(245,197,24,0.2)', borderRadius: 20, padding: 22, boxShadow: '0 24px 60px rgba(0,0,0,.5)', animation: 'fadeUp .55s .06s both' }}>
          <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, marginBottom: 10 }}>Marca del vehículo</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(90px,1fr))', gap: 9, marginBottom: 20 }}>
            {brandTiles.map(b => (
              <button key={b.name} onClick={b.onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '12px 6px', borderRadius: 13, cursor: 'pointer', background: b.bg, border: `1.5px solid ${b.border}` }}>
                <span style={{ width: 40, height: 40, borderRadius: 10, background: b.badge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Anton',sans-serif", fontSize: 18, color: b.mark }}>{b.initial}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: b.fg }}>{b.name}</span>
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, display: 'block', marginBottom: 6 }}>Nombre del propietario</label>
              <input value={regName} onChange={e => setRegName(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 15, outline: 'none' }} />
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

          <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, display: 'block', marginBottom: 6 }}>Placa *</label>
              <input value={regPlate} onChange={e => setRegPlate(e.target.value.toUpperCase())} maxLength={8} placeholder="ABC 123"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#F5C518', fontFamily: "'Anton',sans-serif", fontSize: 20, letterSpacing: '.03em', outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, display: 'block', marginBottom: 6 }}>Ciudad de expedición</label>
              <select value={regCity} onChange={e => setRegCity(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 15, outline: 'none', cursor: 'pointer' }}>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {errorMsg && (
            <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13, fontWeight: 600 }}>
              {errorMsg}
            </div>
          )}
          <button onClick={doRegister} disabled={saving} style={{ marginTop: 14, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 15, borderRadius: 13, border: 'none', background: saving ? '#7c786e' : '#F5C518', color: '#111', fontWeight: 800, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 0 24px rgba(245,197,24,0.4)' }}>
            {saving ? 'Registrando...' : 'Registrar y entrar'}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
