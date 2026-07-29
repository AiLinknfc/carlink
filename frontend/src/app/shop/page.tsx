'use client'

import ShopLayout from '@/components/shop/ShopLayout'
import ProductCustomizer from '@/components/shop/ProductCustomizer'
import { SHOP_PRODUCTS, COP, PLATE_COLOR_SCHEMES } from '@/lib/shop'
import { useTheme } from '@/store/theme'
import { NfcKeyIcon } from '@/lib/icons_new'

const GOLD = '#F5C518'

export default function ShopPage() {
  return <ShopContent />
}

function ShopContent() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const border = isDark ? 'rgba(245,197,24,0.15)' : 'rgba(17,17,17,0.08)'
  const subtle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(17,17,17,0.06)'
  const text = isDark ? '#f5f3ec' : '#17171a'
  const muted = isDark ? '#8f8a7a' : '#6f6a5f'
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'

  return (
    <ShopLayout>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px clamp(16px,4vw,40px)' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999, background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.25)', fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 16 }}>
            <NfcKeyIcon size={14} strokeWidth={2} />
            Tienda CarLink
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px,4vw,40px)', lineHeight: 1, margin: '0 0 10px', textTransform: 'uppercase' }}>
            Personaliza tu <span style={{ color: GOLD }}>llavero NFC</span>
          </h1>
          <p style={{ fontSize: 14, color: muted, maxWidth: 480, margin: '0 auto', lineHeight: 1.5 }}>Elige color, grabado y tipo de placa. Sin registro, pago seguro y envío a todo Colombia.</p>
        </div>

        {/* Products */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          {SHOP_PRODUCTS.map(product => (
            <div key={product.id} style={{ padding: 24, borderRadius: 20, background: cardBg, border: `1px solid ${product.premium ? 'rgba(245,197,24,0.35)' : subtle}`, position: 'relative' }}>
              {product.premium && (
                <span style={{ position: 'absolute', top: 14, right: 14, padding: '4px 12px', borderRadius: 999, background: GOLD, color: '#111', fontSize: 11, fontWeight: 800 }}>MÁS VENDIDO</span>
              )}
              <ProductCustomizer product={product} theme={theme} />
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginTop: 40 }}>
          {[
            { icon: '🔒', title: 'Pago seguro', desc: 'Stripe o WhatsApp' },
            { icon: '🚚', title: 'Envío gratis', desc: 'A todo Colombia' },
            { icon: '⚡', title: 'Express 24h', desc: 'Envío rápido' },
            { icon: '🎨', title: 'Personalizable', desc: '7 colores + grabado' },
          ].map(b => (
            <div key={b.title} style={{ padding: 16, borderRadius: 14, background: cardBg, border: `1px solid ${subtle}`, textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{b.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{b.title}</div>
              <div style={{ fontSize: 11, color: muted }}>{b.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </ShopLayout>
  )
}
