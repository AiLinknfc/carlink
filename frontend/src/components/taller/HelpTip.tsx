'use client'

import { useEffect, useId, useRef, useState } from 'react'

/* Botón circular con "?" que muestra una ayuda flotante (hover, foco o toque; Escape o un toque afuera la cierra).
   Reemplaza los textos de ayuda fijos debajo de cada campo: el formulario queda más corto y las filas se alinean. */
export default function HelpTip({ label, children, isDark, border, muted, textColor }: {
  label: string
  children: React.ReactNode
  isDark: boolean
  border: string
  muted: string
  textColor: string
}) {
  // Se abre con el mouse encima, con el foco del teclado o fijado con un clic/toque; se cierra con Escape o tocando afuera.
  const [hover, setHover] = useState(false)
  const [focus, setFocus] = useState(false)
  const [pinned, setPinned] = useState(false)
  const open = hover || focus || pinned
  const closeAll = () => { setHover(false); setFocus(false); setPinned(false) }
  const box = useRef<HTMLSpanElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) closeAll() }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAll() }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <span ref={box} style={{ display: 'inline-flex' }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <button type="button" aria-label={`Ayuda: ${label}`} aria-expanded={open} aria-describedby={open ? id : undefined}
        onClick={() => setPinned(p => !p)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{
          width: 18, height: 18, borderRadius: '50%', padding: 0, cursor: 'pointer', fontSize: 11, fontWeight: 800, lineHeight: 1, fontFamily: 'inherit',
          border: `1px solid ${open ? '#F5C518' : border}`, background: open ? 'rgba(245,197,24,0.16)' : 'transparent', color: open ? '#F5C518' : muted,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'color .15s, border-color .15s, background .15s',
        }}>?</button>
      {open && (
        <span id={id} role="tooltip" style={{
          // Se ancla a la fila de la etiqueta (position: relative del campo): nunca se sale por la derecha en el celular.
          position: 'absolute', left: 0, top: 'calc(100% + 6px)', zIndex: 40, boxSizing: 'border-box', width: 'min(300px, 100%)',
          padding: '10px 12px', borderRadius: 10, fontSize: 12.5, fontWeight: 500, lineHeight: 1.5, letterSpacing: 0, textTransform: 'none',
          background: isDark ? '#1d1d1d' : '#ffffff', color: textColor, border: '1px solid rgba(245,197,24,0.4)',
          boxShadow: '0 12px 32px rgba(0,0,0,.45)', whiteSpace: 'normal',
        }}>{children}</span>
      )}
    </span>
  )
}
