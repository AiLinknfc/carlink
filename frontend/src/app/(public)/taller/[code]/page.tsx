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
  const [reviewsOpen, setReviewsOpen] = useState(false)

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
  // Contacto: ocupa el lugar de la antigua descripción. Solo se muestran los datos que el taller cargó.
  const wa = (workshop.social_whatsapp || '').replace(/\D/g, '')
  const web = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`)
  const contact: { label: string; value: string; href?: string }[] = [
    workshop.address ? { label: 'Dirección', value: [workshop.address, workshop.city].filter(Boolean).join(', ') } : null,
    workshop.phone ? { label: 'Teléfono', value: workshop.phone, href: `tel:${workshop.phone.replace(/[^\d+]/g, '')}` } : null,
    workshop.email ? { label: 'Correo', value: workshop.email, href: `mailto:${workshop.email}` } : null,
    workshop.business_hours ? { label: 'Horario', value: workshop.business_hours } : null,
  ].filter((c): c is { label: string; value: string; href?: string } => c !== null)
  // Redes y sitio: solo el ícono, con hipervínculo (ahorra espacio).
  const igUser = (workshop.social_instagram || '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/\/$/, '')
  const socials: { key: string; label: string; href: string }[] = [
    wa ? { key: 'wa', label: 'WhatsApp', href: `https://wa.me/${wa.length === 10 ? `57${wa}` : wa}` } : null,
    workshop.social_instagram ? { key: 'ig', label: 'Instagram', href: /^https?:/i.test(workshop.social_instagram) ? workshop.social_instagram : `https://instagram.com/${igUser}` } : null,
    workshop.social_facebook ? { key: 'fb', label: 'Facebook', href: web(workshop.social_facebook) } : null,
    workshop.social_website ? { key: 'web', label: 'Sitio web', href: web(workshop.social_website) } : null,
  ].filter((c): c is { key: string; label: string; href: string } => c !== null)

  return (
    <div className="taller-page" style={{ minHeight: '100vh', padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'var(--font-ui)' }}>
      <style>{`
        .taller-card{width:780px;max-width:100%;box-sizing:border-box}
        .taller-card-inner{padding:24px;box-sizing:border-box}
        .taller-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px;align-items:start;margin-top:18px}
        .taller-cols{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:22px;margin-top:20px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.08)}
        .taller-id{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:18px;align-items:start}
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
            <div className="taller-id">
             <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', color: '#F5C518', fontWeight: 700 }}>{workshop.code}</div>
              {workshop.logo_url && (
                // Logo del taller (ya normalizado al subirlo) sobre una placa clara para que se lea con cualquier fondo.
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '8px 0 2px', padding: '6px 12px', borderRadius: 10, background: '#fff', maxWidth: '100%' }}>
                  <img src={proxyUrl(workshop.logo_url)} alt={`Logo de ${workshop.name}`} style={{ height: 44, maxWidth: 'min(180px,100%)', objectFit: 'contain' }} />
                </span>
              )}
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px,5vw,38px)', margin: '4px 0 6px', lineHeight: 1.08, overflowWrap: 'anywhere' }}>{workshop.name}</h1>
              {workshop.slogan && <p style={{ color: '#d8d4c8', margin: 0, fontSize: 14.5 }}>{workshop.slogan}</p>}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                {workshop.city && <Chip icon="pin">{workshop.city}</Chip>}
                <button type="button" onClick={() => setReviewsOpen(true)} aria-haspopup="dialog" title="Ver las reseñas de clientes" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: 'rgba(245,197,24,0.12)', border: '1px solid rgba(245,197,24,0.45)', color: '#F5C518', fontSize: 12.5, fontWeight: 700 }}>
                    <RatingStars rating={ratingValue} size={13} />{ratingValue.toFixed(1)} · {reviewCount} {reviewCount === 1 ? 'reseña' : 'reseñas'}
                  </span>
                </button>
              </div>

              {workshop.specialties.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                  {workshop.specialties.slice(0, 4).map(s => (
                    <span key={s} title={s} style={{ fontSize: 11.5, padding: '4px 11px', borderRadius: 999, background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.3)', color: '#F5C518', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s}</span>
                  ))}
                  {workshop.specialties.length > 4 && <span title={workshop.specialties.slice(4).join(', ')} style={{ fontSize: 11.5, padding: '4px 9px', borderRadius: 999, border: '1px solid rgba(245,197,24,0.3)', color: '#F5C518' }}>+{workshop.specialties.length - 4}</span>}
                </div>
              )}

             </div>
              {(contact.length > 0 || socials.length > 0) && (
                <div style={{ minWidth: 0 }}>
                  <MiniTitle>Contacto</MiniTitle>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
                    {contact.map(c => (
                      <div key={c.label} style={{ padding: '7px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', minWidth: 0 }}>
                        <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: '#8f8a7a', fontWeight: 700 }}>{c.label}</div>
                        {c.href
                          ? <a href={c.href} style={{ fontSize: 13, fontWeight: 600, color: '#fff', textDecoration: 'none', overflowWrap: 'anywhere', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={c.value}>{c.value}</a>
                          : <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflowWrap: 'anywhere' }}>{c.value}</div>}
                      </div>
                    ))}
                  </div>
                  {socials.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                      {socials.map(sc => (
                        <a key={sc.key} href={sc.href} target="_blank" rel="noopener noreferrer" aria-label={sc.label} title={sc.label}
                          style={{ width: 38, height: 38, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#F5C518', border: '1px solid rgba(245,197,24,0.4)', background: 'rgba(245,197,24,0.08)' }}>
                          <SocialIcon kind={sc.key} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
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

          {restServices.length > 0 && (
            <div className="taller-cols" style={{ gridTemplateColumns: '1fr' }}>
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

            </div>
          )}
        </div>

        {/* Fuera del card: el aviso para clientes y las reseñas (a pedido del usuario). */}
        <LinkCta code={workshop.code} name={workshop.name} />

        {reviewsOpen && <ReviewsModal workshop={workshop} onClose={() => setReviewsOpen(false)} />}
      </div>
    </div>
  )
}

function SocialIcon({ kind }: { kind: string }) {
  const p = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (kind === 'ig') return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" /></svg>
  if (kind === 'fb') return <svg {...p}><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z" /></svg>
  if (kind === 'wa') return <svg {...p}><path d="M3 21l1.6-4.8A8.5 8.5 0 1 1 8 19.5L3 21z" /><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2L9 9.5z" /></svg>
  return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></svg>
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

/* Tarjeta suelta, fuera del card principal (sigue el tema de la página). */
/* Todas las reseñas en un modal: promedio, reparto por estrellas y cada comentario con su respuesta del taller. */
function ReviewsModal({ workshop, onClose }: { workshop: WorkshopPublic; onClose: () => void }) {
  const reviews = workshop.reviews
  const avg = Number(workshop.rating) || 0
  const byStar = [5, 4, 3, 2, 1].map(n => ({ n, count: reviews.filter(r => Math.round(r.rating) === n).length }))
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])
  const date = (iso: string) => { try { return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '' } }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(8px,3vw,24px)' }}>
      <div role="dialog" aria-modal="true" aria-label={`Reseñas de ${workshop.name}`} onClick={e => e.stopPropagation()}
        style={{ width: 'min(100%, 560px)', maxHeight: '100%', overflowY: 'auto', borderRadius: 20, background: '#141414', border: '1px solid rgba(245,197,24,0.3)', color: '#fff', padding: 'clamp(16px,3vw,24px)', boxShadow: '0 30px 80px rgba(0,0,0,.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#F5C518', fontWeight: 700 }}>Reseñas de clientes</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, overflowWrap: 'anywhere' }}>{workshop.name}</div>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Cerrar reseñas" style={{ flex: '0 0 auto', width: 34, height: 34, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.16)', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: 16 }}>x</button>
        </div>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap', padding: 14, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 14 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 46, lineHeight: 1, color: '#F5C518' }}>{avg.toFixed(1)}</div>
            <RatingStars rating={avg} size={14} />
            <div style={{ fontSize: 11.5, color: '#8f8a7a', marginTop: 3 }}>{reviews.length} {reviews.length === 1 ? 'reseña' : 'reseñas'}</div>
          </div>
          <div style={{ flex: '1 1 160px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {byStar.map(b => (
              <div key={b.n} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#b6b2a6' }}>
                <span style={{ width: 22 }}>{b.n} ★</span>
                <span style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <span style={{ display: 'block', height: '100%', width: `${reviews.length ? (b.count / reviews.length) * 100 : 0}%`, background: '#F5C518' }} />
                </span>
                <span style={{ width: 18, textAlign: 'right' }}>{b.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reviews.map(r => (
            <div key={r.id} style={{ padding: 14, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, minWidth: 0, overflowWrap: 'anywhere' }}>{r.client_name}{r.is_verified_client && <span style={{ marginLeft: 6, fontSize: 10, color: '#5be89a' }}>· cliente verificado</span>}</div>
                <RatingStars rating={r.rating} size={13} />
              </div>
              <div style={{ fontSize: 11.5, color: '#8f8a7a', marginTop: 2 }}>{[r.vehicle_model, date(r.review_date || r.created_at)].filter(Boolean).join(' · ')}</div>
              {r.comment && <p style={{ fontSize: 13.5, color: '#d8d4c8', margin: '8px 0 0', lineHeight: 1.55, overflowWrap: 'anywhere' }}>{r.comment}</p>}
              {r.manager_response && (
                <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: 'rgba(245,197,24,0.06)', borderLeft: '2px solid #F5C518' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#F5C518', marginBottom: 2 }}>Respuesta del taller</div>
                  <div style={{ fontSize: 12.5, color: '#d8d4c8', overflowWrap: 'anywhere' }}>{r.manager_response}</div>
                </div>
              )}
            </div>
          ))}
          {reviews.length === 0 && <p style={{ margin: 0, color: '#8f8a7a', fontSize: 13.5 }}>Aún no hay reseñas de clientes.</p>}
        </div>
      </div>
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
