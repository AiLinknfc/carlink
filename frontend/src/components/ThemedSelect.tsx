'use client'

/* Lista desplegable con el estilo de la app, para reemplazar <select>. El desplegable nativo lo
   pinta el sistema operativo (resaltado azul del navegador) y no respeta el tema; este usa el
   mismo panel y el mismo hover dorado que ThemedSuggestInput. */

import { useState, useRef, useEffect } from 'react'
import type { SuggestTheme } from './ThemedSuggestInput'

interface Props {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
  disabled?: boolean
  theme: SuggestTheme
  ariaLabel?: string
}

export default function ThemedSelect({ value, onChange, options, placeholder = 'Elige una opción…', disabled, theme, ariaLabel }: Props) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const pick = (v: string) => { onChange(v); setOpen(false) }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (e.key === 'Escape') { setOpen(false); return }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) { setOpen(true); setActive(Math.max(0, options.indexOf(value))); return }
      setActive(a => (e.key === 'ArrowDown' ? Math.min(options.length - 1, a + 1) : Math.max(0, a - 1)))
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (open && active >= 0 && options[active]) pick(options[active])
      else setOpen(o => !o)
    }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => { setOpen(o => !o); setActive(Math.max(0, options.indexOf(value))) }}
        onKeyDown={onKeyDown}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          padding: '11px 13px', borderRadius: 10, boxSizing: 'border-box', textAlign: 'left',
          border: `1px solid ${open ? theme.accent : theme.inputBorder}`, background: theme.inputBg,
          color: value ? theme.inputText : theme.muted, fontSize: 14, fontFamily: 'inherit',
          cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1, outline: 'none',
          transition: 'border-color .15s',
        }}
      >
        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || placeholder}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.muted} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && options.length > 0 && (
        <div role="listbox" style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 40,
          maxHeight: 224, overflowY: 'auto', borderRadius: 11,
          border: `1px solid ${theme.inputBorder}`, background: theme.panelBg || theme.inputBg,
          boxShadow: '0 16px 40px rgba(0,0,0,0.3)',
        }}>
          {options.map((o, i) => {
            const selected = o === value
            return (
              <div
                key={o}
                role="option"
                aria-selected={selected}
                onMouseDown={e => { e.preventDefault(); pick(o) }}
                onMouseEnter={() => setActive(i)}
                style={{
                  padding: '9px 14px', fontSize: 13.5, cursor: 'pointer', transition: 'background .1s',
                  color: selected ? theme.accent : theme.inputText, fontWeight: selected ? 700 : 400,
                  background: i === active ? `${theme.accent}22` : 'transparent',
                }}
              >
                {o}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
