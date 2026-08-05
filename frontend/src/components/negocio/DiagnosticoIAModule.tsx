'use client'

import { useState } from 'react'
import { workshopApi } from '@/lib/api'
import type { AiDiagnoseResult } from '@/lib/types'
import { negocioTokens, inputStyle, labelStyle, primaryBtnStyle, money } from './shared'

export default function DiagnosticoIAModule({ theme }: { theme: 'light' | 'dark' }) {
  const t = negocioTokens(theme)
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [mileage, setMileage] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AiDiagnoseResult | null>(null)
  const [error, setError] = useState('')

  const diagnose = async () => {
    if (!symptoms.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    const data = await workshopApi.aiDiagnose({
      vehicle_brand: brand, vehicle_model: model,
      vehicle_year: year ? Number(year) : undefined,
      vehicle_mileage: mileage ? Number(mileage) : undefined,
      symptoms,
    })
    setLoading(false)
    if (data) setResult(data)
    else setError('No se pudo generar el diagnóstico. Verifica que la IA esté configurada en el servidor e intenta de nuevo.')
  }

  return (
    <div style={{ animation: 'sectionIn .4s both', display: 'grid', gridTemplateColumns: 'minmax(280px,380px) 1fr', gap: 20, alignItems: 'start' }}>
      <div style={{ padding: 20, borderRadius: 16, background: t.cardBg, border: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: t.gold, fontWeight: 700 }}>Datos del vehículo</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={labelStyle(t)}>Marca</label><input style={inputStyle(t)} value={brand} onChange={e => setBrand(e.target.value)} /></div>
          <div><label style={labelStyle(t)}>Modelo</label><input style={inputStyle(t)} value={model} onChange={e => setModel(e.target.value)} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={labelStyle(t)}>Año</label><input type="number" style={inputStyle(t)} value={year} onChange={e => setYear(e.target.value)} /></div>
          <div><label style={labelStyle(t)}>Kilometraje</label><input type="number" style={inputStyle(t)} value={mileage} onChange={e => setMileage(e.target.value)} /></div>
        </div>
        <div>
          <label style={labelStyle(t)}>Síntomas / falla reportada</label>
          <textarea rows={5} style={{ ...inputStyle(t), resize: 'vertical' }} value={symptoms} onChange={e => setSymptoms(e.target.value)} placeholder="Ej. Ruido metálico al frenar, se siente vibración en el pedal…" />
        </div>
        <button onClick={diagnose} disabled={loading || !symptoms.trim()} style={primaryBtnStyle(t, loading || !symptoms.trim())}>
          {loading ? 'Analizando…' : 'Generar diagnóstico'}
        </button>
        {error && <div style={{ color: t.danger, fontSize: 12.5 }}>{error}</div>}
        <div style={{ fontSize: 11, color: t.textMuted, lineHeight: 1.5 }}>
          Diagnóstico preliminar generado por IA — es solo una referencia para el mecánico, no reemplaza la inspección real.
        </div>
      </div>

      <div>
        {!result && !loading && (
          <div style={{ textAlign: 'center', padding: 60, color: t.textMuted, fontSize: 14, border: `1px dashed ${t.subtleBorder}`, borderRadius: 16 }}>
            El diagnóstico aparecerá aquí
          </div>
        )}
        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: t.textMuted, fontSize: 14 }}>Consultando IA…</div>
        )}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: 20, borderRadius: 16, background: 'linear-gradient(155deg,#1c1708,#141414)', border: '1px solid rgba(245,197,24,0.24)' }}>
              <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: t.gold, fontWeight: 700, marginBottom: 8 }}>Resumen</div>
              <div style={{ fontSize: 14, color: '#f5f3ec', lineHeight: 1.6 }}>{result.diagnostic_summary}</div>
            </div>

            {result.possible_causes?.length > 0 && (
              <div style={{ padding: 18, borderRadius: 14, background: t.cardBg, border: `1px solid ${t.border}` }}>
                <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: t.gold, fontWeight: 700, marginBottom: 8 }}>Posibles causas</div>
                <ul style={{ margin: 0, paddingLeft: 18, color: t.textPrimary, fontSize: 13, lineHeight: 1.8 }}>
                  {result.possible_causes.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}

            {result.recommended_labor?.length > 0 && (
              <div style={{ padding: 18, borderRadius: 14, background: t.cardBg, border: `1px solid ${t.border}` }}>
                <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: t.gold, fontWeight: 700, marginBottom: 8 }}>Mano de obra sugerida</div>
                {result.recommended_labor.map((l, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: t.textPrimary, padding: '6px 0', borderTop: i > 0 ? `1px solid ${t.subtleBorder}` : 'none' }}>
                    <span>{l.description}</span>
                    <span style={{ color: t.textMuted }}>{l.estimated_hours}h · {money(l.suggested_rate_per_hour)}/h</span>
                  </div>
                ))}
              </div>
            )}

            {result.recommended_parts?.length > 0 && (
              <div style={{ padding: 18, borderRadius: 14, background: t.cardBg, border: `1px solid ${t.border}` }}>
                <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: t.gold, fontWeight: 700, marginBottom: 8 }}>Repuestos sugeridos</div>
                {result.recommended_parts.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: t.textPrimary, padding: '6px 0', borderTop: i > 0 ? `1px solid ${t.subtleBorder}` : 'none' }}>
                    <span>{p.part_name} <span style={{ color: t.warning, fontSize: 11 }}>({p.urgency})</span></span>
                    <span style={{ color: t.textMuted }}>{money(p.estimated_cost)}</span>
                  </div>
                ))}
              </div>
            )}

            {result.technical_notes && (
              <div style={{ padding: 18, borderRadius: 14, background: t.cardBg, border: `1px solid ${t.border}` }}>
                <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: t.gold, fontWeight: 700, marginBottom: 8 }}>Notas técnicas</div>
                <div style={{ fontSize: 13, color: t.textPrimary, lineHeight: 1.6 }}>{result.technical_notes}</div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderRadius: 14, background: 'rgba(245,197,24,0.08)', border: `1px solid ${t.border}` }}>
              <span style={{ fontSize: 13, color: t.textMuted }}>Costo total estimado</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: t.gold }}>{money(result.estimated_total_cost)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
