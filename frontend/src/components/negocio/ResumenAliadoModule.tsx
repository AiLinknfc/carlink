'use client'

import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'
import { dealerApi } from '@/lib/dealerVehicles'
import { rtmApi } from '@/lib/rtm'
import { KIND_LABEL } from '@/lib/tallerForm'
import { canUse } from '@/lib/capabilities'
import type { Workshop } from '@/lib/types'
import { negocioTokens, primaryBtnStyle, ghostBtnStyle } from './shared'

/* Inicio del panel para los negocios que NO son talleres (CDA, concesionario, compraventa, proveedor de repuestos): solo muestra lo
   que su tipo incluye. El inicio de taller (órdenes, rentabilidad, IA) es del taller (docs/PLAN_ALIADOS_NEGOCIO.md, sección 3). */

interface Dash { today_appointments: number; low_stock_alerts: number; total_clients: number }
interface Alliance { units_30d: number; monthly_cap_units: number }

const INTRO: Record<string, string> = {
  cda: 'Registra cada revisión técnico-mecánica, entrégale la constancia al propietario y avisa a tus clientes cuando se acerque el vencimiento.',
  concesionario: 'Publica tus vehículos con ficha y QR, certifica su kilometraje de salida y entrégalos al comprador en su cuenta de CarLink.',
  compraventa: 'Publica tus vehículos con ficha y QR, declara su kilometraje de salida y entrégalos al comprador en su cuenta de CarLink.',
  repuestos: 'Gestiona tu inventario de repuestos y recomienda el llavero NFC a tus clientes con descuento.',
}

export default function ResumenAliadoModule({ theme, workshop, onNavigateTab }: { theme: 'light' | 'dark'; workshop: Workshop; onNavigateTab: (tab: string) => void }) {
  const t = negocioTokens(theme)
  const kind = workshop.business_kind || 'taller'
  const [dash, setDash] = useState<Dash | null>(null)
  const [ventas, setVentas] = useState<{ total: number; listed: number; delivered: number } | null>(null)
  const [alliance, setAlliance] = useState<Alliance | null>(null)
  const [rtmDue, setRtmDue] = useState<number | null>(null)
  const [keys, setKeys] = useState<{ linked: boolean; available: number } | null>(null)

  useEffect(() => {
    apiGet<Dash>('/workshops/me/dashboard').then(setDash)
    apiGet<Alliance>('/workshops/me/alliance').then(setAlliance)
    if (canUse(workshop, 'revisiones')) rtmApi.upcoming(45).then(r => { if (r.ok && r.data) setRtmDue(r.data.length) })
    if (canUse(workshop, 'consignacion')) rtmApi.consignment().then(r => { if (r.ok && r.data) setKeys({ linked: r.data.linked, available: r.data.available }) })
    if (canUse(workshop, 'vehiculos_venta')) {
      dealerApi.list().then(r => { if (r.ok && r.data) setVentas({ total: r.data.length, listed: r.data.filter(v => v.is_listed && v.status === 'available').length, delivered: r.data.filter(v => v.status === 'delivered').length }) })
    }
  }, [workshop])

  const stat = (label: string, value: string, hint: string, tab?: string) => (
    <button key={label} onClick={() => tab && onNavigateTab(tab)} disabled={!tab}
      style={{ textAlign: 'left', padding: 18, borderRadius: 16, background: t.cardBg, border: `1px solid ${t.subtleBorder}`, color: t.textPrimary, cursor: tab ? 'pointer' : 'default', fontFamily: 'inherit' }}>
      <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: t.textMuted, fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, margin: '8px 0 4px' }}>{value}</div>
      <div style={{ fontSize: 12, color: t.textMuted }}>{hint}</div>
    </button>
  )

  const cards = []
  if (canUse(workshop, 'clientes')) cards.push(stat('Clientes', dash ? String(dash.total_clients) : '...', 'Ver clientes y vehículos', 'clientes'))
  if (canUse(workshop, 'vehiculos_venta')) cards.push(stat('Vehículos en venta', ventas ? String(ventas.listed) : '...', ventas ? `${ventas.total} en inventario · ${ventas.delivered} entregados` : 'Cargando', 'ventas'))
  if (canUse(workshop, 'revisiones')) cards.push(stat('Revisiones por vencer', rtmDue != null ? String(rtmDue) : '...', 'En los próximos 45 días', 'revisiones'))
  if (canUse(workshop, 'consignacion')) cards.push(stat('Llaveros en consignación', keys ? (keys.linked ? String(keys.available) : '0') : '...', keys && !keys.linked ? 'Aún sin cupo asignado' : 'Disponibles para entregar', 'consignacion'))
  if (canUse(workshop, 'citas')) cards.push(stat('Citas de hoy', dash ? String(dash.today_appointments) : '...', 'Ver agenda', 'citas'))
  if (canUse(workshop, 'inventario')) cards.push(stat('Alertas de stock', dash ? String(dash.low_stock_alerts) : '...', 'Gestionar inventario', 'inventario'))
  cards.push(stat('Llaveros recomendados', alliance ? `${alliance.units_30d} de ${alliance.monthly_cap_units}` : '...', 'Este mes con tu código de alianza', 'alianza'))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 980 }}>
      <div style={{ padding: 22, borderRadius: 18, background: t.cardBg, border: `1px solid ${t.border}` }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 999, border: `1px solid ${t.gold}`, color: t.gold }}>{KIND_LABEL[kind] || kind}</span>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 999, border: `1px solid ${workshop.is_verified ? t.success : t.textMuted}`, color: workshop.is_verified ? t.success : t.textMuted }}>{workshop.is_verified ? 'Verificado' : 'En verificación'}</span>
        </div>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65, color: t.textSecondary }}>{INTRO[kind] || 'Gestiona tu negocio en CarLink.'}</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
          {canUse(workshop, 'revisiones') && <button onClick={() => onNavigateTab('revisiones')} style={primaryBtnStyle(t, false)}>Registrar una revisión</button>}
          {canUse(workshop, 'vehiculos_venta') && <button onClick={() => onNavigateTab('ventas')} style={primaryBtnStyle(t, false)}>Ver vehículos en venta</button>}
          {canUse(workshop, 'clientes') && <button onClick={() => onNavigateTab('clientes')} style={ghostBtnStyle(t)}>Mis clientes</button>}
          {canUse(workshop, 'citas') && <button onClick={() => onNavigateTab('citas')} style={ghostBtnStyle(t)}>Agenda</button>}
          {canUse(workshop, 'inventario') && <button onClick={() => onNavigateTab('inventario')} style={ghostBtnStyle(t)}>Inventario</button>}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,210px),1fr))', gap: 12 }}>{cards}</div>
    </div>
  )
}
