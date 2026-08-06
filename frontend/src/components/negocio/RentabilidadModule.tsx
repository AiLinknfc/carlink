'use client'

import { useMemo } from 'react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useWorkOrders } from '@/lib/hooks'
import type { Workshop } from '@/lib/types'
import { negocioTokens, emptyState, money } from './shared'

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/* Gráfico de barras + gráfico circular + tabla, con recharts (misma librería
   que tallerpro/src/components/ProfitabilityReports.tsx) — antes se usaban
   barras horizontales caseras. Paleta categórica validada con
   scripts/validate_palette.js de la skill dataviz (3 slots, adjacent +
   contraste OK en ambos modos — ver docs/PLAN_PARIDAD_UI_TALLERPRO.md
   Fase C.6, revisión 2026-08-05). */
const SERIES = {
  revenue: { light: '#2a78d6', dark: '#3987e5', label: 'Facturación' },
  cost: { light: '#eb6834', dark: '#d95926', label: 'Costo repuestos' },
  profit: { light: '#1baf7a', dark: '#199e70', label: 'Ganancia neta' },
}
// Top 3 categorías con los mismos 3 slots (ya validados all-pairs) + "Otros"
// en gris neutro (no es una identidad de serie, es un bucket agregado).
const PIE_COLORS = { slot1: SERIES.revenue, slot2: SERIES.cost, slot3: SERIES.profit }

export default function RentabilidadModule({ theme, workshop }: { theme: 'light' | 'dark'; workshop: Workshop }) {
  const t = negocioTokens(theme)
  const { workOrders, loading } = useWorkOrders()
  const isDark = theme === 'dark'
  const pick = (s: { light: string; dark: string }) => (isDark ? s.dark : s.light)

  const closedOrders = useMemo(() => workOrders.filter(o => o.status !== 'Cancelado'), [workOrders])

  const byMonth = useMemo(() => {
    const map = new Map<string, { revenue: number; profit: number; cost: number; labor: number; parts: number; count: number }>()
    for (const o of closedOrders) {
      const d = new Date(o.entry_date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const acc = map.get(key) || { revenue: 0, profit: 0, cost: 0, labor: 0, parts: 0, count: 0 }
      acc.revenue += Number(o.final_total)
      acc.profit += Number(o.net_profit)
      acc.cost += Number(o.total_cost_price)
      acc.labor += Number(o.labor_total)
      acc.parts += Number(o.parts_total)
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
      .reverse() // cronológico izquierda→derecha, igual que tallerpro
  }, [closedOrders])

  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const o of closedOrders) {
      const cat = o.category || 'Sin categoría'
      map.set(cat, (map.get(cat) || 0) + Number(o.final_total))
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [closedOrders])

  // Escalera de series categóricas de la skill dataviz: más de 3 en una
  // forma "all-pairs" (la torta lo es, cualquier gajo es vecino de
  // cualquier otro) se pliega a "Otros" en gris neutro en vez de generar
  // una 4ta identidad.
  const pieData = useMemo(() => {
    const top3 = byCategory.slice(0, 3)
    const rest = byCategory.slice(3)
    const restSum = rest.reduce((s, [, v]) => s + v, 0)
    const data = top3.map(([name, value], i) => ({ name, value, color: pick(Object.values(PIE_COLORS)[i]) }))
    if (restSum > 0) data.push({ name: 'Otros', value: restSum, color: isDark ? '#5c584e' : '#a8a396' })
    return data
  }, [byCategory, isDark])

  const totals = useMemo(() => byMonth.reduce((acc, m) => ({
    revenue: acc.revenue + m.revenue, profit: acc.profit + m.profit, cost: acc.cost + m.cost, count: acc.count + m.count,
  }), { revenue: 0, profit: 0, cost: 0, count: 0 }), [byMonth])

  const avgTicket = totals.count > 0 ? totals.revenue / totals.count : 0

  const exportCsv = () => {
    const header = 'Mes,Facturacion,Mano_Obra,Repuestos,Costo_Repuestos,Ganancia_Neta,Margen_%\n'
    const rows = byMonth.map(m => `${m.label},${m.revenue.toFixed(2)},${m.labor.toFixed(2)},${m.parts.toFixed(2)},${m.cost.toFixed(2)},${m.profit.toFixed(2)},${m.margin.toFixed(1)}`).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rentabilidad_taller.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Sin este guard, la primera renderización (loading=true, workOrders=[])
  // caía derecho al bloque de abajo y mostraba $0 en todo por un instante —
  // encontrado corriendo el módulo real en navegador, no con tsc/vitest.
  if (loading) {
    return <div style={{ animation: 'sectionIn .4s both', padding: 40, textAlign: 'center', color: t.textMuted }}>Cargando rentabilidad…</div>
  }

  if (closedOrders.length === 0) {
    return <div style={{ animation: 'sectionIn .4s both' }}><div style={emptyState(t, 'Sin órdenes cerradas todavía — la rentabilidad se calcula sobre tus órdenes de trabajo reales')} /></div>
  }

  const gridStroke = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,17,0.08)'
  const tickColor = t.textMuted
  const tooltipStyle: React.CSSProperties = {
    background: isDark ? 'rgba(16,16,16,0.97)' : 'rgba(255,255,255,0.98)',
    border: `1px solid ${t.subtleBorder}`, borderRadius: 10, fontSize: 12, color: t.textPrimary,
  }
  const fmtTooltip = (val: unknown) => money(Number(val) || 0)

  return (
    <div style={{ animation: 'sectionIn .4s both', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* "no-print": estos botones no deben salir en la hoja impresa, solo
          el contenido de abajo (.print-area) — igual que tallerpro
          (ProfitabilityReports: "Exportar CSV" + "Imprimir Informe"). */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={exportCsv} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10,
          border: `1px solid ${t.subtleBorder}`, background: 'transparent', color: t.textSecondary, fontSize: 12, fontWeight: 700, cursor: 'pointer',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          Exportar CSV
        </button>
        <button onClick={() => window.print()} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, border: 'none',
          background: t.gold, color: '#111', fontSize: 12, fontWeight: 800, cursor: 'pointer',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
          Imprimir informe
        </button>
      </div>

      <div className="print-area" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Encabezado solo visible al imprimir — la app ya muestra el nombre
          del taller en el topbar, no hace falta repetirlo en pantalla. */}
      <div className="print-only-header" style={{ display: 'none' }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>{workshop.name}</div>
        <div style={{ fontSize: 12, color: '#666' }}>Reporte de rentabilidad — {new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
      </div>

      {/* KPIs — mismo set que tallerpro: ingresos, ganancia, costo de
          repuestos, ticket promedio. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 14 }}>
        <StatCard t={t} label="Ingresos totales" value={money(totals.revenue)} sub={`Últimos ${byMonth.length} meses`} />
        <StatCard t={t} label="Ganancia neta" value={money(totals.profit)} sub={`+${totals.revenue > 0 ? ((totals.profit / totals.revenue) * 100).toFixed(1) : 0}% margen`} accent={t.success} />
        <StatCard t={t} label="Costo de repuestos" value={money(totals.cost)} sub="Costo directo instalado" accent={t.warning} />
        <StatCard t={t} label="Ticket promedio" value={money(avgTicket)} sub={`Sobre ${totals.count} órdenes cerradas`} />
      </div>

      {/* Gráfico de barras (2/3) + gráfico circular (1/3) — misma
          proporción y misma pareja de gráficos que tallerpro
          (ProfitabilityReports: BarChart + PieChart, lg:grid-cols-3). */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(240px,1fr)', gap: 20, alignItems: 'start' }}>
        <div style={{ padding: 20, borderRadius: 16, background: t.cardBg, border: `1px solid ${t.border}`, minWidth: 0 }}>
          <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: t.gold, fontWeight: 700, marginBottom: 14 }}>
            Evolución de ingresos, costo y ganancia
          </div>
          <div style={{ height: 280, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byMonth} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: tickColor }} axisLine={{ stroke: gridStroke }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} width={56}
                  tickFormatter={v => `$${Math.round(v / 1000)}k`} />
                <Tooltip formatter={fmtTooltip} contentStyle={tooltipStyle} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(17,17,17,0.04)' }} />
                <Legend wrapperStyle={{ fontSize: 11.5, color: t.textSecondary }} iconType="circle" iconSize={8} />
                <Bar dataKey="revenue" name={SERIES.revenue.label} fill={pick(SERIES.revenue)} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="cost" name={SERIES.cost.label} fill={pick(SERIES.cost)} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="profit" name={SERIES.profit.label} fill={pick(SERIES.profit)} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ padding: 20, borderRadius: 16, background: t.cardBg, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: t.gold, fontWeight: 700, marginBottom: 14 }}>
            Ingresos por categoría
          </div>
          <div style={{ height: 200, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={3} dataKey="value" stroke="none">
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={fmtTooltip} contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Leyenda con etiquetas directas — obligatorio por el WARN de
              contraste del validador en modo claro (relief: labels visibles). */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4, paddingTop: 12, borderTop: `1px solid ${t.subtleBorder}` }}>
            {pieData.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 11.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: d.color, flex: '0 0 auto' }} />
                  <span style={{ color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                </div>
                <span style={{ color: t.textMuted, flex: '0 0 auto' }}>{money(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla de detalle histórico — igual que tallerpro (Detalle Histórico
          de Rendimiento Mensual): Periodo/Facturación/Mano de obra/
          Repuestos/Costo/Ganancia/Margen. Sin columna "Gastos Fijos" — CarLink
          no modela costos fijos de taller (no se inventa ese dato). */}
      <div style={{ borderRadius: 16, border: `1px solid ${t.border}`, background: t.cardBg, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${t.subtleBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: t.textPrimary }}>Detalle histórico mensual</span>
          <span style={{ fontSize: 11, color: t.textMuted }}>Valores en COP</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 720 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '100px repeat(5, 1fr) 80px', gap: 10, padding: '10px 18px', fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: t.textMuted, background: t.subtleBorder }}>
              <div>Periodo</div><div style={{ textAlign: 'right' }}>Facturación</div><div style={{ textAlign: 'right' }}>Mano de obra</div><div style={{ textAlign: 'right' }}>Repuestos</div><div style={{ textAlign: 'right' }}>Costo</div><div style={{ textAlign: 'right' }}>Ganancia</div><div style={{ textAlign: 'center' }}>Margen</div>
            </div>
            {[...byMonth].reverse().map(m => (
              <div key={m.key} style={{ display: 'grid', gridTemplateColumns: '100px repeat(5, 1fr) 80px', gap: 10, padding: '10px 18px', borderTop: `1px solid ${t.subtleBorder}`, fontSize: 12.5 }}>
                <div style={{ fontWeight: 700, color: t.textPrimary, textTransform: 'capitalize' }}>{m.label}</div>
                <div style={{ textAlign: 'right', fontWeight: 700, color: t.textPrimary }}>{money(m.revenue)}</div>
                <div style={{ textAlign: 'right', color: t.textMuted }}>{money(m.labor)}</div>
                <div style={{ textAlign: 'right', color: t.textMuted }}>{money(m.parts)}</div>
                <div style={{ textAlign: 'right', color: t.warning }}>{money(m.cost)}</div>
                <div style={{ textAlign: 'right', fontWeight: 700, color: t.success }}>{money(m.profit)}</div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: t.success, background: 'rgba(46,204,113,0.12)', padding: '2px 7px', borderRadius: 999 }}>+{m.margin.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

function StatCard({ t, label, value, sub, accent }: { t: ReturnType<typeof negocioTokens>; label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={{ padding: 18, borderRadius: 16, background: t.cardBg, border: `1px solid ${t.border}` }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: t.textMuted }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: accent || t.textPrimary, marginTop: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: t.textMuted, marginTop: 3 }}>{sub}</div>}
    </div>
  )
}
