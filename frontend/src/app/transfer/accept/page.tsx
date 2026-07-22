'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { supabase as supabaseClient } from '@/lib/supabase'

function TransferAcceptContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const transferId = searchParams.get('transfer')
  const email = searchParams.get('email')

  const [step, setStep] = useState<'loading' | 'unauth' | 'accept' | 'register' | 'success' | 'error'>('loading')
  const [transfer, setTransfer] = useState<any>(null)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    if (!transferId) {
      setStep('error')
      setError('ID de transferencia no proporcionado')
      return
    }
    validateTransfer()
    checkAuth()
  }, [transferId])

  const checkAuth = useCallback(async () => {
    const { data: { session } } = await supabaseClient.auth.getSession()
    if (session?.user) {
      setUser(session.user)
      if (session.user.email?.toLowerCase() === email?.toLowerCase()) {
        setStep('accept')
      } else {
        setStep('accept')
      }
    } else {
      setStep('unauth')
    }
  }, [email])

  const validateTransfer = async () => {
    try {
      const res = await fetch(`/api/vehicles/transfers/${transferId}/validate`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Transferencia no válida')
      setTransfer(data)
      
      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        setStep('error')
        setError('Esta transferencia ha expirado')
      }
    } catch (e: any) {
      setStep('error')
      setError(e.message)
    }
  }

  const handleAccept = async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await fetch(`/api/vehicles/transfers/${transferId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${(await supabaseClient.auth.getSession()).data.session?.access_token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error aceptando transferencia')
      setStep('success')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async () => {
    await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?redirect=/transfer/accept?transfer=${transferId}&email=${email}` }
    })
  }

  const handleRegister = () => {
    router.push(`/register?transfer=${transferId}&email=${email}`)
  }

  const vehicle = transfer?.vehicle
  const fromUser = transfer?.from_user

  if (step === 'loading') {
    return <LoadingScreen />
  }

  if (step === 'error') {
    return <ErrorScreen error={error} />
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {step === 'unauth' && (
          <UnauthScreen 
            vehicle={vehicle} 
            fromUser={fromUser} 
            onSignIn={handleSignIn}
            onRegister={handleRegister}
            email={email}
          />
        )}

        {step === 'accept' && (
          <AcceptScreen 
            vehicle={vehicle} 
            fromUser={fromUser} 
            onAccept={handleAccept}
            loading={loading}
            error={error}
            userEmail={user?.email}
          />
        )}

        {step === 'success' && (
          <SuccessScreen onGoToApp={() => router.push('/app')} />
        )}
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={styles.fullScreen}>
      <div style={styles.spinner} />
      <p style={styles.loadingText}>Validando transferencia...</p>
    </div>
  )
}

function ErrorScreen({ error }: { error: string }) {
  return (
    <div style={styles.fullScreen}>
      <div style={styles.errorIcon}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <h2 style={styles.title}>Transferencia no válida</h2>
      <p style={styles.errorText}>{error}</p>
      <a href="/" style={styles.link}>Volver al inicio</a>
    </div>
  )
}

function UnauthScreen({ vehicle, fromUser, onSignIn, onRegister, email }: any) {
  return (
    <div>
      <div style={styles.vehiclePreview}>
        <div style={styles.vehicleInfo}>
          <div style={styles.vehicleTitle}>{vehicle?.brand} {vehicle?.model} ({vehicle?.year})</div>
          <div style={styles.vehiclePlate}>{vehicle?.plate}</div>
          <div style={styles.fromInfo}>Transferido por: {fromUser?.full_name || fromUser?.email}</div>
        </div>
      </div>
      <h2 style={styles.title}>Te han transferido un vehículo</h2>
      <p style={styles.description}>
        {email ? `Esta transferencia está destinada a <strong>${email}</strong>.` : 'Esta transferencia requiere autenticación.'}
      </p>
      <div style={styles.actions}>
        <button onClick={onSignIn} style={styles.btnPrimary}>
          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Continuar con Google
        </button>
        <button onClick={onRegister} style={styles.btnSecondary}>
          Crear cuenta nueva
        </button>
      </div>
      <p style={styles.note}>Al continuar, aceptas los términos y la transferencia del vehículo a tu nombre.</p>
    </div>
  )
}

function AcceptScreen({ vehicle, fromUser, onAccept, loading, error, userEmail }: any) {
  return (
    <div>
      <div style={styles.vehiclePreview}>
        <div style={styles.vehicleInfo}>
          <div style={styles.vehicleTitle}>{vehicle?.brand} {vehicle?.model} ({vehicle?.year})</div>
          <div style={styles.vehiclePlate}>{vehicle?.plate}</div>
          <div style={styles.vehicleDetails}>
            {vehicle?.color && <span>{vehicle.color}</span>}
            {vehicle?.city && <span>{vehicle.city}</span>}
          </div>
          <div style={styles.fromInfo}>Transferido por: {fromUser?.full_name || fromUser?.email}</div>
        </div>
      </div>
      
      <h2 style={styles.title}>Aceptar transferencia de vehículo</h2>
      <p style={styles.description}>
        Estás a punto de recibir <strong>{vehicle?.brand} {vehicle?.model} ({vehicle?.plate})</strong> 
        en tu cuenta CarLink. Esto incluirá:
      </p>
<ul style={styles.featureList}>
        <li>Historial de mantenimiento completo</li>
        <li>Documentos (SOAT, RTM, facturas)</li>
        <li>Control de partes e inspecciones</li>
        <li>Llavero NFC activo (si aplica)</li>
      </ul>
      
      {error && <div style={styles.errorBanner}>{error}</div>}
      
      <div style={styles.warningBox}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span>Esta acción es <strong>irreversible</strong>. El vehículo aparecerá en tu panel y el anterior propietario solo lo verá como "Transferido" (solo lectura).</span>
      </div>

      <div style={styles.actions}>
        <button onClick={() => window.history.back()} style={styles.btnSecondary}>Cancelar</button>
        <button onClick={onAccept} disabled={loading} style={styles.btnPrimary}>
          {loading ? 'Aceptando...' : 'Aceptar y recibir vehículo'}
        </button>
      </div>
    </div>
  )
}

function SuccessScreen({ onGoToApp }: any) {
  return (
    <div>
      <div style={styles.successIcon}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
      </div>
      <h2 style={styles.title}>¡Vehículo recibido!</h2>
      <p style={styles.description}>
        La transferencia se completó correctamente. El vehículo ya está disponible en tu panel CarLink.
      </p>
      <button onClick={onGoToApp} style={styles.btnPrimary}>Ir a mi panel</button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#060606',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    fontFamily: "'Inter',system-ui,sans-serif",
  },
  fullScreen: {
    textAlign: 'center',
    color: '#f5f3ec',
    maxWidth: 400,
  },
  spinner: {
    width: 48, height: 48, borderRadius: '50%',
    border: '3px solid rgba(245,197,24,0.2)',
    borderTopColor: '#F5C518',
    animation: 'spin .8s linear infinite',
    margin: '0 auto 16px',
  },
  loadingText: { color: '#b6b2a6', fontSize: 14 },
  errorIcon: { color: '#ff4d6a', marginBottom: 16 },
  card: {
    width: '100%', maxWidth: 480,
    background: 'var(--panel-bg, #141414)',
    border: '1px solid var(--panel-border, rgba(245,197,24,0.3))',
    borderRadius: 22,
    padding: 28,
    boxShadow: '0 40px 90px rgba(0,0,0,.6)',
  },
  vehiclePreview: {
    background: 'linear-gradient(155deg,rgba(245,197,24,0.08),rgba(20,20,20,0.6))',
    border: '1px solid rgba(245,197,24,0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  vehicleInfo: { textAlign: 'center' },
  vehicleTitle: { fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 800, marginBottom: 4 },
  vehiclePlate: { fontFamily: "'Anton',sans-serif", fontSize: 16, color: '#F5C518', fontWeight: 700, marginBottom: 4 },
  vehicleDetails: { display: 'flex', gap: 12, justifyContent: 'center', fontSize: 12, color: '#8f8a7a', marginBottom: 8, flexWrap: 'wrap' },
  fromInfo: { fontSize: 12, color: '#8f8a7a' },
  title: { fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 800, margin: '0 0 12px', textAlign: 'center' },
  description: { color: '#b6b2a6', fontSize: 14, lineHeight: 1.6, textAlign: 'center', marginBottom: 20 },
  featureList: { 
    margin: '0 0 20px 18px', padding: 0, color: '#d8d4c8', fontSize: 13, lineHeight: 1.8,
    listStyle: 'disc'
  },
  errorBanner: { 
    padding: '10px 12px', borderRadius: 10, background: 'rgba(255,77,106,0.1)', 
    border: '1px solid rgba(255,77,106,0.3)', color: '#ff6b8a', fontSize: 13, marginBottom: 16 
  },
  warningBox: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '12px 14px', borderRadius: 10,
    background: 'rgba(255,138,61,0.1)', border: '1px solid rgba(255,138,61,0.25)',
    color: '#ffcf5a', fontSize: 12, lineHeight: 1.5, marginBottom: 20,
  },
  actions: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 },
  btnSecondary: { 
    padding: '12px 20px', borderRadius: 11, 
    border: '1px solid var(--input-border, rgba(255,255,255,0.14))', 
    background: 'var(--input-bg, rgba(255,255,255,0.04))', 
    color: '#b6b2a6', fontSize: 13, fontWeight: 600, cursor: 'pointer' 
  },
btnPrimary: { 
    padding: '12px 24px', borderRadius: 11, border: 'none', 
    background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 13, 
    cursor: 'pointer', boxShadow: '0 0 20px rgba(245,197,24,0.35)',
  },
  note: { color: '#8f8a7a', fontSize: 12, textAlign: 'center', lineHeight: 1.5, marginTop: 16 },
  successIcon: { color: '#2ecc71', marginBottom: 16 },
  link: { display: 'inline-block', marginTop: 20, color: '#F5C518', fontWeight: 600, textDecoration: 'none' },
}

export const dynamic = 'force-dynamic'

export default function TransferAcceptPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TransferAcceptContent />
    </Suspense>
  )
}

function LoadingFallback() {
  return (
    <div style={styles.fullScreen}>
      <div style={styles.spinner} />
      <p style={styles.loadingText}>Validando transferencia...</p>
    </div>
  )
}