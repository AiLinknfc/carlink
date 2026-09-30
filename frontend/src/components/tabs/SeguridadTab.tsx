'use client'

import { useState, useMemo } from 'react'
import { useSafetyItems } from '@/lib/hooks'
import SafetyFormModal from '@/components/SafetyFormModal'
import SafetyIcon from '@/components/SafetyIcon'
import { proxyUrl } from '@/lib/upload'
import { KIND_LABEL, KIT_ITEMS, TONE_COLOR, formatDay, safetyStatus, type Tone } from '@/lib/safety'
import type { SafetyItem, SafetyKind } from '@/lib/types'

interface Props {
  vehicleId?: string
}

const CORE_KINDS: SafetyKind[] = ['extintor', 'botiquin', 'kit_carretera']

const cardStyle: React.CSSProperties = { background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 16, padding: 18 }

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-1)', marginTop: 2, overflowWrap: 'anywhere' }}>{value}</div>
    </div>
  )
}

function StatusBadge({ tone, label }: { tone: Tone; label: string }) {
  const c = TONE_COLOR[tone]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800, color: c, background: `${c}1f`, border: `1px solid ${c}66`, whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />{label}
    </span>
  )
}

/* Seguridad del vehículo: extintor, botiquín, kit de carretera y otros elementos, con sus fechas y
   estado (vigente / por vencer / vencido / faltantes). Se registran a mano o escaneando la etiqueta. */
export default function SeguridadTab({ vehicleId }: Props) {
  const { items, loading, reload, removeItem } = useSafetyItems(vehicleId)
  const [form, setForm] = useState<{ item: SafetyItem | null; kind: SafetyKind } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Mismo criterio de distribucion que Documentos (DocumentosTab.tsx): una grilla unica
  // (clase `doc-grid`, mismo breakpoint movil) con un slot fijo por tipo obligatorio —
  // vacio (toca para agregarlo) o lleno —, seguido de los elementos "otro" al final, en
  // vez de una grilla aparte para lo pendiente y una lista debajo para lo ya registrado.
  const otherItems = useMemo(() => items.filter(i => i.kind === 'otro'), [items])

  const open = (kind: SafetyKind, item: SafetyItem | null = null) => setForm({ item, kind })

  const emptySlot = (k: SafetyKind) => (
    <button key={k} onClick={() => open(k)} style={{ ...cardStyle, textAlign: 'left', cursor: 'pointer', border: '1px dashed rgba(245,197,24,0.4)', display: 'flex', alignItems: 'center', gap: 14, font: 'inherit', color: 'inherit' }}>
      <span style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(245,197,24,0.12)', color: '#F5C518', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
        <SafetyIcon type={k} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>{KIND_LABEL[k]}</span>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Sin registrar — toca para agregarlo</span>
      </span>
    </button>
  )

  const filledCard = (it: SafetyItem) => {
    const status = safetyStatus(it)
    return (
      <div key={it.id} style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <span style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(245,197,24,0.12)', color: '#F5C518', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
              <SafetyIcon type={it.kind} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)', overflowWrap: 'anywhere' }}>{it.kind === 'otro' ? it.name : KIND_LABEL[it.kind]}</div>
              {it.kind === 'extintor' && (it.details?.brand || it.details?.capacity || it.details?.agent) && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{[it.details.brand, it.details.capacity, it.details.agent].filter(Boolean).join(' · ')}</div>
              )}
            </div>
          </div>
          <StatusBadge tone={status.tone} label={status.label} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(140px,100%),1fr))', gap: 12, marginTop: 14 }}>
          {it.kind === 'extintor' && <>
            <Field label="Compra" value={formatDay(it.purchase_date)} />
            <Field label="Recarga" value={formatDay(it.recharge_date)} />
            <Field label="Vencimiento" value={formatDay(it.expiry_date)} />
          </>}
          {it.kind === 'botiquin' && <>
            <Field label="Revisión" value={formatDay(it.review_date)} />
            <Field label="Reposición" value={formatDay(it.restock_date)} />
            {it.expiry_date && <Field label="Vence" value={formatDay(it.expiry_date)} />}
          </>}
          {it.kind === 'otro' && <Field label="Vencimiento" value={formatDay(it.expiry_date)} />}
        </div>

        {it.kind === 'botiquin' && it.missing_items.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700, marginBottom: 6 }}>Elementos faltantes</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {it.missing_items.map(m => <span key={m} style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(255,176,32,0.12)', border: '1px solid rgba(255,176,32,0.4)', color: '#ffb020', fontSize: 12, fontWeight: 600 }}>{m}</span>)}
            </div>
          </div>
        )}

        {it.kind === 'kit_carretera' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(170px,100%),1fr))', gap: 8, marginTop: 14 }}>
            {KIT_ITEMS.map(k => {
              const has = !!it.checklist?.[k.key]
              const photo = it.details?.[`photo_${k.key}`]
              return (
                <div key={k.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: has ? 'var(--text-1)' : '#ffb020' }}>
                  <span style={{ width: 18, height: 18, borderRadius: 5, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: has ? '#2ecc71' : 'rgba(255,176,32,0.18)', color: has ? '#111' : '#ffb020' }}>
                    {has
                      ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                      : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 7v6M12 17h.01" /></svg>}
                  </span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.label}</span>
                  {photo && (
                    <a href={proxyUrl(photo)} target="_blank" rel="noopener noreferrer" title="Ver evidencia" aria-label={`Ver foto de evidencia de ${k.label}`}
                      style={{ flex: '0 0 auto', color: '#F5C518', display: 'flex' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {it.notes && <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, overflowWrap: 'anywhere' }}>{it.notes}</p>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {it.file_url && (
            <a href={proxyUrl(it.file_url)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 700, color: '#F5C518', textDecoration: 'none', padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(245,197,24,0.35)' }}>Ver foto</a>
          )}
          <button onClick={() => open(it.kind, it)} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-2)', padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border-2)', background: 'transparent', cursor: 'pointer' }}>Editar</button>
          {confirmDelete === it.id ? (
            <>
              <button onClick={async () => { await removeItem(it.id); setConfirmDelete(null) }} style={{ fontSize: 12.5, fontWeight: 800, color: '#fff', padding: '7px 12px', borderRadius: 8, border: 'none', background: '#ff4d6a', cursor: 'pointer' }}>Sí, eliminar</button>
              <button onClick={() => setConfirmDelete(null)} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-3)', padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border-2)', background: 'transparent', cursor: 'pointer' }}>Cancelar</button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(it.id)} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-3)', padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border-2)', background: 'transparent', cursor: 'pointer' }}>Eliminar</button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ animation: 'sectionIn .4s both' }}>
      <div style={{ marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, letterSpacing: '.24em', textTransform: 'uppercase', fontWeight: 700, color: '#F5C518' }}>Equipo obligatorio</div>
          <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 'clamp(24px,2.6vw,32px)', fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.15, margin: '2px 0 4px' }}>Seguridad</h1>
          <p style={{ color: 'var(--text-2)', margin: 0, maxWidth: '60ch', fontSize: 14 }}>
            Extintor, botiquín, kit de carretera y otros elementos. Registra sus fechas o escanea la etiqueta y te avisamos qué está vencido o qué falta.
          </p>
        </div>
        <button onClick={() => open('extintor')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 12, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 0 20px rgba(245,197,24,0.3)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          Agregar o escanear
        </button>
      </div>

      {loading && <div style={{ color: 'var(--text-3)', padding: 20 }}>Cargando...</div>}

      {/* Grilla unica, mismo patron de distribucion que Documentos: un slot fijo por tipo
          obligatorio (vacio o lleno) + los elementos "otro" al final. */}
      {!loading && (
        <div className="doc-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(260px,100%),1fr))', gap: 16 }}>
          {CORE_KINDS.map(k => {
            const ofKind = items.filter(i => i.kind === k)
            return ofKind.length > 0 ? ofKind.map(filledCard) : emptySlot(k)
          })}
          {otherItems.map(filledCard)}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)', fontSize: 14 }}>
          Agrega tu primer elemento con el botón de arriba.
        </div>
      )}

      {form && vehicleId && (
        <SafetyFormModal
          vehicleId={vehicleId}
          item={form.item}
          defaultKind={form.kind}
          onClose={() => setForm(null)}
          onSaved={reload}
        />
      )}
    </div>
  )
}
