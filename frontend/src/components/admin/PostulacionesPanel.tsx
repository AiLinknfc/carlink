'use client'

import { useEffect, useState } from 'react'
import { workshopApplicationApi, type WorkshopApplication } from '@/lib/api'
import { proxyUrl } from '@/lib/upload'

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

export default function PostulacionesPanel({ c }: { c: Colors }) {
  const [rows, setRows] = useState<WorkshopApplication[]>([])
  const [filter, setFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)

  const load = async (f = filter) => {
    setLoading(true)
    const list = await workshopApplicationApi.list(f || undefined)
    setRows(list || [])
    setNotes(Object.fromEntries((list || []).map(r => [r.id, r.admin_notes])))
    setLoading(false)
  }
  useEffect(() => { load(filter) }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (r: WorkshopApplication, status?: WorkshopApplication['status']) => {
    if (status === 'approved' && !confirm(`Aprobar a "${r.name}"? Se le enviará por correo el enlace para crear su cuenta de taller.`)) return
    setBusy(r.id)
    const updated = await workshopApplicationApi.update(r.id, { ...(status ? { status } : {}), admin_notes: notes[r.id] ?? '' })
    if (updated) setRows(prev => prev.map(x => (x.id === r.id ? updated : x)))
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
            <a href={proxyUrl(r.logo_url)} target="_blank" rel="noreferrer" title="Ver logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={proxyUrl(r.logo_url)} alt={`Logo de ${r.name}`} style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 10, background: '#fff', border: `1px solid ${c.border}` }} />
            </a>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 800, fontSize: 15.5 }}>{r.name} <span style={{ color: c.muted, fontWeight: 500, fontSize: 12.5 }}>· {TYPE_LABEL[r.business_type] || r.business_type}</span></div>
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
