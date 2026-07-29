'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { FOB_COLORS, PLATE_COLOR_SCHEMES, COP, type FobColor, type CartItem, type ShopProduct } from '@/lib/shop'
import { useShopCart } from '@/lib/shop-cart-context'

const GOLD = '#F5C518'
const PLATE_TYPES = [
  { id: 'particular', name: 'Particular' },
  { id: 'moto', name: 'Moto' },
  { id: 'publico', name: 'Público' },
  { id: 'diplomatica', name: 'Diplomática' },
  { id: 'carga', name: 'Carga' },
  { id: 'remolque', name: 'Remolque' },
  { id: 'clasico', name: 'Clásico' },
]

interface Props {
  product: ShopProduct
  theme: 'light' | 'dark'
  onAdded?: () => void
}

export default function ProductCustomizer({ product, theme, onAdded }: Props) {
  const { addItem } = useShopCart()
  const isDark = theme === 'dark'
  const [plateType, setPlateType] = useState('particular')
  const [plateLetters, setPlateLetters] = useState('ABC')
  const [plateNumbers, setPlateNumbers] = useState('123')
  const [selectedColor, setSelectedColor] = useState<FobColor>(FOB_COLORS[0])
  const [engraving, setEngraving] = useState('')
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  const border = isDark ? 'rgba(245,197,24,0.15)' : 'rgba(17,17,17,0.08)'
  const subtle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(17,17,17,0.06)'
  const text = isDark ? '#f5f3ec' : '#17171a'
  const muted = isDark ? '#8f8a7a' : '#6f6a5f'
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'

  const plateText = `${plateLetters}-${plateNumbers}`
  const plateColors = PLATE_COLOR_SCHEMES[plateType]
  const total = product.price * qty

  const handleAdd = () => {
    const item: CartItem = {
      id: `${product.id}-${selectedColor.id}-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      color: selectedColor,
      plateText,
      plateType,
      engraving: engraving.trim() || undefined,
      quantity: qty,
      unitPrice: product.price,
      total,
    }
    addItem(item)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
    onAdded?.()
  }

  const inputStyle: React.CSSProperties = {
    padding: '10px 12px', background: isDark ? 'rgba(0,0,0,0.3)' : '#fff',
    border: `1px solid ${subtle}`, borderRadius: 10, fontSize: 14, color: text,
    outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4,
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="grid2">
      {/* Left: Preview */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 }}>
        {/* Fob preview */}
        <div style={{ position: 'relative', width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `3px solid ${selectedColor.ring}`, boxShadow: `0 0 50px ${selectedColor.ring}, inset 0 0 30px ${selectedColor.ring}` }} />
          <div style={{
            width: 140, height: 140, borderRadius: '50%',
            background: `radial-gradient(circle at 35% 30%, ${selectedColor.hex}dd, ${selectedColor.hex})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 8px 40px ${selectedColor.ring}, inset 0 2px 10px rgba(255,255,255,0.15)`,
          }}>
            <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke={selectedColor.hex === '#f5f5f4' || selectedColor.hex === '#c0c0c0' ? '#333' : '#fff'} strokeWidth="1.4">
              <circle cx="12" cy="12" r="10" /><path d="M6 12a6 6 0 016-6M8.5 12a3.5 3.5 0 013.5-3.5" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
            </svg>
          </div>
        </div>

        {/* Plate preview */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: muted, fontWeight: 700, marginBottom: 6 }}>Tu placa</div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '8px 18px', borderRadius: 10,
            background: plateColors.bg, fontFamily: 'var(--font-display)', fontSize: 22,
            color: plateColors.bgLabel, letterSpacing: '.06em', boxShadow: `0 4px 20px ${plateColors.ring}`,
          }}>
            {plateText}
          </div>
        </div>

        {engraving && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: muted, fontWeight: 700, marginBottom: 4 }}>Grabado</div>
            <div style={{ fontSize: 13, color: GOLD, fontWeight: 600 }}>"{engraving}"</div>
          </div>
        )}
      </div>

      {/* Right: Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{product.name}</div>
        <div style={{ fontSize: 13, color: muted }}>{product.desc}</div>

        {/* Plate type */}
        <div>
          <div style={labelStyle}>Tipo de placa</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PLATE_TYPES.map(pt => (
              <button key={pt.id} onClick={() => setPlateType(pt.id)} style={{
                padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${plateType === pt.id ? GOLD : subtle}`,
                background: plateType === pt.id ? 'rgba(245,197,24,0.14)' : 'transparent',
                color: plateType === pt.id ? GOLD : muted, transition: 'all .15s',
              }}>{pt.name}</button>
            ))}
          </div>
        </div>

        {/* Plate number */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <div style={labelStyle}>Letras</div>
            <input value={plateLetters} onChange={e => setPlateLetters(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3))} maxLength={3} placeholder="ABC" style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>Números</div>
            <input value={plateNumbers} onChange={e => setPlateNumbers(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))} maxLength={3} placeholder="123" style={inputStyle} />
          </div>
        </div>

        {/* Color selector */}
        <div>
          <div style={labelStyle}>Color del llavero</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {FOB_COLORS.map(c => (
              <button key={c.id} onClick={() => setSelectedColor(c)} title={c.name} style={{
                width: 36, height: 36, borderRadius: '50%', background: c.hex,
                border: selectedColor.id === c.id ? `3px solid ${GOLD}` : `2px solid ${subtle}`,
                cursor: 'pointer', boxShadow: selectedColor.id === c.id ? `0 0 12px ${c.ring}` : 'none',
                transition: 'all .15s',
              }} />
            ))}
          </div>
          <div style={{ fontSize: 12, color: muted, marginTop: 4 }}>{selectedColor.name}</div>
        </div>

        {/* Engraving */}
        <div>
          <div style={labelStyle}>Grabado personalizado (opcional)</div>
          <input value={engraving} onChange={e => setEngraving(e.target.value.slice(0, 20))} maxLength={20} placeholder="Tu texto, max 20 chars" style={inputStyle} />
        </div>

        {/* Quantity */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={labelStyle}>Cantidad</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${subtle}`, background: 'transparent', color: text, fontSize: 16, cursor: 'pointer' }}>−</button>
            <span style={{ fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{qty}</span>
            <button onClick={() => setQty(q => Math.min(10, q + 1))} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${subtle}`, background: 'transparent', color: text, fontSize: 16, cursor: 'pointer' }}>+</button>
          </div>
        </div>

        {/* Price + Add button */}
        <div style={{ padding: 14, borderRadius: 14, background: cardBg, border: `1px solid ${subtle}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: muted }}>Subtotal ({qty} {qty === 1 ? 'und' : 'unds'})</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: GOLD }}>{COP(total)}</span>
          </div>
          <motion.button onClick={handleAdd} whileTap={{ scale: 0.97 }} style={{
            width: '100%', padding: 13, borderRadius: 12, border: 'none',
            background: added ? '#2ecc71' : GOLD, color: '#111', fontWeight: 800, fontSize: 14,
            cursor: 'pointer', transition: 'background .2s',
          }}>
            {added ? '✓ Agregado al carrito' : 'Agregar al carrito'}
          </motion.button>
        </div>
      </div>
    </div>
  )
}
