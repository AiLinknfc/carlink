'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'

const STORAGE_PREFIX = 'carlink_tour_'

/* Mismo patrón de persistencia que isOnboardingDone/markAllDone de
   OnboardingWizard.tsx, pero con su propia clave — no pisa la del wizard,
   así que completar/reiniciar uno no afecta al otro. */
export function isTourDone(userId: string): boolean {
  if (typeof window === 'undefined') return false
  try { return localStorage.getItem(`${STORAGE_PREFIX}done_${userId}`) === '1' }
  catch { return false }
}

export function markTourDone(userId: string) {
  try { localStorage.setItem(`${STORAGE_PREFIX}done_${userId}`, '1') } catch {}
}

export interface TourStep {
  id: string
  /** Valor del atributo data-tour="..." del elemento a resaltar. */
  selector: string
  title: string
  body: string
  /** Lado preferido para la tarjeta de texto — si no entra en el viewport,
   * se prueba con los demás lados automáticamente. */
  placement?: 'top' | 'bottom' | 'left' | 'right'
  /** Side-effect al entrar al paso (ej. forzar el rail/cajón abierto). */
  onEnter?: () => void
  /** Revierte el side-effect — se llama tanto al avanzar de paso como al
   * saltar/terminar el recorrido o desmontar el componente. */
  onExit?: () => void
}

interface Props {
  steps: TourStep[]
  onFinish: () => void
  onSkip: () => void
  theme: 'light' | 'dark'
}

interface Rect { top: number; left: number; width: number; height: number }

const PAD = 6
const GAP = 14
const EDGE = 12
const TOOLTIP_W = 340
const TOOLTIP_H_EST = 210

export default function GuidedTour({ steps, onFinish, onSkip, theme }: Props) {
  const isDark = theme !== 'light'
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const [vp, setVp] = useState({ w: 0, h: 0 })
  const [cardH, setCardH] = useState(TOOLTIP_H_EST)
  const [mounted, setMounted] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | undefined>(undefined)
  const step = steps[index]

  useEffect(() => { setMounted(true) }, [])

  // Side-effects por paso (forzar sidebar/perfil abiertos, fijar la pestaña
  // activa, etc.) — el cleanup corre tanto al cambiar de paso como al
  // desmontar, así "Saltar recorrido" a mitad de camino también revierte
  // el side-effect del paso en el que estaba parado.
  useEffect(() => {
    step.onEnter?.()
    return () => step.onExit?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  // Loop de medición: relee la posición del target y el tamaño del viewport
  // en cada frame, para quedar sincronizado con las transiciones CSS del
  // rail/cajón y con rotaciones/resize. Sólo hace setState si algo cambió.
  useEffect(() => {
    let scrolled = false
    const tick = () => {
      const el = document.querySelector(`[data-tour="${step.selector}"]`)
      const w = window.innerWidth
      const h = window.innerHeight
      setVp(p => (p.w === w && p.h === h ? p : { w, h }))
      if (el) {
        // Una vez por paso, traer al viewport un target que quedó fuera de
        // pantalla (típico en móvil: accesos rápidos bajo el pliegue).
        if (!scrolled) {
          const r0 = el.getBoundingClientRect()
          if (r0.width > 0 && (r0.bottom > h || r0.top < 0) && r0.height < h) {
            el.scrollIntoView({ block: 'center', behavior: 'auto' })
          }
          if (r0.width > 0) scrolled = true
        }
        const r = el.getBoundingClientRect()
        setRect(p => (p && p.top === r.top && p.left === r.left && p.width === r.width && p.height === r.height
          ? p : { top: r.top, left: r.left, width: r.width, height: r.height }))
      } else {
        setRect(null)
      }
      if (cardRef.current) {
        const ch = cardRef.current.offsetHeight
        setCardH(p => (p === ch ? p : ch))
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  const handleNext = () => {
    if (index < steps.length - 1) setIndex(i => i + 1)
    else onFinish()
  }

  const panelBorder = isDark ? 'rgba(245,197,24,0.2)' : 'rgba(17,17,17,0.1)'
  const trackColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(17,17,17,0.12)'

  const vw = vp.w || (typeof window !== 'undefined' ? window.innerWidth : 0)
  const vh = vp.h || (typeof window !== 'undefined' ? window.innerHeight : 0)
  const compact = vw <= 600
  const cardW = Math.min(TOOLTIP_W, vw - EDGE * 2)

  // Marco del spotlight recortado al viewport: si el target es más grande o
  // se sale de la pantalla (cajón/perfil a alto completo en móvil), el borde
  // amarillo se dibuja igual, pegado al borde visible en vez de quedar fuera.
  let frame: Rect | null = null
  if (rect) {
    const top = Math.max(rect.top - PAD, 3)
    const left = Math.max(rect.left - PAD, 3)
    const bottom = Math.min(rect.top + rect.height + PAD, vh - 3)
    const right = Math.min(rect.left + rect.width + PAD, vw - 3)
    frame = { top, left, width: Math.max(right - left, 0), height: Math.max(bottom - top, 0) }
  }

  // Tarjeta: se prueba el lado preferido y los demás con la altura REAL
  // medida; si ninguno cabe sin tapar el target, se ancla arriba o abajo
  // (el lado con más espacio libre), centrada y a todo lo ancho útil. Nunca
  // se sale del viewport ni queda descentrada.
  const cardStyle: CSSProperties = { position: 'fixed', width: cardW, maxHeight: vh - EDGE * 2, overflowY: 'auto' }
  const centerX = Math.max((vw - cardW) / 2, EDGE)
  const clampLeft = (x: number) => Math.min(Math.max(x, EDGE), Math.max(vw - cardW - EDGE, EDGE))
  const clampTop = (y: number) => Math.min(Math.max(y, EDGE), Math.max(vh - cardH - EDGE, EDGE))

  if (frame && vw > 0) {
    const spaceBelow = vh - (frame.top + frame.height)
    const spaceAbove = frame.top
    const fits = {
      bottom: spaceBelow >= cardH + GAP + EDGE,
      top: spaceAbove >= cardH + GAP + EDGE,
      right: !compact && vw - (frame.left + frame.width) >= cardW + GAP + EDGE,
      left: !compact && frame.left >= cardW + GAP + EDGE,
    }
    const order: Array<'top' | 'bottom' | 'left' | 'right'> = [step.placement || 'bottom', 'bottom', 'top', 'right', 'left']
    const chosen = order.find(p => fits[p])

    if (chosen === 'bottom') {
      cardStyle.top = frame.top + frame.height + GAP
      cardStyle.left = compact ? centerX : clampLeft(frame.left)
    } else if (chosen === 'top') {
      cardStyle.top = frame.top - GAP - cardH
      cardStyle.left = compact ? centerX : clampLeft(frame.left)
    } else if (chosen === 'right') {
      cardStyle.left = frame.left + frame.width + GAP
      cardStyle.top = clampTop(frame.top + frame.height / 2 - cardH / 2)
    } else if (chosen === 'left') {
      cardStyle.left = frame.left - GAP - cardW
      cardStyle.top = clampTop(frame.top + frame.height / 2 - cardH / 2)
    } else {
      // No cabe junto al target (ocupa casi toda la pantalla): sobre el lado
      // con más espacio libre, centrada — puede tapar el resto de la app pero
      // el borde amarillo del target sigue visible.
      cardStyle.left = centerX
      if (spaceAbove > spaceBelow) cardStyle.top = EDGE
      else cardStyle.top = Math.max(vh - cardH - EDGE, EDGE)
    }
  } else {
    // Target todavía no está en el DOM — ancla transitoria centrada abajo.
    cardStyle.left = centerX
    cardStyle.top = Math.max(vh - cardH - EDGE, EDGE)
  }

  if (!mounted) return null

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, pointerEvents: 'none' }}>
      {frame ? (
        <div style={{
          position: 'fixed', top: frame.top, left: frame.left,
          width: frame.width, height: frame.height,
          border: '2px solid #F5C518', borderRadius: 14,
          boxShadow: '0 0 0 9999px rgba(4,4,4,.72), 0 0 24px rgba(245,197,24,.35)',
          transition: 'top .18s ease, left .18s ease, width .18s ease, height .18s ease',
        }} />
      ) : (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(4,4,4,.72)' }} />
      )}

      <div ref={cardRef} style={{ ...cardStyle, pointerEvents: 'auto', background: 'var(--panel-bg)', border: `1px solid ${panelBorder}`, borderRadius: 16, padding: compact ? 16 : 20, boxShadow: '0 30px 70px rgba(0,0,0,.5)', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
          {steps.map((s, i) => (
            <div key={s.id} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= index ? '#F5C518' : trackColor, transition: 'background .2s' }} />
          ))}
        </div>
        <div style={{ fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700, marginBottom: 6 }}>
          Paso {index + 1} de {steps.length}
        </div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: compact ? 15 : 16, fontWeight: 800, color: 'var(--text-1)', marginBottom: 6 }}>{step.title}</div>
        <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5, margin: compact ? '0 0 14px' : '0 0 18px' }}>{step.body}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <button onClick={onSkip} style={{ padding: '8px 4px', border: 'none', background: 'transparent', color: 'var(--text-3)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
            Saltar recorrido
          </button>
          <button onClick={handleNext} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
            {index < steps.length - 1 ? 'Siguiente' : 'Entendido'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
