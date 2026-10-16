'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import CarLinkLogo from '@/components/CarLinkLogo'
import { formatCop, formatKm, publicDealerApi, dealerError, type DealerPublic } from '@/lib/dealerVehicles'
import { proxyUrl } from '@/lib/upload'

/* Ficha pública de un vehículo en venta de un concesionario o compraventa (docs/PLAN_ALIADOS_NEGOCIO.md, sección 15).
   Pública y sin sesión: no muestra la placa completa ni datos de contacto. El kilometraje dice quién lo certificó o declaró. */
export default function DealerVehiclePublicPage() {
  const { slug } = useParams<{ slug: string }>()
  const [v, setV] = useState<DealerPublic | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'error'>('loading')
  const [detail, setDetail] = useState<string | null>(null)
  const [photo, setPhoto] = useState(0)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    publicDealerApi.vehicle(slug).then(r => {
      if (cancelled) return
      if (r.ok && r.data) { setV(r.data); setState('ok') } else { setDetail(r.detail); setState(r.status === 404 ? 'missing' : 'error') }
    })
    return () => { cancelled = true }
  }, [slug])

  const card: React.CSSProperties = { background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 18, padding: 'clamp(18px,4vw,28px)' }
  const title = v ? [v.brand, v.model, v.year].filter(Boolean).join(' ') || 'Vehículo en venta' : ''

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: 'clamp(20px,5vw,48px) 16px 64px', color: 'var(--text-1)' }}>
      <header style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}><Link href="/" aria-label="CarLink"><CarLinkLogo /></Link></header>
      {state === 'loading' && <p style={{ textAlign: 'center', color: 'var(--text-3)' }}>Cargando...</p>}
      {state === 'missing' && (
        <div style={{ ...card, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>Esta ficha no está disponible</h1>
          <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 14, lineHeight: 1.6 }}>El vehículo ya fue entregado, el vendedor retiró la publicación o el enlace no es correcto.</p>
        </div>
      )}
      {state === 'error' && <div style={{ ...card, textAlign: 'center', color: 'var(--text-2)' }}>{dealerError(detail)}</div>}
      {state === 'ok' && v && (
        <article style={card}>
          {v.photo_urls?.length > 0 && (
            <div style={{ margin: '0 0 18px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={proxyUrl(v.photo_urls[Math.min(photo, v.photo_urls.length - 1)])} alt={`Foto ${photo + 1} de ${v.brand} ${v.model}`} style={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover', borderRadius: 14, border: '1px solid var(--border)', display: 'block' }} />
              {v.photo_urls.length > 1 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8, overflowX: 'auto' }}>
                  {v.photo_urls.map((u, i) => (
                    <button key={u} type="button" onClick={() => setPhoto(i)} aria-label={`Ver foto ${i + 1}`} style={{ flex: '0 0 auto', width: 72, height: 54, padding: 0, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', border: `2px solid ${i === photo ? 'var(--accent)' : 'var(--border)'}`, background: 'none' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={proxyUrl(u)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700 }}>Vehículo en venta</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,6vw,40px)', letterSpacing: '.02em', margin: '8px 0 4px', overflowWrap: 'anywhere' }}>{title}</h1>
          <div style={{ color: 'var(--text-2)', fontSize: 14 }}>{[v.color, v.vehicle_class, `Placa ${v.plate_hint}`].filter(Boolean).join(' · ')}</div>

          <div style={{ margin: '20px 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,230px),1fr))', gap: 12 }}>
            <div style={{ padding: 16, borderRadius: 14, background: 'var(--surface-3)', border: `1px solid ${v.mileage_certified ? 'var(--success)' : 'var(--border)'}` }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-3)', fontWeight: 700 }}>Kilometraje</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, margin: '4px 0' }}>{v.mileage_km > 0 ? formatKm(v.mileage_km) : 'Sin dato'}</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: v.mileage_certified ? 'var(--success)' : 'var(--text-2)' }}>{v.mileage_label}</div>
              {v.certified_at && <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>el {new Date(v.certified_at).toLocaleDateString('es-CO')}</div>}
            </div>
            {v.price_cop != null && (
              <div style={{ padding: 16, borderRadius: 14, background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-3)', fontWeight: 700 }}>Precio</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, margin: '4px 0', color: 'var(--accent)' }}>{formatCop(v.price_cop)}</div>
              </div>
            )}
          </div>

          {v.description && <p style={{ color: 'var(--text-2)', fontSize: 14.5, lineHeight: 1.7, margin: '0 0 20px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{v.description}</p>}

          <div style={{ padding: 16, borderRadius: 14, background: 'var(--surface-3)', border: '1px solid var(--border)', display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15, overflowWrap: 'anywhere' }}>{v.dealer_name}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{v.dealer_city}{v.dealer_verified ? ' · Aliado verificado por CarLink' : ''}</div>
            </div>
            {v.dealer_code && <Link href={`/taller/${v.dealer_code}`} style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 13.5 }}>Ver al vendedor</Link>}
          </div>
          <p style={{ margin: '16px 0 0', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
            Al comprar, el vendedor te entrega este vehículo en tu cuenta de CarLink con su kilometraje de salida y tú decides si compartes tus datos de contacto con él.
          </p>
        </article>
      )}
    </main>
  )
}
