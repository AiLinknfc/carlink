'use client'

import { useMemo } from 'react'
import { useWorkOrders } from '@/lib/hooks'
import { negocioTokens, emptyState, money } from './shared'

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export default function RentabilidadModule({ theme }: { theme: 'light' | 'dark' }) {
  const t = negocioTokens(theme)
  const { workOrders, loading } = useWorkOrders()

  const closedOrders = useMemo(() => workOrders.filter(o => o.status !== 'Cancelado'), [workOrders])

  const byMonth = useMemo(() => {
    const map = new Map<string, { revenue: number; profit: number; cost: number; count: number }>()
    for (const o of closedOrders) {
      const d = new Date(o.entry_date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const acc = map.get(key) || { revenue: 0, profit: 0, cost: 0, count: 0 }
      acc.revenue += Number(o.final_total)
      acc.profit += Number(o.net_profit)
      acc.cost += Number(o.total_cost_price)
      acc.count += 1
      map.set(key, acc)
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 6)
      .map(([key, v]) => {
        const [y, m] = key.split('-')
        return { key, label: `${MONTH_LABELS[Number(m) - 1]} ${y}`, ...v, margin: v.revenue > 0 ? (v.profit / v.revenue) * 100 : 0 }
      })
  }, [closedOrders])

  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const o of closedOrders) {
      const cat = o.category || 'Sin categoría'
      map.set(cat, (map.get(cat) || 0) + Number(o.final_total))
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [closedOrders])

  const totals = useMemo(() => byMonth.reduce((acc, m) => ({
    revenue: acc.revenue + m.revenue, profit: acc.profit + m.profit, count: acc.count + m.count,
  }), { revenue: 0, profit: 0, count: 0 }), [byMonth])

  const maxCategory = Math.max(1, ...byCategory.map(([, v]) => v))

  // Sin este guard, la primera renderización (loading=true, workOrders=[])
  // caía derecho al bloque de abajo y mostraba $0 en todo por un instante —
  // encontrado corriendo el módulo real en navegador, no con tsc/vitest.
  if (loading) {
    return <div style={{ animation: 'sectionIn .4s both', padding: 40, textAlign: 'center', color: t.textMuted }}>Cargando rentabilidad…</div>
  }

  if (closedOrders.length === 0) {
    return <div style={{ animation: 'sectionIn .4s both' }}><div style={emptyState(t, 'Sin órdenes cerradas todavía — la rentabilidad se calcula sobre tus órdenes de trabajo reales')} /></div>
  }

  return (
    <div style={{ animation: 'sectionIn .4s both', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 14 }}>
        <StatCard t={t} label="Ingresos (últimos 6 meses)" value={money(totals.revenue)} />
        <StatCard t={t} label="Ganancia neta" value={money(totals.profit)} />
        <StatCard t={t} label="Margen promedio" value={`${totals.revenue > 0 ? ((totals.profit / totals.revenue) * 100).toFixed(1) : 0}%`} />
        <StatCard t={t} label="Órdenes cerradas" value={String(totals.count)} />
      </div>

      <div style={{ padding: 20, borderRadius: 16, background: t.cardBg, border: `1px solid ${t.border}` }}>
        <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: t.gold, fontWeight: 700, marginBottom: 14 }}>Por mes</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {byMonth.map(m => (
            <div key={m.key} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 90px 90px 60px', gap: 12, alignItems: 'center' }}>
              <div style={{ fontSize: 12.5, color: t.textMuted, textTransform: 'capitalize' }}>{m.label}</div>
              <div style={{ height: 8, borderRadius: 6, background: t.subtleBorder, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, (m.revenue / (totals.revenue || 1)) * 100 * (byMonth.length || 1))}%`, background: t.gold, borderRadius: 6 }} />
              </div>
              <div style={{ fontSize: 12.5, color: t.textPrimary, textAlign: 'right' }}>{money(m.revenue)}</div>
              <div style={{ fontSize: 12.5, color: t.success, textAlign: 'right' }}>{money(m.profit)}</div>
              <div style={{ fontSize: 11.5, color: t.textMuted, textAlign: 'right' }}>{m.margin.toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: 20, borderRadius: 16, background: t.cardBg, border: `1px solid ${t.border}` }}>
        <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: t.gold, fontWeight: 700, marginBottom: 14 }}>Ingresos por categoría de servicio</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {byCategory.map(([cat, revenue]) => (
            <div key={cat} style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 12, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12.5, color: t.textPrimary, marginBottom: 4 }}>{cat}</div>
                <div style={{ height: 6, borderRadius: 6, background: t.subtleBorder, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(revenue / maxCategory) * 100}%`, background: t.gold, borderRadius: 6 }} />
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: t.textPrimary, textAlign: 'right' }}>{money(revenue)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ t, label, value }: { t: ReturnType<typeof negocioTokens>; label: string; value: string }) {
  return (
    <div style={{ padding: 18, borderRadius: 16, background: t.cardBg, border: `1px solid ${t.border}` }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: t.gold }}>{value}</div>
      <div style={{ fontSize: 11.5, color: t.textMuted, marginTop: 2 }}>{label}</div>
    </div>
  )
}
