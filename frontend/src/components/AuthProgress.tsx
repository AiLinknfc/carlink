'use client'

import { useEffect, useState } from 'react'

/* Pantalla de espera de la autenticacion (LoginModal con correo y /auth/callback). Marca propia de CarLink: anillo
   amarillo con un candado, sin logos de terceros (el de Google solo aparece en el boton de Google). El mensaje avanza
   por fases mientras la peticion real sigue en curso; no agrega ninguna demora: si la respuesta llega antes, la pantalla
   simplemente se cierra. "Cifrando" es literal: la conexión va por HTTPS y la contrasena la procesa el proveedor de
   autenticacion, nunca se guarda en claro. */
export type AuthProgressKind = 'signin' | 'signup' | 'callback'

const PHASES: Record<AuthProgressKind, string[]> = {
  signin: ['Verificando tus datos', 'Cifrando tu conexión', 'Autenticando tu acceso'],
  signup: ['Creando tu cuenta', 'Cifrando tu información', 'Protegiendo tu acceso'],
  // El callback continúa lo que empezó el modal (o el recorrido de Google): no repite sus mensajes.
  callback: ['Autenticando tu acceso', 'Preparando tu sesión', 'Abriendo tu garaje'],
}
const STEP_MS = 900
const GOLD = '#F5C518'

export default function AuthProgress({ kind, muted = '#b6b2a6' }: { kind: AuthProgressKind; muted?: string }) {
  const phases = PHASES[kind]
  const [i, setI] = useState(0)
  useEffect(() => {
    if (i >= phases.length - 1) return
    const t = setTimeout(() => setI(n => n + 1), STEP_MS)
    return () => clearTimeout(t)
  }, [i, phases.length])

  return (
    <div role="status" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      <style>{`
        @keyframes authSpin { to { transform: rotate(360deg); } }
        @keyframes authGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(245,197,24,.0), 0 0 18px rgba(245,197,24,.18); } 50% { box-shadow: 0 0 0 6px rgba(245,197,24,.08), 0 0 30px rgba(245,197,24,.38); } }
        @keyframes authShine { 0%,100% { text-shadow: 0 0 0 rgba(245,197,24,0); } 50% { text-shadow: 0 0 14px rgba(245,197,24,.55); } }
        @keyframes authIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .auth-ring { animation: authSpin 1s linear infinite; }
        .auth-core { animation: authGlow 1.8s ease-in-out infinite; }
        .auth-title { color: #F5C518; animation: authIn .35s ease-out both, authShine 1.8s ease-in-out .35s infinite; }
        @media (prefers-reduced-motion: reduce) { .auth-ring, .auth-core, .auth-title { animation: none; } }
      `}</style>
      <div style={{ position: 'relative', width: 84, height: 84 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid rgba(245,197,24,0.14)' }} />
        <div className="auth-ring" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid transparent', borderTopColor: GOLD }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="auth-core" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: '50%', background: 'rgba(245,197,24,0.14)', border: '1px solid rgba(245,197,24,0.45)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </span>
        </div>
      </div>
      <div style={{ textAlign: 'center', minHeight: 44 }}>
        <div key={i} className="auth-title" style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 400, letterSpacing: '.02em', textTransform: 'uppercase' }}>
          {phases[i]}...
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 10 }} aria-hidden="true">
          {phases.map((_, n) => (
            <span key={n} style={{ width: n === i ? 18 : 6, height: 6, borderRadius: 3, background: n <= i ? GOLD : 'rgba(245,197,24,0.2)', transition: 'width .3s, background .3s' }} />
          ))}
        </div>
        <p style={{ fontSize: 11.5, color: muted, margin: '10px 0 0' }}>Conexión protegida</p>
      </div>
    </div>
  )
}
