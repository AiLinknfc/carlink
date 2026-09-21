'use client'

import { useRef, useState } from 'react'
import { track } from '@/lib/analytics'
import { LEGAL_VERSION } from '@/lib/legalContent'

/* Formulario público de postulación de talleres, proveedores y negocios del sector
   (landing /taller). Sin cuenta: POST /api/workshop-applications y, antes, un upload
   público por archivo (/api/workshop-applications/upload). La solicitud queda "pendiente"
   hasta que el admin la revisa (docs/PLAN_LANDING_TALLERES.md). */

const GOLD = '#F5C518'
const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

const BUSINESS_TYPES: { v: string; l: string }[] = [
  { v: 'mecanica_general', l: 'Taller de mecánica general' },
  { v: 'latoneria_pintura', l: 'Latonería y pintura' },
  { v: 'llantas_alineacion', l: 'Llantas y alineación' },
  { v: 'electrico', l: 'Eléctrico / electrónico' },
  { v: 'lubricentro', l: 'Lubricentro' },
  { v: 'tecnicentro', l: 'Tecnicentro multimarca' },
  { v: 'repuestos', l: 'Proveedor de repuestos' },
  { v: 'otro', l: 'Otro negocio del sector' },
]
const VOLUMES = ['Menos de 30 al mes', '30 a 100 al mes', 'Más de 100 al mes']

// Mismo algoritmo de dígito de verificación que backend/app/services/colombian_nit.py.
const NIT_WEIGHTS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]
function validNit(raw: string): boolean {
  const m = raw.trim().replace(/[\s.]/g, '').match(/^(\d{6,15})-(\d)$/)
  if (!m) return false
  const total = [...m[1]].reverse().reduce((a, d, i) => a + Number(d) * NIT_WEIGHTS[i], 0)
  const mod = total % 11
  return (mod === 0 || mod === 1 ? mod : 11 - mod) === Number(m[2])
}

const ERRORS: Record<string, string> = {
  nit_invalid: 'El NIT no es válido. Escríbelo con dígito de verificación, por ejemplo 900123456-8.',
  email_invalid: 'Ese correo no parece válido.',
  phone_invalid: 'Ese teléfono no parece válido.',
  consent_required: 'Debes aceptar el tratamiento de datos para postularte.',
  already_registered: 'Ese NIT ya está registrado como taller en CarLink. Inicia sesión con tu cuenta.',
  rate_limited: 'Has enviado demasiadas solicitudes. Intenta de nuevo en un rato.',
  file_type_not_allowed: 'Solo se aceptan imágenes PNG, JPG o WebP (y PDF en el documento).',
  file_too_large: 'El archivo pesa demasiado (máximo 2 MB para imágenes y 5 MB para PDF).',
  logo_required: 'Sube el logo de tu negocio.',
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

export default function PostulacionForm({ onOpenPolicy, isDark, muted, border, card, textColor }: Props) {
  const [f, setF] = useState({
    business_type: '', name: '', legal_name: '', nit: '', city: '', address: '', contact_name: '',
    contact_role: '', phone: '', email: '', website: '', instagram: '', specialties: '', monthly_volume: '',
  })
  const [logo, setLogo] = useState<FileState>(null)
  const [facade, setFacade] = useState<FileState>(null)
  const [doc, setDoc] = useState<FileState>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [consent, setConsent] = useState(false)
  const [logoAuth, setLogoAuth] = useState(false)
  const [trap, setTrap] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!started.current) { started.current = true; track('taller_form_start') }
    setF(p => ({ ...p, [k]: e.target.value })); setError(null)
  }

  const input: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: 11, fontSize: 14.5, fontFamily: 'inherit', outline: 'none',
    background: isDark ? 'rgba(255,255,255,0.04)' : '#fff', border: `1px solid ${border}`, color: textColor,
  }
  const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: muted, marginBottom: 6, display: 'block', letterSpacing: '.02em' }

  const upload = async (file: File, slot: 'logo' | 'facade' | 'doc') => {
    setError(null); setUploading(slot)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch(`${API_BASE}/api/workshop-applications/upload`, { method: 'POST', body: fd })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(ERRORS[j.detail] || 'No pudimos subir el archivo. Intenta de nuevo.'); return }
      const v = { url: j.url as string, name: file.name }
      if (slot === 'logo') setLogo(v); else if (slot === 'facade') setFacade(v); else setDoc(v)
    } catch { setError('No pudimos subir el archivo. Revisa tu conexión.') } finally { setUploading(null) }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validNit(f.nit)) { setError(ERRORS.nit_invalid); return }
    if (!f.business_type) { setError('Elige el tipo de negocio.'); return }
    if (!logo) { setError(ERRORS.logo_required); return }
    if (!consent) { setError(ERRORS.consent_required); return }
    setStatus('sending'); setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/workshop-applications`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...f, logo_url: logo.url, facade_url: facade?.url || '', doc_url: doc?.url || '',
          logo_authorized: logoAuth, consent_accepted: consent, consent_version: LEGAL_VERSION,
          source: 'landing_taller', website_confirm: trap,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(ERRORS[j.detail] || 'No pudimos enviar tu postulación. Intenta de nuevo o escríbenos.')
        setStatus('idle'); return
      }
      track('taller_form_submit', { type: f.business_type })
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

  const fileBtn = (slot: 'logo' | 'facade' | 'doc', value: FileState, accept: string, title: string, required = false) => (
    <div>
      <span style={label}>{title}{required ? ' *' : ''}</span>
      <label style={{ ...input, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, cursor: 'pointer', borderStyle: 'dashed' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: value ? textColor : muted }}>
          {uploading === slot ? 'Subiendo...' : value ? value.name : 'Elegir archivo'}
        </span>
        <span style={{ color: GOLD, fontWeight: 700, fontSize: 13 }}>{value ? 'Cambiar' : 'Subir'}</span>
        <input type="file" accept={accept} style={{ display: 'none' }} onChange={e => { const file = e.target.files?.[0]; if (file) upload(file, slot); e.target.value = '' }} />
      </label>
    </div>
  )

  return (
    <form onSubmit={submit} style={{ padding: 'clamp(20px,3vw,32px)', borderRadius: 22, background: card, border: `1px solid ${border}`, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div data-r="shopFormGrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={label} htmlFor="ap-type">Tipo de negocio *</label>
          <select id="ap-type" required value={f.business_type} onChange={set('business_type')} style={input}>
            <option value="">Selecciona...</option>
            {BUSINESS_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
        </div>
        <div><label style={label} htmlFor="ap-name">Nombre comercial *</label><input id="ap-name" required minLength={2} maxLength={120} value={f.name} onChange={set('name')} style={input} /></div>
        <div><label style={label} htmlFor="ap-legal">Razón social</label><input id="ap-legal" maxLength={160} value={f.legal_name} onChange={set('legal_name')} style={input} /></div>
        <div><label style={label} htmlFor="ap-nit">NIT (con dígito de verificación) *</label><input id="ap-nit" required inputMode="numeric" placeholder="900123456-8" value={f.nit} onChange={set('nit')} style={input} /></div>
        <div><label style={label} htmlFor="ap-city">Ciudad *</label><input id="ap-city" required maxLength={80} value={f.city} onChange={set('city')} style={input} /></div>
        <div style={{ gridColumn: '1 / -1' }}><label style={label} htmlFor="ap-address">Dirección *</label><input id="ap-address" required minLength={4} maxLength={200} value={f.address} onChange={set('address')} style={input} /></div>
        <div><label style={label} htmlFor="ap-contact">Nombre de contacto *</label><input id="ap-contact" required maxLength={120} autoComplete="name" value={f.contact_name} onChange={set('contact_name')} style={input} /></div>
        <div><label style={label} htmlFor="ap-role">Cargo</label><input id="ap-role" maxLength={80} value={f.contact_role} onChange={set('contact_role')} style={input} /></div>
        <div><label style={label} htmlFor="ap-phone">WhatsApp o teléfono *</label><input id="ap-phone" required type="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} style={input} /></div>
        <div><label style={label} htmlFor="ap-email">Correo *</label><input id="ap-email" required type="email" autoComplete="email" value={f.email} onChange={set('email')} style={input} /></div>
        <div><label style={label} htmlFor="ap-web">Sitio web</label><input id="ap-web" maxLength={200} value={f.website} onChange={set('website')} style={input} /></div>
        <div><label style={label} htmlFor="ap-ig">Instagram</label><input id="ap-ig" maxLength={200} value={f.instagram} onChange={set('instagram')} style={input} /></div>
        <div style={{ gridColumn: '1 / -1' }}><label style={label} htmlFor="ap-spec">Especialidades</label><input id="ap-spec" maxLength={300} placeholder="Ej. frenos, suspensión, diagnóstico electrónico" value={f.specialties} onChange={set('specialties')} style={input} /></div>
        <div>
          <label style={label} htmlFor="ap-vol">Vehículos atendidos</label>
          <select id="ap-vol" value={f.monthly_volume} onChange={set('monthly_volume')} style={input}>
            <option value="">Selecciona...</option>
            {VOLUMES.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        {fileBtn('logo', logo, 'image/png,image/jpeg,image/webp', 'Logo (PNG, JPG o WebP, máx. 2 MB)', true)}
        {fileBtn('facade', facade, 'image/png,image/jpeg,image/webp', 'Foto de la fachada (opcional)')}
        {fileBtn('doc', doc, 'application/pdf,image/png,image/jpeg', 'Cámara de Comercio o RUT (opcional, agiliza la validación)')}
      </div>

      {/* Campo trampa anti-bots: invisible para personas. */}
      <input tabIndex={-1} autoComplete="off" aria-hidden="true" value={trap} onChange={e => setTrap(e.target.value)} style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} name="website_confirm" />

      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, lineHeight: 1.5, color: muted, cursor: 'pointer' }}>
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop: 3, accentColor: GOLD, width: 16, height: 16, flexShrink: 0 }} />
        <span>Autorizo a CarLink S.A.S. a tratar los datos de este formulario para validar mi negocio y contactarme, según la <button type="button" onClick={e => { e.preventDefault(); onOpenPolicy() }} style={{ background: 'none', border: 'none', padding: 0, color: GOLD, fontWeight: 700, cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit', textDecoration: 'underline' }}>Política de Privacidad</button> (Ley 1581 de 2012). *</span>
      </label>
      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, lineHeight: 1.5, color: muted, cursor: 'pointer' }}>
        <input type="checkbox" checked={logoAuth} onChange={e => setLogoAuth(e.target.checked)} style={{ marginTop: 3, accentColor: GOLD, width: 16, height: 16, flexShrink: 0 }} />
        <span>Autorizo a CarLink a mostrar el nombre y el logo de mi negocio como aliado en su sitio web y materiales (opcional; puedes revocarlo escribiendo a business@carlink.com.co).</span>
      </label>

      {error && <div role="alert" style={{ fontSize: 13.5, fontWeight: 600, color: '#ff6b6b' }}>{error}</div>}

      <button type="submit" disabled={status === 'sending' || uploading !== null} style={{ padding: '15px 30px', borderRadius: 13, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 16, cursor: 'pointer', opacity: status === 'sending' || uploading ? 0.6 : 1 }}>
        {status === 'sending' ? 'Enviando...' : 'Enviar postulación'}
      </button>
      <p style={{ margin: 0, fontSize: 12, color: muted, textAlign: 'center' }}>Postularte no tiene costo. Te respondemos por correo.</p>
    </form>
  )
}
