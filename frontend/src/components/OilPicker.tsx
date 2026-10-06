'use client'

import { useMemo, useRef, useState } from 'react'
import { getOilBrands, getOilProductsByBrand, type OilCatalogItem } from '@/lib/oilCatalog'

/* Selector visual del aceite usado (paso 1 de "Registrar servicio" → Aceite): una pasarela horizontal
   de marcas con su logo —se puede buscar para filtrarla— y, al elegir una, otra con los productos de
   esa marca. Elegir un producto completa marca, producto y viscosidad. Si la marca no está en el
   catálogo se escribe a mano ("Otra marca"). Tarjetas con esquinas redondeadas y el amarillo de la
   app al seleccionar (docs/DESIGN_GUIDELINES.md). El catálogo solo trae logos de marca, no fotos de
   producto. */

interface Props {
  brand: string
  product: string
  onBrand: (marca: string) => void
  onProduct: (item: OilCatalogItem) => void
  onBrandText: (text: string) => void
  onProductText: (text: string) => void
}

const BRANDS = getOilBrands()

function Strip({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const arrow: React.CSSProperties = {
    width: 26, height: 26, borderRadius: 8, padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid var(--input-border, rgba(255,255,255,0.14))', background: 'var(--input-bg, rgba(255,255,255,0.04))', color: 'var(--text-2)',
  }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>
          {label}{required && <span style={{ color: '#F5C518' }}> *</span>}{hint && <span style={{ fontWeight: 400 }}> {hint}</span>}
        </span>
        <span style={{ display: 'flex', gap: 4 }}>
          <button type="button" aria-label="Anterior" style={arrow} onClick={() => ref.current?.scrollBy({ left: -240, behavior: 'smooth' })}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <button type="button" aria-label="Siguiente" style={arrow} onClick={() => ref.current?.scrollBy({ left: 240, behavior: 'smooth' })}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </span>
      </div>
      <div ref={ref} style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollSnapType: 'x proximity', paddingBottom: 6 }}>{children}</div>
    </div>
  )
}

const card = (sel: boolean): React.CSSProperties => ({
  flex: '0 0 auto', scrollSnapAlign: 'start', cursor: 'pointer', textAlign: 'center',
  borderRadius: 12, padding: '10px 8px',
  border: `1.5px solid ${sel ? 'rgba(245,197,24,0.55)' : 'var(--input-border, rgba(255,255,255,0.14))'}`,
  background: sel ? 'rgba(245,197,24,0.14)' : 'var(--input-bg, rgba(255,255,255,0.04))',
  color: sel ? '#F5C518' : 'var(--text-2)', transition: 'all .15s',
})

export default function OilPicker({ brand, product, onBrand, onProduct, onBrandText, onProductText }: Props) {
  const [query, setQuery] = useState('')
  const [other, setOther] = useState(false)
  const inCatalog = useMemo(() => BRANDS.some(b => b.marca.toLowerCase() === brand.trim().toLowerCase()), [brand])
  // "Otra marca": el usuario la eligió o ya hay una marca escrita que el catálogo no tiene.
  const otherMode = other || (brand.trim() !== '' && !inCatalog)
  const shown = BRANDS.filter(b => b.marca.toLowerCase().includes(query.trim().toLowerCase()))
  const products = inCatalog ? getOilProductsByBrand(brand) : []

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, fontSize: 13.5, outline: 'none',
    border: '1px solid var(--input-border, rgba(255,255,255,0.14))', background: 'var(--input-bg, rgba(255,255,255,0.04))', color: 'var(--text-1)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar marca…" aria-label="Buscar marca de aceite" style={inputStyle} />

      <Strip label="Marca del aceite" required>
        {shown.map(b => {
          const sel = !otherMode && b.marca.toLowerCase() === brand.trim().toLowerCase()
          return (
            <button key={b.marca} type="button" aria-pressed={sel} onClick={() => { setOther(false); onBrand(b.marca) }} style={{ ...card(sel), width: 92 }}>
              <span style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                {b.logo ? (
                  <img src={`/oil-brands/${b.logo}`} alt="" width={64} height={36}
                    style={{ objectFit: 'contain', background: '#fff', borderRadius: 8, padding: 3, maxWidth: '100%' }} />
                ) : (
                  <span style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,197,24,0.15)', color: '#F5C518', fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {b.marca.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </span>
              <span style={{ display: 'block', fontSize: 11.5, fontWeight: sel ? 800 : 600, lineHeight: 1.2, wordBreak: 'break-word' }}>{b.marca}</span>
            </button>
          )
        })}
        <button type="button" aria-pressed={otherMode} onClick={() => { setOther(true); if (inCatalog) onBrandText('') }} style={{ ...card(otherMode), width: 92 }}>
          <span style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, border: '1.5px dashed currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700 }}>+</span>
          </span>
          <span style={{ display: 'block', fontSize: 11.5, fontWeight: otherMode ? 800 : 600 }}>Otra marca</span>
        </button>
      </Strip>
      {shown.length === 0 && <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Ninguna marca coincide: elige "Otra marca" para escribirla.</div>}

      {otherMode && (
        <input type="text" value={brand} onChange={e => onBrandText(e.target.value)} placeholder="Escribe la marca del aceite" aria-label="Marca del aceite" style={inputStyle} />
      )}

      {inCatalog && products.length > 0 && (
        <Strip label="Producto" hint="(opcional: completa la viscosidad solo)">
          {products.map(p => {
            const sel = p.producto === product
            return (
              <button key={p.producto} type="button" aria-pressed={sel} onClick={() => onProduct(p)} style={{ ...card(sel), width: 150, textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, lineHeight: 1.25, marginBottom: 6, minHeight: 31 }}>{p.producto}</span>
                <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'rgba(245,197,24,0.15)', color: '#F5C518' }}>{p.viscosidad}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 999, background: 'var(--input-bg, rgba(255,255,255,0.06))', color: 'var(--text-3)' }}>{p.tipoBase}</span>
                </span>
              </button>
            )
          })}
        </Strip>
      )}

      {otherMode && (
        <input type="text" value={product} onChange={e => onProductText(e.target.value)} placeholder="Producto (opcional)" aria-label="Producto" style={inputStyle} />
      )}
    </div>
  )
}
