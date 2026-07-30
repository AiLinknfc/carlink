'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  isOpen: boolean
  onClose: () => void
  theme: 'light' | 'dark'
  qrUrl: string | null
  plateText?: string
}

const GOLD = '#F5C518'

type Shape = 'square' | 'rounded' | 'dots' | 'classy'
type Protection = 'M' | 'Q' | 'H'

const SHAPES: { id: Shape; label: string; dotsType: 'square' | 'rounded' | 'dots' | 'classy'; cornerSquare: 'square' | 'extra-rounded' | 'dot'; cornerDot: 'square' | 'dot' }[] = [
  { id: 'square', label: 'Cuadrados', dotsType: 'square', cornerSquare: 'square', cornerDot: 'square' },
  { id: 'rounded', label: 'Redondeado', dotsType: 'rounded', cornerSquare: 'extra-rounded', cornerDot: 'dot' },
  { id: 'dots', label: 'Puntos', dotsType: 'dots', cornerSquare: 'dot', cornerDot: 'dot' },
  { id: 'classy', label: 'Clásico', dotsType: 'classy', cornerSquare: 'extra-rounded', cornerDot: 'square' },
]

const PROTECTIONS: { id: Protection; label: string; hint: string }[] = [
  { id: 'M', label: 'Simple', hint: 'Patrón más limpio' },
  { id: 'Q', label: 'Estándar', hint: 'Buen balance' },
  { id: 'H', label: 'Máxima resistencia', hint: 'Aguanta rayones y suciedad' },
]

export default function QrCodePanel({ isOpen, onClose, theme, qrUrl, plateText }: Props) {
  const [shape, setShape] = useState<Shape>('rounded')
  const [protection, setProtection] = useState<Protection>('H')
  const containerRef = useRef<HTMLDivElement>(null)
  const qrRef = useRef<any>(null)

  const isDark = theme === 'dark'
  const panelBg = isDark ? 'rgba(16,16,16,0.97)' : 'rgba(247,246,242,0.98)'
  const border = isDark ? 'rgba(245,197,24,0.22)' : 'rgba(17,17,17,0.12)'
  const subtle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,17,0.08)'
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)'
  const textPrimary = isDark ? '#f5f3ec' : '#17171a'
  const textMuted = isDark ? '#7c786e' : '#7a756a'

  useEffect(() => {
    if (!isOpen || !qrUrl) return
    let cancelled = false

    import('qr-code-styling').then(({ default: QRCodeStyling }) => {
      if (cancelled || !containerRef.current) return
      const active = SHAPES.find(s => s.id === shape) || SHAPES[1]

      if (!qrRef.current) {
        qrRef.current = new QRCodeStyling({
          width: 220,
          height: 220,
          data: qrUrl,
          margin: 8,
          qrOptions: { errorCorrectionLevel: protection },
          dotsOptions: { type: active.dotsType, color: '#111111' },
          cornersSquareOptions: { type: active.cornerSquare, color: '#111111' },
          cornersDotOptions: { type: active.cornerDot, color: '#111111' },
          backgroundOptions: { color: '#ffffff' },
        })
        containerRef.current.innerHTML = ''
        qrRef.current.append(containerRef.current)
      } else {
        qrRef.current.update({
          data: qrUrl,
          qrOptions: { errorCorrectionLevel: protection },
          dotsOptions: { type: active.dotsType, color: '#111111' },
          cornersSquareOptions: { type: active.cornerSquare, color: '#111111' },
          cornersDotOptions: { type: active.cornerDot, color: '#111111' },
        })
      }
    })

    return () => { cancelled = true }
  }, [isOpen, qrUrl, shape, protection])

  useEffect(() => {
    if (!isOpen) qrRef.current = null
  }, [isOpen])

  const handleDownload = () => {
    if (!qrRef.current) return
    qrRef.current.download({ name: `carlink-qr-${plateText || 'llavero'}`, extension: 'png' })
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', background: panelBg, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: `1px solid ${border}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,.6)', color: textPrimary }}
          >
            <div style={{ padding: '18px 22px', borderBottom: `1px solid ${subtle}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Código QR del llavero</h2>
                <p style={{ fontSize: 11.5, color: textMuted, margin: '2px 0 0' }}>Escanéalo o imprímelo — lleva a tu ficha pública</p>
              </div>
              <button onClick={onClose} aria-label="Cerrar" style={{ width: 34, height: 34, borderRadius: 10, background: cardBg, border: `1px solid ${subtle}`, color: textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
              {!qrUrl ? (
                <p style={{ fontSize: 12.5, color: textMuted, textAlign: 'center', margin: '20px 0' }}>Activa tu llavero primero para generar el código QR.</p>
              ) : (
                <>
                  <div style={{ padding: 14, borderRadius: 14, background: '#ffffff', border: `1px solid ${subtle}` }}>
                    <div ref={containerRef} />
                  </div>

                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '.08em' }}>Forma del patrón</span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {SHAPES.map(s => (
                        <button key={s.id} onClick={() => setShape(s.id)} style={{
                          padding: '7px 11px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          border: `1px solid ${shape === s.id ? GOLD : subtle}`,
                          background: shape === s.id ? 'rgba(245,197,24,0.14)' : 'transparent',
                          color: shape === s.id ? GOLD : textPrimary,
                        }}>{s.label}</button>
                      ))}
                    </div>
                  </div>

                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '.08em' }}>Nivel de protección</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {PROTECTIONS.map(p => (
                        <button key={p.id} onClick={() => setProtection(p.id)} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left',
                          padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
                          border: `1px solid ${protection === p.id ? GOLD : subtle}`,
                          background: protection === p.id ? 'rgba(245,197,24,0.1)' : 'transparent',
                          color: textPrimary,
                        }}>
                          <span style={{ fontSize: 12.5, fontWeight: 700 }}>{p.label}</span>
                          <span style={{ fontSize: 11, color: textMuted }}>{p.hint}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={handleDownload} style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 12, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 13.5, cursor: 'pointer' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                    Descargar PNG para imprimir
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
