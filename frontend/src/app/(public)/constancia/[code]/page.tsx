'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import CarLinkLogo from '@/components/CarLinkLogo'
import { useAuth } from '@/store/auth'
import { dealerError, formatKm } from '@/lib/dealerVehicles'
import { fmtDate, publicRtmApi, type RtmClaimPreview } from '@/lib/rtm'

/* Constancia de una revisión técnico-mecánica que un CDA le da al propietario (docs/PLAN_ALIADOS_NEGOCIO.md, sección 16). El propietario
   ve la revisión, decide si comparte su contacto y la guarda en su vehículo. Sin sesión se le pide iniciar sesión y vuelve acá solo. */
export default function ConstanciaPage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const { user, loading } = useAuth()
  const [info, setInfo] = useState<RtmClaimPreview | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'invalid'>('loading')
  const [detail, setDetail] = useState<string | null>(null)
  const [share, setShare] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ plate: string; km_added: boolean } | null>(null)

  useEffect(() => {
    if (!code) return
    let cancelled = false
    publicRtmApi.preview(code).then(r => {
      if (cancelled) return
      if (r.ok && r.data) { setInfo(r.data); setState('ok') } else { setDetail(r.detail); setState('invalid') }
    })
    return () => { cancelled = true }
  }, [code])

  const login = () => {
    try { sessionStorage.setItem('carlink_post_login', `/constancia/${code}`) } catch { /* sin almacenamiento */ }
    router.push('/?login=user')
  }
  const accept = async () => {
    setBusy(true); setError(null)
    const r = await publicRtmApi.claim(code, share)
    setBusy(false)
    if (r.ok && r.data) setDone({ plate: r.data.plate, km_added: r.data.km_added }); else setError(dealerError(r.detail))
  }

  const card: React.CSSProperties = { background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 18, padding: 'clamp(18px,4vw,28px)' }
  const btn: React.CSSProperties = { width: '100%', padding: '14px 22px', borderRadius: 12, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 15, cursor: 'pointer' }
  const ok = info?.result === 'approved'

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: 'clamp(20px,5vw,48px) 16px 64px', color: 'var(--text-1)' }}>
      <header style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}><Link href="/" aria-label="CarLink"><CarLinkLogo /></Link></header>
      {state === 'loading' && <p style={{ textAlign: 'center', color: 'var(--text-3)' }}>Cargando...</p>}
      {state === 'invalid' && (
        <div style={{ ...card, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>Constancia no disponible</h1>
          <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 14, lineHeight: 1.6 }}>{dealerError(detail === 'error' ? 'claim_invalid' : detail)}</p>
        </div>
      )}
      {state === 'ok' && info && !done && (
        <div style={card}>
          <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700 }}>Revisión técnico-mecánica</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px,6vw,36px)', margin: '8px 0 4px' }}>Placa {info.plate}</h1>
          <div style={{ color: 'var(--text-2)', fontSize: 14 }}>{info.cda_name} · {info.cda_city}</div>
          <div style={{ margin: '18px 0', padding: 14, borderRadius: 12, background: 'var(--surface-3)', border: `1px solid ${ok ? 'var(--success)' : 'var(--danger)'}` }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: ok ? 'var(--success)' : 'var(--danger)' }}>{ok ? 'Revisión aprobada' : 'Revisión no aprobada'}</div>
            <div style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.7, marginTop: 6 }}>
              Revisada el {fmtDate(info.inspected_on)} · {formatKm(info.mileage_km)}<br />
              {ok ? 'Vigente hasta' : 'Nueva revisión antes del'} <b style={{ color: 'var(--text-1)' }}>{fmtDate(info.expires_on)}</b><br />
              Certificado <b style={{ color: 'var(--text-1)' }}>{info.certificate_code}</b>
            </div>
          </div>
          <p style={{ margin: '0 0 14px', fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
            Al aceptarla, la revisión queda en el vehículo de tu cuenta con su vigencia y, si coincide con tu historial, con el kilometraje certificado por el CDA.
          </p>
          {user ? (
            <>
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-2)', cursor: 'pointer', marginBottom: 16 }}>
                <input type="checkbox" checked={share} onChange={e => setShare(e.target.checked)} style={{ marginTop: 3, width: 16, height: 16, accentColor: '#F5C518', flexShrink: 0 }} />
                <span>Quiero que {info.cda_name} guarde mi nombre y WhatsApp para recordarme cuándo vence mi próxima revisión (opcional).</span>
              </label>
              {error && <div role="alert" style={{ marginBottom: 12, fontSize: 13.5, fontWeight: 700, color: 'var(--danger)' }}>{error}</div>}
              <button onClick={accept} disabled={busy} style={{ ...btn, opacity: busy ? 0.6 : 1 }}>{busy ? 'Guardando...' : 'Guardar en mi vehículo'}</button>
            </>
          ) : (
            <button onClick={login} disabled={loading} style={btn}>Iniciar sesión o crear cuenta para guardarla</button>
          )}
        </div>
      )}
      {done && (
        <div style={{ ...card, textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>Revisión guardada en {done.plate}</h1>
          <p style={{ margin: '0 0 18px', color: 'var(--text-2)', fontSize: 14, lineHeight: 1.6 }}>
            Quedó registrada con su vigencia.{done.km_added ? ' También se agregó el kilometraje certificado por el CDA a tu odómetro.' : ' El kilometraje no se agregó porque no cuadra con el historial de tu odómetro.'}
          </p>
          <button onClick={() => router.push('/app')} style={btn}>Ir a mi ficha</button>
        </div>
      )}
    </main>
  )
}
