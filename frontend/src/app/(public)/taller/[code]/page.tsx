'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiUrl } from '@/lib/supabase'
import type { WorkshopPublic } from '@/lib/types'
import { RatingStars } from '@/lib/icons_new'
import { useAuth } from '@/store/auth'
import { isBusinessAccount } from '@/lib/constants'
import { linksEnabled, rememberPending } from '@/lib/workshopLinks'
import CarLinkLogo from '@/components/CarLinkLogo'
import { proxyUrl } from '@/lib/upload'
import dynamic from 'next/dynamic'

// Leaflet toca `window`: solo en el navegador.
const WorkshopMap = dynamic(() => import('@/components/WorkshopMap'), { ssr: false, loading: () => <div style={{ height: 240 }} /> })

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

  const ratingValue = Number(workshop.rating) || 0
  const reviewCount = workshop.reviews.length
  // Carrusel: los destacados con foto (máx. 4); si el taller no destacó ninguno, los primeros 4 servicios con foto.
  const withPhoto = workshop.service_items.filter(s => s.photo_url)
  const featuredOnes = withPhoto.filter(s => s.is_featured)
  const featured = (featuredOnes.length > 0 ? featuredOnes : withPhoto).slice(0, 4)
  const featuredIds = new Set(featured.map(f => f.id))
  const restServices = workshop.service_items.filter(s => !featuredIds.has(s.id))
  const hasPin = workshop.latitude != null && workshop.longitude != null
  const hasContact = !!(workshop.social_instagram || workshop.social_facebook || workshop.social_website || workshop.social_whatsapp)

  return (
    <div className="taller-page" style={{ minHeight: '100vh', padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'var(--font-ui)' }}>
      <style>{`
        .taller-card{width:780px;max-width:100%;box-sizing:border-box}
        .taller-card-inner{padding:24px;box-sizing:border-box}
        .taller-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px;align-items:start;margin-top:18px}
        .taller-cols{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:22px;margin-top:20px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.08)}
        .taller-pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:18px;margin-top:22px}
        .taller-car{height:260px !important;aspect-ratio:auto !important}
        .taller-svc-grid{display:grid;grid-template-columns:1fr;gap:6px}
        @media(max-width:700px){.taller-cols{grid-template-columns:1fr}}
        @media(max-width:560px){.taller-hero{grid-template-columns:1fr}.taller-qr{justify-self:center}}
        @media(max-width:400px){.taller-card-inner{padding:16px}.taller-page{padding:10px !important}}
      `}</style>
      <div className="taller-card">
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-2)', textDecoration: 'none', margin: '4px 0 14px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Volver al inicio
        </Link>

        {/* Ficha del taller en un solo card, igual que la ficha del vehículo del conductor (/nfc/[token]). */}
        <div className="taller-card-inner" style={{
          borderRadius: 26, overflow: 'hidden', color: '#fff',
          background: 'linear-gradient(155deg,#1c1708,#141414)',
          border: '1px solid rgba(245,197,24,0.35)',
          boxShadow: '0 30px 80px rgba(0,0,0,.55),0 0 60px rgba(245,197,24,0.12)',
        }}>
          {/* Encabezado: CarLink + verificado */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
              <CarLinkLogo size={36} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: '#fff' }}>Car<span style={{ color: '#F5C518' }}>Link</span></span>
            </Link>
            {workshop.is_verified && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: 'rgba(46,204,113,0.14)', border: '1px solid rgba(46,204,113,0.4)', color: '#5be89a', fontSize: 11.5, fontWeight: 700 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                Verificado
              </span>
            )}
          </div>

          {/* Identidad del taller + QR al frente (a la derecha en pantallas anchas, debajo en móvil). */}
          <div className="taller-hero">
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', color: '#F5C518', fontWeight: 700 }}>{workshop.code}</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px,5vw,38px)', margin: '4px 0 6px', lineHeight: 1.08, overflowWrap: 'anywhere' }}>{workshop.name}</h1>
              {workshop.slogan && <p style={{ color: '#d8d4c8', margin: 0, fontSize: 14.5 }}>{workshop.slogan}</p>}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                {workshop.city && <Chip icon="pin">{workshop.city}</Chip>}
                {workshop.phone && <Chip icon="phone">{workshop.phone}</Chip>}
                {workshop.business_hours && <Chip icon="clock">{workshop.business_hours}</Chip>}
                <Chip icon="star">{ratingValue.toFixed(1)} · {reviewCount} {reviewCount === 1 ? 'reseña' : 'reseñas'}</Chip>
              </div>

              {workshop.specialties.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                  {workshop.specialties.map(s => (
                    <span key={s} style={{ fontSize: 11.5, padding: '4px 11px', borderRadius: 999, background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.3)', color: '#F5C518' }}>{s}</span>
                  ))}
                </div>
              )}

              {workshop.description && (
                <p style={{ color: '#cfcabb', fontSize: 13.5, lineHeight: 1.6, margin: '14px 0 0' }}>{workshop.description}</p>
              )}
            </div>

            {/* QR de esta ficha: siempre visible, con su descarga debajo. */}
            <FichaQr code={workshop.code} />
          </div>

          {/* Catálogo (carrusel) y ubicación (mapa) al mismo nivel: dos columnas en pantallas anchas, una debajo de otra en móvil. */}
          {(featured.length > 0 || hasPin) && (
            <div className="taller-pair">
              {featured.length > 0 && <FeaturedCarousel items={featured} />}
              {hasPin && (
                <div style={{ minWidth: 0 }}>
                  <MiniTitle>Ubicación</MiniTitle>
                  <WorkshopMap name={workshop.name} address={workshop.address} city={workshop.city} lat={workshop.latitude as number} lon={workshop.longitude as number} />
                </div>
              )}
            </div>
          )}

          {(restServices.length > 0 || workshop.mechanics.length > 0 || hasContact) && (
            <div className="taller-cols" style={restServices.length === 0 ? { gridTemplateColumns: '1fr' } : undefined}>
              {restServices.length > 0 && (
                <div style={{ minWidth: 0 }}>
                  <MiniTitle>{featured.length > 0 ? 'Otros servicios' : 'Catálogo de servicios'}</MiniTitle>
                  <div className="taller-svc-grid">
                    {restServices.map(s => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 13.5, overflowWrap: 'anywhere' }}>{s.name}</div>
                            <div style={{ fontSize: 11.5, color: '#8f8a7a' }}>{s.category}</div>
                          </div>
                        </div>
                        <div style={{ fontWeight: 800, color: '#F5C518', fontSize: 14, whiteSpace: 'nowrap' }}>${Math.round(s.estimated_price).toLocaleString('es-CO')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(workshop.mechanics.length > 0 || hasContact) && (
                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {workshop.mechanics.length > 0 && (
                    <div>
                      <MiniTitle>Nuestro equipo</MiniTitle>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {workshop.mechanics.map(m => (
                          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px 8px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <span style={{ width: 30, height: 30, flex: '0 0 auto', borderRadius: '50%', background: '#F5C518', color: '#111', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                              {m.name.charAt(0).toUpperCase()}
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, overflowWrap: 'anywhere' }}>{m.name}</div>
                              <div style={{ fontSize: 11.5, color: '#8f8a7a' }}>{m.role}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {hasContact && (
                    <div>
                      <MiniTitle>Contacto</MiniTitle>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {workshop.social_whatsapp && <a href={`https://wa.me/${workshop.social_whatsapp.replace(/\D/g, '')}`} style={socialLink}>WhatsApp</a>}
                        {workshop.social_instagram && <a href={workshop.social_instagram} style={socialLink}>Instagram</a>}
                        {workshop.social_facebook && <a href={workshop.social_facebook} style={socialLink}>Facebook</a>}
                        {workshop.social_website && <a href={workshop.social_website} style={socialLink}>Sitio web</a>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fuera del card: el aviso para clientes y las reseñas (a pedido del usuario). */}
        <LinkCta code={workshop.code} name={workshop.name} />

        {/* Reseñas: siempre visibles (promedio + lista). Es el único lugar donde el taller las ve. */}
      <OuterCard title="Reseñas de clientes">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: reviewCount ? 12 : 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 38, lineHeight: 1, color: '#F5C518' }}>{ratingValue.toFixed(1)}</div>
          <div>
            <RatingStars rating={ratingValue} size={15} />
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>
              {reviewCount === 0 ? 'Aún no hay reseñas de clientes.' : `${reviewCount} ${reviewCount === 1 ? 'reseña' : 'reseñas'}`}
            </div>
          </div>
        </div>
        {reviewCount > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {workshop.reviews.map(r => (
              <div key={r.id} style={{ padding: 14, borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, minWidth: 0, overflowWrap: 'anywhere' }}>{r.client_name}{r.is_verified_client && <span style={{ marginLeft: 6, fontSize: 10, color: '#5be89a' }}>· cliente verificado</span>}</div>
                  <RatingStars rating={r.rating} size={13} />
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
        )}
      </OuterCard>

      </div>
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
        width: 160, height: 160, data: url, margin: 2,
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

  const handleDownloadPng = () => qrRef.current?.download({ name: `ficha-${code}`, extension: 'png' })

  return (
    <div className="taller-qr" style={{ width: 176, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
      <div style={{ padding: 8, borderRadius: 16, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(0,0,0,.35)' }}>
        <div ref={containerRef} style={{ width: 160, height: 160, lineHeight: 0 }} />
      </div>
      <div style={{ textAlign: 'center', fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase', color: '#F5C518', fontWeight: 700 }}>Escanea esta ficha</div>
      <button onClick={handleDownloadPng} disabled={!ready} style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 12px', borderRadius: 10, border: 'none',
        background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 12.5, cursor: ready ? 'pointer' : 'default', opacity: ready ? 1 : 0.5,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
        Descargar PNG
      </button>
    </div>
  )
}

const socialLink: React.CSSProperties = {
  padding: '9px 18px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)',
  color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none',
}

/* Tarjeta suelta, fuera del card principal (sigue el tema de la página). */
function OuterCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 18, padding: 20, borderRadius: 20, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#F5C518', fontWeight: 700, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}

/* Carrusel de los servicios destacados (hasta 4, con foto). Avanza solo cada 4 s, se detiene al pasar el cursor, al
   enfocar o al tocarlo, y no se mueve solo si la persona pidió "reducir movimiento". Se puede deslizar y tiene puntos. */
function FeaturedCarousel({ items }: { items: WorkshopPublic['service_items'] }) {
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(false)
  const startX = useRef<number | null>(null)
  const n = items.length

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  useEffect(() => {
    if (n < 2 || paused || reduced) return
    const id = window.setInterval(() => setIdx(i => (i + 1) % n), 4000)
    return () => window.clearInterval(id)
  }, [n, paused, reduced])

  const go = (d: number) => setIdx(i => (i + d + n) % n)
  const arrow: React.CSSProperties = {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: 38, height: 38, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.3)',
    background: 'rgba(10,10,10,0.55)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
  }
  return (
    <div style={{ minWidth: 0 }} aria-roledescription="carrusel" aria-label="Catálogo de servicios">
      <MiniTitle>Catálogo de servicios</MiniTitle>
      <div
        onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
        onPointerDown={e => { startX.current = e.clientX; setPaused(true) }}
        onPointerUp={e => {
          if (startX.current != null) {
            const dx = e.clientX - startX.current
            if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
          }
          startX.current = null; setPaused(false)
        }}
        className="taller-car" style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', aspectRatio: '16 / 9', width: '100%', boxSizing: 'border-box', background: '#0c0c0c', border: '1px solid rgba(255,255,255,0.08)', touchAction: 'pan-y' }}
      >
        {items.map((s, i) => (
          <div key={s.id} aria-hidden={i !== idx} style={{ position: 'absolute', inset: 0, opacity: i === idx ? 1 : 0, transition: 'opacity .6s ease', pointerEvents: i === idx ? 'auto' : 'none' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={proxyUrl(s.photo_url)} alt={s.name} loading={i === 0 ? 'eager' : 'lazy'} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '64px 20px 18px', background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0) 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 'clamp(18px,3.2vw,24px)', lineHeight: 1.15, overflowWrap: 'anywhere' }}>{s.name}</div>
                  {s.category && <div style={{ fontSize: 13, color: '#e2ddd0', marginTop: 2 }}>{s.category}</div>}
                </div>
                <div style={{ fontWeight: 800, color: '#F5C518', fontSize: 'clamp(18px,3.2vw,24px)', whiteSpace: 'nowrap' }}>${Math.round(s.estimated_price).toLocaleString('es-CO')}</div>
              </div>
            </div>
          </div>
        ))}
        {n > 1 && (
          <>
            <button type="button" aria-label="Anterior" onClick={() => go(-1)} style={{ ...arrow, left: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button type="button" aria-label="Siguiente" onClick={() => go(1)} style={{ ...arrow, right: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
            <div style={{ position: 'absolute', top: 10, right: 12, display: 'flex', gap: 6, zIndex: 2, padding: '6px 9px', borderRadius: 999, background: 'rgba(10,10,10,0.5)' }}>
              {items.map((s, i) => (
                <button key={s.id} type="button" aria-label={`Ver ${s.name}`} aria-current={i === idx} onClick={() => setIdx(i)}
                  style={{ width: i === idx ? 18 : 8, height: 8, borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer', background: i === idx ? '#F5C518' : 'rgba(255,255,255,0.5)', transition: 'width .25s' }} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MiniTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#F5C518', fontWeight: 700, marginBottom: 10 }}>{children}</div>
}

/* Dato corto con icono, en forma de píldora (ciudad, teléfono, horario, calificación). */
function Chip({ icon, children }: { icon: 'pin' | 'phone' | 'clock' | 'star'; children: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 11px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12.5, color: '#d8d4c8', maxWidth: '100%', overflowWrap: 'anywhere' }}>
      <InfoItem icon={icon}>{children}</InfoItem>
    </span>
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


/* "Soy cliente de este taller" (docs/PLAN_VINCULO_TALLER_CONDUCTOR.md, escenario A). Solo aparece si el servidor
   tiene el vinculo encendido. No vincula nada: guarda el codigo del taller y manda a iniciar sesion; ya dentro de
   la app la persona confirma y decide que comparte. */
function LinkCta({ code, name }: { code: string; name: string }) {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [enabled, setEnabled] = useState(false)
  useEffect(() => { linksEnabled().then(setEnabled) }, [])
  if (!enabled) return null
  // Una cuenta de taller/empresa no se hace cliente de un taller: no se guarda ningún pendiente ni se navega.
  // (El servidor lo rechaza igual con 403; esto evita además que la pantalla "salte" de panel.)
  const business = !!user && isBusinessAccount(profile?.account_type)
  const loadingProfile = !!user && !profile
  const go = () => {
    if (business || loadingProfile) return
    rememberPending({ kind: 'ref', code })
    router.push(user ? '/app' : '/?login=user')
  }
  return (
    <div style={{ marginTop: 18, padding: 18, borderRadius: 20, background: 'rgba(245,197,24,0.06)', border: '1px solid rgba(245,197,24,0.3)' }}>
      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>¿Eres cliente de {name}?</div>
      <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55, margin: '0 0 12px' }}>
        Registra tu vehículo y tus servicios en CarLink y asócialos a este taller. Tú decides qué datos compartes.
      </p>
      {business ? (
        <p role="status" style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.55, margin: 0, padding: '10px 12px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          Iniciaste sesión con una cuenta de taller o empresa, que no puede vincularse como cliente. Para registrar tu vehículo usa una cuenta de conductor.
        </p>
      ) : (
        <button onClick={go} disabled={loadingProfile} style={{ padding: '10px 20px', borderRadius: 11, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 13, cursor: loadingProfile ? 'default' : 'pointer', opacity: loadingProfile ? 0.6 : 1 }}>
          Registrar mi vehículo con este taller
        </button>
      )}
    </div>
  )
}
