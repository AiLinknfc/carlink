'use client'

import { useEffect, useState } from 'react'
import AdminModal from '@/components/admin/AdminModal'
import { dealerApi, dealerError, formatCop, formatKm, type DealerVehicle, type DealerVehicleInput } from '@/lib/dealerVehicles'
import type { Workshop } from '@/lib/types'
import { proxyUrl, uploadFile } from '@/lib/upload'
import ThemedSelect from '@/components/ThemedSelect'
import { ghostBtnStyle, inputStyle, labelStyle, negocioTokens, primaryBtnStyle, selectTheme } from './shared'
import ClaimLinkModal from './ClaimLinkModal'
import QrLinkModal from './QrLinkModal'

/* Vehículos en venta de un concesionario o compraventa (docs/PLAN_ALIADOS_NEGOCIO.md, sección 15): inventario, ficha pública con
   QR, kilometraje certificado y entrega al comprador. El vehículo solo pasa a la cuenta del comprador cuando éste recibe la entrega. */

const CLASSES = ['Automóvil', 'Camioneta', 'Campero', 'Pickup', 'Van', 'Moto', 'Otro']
const EMPTY: DealerVehicleInput = { plate: '', brand: '', model: '', year: null, color: '', vehicle_class: '', mileage_declared: 0, price_cop: null, description: '', photo_urls: [] }

export default function VehiculosVentaModule({ theme, workshop }: { theme: 'light' | 'dark'; workshop: Workshop }) {
  const t = negocioTokens(theme)
  const [rows, setRows] = useState<DealerVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)
  const [form, setForm] = useState<{ id: string | null; data: DealerVehicleInput } | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [certify, setCertify] = useState<{ v: DealerVehicle; km: string } | null>(null)
  const [certError, setCertError] = useState<string | null>(null)
  const [delivery, setDelivery] = useState<DealerVehicle | null>(null)
  const [qr, setQr] = useState<DealerVehicle | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const load = async () => {
    const r = await dealerApi.list()
    if (r.ok && r.data) setRows(r.data); else setNote({ ok: false, text: dealerError(r.detail) })
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  const replace = (v: DealerVehicle) => setRows(prev => prev.map(x => (x.id === v.id ? v : x)))
  const canCertify = !!workshop.can_certify_odometer && workshop.is_verified
  const kindWord = workshop.business_kind === 'concesionario' ? 'Certificar' : 'Declarar'
  const publicUrl = (v: DealerVehicle) => `${typeof window !== 'undefined' ? window.location.origin : ''}/v/${v.public_slug}`

  const addPhotos = async (files: FileList | null) => {
    if (!files || !form) return
    setUploading(true); setFormError(null)
    const urls: string[] = []
    for (const f of Array.from(files).slice(0, 6 - form.data.photo_urls.length)) {
      const url = await uploadFile(f, 'dealer')
      if (url) urls.push(url); else setFormError('No pudimos subir una de las fotos (solo imágenes, máximo 10 MB).')
    }
    setForm(fm => fm && ({ ...fm, data: { ...fm.data, photo_urls: [...fm.data.photo_urls, ...urls].slice(0, 6) } }))
    setUploading(false)
  }

  const save = async () => {
    if (!form) return
    setSaving(true); setFormError(null)
    const d = form.data
    const r = form.id ? await dealerApi.update(form.id, { ...d, plate: undefined } as Partial<DealerVehicleInput>) : await dealerApi.create(d)
    setSaving(false)
    if (!r.ok || !r.data) { setFormError(r.status === 422 && r.detail === 'error' ? 'Revisa los datos: la placa y el año deben ser válidos.' : dealerError(r.detail)); return }
    setForm(null); setNote({ ok: true, text: form.id ? 'Vehículo actualizado.' : 'Vehículo agregado a tu inventario.' })
    await load()
  }

  const toggleListing = async (v: DealerVehicle) => {
    setBusy(v.id); setNote(null)
    const r = await dealerApi.setListing(v.id, !v.is_listed)
    setBusy(null)
    if (r.ok && r.data) { replace(r.data); setNote({ ok: true, text: r.data.is_listed ? 'Ficha publicada: ya tiene enlace y QR.' : 'Ficha retirada: ya no se ve públicamente.' }) }
    else setNote({ ok: false, text: dealerError(r.detail) })
  }

  const remove = async (v: DealerVehicle) => {
    if (!confirm(`Quitar ${v.plate} de tu inventario?`)) return
    setBusy(v.id)
    const r = await dealerApi.remove(v.id)
    setBusy(null)
    if (r.ok) { setRows(prev => prev.filter(x => x.id !== v.id)); setNote({ ok: true, text: 'Vehículo eliminado.' }) } else setNote({ ok: false, text: dealerError(r.detail) })
  }

  const doCertify = async () => {
    if (!certify) return
    const km = Number(certify.km.replace(/\D/g, ''))
    if (!km) { setCertError('Escribe el kilometraje que marca el odómetro.'); return }
    setSaving(true); setCertError(null)
    const r = await dealerApi.certify(certify.v.id, km)
    setSaving(false)
    if (!r.ok || !r.data) { setCertError(dealerError(r.detail)); return }
    replace(r.data); setCertify(null); setNote({ ok: true, text: `${r.data.certification_label}: ${formatKm(r.data.certified_km ?? km)}.` })
  }

  const badge = (text: string, color: string) => (
    <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 999, border: `1px solid ${color}`, color, whiteSpace: 'nowrap' }}>{text}</span>
  )
  const small: React.CSSProperties = { ...ghostBtnStyle(t), padding: '7px 12px', fontSize: 12.5 }
  const setF = (k: keyof DealerVehicleInput, v: string) => setForm(f => f && ({ ...f, data: { ...f.data, [k]: ['year', 'mileage_declared', 'price_cop'].includes(k) ? (v === '' ? (k === 'mileage_declared' ? 0 : null) : Number(v.replace(/\D/g, ''))) : v } }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: t.textSecondary, flex: '1 1 320px', minWidth: 0 }}>
          Registra los vehículos que vendes, publica su ficha con QR y, al entregarlos, el comprador los recibe en su cuenta de CarLink con el kilometraje de salida.
        </p>
        <button onClick={() => { setForm({ id: null, data: EMPTY }); setFormError(null) }} style={primaryBtnStyle(t, false)}>Agregar vehículo</button>
      </div>

      {!canCertify && (
        <div role="status" style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(255,138,61,0.08)', border: '1px solid rgba(255,138,61,0.28)', fontSize: 12.5, lineHeight: 1.55, color: t.textPrimary }}>
          {workshop.is_verified
            ? 'Certificar el kilometraje de entrega requiere una habilitación aparte de CarLink. Escríbenos a business@carlink.com.co para activarla.'
            : 'Tu negocio aún no está verificado: puedes preparar tu inventario, pero no publicar fichas ni certificar kilometraje.'}
        </div>
      )}
      {note && <div role="status" style={{ fontSize: 13, fontWeight: 700, color: note.ok ? t.success : t.danger }}>{note.text}</div>}

      {loading ? <div style={{ color: t.textMuted, padding: 20 }}>Cargando...</div> : rows.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', border: `1px dashed ${t.border}`, borderRadius: 18, color: t.textMuted }}>
          Aún no tienes vehículos en tu inventario. Agrega el primero para generar su ficha y su QR.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 14 }}>
          {rows.map(v => {
            const delivered = v.status === 'delivered'
            const km = v.certified_km ?? v.mileage_declared
            return (
              <div key={v.id} style={{ padding: 18, borderRadius: 16, background: t.cardBg, border: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
                {v.photo_urls?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={proxyUrl(v.photo_urls[0])} alt={`Foto de ${v.plate}`} style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 10, border: `1px solid ${t.subtleBorder}` }} />
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '.04em', color: t.gold }}>{v.plate}</div>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: t.textPrimary, overflowWrap: 'anywhere' }}>{[v.brand, v.model, v.year].filter(Boolean).join(' ') || 'Sin descripción'}</div>
                    <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>{[v.color, v.vehicle_class].filter(Boolean).join(' · ')}</div>
                  </div>
                  {delivered ? badge('Entregado', t.success) : v.is_listed ? badge('Publicado', t.gold) : badge('No publicado', t.textMuted)}
                </div>
                <div style={{ fontSize: 13, color: t.textSecondary, lineHeight: 1.6 }}>
                  <b style={{ color: t.textPrimary }}>{km > 0 ? formatKm(km) : 'Sin kilometraje'}</b>{' '}
                  <span style={{ color: v.certified_km != null ? t.success : t.textMuted }}>{v.certified_km != null ? v.certification_label : 'Declarado por el vendedor'}</span>
                  {v.price_cop != null && <><br />Precio: <b style={{ color: t.textPrimary }}>{formatCop(v.price_cop)}</b></>}
                  {delivered && v.delivered_at && <><br />Entregado el {new Date(v.delivered_at).toLocaleDateString('es-CO')}{v.share_with_dealer ? ' · el comprador te compartió su contacto (ver Clientes)' : ''}</>}
                  {!delivered && v.delivery_pending && v.delivery_expires_at && <><br /><span style={{ color: t.warning }}>Entrega pendiente hasta el {new Date(v.delivery_expires_at).toLocaleDateString('es-CO')}</span></>}
                </div>
                {!delivered && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button disabled={busy === v.id} onClick={() => toggleListing(v)} style={small}>{v.is_listed ? 'Retirar ficha' : 'Publicar ficha'}</button>
                    {v.is_listed && <button onClick={() => setQr(v)} style={small}>Ficha y QR</button>}
                    <button onClick={() => { setCertify({ v, km: v.certified_km != null ? String(v.certified_km) : '' }); setCertError(null) }} disabled={!canCertify} title={canCertify ? '' : 'Requiere habilitación de CarLink'} style={{ ...small, opacity: canCertify ? 1 : 0.5 }}>{kindWord} km</button>
                    <button onClick={() => setDelivery(v)} style={{ ...small, color: t.gold, borderColor: t.border }}>Entregar al comprador</button>
                    <button onClick={() => { setForm({ id: v.id, data: { plate: v.plate, brand: v.brand, model: v.model, year: v.year, color: v.color, vehicle_class: v.vehicle_class, mileage_declared: v.mileage_declared, price_cop: v.price_cop, description: v.description, photo_urls: v.photo_urls || [] } }); setFormError(null) }} style={small}>Editar</button>
                    <button disabled={busy === v.id} onClick={() => remove(v)} style={{ ...small, color: t.danger }}>Quitar</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {form && (
        <AdminModal isOpen onClose={() => setForm(null)} title={form.id ? 'Editar vehículo' : 'Agregar vehículo'} theme={theme} maxWidth={560}
          footer={<><button onClick={() => setForm(null)} style={ghostBtnStyle(t)}>Cancelar</button><button onClick={save} disabled={saving} style={primaryBtnStyle(t, saving)}>{saving ? 'Guardando...' : 'Guardar'}</button></>}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,200px),1fr))', gap: 12 }}>
            <div><label style={labelStyle(t)} htmlFor="dv-plate">Placa *</label><input id="dv-plate" style={{ ...inputStyle(t), opacity: form.id ? 0.6 : 1 }} value={form.data.plate} disabled={!!form.id} maxLength={8} placeholder="ABC123" onChange={e => setF('plate', e.target.value.toUpperCase())} /></div>
            <div><label style={labelStyle(t)} htmlFor="dv-brand">Marca</label><input id="dv-brand" style={inputStyle(t)} value={form.data.brand} maxLength={60} placeholder="Chevrolet" onChange={e => setF('brand', e.target.value)} /></div>
            <div><label style={labelStyle(t)} htmlFor="dv-model">Modelo</label><input id="dv-model" style={inputStyle(t)} value={form.data.model} maxLength={80} placeholder="Spark GT" onChange={e => setF('model', e.target.value)} /></div>
            <div><label style={labelStyle(t)} htmlFor="dv-year">Año</label><input id="dv-year" style={inputStyle(t)} inputMode="numeric" value={form.data.year ?? ''} maxLength={4} placeholder="2020" onChange={e => setF('year', e.target.value)} /></div>
            <div><label style={labelStyle(t)} htmlFor="dv-color">Color</label><input id="dv-color" style={inputStyle(t)} value={form.data.color} maxLength={40} placeholder="Gris" onChange={e => setF('color', e.target.value)} /></div>
            <div><label style={labelStyle(t)} htmlFor="dv-class">Tipo</label>
              <ThemedSelect id="dv-class" value={form.data.vehicle_class} onChange={v => setF('vehicle_class', v)} options={CLASSES} placeholder="Selecciona..." theme={selectTheme(t)} /></div>
            <div><label style={labelStyle(t)} htmlFor="dv-km">Kilometraje declarado</label><input id="dv-km" style={inputStyle(t)} inputMode="numeric" value={form.data.mileage_declared || ''} placeholder="45000" onChange={e => setF('mileage_declared', e.target.value)} /></div>
            <div><label style={labelStyle(t)} htmlFor="dv-price">Precio (COP)</label><input id="dv-price" style={inputStyle(t)} inputMode="numeric" value={form.data.price_cop ?? ''} placeholder="38500000" onChange={e => setF('price_cop', e.target.value)} /></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle(t)} htmlFor="dv-desc">Descripción</label><textarea id="dv-desc" style={{ ...inputStyle(t), minHeight: 80, resize: 'vertical' }} value={form.data.description} maxLength={500} placeholder="Único dueño, mantenimientos al día..." onChange={e => setF('description', e.target.value)} /></div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle(t)}>Fotos (hasta 6)</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {form.data.photo_urls.map(u => (
                <div key={u} style={{ position: 'relative', width: 78, height: 58, borderRadius: 8, overflow: 'hidden', border: `1px solid ${t.subtleBorder}` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={proxyUrl(u)} alt="Foto del vehículo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button type="button" aria-label="Quitar foto" onClick={() => setForm(fm => fm && ({ ...fm, data: { ...fm.data, photo_urls: fm.data.photo_urls.filter(x => x !== u) } }))}
                    style={{ position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.7)', color: '#fff', cursor: 'pointer', fontSize: 12, lineHeight: 1 }}>x</button>
                </div>
              ))}
              {form.data.photo_urls.length < 6 && (
                <label style={{ ...ghostBtnStyle(t), padding: '8px 14px', fontSize: 12.5, cursor: uploading ? 'wait' : 'pointer' }}>
                  {uploading ? 'Subiendo...' : 'Agregar fotos'}
                  <input type="file" accept="image/*" multiple disabled={uploading} style={{ display: 'none' }} onChange={e => { void addPhotos(e.target.files); e.target.value = '' }} />
                </label>
              )}
            </div>
          </div>
          <p style={{ fontSize: 12, color: t.textMuted, margin: '10px 0 0', lineHeight: 1.5 }}>La ficha pública no muestra la placa completa. El kilometraje declarado se muestra como "Declarado por el vendedor" hasta que lo {kindWord.toLowerCase()}.</p>
          {formError && <div role="alert" style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: t.danger }}>{formError}</div>}
        </AdminModal>
      )}

      {certify && (
        <AdminModal isOpen onClose={() => setCertify(null)} title={`${kindWord} kilometraje de ${certify.v.plate}`} theme={theme} maxWidth={460}
          footer={<><button onClick={() => setCertify(null)} style={ghostBtnStyle(t)}>Cancelar</button><button onClick={doCertify} disabled={saving} style={primaryBtnStyle(t, saving)}>{saving ? 'Guardando...' : `${kindWord} kilometraje`}</button></>}>
          <p style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.6, margin: '0 0 12px' }}>
            Escribe el kilometraje que marca el odómetro al entregar. Quedará como <b style={{ color: t.textPrimary }}>{workshop.business_kind === 'concesionario' ? 'Certificado por concesionario' : 'Declarado por compraventa verificada'}</b> y
            el comprador lo recibirá como su lectura inicial. Compararemos el valor con el historial que CarLink tenga de la placa; no puede ser menor. Tienes 3 intentos por vehículo cada 24 horas.
          </p>
          <label style={labelStyle(t)} htmlFor="dv-cert">Kilometraje (km)</label>
          <input id="dv-cert" style={inputStyle(t)} inputMode="numeric" autoFocus value={certify.km} placeholder="45000" onChange={e => setCertify(c => c && ({ ...c, km: e.target.value.replace(/\D/g, '') }))} />
          {certError && <div role="alert" style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: t.danger }}>{certError}</div>}
        </AdminModal>
      )}

      {delivery && (
        <ClaimLinkModal t={t} theme={theme} title={`Entregar ${delivery.plate}`} pathPrefix="/entrega"
          intro="Cuando entregues el vehículo, comparte este enlace o QR con el comprador. Al abrirlo e iniciar sesión, el vehículo queda en su cuenta de CarLink con el kilometraje de salida."
          footnote="El comprador decide si te comparte su nombre y WhatsApp como cliente. Antes de generar el enlace, certifica el kilometraje si ya lo tienes."
          shareText={(url, name) => `Hola, ${name} te entrega tu vehículo. Recíbelo en tu cuenta de CarLink con su kilometraje de salida: ${url}`}
          generate={async () => { const r = await dealerApi.delivery(delivery.id); if (r.ok && r.data) { void load(); return r.data } setNote({ ok: false, text: dealerError(r.detail) }); return null }}
          onClose={() => setDelivery(null)} />
      )}
      {qr && <QrLinkModal t={t} theme={theme} title={`Ficha de ${qr.brand || qr.plate}`} intro="Quien escanee este QR ve la ficha pública del vehículo (sin la placa completa ni tus datos de contacto)." url={publicUrl(qr)} onClose={() => setQr(null)} />}
    </div>
  )
}
