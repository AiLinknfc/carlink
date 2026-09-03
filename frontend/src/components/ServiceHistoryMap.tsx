'use client'

import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface HistoryItem {
  date: string | null
  service_type: string
  workshop_name: string
  latitude: number | null
  longitude: number | null
}

interface Props {
  items: HistoryItem[]
  onSelectWorkshop?: (name: string) => void
}

const DEFAULT_CENTER: [number, number] = [4.6097, -74.0817]

export default function ServiceHistoryMap({ items, onSelectWorkshop }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)

  const geocoded = items.filter(it => it.latitude != null && it.longitude != null)

  useEffect(() => {
    if (!mapRef.current || mapInstance.current || geocoded.length === 0) return

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
    })

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)

    const bounds = L.latLngBounds([])
    geocoded.forEach((it, i) => {
      const latlng: [number, number] = [it.latitude!, it.longitude!]
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:24px;height:24px;border-radius:50%;background:#F5C518;border:2px solid #111;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#111;box-shadow:0 2px 8px rgba(0,0,0,.4)">${i + 1}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })
      const marker = L.marker(latlng, { icon }).addTo(map)
      marker.bindPopup(
        `<div style="font-family:system-ui;font-size:12px;min-width:120px">` +
        `<div style="font-weight:700;margin-bottom:2px">${it.workshop_name || 'Taller'}</div>` +
        `<div style="color:#666;font-size:11px">${it.service_type}${it.date ? ' · ' + new Date(it.date).toLocaleDateString() : ''}</div>` +
        `</div>`,
        { closeButton: false, offset: [0, -14] as [number, number] }
      )
      marker.on('mouseover', function(this: L.Marker) { this.openPopup() })
      marker.on('click', () => {
        onSelectWorkshop?.(it.workshop_name)
      })
      bounds.extend(latlng)
    })

    if (geocoded.length === 1) {
      map.setView(bounds.getCenter(), 14)
    } else {
      map.fitBounds(bounds, { padding: [30, 30] })
    }

    mapInstance.current = map
    return () => { map.remove(); mapInstance.current = null }
  }, [geocoded.length])

  if (geocoded.length === 0) return null

  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', height: 200 }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
