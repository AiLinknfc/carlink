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

  const statuses = useMemo(() => items.map(i => ({ item: i, status: safetyStatus(i) })), [items])
  const count = (tone: Tone) => statuses.filter(s => s.status.tone === tone).length
  const missingCore = CORE_KINDS.filter(k => !items.some(i => i.kind === k))

  const open = (kind: SafetyKind, item: SafetyItem | null = null) => setForm({ item, kind })

  const summary = (n: number, label: string, tone: Tone) => (
    <div style={{ flex: '1 1 120px', minWidth: 110, padding: '12px 14px', borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: TONE_COLOR[tone] }}>{n}</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 1 }}>{label}</div>
    </div>
  )

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

      {items.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
          {summary(count('ok'), 'En orden', 'ok')}
          {summary(count('warn'), 'Por vencer o incompletos', 'warn')}
          {summary(count('bad'), 'Vencidos', 'bad')}
          {summary(count('none'), 'Sin datos', 'none')}
        </div>
      )}

      {loading && <div style={{ color: 'var(--text-3)', padding: 20 }}>Cargando...</div>}

      {/* Elementos obligatorios que todavía no se registran */}
      {!loading && missingCore.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(230px,100%),1fr))', gap: 12, marginBottom: 20 }}>
          {missingCore.map(k => (
            <button key={k} onClick={() => open(k)} style={{ ...cardStyle, textAlign: 'left', cursor: 'pointer', border: '1px dashed rgba(245,197,24,0.4)', display: 'flex', alignItems: 'center', gap: 14, font: 'inherit', color: 'inherit' }}>
              <span style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(245,197,24,0.12)', color: '#F5C518', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                <SafetyIcon type={k} />
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>{KIND_LABEL[k]}</span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Sin registrar — toca para agregarlo</span>
              </span>
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {statuses.map(({ item: it, status }) => (
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
                  return (
                    <div key={k.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: has ? 'var(--text-1)' : '#ffb020' }}>
                      <span style={{ width: 18, height: 18, borderRadius: 5, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: has ? '#2ecc71' : 'rgba(255,176,32,0.18)', color: has ? '#111' : '#ffb020' }}>
                        {has
                          ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                          : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 7v6M12 17h.01" /></svg>}
                      </span>
                      {k.label}
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
        ))}
      </div>

      {!loading && (
        <div style={{ marginTop: 16 }}>
          <button onClick={() => open('otro')} style={{ fontSize: 13, fontWeight: 700, color: '#F5C518', padding: '10px 16px', borderRadius: 10, border: '1px dashed rgba(245,197,24,0.4)', background: 'transparent', cursor: 'pointer' }}>
            + Otro elemento de seguridad
          </button>
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
