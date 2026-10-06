'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPost, apiPut } from '@/lib/api'
import { CARD_FIELD_DEFS, SERVICE_OPTIONS, TOP_FIELD_LABELS } from '@/lib/vehicleCard'
import { fuelLabel } from '@/lib/fuelType'
import ThemedDateInput from '@/components/ThemedDateInput'

/* Sección "Detalles del vehículo" (datos de la tarjeta de propiedad). Todos los campos son
   obligatorios para enviar a revisión: acá se ven con su estado, se completan los que faltan y se
   corrige lo que el OCR leyó mal. La validación la hace el servidor (GET /vehicles/{id}/card-check,
   la misma que corre al enviar a revisión); este componente solo la muestra. Los campos con
   columna propia (marca, línea, año, color, clase, combustible, propietario) se editan en los
   datos del vehículo, más arriba en el perfil. */

interface Props {
  vehicle: any
  onPatch: (patch: Record<string, any>) => void
  /** Avisa al padre si la tarjeta está completa (habilita "Enviar a revisión"). */
  onComplete?: (complete: boolean) => void
  /** Avisa si el dueño ya confirmó a mano los datos actuales (habilita publicar en venta). */
  onConfirmed?: (confirmed: boolean) => void
}

function StatusIcon({ ok }: { ok: boolean }) {
  return ok
    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-label="Completo"><path d="M20 6L9 17l-5-5" /></svg>
    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff4d6a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-label="Falta o es inválido"><circle cx="12" cy="12" r="10" /><path d="M12 8v5M12 16.5h.01" /></svg>
}

export default function VehicleCardDetails({ vehicle, onPatch, onComplete, onConfirmed }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loaded, setLoaded] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null)
  const [required, setRequired] = useState<string[]>([])
  const [ticks, setTicks] = useState<Record<string, boolean>>({})
  const [confirming, setConfirming] = useState(false)
  const locked = vehicle?.verification_status === 'verified' || vehicle?.verification_status === 'pending'

  const cardJson = JSON.stringify(vehicle?.card_data || {})
  const topKey = [vehicle?.brand, vehicle?.model, vehicle?.year, vehicle?.color, vehicle?.body_type, vehicle?.fuel_type, vehicle?.owner_name, vehicle?.city].join('|')

  const check = useCallback(async () => {
    if (!vehicle?.id) return
    const res = await apiGet<{ complete: boolean; errors: Record<string, string>; confirmed: boolean; confirmed_at: string | null; required_fields: string[] }>(`/vehicles/${vehicle.id}/card-check`)
    if (!res) return
    setErrors(res.errors || {})
    setConfirmed(!!res.confirmed)
    setConfirmedAt(res.confirmed_at || null)
    setRequired(res.required_fields || [])
    setLoaded(true)
    onComplete?.(!!res.complete)
    onConfirmed?.(!!res.confirmed)
  }, [vehicle?.id, onComplete, onConfirmed])

  useEffect(() => { setDraft(vehicle?.card_data || {}); setMessage('') }, [vehicle?.id, cardJson])
  // Cualquier cambio de datos invalida las marcas hechas: hay que revisar de nuevo.
  useEffect(() => { setTicks({}) }, [vehicle?.id, cardJson, topKey])
  useEffect(() => { setLoaded(false); void check() }, [check, cardJson, topKey])

  const dirty = JSON.stringify(draft) !== cardJson
  const errCount = Object.keys(errors).length

  async function save() {
    if (!vehicle?.id) return
    setSaving(true); setMessage('')
    // El documento del propietario vuelve enmascarado desde el servidor: si no se tocó, no se reenvía.
    const payload = { ...draft }
    if (String(payload.owner_document || '').includes('•')) delete payload.owner_document
    const saved = await apiPut(`/vehicles/${vehicle.id}`, { card_data: payload })
    setSaving(false)
    if (!saved) { setMessage('No pudimos guardar los datos. Intenta de nuevo.'); return }
    onPatch({ card_data: saved.card_data ?? draft })
    setMessage('Datos guardados.')
  }

  const inputStyle = (bad: boolean) => ({
    width: '100%', boxSizing: 'border-box' as const, padding: '9px 11px', borderRadius: 10, fontSize: 13, outline: 'none',
    border: `1px solid ${bad ? '#ff4d6a' : 'var(--input-border, rgba(255,255,255,0.14))'}`,
    background: 'var(--input-bg, rgba(255,255,255,0.04))', color: 'var(--text-1)',
  })
  const labelStyle = { fontSize: 11, color: 'var(--text-3)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } as const

  const topValue = (k: string): string => {
    if (k === 'fuel_type') return fuelLabel(vehicle?.fuel_type)
    const v = vehicle?.[k]
    return v ? String(v) : ''
  }

  return (
    <div data-vehicle-card-details style={{ marginTop: 14, padding: '14px 16px', borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-2)' }}>Detalles del vehículo</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 3, lineHeight: 1.5 }}>
        {!loaded ? 'Revisando los datos de la tarjeta…'
          : errCount === 0 ? 'Todos los datos de la tarjeta están completos.'
          : `Faltan o hay que corregir ${errCount} dato${errCount === 1 ? '' : 's'}. Todos son obligatorios para enviar a revisión y deben coincidir con tu tarjeta de propiedad.`}
      </div>

      {/* Campos con columna propia: solo lectura acá, con su estado. */}
      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {Object.entries(TOP_FIELD_LABELS).map(([k, label]) => (
          <div key={k}>
            <div style={labelStyle}>{loaded && <StatusIcon ok={!errors[k]} />}{label}</div>
            <div style={{ fontSize: 13, color: topValue(k) ? 'var(--text-1)' : 'var(--text-3)', fontWeight: 600, wordBreak: 'break-word' }}>{topValue(k) || '—'}</div>
            {errors[k] && <div style={{ fontSize: 11, color: '#ff4d6a', marginTop: 2 }}>{errors[k].replace(/^[^:]+: /, '')}</div>}
          </div>
        ))}
      </div>

      {/* Campos de la licencia que se completan acá. */}
      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
        {CARD_FIELD_DEFS.map(d => {
          const bad = !!errors[d.key]
          return (
            <div key={d.key}>
              <label style={labelStyle}>{loaded && <StatusIcon ok={!bad} />}{d.label}</label>
              {'date' in d && d.date ? (
                <ThemedDateInput className="date-field" value={draft[d.key] || ''} disabled={locked}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={e => { setDraft(p => ({ ...p, [d.key]: e.target.value })); setMessage('') }}
                  style={{ padding: '9px 11px', fontSize: 13, borderColor: bad ? '#ff4d6a' : undefined }} />
              ) : (
                <input
                  type="text" inputMode={'numeric' in d && d.numeric ? 'numeric' : undefined}
                  value={draft[d.key] || ''} placeholder={d.placeholder} disabled={locked}
                  onChange={e => { setDraft(p => ({ ...p, [d.key]: e.target.value })); setMessage('') }}
                  style={inputStyle(bad)} />
              )}
              {bad && <div style={{ fontSize: 11, color: '#ff4d6a', marginTop: 2 }}>{errors[d.key].replace(/^[^:]+: /, '')}</div>}
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={labelStyle}>{loaded && <StatusIcon ok={!errors.service} />}Servicio</div>
        <div role="radiogroup" aria-label="Servicio" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {SERVICE_OPTIONS.map(o => {
            const sel = draft.service === o.value
            return (
              <button key={o.value} type="button" role="radio" aria-checked={sel} disabled={locked}
                onClick={() => { setDraft(p => ({ ...p, service: o.value })); setMessage('') }}
                style={{
                  padding: '7px 13px', borderRadius: 999, cursor: locked ? 'default' : 'pointer',
                  border: `1.5px solid ${sel ? 'rgba(245,197,24,0.45)' : 'var(--input-border, rgba(255,255,255,0.14))'}`,
                  background: sel ? 'rgba(245,197,24,0.15)' : 'var(--input-bg, rgba(255,255,255,0.04))',
                  color: sel ? '#F5C518' : 'var(--text-3)', fontSize: 12, fontWeight: sel ? 700 : 600,
                }}>{o.label}</button>
            )
          })}
        </div>
        {errors.service && <div style={{ fontSize: 11, color: '#ff4d6a', marginTop: 4 }}>{errors.service.replace(/^[^:]+: /, '')}</div>}
      </div>

      {loaded && errCount === 0 && required.length > 0 && (
        <div data-card-confirm style={{ marginTop: 16, padding: '12px 14px', borderRadius: 12, border: `1px solid ${confirmed ? 'rgba(46,204,113,0.35)' : 'rgba(245,197,24,0.35)'}`, background: confirmed ? 'rgba(46,204,113,0.07)' : 'rgba(245,197,24,0.06)' }}>
          <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--text-2)' }}>
            {confirmed ? 'Datos confirmados a mano' : 'Confirma a mano cada dato (obligatorio para vender)'}
          </div>
          {confirmed ? (
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.5 }}>
              {confirmedAt ? `Confirmaste los datos el ${new Date(confirmedAt).toLocaleDateString('es')}. ` : ''}Si cambias cualquier dato tendrás que confirmarlos de nuevo.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.5 }}>
                Compara cada dato con tu tarjeta física y márcalo. Un comprador verá esta información: tiene que ser la correcta.
              </div>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {required.map(k => {
                  const label = TOP_FIELD_LABELS[k] || CARD_FIELD_DEFS.find(d => d.key === k)?.label || (k === 'service' ? 'Servicio' : k)
                  const raw = k in TOP_FIELD_LABELS ? topValue(k) : (k === 'service' ? (SERVICE_OPTIONS.find(o => o.value === draft.service)?.label || draft.service) : draft[k])
                  const on = !!ticks[k]
                  return (
                    <label key={k} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 11px', borderRadius: 10, cursor: 'pointer',
                      border: `1px solid ${on ? 'rgba(245,197,24,0.4)' : 'var(--input-border, rgba(255,255,255,0.14))'}`,
                      background: 'var(--input-bg, rgba(255,255,255,0.04))',
                    }}>
                      <input type="checkbox" checked={on} onChange={e => setTicks(p => ({ ...p, [k]: e.target.checked }))}
                        style={{ width: 16, height: 16, accentColor: '#F5C518', cursor: 'pointer', flex: '0 0 auto' }} />
                      <span style={{ fontSize: 11.5, color: 'var(--text-3)', minWidth: 120 }}>{label}</span>
                      <span style={{ fontSize: 12.5, color: 'var(--text-1)', fontWeight: 600, wordBreak: 'break-word' }}>{raw || '—'}</span>
                    </label>
                  )
                })}
              </div>
              <button type="button" disabled={confirming || required.some(k => !ticks[k])} onClick={async () => {
                setConfirming(true); setMessage('')
                const ok = await apiPost(`/vehicles/${vehicle.id}/card-confirm`, { confirmed_fields: required.filter(k => ticks[k]) })
                setConfirming(false)
                if (!ok) { setMessage('No pudimos confirmar los datos. Revisa que todo esté marcado e intenta de nuevo.'); return }
                await check()
              }} style={{
                marginTop: 10, padding: '9px 16px', borderRadius: 11, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 12.5,
                cursor: confirming || required.some(k => !ticks[k]) ? 'not-allowed' : 'pointer', opacity: confirming || required.some(k => !ticks[k]) ? 0.5 : 1,
              }}>{confirming ? 'Confirmando…' : 'Confirmar que todos los datos son correctos'}</button>
            </>
          )}
        </div>
      )}

      {!locked && (
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={save} disabled={!dirty || saving} style={{
            padding: '9px 16px', borderRadius: 11, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 12.5,
            cursor: !dirty || saving ? 'not-allowed' : 'pointer', opacity: !dirty || saving ? 0.5 : 1,
          }}>{saving ? 'Guardando…' : 'Guardar y validar'}</button>
          {message && <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{message}</span>}
        </div>
      )}
    </div>
  )
}
