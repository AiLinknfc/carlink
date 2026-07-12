'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface NfcVehicle {
  plate: string
  brand: string
  model: string
  year: number
  color: string
  type: string
  vehicle_id: string
}

export default function NfcPage() {
  const params = useParams()
  const token = params.token as string
  const [data, setData] = useState<NfcVehicle | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    fetch(`/api/nfc/${encodeURIComponent(token)}`)
      .then(r => {
        if (r.status === 429) throw new Error('rate_limited')
        if (!r.ok) throw new Error('not_found')
        return r.json()
      })
      .then(j => { setData(j); setLoading(false) })
      .catch(e => {
        setError(e.message === 'rate_limited' ? 'rate_limited' : 'not_found')
        setLoading(false)
      })
  }, [token])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0c0c0e',
      color: '#f5f3ec',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: "'Inter',system-ui,sans-serif",
    }}>
      {loading && (
        <div style={{ fontSize: 14, color: '#7c786e' }}>Cargando ficha técnica…</div>
      )}

      {error === 'rate_limited' && (
        <div style={{
          textAlign: 'center',
          padding: '40px 32px',
          borderRadius: 20,
          background: 'rgba(255,55,55,0.06)',
          border: '1px solid rgba(255,55,55,0.2)',
          maxWidth: 380,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛡️</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Demasiadas solicitudes</div>
          <div style={{ fontSize: 13, color: '#b6b2a6', lineHeight: 1.5 }}>
            Espera un momento y vuelve a escanear el llavero.
          </div>
        </div>
      )}

      {error === 'not_found' && (
        <div style={{
          textAlign: 'center',
          padding: '40px 32px',
          borderRadius: 20,
          background: 'rgba(255,55,55,0.06)',
          border: '1px solid rgba(255,55,55,0.2)',
          maxWidth: 380,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔗</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Enlace no válido</div>
          <div style={{ fontSize: 13, color: '#b6b2a6', lineHeight: 1.5 }}>
            Este llavero NFC no está vinculado a ningún vehículo o fue revocado. Contacta a tu taller para reprogramarlo.
          </div>
        </div>
      )}

      {data && (
        <div style={{ width: 400, maxWidth: '100%' }}>
          {/* Header */}
          <div style={{
            textAlign: 'center',
            marginBottom: 24,
            padding: '32px 24px',
            borderRadius: 20,
            background: 'linear-gradient(145deg,#1a1a1e,#242428)',
            border: '1px solid rgba(245,197,24,0.2)',
          }}>
            <div style={{
              fontFamily: "'Anton',sans-serif",
              fontSize: 48,
              letterSpacing: '.04em',
              color: '#F5C518',
              marginBottom: 4,
            }}>
              {data.plate}
            </div>
            <div style={{ fontSize: 14, color: '#b6b2a6' }}>
              {data.brand} {data.model} · {data.year}
            </div>
          </div>

          {/* Info grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            marginBottom: 16,
          }}>
            {[
              { label: 'Marca', value: data.brand },
              { label: 'Modelo', value: data.model },
              { label: 'Año', value: data.year },
              { label: 'Color', value: data.color },
              { label: 'Tipo', value: data.type },
            ].map((item, i) => (
              <div key={i} style={{
                padding: '14px 16px',
                borderRadius: 14,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 600, marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{item.value || '—'}</div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{
            textAlign: 'center',
            padding: 16,
            fontSize: 11,
            color: '#5c5c6a',
            lineHeight: 1.5,
          }}>
            Ficha técnica CarLink · Datos actualizados por tu taller de confianza
          </div>
        </div>
      )}
    </div>
  )
}
