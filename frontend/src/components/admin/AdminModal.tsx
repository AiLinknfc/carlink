'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  theme: 'light' | 'dark'
  maxWidth?: number
  children: React.ReactNode
  footer?: React.ReactNode
}

export default function AdminModal({ isOpen, onClose, title, subtitle, theme, maxWidth = 440, children, footer }: Props) {
  const isDark = theme === 'dark'
  const panelBg = isDark ? 'rgba(16,16,16,0.97)' : 'rgba(247,246,242,0.98)'
  const border = isDark ? 'rgba(245,197,24,0.22)' : 'rgba(17,17,17,0.12)'
  const subtle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,17,0.08)'
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)'
  const textPrimary = isDark ? '#f5f3ec' : '#17171a'
  const textMuted = isDark ? '#7c786e' : '#7a756a'

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth, maxHeight: '86vh', display: 'flex', flexDirection: 'column', background: panelBg, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: `1px solid ${border}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,.6)', color: textPrimary }}
          >
            <div style={{ padding: '18px 22px', borderBottom: `1px solid ${subtle}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{title}</h2>
                {subtitle && <p style={{ fontSize: 11.5, color: textMuted, margin: '2px 0 0' }}>{subtitle}</p>}
              </div>
              <button onClick={onClose} aria-label="Cerrar" style={{ width: 34, height: 34, borderRadius: 10, background: cardBg, border: `1px solid ${subtle}`, color: textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div style={{ padding: 22, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {children}
            </div>

            {footer && (
              <div style={{ padding: '14px 22px', borderTop: `1px solid ${subtle}`, display: 'flex', justifyContent: 'flex-end', gap: 10, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)' }}>
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export const adminModalStyles = {
  label: (isDark: boolean): React.CSSProperties => ({ fontSize: 10.5, fontWeight: 700, color: isDark ? '#7c786e' : '#7a756a', textTransform: 'uppercase', letterSpacing: '.06em' }),
  input: (isDark: boolean): React.CSSProperties => ({
    padding: '10px 12px', borderRadius: 10, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box',
    background: isDark ? 'rgba(0,0,0,0.35)' : '#ffffff',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(17,17,17,0.12)'}`,
    color: isDark ? '#f5f3ec' : '#17171a',
  }),
  primaryBtn: (disabled?: boolean): React.CSSProperties => ({
    padding: '10px 18px', borderRadius: 10, border: 'none', background: '#F5C518', color: '#111',
    fontWeight: 800, fontSize: 13, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
  }),
  ghostBtn: (isDark: boolean): React.CSSProperties => ({
    padding: '10px 18px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700,
    background: 'transparent', color: isDark ? '#b6b2a6' : '#5c584e',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(17,17,17,0.12)'}`,
  }),
  dangerBtn: (disabled?: boolean): React.CSSProperties => ({
    padding: '10px 18px', borderRadius: 10, border: 'none', background: '#ff4d6a', color: '#fff',
    fontWeight: 800, fontSize: 13, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
  }),
}
