'use client'

import dynamic from 'next/dynamic'
import { useMemo, useRef, useState } from 'react'
import { track } from '@/lib/analytics'
import { LEGAL_VERSION } from '@/lib/legalContent'
import {
  BUSINESS_KINDS, CITIES, CONTACT_ROLES, SPECIALTIES, checkNit, emailSuggestion, formatPhone, fromScan, hasToken, normalizeInstagram,
  normalizeWebsite, specialtiesMode, toggleToken, validEmail, validPhone, type ScannedFields,
} from '@/lib/tallerForm'

import HelpTip from './HelpTip'
import ThemedSelect from '@/components/ThemedSelect'
import ThemedSuggestInput from '@/components/ThemedSuggestInput'

const UbicacionModal = dynamic(() => import('./UbicacionModal'), { ssr: false })
const ScanCameraModal = dynamic(() => import('./ScanCameraModal'), { ssr: false })

/* Formulario público de postulación de talleres, proveedores y negocios del sector
   (landing /taller). Sin cuenta: POST /api/workshop-applications y, antes, un upload
   público por archivo (/api/workshop-applications/upload). La solicitud queda "pendiente"
   hasta que el admin la revisa (docs/PLAN_LANDING_TALLERES.md).
   Ayudas: lectura automática de la Cámara de Comercio (/scan), confirmación de la dirección
   en el mapa, validación por campo con sugerencias y opciones para no escribir de cero. */

const GOLD = '#F5C518'
const RED = '#ff6b6b'
const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

// Subtipo: solo para el tipo "Taller o servicio automotriz".
const BUSINESS_TYPES: { v: string; l: string }[] = [
  { v: 'mecanica_general', l: 'Taller de mecánica general' },
  { v: 'latoneria_pintura', l: 'Latonería y pintura' },
  { v: 'llantas_alineacion', l: 'Llantas y alineación' },
  { v: 'electrico', l: 'Eléctrico / electrónico' },
  { v: 'lubricentro', l: 'Lubricentro' },
  { v: 'tecnicentro', l: 'Tecnicentro multimarca' },
  { v: 'otro', l: 'Otro negocio del sector' },
]

const ERRORS: Record<string, string> = {
  nit_invalid: 'El NIT no es válido. Escríbelo con dígito de verificación, por ejemplo 900123456-8.',
  email_invalid: 'Ese correo no parece válido.',
  phone_invalid: 'Ese teléfono no parece válido.',
  location_invalid: 'La ubicación elegida está fuera de Colombia. Confírmala de nuevo en el mapa.',
  consent_required: 'Debes aceptar el tratamiento de datos para postularte.',
  already_registered: 'Ese NIT ya está registrado como taller en CarLink. Inicia sesión con tu cuenta.',
  rate_limited: 'Has hecho demasiadas solicitudes. Intenta de nuevo en un rato.',
  file_type_not_allowed: 'Solo se aceptan imágenes PNG, JPG o WebP (y PDF en el documento).',
  file_too_large: 'El archivo pesa demasiado (máximo 2 MB para imágenes y 5 MB para PDF).',
  logo_unreadable: 'No pudimos leer esa imagen. Sube tu logo en PNG, JPG o WebP.',
  logo_too_small: 'El logo es muy pequeño y se vería borroso. Sube una imagen de al menos 120 px por lado (ideal 400 px o más).',
  logo_too_large_dimensions: 'La imagen es demasiado grande. Reduce el logo a máximo 6000 px por lado.',
  logo_bad_ratio: 'El logo es muy alargado o muy alto. Sube una versión más cuadrada o apaisada (hasta 5 veces más ancha que alta).',
  logo_blank: 'La imagen parece estar vacía. Revisa que sea tu logo.',
}

type Key = 'business_kind' | 'business_type' | 'name' | 'legal_name' | 'nit' | 'city' | 'address' | 'contact_name' | 'contact_role' | 'phone' | 'email' | 'website' | 'instagram' | 'specialties'
type Values = Record<Key, string>
const EMPTY: Values = {
  business_kind: '', business_type: '', name: '', legal_name: '', nit: '', city: '', address: '', contact_name: '', contact_role: '',
  phone: '', email: '', website: '', instagram: '', specialties: '',
}
const ORDER: Key[] = ['business_kind', 'business_type', 'name', 'legal_name', 'nit', 'city', 'address', 'contact_name', 'contact_role', 'phone', 'email', 'website', 'instagram', 'specialties']

function validate(f: Values): Partial<Record<Key, string>> {
  const e: Partial<Record<Key, string>> = {}
  if (!f.business_kind) e.business_kind = 'Elige qué tipo de negocio es.'
  if (f.business_kind === 'taller' && !f.business_type) e.business_type = 'Elige el tipo de taller.'
  if (f.name.trim().length < 2) e.name = 'Escribe el nombre con el que te conocen tus clientes.'
  if (f.legal_name.trim() && f.legal_name.trim().length < 3) e.legal_name = 'Escribe la razón social completa, tal como aparece en tu RUT.'
  const nit = checkNit(f.nit)
  if (!f.nit.trim()) e.nit = 'Escribe el NIT de tu negocio.'
  else if (nit.status === 'missing_dv') e.nit = `Falta el dígito de verificación. Con él quedaría ${nit.suggestion}.`
  else if (nit.status === 'bad_dv') e.nit = `El dígito de verificación no coincide: para ese número debería ser ${nit.suggestion.split('-')[1]}. Revisa el NIT en tu RUT.`
  else if (nit.status === 'invalid') e.nit = 'El NIT solo lleva números y el dígito después del guion, por ejemplo 900123456-8.'
  if (f.city.trim().length < 2) e.city = 'Escribe la ciudad o elige una de la lista.'
  if (f.address.trim().length < 4) e.address = 'Escribe la dirección, por ejemplo Calle 72 # 10-34.'
  else if (!/\d/.test(f.address)) e.address = 'La dirección debería llevar al menos un número, por ejemplo Calle 72 # 10-34.'
  if (f.contact_name.trim().length < 2) e.contact_name = 'Escribe el nombre de la persona de contacto.'
  if (!validPhone(f.phone)) e.phone = 'Escribe un celular de 10 dígitos que empiece en 3 (300 123 4567) o un fijo con indicativo.'
  if (!f.email.trim()) e.email = 'Escribe el correo donde te responderemos.'
  else if (!validEmail(f.email)) e.email = 'Ese correo no parece válido. Debe verse así: nombre@dominio.com'
  if (normalizeWebsite(f.website) === null) e.website = 'Escribe un sitio web válido, por ejemplo mitaller.com.'
  if (normalizeInstagram(f.instagram) === null) e.instagram = 'Escribe solo tu usuario, por ejemplo @mitaller.'
  return e
}

interface Props {
  onOpenPolicy: () => void
  isDark: boolean
  muted: string
  border: string
  card: string
  textColor: string
}

type FileState = { url: string; name: string } | null

const IMAGE_MAX_EDGE = 2400

/** Reduce las fotos del celular (varios MB) para que pasen el tope del servidor y el OCR sea más rápido. */
async function prepareImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, IMAGE_MAX_EDGE / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    for (const q of [0.85, 0.7, 0.55]) {
      const blob: Blob | null = await new Promise(r => canvas.toBlob(r, 'image/jpeg', q))
      if (blob && blob.size <= 1.9 * 1024 * 1024) return new File([blob], 'camara-de-comercio.jpg', { type: 'image/jpeg' })
    }
  } catch { /* si el navegador no puede procesarla se manda tal cual */ }
  return file
}

export default function PostulacionForm({ onOpenPolicy, isDark, muted, border, card, textColor }: Props) {
  const [f, setF] = useState<Values>(EMPTY)
  const [touched, setTouched] = useState<Partial<Record<Key, boolean>>>({})
  const [attempted, setAttempted] = useState(false)
  const [auto, setAuto] = useState<Partial<Record<Key, boolean>>>({})
  const [loc, setLoc] = useState<{ lat: number; lng: number; sig: string } | null>(null)
  const [mapOpen, setMapOpen] = useState(false)
  const [camOpen, setCamOpen] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)     // subir foto o PDF
  const captureInput = useRef<HTMLInputElement>(null)  // respaldo si el navegador no deja abrir la cámara (p. ej. sin HTTPS)
  const [scan, setScan] = useState<{ status: 'idle' | 'reading' | 'done' | 'fail'; msg: string }>({ status: 'idle', msg: '' })
  const [logo, setLogo] = useState<FileState>(null)
  const [doc, setDoc] = useState<FileState>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [consent, setConsent] = useState(false)
  const [logoAuth, setLogoAuth] = useState(false)
  const [trap, setTrap] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  const errs = useMemo(() => validate(f), [f])
  const show = (k: Key) => (touched[k] || attempted ? errs[k] : undefined)
  const addrSig = `${f.address.trim().toLowerCase()}|${f.city.trim().toLowerCase()}`
  const locOk = loc !== null && loc.sig === addrSig

  const begin = () => { if (!started.current) { started.current = true; track('taller_form_start') } }
  const update = (k: Key, v: string) => {
    begin(); setF(p => ({ ...p, [k]: v })); setError(null)
    if (auto[k]) setAuto(p => ({ ...p, [k]: false }))
  }
  const set = (k: Key) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => update(k, e.target.value)
  const blur = (k: Key) => () => {
    setTouched(p => ({ ...p, [k]: true }))
    // Al salir del campo se deja en su forma limpia, para que lo que se envía sea lo que se ve.
    if (k === 'nit') { const c = checkNit(f.nit); if (c.status === 'ok' && c.value !== f.nit) setF(p => ({ ...p, nit: c.value })) }
    if (k === 'phone' && validPhone(f.phone)) setF(p => ({ ...p, phone: formatPhone(p.phone) }))
    if (k === 'email') setF(p => ({ ...p, email: p.email.trim() }))
    if (k === 'website') { const w = normalizeWebsite(f.website); if (w) setF(p => ({ ...p, website: w })) }
    if (k === 'instagram') { const i = normalizeInstagram(f.instagram); if (i) setF(p => ({ ...p, instagram: i })) }
  }

  const pickTheme = { inputBg: isDark ? 'rgba(255,255,255,0.04)' : '#fff', inputBorder: border, inputText: textColor, accent: GOLD, muted, panelBg: isDark ? '#1d1d1d' : '#ffffff' }
  const input = (k: Key | null): React.CSSProperties => ({
    width: '100%', padding: '0 14px', height: 46, boxSizing: 'border-box', borderRadius: 11, fontSize: 14.5, fontFamily: 'inherit', outline: 'none',
    background: isDark ? 'rgba(255,255,255,0.04)' : '#fff', color: textColor,
    border: `1px solid ${k && show(k) ? RED : k && auto[k] ? GOLD : border}`,
    boxShadow: k && auto[k] && !show(k) ? '0 0 0 3px rgba(245,197,24,0.14)' : 'none',
  })
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: muted, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '.02em' }
  const helpStyle: React.CSSProperties = { fontSize: 12, lineHeight: 1.4, color: muted, marginTop: 5 }
  const chip = (on: boolean): React.CSSProperties => ({
    padding: '5px 11px', borderRadius: 999, fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer',
    border: `1px solid ${on ? GOLD : border}`, background: on ? 'rgba(245,197,24,0.16)' : 'transparent', color: on ? GOLD : muted, fontWeight: on ? 700 : 500,
  })
  const linkBtn: React.CSSProperties = { background: 'none', border: 'none', padding: 0, color: GOLD, fontWeight: 700, cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit', textDecoration: 'underline' }

  /* `help` sale como mensaje flotante del botón "?" junto a la etiqueta (no ocupa espacio en el formulario);
     `inline` es solo para avisos con acción que no pueden esconderse (p. ej. "¿Quisiste decir ...?"). */
  const field = (k: Key, label: string, control: React.ReactNode, help?: React.ReactNode, required = false, fix?: React.ReactNode, span = false, inline?: React.ReactNode) => (
    <div style={span ? { gridColumn: '1 / -1' } : undefined}>
      <div style={{ ...labelStyle, minHeight: 18, position: 'relative' }}>
        <label htmlFor={`ap-${k}`} style={{ cursor: 'pointer' }}>{label}{required ? ' *' : ''}</label>
        {help ? <HelpTip label={label} isDark={isDark} border={border} muted={muted} textColor={textColor}>{help}</HelpTip> : null}
        {auto[k] && <span style={{ fontSize: 10.5, fontWeight: 700, color: GOLD, letterSpacing: '.06em', textTransform: 'uppercase' }}>Del documento</span>}
      </div>
      {control}
      {show(k)
        ? <div id={`ap-${k}-err`} role="alert" style={{ ...helpStyle, color: RED, fontWeight: 600 }}>{errs[k]}{fix ? <> {fix}</> : null}</div>
        : inline ? <div style={helpStyle}>{inline}</div> : null}
    </div>
  )
  const aria = (k: Key) => ({ 'aria-invalid': !!show(k), 'aria-describedby': show(k) ? `ap-${k}-err` : undefined })

  const upload = async (file: File, slot: 'logo' | 'doc') => {
    setError(null); setUploading(slot)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch(`${API_BASE}/api/workshop-applications/upload${slot === 'logo' ? '?kind=logo' : ''}`, { method: 'POST', body: fd })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(ERRORS[j.detail] || 'No pudimos subir el archivo. Intenta de nuevo.'); return }
      const v = { url: j.url as string, name: file.name }
      if (slot === 'logo') setLogo(v); else setDoc(v)
    } catch { setError('No pudimos subir el archivo. Revisa tu conexión.') } finally { setUploading(null) }
  }

  const scanDoc = async (raw: File) => {
    begin(); setError(null); setScan({ status: 'reading', msg: 'Leyendo tu documento...' })
    track('taller_form_scan')
    try {
      const file = await prepareImage(raw)
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch(`${API_BASE}/api/workshop-applications/scan`, { method: 'POST', body: fd })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = res.status === 503 ? 'La lectura automática no está disponible ahora. Llena el formulario a mano.' : (ERRORS[j.detail] || 'No pudimos leer ese archivo. Llena el formulario a mano.')
        setScan({ status: 'fail', msg }); return
      }
      const found = fromScan((j.fields || {}) as ScannedFields)
      const keys = Object.keys(found) as Key[]
      if (j.doc_url) setDoc({ url: j.doc_url, name: j.doc_name || 'camara-de-comercio' })
      if (!keys.length) { setScan({ status: 'fail', msg: 'No pudimos leer datos de ese documento (el archivo quedó adjunto). Llena el formulario a mano.' }); return }
      setF(p => ({ ...p, ...found }))
      setAuto(Object.fromEntries(keys.map(k => [k, true])))
      setTouched(p => ({ ...p, ...Object.fromEntries(keys.map(k => [k, true])) }))
      setLoc(null)
      setScan({ status: 'done', msg: `Leímos ${keys.length} dato${keys.length === 1 ? '' : 's'}. Revisa los campos marcados, corrige lo que haga falta y completa el resto.` })
      track('taller_form_scan_ok', { fields: keys.length })
    } catch { setScan({ status: 'fail', msg: 'No pudimos leer el documento. Revisa tu conexión o llena el formulario a mano.' }) }
  }

  const focusFirstError = (e: Partial<Record<Key, string>>) => {
    const first = ORDER.find(k => e[k])
    if (first) { const el = document.getElementById(`ap-${first}`); el?.scrollIntoView({ block: 'center', behavior: 'smooth' }); (el as HTMLElement | null)?.focus({ preventScroll: true }) }
  }

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setAttempted(true)
    if (Object.keys(errs).length) { setError('Revisa los campos marcados en rojo.'); focusFirstError(errs); return }
    if (!consent) { setError(ERRORS.consent_required); return }
    const nit = checkNit(f.nit)
    if (nit.status !== 'ok') return
    setStatus('sending'); setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/workshop-applications`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...f, specialties: specialtiesMode(f.business_kind) ? f.specialties : '', nit: nit.value, phone: formatPhone(f.phone), email: f.email.trim(),
          website: normalizeWebsite(f.website) || '', instagram: normalizeInstagram(f.instagram) || '',
          logo_url: logo?.url || '', doc_url: doc?.url || '',
          latitude: locOk ? loc!.lat : null, longitude: locOk ? loc!.lng : null,
          logo_authorized: logoAuth, consent_accepted: consent, consent_version: LEGAL_VERSION,
          source: 'landing_taller', website_confirm: trap,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(ERRORS[j.detail] || 'No pudimos enviar tu postulación. Intenta de nuevo o escríbenos.')
        setStatus('idle'); return
      }
      track('taller_form_submit', { kind: f.business_kind, type: f.business_type })
      setStatus('done')
    } catch { setError('No pudimos enviar tu postulación. Revisa tu conexión.'); setStatus('idle') }
  }

  if (status === 'done') {
    return (
      <div style={{ padding: 32, borderRadius: 20, background: card, border: `1px solid rgba(245,197,24,0.35)`, textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, color: textColor }}>Recibimos tu postulación</div>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: muted }}>
          Vamos a validar los datos de <b style={{ color: textColor }}>{f.name}</b> y te escribiremos a <b style={{ color: textColor }}>{f.email}</b> con el resultado. Revisa también la carpeta de spam.
        </p>
      </div>
    )
  }

  const fileBtn = (slot: 'logo' | 'doc', value: FileState, accept: string, title: string, required = false) => (
    <div>
      <span style={labelStyle}>{title}{required ? ' *' : ''}</span>
      <label style={{ ...input(null), border: `1px dashed ${border}`, boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, cursor: 'pointer' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: value ? textColor : muted }}>
          {uploading === slot ? 'Subiendo...' : value ? value.name : 'Elegir archivo'}
        </span>
        <span style={{ color: GOLD, fontWeight: 700, fontSize: 13 }}>{value ? 'Cambiar' : 'Subir'}</span>
        <input type="file" accept={accept} style={{ display: 'none' }} onChange={e => { const file = e.target.files?.[0]; if (file) upload(file, slot); e.target.value = '' }} />
      </label>
    </div>
  )

  const nitFix = (() => { const c = checkNit(f.nit); return c.status === 'missing_dv' || c.status === 'bad_dv'
    ? <button type="button" style={linkBtn} onClick={() => update('nit', c.suggestion)}>Usar {c.suggestion}</button> : null })()
  const mailFix = (() => { const s = emailSuggestion(f.email); return s ? <button type="button" style={linkBtn} onClick={() => update('email', s)}>¿Quisiste decir {s}?</button> : null })()
  const mailTypo = !show('email') && validEmail(f.email) ? emailSuggestion(f.email) : null

  return (
    <form onSubmit={submit} noValidate style={{ padding: 'clamp(20px,3vw,32px)', borderRadius: 22, background: card, border: `1px solid ${border}`, display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Atajo sutil: escanear la Cámara de Comercio o el RUT con la cámara y llenar todo; o subir la foto/PDF. Sin esto se llena a mano. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px 14px', flexWrap: 'wrap', padding: '10px 14px', borderRadius: 12, border: `1px dashed ${scan.status === 'done' ? GOLD : border}` }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, minWidth: 0, maxWidth: '100%' }}>
        <button type="button" disabled={scan.status === 'reading'} onClick={() => (typeof navigator.mediaDevices?.getUserMedia === 'function' ? setCamOpen(true) : captureInput.current?.click())}
          title="Abre la cámara para escanear tu Cámara de Comercio o tu RUT"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: scan.status === 'reading' ? 'wait' : 'pointer', color: GOLD, fontWeight: 700, fontSize: 13.5, textAlign: 'left', background: 'none', border: 'none', padding: 0, fontFamily: 'inherit' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" /><path d="M7 12h10" />
          </svg>
          {scan.status === 'reading' ? 'Leyendo...' : 'Escanear Cámara de Comercio o RUT'}
        </button>
          <button type="button" disabled={scan.status === 'reading'} onClick={() => fileInput.current?.click()} style={{ ...linkBtn, fontSize: 12.5, flexShrink: 0, paddingLeft: 28 }}>Subir foto o PDF</button>
        </div>
        <span role="status" style={{ fontSize: 12.5, lineHeight: 1.45, color: scan.status === 'fail' ? '#ffb347' : muted, flex: '1 1 220px', minWidth: 0 }}>
          {scan.msg || 'Apunta la cámara a tu Cámara de Comercio o a tu RUT (cualquiera de los dos sirve) y llenamos el formulario por ti. Luego solo verificas. Si prefieres, llénalo a mano.'}
        </span>
        <input ref={fileInput} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => { const file = e.target.files?.[0]; if (file) void scanDoc(file); e.target.value = '' }} />
        <input ref={captureInput} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => { const file = e.target.files?.[0]; if (file) void scanDoc(file); e.target.value = '' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: '14px 16px', alignItems: 'start' }}>
        {field('business_kind', 'Tipo de negocio',
          <ThemedSelect id="ap-business_kind" height={46} value={BUSINESS_KINDS.find(k => k.v === f.business_kind)?.l ?? ''} placeholder="Selecciona..." options={BUSINESS_KINDS.map(k => k.l)} theme={pickTheme}
            invalid={!!show('business_kind')} describedBy={show('business_kind') ? 'ap-business_kind-err' : undefined} onBlur={blur('business_kind')}
            onChange={label => { const v = BUSINESS_KINDS.find(k => k.l === label)?.v ?? ''; update('business_kind', v); if (v !== 'taller') update('business_type', '') }} />,
          BUSINESS_KINDS.find(k => k.v === f.business_kind)?.hint, true, null, true)}

        {f.business_kind === 'taller' && field('business_type', 'Tipo de taller',
          <ThemedSelect id="ap-business_type" height={46} value={BUSINESS_TYPES.find(t => t.v === f.business_type)?.l ?? ''} placeholder="Selecciona..." options={BUSINESS_TYPES.map(t => t.l)} theme={pickTheme}
            invalid={!!show('business_type')} describedBy={show('business_type') ? 'ap-business_type-err' : undefined} onBlur={blur('business_type')}
            onChange={label => update('business_type', BUSINESS_TYPES.find(t => t.l === label)?.v ?? '')} />, undefined, true, null, true)}

        {field('name', 'Nombre comercial',
          <input id="ap-name" maxLength={120} autoComplete="organization" placeholder="Ej. Frenos y Más Duitama" value={f.name} onChange={set('name')} onBlur={blur('name')} style={input('name')} {...aria('name')} />,
          'El nombre con el que te conocen tus clientes, el de la fachada.', true)}

        {field('legal_name', 'Razón social',
          <input id="ap-legal_name" maxLength={160} placeholder="Ej. Inversiones Pérez S.A.S." value={f.legal_name} onChange={set('legal_name')} onBlur={blur('legal_name')} style={input('legal_name')} {...aria('legal_name')} />,
          <>
            Es el nombre legal que aparece en tu RUT o Cámara de Comercio. Si no tienes empresa constituida, es tu nombre completo. Opcional.
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {f.name.trim().length >= 2 && <button type="button" style={chip(false)} onClick={() => update('legal_name', f.name.trim())}>Igual al nombre comercial</button>}
              {f.contact_name.trim().length >= 2 && <button type="button" style={chip(false)} onClick={() => update('legal_name', f.contact_name.trim())}>Persona natural: usar mi nombre</button>}
            </div>
          </>)}

        {field('nit', 'NIT (con dígito de verificación)',
          <input id="ap-nit" inputMode="numeric" autoComplete="off" placeholder="900123456-8" maxLength={20} value={f.nit}
            onChange={e => update('nit', e.target.value.replace(/[^\d.\-\s]/g, ''))} onBlur={blur('nit')} style={input('nit')} {...aria('nit')} />,
          'Está en tu RUT. Si no sabes el dígito después del guion, escribe solo el número y te lo calculamos.', true, nitFix)}

        {field('city', 'Ciudad',
          <ThemedSuggestInput id="ap-city" value={f.city} onChange={v => update('city', v)} suggestions={CITIES} placeholder="Empieza a escribir..." theme={pickTheme} maxLength={80} autoComplete="address-level2"
            invalid={!!show('city')} describedBy={show('city') ? 'ap-city-err' : undefined} onBlur={blur('city')} style={input('city')} />, undefined, true)}

        {field('address', 'Dirección',
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'stretch' }}>
            <input id="ap-address" maxLength={200} autoComplete="street-address" placeholder="Ej. Calle 72 # 10-34, barrio Chapinero" value={f.address} onChange={set('address')} onBlur={blur('address')} style={{ ...input('address'), flex: '1 1 220px', width: 'auto', minWidth: 0 }} {...aria('address')} />
            <button type="button" onClick={() => { setTouched(p => ({ ...p, address: true, city: true })); if (errs.address || errs.city) return; setMapOpen(true) }}
              title="Ver la dirección en el mapa y confirmar el punto exacto"
              style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0 14px', height: 46, boxSizing: 'border-box', borderRadius: 11, border: `1px solid ${locOk ? GOLD : border}`, background: locOk ? 'rgba(245,197,24,0.14)' : 'transparent', color: locOk ? GOLD : textColor, fontWeight: 700, fontSize: 13.5, fontFamily: 'inherit', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
              {locOk ? 'Ubicación confirmada' : 'Ver en mapa'}
            </button>
          </div>,
          locOk ? 'Guardamos el punto que confirmaste en el mapa. Si cambias la dirección, hay que confirmarlo de nuevo.' : 'Escribe la dirección y toca "Ver en mapa" para confirmar el punto exacto de tu negocio.', true, null, true)}

        {field('contact_name', 'Nombre de contacto',
          <input id="ap-contact_name" maxLength={120} autoComplete="name" placeholder="Nombre y apellido" value={f.contact_name} onChange={set('contact_name')} onBlur={blur('contact_name')} style={input('contact_name')} {...aria('contact_name')} />,
          undefined, true)}

        {field('contact_role', 'Cargo',
          <ThemedSuggestInput id="ap-contact_role" value={f.contact_role} onChange={v => update('contact_role', v)} suggestions={CONTACT_ROLES} placeholder="Ej. Propietario" theme={pickTheme} maxLength={80}
            onBlur={blur('contact_role')} style={input('contact_role')} />)}

        {field('phone', 'WhatsApp o teléfono',
          <input id="ap-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="300 123 4567" value={f.phone} onChange={set('phone')} onBlur={blur('phone')} style={input('phone')} {...aria('phone')} />,
          'Preferiblemente tu WhatsApp: ahí te avisamos.', true)}

        {field('email', 'Correo',
          <input id="ap-email" type="email" autoComplete="email" placeholder="nombre@tutaller.com" value={f.email} onChange={set('email')} onBlur={blur('email')} style={input('email')} {...aria('email')} />,
          'Aquí te enviamos el resultado de la validación.', true, mailFix, false, mailTypo ? <>Revisa el dominio. {mailFix}</> : undefined)}

        {field('website', 'Sitio web',
          <input id="ap-website" maxLength={200} inputMode="url" autoComplete="url" placeholder="mitaller.com" value={f.website} onChange={set('website')} onBlur={blur('website')} style={input('website')} {...aria('website')} />,
          'Opcional.')}

        {field('instagram', 'Instagram',
          <input id="ap-instagram" maxLength={200} autoComplete="off" placeholder="@mitaller" value={f.instagram} onChange={set('instagram')} onBlur={blur('instagram')} style={input('instagram')} {...aria('instagram')} />,
          'Opcional. Tu usuario o el enlace de tu perfil.')}

        {specialtiesMode(f.business_kind) === 'taller' && field('specialties', 'Especialidades',
          <>
            <input id="ap-specialties" maxLength={300} placeholder="Elige abajo o escribe las tuyas" value={f.specialties} onChange={set('specialties')} onBlur={blur('specialties')} style={input('specialties')} />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {SPECIALTIES.map(s => <button key={s} type="button" aria-pressed={hasToken(f.specialties, s)} style={chip(hasToken(f.specialties, s))} onClick={() => update('specialties', toggleToken(f.specialties, s))}>{s}</button>)}
            </div>
          </>, undefined, false, null, true)}

        {specialtiesMode(f.business_kind) === 'brands' && field('specialties', 'Marcas que vendes',
          <input id="ap-specialties" maxLength={300} placeholder="Ej. Chevrolet, Renault, Mazda" value={f.specialties} onChange={set('specialties')} onBlur={blur('specialties')} style={input('specialties')} />,
          'Opcional. Separa las marcas con comas.', false, null, true)}

        <div style={{ gridColumn: '1 / -1' }}>
          {fileBtn('logo', logo, 'image/png,image/jpeg,image/webp', 'Logo (opcional · PNG, JPG o WebP, mín. 120 px, máx. 2 MB)')}
          <span style={{ display: 'block', marginTop: 6, fontSize: 12, lineHeight: 1.45, color: muted }}>Si no tienes logo, puedes postularte igual. Si lo subes, mejor con fondo transparente o liso; recortamos los márgenes y lo ajustamos. Se mostrará en tu perfil público.</span>
        </div>
      </div>

      {/* Campo trampa anti-bots: invisible para personas. */}
      <input tabIndex={-1} autoComplete="off" aria-hidden="true" value={trap} onChange={e => setTrap(e.target.value)} style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} name="website_confirm" />

      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, lineHeight: 1.5, color: muted, cursor: 'pointer' }}>
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop: 3, accentColor: GOLD, width: 16, height: 16, flexShrink: 0 }} />
        <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>Autorizo a CarLink S.A.S. a tratar los datos de este formulario para validar mi negocio y contactarme, según la <button type="button" onClick={e => { e.preventDefault(); onOpenPolicy() }} style={{ ...linkBtn, fontWeight: 700 }}>Política de Privacidad</button> (Ley 1581 de 2012). *</span>
      </label>
      {logo && <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, lineHeight: 1.5, color: muted, cursor: 'pointer' }}>
        <input type="checkbox" checked={logoAuth} onChange={e => setLogoAuth(e.target.checked)} style={{ marginTop: 3, accentColor: GOLD, width: 16, height: 16, flexShrink: 0 }} />
        <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>Autorizo a CarLink a mostrar el nombre y el logo de mi negocio como aliado en su sitio web y materiales (opcional; puedes revocarlo escribiendo a business@carlink.com.co).</span>
      </label>}

      {error && <div role="alert" style={{ fontSize: 13.5, fontWeight: 600, color: RED }}>{error}</div>}

      <button type="submit" disabled={status === 'sending' || uploading !== null || scan.status === 'reading'} style={{ padding: '15px 30px', borderRadius: 13, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 16, cursor: 'pointer', opacity: status === 'sending' || uploading || scan.status === 'reading' ? 0.6 : 1 }}>
        {status === 'sending' ? 'Enviando...' : 'Enviar postulación'}
      </button>
      <p style={{ margin: 0, fontSize: 12, color: muted, textAlign: 'center' }}>Postularte no tiene costo. Te respondemos por correo.</p>

      {camOpen && (
        <ScanCameraModal isDark={isDark} border={border} muted={muted} textColor={textColor}
          onClose={() => setCamOpen(false)}
          onUpload={() => { setCamOpen(false); fileInput.current?.click() }}
          onCapture={file => { setCamOpen(false); void scanDoc(file) }} />
      )}
      {mapOpen && (
        <UbicacionModal address={f.address.trim()} city={f.city.trim()} initial={locOk ? [loc!.lat, loc!.lng] : null}
          onClose={() => setMapOpen(false)} onConfirm={(lat, lng) => { setLoc({ lat, lng, sig: addrSig }); setMapOpen(false) }}
          isDark={isDark} muted={muted} border={border} textColor={textColor} />
      )}
    </form>
  )
}
