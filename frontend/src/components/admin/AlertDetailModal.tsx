'use client'

import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/api'

type Palette = { bg: string; card: string; border: string; text: string; muted: string; accent: string }

interface Detail {
  alert: { id: string; alert_type: string; severity: string; message: string | null; resolved: boolean; created_at: string }
  recommendation: string
  token: { id: string; prefix: string; is_active: boolean; status: string; access_count: number; last_accessed_at: string | null; tag_uid: string } | null
  owner: { name: string; email: string } | null
  vehicle: { plate: string; brand: string; model: string } | null
  scans_24h: number
  distinct_ips_24h: number
  recent_scans: { at: string; ip: string; city: string; country: string; user_agent: string }[]
}

/* Detalle de una alerta NFC para decidir sin salir de ella: quién es el dueño, qué llavero y
   vehículo, cómo se ha leído, qué se recomienda, y dos acciones simples: pausar/reactivar las
   lecturas de ese llavero y resolver (descartar). Abrirla la marca como vista (lo hace el backend). */
export default function AlertDetailModal({ alertId, c, onClose, onChanged }: { alertId: string; c: Palette; onClose: () => void; onChanged: () => void }) {
  const [d, setD] = useState<Detail | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function load() {
    const r = await adminApi.alertDetail(alertId)
    if (r) setD(r as Detail); else setErr('No se pudo cargar la alerta.')
  }
  useEffect(() => { void load(); onChanged() /* ya quedó vista */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertId])

  async function togglePause() {
    if (!d?.token) return
    const pausing = d.token.is_active
    if (pausing && !window.confirm('Pausar las lecturas de este llavero: quien lo escanee verá que no está disponible hasta que lo reactives. ¿Continuar?')) return
    setBusy(true)
    await adminApi.updateToken(d.token.id, { is_active: !pausing })
    await load(); setBusy(false); onChanged()
  }
  async function resolve() {
    setBusy(true)
    await adminApi.resolveAlert(alertId, true)
    setBusy(false); onChanged(); onClose()
  }

  const sevColor = d?.alert.severity === 'critical' ? '#ff4d6a' : d?.alert.severity === 'warning' ? '#ff8a3d' : c.accent
  const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, padding: '4px 0' }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: c.card, color: c.text, border: `1px solid ${c.border}`, borderRadius: 14, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 20 }}>
        {!d ? <div style={{ color: c.muted, padding: 20, textAlign: 'center' }}>{err || 'Cargando...'}</div> : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: sevColor }}>{d.alert.severity.toUpperCase()}</div>
                <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>{d.alert.alert_type.replace(/_/g, ' ')}</div>
                <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>{new Date(d.alert.created_at).toLocaleString('es-CO')}</div>
              </div>
              <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', color: c.muted, fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            {d.alert.message && <div style={{ fontSize: 13, color: c.muted, marginTop: 10 }}>{d.alert.message}</div>}

            <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.25)', fontSize: 13, lineHeight: 1.55 }}>
              <strong>Qué hacer:</strong> {d.recommendation}
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={row}><span style={{ color: c.muted }}>Dueño</span><span>{d.owner ? <>{d.owner.name || 'Sin nombre'} · <a href={`mailto:${d.owner.email}`} style={{ color: c.accent }}>{d.owner.email}</a></> : 'Sin datos'}</span></div>
              <div style={row}><span style={{ color: c.muted }}>Vehículo</span><span>{d.vehicle ? `${d.vehicle.plate} · ${d.vehicle.brand} ${d.vehicle.model}` : 'Sin datos'}</span></div>
              {d.token && <>
                <div style={row}><span style={{ color: c.muted }}>Llavero</span><span>{d.token.prefix} · {d.token.is_active ? 'activo' : 'PAUSADO'} ({d.token.status})</span></div>
                <div style={row}><span style={{ color: c.muted }}>Lecturas totales</span><span>{d.token.access_count}</span></div>
              </>}
              <div style={row}><span style={{ color: c.muted }}>Últimas 24 h</span><span>{d.scans_24h} lecturas · {d.distinct_ips_24h} conexiones distintas</span></div>
            </div>

            {d.recent_scans.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: c.muted, marginBottom: 4 }}>Últimas lecturas</div>
                <div style={{ maxHeight: 180, overflowY: 'auto', border: `1px solid ${c.border}`, borderRadius: 8 }}>
                  {d.recent_scans.map((s, i) => (
                    <div key={i} style={{ fontSize: 11.5, padding: '6px 10px', borderBottom: i < d.recent_scans.length - 1 ? `1px solid ${c.border}` : 'none', display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <span>{new Date(s.at).toLocaleString('es-CO')}</span>
                      <span style={{ color: c.muted }}>{s.ip || 's/ip'}{s.city ? ` · ${s.city}` : ''}{s.country ? ` ${s.country}` : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
              {d.token && (
                <button disabled={busy} onClick={togglePause} style={{ background: 'transparent', color: d.token.is_active ? '#ff4d6a' : c.text, border: `1px solid ${d.token.is_active ? '#ff4d6a' : c.border}`, borderRadius: 8, padding: '9px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  {d.token.is_active ? 'Pausar lecturas del llavero' : 'Reactivar lecturas'}
                </button>
              )}
              {!d.alert.resolved && (
                <button disabled={busy} onClick={resolve} style={{ background: '#F5C518', color: '#111', border: 'none', borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700, marginLeft: 'auto' }}>
                  Resolver (ya lo revisé)
                </button>
              )}
            </div>
            <div style={{ fontSize: 11, color: c.muted, marginTop: 10 }}>La app no pausa nada por sí sola: las alertas avisan, tú decides. Al resolver, la alerta desaparece de la lista.</div>
          </>
        )}
      </div>
    </div>
  )
}
