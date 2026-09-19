'use client'

import { useState } from 'react'
import { COLORS, matchColorKeyword } from '@/lib/vehicleBrands'

interface Props {
  value: string
  onChange: (name: string) => void
  theme?: 'light' | 'dark'
}

/* Botón circular que muestra el color elegido y abre una ventana para
   elegir entre los colores ya definidos en COLORS (@/lib/vehicleBrands) —
   mismo listado que usaba el registro viejo, solo que ahora se selecciona
   desde esta ventana en vez de una fila de pastillas. El aro amarillo
   (#F5C518) en el swatch seleccionado sigue el mismo criterio que el resto
   de los "filtros" de la app (tiles de marca, tipo, etc.): la opción activa
   se marca en amarillo, no en otro color. */
export default function ColorPickerButton({ value, onChange, theme = 'dark' }: Props) {
  const isDark = theme !== 'light'
  const [open, setOpen] = useState(false)
  // Match por palabra clave, no igualdad exacta (2026-09-18) — un color
  // compuesto que viene del escaneo de la tarjeta ("Verde Esmeralda") no
  // matchea ningún nombre de COLORS tal cual, pero sí contiene "Verde".
  const matchedColorName = matchColorKeyword(value)
  const selected = COLORS.find(c => c.name === matchedColorName)
  const borderMuted = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(17,17,17,0.15)'

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title={value || 'Elegir color'}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 999, width: '100%',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.14)' : 'rgba(17,17,17,0.12)'}`,
          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(17,17,17,0.04)', cursor: 'pointer',
        }}>
        <span style={{
          width: 26, height: 26, borderRadius: '50%', flex: '0 0 auto',
          background: selected?.hex || 'transparent',
          border: `2px solid ${selected ? '#F5C518' : borderMuted}`,
        }} />
        <span style={{ fontSize: 13, color: isDark ? '#f5f3ec' : '#17171a', fontWeight: 600 }}>{value || 'Elegir color'}</span>
      </button>

      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(4,4,4,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 340, maxWidth: '92vw', background: isDark ? '#0e0e0e' : '#fff', border: `1px solid ${isDark ? 'rgba(245,197,24,0.2)' : 'rgba(17,17,17,0.1)'}`, borderRadius: 18, padding: 20, boxShadow: '0 40px 90px rgba(0,0,0,.5)' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: isDark ? '#f5f3ec' : '#17171a', marginBottom: 14, fontFamily: 'var(--font-display)' }}>Elige un color</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
              {COLORS.map(c => {
                const isSelected = matchedColorName === c.name
                return (
                  <button key={c.name} type="button" onClick={() => { onChange(c.name); setOpen(false) }} title={c.name}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <span style={{
                      width: 34, height: 34, borderRadius: '50%', background: c.hex,
                      border: `2px solid ${isSelected ? '#F5C518' : borderMuted}`,
                      boxShadow: isSelected ? '0 0 0 3px rgba(245,197,24,0.25)' : 'none', transition: 'all .15s',
                    }} />
                    <span style={{ fontSize: 9.5, color: isSelected ? '#F5C518' : (isDark ? '#8f8a7a' : '#8a8578'), fontWeight: isSelected ? 700 : 500 }}>{c.name}</span>
                  </button>
                )
              })}
            </div>
            <button type="button" onClick={() => setOpen(false)}
              style={{ marginTop: 16, width: '100%', padding: 11, borderRadius: 10, border: `1px solid ${isDark ? 'rgba(255,255,255,0.14)' : 'rgba(17,17,17,0.12)'}`, background: 'transparent', color: isDark ? '#b6b2a6' : '#6f6a5f', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
