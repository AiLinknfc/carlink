'use client'

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { ServiceIcon } from '@/lib/icons_new'

/* Sticky-stack tuning: each card sticks a little lower + a little more
   "in front" than the previous one, so scrolling reveals a fanned deck
   of cards peeking out from behind one another. */
const STACK_BASE_TOP = 110
const STACK_PEEK = 16
const RECEDE_DISTANCE = 320

const SERVICE_CARD_THEME: Record<string, { bg: string; accent: string; text: string; sub: string }> = {
  Aceite:       { bg: 'linear-gradient(135deg,#3a2a06 0%,#6b4b0c 45%,#231903 100%)', accent: '#F5C518', text: '#fff6dc', sub: '#d8c98a' },
  Aire:         { bg: 'linear-gradient(135deg,#062626 0%,#0c4a4a 45%,#031616 100%)', accent: '#4dd8d8', text: '#e6fbfb', sub: '#8adede' },
  Combustible:  { bg: 'linear-gradient(135deg,#062608 0%,#144a1c 45%,#031603 100%)', accent: '#4ade80', text: '#e9fbee', sub: '#8fdba5' },
  Frenos:       { bg: 'linear-gradient(135deg,#2a0606 0%,#5c0c0c 45%,#170303 100%)', accent: '#ef4444', text: '#fdeaea', sub: '#d88a8a' },
  Refrigerante: { bg: 'linear-gradient(135deg,#04121e 0%,#0a2c4a 45%,#020a14 100%)', accent: '#4d9dd8', text: '#e6f1fb', sub: '#8ab6de' },
  Llantas:      { bg: 'linear-gradient(135deg,#161616 0%,#2e2e2e 45%,#0a0a0a 100%)', accent: '#c9c9c9', text: '#f2f2f2', sub: '#a8a8a8' },
  'Suspensión': { bg: 'linear-gradient(135deg,#1c0626 0%,#3c0c4a 45%,#100316 100%)', accent: '#c084fc', text: '#f5e9fd', sub: '#c9a0de' },
  'Batería':    { bg: 'linear-gradient(135deg,#262006 0%,#4a3e0c 45%,#161203 100%)', accent: '#facc15', text: '#fdf6dc', sub: '#dcc98a' },
  'Transmisión':{ bg: 'linear-gradient(135deg,#0e0e0e 0%,#2c2c2c 45%,#080808 100%)', accent: '#9ca3af', text: '#f0f0f0', sub: '#aeb0b4' },
  Otro:         { bg: 'linear-gradient(135deg,#1c1708 0%,#3a2f0c 45%,#0d0d0d 100%)', accent: '#F5C518', text: '#f5f0d8', sub: '#c0b080' },
}
function getTheme(type?: string) {
  return SERVICE_CARD_THEME[type || ''] || SERVICE_CARD_THEME.Otro
}
interface Props {
  records: any[]
  onEdit?: (r: any) => void
}

export default function HistoryStack({ records, onEdit }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const stuckStarts = useRef<number[]>([])

  const measure = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const containerDocTop = container.getBoundingClientRect().top + window.scrollY
    stuckStarts.current = cardRefs.current.map((el, i) => {
      if (!el) return 0
      const naturalTop = containerDocTop + el.offsetTop
      const stickyTop = STACK_BASE_TOP + i * STACK_PEEK
      return naturalTop - stickyTop
    })
  }, [])

  useLayoutEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure, records.length])

  useEffect(() => {
    let raf = 0
    function apply() {
      raf = 0
      const scrollY = window.scrollY
      cardRefs.current.forEach((el, i) => {
        if (!el) return
        const start = stuckStarts.current[i] ?? 0
        const progress = Math.min(1, Math.max(0, (scrollY - start) / RECEDE_DISTANCE))
        el.style.transform = `scale(${1 - progress * 0.05})`
        el.style.filter = `brightness(${1 - progress * 0.22})`
      })
    }
    function onScroll() {
      if (!raf) raf = requestAnimationFrame(apply)
    }
    apply()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [records.length])

  if (!records.length) return null

  return (
    <div ref={containerRef} style={{ position: 'relative', paddingBottom: '30vh' }}>
      {records.map((r, i) => {
        const theme = getTheme(r.service_type)
        return (
          <div
            key={r.id || i}
            ref={el => { cardRefs.current[i] = el }}
            style={{
              position: 'sticky',
              top: STACK_BASE_TOP + i * STACK_PEEK,
              zIndex: 10 + i,
              marginBottom: 26,
              transformOrigin: 'top center',
              transition: 'transform .25s cubic-bezier(0.22,1,0.36,1), filter .25s',
              animation: `sectionIn .5s ${Math.min(i, 6) * 0.05}s both`,
            }}
          >
            <div style={{
              position: 'relative', borderRadius: 24, overflow: 'hidden',
              padding: '22px 26px', minHeight: 190,
              background: theme.bg,
              border: `1px solid ${theme.accent}55`,
              boxShadow: `0 ${18 + i}px ${50 + i * 2}px rgba(0,0,0,0.5), inset 0 1px 0 var(--border)`,
            }}>
              {/* glossy shine sweep, like a real card catching light */}
              <div style={{
                position: 'absolute', top: '-60%', left: '-20%', width: '55%', height: '260%',
                background: 'linear-gradient(115deg,transparent 30%,rgba(255,255,255,0.10) 48%,transparent 66%)',
                transform: 'skewX(-18deg)', pointerEvents: 'none',
              }} />

              {/* header: chip + service name + date + edit */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                  <span style={{
                    width: 46, height: 34, borderRadius: 7, flex: '0 0 auto',
                    background: 'linear-gradient(135deg,rgba(255,255,255,0.35),rgba(255,255,255,0.05))',
                    border: `1px solid ${theme.accent}88`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.accent,
                  }}><ServiceIcon type={r.service_type} size={18} /></span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: theme.accent, fontWeight: 800 }}>CarLink Service Record</div>
                    <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 22, letterSpacing: '.01em', color: theme.text, marginTop: 2 }}>{r.service_type}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>
                  <span style={{ fontSize: 12, color: theme.sub, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {r.date ? new Date(r.date).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </span>
                  {onEdit && (
                    <button onClick={() => onEdit(r)} title="Editar" style={{
                      width: 30, height: 30, borderRadius: 8, border: `1px solid ${theme.accent}55`,
                      background: 'rgba(255,255,255,0.06)', color: theme.text, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>
                  )}
                </div>
              </div>

              {/* "card number" styled mileage — the embossed-digits look */}
              <div style={{ margin: '22px 0 6px', position: 'relative' }}>
                <div style={{ fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: theme.sub, fontWeight: 700 }}>Kilometraje</div>
                <div style={{ fontFamily: "'Courier New',monospace", fontSize: 27, letterSpacing: '.12em', color: theme.text, marginTop: 4, textShadow: '0 1px 0 rgba(0,0,0,0.4)' }}>
                  {r.mileage != null ? r.mileage.toLocaleString() : '——————'} <span style={{ fontSize: 13, opacity: .7 }}>KM</span>
                </div>
              </div>

              {r.description && (
                <div style={{ fontSize: 13, color: theme.sub, marginTop: 6, maxWidth: '70%', position: 'relative' }}>{r.description}</div>
              )}

              {/* footer: workshop / cost / lubricant + brand mark */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 20, flexWrap: 'wrap', gap: 12, position: 'relative' }}>
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: theme.sub, fontWeight: 700 }}>Taller</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: theme.text, marginTop: 2 }}>{r.workshop || 'No registrado'}</div>
                  </div>
                  {r.cost > 0 && (
                    <div>
                      <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: theme.sub, fontWeight: 700 }}>Costo</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: theme.text, marginTop: 2 }}>${Number(r.cost).toLocaleString()}</div>
                    </div>
                  )}
                  {r.lubricant_brand && (
                    <div>
                      <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: theme.sub, fontWeight: 700 }}>Lubricante</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: theme.text, marginTop: 2 }}>{r.lubricant_brand}{r.lubricant_type ? ` · ${r.lubricant_type}` : ''}</div>
                    </div>
                  )}
                </div>
                <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 13, color: theme.accent, letterSpacing: '.03em', opacity: .85, flex: '0 0 auto' }}>CarLink</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
