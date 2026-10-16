'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import CarLinkLogo from '@/components/CarLinkLogo'
import { useAuth } from '@/store/auth'
import { dealerError, formatKm, publicDealerApi, type DealerDeliveryPreview } from '@/lib/dealerVehicles'

/* Entrega de un vehículo por un concesionario o compraventa (docs/PLAN_ALIADOS_NEGOCIO.md, sección 15). El comprador abre el
   enlace/QR que le da el vendedor, ve el vehículo, decide si comparte su contacto y lo recibe en su cuenta. Sin sesión, se le
   pide iniciar sesión y vuelve acá solo (sessionStorage `carlink_post_login`, ver auth/callback). */
export default function EntregaPage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const { user, loading } = useAuth()
  const [info, setInfo] = useState<DealerDeliveryPreview | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'invalid'>('loading')
  const [detail, setDetail] = useState<string | null>(null)
  const [share, setShare] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ plate: string } | null>(null)

  useEffect(() => {
    if (!code) return
    let cancelled = false
    publicDealerApi.preview(code).then(r => {
      if (cancelled) return
      if (r.ok && r.data) { setInfo(r.data); setState('ok') } else { setDetail(r.detail); setState('invalid') }
    })
    return () => { cancelled = true }
  }, [code])

  const login = () => {
    try { sessionStorage.setItem('carlink_post_login', `/entrega/${code}`) } catch { /* sin almacenamiento */ }
    router.push('/?login=user')
  }

  const receive = async () => {
    setBusy(true); setError(null)
    const r = await publicDealerApi.claim(code, share)
    setBusy(false)
    if (r.ok && r.data) setDone({ plate: r.data.plate }); else setError(dealerError(r.detail))
  }

  const card: React.CSSProperties = { background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 18, padding: 'clamp(18px,4vw,28px)' }
  const btn: React.CSSProperties = { width: '100%', padding: '14px 22px', borderRadius: 12, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 15, cursor: 'pointer' }
  const title = info ? [info.brand, info.model, info.year].filter(Boolean).join(' ') || 'tu vehículo' : ''

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: 'clamp(20px,5vw,48px) 16px 64px', color: 'var(--text-1)' }}>
      <header style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}><Link href="/" aria-label="CarLink"><CarLinkLogo /></Link></header>
      {state === 'loading' && <p style={{ textAlign: 'center', color: 'var(--text-3)' }}>Cargando...</p>}
      {state === 'invalid' && (
        <div style={{ ...card, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>Enlace de entrega no disponible</h1>
          <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 14, lineHeight: 1.6 }}>{dealerError(detail === 'error' ? 'delivery_invalid' : detail)}</p>
        </div>
      )}
      {state === 'ok' && info && !done && (
        <div style={card}>
          <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700 }}>Entrega de vehículo</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px,6vw,36px)', margin: '8px 0 4px', overflowWrap: 'anywhere' }}>{title}</h1>
          <div style={{ color: 'var(--text-2)', fontSize: 14 }}>Placa <b style={{ color: 'var(--text-1)' }}>{info.plate}</b>{info.color ? ` · ${info.color}` : ''}</div>
          <div style={{ margin: '18px 0', padding: 14, borderRadius: 12, background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-3)', fontWeight: 700 }}>Kilometraje de salida</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, margin: '4px 0' }}>{info.mileage_km > 0 ? formatKm(info.mileage_km) : 'Sin dato'}</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: info.mileage_label.startsWith('Declarado por el vendedor') ? 'var(--text-2)' : 'var(--success)' }}>{info.mileage_label}</div>
          </div>
          <p style={{ margin: '0 0 14px', fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
            <b style={{ color: 'var(--text-1)' }}>{info.dealer_name}</b> ({info.dealer_city}) te entrega este vehículo. Al recibirlo queda en tu cuenta de CarLink con su historial de kilometraje.
          </p>
          {user ? (
            <>
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-2)', cursor: 'pointer', marginBottom: 16 }}>
                <input type="checkbox" checked={share} onChange={e => setShare(e.target.checked)} style={{ marginTop: 3, width: 16, height: 16, accentColor: '#F5C518', flexShrink: 0 }} />
                <span>Quiero que {info.dealer_name} guarde mi nombre y WhatsApp como cliente para atenderme después (opcional; no cambia tu vehículo).</span>
              </label>
              {error && <div role="alert" style={{ marginBottom: 12, fontSize: 13.5, fontWeight: 700, color: 'var(--danger)' }}>{error}</div>}
              <button onClick={receive} disabled={busy} style={{ ...btn, opacity: busy ? 0.6 : 1 }}>{busy ? 'Recibiendo...' : 'Recibir este vehículo en mi cuenta'}</button>
            </>
          ) : (
            <button onClick={login} disabled={loading} style={btn}>Iniciar sesión o crear cuenta para recibirlo</button>
          )}
        </div>
      )}
      {done && (
        <div style={{ ...card, textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>Listo, el vehículo ya es tuyo en CarLink</h1>
          <p style={{ margin: '0 0 18px', color: 'var(--text-2)', fontSize: 14, lineHeight: 1.6 }}>La placa {done.plate} quedó en tu cuenta con su kilometraje de salida. Desde tu ficha puedes registrar servicios y recordatorios.</p>
          <button onClick={() => router.push('/app')} style={btn}>Ir a mi ficha</button>
        </div>
      )}
    </main>
  )
}
