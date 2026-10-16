'use client'

import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'
import { COP } from '@/lib/checkout'
import { negocioTokens, primaryBtnStyle, ghostBtnStyle } from './shared'

/* Código de alianza del negocio (docs/PLAN_ALIADOS_NEGOCIO.md, sección 5): el enlace que comparte con sus clientes para
   que compren llaveros con descuento, y cuánto ha recomendado. Solo cantidades agregadas; nunca datos del comprador. */

interface Alliance {
  code: string
  share_url: string
  eligible: boolean
  reason: 'not_verified' | 'access_expired' | null
  discount_per_unit_cop: number
  monthly_cap_units: number
  units_30d: number
  units_total: number
  orders_total: number
}

const REASON_TEXT: Record<string, string> = {
  not_verified: 'Tu negocio aún no está verificado, por eso el código todavía no da descuento. Se activa cuando CarLink termina la validación.',
  access_expired: 'Tu acceso terminó, por eso el código no da descuento por ahora. Renueva tu plan para reactivarlo.',
}

export default function AllianceModule({ theme }: { theme: 'light' | 'dark' }) {
  const t = negocioTokens(theme)
  const [data, setData] = useState<Alliance | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => { apiGet<Alliance>('/workshops/me/alliance').then(d => { setData(d); setLoading(false) }) }, [])

  const copy = async () => {
    if (!data) return
    try { await navigator.clipboard.writeText(data.share_url); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* el enlace se puede seleccionar a mano */ }
  }

  if (loading) return <div style={{ color: t.textMuted, padding: 20 }}>Cargando...</div>
  if (!data) return <div style={{ color: t.textMuted, padding: 20 }}>No pudimos cargar tu código de alianza. Intenta de nuevo en un momento.</div>

  const shareText = `Compra tu llavero NFC CarLink con ${COP(data.discount_per_unit_cop)} de descuento por unidad: ${data.share_url}`
  const stat = (label: string, value: string) => (
    <div style={{ padding: 16, borderRadius: 14, background: t.cardBg, border: `1px solid ${t.subtleBorder}` }}>
      <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: t.textMuted, fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginTop: 6, color: t.textPrimary }}>{value}</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 820 }}>
      <div style={{ padding: 22, borderRadius: 18, background: t.cardBg, border: `1px solid ${t.border}` }}>
        <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: t.gold, fontWeight: 700 }}>Tu código de alianza</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px,6vw,44px)', letterSpacing: '.04em', margin: '8px 0 4px', color: t.textPrimary, overflowWrap: 'anywhere' }}>{data.code}</div>
        <p style={{ margin: '0 0 14px', fontSize: 14, lineHeight: 1.6, color: t.textSecondary }}>
          Recomienda el llavero NFC a tus clientes: quien compre con tu enlace o tu código recibe <b style={{ color: t.textPrimary }}>{COP(data.discount_per_unit_cop)} de descuento por llavero</b>.
        </p>
        {!data.eligible && data.reason && (
          <div role="status" style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,138,61,0.1)', border: '1px solid rgba(255,138,61,0.3)', fontSize: 13, lineHeight: 1.5, color: t.textPrimary }}>{REASON_TEXT[data.reason]}</div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input readOnly value={data.share_url} aria-label="Enlace para compartir" onFocus={e => e.currentTarget.select()}
            style={{ flex: '1 1 260px', minWidth: 0, padding: '11px 14px', borderRadius: 11, border: `1px solid ${t.subtleBorder}`, background: t.inputBg, color: t.textPrimary, fontSize: 13.5, fontFamily: 'inherit' }} />
          <button onClick={copy} style={primaryBtnStyle(t, false)}>{copied ? 'Copiado' : 'Copiar enlace'}</button>
          <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" style={{ ...ghostBtnStyle(t), textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Compartir por WhatsApp</a>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,190px),1fr))', gap: 12 }}>
        {stat('Llaveros este mes', `${data.units_30d} de ${data.monthly_cap_units}`)}
        {stat('Llaveros en total', String(data.units_total))}
        {stat('Pedidos pagados', String(data.orders_total))}
      </div>
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: t.textMuted }}>
        Cada mes se pueden recomendar hasta {data.monthly_cap_units} llaveros con descuento. Solo ves cantidades: por privacidad no mostramos quién compró. Detalle en los Términos de uso, sección 3A.
      </p>
    </div>
  )
}
