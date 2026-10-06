'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/* Selector de fecha con el estilo de la app. El calendario del `<input type="date">` lo dibuja el
   navegador (azul, esquinas rectas) y no se puede cambiar de forma confiable: aquí el calendario es
   propio — día seleccionado en el amarillo de la app (#F5C518), esquinas redondeadas, tema claro u
   oscuro por variables CSS (docs/DESIGN_GUIDELINES.md → "Selector de fecha").

   Es un reemplazo directo de `<input type="date">`: mismas props (`value` AAAA-MM-DD, `min`, `max`,
   `className`, `style`, `disabled`) y `onChange` recibe un objeto con `target.value`, así que los
   `onChange={e => setX(e.target.value)}` existentes siguen funcionando. */

interface Props {
  value: string
  onChange: (e: { target: { value: string } }) => void
  min?: string
  max?: string
  className?: string
  style?: React.CSSProperties
  disabled?: boolean
  placeholder?: string
  required?: boolean
  id?: string
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const WEEK = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const POPOVER_W = 280
const POPOVER_H = 330

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`

function parse(v: string | undefined): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '')
  if (!match) return null
  const y = +match[1], m = +match[2] - 1, d = +match[3]
  const dt = new Date(y, m, d)
  return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d ? { y, m, d } : null
}

function todayIso(): string {
  const n = new Date()
  return iso(n.getFullYear(), n.getMonth(), n.getDate())
}

export default function ThemedDateInput({ value, onChange, min, max, className, style, disabled, placeholder = 'Selecciona la fecha', id }: Props) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<{ y: number; m: number }>(() => {
    const p = parse(value) || parse(todayIso())!
    return { y: p.y, m: p.m }
  })
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const sel = parse(value)
  const today = todayIso()

  const place = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    const below = r.bottom + 4
    const top = below + POPOVER_H > window.innerHeight && r.top - POPOVER_H - 4 > 0 ? r.top - POPOVER_H - 4 : below
    const left = Math.max(8, Math.min(r.left, window.innerWidth - POPOVER_W - 8))
    setPos({ top, left })
  }, [])

  useLayoutEffect(() => { if (open) place() }, [open, place])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (!popRef.current?.contains(t) && !btnRef.current?.contains(t)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    // Con el calendario abierto, mover la página o cambiar el tamaño lo cerraría fuera de lugar.
    const close = () => setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open])

  function toggle() {
    if (disabled) return
    if (!open) {
      const p = parse(value) || parse(todayIso())!
      setView({ y: p.y, m: p.m })
    }
    setOpen(o => !o)
  }

  const inRange = (s: string) => (!min || s >= min) && (!max || s <= max)
  const pick = (s: string) => { if (!inRange(s)) return; onChange({ target: { value: s } }); setOpen(false) }
  const shift = (dm: number) => setView(v => {
    const t = v.y * 12 + v.m + dm
    return { y: Math.floor(t / 12), m: ((t % 12) + 12) % 12 }
  })

  const first = new Date(view.y, view.m, 1)
  const offset = (first.getDay() + 6) % 7 // lunes primero
  const days = new Date(view.y, view.m + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]

  const navBtn: React.CSSProperties = {
    width: 30, height: 30, borderRadius: 8, border: '1px solid var(--input-border, rgba(255,255,255,0.14))',
    background: 'var(--input-bg, rgba(255,255,255,0.04))', color: 'var(--text-2)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
  }
  const display = sel ? `${pad(sel.d)}/${pad(sel.m + 1)}/${sel.y}` : ''

  return (
    <>
      <button ref={btnRef} id={id} type="button" className={className} disabled={disabled} onClick={toggle}
        aria-haspopup="dialog" aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, textAlign: 'left',
          cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit',
          ...(open ? { borderColor: 'rgba(245,197,24,0.5)' } : null),
          ...style,
        }}>
        <span style={{ color: display ? 'var(--text-1)' : 'var(--text-3)' }}>{display || placeholder}</span>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto' }}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>

      {open && (
        <div ref={popRef} role="dialog" aria-label="Calendario" style={{
          position: 'fixed', zIndex: 120, top: pos.top, left: pos.left, width: POPOVER_W, boxSizing: 'border-box',
          padding: 12, borderRadius: 14, background: 'var(--panel-bg)', color: 'var(--text-1)',
          border: '1px solid rgba(245,197,24,0.25)', boxShadow: '0 16px 48px rgba(0,0,0,.5)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <button type="button" aria-label="Año anterior" onClick={() => shift(-12)} style={navBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" /></svg>
              </button>
              <button type="button" aria-label="Mes anterior" onClick={() => shift(-1)} style={navBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
              </button>
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 700, textTransform: 'capitalize' }}>{MONTHS[view.m]} {view.y}</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button type="button" aria-label="Mes siguiente" onClick={() => shift(1)} style={navBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
              </button>
              <button type="button" aria-label="Año siguiente" onClick={() => shift(12)} style={navBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 17l5-5-5-5M6 17l5-5-5-5" /></svg>
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {WEEK.map(w => <div key={w} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', padding: '4px 0' }}>{w}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((d, i) => {
              if (d === null) return <div key={`e${i}`} />
              const s = iso(view.y, view.m, d)
              const ok = inRange(s)
              const isSel = s === value
              const isToday = s === today
              return (
                <button key={s} type="button" disabled={!ok} onClick={() => pick(s)}
                  onMouseEnter={e => { if (ok && !isSel) e.currentTarget.style.background = 'rgba(245,197,24,0.15)' }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}
                  style={{
                    height: 34, borderRadius: 10, padding: 0, fontSize: 13, cursor: ok ? 'pointer' : 'not-allowed',
                    fontWeight: isSel ? 800 : 500, opacity: ok ? 1 : 0.3,
                    border: isToday && !isSel ? '1px solid rgba(245,197,24,0.6)' : '1px solid transparent',
                    background: isSel ? '#F5C518' : 'transparent', color: isSel ? '#111' : 'var(--text-1)',
                  }}>{d}</button>
              )
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
            <button type="button" onClick={() => pick(today)} disabled={!inRange(today)} style={{
              padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: inRange(today) ? 'pointer' : 'not-allowed', opacity: inRange(today) ? 1 : 0.4,
              border: '1.5px solid rgba(245,197,24,0.45)', background: 'rgba(245,197,24,0.12)', color: '#F5C518',
            }}>Hoy</button>
            <button type="button" onClick={() => setOpen(false)} style={{
              padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: '1px solid var(--input-border, rgba(255,255,255,0.14))', background: 'transparent', color: 'var(--text-3)',
            }}>Cerrar</button>
          </div>
        </div>
      )}
    </>
  )
}
