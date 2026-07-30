'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/store/auth'
import { useTheme } from '@/store/theme'
import { adminApi, jobApplicationApi, type JobApplication } from '@/lib/api'
import type { NfcTokenAdmin, NfcAlert, NfcWhitelistEntry, NfcTokenLimit, NfcStats, NfcTagInventoryEntry, NfcTagInventoryCreate } from '@/lib/types'
import QrCodePanel from '@/components/QrCodePanel'
import AdminModal, { adminModalStyles as s } from '@/components/admin/AdminModal'

const STATUS_COLORS: Record<string, string> = {
  active: '#2ecc71',
  revoked: '#ff4d6a',
  expired: '#ff8a3d',
  lost: '#999',
}

// Mirrors the export columns of common NFC reader apps (e.g. "NFC Tools") so
// a table copied straight from one can be pasted in without reshaping.
const INVENTORY_FIELDS: { key: keyof NfcTagInventoryCreate; label: string; aliases: string[] }[] = [
  { key: 'tag_type', label: 'Tipo de etiqueta', aliases: ['tipo de etiqueta'] },
  { key: 'technologies', label: 'Tecnologías posibles', aliases: ['tecnologias posibles'] },
  { key: 'serial_number', label: 'Número de serie', aliases: ['numero de serie', 'serie', 'uid'] },
  { key: 'atqa', label: 'ATQA', aliases: ['atqa'] },
  { key: 'sak', label: 'SAK', aliases: ['sak'] },
  { key: 'signature', label: 'Firma', aliases: ['firma'] },
  { key: 'password_protected', label: 'Protegido por contraseña', aliases: ['protegido por contrasena'] },
  { key: 'memory_info', label: 'Información de memoria', aliases: ['informacion de memoria'] },
  { key: 'data_format', label: 'Formato de los datos', aliases: ['formato de los datos'] },
  { key: 'size_info', label: 'Tamaño', aliases: ['tamano'] },
  { key: 'writable', label: 'Escritura posible', aliases: ['escritura posible'] },
  { key: 'read_only', label: 'Sólo lectura posible', aliases: ['solo lectura posible'] },
  { key: 'tag_content', label: 'Etiqueta vacía / contenido escrito', aliases: ['etiqueta vacia'] },
  { key: 'tag_password', label: 'Password', aliases: ['password'] },
  { key: 'tag_created_date', label: 'Fecha de creación', aliases: ['fecha de creacion'] },
  { key: 'description', label: 'Descripción', aliases: ['descripcion'] },
]

const normalizeHeader = (h: string) => h.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

// Spreadsheets paste as tab-separated; plain aligned text (e.g. copied from
// a chat) tends to use runs of spaces instead — support both.
const splitRow = (line: string) => (line.includes('\t') ? line.split('\t') : line.split(/\s{2,}/))

function parseInventoryPaste(raw: string): NfcTagInventoryCreate[] {
  const lines = raw.split(/\r?\n/).map(l => l.trimEnd()).filter(l => l.trim().length > 0)
  if (lines.length < 2) return []
  const headerCells = splitRow(lines[0]).map(normalizeHeader)
  const colMap = headerCells.map(h => INVENTORY_FIELDS.find(f => f.aliases.includes(h))?.key || null)
  return lines.slice(1).map(line => {
    const cells = splitRow(line)
    const entry: NfcTagInventoryCreate = {}
    colMap.forEach((key, i) => {
      if (key && cells[i] !== undefined && cells[i].trim()) (entry as any)[key] = cells[i].trim()
    })
    return entry
  }).filter(e => Object.keys(e).length > 0)
}

const emptyInventoryForm = (): NfcTagInventoryCreate => ({
  tag_type: '', technologies: '', serial_number: '', atqa: '', sak: '', signature: '',
  password_protected: '', memory_info: '', data_format: '', size_info: '', writable: '',
  read_only: '', tag_content: '', tag_password: '', tag_created_date: '', description: '',
})

export default function AdminPage() {
  const router = useRouter()
  const { user, profile, loading } = useAuth()
  const { isDark } = useTheme()
  const [tab, setTab] = useState<'dashboard' | 'tokens' | 'alerts' | 'whitelist' | 'inventory' | 'limits'>('dashboard')
  const [stats, setStats] = useState<NfcStats | null>(null)
  const [tokens, setTokens] = useState<NfcTokenAdmin[]>([])
  const [alerts, setAlerts] = useState<NfcAlert[]>([])
  const [whitelist, setWhitelist] = useState<NfcWhitelistEntry[]>([])
  const [limits, setLimits] = useState<NfcTokenLimit[]>([])
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([])
  const [showJobsDropdown, setShowJobsDropdown] = useState(false)
  const [loading2, setLoading2] = useState(true)
  const [error, setError] = useState('')
  const [provisioned, setProvisioned] = useState<{ tag_uid: string; activation_code: string; token_url: string; qr_url: string } | null>(null)
  const [qrModalUrl, setQrModalUrl] = useState<string | null>(null)
  const jobsRef = useRef<HTMLDivElement>(null)

  const [provisionModal, setProvisionModal] = useState(false)
  const [provisionUid, setProvisionUid] = useState('')
  const [provisionLabel, setProvisionLabel] = useState('')
  const [provisionSubmitting, setProvisionSubmitting] = useState(false)

  const [addModal, setAddModal] = useState(false)
  const [addUid, setAddUid] = useState('')
  const [addLabel, setAddLabel] = useState('')
  const [addSubmitting, setAddSubmitting] = useState(false)

  const [bulkModal, setBulkModal] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkSubmitting, setBulkSubmitting] = useState(false)

  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)

  const [inventory, setInventory] = useState<NfcTagInventoryEntry[]>([])
  const [inventoryModal, setInventoryModal] = useState(false)
  const [inventoryForm, setInventoryForm] = useState<NfcTagInventoryCreate>(emptyInventoryForm())
  const [inventorySubmitting, setInventorySubmitting] = useState(false)
  const [inventoryBulkModal, setInventoryBulkModal] = useState(false)
  const [inventoryBulkText, setInventoryBulkText] = useState('')
  const [inventoryBulkSubmitting, setInventoryBulkSubmitting] = useState(false)

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
    else if (tab === 'inventory') loadInventory()
    else if (tab === 'limits') loadLimits()
  }, [tab])

  useEffect(() => {
    if (!loading && user && user.id === process.env.NEXT_PUBLIC_ADMIN_USER_ID) {
      loadJobApplications()
    }
  }, [user, loading])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (jobsRef.current && !jobsRef.current.contains(e.target as Node)) {
        setShowJobsDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
  async function loadInventory() {
    setLoading2(true)
    const inv = await adminApi.listInventory()
    if (inv) setInventory(inv)
    setLoading2(false)
  }

  async function loadJobApplications() {
    const list = await jobApplicationApi.list()
    if (list) setJobApplications(list)
  }

  async function markAsReviewed(id: string) {
    await jobApplicationApi.updateStatus(id, 'reviewed')
    loadJobApplications()
  }

  async function handleResolveAlert(id: string) {
    await adminApi.resolveAlert(id, true)
    loadAlerts()
  }

  function handleRevokeToken(id: string) {
    setConfirmModal({
      message: 'Se revocará este token. El llavero dejará de funcionar hasta que el usuario active uno nuevo.',
      onConfirm: async () => {
        await adminApi.revokeToken(id)
        setConfirmModal(null)
        loadTokens()
      },
    })
  }

  function handleAddWhitelist() {
    setAddUid('')
    setAddLabel('')
    setAddModal(true)
  }

  async function submitAddWhitelist() {
    if (!addUid.trim()) return
    setAddSubmitting(true)
    await adminApi.addToWhitelist(addUid.trim(), addLabel.trim())
    setAddSubmitting(false)
    setAddModal(false)
    loadWhitelist()
  }

  function handleBulkWhitelist() {
    setBulkText('')
    setBulkModal(true)
  }

  async function submitBulkWhitelist() {
    const entries = bulkText.split(/[,\n]/).map(x => x.trim()).filter(Boolean).map(tag_uid => ({ tag_uid }))
    if (!entries.length) return
    setBulkSubmitting(true)
    await adminApi.bulkWhitelist(entries)
    setBulkSubmitting(false)
    setBulkModal(false)
    loadWhitelist()
  }

  function handleProvision() {
    setProvisionUid('')
    setProvisionLabel('')
    setError('')
    setProvisionModal(true)
  }

  async function submitProvision() {
    if (!provisionUid.trim()) return
    setProvisionSubmitting(true)
    const result = await adminApi.provisionWhitelist(provisionUid.trim(), provisionLabel.trim())
    setProvisionSubmitting(false)
    if (result) {
      setProvisioned(result)
      setProvisionModal(false)
      loadWhitelist()
    } else {
      setError('No se pudo provisionar el llavero (¿el UID ya existe?)')
      setProvisionModal(false)
    }
  }

  function handleRemoveWhitelist(id: string, tagUid: string) {
    setConfirmModal({
      message: `Se eliminará el UID ${tagUid} de la whitelist. Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        await adminApi.removeFromWhitelist(id)
        setConfirmModal(null)
        loadWhitelist()
      },
    })
  }

  async function handleUpdateLimit(accountType: string, field: string, value: number) {
    await adminApi.updateLimit(accountType, { [field]: value })
    loadLimits()
  }

  function handleAddInventory() {
    setInventoryForm(emptyInventoryForm())
    setInventoryModal(true)
  }

  async function submitAddInventory() {
    setInventorySubmitting(true)
    await adminApi.createInventory(inventoryForm)
    setInventorySubmitting(false)
    setInventoryModal(false)
    loadInventory()
  }

  function handleBulkInventory() {
    setInventoryBulkText('')
    setInventoryBulkModal(true)
  }

  async function submitBulkInventory() {
    const entries = parseInventoryPaste(inventoryBulkText)
    if (!entries.length) return
    setInventoryBulkSubmitting(true)
    await adminApi.bulkCreateInventory(entries)
    setInventoryBulkSubmitting(false)
    setInventoryBulkModal(false)
    loadInventory()
  }

  function handleDeleteInventory(id: string, description: string) {
    setConfirmModal({
      message: `Se eliminará el registro "${description || 'sin descripción'}" del inventario. Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        await adminApi.deleteInventory(id)
        setConfirmModal(null)
        loadInventory()
      },
    })
  }

  if (loading || !user) return <div style={{ padding: 40, color: c.muted }}>Cargando...</div>

  const tabs = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'tokens', label: 'Tokens' },
    { key: 'alerts', label: `Alertas${stats && stats.unresolved_alerts > 0 ? ` (${stats.unresolved_alerts})` : ''}` },
    { key: 'whitelist', label: 'Whitelist' },
    { key: 'inventory', label: `Inventario${inventory.length ? ` (${inventory.length})` : ''}` },
    { key: 'limits', label: 'Límites' },
  ] as const

  return (
    <div style={{ minHeight: '100vh', background: c.bg, color: c.text, fontFamily: 'var(--font-ui)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={() => router.push('/app')} title="Volver al panel"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: `1px solid ${c.border}`, background: c.card, color: c.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
              Volver al panel
            </button>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: c.accent, margin: 0 }}>Admin NFC</h1>
          </div>

          {/* Bell notification */}
          <div ref={jobsRef} style={{ position: 'relative' }}>
            <button onClick={() => setShowJobsDropdown(prev => !prev)} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c.text} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {jobApplications.filter(j => j.status === 'new').length > 0 && (
                <span style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: '#ff4d6a', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                  {jobApplications.filter(j => j.status === 'new').length}
                </span>
              )}
            </button>

            {showJobsDropdown && (
              <div style={{ position: 'absolute', top: '100%', right: 0, width: 340, maxHeight: 400, overflowY: 'auto', background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.24)', zIndex: 50, marginTop: 8 }}>
                <div style={{ padding: '12px 14px', borderBottom: `1px solid ${c.border}`, fontSize: 13, fontWeight: 700, color: c.accent }}>Postulaciones</div>
                {jobApplications.length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', color: c.muted, fontSize: 13 }}>No hay postulaciones aún</div>
                )}
                {jobApplications.map(j => (
                  <div key={j.id} style={{ padding: '12px 14px', borderBottom: `1px solid ${c.border}`, background: j.status === 'new' ? 'rgba(245,197,24,0.04)' : 'transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{j.full_name}</div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: j.status === 'new' ? 'rgba(245,197,24,0.14)' : 'rgba(0,0,0,0.05)', color: j.status === 'new' ? '#F5C518' : c.muted }}>
                        {j.status === 'new' ? 'Nueva' : 'Revisada'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: c.muted }}>{j.email} · {j.area}</div>
                    {j.offer_title && <div style={{ fontSize: 11, color: c.accent, marginTop: 2 }}>{j.offer_title}</div>}
                    {j.status === 'new' && (
                      <button onClick={() => markAsReviewed(j.id)} style={{ marginTop: 6, fontSize: 11, padding: '4px 10px', borderRadius: 6, border: `1px solid ${c.border}`, background: 'transparent', color: c.muted, cursor: 'pointer' }}>Marcar revisada</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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
                <div style={{ fontSize: 12, color: c.muted, marginBottom: 8 }}>URL a grabar en el chip: <code style={{ fontSize: 11 }}>{provisioned.token_url}</code></div>
                <button onClick={() => setQrModalUrl(provisioned.qr_url)} style={{ ...accentBtnStyle, background: 'transparent', color: c.accent, border: `1px solid ${c.accent}` }}>Ver QR para imprimir</button>
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
                      <td style={{ ...tdStyle, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {w.qr_url && (
                          <button onClick={() => setQrModalUrl(w.qr_url)} style={{ ...accentBtnStyle, padding: '5px 10px', fontSize: 12, background: 'transparent', color: c.accent, border: `1px solid ${c.accent}` }}>Ver QR</button>
                        )}
                        {w.status !== 'claimed' && (
                          <button onClick={() => handleRemoveWhitelist(w.id, w.tag_uid)} style={dangerBtnStyle}>Eliminar</button>
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

        {/* Inventory — raw scan metadata per physical keychain, separate from the whitelist/activation flow */}
        {tab === 'inventory' && (
          <div>
            <p style={{ fontSize: 12.5, color: c.muted, margin: '0 0 16px', lineHeight: 1.55, maxWidth: 640 }}>
              Registro de metadatos leídos con un lector NFC de cada llavero físico — hoy es manual, pensado para automatizarse más adelante. Es independiente de la whitelist de activación.
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <button onClick={handleAddInventory} style={accentBtnStyle}>+ Registrar llavero escaneado</button>
              <button onClick={handleBulkInventory} style={{ ...accentBtnStyle, background: 'transparent', color: c.accent, border: `1px solid ${c.accent}` }}>Pegar tabla</button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                    <th style={thStyle}>Tipo de etiqueta</th>
                    <th style={thStyle}>Número de serie</th>
                    <th style={thStyle}>Firma</th>
                    <th style={thStyle}>Protegida</th>
                    <th style={thStyle}>Tamaño</th>
                    <th style={thStyle}>Fecha</th>
                    <th style={thStyle}>Descripción</th>
                    <th style={thStyle}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map(inv => (
                    <tr key={inv.id} style={{ borderBottom: `1px solid ${c.border}` }}>
                      <td style={tdStyle}>{inv.tag_type || '—'}</td>
                      <td style={tdStyle}><code style={{ fontFamily: 'monospace', fontSize: 11 }}>{inv.serial_number || '—'}</code></td>
                      <td style={tdStyle}>{inv.signature || '—'}</td>
                      <td style={tdStyle}>{inv.password_protected || '—'}</td>
                      <td style={tdStyle}>{inv.size_info || '—'}</td>
                      <td style={tdStyle}>{inv.tag_created_date || '—'}</td>
                      <td style={tdStyle}>{inv.description || '—'}</td>
                      <td style={tdStyle}>
                        <button onClick={() => handleDeleteInventory(inv.id, inv.description || '')} style={dangerBtnStyle}>Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {inventory.length === 0 && !loading2 && <div style={{ color: c.muted, padding: 20, textAlign: 'center' }}>Sin llaveros registrados</div>}
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

      <QrCodePanel isOpen={!!qrModalUrl} onClose={() => setQrModalUrl(null)} theme={isDark ? 'dark' : 'light'} qrUrl={qrModalUrl} />

      <AdminModal isOpen={provisionModal} onClose={() => setProvisionModal(false)} theme={isDark ? 'dark' : 'light'}
        title="Provisionar llavero" subtitle="Genera el token y el código de activación para un chip nuevo."
        footer={<>
          <button onClick={() => setProvisionModal(false)} style={s.ghostBtn(isDark)}>Cancelar</button>
          <button onClick={submitProvision} disabled={provisionSubmitting || !provisionUid.trim()} style={s.primaryBtn(provisionSubmitting || !provisionUid.trim())}>{provisionSubmitting ? 'Provisionando…' : 'Provisionar'}</button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={s.label(isDark)}>UID del chip NFC</label>
          <input autoFocus value={provisionUid} onChange={e => setProvisionUid(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !provisionSubmitting) submitProvision() }}
            placeholder="04:C9:C8:5C:C1:2A:81" style={s.input(isDark)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={s.label(isDark)}>Etiqueta (opcional)</label>
          <input value={provisionLabel} onChange={e => setProvisionLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !provisionSubmitting) submitProvision() }}
            placeholder="Ej. Lote agosto 2026" style={s.input(isDark)} />
        </div>
      </AdminModal>

      <AdminModal isOpen={addModal} onClose={() => setAddModal(false)} theme={isDark ? 'dark' : 'light'}
        title="Agregar UID a la whitelist" subtitle="Solo registra el UID para rastreo anti-clonación — no genera token ni código de activación."
        footer={<>
          <button onClick={() => setAddModal(false)} style={s.ghostBtn(isDark)}>Cancelar</button>
          <button onClick={submitAddWhitelist} disabled={addSubmitting || !addUid.trim()} style={s.primaryBtn(addSubmitting || !addUid.trim())}>{addSubmitting ? 'Agregando…' : 'Agregar'}</button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={s.label(isDark)}>UID del chip NFC</label>
          <input autoFocus value={addUid} onChange={e => setAddUid(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !addSubmitting) submitAddWhitelist() }}
            placeholder="04:C9:C8:5C:C1:2A:81" style={s.input(isDark)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={s.label(isDark)}>Etiqueta (opcional)</label>
          <input value={addLabel} onChange={e => setAddLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !addSubmitting) submitAddWhitelist() }}
            style={s.input(isDark)} />
        </div>
      </AdminModal>

      <AdminModal isOpen={bulkModal} onClose={() => setBulkModal(false)} theme={isDark ? 'dark' : 'light'}
        title="Carga masiva de UIDs" subtitle="Un UID por línea, o separados por coma."
        footer={<>
          <button onClick={() => setBulkModal(false)} style={s.ghostBtn(isDark)}>Cancelar</button>
          <button onClick={submitBulkWhitelist} disabled={bulkSubmitting || !bulkText.trim()} style={s.primaryBtn(bulkSubmitting || !bulkText.trim())}>{bulkSubmitting ? 'Cargando…' : 'Cargar'}</button>
        </>}>
        <textarea autoFocus rows={8} value={bulkText} onChange={e => setBulkText(e.target.value)}
          placeholder={'04:C9:C8:5C:C1:2A:81\n04:C9:C8:5C:C1:2A:82\n...'}
          style={{ ...s.input(isDark), resize: 'vertical', fontFamily: 'monospace', lineHeight: 1.6 }} />
      </AdminModal>

      <AdminModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} theme={isDark ? 'dark' : 'light'}
        title="¿Confirmar acción?" maxWidth={380}
        footer={<>
          <button onClick={() => setConfirmModal(null)} style={s.ghostBtn(isDark)}>Cancelar</button>
          <button onClick={() => confirmModal?.onConfirm()} style={s.dangerBtn()}>Confirmar</button>
        </>}>
        <p style={{ fontSize: 13.5, lineHeight: 1.55, color: isDark ? '#c9c6ba' : '#3a362d', margin: 0 }}>{confirmModal?.message}</p>
      </AdminModal>

      <AdminModal isOpen={inventoryModal} onClose={() => setInventoryModal(false)} theme={isDark ? 'dark' : 'light'} maxWidth={680}
        title="Registrar llavero escaneado" subtitle="Metadatos leídos con el lector NFC — igual que los exporta la app de escaneo."
        footer={<>
          <button onClick={() => setInventoryModal(false)} style={s.ghostBtn(isDark)}>Cancelar</button>
          <button onClick={submitAddInventory} disabled={inventorySubmitting} style={s.primaryBtn(inventorySubmitting)}>{inventorySubmitting ? 'Guardando…' : 'Guardar'}</button>
        </>}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {INVENTORY_FIELDS.map(f => (
            <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={s.label(isDark)}>{f.label}</label>
              <input value={(inventoryForm as any)[f.key] || ''}
                onChange={e => setInventoryForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                style={s.input(isDark)} />
            </div>
          ))}
        </div>
      </AdminModal>

      <AdminModal isOpen={inventoryBulkModal} onClose={() => setInventoryBulkModal(false)} theme={isDark ? 'dark' : 'light'} maxWidth={640}
        title="Pegar tabla de llaveros" subtitle="Pega la tabla completa (con encabezados) copiada de tu hoja de cálculo o de la app de escaneo."
        footer={<>
          <span style={{ fontSize: 12, color: isDark ? '#7c786e' : '#7a756a', marginRight: 'auto', alignSelf: 'center' }}>
            {parseInventoryPaste(inventoryBulkText).length} fila(s) detectada(s)
          </span>
          <button onClick={() => setInventoryBulkModal(false)} style={s.ghostBtn(isDark)}>Cancelar</button>
          <button onClick={submitBulkInventory} disabled={inventoryBulkSubmitting || parseInventoryPaste(inventoryBulkText).length === 0} style={s.primaryBtn(inventoryBulkSubmitting || parseInventoryPaste(inventoryBulkText).length === 0)}>
            {inventoryBulkSubmitting ? 'Cargando…' : 'Cargar tabla'}
          </button>
        </>}>
        {inventoryBulkText.trim() && !inventoryBulkText.split(/\r?\n/)[0]?.includes('\t') && (
          <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,159,10,0.1)', border: '1px solid rgba(255,159,10,0.3)', color: '#ff9f0a', fontSize: 12, lineHeight: 1.5 }}>
            No se detectaron tabulaciones — si tu tabla tiene celdas vacías, las columnas pueden desalinearse. Para mejores resultados, copia directamente desde la hoja de cálculo o la app de escaneo (no desde un chat) y pega aquí.
          </div>
        )}
        <textarea autoFocus rows={10} value={inventoryBulkText} onChange={e => setInventoryBulkText(e.target.value)}
          placeholder={'Tipo de etiqueta\tTecnologías posibles\tNúmero de serie\t...\n(pega aquí, incluyendo la fila de encabezados)'}
          style={{ ...s.input(isDark), resize: 'vertical', fontFamily: 'monospace', fontSize: 11.5, lineHeight: 1.6 }} />
      </AdminModal>
    </div>
  )
}

const thStyle: React.CSSProperties = { textAlign: 'left', padding: '8px 12px', fontWeight: 600, fontSize: 12, color: '#999' }
const tdStyle: React.CSSProperties = { padding: '10px 12px' }
const accentBtnStyle: React.CSSProperties = { background: '#F5C518', color: '#111', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }
const dangerBtnStyle: React.CSSProperties = { background: 'transparent', color: '#ff4d6a', border: '1px solid #ff4d6a', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }
