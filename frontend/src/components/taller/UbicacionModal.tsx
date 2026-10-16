'use client'

/* Confirmación de la ubicación en el mapa para el formulario de postulación (landing /taller).
   Busca la dirección escrita (backend, OpenStreetMap), muestra el pin y deja moverlo (arrastrar o tocar el mapa)
   hasta que quede en la puerta del negocio. La búsqueda por dirección en Colombia es aproximada, por eso se confirma. */
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const GOLD = '#F5C518'
const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''
const COLOMBIA: [number, number] = [4.6, -74.1]

interface Props {
  address: string
  city: string
  initial: [number, number] | null
  onConfirm: (lat: number, lng: number) => void
  onClose: () => void
  isDark: boolean
  muted: string
  border: string
  textColor: string
}

export default function UbicacionModal({ address, city, initial, onConfirm, onClose, isDark, muted, border, textColor }: Props) {
  const [pin, setPin] = useState<[number, number] | null>(initial)
  const [state, setState] = useState<{ loading: boolean; msg: string; ok: boolean }>({ loading: !initial, msg: '', ok: true })
  const mapEl = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const marker = useRef<L.Marker | null>(null)

  // Mapa: se crea una sola vez.
  useEffect(() => {
    if (!mapEl.current || map.current) return
    const m = L.map(mapEl.current, { zoomControl: true, attributionControl: false })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(m)
    m.setView(initial ?? COLOMBIA, initial ? 17 : 6)
    // Tocar el mapa coloca o mueve el pin (en celular arrastrar un pin pequeño es incómodo).
    m.on('click', (e: L.LeafletMouseEvent) => setPin([e.latlng.lat, e.latlng.lng]))
    map.current = m
    return () => { m.remove(); map.current = null; marker.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Búsqueda inicial por dirección (si no vino un pin ya confirmado).
  useEffect(() => {
    if (initial) { setState({ loading: false, ok: true, msg: 'Esta es la ubicación que confirmaste. Muévela si hace falta.' }); return }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/workshop-applications/geocode?${new URLSearchParams({ address, city })}`)
        const j = await res.json().catch(() => ({}))
        if (cancelled) return
        if (res.ok && j.precision === 'address') {
          setPin([j.lat, j.lng])
          setState({ loading: false, ok: true, msg: 'Ubicamos tu dirección. Si el punto no está en la puerta de tu negocio, arrástralo o toca el mapa.' })
        } else if (res.ok && j.precision === 'city') {
          map.current?.setView([j.lat, j.lng], 13)
          setState({ loading: false, ok: false, msg: 'No encontramos esa dirección exacta. Toca el mapa donde queda tu negocio.' })
        } else {
          setState({ loading: false, ok: false, msg: res.status === 429 ? 'Hiciste muchas búsquedas. Toca el mapa donde queda tu negocio.' : 'No pudimos buscar la dirección. Toca el mapa donde queda tu negocio.' })
        }
      } catch {
        if (!cancelled) setState({ loading: false, ok: false, msg: 'No pudimos buscar la dirección. Toca el mapa donde queda tu negocio.' })
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pin: sincroniza el marcador con el estado.
  useEffect(() => {
    const m = map.current
    if (!m || !pin) return
    if (!marker.current) {
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:24px;height:24px;border-radius:50%;background:${GOLD};border:3px solid #111;box-shadow:0 2px 8px rgba(0,0,0,.5)"></div>`,
        iconSize: [24, 24], iconAnchor: [12, 12],
      })
      marker.current = L.marker(pin, { icon, draggable: true }).addTo(m)
      marker.current.on('dragend', () => { const ll = marker.current!.getLatLng(); setPin([ll.lat, ll.lng]) })
      m.setView(pin, Math.max(m.getZoom(), 17))
    } else {
      marker.current.setLatLng(pin)
    }
  }, [pin])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const surface = isDark ? '#141414' : '#ffffff'
  return (
    <div role="dialog" aria-modal="true" aria-label="Confirmar ubicación en el mapa" onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(8px,3vw,24px)' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: 'min(100%, 620px)', maxHeight: '100%', overflowY: 'auto', background: surface, border: `1px solid ${border}`, borderRadius: 18, padding: 'clamp(14px,3vw,22px)', color: textColor, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Confirma la ubicación de tu negocio</div>
          <div style={{ fontSize: 13, color: muted, marginTop: 4, overflowWrap: 'anywhere' }}>{address}{city ? `, ${city}` : ''}</div>
        </div>
        <div ref={mapEl} style={{ width: '100%', height: 'clamp(240px, 48vh, 400px)', borderRadius: 12, overflow: 'hidden', border: `1px solid ${border}`, background: '#0a0a0a' }} />
        <div role="status" style={{ fontSize: 13, lineHeight: 1.5, color: state.ok ? muted : '#ffb347', minHeight: 20 }}>
          {state.loading ? 'Buscando tu dirección...' : state.msg}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose}
            style={{ padding: '11px 20px', borderRadius: 11, border: `1px solid ${border}`, background: 'transparent', color: textColor, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button type="button" disabled={!pin} onClick={() => pin && onConfirm(Number(pin[0].toFixed(6)), Number(pin[1].toFixed(6)))}
            style={{ padding: '11px 22px', borderRadius: 11, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 14, cursor: pin ? 'pointer' : 'not-allowed', opacity: pin ? 1 : 0.5 }}>
            Confirmar ubicación
          </button>
        </div>
      </div>
    </div>
  )
}
