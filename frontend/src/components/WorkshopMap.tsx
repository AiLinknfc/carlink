'use client'

/* Mapa de ubicación del taller, incrustado en la ficha pública (no es un modal). Solo lectura: muestra el pin que el
   taller confirmó en Perfil > Ubicación. Leaflet toca `window`: se importa con dynamic({ ssr: false }) desde la página. */
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default function WorkshopMap({ name, address, city, lat, lon }: {
  name: string; address: string; city: string; lat: number; lon: number
}) {
  const mapEl = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mapEl.current) return
    // En pantallas táctiles un dedo arrastra la página, no el mapa (el pellizco y los botones + / - sí hacen zoom).
    const touch = L.Browser.mobile
    const m = L.map(mapEl.current, { zoomControl: false, attributionControl: false, scrollWheelZoom: false, dragging: !touch }).setView([lat, lon], 16)
    // Zoom arriba a la derecha y atribución de OpenStreetMap arriba a la izquierda: abajo va la dirección sobre el mapa.
    L.control.zoom({ position: 'topright' }).addTo(m)
    L.control.attribution({ position: 'topleft', prefix: false }).addTo(m)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(m)
    const icon = L.divIcon({
      className: '',
      html: '<div style="width:22px;height:22px;border-radius:50%;background:#F5C518;border:3px solid #111;box-shadow:0 2px 8px rgba(0,0,0,.45)"></div>',
      iconSize: [22, 22], iconAnchor: [11, 11],
    })
    L.marker([lat, lon], { icon, interactive: false }).addTo(m)
    return () => { m.remove() }
  }, [lat, lon])

  const place = [address, city].filter(Boolean).join(', ')
  const route = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`

  return (
    <div style={{ position: 'relative', width: '100%', height: 260, borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#0c0c0c' }}>
      <div ref={mapEl} role="region" aria-label={`Mapa de ubicación de ${name}`} data-testid="workshop-map"
        style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
      {/* Dirección y botón dentro del mapa, como el nombre y el precio dentro de la foto del carrusel. */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 1000, padding: '34px 12px 12px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', background: 'linear-gradient(to top, rgba(0,0,0,0.82), rgba(0,0,0,0))', pointerEvents: 'none' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', minWidth: 0, flex: '1 1 120px', overflowWrap: 'anywhere', textShadow: '0 1px 4px rgba(0,0,0,.8)' }}>{place || name}</div>
        <a href={route} target="_blank" rel="noopener noreferrer"
          style={{ pointerEvents: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '8px 14px', borderRadius: 10, background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 12.5, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          Cómo llegar
        </a>
      </div>
    </div>
  )
}
