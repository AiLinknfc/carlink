'use client'

import { useState, useEffect } from 'react'
import { apiGet } from '@/lib/api'

interface TallerTabProps {
  vehicleId?: string
}

export default function TallerTab({ vehicleId }: TallerTabProps) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!vehicleId) { setLoading(false); return }
    setLoading(true)
    apiGet(`/service-logs/vehicle/${vehicleId}`).then(d => { if (d) setItems(d) }).finally(() => setLoading(false))
  }, [vehicleId])

  return (
    <div style={{ animation: 'sectionIn .4s both' }}>
      <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 800, margin: 0 }}>Taller — Bitácora de servicio</h2>
      {!loading && items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)', fontSize: 14, border: '1px dashed var(--border-2)', borderRadius: 16, marginTop: 16 }}>
          Sin entradas de taller
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          {items.map((s, i) => (
            <div key={i} style={{ padding: '14px 18px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 700 }}>Entrada #{s.id?.slice(0, 8)}</div>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{new Date(s.created_at).toLocaleDateString()}</span>
              </div>
              <div style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 4 }}>{s.log_text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
