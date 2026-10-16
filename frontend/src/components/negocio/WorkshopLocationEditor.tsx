'use client'

/* Ubicación del taller en el mapa (fase 0b de docs/PLAN_VINCULO_TALLER_CONDUCTOR.md).
   El servidor geocodifica la dirección con OpenStreetMap, que con direcciones colombianas con numeración
   es aproximado: el taller ve el pin y lo arrastra hasta su puerta para confirmarlo. */
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Workshop } from '@/lib/types'
import { inputStyle, labelStyle, primaryBtnStyle, ghostBtnStyle } from './shared'

type Tokens = ReturnType<typeof import('./shared').negocioTokens>
type Update = (data: { address?: string; city?: string; latitude?: number; longitude?: number }) => Promise<Workshop | null>

const BOGOTA: [number, number] = [4.6097, -74.0817]

export default function WorkshopLocationEditor({ t, workshop, updateWorkshop }: { t: Tokens; workshop: Workshop; updateWorkshop: Update }) {
  // El padre no se entera de lo que guarda este editor (useMyWorkshop tiene estado propio): `base` es lo ultimo guardado.
  const [base, setBase] = useState<Workshop>(workshop)
  const [address, setAddress] = useState(workshop.address)
  const [city, setCity] = useState(workshop.city)
  const [pin, setPin] = useState<[number, number] | null>(
    workshop.latitude != null && workshop.longitude != null ? [workshop.latitude, workshop.longitude] : null,
  )
  const [busy, setBusy] = useState<'find' | 'save' | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const mapEl = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const marker = useRef<L.Marker | null>(null)

  useEffect(() => {
    setBase(workshop)
    setAddress(workshop.address)
    setCity(workshop.city)
    setPin(workshop.latitude != null && workshop.longitude != null ? [workshop.latitude, workshop.longitude] : null)
  }, [workshop.address, workshop.city, workshop.latitude, workshop.longitude])

  // El mapa se crea una sola vez; el pin se sincroniza con el estado.
  useEffect(() => {
    if (!mapEl.current || map.current) return
    const m = L.map(mapEl.current, { zoomControl: true, attributionControl: false, scrollWheelZoom: false })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m)
    m.setView(pin ?? BOGOTA, pin ? 16 : 11)
    // Tocar el mapa coloca o mueve el pin (en celular arrastrar un pin chico es incomodo).
    m.on('click', (e: L.LeafletMouseEvent) => setPin([e.latlng.lat, e.latlng.lng]))
    map.current = m
    return () => { m.remove(); map.current = null; marker.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const m = map.current
    if (!m) return
    if (!pin) { marker.current?.remove(); marker.current = null; return }
    if (!marker.current) {
      const icon = L.divIcon({
        className: '',
        html: '<div style="width:22px;height:22px;border-radius:50%;background:#F5C518;border:3px solid #111;box-shadow:0 2px 8px rgba(0,0,0,.45)"></div>',
        iconSize: [22, 22], iconAnchor: [11, 11],
      })
      marker.current = L.marker(pin, { icon, draggable: true }).addTo(m)
      marker.current.on('dragend', () => {
        const ll = marker.current!.getLatLng()
        setPin([ll.lat, ll.lng])
      })
    } else {
      marker.current.setLatLng(pin)
    }
    m.setView(pin, Math.max(m.getZoom(), 15))
  }, [pin])

  const addressChanged = address.trim() !== base.address || city.trim() !== base.city
  const pinChanged = pin != null && (pin[0] !== base.latitude || pin[1] !== base.longitude)

  const find = async () => {
    setBusy('find'); setMsg(null)
    const res = await updateWorkshop({ address: address.trim(), city: city.trim() })
    setBusy(null)
    if (!res) { setMsg({ ok: false, text: 'No se pudo guardar la dirección.' }); return }
    setBase(res)
    setPin(res.latitude != null && res.longitude != null ? [res.latitude, res.longitude] : null)
    if (res.latitude != null && res.longitude != null) {
      setMsg({ ok: true, text: 'Ubicamos tu dirección y guardamos el pin. Si no está en la puerta de tu taller, arrástralo o toca el mapa y guarda la ubicación.' })
    } else {
      setMsg({ ok: false, text: 'No encontramos esa dirección en el mapa. Toca el mapa para ubicar tu taller tú mismo.' })
    }
  }

  const save = async () => {
    if (!pin) return
    setBusy('save'); setMsg(null)
    const res = await updateWorkshop({ latitude: Number(pin[0].toFixed(6)), longitude: Number(pin[1].toFixed(6)) })
    setBusy(null)
    if (res) setBase(res)
    setMsg(res ? { ok: true, text: 'Ubicación guardada. Así te verán tus clientes en el mapa.' } : { ok: false, text: 'No se pudo guardar. El pin debe estar dentro de Colombia.' })
  }

  return (
    <div style={{ padding: 20, borderRadius: 16, background: t.cardBg, border: `1px solid ${t.border}` }}>
      <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: t.gold, fontWeight: 700, marginBottom: 6 }}>Ubicación en el mapa</div>
      <p style={{ fontSize: 12, color: t.textMuted, margin: '0 0 12px', lineHeight: 1.5 }}>
        Tus clientes ven este punto en el mapa de su historial. La búsqueda por dirección es aproximada: confirma el pin arrastrándolo o tocando el mapa.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 10, marginBottom: 10 }}>
        <div><label style={labelStyle(t)}>Dirección</label><input style={inputStyle(t)} value={address} onChange={e => setAddress(e.target.value)} placeholder="Ej. Calle 72 # 10-34" /></div>
        <div><label style={labelStyle(t)}>Ciudad</label><input style={inputStyle(t)} value={city} onChange={e => setCity(e.target.value)} placeholder="Bogotá" /></div>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <button onClick={find} disabled={busy != null || !address.trim()} style={{ ...ghostBtnStyle(t), padding: '8px 14px', fontSize: 12.5, opacity: busy != null || !address.trim() ? 0.5 : 1 }}>
          {busy === 'find' ? 'Buscando…' : addressChanged ? 'Guardar dirección y ubicar' : 'Volver a ubicar por dirección'}
        </button>
      </div>
      <div ref={mapEl} style={{ width: '100%', height: 260, borderRadius: 12, overflow: 'hidden', border: `1px solid ${t.subtleBorder}` }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
        <button onClick={save} disabled={busy != null || !pin || !pinChanged} style={primaryBtnStyle(t, busy != null || !pin || !pinChanged)}>
          {busy === 'save' ? 'Guardando…' : 'Guardar ubicación'}
        </button>
        {!pin && <span style={{ fontSize: 12, color: t.textMuted }}>Aún no hay pin: ubica por dirección o toca el mapa.</span>}
        {msg && <span style={{ fontSize: 12.5, fontWeight: 700, color: msg.ok ? t.success : t.danger }}>{msg.text}</span>}
      </div>
    </div>
  )
}
