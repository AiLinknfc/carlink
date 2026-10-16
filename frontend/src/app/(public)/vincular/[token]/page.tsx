'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/store/auth'
import { claimInfo, rememberPending, type ClaimInfo } from '@/lib/workshopLinks'

/* Enlace de reclamo que un taller le da a su cliente (docs/PLAN_VINCULO_TALLER_CONDUCTOR.md, escenario B).
   Público: muestra qué taller invita (sin datos de nadie más) y guarda el enlace para que, al iniciar sesión o
   registrarse, /app le pida confirmar y aceptar. No vincula nada por sí solo. */
export default function VincularPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const { user, loading } = useAuth()
  const [info, setInfo] = useState<ClaimInfo | 'invalid' | null | undefined>(undefined)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    claimInfo(token).then(r => { if (!cancelled) setInfo(r) })
    return () => { cancelled = true }
  }, [token])

  const go = () => {
    rememberPending({ kind: 'claim', token })
    router.push(user ? '/app' : '/?login=user')
  }

  const box: React.CSSProperties = { maxWidth: 440, margin: '0 auto', padding: '56px 20px', textAlign: 'center' }
  const btn: React.CSSProperties = { marginTop: 22, padding: '13px 26px', borderRadius: 12, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 14, cursor: 'pointer' }

  return (
    <div style={box}>
      {info === undefined && <p style={{ color: 'var(--text-3)' }}>Cargando…</p>}
      {(info === 'invalid' || info === null) && (
        <>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>{info === 'invalid' ? 'Enlace no válido o vencido' : 'No pudimos abrir el enlace'}</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.6 }}>
            {info === 'invalid'
              ? 'Pídele al taller que te envíe uno nuevo. Cada enlace sirve una sola vez y vence a los 7 días.'
              : 'Revisa tu conexión e inténtalo de nuevo.'}
          </p>
        </>
      )}
      {info && info !== 'invalid' && (
        <>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>{info.workshop_name} te invita a CarLink</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.6 }}>
            Guarda el historial de tu {[info.brand, info.model].filter(Boolean).join(' ') || 'vehículo'}
            {info.plate_hint ? ` (placa ${info.plate_hint})` : ''} y deja que {info.workshop_name} lo complete con los servicios que te hace.
            Tú decides qué datos compartes y puedes quitar el vínculo cuando quieras.
          </p>
          <button onClick={go} disabled={loading} style={btn}>{user ? 'Continuar' : 'Iniciar sesión o crear cuenta'}</button>
        </>
      )}
    </div>
  )
}
