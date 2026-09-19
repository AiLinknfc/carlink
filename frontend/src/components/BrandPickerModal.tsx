'use client'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  open: boolean
  brands: string[]
  value: string
  onSelect: (brand: string) => void
  onClose: () => void
}

// Selector de marca en modal: la matriz de marcas vive aquí en vez de ocupar
// el perfil. Bottom-sheet en móvil, diálogo centrado en pantallas anchas.
export default function BrandPickerModal({ open, brands, value, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) return
    setQuery('')
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? brands.filter(b => b.toLowerCase().includes(q)) : brands
  }, [brands, query])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div data-r="brandPickerOverlay" onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-label="Elegir marca" data-r="brandPickerPanel" onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 560, maxHeight: 'min(80vh, 640px)', display: 'flex', flexDirection: 'column', background: 'var(--panel-bg, var(--surface))', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 8px' }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Elegir marca</span>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 22, lineHeight: 1, cursor: 'pointer', padding: 4 }}>×</button>
        </div>
        <div style={{ padding: '0 16px 10px' }}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar marca" autoFocus
            style={{ width: '100%', padding: '10px 13px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 14, outline: 'none' }} />
        </div>
        <div style={{ overflowY: 'auto', padding: '0 16px 16px' }}>
          {filtered.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '16px 0', textAlign: 'center' }}>Sin resultados</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(88px,1fr))', gap: 8 }}>
              {filtered.map(b => {
                const sel = value === b
                return (
                  <button key={b} type="button" onClick={() => { onSelect(b); onClose() }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '8px 4px', borderRadius: 11, cursor: 'pointer',
                      background: sel ? 'rgba(245,197,24,0.15)' : 'var(--surface-2)',
                      border: `1.5px solid ${sel ? 'rgba(245,197,24,0.4)' : 'var(--border)'}`,
                    }}>
                    <span style={{ width: 30, height: 30, borderRadius: 8, background: sel ? '#F5C518' : 'var(--input-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 14, color: sel ? '#111' : 'var(--text-3)' }}>{b[0]}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: sel ? '#F5C518' : 'var(--text-3)', textAlign: 'center' }}>{b}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <style>{`@media(max-width:600px){[data-r="brandPickerOverlay"]{align-items:flex-end!important;padding:0!important}[data-r="brandPickerPanel"]{max-width:none!important;max-height:85vh!important;border-radius:16px 16px 0 0!important}}`}</style>
    </div>,
    document.body,
  )
}
