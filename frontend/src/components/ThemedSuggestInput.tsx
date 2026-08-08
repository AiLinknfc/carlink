'use client'

/* Combobox liviano para reemplazar <input list=".."/><datalist> — el
   datalist nativo del navegador no respeta el tema claro/oscuro de la app
   (lo pinta el sistema operativo), así que cualquier lista de sugerencias
   que sí necesite verse consistente con el resto de la pantalla (registro
   de vehículo: marca/modelo) usa este componente en su lugar. */

import { useState, useRef, useEffect, type CSSProperties } from 'react'

export interface SuggestTheme {
  inputBg: string
  inputBorder: string
  inputText: string
  accent: string
  muted: string
  /** Fondo del panel flotante — más opaco que inputBg, que suele ser
   * translúcido. Si no viene, cae a inputBg. */
  panelBg?: string
}

interface Props {
  value: string
  onChange: (v: string) => void
  suggestions: string[]
  placeholder?: string
  theme: SuggestTheme
  style?: CSSProperties
  autoFocus?: boolean
}

export default function ThemedSuggestInput({ value, onChange, suggestions, placeholder, theme, style, autoFocus }: Props) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const filtered = value.trim()
    ? suggestions.filter(s => s.toLowerCase().includes(value.trim().toLowerCase()))
    : suggestions

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '12px 14px', borderRadius: 11, boxSizing: 'border-box',
          border: `1px solid ${theme.inputBorder}`, background: theme.inputBg, color: theme.inputText,
          fontSize: 15, outline: 'none', ...style,
        }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 30,
          maxHeight: 224, overflowY: 'auto', borderRadius: 11,
          border: `1px solid ${theme.inputBorder}`, background: theme.panelBg || theme.inputBg,
          boxShadow: '0 16px 40px rgba(0,0,0,0.3)',
        }}>
          {filtered.slice(0, 40).map(s => (
            <div
              key={s}
              onMouseDown={e => { e.preventDefault(); onChange(s); setOpen(false) }}
              style={{ padding: '9px 14px', fontSize: 13.5, color: theme.inputText, cursor: 'pointer', transition: 'background .1s' }}
              onMouseEnter={e => { e.currentTarget.style.background = `${theme.accent}22` }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
