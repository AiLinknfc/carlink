'use client'

import { useEffect, useState } from 'react'
import { dealerError, formatKm } from '@/lib/dealerVehicles'
import { addDays, daysLabel, fmtDate, isoDate, reminderLink, rtmApi, type RtmInput, type RtmInspection } from '@/lib/rtm'
import type { Workshop } from '@/lib/types'
import ThemedDateInput from '@/components/ThemedDateInput'
import ThemedSelect from '@/components/ThemedSelect'
import { ghostBtnStyle, inputStyle, labelStyle, negocioTokens, primaryBtnStyle, selectTheme } from './shared'
import ClaimLinkModal from './ClaimLinkModal'

/* Revisiones técnico-mecánicas (RTM) de un CDA (docs/PLAN_ALIADOS_NEGOCIO.md, sección 16): registro, constancia para el propietario y
   lista de próximos vencimientos para avisar a los clientes. Nada se escribe en la cuenta del propietario hasta que él acepta la constancia. */

type Tab = 'registrar' | 'historial' | 'vencer'
const todayIso = () => isoDate(new Date())
const blank = (): RtmInput => ({ plate: '', inspected_on: todayIso(), expires_on: addDays(todayIso(), 365), certificate_code: '', result: 'approved', mileage_km: 0, notes: '' })

export default function RevisionesModule({ theme, workshop }: { theme: 'light' | 'dark'; workshop: Workshop }) {
  const t = negocioTokens(theme)
  const [tab, setTab] = useState<Tab>('registrar')
  const [form, setForm] = useState<RtmInput>(blank())
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)
  const [rows, setRows] = useState<RtmInspection[]>([])
  const [due, setDue] = useState<RtmInspection[]>([])
  const [loading, setLoading] = useState(true)
  const [claimFor, setClaimFor] = useState<RtmInspection | null>(null)
  const canCertify = !!workshop.can_certify_odometer && workshop.is_verified

  const load = async () => {
    const [a, b] = await Promise.all([rtmApi.list(), rtmApi.upcoming(45)])
    if (a.ok && a.data) setRows(a.data)
    if (b.ok && b.data) setDue(b.data)
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  const set = (k: keyof RtmInput, v: string) => setForm(f => {
    const next = { ...f, [k]: k === 'mileage_km' ? Number(v.replace(/\D/g, '')) : v } as RtmInput
    // Al cambiar la fecha de revisión, la vigencia sugerida acompaña (un año), salvo que ya se haya editado a mano.
    if (k === 'inspected_on' && v) next.expires_on = addDays(v, next.result === 'rejected' ? 30 : 365)
    if (k === 'result') next.expires_on = addDays(next.inspected_on, v === 'rejected' ? 30 : 365)
    return next
  })

  const submit = async () => {
    setSaving(true); setNote(null)
    const r = await rtmApi.create({ ...form, plate: form.plate.toUpperCase().replace(/[^A-Z0-9]/g, '') })
    setSaving(false)
    if (!r.ok || !r.data) { setNote({ ok: false, text: r.status === 422 && r.detail === 'error' ? 'Revisa los datos: la placa, el certificado y el kilometraje son obligatorios.' : dealerError(r.detail) }); return }
    setNote({ ok: true, text: `Revisión de ${r.data.plate} registrada. Genera la constancia para que el propietario la reciba en su cuenta.` })
    setForm(blank()); setTab('historial'); await load()
  }

  const badge = (text: string, color: string) => (
    <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 999, border: `1px solid ${color}`, color, whiteSpace: 'nowrap' }}>{text}</span>
  )
  const small: React.CSSProperties = { ...ghostBtnStyle(t), padding: '7px 12px', fontSize: 12.5 }
  const tabBtn = (id: Tab, label: string, count?: number) => (
    <button key={id} onClick={() => setTab(id)} style={{ ...small, ...(tab === id ? { background: t.gold, color: '#111', borderColor: t.gold } : {}) }}>{label}{count ? ` (${count})` : ''}</button>
  )
  const dueColor = (n: number) => (n < 0 ? t.danger : n <= 15 ? t.warning : t.textSecondary)

  const card = (r: RtmInspection, withLink: boolean) => {
    const wa = r.client_phone ? reminderLink(r.client_phone, r.plate, workshop.name, r.days_left) : null
    return (
      <div key={r.id} style={{ padding: 16, borderRadius: 16, background: t.cardBg, border: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '.04em', color: t.gold }}>{r.plate}</div>
            <div style={{ fontSize: 12, color: t.textMuted }}>Certificado {r.certificate_code}</div>
          </div>
          {r.result === 'approved' ? badge('Aprobada', t.success) : badge('No aprobada', t.danger)}
        </div>
        <div style={{ fontSize: 13, color: t.textSecondary, lineHeight: 1.6 }}>
          Revisada el {fmtDate(r.inspected_on)} · {formatKm(r.mileage_km)}<br />
          <b style={{ color: dueColor(r.days_left) }}>{daysLabel(r.days_left)}</b> ({fmtDate(r.expires_on)})
          {r.claimed && <><br /><span style={{ color: t.success }}>Constancia aceptada por el propietario{r.client_name ? ` · ${r.client_name}` : ''}</span></>}
          {r.claim_pending && <><br /><span style={{ color: t.warning }}>Constancia pendiente de aceptar</span></>}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!r.claimed && <button onClick={() => setClaimFor(r)} style={{ ...small, color: t.gold, borderColor: t.border }}>Constancia al propietario</button>}
          {withLink && wa && <a href={wa} target="_blank" rel="noopener noreferrer" style={{ ...small, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Recordar por WhatsApp</a>}
          {withLink && !wa && <span style={{ fontSize: 12, color: t.textMuted, alignSelf: 'center' }}>Sin contacto: el propietario no lo ha compartido</span>}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: t.textSecondary, maxWidth: '72ch' }}>
        Registra cada revisión técnico-mecánica y entrégale una constancia al propietario: al aceptarla, su vehículo recibe la vigencia y, si coincide con su historial, el kilometraje certificado por tu CDA.
      </p>
      {!canCertify && (
        <div role="status" style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(255,138,61,0.08)', border: '1px solid rgba(255,138,61,0.28)', fontSize: 12.5, lineHeight: 1.55, color: t.textPrimary }}>
          {workshop.is_verified
            ? 'Registrar revisiones requiere una habilitación aparte de CarLink (validamos tu habilitación como CDA). Escríbenos a business@carlink.com.co para activarla.'
            : 'Tu CDA aún no está verificado: no puedes registrar revisiones todavía.'}
        </div>
      )}
      {note && <div role="status" style={{ fontSize: 13, fontWeight: 700, color: note.ok ? t.success : t.danger }}>{note.text}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{tabBtn('registrar', 'Registrar revisión')}{tabBtn('historial', 'Historial', rows.length)}{tabBtn('vencer', 'Por vencer', due.length)}</div>

      {tab === 'registrar' && (
        <div style={{ padding: 20, borderRadius: 18, background: t.cardBg, border: `1px solid ${t.border}`, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,210px),1fr))', gap: 12 }}>
          <div><label style={labelStyle(t)} htmlFor="rt-plate">Placa *</label><input id="rt-plate" style={inputStyle(t)} value={form.plate} maxLength={8} placeholder="ABC123" onChange={e => set('plate', e.target.value.toUpperCase())} /></div>
          <div><label style={labelStyle(t)} htmlFor="rt-cert">Número de certificado *</label><input id="rt-cert" style={inputStyle(t)} value={form.certificate_code} maxLength={40} placeholder="RTM-2026-001234" onChange={e => set('certificate_code', e.target.value.toUpperCase())} /></div>
          <div><label style={labelStyle(t)} htmlFor="rt-res">Resultado *</label>
            <ThemedSelect id="rt-res" value={form.result === 'approved' ? 'Aprobada' : 'No aprobada'} options={['Aprobada', 'No aprobada']} theme={selectTheme(t)} onChange={v => set('result', v === 'Aprobada' ? 'approved' : 'rejected')} /></div>
          <div><label style={labelStyle(t)} htmlFor="rt-date">Fecha de la revisión *</label><ThemedDateInput id="rt-date" className="date-field" style={inputStyle(t)} value={form.inspected_on} max={todayIso()} onChange={e => set('inspected_on', e.target.value)} /></div>
          <div><label style={labelStyle(t)} htmlFor="rt-exp">{form.result === 'approved' ? 'Vigente hasta *' : 'Nueva revisión antes de *'}</label><ThemedDateInput id="rt-exp" className="date-field" style={inputStyle(t)} value={form.expires_on} onChange={e => set('expires_on', e.target.value)} /></div>
          <div><label style={labelStyle(t)} htmlFor="rt-km">Kilometraje del odómetro *</label><input id="rt-km" style={inputStyle(t)} inputMode="numeric" value={form.mileage_km || ''} placeholder="45000" onChange={e => set('mileage_km', e.target.value)} /></div>
          <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle(t)} htmlFor="rt-notes">Observaciones</label><textarea id="rt-notes" style={{ ...inputStyle(t), minHeight: 64, resize: 'vertical' }} value={form.notes} maxLength={300} onChange={e => set('notes', e.target.value)} /></div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={submit} disabled={saving || !canCertify} style={primaryBtnStyle(t, saving || !canCertify)}>{saving ? 'Registrando...' : 'Registrar revisión'}</button>
            <span style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.5, flex: '1 1 260px' }}>El kilometraje se compara con el historial de la placa en CarLink y no puede ser menor. Hay 3 intentos por placa cada 24 horas.</span>
          </div>
        </div>
      )}

      {tab === 'historial' && (loading ? <div style={{ color: t.textMuted, padding: 20 }}>Cargando...</div> : rows.length === 0
        ? <div style={{ padding: 40, textAlign: 'center', border: `1px dashed ${t.border}`, borderRadius: 18, color: t.textMuted }}>Aún no has registrado revisiones.</div>
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 14 }}>{rows.map(r => card(r, false))}</div>)}

      {tab === 'vencer' && (loading ? <div style={{ color: t.textMuted, padding: 20 }}>Cargando...</div> : due.length === 0
        ? <div style={{ padding: 40, textAlign: 'center', border: `1px dashed ${t.border}`, borderRadius: 18, color: t.textMuted }}>Ninguna revisión vence en los próximos 45 días.</div>
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 14 }}>{due.map(r => card(r, true))}</div>)}

      {claimFor && (
        <ClaimLinkModal t={t} theme={theme} title={`Constancia de ${claimFor.plate}`} pathPrefix="/constancia"
          intro="Comparte este enlace o QR con el propietario. Al abrirlo e iniciar sesión, la revisión queda registrada en el vehículo de su cuenta con tu certificado y su vigencia."
          footnote="El propietario decide si te comparte su nombre y WhatsApp; solo así podrás recordarle el próximo vencimiento. Si su vehículo no está en CarLink, deberá registrarlo primero."
          shareText={(url, name) => `Hola, ${name} registró la revisión técnico-mecánica de tu vehículo. Guárdala en tu cuenta de CarLink: ${url}`}
          generate={async () => { const r = await rtmApi.claimLink(claimFor.id); if (r.ok && r.data) { void load(); return r.data } setNote({ ok: false, text: dealerError(r.detail) }); return null }}
          onClose={() => setClaimFor(null)} />
      )}
    </div>
  )
}
