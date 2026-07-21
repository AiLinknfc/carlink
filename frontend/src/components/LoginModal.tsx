'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/store/auth'

// Official multicolor Google "G" logo
const GoogleSVG = ({ width = 20, height = 20, style }: { width?: number; height?: number; style?: React.CSSProperties }) => (
  <svg width={width} height={height} viewBox="0 0 48 48" style={style} aria-hidden="true">
    <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
    <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
    <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"/>
    <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>
  </svg>
)

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  plateText: string
  onOpenPolicy: (tab: 'warranty' | 'privacy' | 'support') => void
  theme: 'light' | 'dark'
}

type Mode = 'signin' | 'signup'
type Step = 'form' | 'loading' | 'confirm'
type AccountType = 'user' | 'business'

export default function LoginModal({ isOpen, onClose, plateText, onOpenPolicy, theme }: LoginModalProps) {
  const router = useRouter()
  const { signIn, signInWithEmail, signUpWithEmail } = useAuth()

  const [mode, setMode] = useState<Mode>('signin')
  const [accountType, setAccountType] = useState<AccountType>('user')
  const [step, setStep] = useState<Step>('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(true)
  const [showTermsError, setShowTermsError] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setStep('form')
      setAccountType('user')
      setError(null)
      setIsSubmitting(false)
      setShowTermsError(false)
    }
  }, [isOpen])

  const isDark = theme === 'dark'
  const panelBg = isDark ? 'rgba(20,20,20,0.94)' : 'rgba(247,246,242,0.96)'
  const borderColor = isDark ? 'rgba(245,197,24,0.22)' : 'rgba(17,17,17,0.12)'
  const textPrimary = isDark ? '#f5f3ec' : '#17171a'
  const textSecondary = isDark ? '#b6b2a6' : '#5c584e'
  const textMuted = isDark ? '#7c786e' : '#7a756a'
  const inputBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(17,17,17,0.03)'
  const inputBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(17,17,17,0.12)'
  const gold = '#F5C518'
  const goldBorder = 'rgba(245,197,24,0.35)'

  const validate = useCallback(() => {
    if (!acceptedTerms) {
      setShowTermsError(true)
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Ingresa un correo electrónico válido.')
      return false
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return false
    }
    return true
  }, [acceptedTerms, email, password])

  const handleEmailAuth = useCallback(async () => {
    setError(null)
    setShowTermsError(false)
    if (!validate()) return

    setIsSubmitting(true)
    setStep('loading')

    const result = mode === 'signin'
      ? await signInWithEmail(email, password)
      : await signUpWithEmail(email, password)

    if (result.error) {
      setError(traducirError(result.error))
      setStep('form')
      setIsSubmitting(false)
      return
    }

    if (mode === 'signup' && 'needsConfirmation' in result && result.needsConfirmation) {
      setStep('confirm')
      setIsSubmitting(false)
      return
    }

    router.push('/auth/callback')
  }, [mode, email, password, validate, signInWithEmail, signUpWithEmail, router])

  const handleGoogle = useCallback(() => {
    setError(null)
    if (!acceptedTerms) {
      setShowTermsError(true)
      return
    }
    onClose()
    requestAnimationFrame(() => signIn())
  }, [acceptedTerms, signIn, onClose])

  if (!isOpen) return null

  const primaryLabel = mode === 'signin' ? 'Iniciar sesión' : 'Crear cuenta'

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 70,
              background: 'rgba(4,4,4,0.72)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            }}
          />

          {/* Centering layer — flex centering avoids the framer-motion transform conflict */}
          <div style={{
            position: 'fixed', inset: 0, zIndex: 71,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16, pointerEvents: 'none',
          }}>
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.98 }}
              transition={{ type: 'spring', damping: 26, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                pointerEvents: 'auto',
                position: 'relative', width: '100%', maxWidth: 420,
                maxHeight: 'calc(100vh - 32px)', overflowY: 'auto',
                background: panelBg, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                border: `1px solid ${borderColor}`, borderRadius: 14,
                boxShadow: '0 40px 90px rgba(0,0,0,.55)',
                padding: 'clamp(20px, 5vw, 28px)', color: textPrimary,
                fontFamily: "'Inter',system-ui,sans-serif",
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="login-title"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                style={{
                  position: 'absolute', top: 14, right: 14, zIndex: 1,
                  width: 34, height: 34, borderRadius: 10,
                  border: `1px solid ${borderColor}`, background: 'transparent',
                  color: textMuted, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all .18s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(245,197,24,0.1)'; e.currentTarget.style.borderColor = gold; e.currentTarget.style.color = gold }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = borderColor; e.currentTarget.style.color = textMuted }}
                aria-label="Cerrar"
              >
                <XIcon width={18} height={18} />
              </button>

              {/* Top ambient light */}
              <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 60, height: 2, background: `linear-gradient(90deg,transparent,${gold},transparent)`,
                opacity: 0.8, borderRadius: '0 0 999px 999px',
              }} />

              <AnimatePresence mode="wait">
                {/* Form */}
                {step === 'form' && (
                  <motion.div
                    key="login-form"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.28 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
                  >
                    {/* Header */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        margin: '0 auto 14px', width: 48, height: 48, borderRadius: 14,
                        background: 'rgba(245,197,24,0.12)', border: `1px solid ${goldBorder}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                      }}>
                        <ShieldCheck width={24} height={24} style={{ color: gold }} />
                      </div>
                      <h2 id="login-title" style={{
                        fontFamily: "'Anton',sans-serif", fontSize: 'clamp(20px, 5vw, 24px)', fontWeight: 400,
                        letterSpacing: '.01em', textTransform: 'uppercase', marginBottom: 6, color: textPrimary,
                      }}>
                        Acceso de Conductor
                      </h2>
                      <p style={{ fontSize: 13, color: textMuted, maxWidth: '26ch', margin: '0 auto', lineHeight: 1.5 }}>
                        {mode === 'signin' ? 'Ingresa para vincular y certificar la placa' : 'Crea tu cuenta para gestionar la placa'}{' '}
                        <span style={{ color: gold, fontFamily: "'Anton',sans-serif", fontWeight: 400 }}>{plateText || '—'}</span>.
                      </p>
                    </div>

                    {/* Account type selector */}
                    <div style={{ display: 'flex', gap: 6, background: inputBg, border: `1px solid ${inputBorder}`, borderRadius: 14, padding: 5 }}>
                      <button
                        type="button"
                        onClick={() => { setAccountType('user'); setError(null) }}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                          padding: '10px 8px', borderRadius: 10, border: 'none', cursor: 'pointer',
                          background: accountType === 'user' ? gold : 'transparent',
                          color: accountType === 'user' ? '#111' : textSecondary,
                          fontFamily: "'Inter',system-ui,sans-serif", fontSize: 12.5, fontWeight: 700,
                          whiteSpace: 'nowrap', transition: 'all .18s',
                        }}
                      >
                        <UserIcon width={16} height={16} />
                        <span>Soy usuario</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAccountType('business'); setError(null) }}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                          padding: '10px 8px', borderRadius: 10, border: 'none', cursor: 'pointer',
                          background: accountType === 'business' ? gold : 'transparent',
                          color: accountType === 'business' ? '#111' : textSecondary,
                          fontFamily: "'Inter',system-ui,sans-serif", fontSize: 12.5, fontWeight: 700,
                          whiteSpace: 'nowrap', transition: 'all .18s',
                        }}
                      >
                        <WrenchIcon width={16} height={16} />
                        <span>Taller / Empresa</span>
                      </button>
                    </div>

                    {accountType === 'user' ? (
                    <>
                    {/* Email + Password */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label htmlFor="login-email" style={labelStyle(textMuted)}>Correo electrónico</label>
                        <div style={{ position: 'relative' }}>
                          <span style={inputIconStyle}>
                            <MailIcon width={16} height={16} style={{ color: textMuted }} />
                          </span>
                          <input
                            id="login-email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setError(null) }}
                            placeholder="tucorreo@ejemplo.com"
                            style={inputStyle(inputBg, inputBorder, textPrimary)}
                            onFocus={(e) => { e.currentTarget.style.borderColor = gold }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = inputBorder }}
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="login-password" style={labelStyle(textMuted)}>Contraseña</label>
                        <div style={{ position: 'relative' }}>
                          <span style={inputIconStyle}>
                            <KeyIcon width={16} height={16} style={{ color: textMuted }} />
                          </span>
                          <input
                            id="login-password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(null) }}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleEmailAuth() }}
                            placeholder={mode === 'signin' ? 'Tu contraseña' : 'Mínimo 6 caracteres'}
                            style={{ ...inputStyle(inputBg, inputBorder, textPrimary), paddingRight: 42 }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = gold }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = inputBorder }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            style={{
                              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                              background: 'transparent', border: 'none', color: textMuted, cursor: 'pointer', padding: 0, display: 'flex',
                            }}
                          >
                            {showPassword ? <EyeOffIcon width={18} height={18} /> : <EyeIcon width={18} height={18} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Error */}
                    {error && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#ff6b6b' }}>
                        <AlertIcon width={14} height={14} />
                        {error}
                      </span>
                    )}

                    {/* Terms */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <input
                          type="checkbox"
                          id="accept-terms"
                          checked={acceptedTerms}
                          onChange={(e) => { setAcceptedTerms(e.target.checked); if (e.target.checked) setShowTermsError(false) }}
                          style={{ marginTop: 2, width: 16, height: 16, accentColor: gold, cursor: 'pointer', flexShrink: 0 }}
                        />
                        <label htmlFor="accept-terms" style={{ fontSize: 11.5, color: textSecondary, lineHeight: 1.5, cursor: 'pointer' }}>
                          Acepto la <span style={{ color: gold, fontWeight: 700 }} onClick={(e) => { e.preventDefault(); onOpenPolicy('privacy') }}>Política de Privacidad</span> y los <span style={{ color: gold, fontWeight: 700 }} onClick={(e) => { e.preventDefault(); onOpenPolicy('warranty') }}>Términos</span> de CarLink.
                        </label>
                      </div>
                      {showTermsError && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#ff6b6b' }}>
                          <AlertIcon width={13} height={13} />
                          Debes aceptar la política para continuar.
                        </span>
                      )}
                    </div>

                    {/* Primary (email) button */}
                    <button
                      onClick={handleEmailAuth}
                      disabled={isSubmitting}
                      style={{
                        width: '100%', padding: '13px 18px', borderRadius: 12, border: 'none',
                        background: `linear-gradient(135deg, ${gold}, #e0b100)`, color: '#111',
                        fontWeight: 800, fontSize: 14, fontFamily: "'Inter',system-ui,sans-serif",
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: '0 0 22px rgba(245,197,24,0.35)', transition: 'all .18s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 30px rgba(245,197,24,0.5)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 22px rgba(245,197,24,0.35)' }}
                    >
                      <span>{primaryLabel}</span>
                      <ArrowRightIcon width={18} height={18} />
                    </button>

                    {/* Divider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1, height: 1, background: borderColor }} />
                      <span style={{ fontSize: 11, color: textMuted, textTransform: 'uppercase', letterSpacing: '.08em' }}>o continúa con</span>
                      <div style={{ flex: 1, height: 1, background: borderColor }} />
                    </div>

                    {/* Google button */}
                    <button
                      onClick={handleGoogle}
                      style={{
                        width: '100%', padding: '12px 18px', borderRadius: 12,
                        border: `1px solid ${inputBorder}`, background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
                        color: textPrimary, fontWeight: 700, fontSize: 14, fontFamily: "'Inter',system-ui,sans-serif",
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        transition: 'all .18s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = goldBorder; e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.07)' : '#faf9f5' }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = inputBorder; e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : '#ffffff' }}
                    >
                      <GoogleSVG width={18} height={18} />
                      <span>Google</span>
                    </button>

                    {/* Mode toggle */}
                    <p style={{ textAlign: 'center', fontSize: 12.5, color: textMuted, margin: 0 }}>
                      {mode === 'signin' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
                      <span
                        onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null) }}
                        style={{ color: gold, fontWeight: 700, cursor: 'pointer' }}
                      >
                        {mode === 'signin' ? 'Crear una' : 'Iniciar sesión'}
                      </span>
                    </p>
                    </>
                    ) : (
                    // Taller / Empresa — sin acción por ahora
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '18px 8px 6px', textAlign: 'center' }}>
                      <div style={{
                        width: 52, height: 52, borderRadius: 14,
                        background: 'rgba(245,197,24,0.10)', border: `1px solid ${goldBorder}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: gold,
                      }}>
                        <WrenchIcon width={24} height={24} />
                      </div>
                      <span style={{ fontFamily: "'Inter',system-ui,sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: gold, background: 'rgba(245,197,24,0.14)', border: `1px solid ${goldBorder}`, borderRadius: 999, padding: '3px 10px' }}>
                        Próximamente
                      </span>
                      <p style={{ fontSize: 13, color: textSecondary, maxWidth: '30ch', lineHeight: 1.5, margin: 0 }}>
                        El acceso para <span style={{ color: textPrimary, fontWeight: 700 }}>talleres y empresas</span> estará disponible muy pronto.
                      </p>
                    </div>
                    )}

                    {/* Security badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, color: textMuted }}>
                      <ShieldCheck width={14} height={14} style={{ color: '#2ecc71' }} />
                      <span>Conexión cifrada SSL de CarLink</span>
                    </div>
                  </motion.div>
                )}

                {/* Loading */}
                {step === 'loading' && (
                  <motion.div
                    key="login-loading"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.04 }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '28px 0' }}
                  >
                    <div style={{ position: 'relative', width: 84, height: 84 }}>
                      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid rgba(245,197,24,0.14)' }} />
                      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid transparent', borderTopColor: gold, animation: 'spin 1s linear infinite' }} />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 34, height: 34, borderRadius: '50%', background: '#ffffff',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        }}>
                          <GoogleSVG width={20} height={20} />
                        </span>
                      </div>
                    </div>
                    <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    <div style={{ textAlign: 'center' }}>
                      <h3 style={{ fontFamily: "'Anton',sans-serif", fontSize: 18, fontWeight: 400, letterSpacing: '.02em', textTransform: 'uppercase', color: gold, marginBottom: 6 }}>
                        Verificando identidad
                      </h3>
                      <p style={{ fontSize: 12.5, color: textMuted, maxWidth: 220, margin: '0 auto', lineHeight: 1.5 }}>
                        Autenticando de forma segura tu acceso...
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Confirm email (signup) */}
                {step === 'confirm' && (
                  <motion.div
                    key="login-confirm"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ padding: '20px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}
                  >
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(245,197,24,0.14)', border: `1px solid ${goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MailIcon width={26} height={26} style={{ color: gold }} />
                    </div>
                    <h3 style={{ fontFamily: "'Anton',sans-serif", fontSize: 18, fontWeight: 400, letterSpacing: '.02em', textTransform: 'uppercase', color: textPrimary }}>
                      Revisa tu correo
                    </h3>
                    <p style={{ fontSize: 13, color: textSecondary, maxWidth: '30ch', margin: 0, lineHeight: 1.5 }}>
                      Te enviamos un enlace de confirmación a <span style={{ color: gold, fontWeight: 700 }}>{email}</span>. Ábrelo para activar tu cuenta.
                    </p>
                    <button
                      onClick={() => { setMode('signin'); setStep('form') }}
                      style={{ marginTop: 4, padding: '10px 20px', borderRadius: 10, border: `1px solid ${goldBorder}`, background: 'transparent', color: gold, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Volver a iniciar sesión
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ---------- Shared input helpers ---------- */
const labelStyle = (color: string): React.CSSProperties => ({
  display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
  textTransform: 'uppercase', color, marginBottom: 6,
})
const inputIconStyle: React.CSSProperties = {
  position: 'absolute', top: 0, bottom: 0, left: 12, display: 'flex', alignItems: 'center', pointerEvents: 'none',
}
const inputStyle = (bg: string, border: string, text: string): React.CSSProperties => ({
  width: '100%', padding: '12px 12px 12px 40px',
  background: bg, border: `1px solid ${border}`, borderRadius: 10,
  fontSize: 13, color: text, fontFamily: "'Inter',system-ui,sans-serif",
  outline: 'none', transition: 'border-color .18s',
})

function traducirError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login')) return 'Correo o contraseña incorrectos.'
  if (m.includes('already registered') || m.includes('already been registered')) return 'Este correo ya está registrado. Inicia sesión.'
  if (m.includes('email not confirmed')) return 'Confirma tu correo antes de iniciar sesión.'
  if (m.includes('password')) return 'La contraseña no cumple los requisitos (mínimo 6 caracteres).'
  return msg
}

/* ---------- Icons ---------- */
type IconProps = { width?: number; height?: number; style?: React.CSSProperties }

function ShieldCheck({ width = 14, height = 14, style }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  )
}

function XIcon({ width = 18, height = 18, style }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  )
}

function UserIcon({ width = 22, height = 22, style }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

function WrenchIcon({ width = 22, height = 22, style }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2.3-.6-.6-2.3z"/>
    </svg>
  )
}

function EyeIcon({ width = 18, height = 18, style }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function EyeOffIcon({ width = 18, height = 18, style }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function KeyIcon({ width = 16, height = 16, style }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <circle cx="7.5" cy="15.5" r="4.5"/>
      <path d="M10.7 12.3 20 3M17 6l2 2M15 8l2 2"/>
    </svg>
  )
}

function MailIcon({ width = 16, height = 16, style }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="M22 6L12 13L2 6"/>
    </svg>
  )
}

function ArrowRightIcon({ width = 18, height = 18, style }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  )
}

function AlertIcon({ width = 14, height = 14, style }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
}
