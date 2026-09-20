'use client'

import { useEffect, useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { analyticsApi } from '@/lib/api'
import type { AnalyticsCount, AnalyticsFunnel, AnalyticsSummary } from '@/lib/types'

interface Colors { bg: string; card: string; border: string; text: string; muted: string; accent: string }

const RANGES = [7, 30, 90] as const
const SESSIONS_COLOR = '#4C9BE8'

function pct(n: number, base: number) {
  return base > 0 ? Math.round((n / base) * 100) : 0
}

function StatTile({ c, label, value }: { c: Colors; label: string; value: number }) {
  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 12, color: c.muted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{value.toLocaleString('es-CO')}</div>
    </div>
  )
}

/* Embudo: cada barra se mide contra el primer paso; "cae X%" es contra el
   paso inmediatamente anterior — ahí se ve dónde se traba el proceso. */
function Funnel({ c, funnel }: { c: Colors; funnel: AnalyticsFunnel }) {
  const first = funnel.steps[0]?.count ?? 0
  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 12 }}>{funnel.title}</div>
      {funnel.steps.map((s, i) => {
        const prev = i > 0 ? funnel.steps[i - 1].count : null
        const drop = prev !== null && prev > 0 ? 100 - pct(s.count, prev) : null
        return (
          <div key={s.label} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, gap: 8 }}>
              <span>{s.label}</span>
              <span style={{ color: c.muted, fontVariantNumeric: 'tabular-nums' }}>
                {s.count.toLocaleString('es-CO')}
                {drop !== null && drop > 0 ? <span style={{ color: '#E5534B' }}>{`  cae ${drop}%`}</span> : null}
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: c.border }}>
              <div style={{ height: 8, borderRadius: 4, background: c.accent, width: `${first > 0 ? Math.max(pct(s.count, first), s.count > 0 ? 2 : 0) : 0}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RankList({ c, title, rows }: { c: Colors; title: string; rows: AnalyticsCount[] }) {
  const max = Math.max(1, ...rows.map(r => r.count))
  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 12 }}>{title}</div>
      {rows.length === 0 && <div style={{ fontSize: 12, color: c.muted }}>Sin datos todavía</div>}
      {rows.map(r => (
        <div key={r.label} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3, gap: 8 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
            <span style={{ color: c.muted, fontVariantNumeric: 'tabular-nums' }}>{r.count.toLocaleString('es-CO')}</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: c.border }}>
            <div style={{ height: 4, borderRadius: 2, background: c.accent, width: `${(r.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsPanel({ c }: { c: Colors }) {
  const [days, setDays] = useState<number>(30)
  const [data, setData] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFailed(false)
    analyticsApi.summary(days).then(res => {
      if (cancelled) return
      if (res) setData(res)
      else setFailed(true)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [days])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {RANGES.map(r => (
          <button key={r} onClick={() => setDays(r)} style={{
            padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${days === r ? c.accent : c.border}`,
            background: days === r ? c.accent : 'transparent', color: days === r ? '#111' : c.muted,
          }}>{r} días</button>
        ))}
        {loading && <span style={{ fontSize: 12, color: c.muted }}>Cargando...</span>}
      </div>

      {failed && <div style={{ color: '#E5534B', fontSize: 13 }}>No se pudo cargar la analítica.</div>}

      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <StatTile c={c} label="Visitantes únicos" value={data.visitors} />
            <StatTile c={c} label="Sesiones" value={data.sessions} />
            <StatTile c={c} label="Páginas vistas" value={data.pageviews} />
          </div>

          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Visitantes y sesiones por día</div>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <LineChart data={data.series} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid stroke={c.border} vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: c.muted, fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} minTickGap={24} />
                  <YAxis allowDecimals={false} tick={{ fill: c.muted, fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="visitors" name="Visitantes" stroke={c.accent} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="sessions" name="Sesiones" stroke={SESSIONS_COLOR} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
            {data.funnels.map(f => <Funnel key={f.key} c={c} funnel={f} />)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            <RankList c={c} title="Páginas más visitadas" rows={data.top_pages} />
            <RankList c={c} title="Fuentes de tráfico" rows={data.top_sources} />
            <RankList c={c} title="Dispositivos" rows={data.devices} />
          </div>
        </>
      )}
    </div>
  )
}
