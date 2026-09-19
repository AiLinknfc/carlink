'use client'

import CarLinkLogo from '@/components/CarLinkLogo'

interface Props {
  theme: 'light' | 'dark'
  onContinue: () => void
}

export default function StepBienvenida({ onContinue }: Props) {
  // Vuelve a la versión simple original (2026-09-15, pedido del usuario) —
  // sin la lista numerada de pasos que traía antes, que además quedaría
  // desactualizada con el flujo nuevo del wizard. Colores por token
  // (docs/DESIGN_GUIDELINES.md), no hex propio.
  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20, margin: '0 auto 18px',
        background: 'rgba(245,197,24,0.1)', border: '2px solid rgba(245,197,24,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <CarLinkLogo size={46} />
      </div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 22, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.2 }}>
        Bienvenido a CarLink
      </div>
      <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.6, margin: '14px 0 0', maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
        Vamos a configurar tu cuenta en unos pasos rapidos para que puedas aprovechar al maximo tu llavero NFC y el historial de tu vehiculo.
      </p>
      <button onClick={onContinue} style={{
        marginTop: 28, width: '100%', padding: 14, borderRadius: 12, border: 'none',
        background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 14,
        cursor: 'pointer', transition: 'all .16s',
      }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 24px rgba(245,197,24,0.4)' }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}>
        Comenzar
      </button>
    </div>
  )
}
