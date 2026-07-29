'use client'

import { useState } from 'react'
import { useAuth } from '@/store/auth'
import { uploadFile } from '@/lib/upload'
import { jobApplicationApi } from '@/lib/api'
import Link from 'next/link'

const ACTIVE_OFFERS = [
  {
    id: 'ventas-externo',
    title: 'Asesor comercial externo',
    area: 'Ventas',
    type: 'Contrato',
    location: 'Ciudades principales',
    description: 'Captar talleres aliados y conductores en ciudades principales. Experiencia en venta B2B y manejo de portafolio.',
  },
  {
    id: 'estrategia-ventas',
    title: 'Estrategia de ventas',
    area: 'Ventas',
    type: 'Tiempo completo',
    location: 'Bogotá',
    description: 'Diseñar y ejecutar estrategias de crecimiento comercial. Análisis de mercado, embudos de conversión y alianzas estratégicas.',
  },
]

const PAST_OFFERS = [
  {
    id: 'dev-frontend',
    title: 'Desarrollador Junior Frontend React / Next.js',
    area: 'Ingeniería',
    type: 'Tiempo completo',
    location: 'Remoto / Bogotá',
    description: 'Desarrollar y mantener la plataforma CarLink. Experiencia con React, Next.js, TypeScript y Tailwind.',
  },
  {
    id: 'diseno-ux',
    title: 'Diseñador UX/UI',
    area: 'Diseño',
    type: 'Medio tiempo',
    location: 'Bogotá / Remoto',
    description: 'Crear interfaces intuitivas para la experiencia del conductor y el taller. Dominio de Figma y prototipado rápido.',
  },
]

const AREAS = ['Ingeniería', 'Diseño', 'Ventas', 'Operaciones', 'Marketing', 'Soporte']

const inputStyle: React.CSSProperties = {
  padding: '11px 13px', background: 'var(--input-bg)', border: '1px solid var(--border)',
  borderRadius: 10, fontSize: 14, color: 'var(--text-1)', outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase' as const, letterSpacing: '.08em', marginBottom: 6, display: 'block',
}

export default function TrabajaPage() {
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState<'ofertas' | 'postular'>('ofertas')
  const [submitted, setSubmitted] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [area, setArea] = useState('')
  const [message, setMessage] = useState('')
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [cvName, setCvName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState('')
  const [saving, setSaving] = useState(false)

  const canSubmit = name.trim() && /.+@.+\..+/.test(email) && phone.trim() && area

  const handleCvSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setCvFile(f)
      setCvName(f.name)
    }
  }

  const handleSubmit = async () => {
    if (!canSubmit || saving) return
    setSaving(true)
    let cvUrl = ''

    if (cvFile && user) {
      setUploading(true)
      try {
        const url = await uploadFile(cvFile, 'cv')
        if (url) cvUrl = url
      } catch {}
      setUploading(false)
    }

    // Save to database
    try {
      await jobApplicationApi.create({
        full_name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        area,
        message: message.trim() || undefined,
        cv_url: cvUrl || undefined,
        offer_title: selectedOffer || undefined,
      })
    } catch {
      // Continue even if DB save fails — WhatsApp is the backup
    }

    // WhatsApp backup notification
    const offerLine = selectedOffer ? `\n• Oferta de interés: ${selectedOffer}` : ''
    const cvLine = cvUrl ? `\n• Hoja de vida: ${cvUrl}` : cvName ? `\n• Hoja de vida adjunta: ${cvName}` : ''
    const whatsappMsg = `¡Hola CarLink! Quiero hacer parte del equipo 🔧\n• Nombre: ${name}\n• Email: ${email}\n• WhatsApp: ${phone}\n• Área: ${area}${offerLine}${cvLine}${message ? `\n• Mensaje: ${message}` : ''}`
    window.open(`https://wa.me/573164976104?text=${encodeURIComponent(whatsappMsg)}`, '_blank')

    setSaving(false)
    setSubmitted(true)
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px clamp(16px,4vw,40px) 60px' }}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-2)', textDecoration: 'none', marginBottom: 20 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        Volver al inicio
      </Link>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px,3.5vw,36px)', lineHeight: 1, margin: '0 0 10px', textTransform: 'uppercase' }}>
          Trabaja con <span style={{ color: 'var(--accent)' }}>nosotros</span>
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-2)', maxWidth: 480, margin: '0 auto', lineHeight: 1.5 }}>
          Únete al equipo que está revolucionando el mantenimiento vehicular en Latinoamérica.
        </p>
      </div>

      {/* Tab toggle */}
      <div style={{ display: 'flex', gap: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 14, padding: 5, marginBottom: 28, maxWidth: 380, margin: '0 auto 28px' }}>
        {([['ofertas', 'Ofertas disponibles'], ['postular', 'Postúlate']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{ flex: 1, padding: '10px 8px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700, transition: 'all .18s', background: activeTab === id ? 'var(--accent)' : 'transparent', color: activeTab === id ? '#111' : 'var(--text-2)' }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'ofertas' ? (
        /* ─── JOB OFFERS ─── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Active offers */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12 }}>Abiertas</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ACTIVE_OFFERS.map(job => (
                <div key={job.id} style={{ padding: 22, borderRadius: 16, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{job.title}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: 'var(--accent-dim)', color: 'var(--accent)' }}>{job.area}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: 'var(--surface-3)', color: 'var(--text-2)' }}>{job.type}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: 'var(--surface-3)', color: 'var(--text-2)' }}>{job.location}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55, margin: '0 0 14px' }}>{job.description}</p>
                  <button onClick={() => { setSelectedOffer(job.title); setActiveTab('postular') }}
                    style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid var(--accent-border)', background: 'var(--accent-dim)', color: 'var(--accent)', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#111' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-dim)'; e.currentTarget.style.color = 'var(--accent)' }}>
                    Postularme →
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Past offers */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: 12 }}>Ofertas pasadas</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {PAST_OFFERS.map(job => (
                <div key={job.id} style={{ padding: '16px 20px', borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--border)', opacity: 0.6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{job.title}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'var(--surface-3)', color: 'var(--text-2)' }}>Cerrada</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>{job.area} · {job.type} · {job.location}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : submitted ? (
        /* ─── SUBMITTED ─── */
        <div style={{ textAlign: 'center', padding: '40px 20px', borderRadius: 20, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--success-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.2"><path d="M20 6L9 17l-5-5" /></svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>¡Solicitud enviada!</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>Registramos tu postulación. Te contactaremos pronto.</div>
          <Link href="/" style={{ display: 'inline-flex', padding: '11px 22px', borderRadius: 10, background: 'var(--accent)', color: '#111', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>Volver al inicio</Link>
        </div>
      ) : (
        /* ─── APPLICATION FORM ─── */
        <div style={{ padding: 28, borderRadius: 20, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label style={labelStyle}>Nombre completo *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" style={inputStyle} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} className="grid2">
              <div><label style={labelStyle}>Email *</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@gmail.com" style={inputStyle} /></div>
              <div><label style={labelStyle}>WhatsApp *</label><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+57 3xx xxx xxxx" style={inputStyle} /></div>
            </div>
            <div>
              <label style={labelStyle}>Área de interés *</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {AREAS.map(a => (
                  <button key={a} onClick={() => setArea(a)} style={{ padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `1px solid ${area === a ? 'var(--accent)' : 'var(--border)'}`, background: area === a ? 'var(--accent-dim)' : 'transparent', color: area === a ? 'var(--accent)' : 'var(--text-2)', transition: 'all .15s' }}>{a}</button>
                ))}
              </div>
            </div>

            {selectedOffer && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginBottom: 2 }}>Oferta seleccionada</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedOffer}</div>
              </div>
            )}

            {/* CV Upload */}
            <div>
              <label style={labelStyle}>Hoja de vida {user ? '(opcional)' : '(inicia sesión para adjuntar)'}</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, border: `1px dashed ${cvFile ? 'var(--accent)' : 'var(--border)'}`, background: cvFile ? 'var(--accent-dim)' : 'var(--input-bg)', cursor: 'pointer', transition: 'all .15s' }}
                onMouseEnter={e => { if (!cvFile) e.currentTarget.style.borderColor = 'var(--accent)' }}
                onMouseLeave={e => { if (!cvFile) e.currentTarget.style.borderColor = 'var(--border)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={cvFile ? 'var(--accent)' : 'var(--text-2)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                </svg>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {cvFile ? (
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{cvName}</div>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Seleccionar archivo (PDF, DOC, DOCX)</div>
                  )}
                </div>
                <input type="file" accept=".pdf,.doc,.docx" onChange={handleCvSelect} style={{ display: 'none' }} />
              </label>
              {!user && <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 4 }}>Sin sesión la hoja de vida no se adjunta.</div>}
            </div>

            <div><label style={labelStyle}>Cuéntanos sobre ti (opcional)</label><textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder="Tu experiencia, por qué quieres unirte..." style={{ ...inputStyle, resize: 'vertical' }} /></div>
            <button onClick={handleSubmit} disabled={!canSubmit || saving || uploading} style={{ padding: 14, borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#111', fontWeight: 800, fontSize: 14, cursor: canSubmit && !saving && !uploading ? 'pointer' : 'not-allowed', opacity: canSubmit && !saving && !uploading ? 1 : 0.5, boxShadow: '0 0 24px var(--accent-dim)' }}>
              {saving ? 'Enviando…' : uploading ? 'Subiendo hoja de vida…' : 'Enviar solicitud'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
