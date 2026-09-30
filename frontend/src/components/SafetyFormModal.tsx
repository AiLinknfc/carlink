'use client'

import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import CameraCapture from '@/components/CameraCapture'
import ThemedSelect from '@/components/ThemedSelect'
import { safetyApi } from '@/lib/api'
import { uploadFile, scanSafetyItem, proxyUrl } from '@/lib/upload'
import { KIND_LABEL, KIT_ITEMS } from '@/lib/safety'
import type { SafetyItem, SafetyKind } from '@/lib/types'

const KINDS: SafetyKind[] = ['extintor', 'botiquin', 'kit_carretera', 'otro']
const LABEL_TO_KIND = Object.fromEntries(KINDS.map(k => [KIND_LABEL[k], k])) as Record<string, SafetyKind>
const SELECT_THEME = { inputBg: 'var(--input-bg)', inputBorder: 'var(--input-border)', inputText: 'var(--text-1)', accent: '#F5C518', muted: 'var(--text-3)', panelBg: 'var(--panel-bg)' }

interface Props {
  vehicleId: string
  item?: SafetyItem | null
  defaultKind?: SafetyKind
  /** Clave de una pieza del kit de carretera que arranca marcada (desde Inicio). */
  presetCheck?: string
  onClose: () => void
  onSaved: () => void
}

const labelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: 5 }
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 13px', borderRadius: 10, boxSizing: 'border-box',
  border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-1)', fontSize: 14, outline: 'none',
}
const ghostBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 42, borderRadius: 10, boxSizing: 'border-box',
  border: '1px dashed rgba(245,197,24,0.35)', background: 'rgba(245,197,24,0.04)', color: '#F5C518',
  fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
}

/* Alta/edición de un elemento de seguridad. Se puede escanear (cámara) o subir la foto de la
   etiqueta: el OCR prellena los campos y el usuario los revisa antes de guardar. */
export default function SafetyFormModal({ vehicleId, item, defaultKind = 'extintor', presetCheck, onClose, onSaved }: Props) {
  const editing = !!item
  const [kind, setKind] = useState<SafetyKind>(item?.kind ?? defaultKind)
  const [name, setName] = useState(item?.name ?? '')
  const [purchase, setPurchase] = useState(item?.purchase_date ?? '')
  const [expiry, setExpiry] = useState(item?.expiry_date ?? '')
  const [recharge, setRecharge] = useState(item?.recharge_date ?? '')
  const [review, setReview] = useState(item?.review_date ?? '')
  const [restock, setRestock] = useState(item?.restock_date ?? '')
  const [brand, setBrand] = useState(item?.details?.brand ?? '')
  const [capacity, setCapacity] = useState(item?.details?.capacity ?? '')
  const [agent, setAgent] = useState(item?.details?.agent ?? '')
  const [missing, setMissing] = useState<string[]>(item?.missing_items ?? [])
  const [missingDraft, setMissingDraft] = useState('')
  const [checklist, setChecklist] = useState<Record<string, boolean>>({ ...(item?.checklist ?? {}), ...(presetCheck ? { [presetCheck]: true } : {}) })
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoUrl, setPhotoUrl] = useState(item?.file_url ?? '')
  const [showCamera, setShowCamera] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanMsg, setScanMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const runScan = useCallback(async (file: File) => {
    setShowCamera(false)
    setPhoto(file)
    setScanning(true)
    setScanMsg(null)
    const r = await scanSafetyItem(file)
    setScanning(false)
    if (!r) { setScanMsg('No pudimos leer la imagen. Completa los datos a mano; la foto se guarda igual.'); return }
    const found: string[] = []
    if (r.kind && !editing) { setKind(r.kind); found.push('tipo') }
    if (r.name && !name) { setName(r.name); found.push('nombre') }
    if (r.purchase_date) { setPurchase(r.purchase_date); found.push('compra') }
    if (r.expiry_date) { setExpiry(r.expiry_date); found.push('vencimiento') }
    if (r.recharge_date) { setRecharge(r.recharge_date); found.push('recarga') }
    if (r.review_date) { setReview(r.review_date); found.push('revisión') }
    if (r.brand) { setBrand(r.brand); found.push('marca') }
    if (r.capacity) { setCapacity(r.capacity); found.push('capacidad') }
    if (r.agent) { setAgent(r.agent); found.push('agente') }
    if (r.missing_items?.length) { setMissing(prev => Array.from(new Set([...prev, ...r.missing_items]))); found.push('faltantes') }
    if (r.kit_item) { setChecklist(c => ({ ...c, [r.kit_item as string]: true })); found.push(KIT_ITEMS.find(k => k.key === r.kit_item)?.label ?? r.kit_item) }
    setScanMsg(found.length
      ? `Leímos: ${found.join(', ')}. Revisa que estén bien antes de guardar.`
      : 'No encontramos datos claros en la imagen. Completa los datos a mano; la foto se guarda igual.')
  }, [editing, name])

  const addMissing = () => {
    const v = missingDraft.trim()
    if (!v) return
    setMissing(prev => (prev.includes(v) ? prev : [...prev, v]))
    setMissingDraft('')
  }

  const save = async () => {
    if (kind === 'otro' && !name.trim()) { setError('Ponle un nombre al elemento.'); return }
    setSaving(true); setError('')
    let fileUrl = photoUrl
    if (photo) {
      const url = await uploadFile(photo, 'safety')
      if (url) fileUrl = url
    }
    const details: Record<string, string> = {}
    if (brand.trim()) details.brand = brand.trim()
    if (capacity.trim()) details.capacity = capacity.trim()
    if (agent.trim()) details.agent = agent.trim()
    const body = {
      vehicle_id: vehicleId, kind, name: kind === 'otro' ? name.trim() : '',
      purchase_date: kind === 'extintor' ? purchase || null : null,
      expiry_date: kind === 'kit_carretera' ? null : expiry || null,
      recharge_date: kind === 'extintor' ? recharge || null : null,
      review_date: kind === 'botiquin' ? review || null : null,
      restock_date: kind === 'botiquin' ? restock || null : null,
      missing_items: kind === 'botiquin' ? missing : [],
      checklist: kind === 'kit_carretera' ? checklist : {},
      details: kind === 'extintor' ? details : {},
      notes: notes.trim(), file_url: fileUrl,
    }
    const res = editing ? await safetyApi.update(item!.id, body) : await safetyApi.create(body)
    setSaving(false)
    if (!res) { setError('No se pudo guardar. Intenta de nuevo.'); return }
    onSaved()
    onClose()
  }

  const dateField = (label: string, value: string, set: (v: string) => void) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type="date" className="date-field" value={value} onChange={e => set(e.target.value)} style={{ height: 40 }} />
    </div>
  )

  const modal = (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 220, background: 'rgba(4,4,4,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} className="modal-panel" style={{ width: 520, maxWidth: '94vw', maxHeight: '88vh', overflowY: 'auto', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: 20, padding: 22, boxShadow: '0 30px 80px rgba(0,0,0,.55)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 800, color: 'var(--text-1)' }}>{editing ? 'Editar elemento' : 'Nuevo elemento de seguridad'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Escanea la etiqueta o completa los datos</div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--btn-ghost-border)', background: 'var(--btn-ghost-bg)', color: 'var(--btn-ghost-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Escaneo / imagen */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button type="button" onClick={() => setShowCamera(true)} disabled={scanning} style={ghostBtn}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
              Escanear etiqueta
            </button>
            <label style={{ ...ghostBtn, cursor: scanning ? 'default' : 'pointer' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              Subir imagen
              <input type="file" accept="image/*" disabled={scanning} onChange={e => { const f = e.target.files?.[0]; if (f) runScan(f); e.target.value = '' }} style={{ display: 'none' }} />
            </label>
          </div>
          {scanning && <div style={{ fontSize: 12.5, color: '#F5C518', marginTop: 8 }}>Leyendo la imagen…</div>}
          {scanMsg && !scanning && <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 8, lineHeight: 1.45 }}>{scanMsg}</div>}
          {(photo || photoUrl) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              {photo
                ? <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Foto lista: {photo.name}</span>
                // eslint-disable-next-line @next/next/no-img-element
                : <img src={proxyUrl(photoUrl)} alt="Foto del elemento" style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />}
              <button type="button" onClick={() => { setPhoto(null); setPhotoUrl('') }} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>Quitar foto</button>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Tipo de elemento</label>
          <ThemedSelect value={KIND_LABEL[kind]} onChange={v => setKind(LABEL_TO_KIND[v])} options={KINDS.map(k => KIND_LABEL[k])} theme={SELECT_THEME} ariaLabel="Tipo de elemento" />
        </div>

        {kind === 'otro' && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Nombre del elemento *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Linterna, cables de batería" style={inputStyle} />
          </div>
        )}

        {kind === 'extintor' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(150px,100%),1fr))', gap: 12, marginBottom: 14, alignItems: 'start' }}>
              {dateField('Fecha de compra', purchase, setPurchase)}
              {dateField('Fecha de vencimiento', expiry, setExpiry)}
              {dateField('Fecha de recarga', recharge, setRecharge)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(150px,100%),1fr))', gap: 12, marginBottom: 14 }}>
              <div><label style={labelStyle}>Marca</label><input value={brand} onChange={e => setBrand(e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Capacidad</label><input value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="Ej. 10 lb" style={inputStyle} /></div>
              <div><label style={labelStyle}>Agente</label><input value={agent} onChange={e => setAgent(e.target.value)} placeholder="Ej. PQS ABC" style={inputStyle} /></div>
            </div>
          </>
        )}

        {kind === 'botiquin' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(150px,100%),1fr))', gap: 12, marginBottom: 14, alignItems: 'start' }}>
              {dateField('Fecha de revisión', review, setReview)}
              {dateField('Fecha de reposición', restock, setRestock)}
              {dateField('Vencimiento de elementos', expiry, setExpiry)}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Elementos faltantes</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={missingDraft} onChange={e => setMissingDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMissing() } }}
                  placeholder="Ej. Gasas, alcohol, guantes" style={{ ...inputStyle, flex: 1, minWidth: 0 }} />
                <button type="button" onClick={addMissing} style={{ padding: '0 16px', borderRadius: 10, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Agregar</button>
              </div>
              {missing.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {missing.map(m => (
                    <span key={m} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'rgba(255,176,32,0.12)', border: '1px solid rgba(255,176,32,0.4)', color: '#ffb020', fontSize: 12, fontWeight: 600 }}>
                      {m}
                      <button type="button" aria-label={`Quitar ${m}`} onClick={() => setMissing(prev => prev.filter(x => x !== m))} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {kind === 'kit_carretera' && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>¿Qué tiene tu kit?</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(200px,100%),1fr))', gap: 8 }}>
              {KIT_ITEMS.map(k => {
                const on = !!checklist[k.key]
                return (
                  <button key={k.key} type="button" onClick={() => setChecklist(c => ({ ...c, [k.key]: !on }))} aria-pressed={on}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                      border: `1px solid ${on ? 'rgba(46,204,113,0.5)' : 'var(--input-border)'}`, background: on ? 'rgba(46,204,113,0.08)' : 'var(--input-bg)', color: 'var(--text-1)', fontSize: 13.5 }}>
                    <span style={{ width: 20, height: 20, borderRadius: 6, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? '#2ecc71' : 'transparent', border: `1.5px solid ${on ? '#2ecc71' : 'var(--text-3)'}`, color: '#111' }}>
                      {on && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
                    </span>
                    {k.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {kind === 'otro' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(150px,100%),1fr))', gap: 12, marginBottom: 14, alignItems: 'start' }}>
            {dateField('Fecha de vencimiento', expiry, setExpiry)}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Notas</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Opcional" style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
        </div>

        {error && <div role="alert" style={{ color: '#ff6b6b', fontSize: 13, marginBottom: 10 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid rgba(245,197,24,0.3)', background: 'transparent', color: '#F5C518', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={save} disabled={saving || scanning} style={{ flex: 2, padding: 13, borderRadius: 12, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 14, cursor: saving ? 'default' : 'pointer', opacity: saving || scanning ? 0.7 : 1 }}>{saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Guardar elemento'}</button>
        </div>
      </div>
    </div>
  )

  // La camara va fuera del overlay: los clics dentro de un portal burbujean por el arbol de React y
  // cerrarian este modal (onClick del fondo).
  return typeof document === 'undefined' ? null : createPortal(
    <>
      {modal}
      {showCamera && <CameraCapture onCapture={runScan} onClose={() => setShowCamera(false)} />}
    </>,
    document.body,
  )
}
