'use client'

import type { NfcStats, ShopOrderStats } from '@/lib/types'

interface Colors { bg: string; card: string; border: string; text: string; muted: string; accent: string }

function Tile({ c, label, value, color }: { c: Colors; label: string; value: string | number; color?: string }) {
  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 12, color: c.muted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: color || c.text }}>{typeof value === 'number' ? value.toLocaleString('es-CO') : value}</div>
    </div>
  )
}

function Section({ c, title, children }: { c: Colors; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: c.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))', gap: 12 }}>{children}</div>
    </div>
  )
}

/* Métricas de operación (lo que antes era la pestaña Dashboard), mostradas encima del tablero de
   analítica con el mismo estilo de tarjeta: tienda, llaveros y lo que está por atender. */
export default function BusinessMetrics({ c, stats, shop, pendingNotifications, unseenNotifications }: {
  c: Colors; stats: NfcStats | null; shop: ShopOrderStats | null; pendingNotifications: number; unseenNotifications: number
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 28 }}>
      <Section c={c} title="Por atender">
        <Tile c={c} label="Notificaciones pendientes" value={pendingNotifications} color={pendingNotifications > 0 ? '#ff8a3d' : undefined} />
        <Tile c={c} label="Sin ver" value={unseenNotifications} color={unseenNotifications > 0 ? '#ff4d6a' : undefined} />
        {shop && <Tile c={c} label="Pedidos por despachar" value={shop.pending_shipment} color={shop.pending_shipment > 0 ? '#ff8a3d' : undefined} />}
      </Section>
      {shop && (
        <Section c={c} title="Tienda — llavero NFC">
          <Tile c={c} label="Pedidos totales" value={shop.total_orders} />
          <Tile c={c} label="Pedidos pagados" value={shop.paid_orders} />
          <Tile c={c} label="Enviados" value={shop.shipped_count} />
          <Tile c={c} label="Entregados" value={shop.delivered_count} />
          <Tile c={c} label="Ingresos" value={'$' + Math.round(shop.revenue_in_cents / 100).toLocaleString('es-CO')} color={c.accent} />
        </Section>
      )}
      {stats && (
        <Section c={c} title="Llaveros NFC">
          <Tile c={c} label="Llaveros activados" value={stats.total_tokens} />
          <Tile c={c} label="Activos" value={stats.active_tokens} />
          <Tile c={c} label="Lecturas hoy" value={stats.total_access_today} />
          <Tile c={c} label="Códigos en whitelist" value={stats.whitelist_count} />
        </Section>
      )}
    </div>
  )
}
