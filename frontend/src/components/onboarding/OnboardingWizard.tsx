'use client'

import { useState, useEffect, useCallback } from 'react'
import CarLinkLogo from '@/components/CarLinkLogo'
import StepBienvenida from './StepBienvenida'
import StepVehiculo from './StepVehiculo'
import StepWhatsapp from './StepWhatsapp'
import StepLlavero from './StepLlavero'

const STORAGE_PREFIX = 'carlink_onboarding_'

interface Props {
  userId: string
  existingVehicle?: any
  existingProfile?: any
  onComplete: () => void
  onVehicleCreated: (vehicle: any) => void
  onLlaveroActivated?: () => void
  theme: 'light' | 'dark'
}

const STEPS = [
  { id: 'bienvenida', label: 'Bienvenida', required: true },
  { id: 'vehiculo', label: 'Vehiculo', required: true },
  { id: 'whatsapp', label: 'WhatsApp', required: false },
  { id: 'llavero', label: 'Llavero', required: false },
]

/* ── Persistencia de pasos completados ── */
function isStepDone(userId: string, stepId: string): boolean {
  if (typeof window === 'undefined') return false
  try { return localStorage.getItem(`${STORAGE_PREFIX}done_${userId}_${stepId}`) === '1' }
  catch { return false }
}

function markStepDone(userId: string, stepId: string) {
  try { localStorage.setItem(`${STORAGE_PREFIX}done_${userId}_${stepId}`, '1') } catch {}
}

function getFirstIncompleteStep(userId: string): number {
  const idx = STEPS.findIndex(s => !isStepDone(userId, s.id))
  return idx === -1 ? STEPS.length - 1 : idx
}

function getSavedStep(userId: string): number {
  if (typeof window === 'undefined') return 0
  try {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}step_${userId}`)
    return saved ? parseInt(saved, 10) : 0
  } catch { return 0 }
}

function saveStep(userId: string, step: number) {
  try { localStorage.setItem(`${STORAGE_PREFIX}step_${userId}`, String(step)) } catch {}
}

function markAllDone(userId: string) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}done_${userId}`, '1')
    localStorage.removeItem(`${STORAGE_PREFIX}step_${userId}`)
  } catch {}
}

export function isOnboardingDone(userId: string): boolean {
  if (typeof window === 'undefined') return false
  try { return localStorage.getItem(`${STORAGE_PREFIX}done_${userId}`) === '1' }
  catch { return false }
}

/* ── Borradores por campo (2026-09-15) ──
   Cada Step es un componente aparte que se desmonta al navegar a otro paso
   (OnboardingWizard sólo renderiza `step === N`), así que su estado local
   (lo que el usuario tecleó pero no confirmó — código de activación, placa,
   número de WhatsApp) se perdía al volver "Atrás" y adelante de nuevo.
   Mismo patrón de persistencia que isStepDone/markStepDone de arriba, pero
   por campo en vez de por paso — cada Step llama getDraft/saveDraft con su
   propia clave (ej. "vehiculo_plate", "llavero_code"). */
export function getDraft(userId: string, key: string): string {
  if (typeof window === 'undefined') return ''
  try { return localStorage.getItem(`${STORAGE_PREFIX}draft_${userId}_${key}`) || '' }
  catch { return '' }
}

export function saveDraft(userId: string, key: string, value: string) {
  try {
    if (value) localStorage.setItem(`${STORAGE_PREFIX}draft_${userId}_${key}`, value)
    else localStorage.removeItem(`${STORAGE_PREFIX}draft_${userId}_${key}`)
  } catch {}
}

export default function OnboardingWizard({ userId, existingVehicle, existingProfile, onComplete, onVehicleCreated, onLlaveroActivated, theme }: Props) {
  const isDark = theme !== 'light'
  const [step, setStep] = useState(() => {
    const saved = getSavedStep(userId)
    if (saved > 0 && saved < STEPS.length) return saved
    return getFirstIncompleteStep(userId)
  })
  const [vehicle, setVehicle] = useState<any>(existingVehicle || null)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  // Oculta "Omitir por ahora" del pie una vez que el llavero ya quedó
  // activado (2026-09-15) — no tiene sentido ofrecer "omitir" algo que ya
  // se hizo. StepLlavero llama esto tanto al activar como al detectar que
  // el vehículo ya tenía uno activo de antes.
  const [llaveroActivated, setLlaveroActivated] = useState(false)

  useEffect(() => {
    if (existingVehicle && !vehicle) setVehicle(existingVehicle)
  }, [existingVehicle])

  useEffect(() => { saveStep(userId, step) }, [step, userId])

  const goNext = useCallback(() => {
    markStepDone(userId, STEPS[step].id)
    if (step < STEPS.length - 1) {
      const nextStep = step + 1
      setStep(nextStep)
    } else {
      markAllDone(userId)
      onComplete()
    }
  }, [step, userId, onComplete])

  const skipStep = useCallback(() => {
    if (!STEPS[step].required) {
      markStepDone(userId, STEPS[step].id)
      goNext()
    }
  }, [step, goNext, userId])

  const handleClose = useCallback(() => {
    const hasUncompletedRequired = STEPS.some((s, i) => s.required && !isStepDone(userId, s.id) && i >= step)
    if (hasUncompletedRequired) {
      setShowCloseConfirm(true)
    } else {
      markAllDone(userId)
      onComplete()
    }
  }, [userId, onComplete, step])

  const confirmClose = useCallback(() => {
    setShowCloseConfirm(false)
    markAllDone(userId)
    onComplete()
  }, [userId, onComplete])

  const panelBg = isDark ? '#0e0e0e' : '#fff'
  const overlayBg = 'rgba(4,4,4,0.72)'
  // Tokens del sistema (docs/DESIGN_GUIDELINES.md — "NEVER use hardcoded
  // colors"), no hex propio: antes este wizard usaba #f5f3ec/#17171a sueltos,
  // desalineado del resto de la app.
  const textPrimary = 'var(--text-1)'
  const textMuted = 'var(--text-3)'
  const borderColor = isDark ? 'rgba(245,197,24,0.2)' : 'rgba(17,17,17,0.1)'

  /* z-index 480, no 200 (2026-09-19): compartía z-index con CartModal — al
     empate gana quien está más abajo en el DOM, y CartModal se renderiza
     después en app/page.tsx, así que si alguna vez se abría detrás del
     wizard (ver el `inert` que ahora lo evita) terminaba tapándolo. 480
     queda por debajo de CameraCapture (500, el propio paso de escaneo del
     wizard) pero por encima de cualquier otro modal de la app. */
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 480, background: overlayBg, backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 500, maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto', background: panelBg, border: `1px solid ${borderColor}`, borderRadius: 20, padding: 24, boxShadow: '0 40px 90px rgba(0,0,0,.6)' }}>

        {/* Header con logo, titulo y boton cerrar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <CarLinkLogo size={32} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: textPrimary, fontFamily: 'var(--font-ui)' }}>
              Configuracion inicial
            </div>
            <div style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>
              Paso {step + 1} de {STEPS.length}
            </div>
          </div>
          {/* Sin botón de cerrar en Bienvenida/Vehiculo (2026-09-15, pedido
             del usuario) — esos dos son los pasos obligatorios de verdad;
             recién a partir de WhatsApp (opcional) tiene sentido dejar
             salir del wizard sin terminarlo. */}
          {step > 1 && (
            <button onClick={handleClose} title="Cerrar configuracion" style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid ${borderColor}`, background: 'transparent', color: textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .16s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,197,24,0.4)'; e.currentTarget.style.color = textPrimary }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = borderColor; e.currentTarget.style.color = textMuted }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        {/* Progress dots - muestran pasos completados con checkmark. Amarillo
           en vez del verde de éxito del resto de la app (#2ecc71) — pedido
           explícito del usuario, sólo para este wizard. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 24, padding: '0 4px' }}>
          {STEPS.map((s, i) => {
            const done = isStepDone(userId, s.id)
            const isCurrent = i === step
            return (
              <div key={s.id} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flex: '0 0 auto',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, transition: 'all .25s',
                  background: done || isCurrent ? 'rgba(245,197,24,0.15)' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                  color: done || isCurrent ? '#F5C518' : textMuted,
                  border: done || isCurrent ? '2px solid #F5C518' : `1px solid ${borderColor}`,
                }}>
                  {done ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  ) : (i + 1)}
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 2, borderRadius: 1, background: done ? '#F5C518' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
                )}
              </div>
            )
          })}
        </div>

        {/* Step content */}
        <div style={{ minHeight: 300 }}>
          {step === 0 && <StepBienvenida theme={theme} onContinue={goNext} />}
          {step === 1 && <StepVehiculo userId={userId} theme={theme} vehicle={vehicle} onCreated={(v) => { setVehicle(v); onVehicleCreated(v); goNext() }} onContinue={goNext} />}
          {step === 2 && <StepWhatsapp userId={userId} theme={theme} existingNumber={existingProfile?.whatsapp_number || ''} onContinue={goNext} />}
          {step === 3 && <StepLlavero userId={userId} theme={theme} vehicle={vehicle} onActivated={() => { setLlaveroActivated(true); onLlaveroActivated?.() }} onContinue={goNext} />}
        </div>

        {/* Navigation — sin "Atras" (2026-09-15, pedido del usuario): con el
           auto-avance de Vehiculo/WhatsApp cuando ya están hechos (ver esos
           componentes), "Atras" quedaba roto en la práctica — volvía a un
           paso ya completado que rebotaba para adelante de nuevo. Cada paso
           opcional se puede completar después de todos modos, sin el
           wizard: WhatsApp desde "Mi perfil", Llavero desde el panel de
           llavero del topbar — no hace falta volver acá para eso. Sólo
           queda "Omitir por ahora", y sólo si hay algo que omitir. */}
        {!STEPS[step].required && !(STEPS[step].id === 'llavero' && llaveroActivated) && (
        <div style={{ display: 'flex', gap: 10, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${borderColor}` }}>
          <button onClick={skipStep} style={{ padding: '11px 18px', borderRadius: 11, border: 'none', background: 'transparent', color: textMuted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.color = textPrimary }}
            onMouseLeave={e => { e.currentTarget.style.color = textMuted }}>
            Omitir por ahora
          </button>
        </div>
        )}
      </div>

      {/* Modal de confirmacion al cerrar */}
      {showCloseConfirm && (
        <div onClick={() => setShowCloseConfirm(false)} style={{ position: 'fixed', inset: 0, zIndex: 490, background: 'rgba(4,4,4,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 400, maxWidth: '94vw', background: panelBg, border: `1px solid ${borderColor}`, borderRadius: 20, padding: 24, boxShadow: '0 40px 90px rgba(0,0,0,.6)' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: textPrimary, marginBottom: 8, fontFamily: 'var(--font-ui)' }}>Cerrar configuracion?</div>
            <p style={{ fontSize: 13, color: textMuted, lineHeight: 1.6, margin: '0 0 18px' }}>
              Te faltan pasos por completar. Podes continuar despues desde el tablero en cualquier momento.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowCloseConfirm(false)} style={{ flex: 1, padding: 12, borderRadius: 11, border: `1px solid ${borderColor}`, background: 'transparent', color: textMuted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,197,24,0.4)'; e.currentTarget.style.color = textPrimary }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = borderColor; e.currentTarget.style.color = textMuted }}>
                Cancelar
              </button>
              <button onClick={confirmClose} style={{ flex: 1, padding: 12, borderRadius: 11, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
