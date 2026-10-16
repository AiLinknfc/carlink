'use client'

import { useEffect, useState } from 'react'
import { workshopApplicationApi, type RuesVerification, type WorkshopApplication } from '@/lib/api'
import { proxyUrl } from '@/lib/upload'
import { KIND_LABEL } from '@/lib/tallerForm'
import ThemedSelect from '@/components/ThemedSelect'

/* Postulaciones de talleres/proveedores captadas en la landing /taller (docs/PLAN_LANDING_TALLERES.md).
   Aprobar envía al postulante el enlace al registro real; no crea cuentas. */

interface Colors { bg: string; card: string; border: string; text: string; muted: string; accent: string }

const STATUS_LABEL: Record<WorkshopApplication['status'], string> = {
  pending: 'Pendiente', contacted: 'Contactado', approved: 'Aprobada', rejected: 'Rechazada',
}
const FILTERS: { key: string; label: string }[] = [
  { key: '', label: 'Todas' }, { key: 'pending', label: 'Pendientes' }, { key: 'contacted', label: 'Contactadas' },
  { key: 'approved', label: 'Aprobadas' }, { key: 'rejected', label: 'Rechazadas' },
]
const TYPE_LABEL: Record<string, string> = {
  mecanica_general: 'Mecánica general', latoneria_pintura: 'Latonería y pintura', llantas_alineacion: 'Llantas y alineación',
  electrico: 'Eléctrico', lubricentro: 'Lubricentro', tecnicentro: 'Tecnicentro', repuestos: 'Proveedor de repuestos', otro: 'Otro',
}

/* Lista de chequeo manual de la validación (por ahora la hace el admin; a futuro una API de verificación de
   empresas agrega chequeos automáticos en la misma columna `checks`). docs/PLAN_ALIADOS_NEGOCIO.md, Fase 0. */
const CHECKS: { key: string; label: string }[] = [
  { key: 'doc_reviewed', label: 'Cámara de Comercio / RUT revisado' },
  { key: 'nit_confirmed', label: 'NIT confirmado en el RUES' },
  { key: 'contact_confirmed', label: 'Contacto verificado (llamada o WhatsApp)' },
  { key: 'location_ok', label: 'Ubicación y logo coherentes' },
]
const RUES_URL = 'https://www.rues.org.co/'
/* Verificación automática en el RUES: orientativa. "Coincide / No coincide / Sin dato" en texto (sin emojis), con color. */
const RUES_STATUS: Record<string, { label: string; color: string }> = {
  ok: { label: 'En regla en el RUES', color: '#2ecc71' },
  review: { label: 'En regla, revisar nombre o actividad', color: '#ff8a3d' },
  fail: { label: 'Con problemas en el RUES', color: '#ff4d6a' },
  not_found: { label: 'No encontrada en el RUES', color: '#ff4d6a' },
  unavailable: { label: 'El RUES no respondió', color: '#8f8a7a' },
}
function ruesRows(v: RuesVerification): { label: string; value: string; ok: boolean | null }[] {
  const c = v.checks
  if (!c) return []
  const yn = (b: boolean | null) => (b === null ? 'Sin dato' : b ? 'Coincide' : 'No coincide')
  return [
    { label: 'Matrícula', value: v.estado || 'Sin dato', ok: c.active },
    { label: 'Renovación', value: v.ultimo_ano_renovado ? `Último año renovado: ${v.ultimo_ano_renovado}` : 'Sin dato', ok: c.renewed },
    { label: 'Dígito de verificación', value: yn(c.dv), ok: c.dv },
    { label: 'Nombre', value: `${yn(c.name)}${v.razon_social ? ` (${v.razon_social})` : ''}`, ok: c.name },
    { label: 'Actividad (CIIU)', value: `${yn(c.activity)}${v.ciiu ? ` (${v.ciiu})` : ''}`, ok: c.activity },
  ]
}
const GRANT_OPTIONS: { v: string; l: string }[] = [
  { v: '365', l: '12 meses gratis' }, { v: '180', l: '6 meses gratis' }, { v: '90', l: '3 meses gratis' }, { v: '30', l: '1 mes gratis' },
  { v: 'convenio', l: 'Convenio (sin vencimiento)' },
]
const grantLabel = (v: string) => GRANT_OPTIONS.find(o => o.v === v)?.l ?? `${v} días gratis`

function inviteLabel(r: WorkshopApplication): string | null {
  if (r.status !== 'approved') return null
  if (r.invite_used_at) return `Invitación usada el ${new Date(r.invite_used_at).toLocaleDateString('es-CO')}`
  if (!r.invite_expires_at) return 'Sin invitación enviada'
  const exp = new Date(r.invite_expires_at)
  return exp.getTime() < Date.now() ? 'Invitación vencida' : `Invitación enviada, vence el ${exp.toLocaleDateString('es-CO')}`
}

export default function PostulacionesPanel({ c }: { c: Colors }) {
  const [rows, setRows] = useState<WorkshopApplication[]>([])
  const [filter, setFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  // Acceso que se concede al aprobar (por postulación): '365' meses en días, o 'convenio' (sin vencimiento).
  const [grant, setGrant] = useState<Record<string, string>>({})

  const load = async (f = filter) => {
    setLoading(true)
    const list = await workshopApplicationApi.list(f || undefined)
    setRows(list || [])
    setNotes(Object.fromEntries((list || []).map(r => [r.id, r.admin_notes])))
    setCert(Object.fromEntries((list || []).map(r => [r.id, !!r.can_certify_odometer])))
    setGrant(Object.fromEntries((list || []).map(r => [r.id, r.grant_plan === 'convenio' ? 'convenio' : String(r.grant_days)])))
    setLoading(false)
  }
  useEffect(() => { load(filter) }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (r: WorkshopApplication, status?: WorkshopApplication['status']) => {
    if (status === 'approved') {
      const missing = CHECKS.filter(ck => !r.checks?.[ck.key]).map(ck => ck.label)
      const vs = r.verification?.status
      const ruesWarn = vs === 'fail' || vs === 'not_found' ? `\n\nOJO: ${RUES_STATUS[vs].label}. Revisa antes de aprobar.` : ''
      const warn = (missing.length ? `\n\nSin marcar en la lista de chequeo:\n- ${missing.join('\n- ')}` : '') + ruesWarn
      if (!confirm(`Aprobar a "${r.name}" con ${grantLabel(grant[r.id] ?? '365')}? Se le enviará por correo el aviso de registro exitoso con su enlace personal para crear la cuenta.${warn}`)) return
    }
    setBusy(r.id)
    const g = grant[r.id] ?? '365'
    const grantFields = g === 'convenio' ? { grant_plan: 'convenio' } : { grant_plan: 'founder', grant_days: Number(g) }
    const updated = await workshopApplicationApi.update(r.id, { ...(status ? { status } : {}), admin_notes: notes[r.id] ?? '', ...grantFields })
    if (updated) setRows(prev => prev.map(x => (x.id === r.id ? updated : x)))
    setBusy(null)
  }

  const toggleCheck = async (r: WorkshopApplication, key: string) => {
    setBusy(r.id)
    const updated = await workshopApplicationApi.update(r.id, { checks: { [key]: !r.checks?.[key] } })
    if (updated) setRows(prev => prev.map(x => (x.id === r.id ? updated : x)))
    setBusy(null)
  }

  const [cert, setCert] = useState<Record<string, boolean>>({})
  const toggleCert = async (r: WorkshopApplication) => {
    const next = !cert[r.id]
    if (next && !confirm(`Habilitar a "${r.name}" para ${r.business_kind === 'concesionario' ? 'certificar el kilometraje de entrega' : r.business_kind === 'cda' ? 'registrar revisiones técnico-mecánicas (su kilometraje queda certificado por el CDA)' : 'declarar el kilometraje de entrega'}? Hazlo solo si ya validaste el negocio a fondo.`)) return
    setBusy(r.id)
    const res = await workshopApplicationApi.setCertification(r.id, next)
    if (res) setCert(p => ({ ...p, [r.id]: res.can_certify_odometer })); else alert('No se pudo cambiar el permiso (el negocio debe existir, estar verificado y ser concesionario o compraventa).')
    setBusy(null)
  }

  const verifyRues = async (r: WorkshopApplication) => {
    setBusy(r.id)
    const updated = await workshopApplicationApi.verify(r.id)
    if (updated) setRows(prev => prev.map(x => (x.id === r.id ? updated : x)))
    else alert('No se pudo consultar el RUES en este momento.')
    setBusy(null)
  }

  const resend = async (r: WorkshopApplication) => {
    if (!confirm(`Enviar una invitación nueva a ${r.email}? La anterior dejará de servir.`)) return
    setBusy(r.id)
    const updated = await workshopApplicationApi.resendInvite(r.id)
    if (updated) setRows(prev => prev.map(x => (x.id === r.id ? updated : x)))
    else alert('No se pudo reenviar la invitación (ya fue usada o la postulación no está aprobada).')
    setBusy(null)
  }

  const btn = (bg: string, color: string): React.CSSProperties => ({
    padding: '7px 12px', borderRadius: 8, border: `1px solid ${c.border}`, background: bg, color, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
  })

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{ ...btn(filter === f.key ? c.accent : 'transparent', filter === f.key ? '#111' : c.muted) }}>{f.label}</button>
        ))}
      </div>

      {loading && <div style={{ color: c.muted, padding: 20 }}>Cargando...</div>}
      {!loading && rows.length === 0 && <div style={{ color: c.muted, padding: 20 }}>No hay postulaciones en este estado.</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map(r => (
          <div key={r.id} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 16, display: 'grid', gridTemplateColumns: '72px 1fr', gap: 16 }}>
            {r.logo_url ? (
              <a href={proxyUrl(r.logo_url)} target="_blank" rel="noreferrer" title="Ver logo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={proxyUrl(r.logo_url)} alt={`Logo de ${r.name}`} style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 10, background: '#fff', border: `1px solid ${c.border}` }} />
              </a>
            ) : (
              <div title="Sin logo" style={{ width: 72, height: 72, borderRadius: 10, border: `1px dashed ${c.border}`, color: c.muted, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>Sin logo</div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 800, fontSize: 15.5 }}>{r.name} <span style={{ color: c.muted, fontWeight: 500, fontSize: 12.5 }}>· {KIND_LABEL[r.business_kind] || r.business_kind}{r.business_type ? ` · ${TYPE_LABEL[r.business_type] || r.business_type}` : ''}</span></div>
                <span style={{ fontSize: 12, fontWeight: 700, color: r.status === 'approved' ? '#2ecc71' : r.status === 'rejected' ? '#ff6b6b' : c.accent }}>{STATUS_LABEL[r.status]}</span>
              </div>
              <div style={{ fontSize: 13, color: c.muted, lineHeight: 1.7, marginTop: 6 }}>
                NIT {r.nit}{r.legal_name ? ` · ${r.legal_name}` : ''} · {r.city}, {r.address}<br />
                {r.contact_name}{r.contact_role ? ` (${r.contact_role})` : ''} · {r.phone} · {r.email}<br />
                {r.website && <>Web: {r.website} · </>}{r.instagram && <>IG: {r.instagram} · </>}{r.monthly_volume && <>{r.monthly_volume} · </>}{r.specialties && <>{r.specialties}</>}
              </div>
              <div style={{ fontSize: 12.5, marginTop: 6, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <span style={{ color: r.logo_authorized ? '#2ecc71' : c.muted }}>{r.logo_authorized ? 'Autoriza mostrar su logo' : 'No autorizó mostrar su logo'}</span>
                {r.facade_url && <a href={proxyUrl(r.facade_url)} target="_blank" rel="noreferrer" style={{ color: c.accent }}>Fachada</a>}
                {r.doc_url && <a href={proxyUrl(r.doc_url)} target="_blank" rel="noreferrer" style={{ color: c.accent }}>Documento</a>}
                <span style={{ color: c.muted }}>Texto legal v{r.consent_version} · {new Date(r.created_at).toLocaleDateString('es-CO')}</span>
              </div>
              <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, border: `1px solid ${c.border}`, background: c.bg }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: c.muted, marginBottom: 8, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span>Verificación en el RUES</span>
                  <button disabled={busy === r.id} onClick={() => verifyRues(r)} style={{ ...btn('transparent', c.accent), padding: '4px 10px', fontSize: 11.5, textTransform: 'none', letterSpacing: 0 }}>Consultar RUES</button>
                </div>
                {(() => {
                  const v = r.verification
                  const st = v?.status ? RUES_STATUS[v.status] : null
                  if (!st) return <div style={{ fontSize: 12.5, color: c.muted }}>Aún sin consultar.</div>
                  return (
                    <div style={{ fontSize: 13 }}>
                      <div style={{ fontWeight: 800, color: st.color, marginBottom: 6 }}>{st.label}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: 4 }}>
                        {ruesRows(v!).map(row => (
                          <div key={row.label} style={{ color: c.muted, overflowWrap: 'anywhere' }}>
                            {row.label}: <b style={{ color: row.ok === null ? c.muted : row.ok ? '#2ecc71' : '#ff8a3d' }}>{row.value}</b>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: c.muted, marginTop: 6 }}>
                        {v?.camara ? `Cámara de Comercio de ${v.camara} · ` : ''}Consultado el {v?.checked_at ? new Date(v.checked_at).toLocaleDateString('es-CO') : '-'} · Fuente: {v?.source}. Es una ayuda: la aprobación es tuya.
                      </div>
                    </div>
                  )
                })()}
              </div>
              <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, border: `1px solid ${c.border}`, background: c.bg }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: c.muted, marginBottom: 8, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <span>Validación manual</span>
                  <a href={RUES_URL} target="_blank" rel="noreferrer" style={{ color: c.accent, textTransform: 'none', letterSpacing: 0 }}>Consultar el RUES</a>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,230px),1fr))', gap: 6 }}>
                  {CHECKS.map(ck => (
                    <label key={ck.key} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, cursor: 'pointer', color: r.checks?.[ck.key] ? c.text : c.muted }}>
                      <input type="checkbox" checked={!!r.checks?.[ck.key]} disabled={busy === r.id} onChange={() => toggleCheck(r, ck.key)} style={{ accentColor: '#F5C518', width: 16, height: 16 }} />
                      {ck.label}
                    </label>
                  ))}
                </div>
              </div>
              {r.status !== 'approved' || !r.invite_used_at ? (
                <label style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', fontSize: 13, color: c.muted }}>
                  Acceso al crear la cuenta
                  <div style={{ minWidth: 190 }}>
                    <ThemedSelect value={grantLabel(grant[r.id] ?? '365')} options={GRANT_OPTIONS.map(o => o.l)} disabled={busy === r.id}
                      theme={{ inputBg: c.bg, inputBorder: c.border, inputText: c.text, accent: c.accent, muted: c.muted, panelBg: c.card }}
                      onChange={label => setGrant(p => ({ ...p, [r.id]: GRANT_OPTIONS.find(o => o.l === label)?.v ?? '365' }))} />
                  </div>
                </label>
              ) : null}
              {inviteLabel(r) && (
                <div style={{ marginTop: 8, fontSize: 12.5, color: c.muted, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span>{inviteLabel(r)}</span>
                  {!r.invite_used_at && <button disabled={busy === r.id} onClick={() => resend(r)} style={btn('transparent', c.accent)}>Reenviar invitación</button>}
                </div>
              )}
              {r.status === 'approved' && r.invite_used_at && (r.business_kind === 'concesionario' || r.business_kind === 'compraventa' || r.business_kind === 'cda') && (
                <div style={{ marginTop: 8, fontSize: 12.5, color: c.muted, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span>{r.business_kind === 'cda' ? 'Registrar revisiones técnico-mecánicas (certifica kilometraje)' : 'Certificar kilometraje de entrega'}: <b style={{ color: cert[r.id] ? '#2ecc71' : c.text }}>{cert[r.id] ? 'habilitado' : 'no habilitado'}</b></span>
                  <button disabled={busy === r.id} onClick={() => toggleCert(r)} style={btn('transparent', cert[r.id] ? '#ff6b6b' : c.accent)}>{cert[r.id] ? 'Quitar permiso' : 'Habilitar'}</button>
                </div>
              )}
              <textarea
                value={notes[r.id] ?? ''} onChange={e => setNotes(p => ({ ...p, [r.id]: e.target.value }))} placeholder="Notas internas"
                rows={2} style={{ width: '100%', marginTop: 10, padding: 10, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.text, fontFamily: 'inherit', fontSize: 13, resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <button disabled={busy === r.id} onClick={() => act(r)} style={btn('transparent', c.text)}>Guardar notas</button>
                <button disabled={busy === r.id || r.status === 'contacted'} onClick={() => act(r, 'contacted')} style={btn('transparent', c.text)}>Marcar contactada</button>
                <button disabled={busy === r.id || r.status === 'approved'} onClick={() => act(r, 'approved')} style={btn(c.accent, '#111')}>Aprobar</button>
                <button disabled={busy === r.id || r.status === 'rejected'} onClick={() => act(r, 'rejected')} style={btn('transparent', '#ff6b6b')}>Rechazar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
