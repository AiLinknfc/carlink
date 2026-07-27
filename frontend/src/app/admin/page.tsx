'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/store/auth'
import { useTheme } from '@/store/theme'
import { adminApi } from '@/lib/api'
import type { NfcTokenAdmin, NfcAlert, NfcWhitelistEntry, NfcTokenLimit, NfcStats } from '@/lib/types'

const STATUS_COLORS: Record<string, string> = {
  active: '#2ecc71',
  revoked: '#ff4d6a',
  expired: '#ff8a3d',
  lost: '#999',
}

export default function AdminPage() {
  const router = useRouter()
  const { user, profile, loading } = useAuth()
  const { isDark } = useTheme()
  const [tab, setTab] = useState<'dashboard' | 'tokens' | 'alerts' | 'whitelist' | 'limits'>('dashboard')
  const [stats, setStats] = useState<NfcStats | null>(null)
  const [tokens, setTokens] = useState<NfcTokenAdmin[]>([])
  const [alerts, setAlerts] = useState<NfcAlert[]>([])
  const [whitelist, setWhitelist] = useState<NfcWhitelistEntry[]>([])
  const [limits, setLimits] = useState<NfcTokenLimit[]>([])
  const [loading2, setLoading2] = useState(true)
  const [error, setError] = useState('')
  const [provisioned, setProvisioned] = useState<{ tag_uid: string; activation_code: string; token_url: string } | null>(null)

  const c = {
    bg: isDark ? '#0a0b0e' : '#f5f3ec',
    card: isDark ? '#111318' : '#fff',
    border: isDark ? 'rgba(245,197,24,0.15)' : 'rgba(17,17,17,0.08)',
    text: isDark ? '#f5f3ec' : '#17171a',
    muted: isDark ? '#777' : '#999',
    accent: '#F5C518',
  }

  useEffect(() => {
    if (!loading && (!user || user.id !== process.env.NEXT_PUBLIC_ADMIN_USER_ID)) {
      router.replace('/app')
    }
  }, [user, profile, loading, router])

  useEffect(() => {
    if (tab === 'dashboard') loadStats()
    else if (tab === 'tokens') loadTokens()
    else if (tab === 'alerts') loadAlerts()
    else if (tab === 'whitelist') loadWhitelist()
    else if (tab === 'limits') loadLimits()
  }, [tab])

  async function loadStats() {
    setLoading2(true)
    const s = await adminApi.stats()
    if (s) setStats(s)
    setLoading2(false)
  }
  async function loadTokens() {
    setLoading2(true)
    const t = await adminApi.listTokens()
    if (t) setTokens(t)
    setLoading2(false)
  }
  async function loadAlerts() {
    setLoading2(true)
    const a = await adminApi.listAlerts()
    if (a) setAlerts(a)
    setLoading2(false)
  }
  async function loadWhitelist() {
    setLoading2(true)
    const w = await adminApi.listWhitelist()
    if (w) setWhitelist(w)
    setLoading2(false)
  }
  async function loadLimits() {
    setLoading2(true)
    const l = await adminApi.listLimits()
    if (l) setLimits(l)
    setLoading2(false)
  }

  async function handleResolveAlert(id: string) {
    await adminApi.resolveAlert(id, true)
    loadAlerts()
  }

  async function handleRevokeToken(id: string) {
    await adminApi.revokeToken(id)
    loadTokens()
  }

  async function handleAddWhitelist() {
    const uid = prompt('UID del chip NFC:')
    if (!uid) return
    const label = prompt('Etiqueta (opcional):') || ''
    await adminApi.addToWhitelist(uid, label)
    loadWhitelist()
  }

  async function handleBulkWhitelist() {
    const raw = prompt('Pega UIDs separados por coma o salto de línea:')
    if (!raw) return
    const entries = raw.split(/[,\n]/).map(s => s.trim()).filter(Boolean).map(tag_uid => ({ tag_uid }))
    if (entries.length) {
      await adminApi.bulkWhitelist(entries)
      loadWhitelist()
    }
  }

  async function handleProvision() {
    const uid = prompt('UID del chip NFC a provisionar:')
    if (!uid) return
    const label = prompt('Etiqueta (opcional):') || ''
    const result = await adminApi.provisionWhitelist(uid, label)
    if (result) {
      setProvisioned(result)
      loadWhitelist()
    } else {
      setError('No se pudo provisionar el llavero (¿el UID ya existe?)')
    }
  }

  async function handleUpdateLimit(accountType: string, field: string, value: number) {
    await adminApi.updateLimit(accountType, { [field]: value })
    loadLimits()
  }

  if (loading || !user) return <div style={{ padding: 40, color: c.muted }}>Cargando...</div>

  const tabs = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'tokens', label: 'Tokens' },
    { key: 'alerts', label: `Alertas${stats && stats.unresolved_alerts > 0 ? ` (${stats.unresolved_alerts})` : ''}` },
    { key: 'whitelist', label: 'Whitelist' },
    { key: 'limits', label: 'Límites' },
  ] as const

  return (
    <div style={{ minHeight: '100vh', background: c.bg, color: c.text, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20, color: c.accent }}>Admin NFC</h1>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${c.border}`, paddingBottom: 8, flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background: tab === t.key ? c.accent : 'transparent',
              color: tab === t.key ? '#111' : c.muted,
              border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
            }}>{t.label}</button>
          ))}
        </div>

        {error && <div style={{ color: '#ff4d6a', marginBottom: 16, fontSize: 13 }}>{error}</div>}
        {loading2 && <div style={{ color: c.muted, fontSize: 13 }}>Cargando datos...</div>}

        {/* Dashboard */}
        {tab === 'dashboard' && stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
            {[
              { label: 'Tokens totales', value: stats.total_tokens },
              { label: 'Tokens activos', value: stats.active_tokens },
              { label: 'Escaneos hoy', value: stats.total_access_today },
              { label: 'Alertas totales', value: stats.total_alerts },
              { label: 'Sin resolver', value: stats.unresolved_alerts, color: stats.unresolved_alerts > 0 ? '#ff4d6a' : undefined },
              { label: 'Whitelist', value: stats.whitelist_count },
            ].map((item, i) => (
              <div key={i} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: item.color || c.accent }}>{item.value}</div>
                <div style={{ fontSize: 12, color: c.muted, marginTop: 4 }}>{item.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tokens */}
        {tab === 'tokens' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                  <th style={thStyle}>Prefijo</th>
                  <th style={thStyle}>Vehículo</th>
                  <th style={thStyle}>Usuario</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Tag UID</th>
                  <th style={thStyle}>Accesos</th>
                  <th style={thStyle}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map(t => (
                  <tr key={t.id} style={{ borderBottom: `1px solid ${c.border}` }}>
                    <td style={tdStyle}><code style={{ fontFamily: 'monospace', fontSize: 12 }}>{t.token_prefix}</code></td>
                    <td style={tdStyle}>{t.vehicle_plate} {t.vehicle_brand}</td>
                    <td style={tdStyle}>{t.user_name || t.user_email}</td>
                    <td style={tdStyle}>
                      <span style={{ color: STATUS_COLORS[t.status] || '#999', fontWeight: 600 }}>{t.status}</span>
                    </td>
                    <td style={tdStyle}><code style={{ fontSize: 11 }}>{t.tag_uid || '—'}</code></td>
                    <td style={tdStyle}>{t.access_count}</td>
                    <td style={tdStyle}>
                      {t.is_active && (
                        <button onClick={() => handleRevokeToken(t.id)} style={dangerBtnStyle}>Revocar</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tokens.length === 0 && !loading2 && <div style={{ color: c.muted, padding: 20, textAlign: 'center' }}>No hay tokens registrados</div>}
          </div>
        )}

        {/* Alerts */}
        {tab === 'alerts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {alerts.map(a => (
              <div key={a.id} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    <span style={{ color: a.severity === 'critical' ? '#ff4d6a' : a.severity === 'warning' ? '#ff8a3d' : c.accent }}>
                      {a.severity.toUpperCase()}
                    </span>
                    {' · '}{a.alert_type.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: 12, color: c.muted, marginTop: 4 }}>{a.message}</div>
                  <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{new Date(a.created_at).toLocaleString()}</div>
                </div>
                {!a.resolved && (
                  <button onClick={() => handleResolveAlert(a.id)} style={accentBtnStyle}>Resolver</button>
                )}
                {a.resolved && <span style={{ fontSize: 12, color: '#2ecc71' }}>Resuelta</span>}
              </div>
            ))}
            {alerts.length === 0 && !loading2 && <div style={{ color: c.muted, padding: 20, textAlign: 'center' }}>No hay alertas</div>}
          </div>
        )}

        {/* Whitelist */}
        {tab === 'whitelist' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <button onClick={handleProvision} style={accentBtnStyle}>+ Provisionar llavero</button>
              <button onClick={handleAddWhitelist} style={{ ...accentBtnStyle, background: 'transparent', color: c.accent, border: `1px solid ${c.accent}` }}>+ Agregar UID (sin token)</button>
              <button onClick={handleBulkWhitelist} style={{ ...accentBtnStyle, background: 'transparent', color: c.accent, border: `1px solid ${c.accent}` }}>Carga masiva</button>
            </div>

            {provisioned && (
              <div style={{ marginBottom: 16, padding: 16, borderRadius: 12, background: c.card, border: `2px solid ${c.accent}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c.accent }}>Llavero provisionado — guarda esto, no se vuelve a mostrar</div>
                  <button onClick={() => setProvisioned(null)} style={{ background: 'none', border: 'none', color: c.muted, cursor: 'pointer', fontSize: 16 }}>×</button>
                </div>
                <div style={{ fontSize: 12, color: c.muted, marginBottom: 4 }}>Tag UID: <code>{provisioned.tag_uid}</code></div>
                <div style={{ fontSize: 12, color: c.muted, marginBottom: 4 }}>
                  Código de activación (imprimir en el empaque): <b style={{ fontSize: 16, letterSpacing: '.1em', color: c.text }}>{provisioned.activation_code}</b>
                </div>
                <div style={{ fontSize: 12, color: c.muted }}>URL a grabar en el chip: <code style={{ fontSize: 11 }}>{provisioned.token_url}</code></div>
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                    <th style={thStyle}>UID</th>
                    <th style={thStyle}>Etiqueta</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Reclamado por</th>
                    <th style={thStyle}>Fecha</th>
                    <th style={thStyle}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {whitelist.map(w => (
                    <tr key={w.id} style={{ borderBottom: `1px solid ${c.border}` }}>
                      <td style={tdStyle}><code style={{ fontFamily: 'monospace', fontSize: 12 }}>{w.tag_uid}</code></td>
                      <td style={tdStyle}>{w.label || '—'}</td>
                      <td style={tdStyle}>
                        <span style={{ color: w.status === 'claimed' ? '#2ecc71' : w.status === 'blocked' ? '#ff4d6a' : c.muted, fontWeight: 600 }}>{w.status}</span>
                      </td>
                      <td style={tdStyle}>{w.claimed_by_name || w.claimed_by_email || '—'}</td>
                      <td style={tdStyle}>{new Date(w.created_at).toLocaleDateString()}</td>
                      <td style={tdStyle}>
                        {w.status !== 'claimed' && (
                          <button onClick={async () => { await adminApi.removeFromWhitelist(w.id); loadWhitelist() }} style={dangerBtnStyle}>Eliminar</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {whitelist.length === 0 && !loading2 && <div style={{ color: c.muted, padding: 20, textAlign: 'center' }}>Whitelist vacía</div>}
          </div>
        )}

        {/* Limits */}
        {tab === 'limits' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {limits.map(l => (
              <div key={l.id} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, textTransform: 'capitalize' }}>{l.account_type}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {[
                    { field: 'max_tokens_per_vehicle', label: 'Máx tokens/vehículo', value: l.max_tokens_per_vehicle },
                    { field: 'max_daily_access', label: 'Máx accesos/día', value: l.max_daily_access },
                    { field: 'max_unique_ips_24h', label: 'Máx IPs/24h', value: l.max_unique_ips_24h },
                  ].map(item => (
                    <div key={item.field}>
                      <label style={{ fontSize: 12, color: c.muted, display: 'block', marginBottom: 4 }}>{item.label}</label>
                      <input type="number" defaultValue={item.value} onBlur={e => {
                        const v = parseInt(e.target.value)
                        if (!isNaN(v) && v !== item.value) handleUpdateLimit(l.account_type, item.field, v)
                      }} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.text, fontSize: 14 }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {limits.length === 0 && !loading2 && <div style={{ color: c.muted, padding: 20, textAlign: 'center' }}>No hay límites configurados</div>}
          </div>
        )}
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = { textAlign: 'left', padding: '8px 12px', fontWeight: 600, fontSize: 12, color: '#999' }
const tdStyle: React.CSSProperties = { padding: '10px 12px' }
const accentBtnStyle: React.CSSProperties = { background: '#F5C518', color: '#111', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }
const dangerBtnStyle: React.CSSProperties = { background: 'transparent', color: '#ff4d6a', border: '1px solid #ff4d6a', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }
