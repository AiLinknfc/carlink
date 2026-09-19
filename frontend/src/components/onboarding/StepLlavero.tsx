'use client'

import { useState, useEffect } from 'react'
import { activateNfcCode } from '@/lib/api'
import { useAuth } from '@/store/auth'
import { getDraft, saveDraft } from './OnboardingWizard'

interface Props {
  userId: string
  theme: 'light' | 'dark'
  vehicle?: any
  onActivated: () => void
  onContinue: () => void
}

const DRAFT_KEY = 'llavero_code'

export default function StepLlavero({ userId, theme, vehicle, onActivated, onContinue }: Props) {
  const isDark = theme !== 'light'
  const textPrimary = 'var(--text-1)'
  const textMuted = 'var(--text-3)'
  const inputBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(17,17,17,0.04)'
  const inputBorder = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(17,17,17,0.12)'

  const { user } = useAuth()
  // Borrador persistido: si el usuario tecleó el código y navegó "Atrás" y
  // volvió, no lo pierde (el componente se desmonta entre pasos).
  const [code, setCode] = useState(() => getDraft(userId, DRAFT_KEY))
  const [loading, setLoading] = useState(false)
  // Arranca en `true` si el vehículo YA tiene la ficha pública activa — antes
  // este estado siempre nacía en `false`, así que volver "Atrás" a este paso
  // (o reabrir el wizard) después de activar un llavero real mostraba de
  // nuevo el formulario vacío con el código todavía en el borrador,
  // invitando a reenviar un código ya reclamado (2026-09-15, bug real
  // encontrado por el usuario probando el wizard: "vuelvo a entrar el
  // código y ya está activo, ¿por qué me lo vuelve a pedir?"). La fuente de
  // verdad es el vehículo real, no un flag local de esta sesión.
  const [activated, setActivated] = useState(!!vehicle?.nfc_active)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (vehicle?.nfc_active) {
      setActivated(true)
      saveDraft(userId, DRAFT_KEY, '')
      // También en este caso (ya estaba activo, no lo acabamos de activar
      // ahora) — el wizard usa esto para ocultar "Omitir por ahora" en su
      // pie, que no tiene sentido una vez que ya hay un llavero activo
      // (2026-09-15).
      onActivated()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle?.nfc_active, userId])

  const handleCodeChange = (v: string) => {
    setCode(v)
    saveDraft(userId, DRAFT_KEY, v)
  }

  const handleActivate = async () => {
    if (!code.trim() || !vehicle?.id || !user) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await activateNfcCode(code.trim(), vehicle.id)
    setLoading(false)
    if (data) {
      setActivated(true)
      saveDraft(userId, DRAFT_KEY, '')
      onActivated()
    } else {
      setError(err || 'No se pudo activar el llavero. Verifica el codigo.')
    }
  }

  if (activated) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(245,197,24,0.12)', border: '2px solid #F5C518', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5C518', margin: '0 auto 14px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, color: textPrimary, marginBottom: 6 }}>Llavero activado</div>
        <div style={{ fontSize: 13, color: textMuted, lineHeight: 1.5, marginBottom: 16 }}>
          Tu llavero NFC esta vinculado a {vehicle?.plate || 'tu vehiculo'}. Ahora cualquiera puede ver la ficha tecnica al escanearlo.
        </div>
        {/* "Terminar", no "Continuar" (2026-09-15) — este es el ultimo paso
            del wizard, onContinue ya dispara onComplete() en
            OnboardingWizard. */}
        <button onClick={onContinue} style={{
          width: '100%', padding: 13, borderRadius: 12, border: 'none', background: '#F5C518', color: '#111',
          fontWeight: 800, fontSize: 14, cursor: 'pointer',
        }}>
          Terminar
        </button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 800, color: textPrimary, marginBottom: 4 }}>Activa tu llavero NFC</div>
      <div style={{ fontSize: 12, color: textMuted, lineHeight: 1.6, marginBottom: 16 }}>
        Al tocar tu llavero contra el telefono, se abre la ficha tecnica de tu vehiculo al instante. Si tenes un llavero fisico, ingresa el codigo que viene impreso.
      </div>

      <div style={{ padding: 14, borderRadius: 12, background: isDark ? 'rgba(245,197,24,0.06)' : 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.25)', marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: isDark ? '#d8c98a' : '#8a6d00', lineHeight: 1.5 }}>
          <b>Sin llavero?</b> Podes omitir este paso y activarlo mas tarde desde tu tablero. Tambien podes comprar uno desde nuestra tienda.
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: textMuted, fontWeight: 700, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.06em' }}>Codigo de activacion</label>
        <input value={code} onChange={e => handleCodeChange(e.target.value)} placeholder="Ej. ABC-1234"
          onKeyDown={e => { if (e.key === 'Enter' && !loading && code.trim()) handleActivate() }}
          style={{ width: '100%', padding: '11px 12px', borderRadius: 10, border: `1px solid ${inputBorder}`, background: inputBg, color: textPrimary, fontSize: 14, fontFamily: 'var(--font-ui)', letterSpacing: '.03em', outline: 'none' }} />
      </div>

      {error && <div style={{ fontSize: 12, color: '#ff4d6a', marginBottom: 12 }}>{error}</div>}

      <button onClick={handleActivate} disabled={!code.trim() || loading}
        style={{
          width: '100%', padding: 13, borderRadius: 12, border: 'none',
          background: (!code.trim() || loading) ? 'rgba(245,197,24,0.3)' : '#F5C518', color: '#111',
          fontWeight: 800, fontSize: 14, cursor: (!code.trim() || loading) ? 'not-allowed' : 'pointer',
          opacity: (!code.trim() || loading) ? 0.6 : 1, transition: 'all .16s',
        }}>
        {loading ? 'Activando...' : 'Activar llavero'}
      </button>
    </div>
  )
}
