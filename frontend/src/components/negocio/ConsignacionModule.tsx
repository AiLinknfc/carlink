'use client'

import { useEffect, useState } from 'react'
import { rtmApi, fmtDate, type Consignment } from '@/lib/rtm'
import { negocioTokens } from './shared'

/* Llaveros que CarLink dejó en consignación al concesionario (docs/PLAN_ALIADOS_NEGOCIO.md, sección 16). Solo lectura: nunca se muestra
   el código de activación ni quién lo activó. */
const STATUS: Record<string, string> = { available: 'Disponible', claimed: 'Activado', suspended: 'En pausa' }

export default function ConsignacionModule({ theme }: { theme: 'light' | 'dark' }) {
  const t = negocioTokens(theme)
  const [data, setData] = useState<Consignment | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { rtmApi.consignment().then(r => { setData(r.ok ? r.data : null); setLoading(false) }) }, [])

  if (loading) return <div style={{ color: t.textMuted, padding: 20 }}>Cargando...</div>
  if (!data) return <div style={{ color: t.textMuted, padding: 20 }}>No pudimos cargar tus llaveros. Intenta de nuevo en un momento.</div>
  if (!data.linked) {
    return (
      <div style={{ padding: 36, textAlign: 'center', border: `1px dashed ${t.border}`, borderRadius: 18, color: t.textMuted, lineHeight: 1.6, maxWidth: 640 }}>
        Tu negocio todavía no tiene llaveros en consignación. Si quieres entregar un llavero NFC con cada vehículo que vendes, escríbenos a business@carlink.com.co y lo coordinamos.
      </div>
    )
  }
  const stat = (label: string, value: number) => (
    <div style={{ padding: 16, borderRadius: 14, background: t.cardBg, border: `1px solid ${t.subtleBorder}` }}>
      <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: t.textMuted, fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginTop: 6, color: t.textPrimary }}>{value}</div>
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 820 }}>
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: t.textSecondary }}>
        Estos llaveros son de CarLink y los tienes en consignación: entrégalos con cada vehículo. El comprador los activa con el código impreso en el empaque; por privacidad aquí solo ves cuántos se han activado.
        {data.status === 'suspended' && <b style={{ color: t.warning }}> Tu cupo está en pausa por ahora.</b>}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,170px),1fr))', gap: 12 }}>
        {stat('Cupo asignado', data.quota_total)}{stat('Disponibles', data.available)}{stat('Activados', data.claimed)}
      </div>
      {data.rows.length > 0 && (
        <div style={{ borderRadius: 14, border: `1px solid ${t.subtleBorder}`, overflow: 'hidden' }}>
          {data.rows.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', padding: '10px 14px', borderTop: i ? `1px solid ${t.subtleBorder}` : 'none', fontSize: 13, background: t.cardBg }}>
              <span style={{ fontFamily: 'monospace', color: t.textPrimary }}>{r.token_prefix ? `${r.token_prefix}…` : 'Llavero'}</span>
              <span style={{ color: r.status === 'claimed' ? t.success : t.textSecondary }}>{STATUS[r.status] || r.status}{r.claimed_at ? ` · ${fmtDate(r.claimed_at.slice(0, 10))}` : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
