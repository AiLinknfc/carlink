'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { apiUrl } from '@/lib/supabase'
import type { WorkshopPublic } from '@/lib/types'

/* Ficha pública del taller — docs/PLAN_MIGRACION_TALLERPRO.md Fase 4.11.
   Server público, sin auth: GET /workshops/{code} ya trae mecánicos activos,
   catálogo de servicios y reseñas resueltos en un solo response.

   Fetch propio (no workshopApi.getPublic/request()) porque acá sí importa
   distinguir "taller no encontrado" (código inválido) de "taller no
   publicado" (toggle de Perfil del taller apagado, migración 033) — el
   helper compartido `request()` traga todo non-2xx en `null` sin exponer el
   `detail`, y tocarlo afectaría cualquier otro call site del proyecto. */
export default function PublicWorkshopPage() {
  const params = useParams<{ code: string }>()
  const [workshop, setWorkshop] = useState<WorkshopPublic | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'ok' | 'not_found' | 'not_published'>('ok')

  useEffect(() => {
    if (!params.code) return
    let cancelled = false
    fetch(apiUrl(`/workshops/${params.code}`))
      .then(async res => {
        if (cancelled) return
        if (res.ok) {
          setWorkshop(await res.json())
          return
        }
        if (res.status === 404) {
          const body = await res.json().catch(() => null)
          setStatus(body?.detail === 'Workshop profile is not published' ? 'not_published' : 'not_found')
        } else {
          setStatus('not_found')
        }
      })
      .catch(() => { if (!cancelled) setStatus('not_found') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [params.code])

  if (loading) {
    return <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-3)' }}>Cargando…</div>
  }

  if (status === 'not_published') {
    return (
      <div style={{ padding: 80, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 8 }}>Esta ficha no está publicada</div>
        <p style={{ color: 'var(--text-3)', fontSize: 14, maxWidth: 380, margin: '0 auto 20px', lineHeight: 1.6 }}>
          El taller decidió ocultar temporalmente su ficha pública. Vuelve a intentarlo más tarde.
        </p>
        <Link href="/" style={{ color: '#F5C518', fontWeight: 700 }}>Volver al inicio</Link>
      </div>
    )
  }

  if (status === 'not_found' || !workshop) {
    return (
      <div style={{ padding: 80, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 8 }}>Taller no encontrado</div>
        <Link href="/" style={{ color: '#F5C518', fontWeight: 700 }}>Volver al inicio</Link>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '20px clamp(16px,4vw,40px) 80px' }}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-2)', textDecoration: 'none', marginBottom: 20 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        Volver al inicio
      </Link>

      <div style={{ padding: 28, borderRadius: 22, background: 'linear-gradient(155deg,#1c1708,#141414)', border: '1px solid rgba(245,197,24,0.24)', color: '#fff', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', color: '#F5C518', fontWeight: 700 }}>{workshop.code}</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,4vw,40px)', margin: '4px 0 6px' }}>{workshop.name}</h1>
            {workshop.slogan && <p style={{ color: '#d8d4c8', margin: 0, fontSize: 15 }}>{workshop.slogan}</p>}
          </div>
          {workshop.is_verified && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999, background: 'rgba(46,204,113,0.14)', border: '1px solid rgba(46,204,113,0.4)', color: '#5be89a', fontSize: 12.5, fontWeight: 700 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              Verificado
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 18, fontSize: 13.5, color: '#b6b2a6' }}>
          {workshop.city && <InfoItem icon="pin">{workshop.city}</InfoItem>}
          {workshop.phone && <InfoItem icon="phone">{workshop.phone}</InfoItem>}
          {workshop.business_hours && <InfoItem icon="clock">{workshop.business_hours}</InfoItem>}
          <InfoItem icon="star">{workshop.rating.toFixed(1)} ({workshop.reviews.length} reseñas)</InfoItem>
        </div>

        {workshop.specialties.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
            {workshop.specialties.map(s => (
              <span key={s} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 999, background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.3)', color: '#F5C518' }}>{s}</span>
            ))}
          </div>
        )}
      </div>

      {workshop.description && (
        <p style={{ color: 'var(--text-2)', fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>{workshop.description}</p>
      )}

      {/* QR de esta ficha — a pedido del usuario, toda ficha digital debe
          traer su QR asociado y visible acá mismo. */}
      <FichaQr code={workshop.code} />

      {workshop.service_items.length > 0 && (
        <Section title="Catálogo de servicios">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 12 }}>
            {workshop.service_items.map(s => (
              <div key={s.id} style={{ padding: 16, borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 8px' }}>{s.category}</div>
                <div style={{ fontWeight: 800, color: '#F5C518', fontSize: 15 }}>${Math.round(s.estimated_price).toLocaleString('es-CO')}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {workshop.mechanics.length > 0 && (
        <Section title="Nuestro equipo">
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {workshop.mechanics.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 999, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <span style={{ width: 34, height: 34, borderRadius: '50%', background: '#F5C518', color: '#111', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                  {m.name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{m.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{m.role}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {workshop.reviews.length > 0 && (
        <Section title="Reseñas de clientes">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {workshop.reviews.map(r => (
              <div key={r.id} style={{ padding: 16, borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.client_name}{r.is_verified_client && <span style={{ marginLeft: 6, fontSize: 10, color: '#5be89a' }}>· cliente verificado</span>}</div>
                  <div style={{ color: '#F5C518', fontSize: 13 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                </div>
                {r.comment && <p style={{ fontSize: 13.5, color: 'var(--text-2)', margin: '6px 0 0', lineHeight: 1.5 }}>{r.comment}</p>}
                {r.manager_response && (
                  <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: 'rgba(245,197,24,0.06)', borderLeft: '2px solid #F5C518' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#F5C518', marginBottom: 2 }}>Respuesta del taller</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{r.manager_response}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {(workshop.social_instagram || workshop.social_facebook || workshop.social_website || workshop.social_whatsapp) && (
        <Section title="Contacto">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {workshop.social_whatsapp && <a href={`https://wa.me/${workshop.social_whatsapp.replace(/\D/g, '')}`} style={socialLink}>WhatsApp</a>}
            {workshop.social_instagram && <a href={workshop.social_instagram} style={socialLink}>Instagram</a>}
            {workshop.social_facebook && <a href={workshop.social_facebook} style={socialLink}>Facebook</a>}
            {workshop.social_website && <a href={workshop.social_website} style={socialLink}>Sitio web</a>}
          </div>
        </Section>
      )}
    </div>
  )
}

/* QR que apunta a esta misma ficha pública — mismo patrón/librería que
   QrCodePanel.tsx (llaveros NFC), pero standalone e inline en vez de modal:
   esto NO es el flujo de activación NFC, es un QR genérico de "compartir
   este link" (docs/PLAN_PARIDAD_UI_TALLERPRO.md, pedido del usuario
   2026-08-05). */
function FichaQr({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const qrRef = useRef<any>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    let cancelled = false
    const url = window.location.href

    import('qr-code-styling').then(({ default: QRCodeStyling }) => {
      if (cancelled || !containerRef.current) return
      qrRef.current = new QRCodeStyling({
        width: 168, height: 168, data: url, margin: 8,
        qrOptions: { errorCorrectionLevel: 'H' },
        dotsOptions: { type: 'rounded', color: '#111111' },
        cornersSquareOptions: { type: 'extra-rounded', color: '#111111' },
        cornersDotOptions: { type: 'dot', color: '#111111' },
        backgroundOptions: { color: '#ffffff' },
      })
      containerRef.current.innerHTML = ''
      qrRef.current.append(containerRef.current)
      setReady(true)
    })

    return () => { cancelled = true }
  }, [code])

  const handleDownload = () => qrRef.current?.download({ name: `ficha-${code}`, extension: 'png' })

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
      padding: 22, borderRadius: 18, background: 'var(--surface-2)', border: '1px solid var(--border)', marginBottom: 28,
    }}>
      <div style={{ padding: 10, borderRadius: 12, background: '#fff', flex: '0 0 auto', width: 168, height: 168, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div ref={containerRef} />
      </div>
      <div style={{ flex: '1 1 200px', minWidth: 200 }}>
        <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#F5C518', fontWeight: 700, marginBottom: 6 }}>Código QR de esta ficha</div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 12px', lineHeight: 1.6 }}>
          Escanéalo o compártelo para que cualquiera llegue directo a esta ficha pública — en tarjetas, redes o en el mostrador del taller.
        </p>
        <button onClick={handleDownload} disabled={!ready} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, border: 'none',
          background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 12.5, cursor: ready ? 'pointer' : 'default', opacity: ready ? 1 : 0.5,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
          Descargar PNG
        </button>
      </div>
    </div>
  )
}

const socialLink: React.CSSProperties = {
  padding: '9px 18px', borderRadius: 999, background: 'var(--surface-2)', border: '1px solid var(--border)',
  color: 'var(--text-1)', fontSize: 13, fontWeight: 700, textDecoration: 'none',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#F5C518', fontWeight: 700, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}

function InfoItem({ icon, children }: { icon: 'pin' | 'phone' | 'clock' | 'star'; children: React.ReactNode }) {
  const paths: Record<string, React.ReactNode> = {
    pin: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>,
    phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />,
    clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
    star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[icon]}</svg>
      {children}
    </span>
  )
}
