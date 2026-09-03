'use client'

import { useState, useEffect, useCallback } from 'react'
import { ServiceIcon } from '@/lib/icons_new'

const SERVICE_TYPES = [
  { id: 'Aceite', label: 'Aceite', desc: 'Cambio de aceite y filtro' },
  { id: 'Aire', label: 'Filtros', desc: 'Filtro de aire, cabina, combustible' },
  { id: 'Combustible', label: 'Combustible', desc: 'Sistema de combustible' },
  { id: 'Frenos', label: 'Frenos', desc: 'Pastillas, discos, liquido' },
  { id: 'Refrigerante', label: 'Refrigeracion', desc: 'Sistema de refrigeracion' },
  { id: 'Llantas', label: 'Llantas', desc: 'Rotacion, alineacion, balanceo' },
  { id: 'Suspension', label: 'Suspension', desc: 'Amortiguadores, bujes' },
  { id: 'Bateria', label: 'Bateria', desc: 'Bateria y sistema electrico' },
  { id: 'Transmision', label: 'Transmision', desc: 'Caja, clutch, aceite de transmision' },
  { id: 'Otro', label: 'Otro', desc: 'Otro servicio de mantenimiento' },
]

const STORAGE_KEY = 'carlink_explored_services'

function getExplored(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch { return {} }
}

function markExplored(id: string) {
  const explored = getExplored()
  explored[id] = true
  localStorage.setItem(STORAGE_KEY, JSON.stringify(explored))
}

interface Props {
  onAddService: (serviceType?: string) => void
  theme: 'light' | 'dark'
}

export default function InicioView({ onAddService, theme }: Props) {
  const isDark = theme !== 'light'
  const [explored, setExplored] = useState<Record<string, boolean>>({})

  useEffect(() => { setExplored(getExplored()) }, [])

  const handleCardClick = useCallback((id: string) => {
    markExplored(id)
    setExplored(prev => ({ ...prev, [id]: true }))
    onAddService(id)
  }, [onAddService])

  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,17,0.08)'
  const cardExploredBg = isDark ? 'rgba(245,197,24,0.06)' : 'rgba(245,197,24,0.08)'
  const cardExploredBorder = 'rgba(245,197,24,0.35)'
  const textPrimary = isDark ? '#f5f3ec' : '#17171a'
  const textMuted = isDark ? '#6f6a5f' : '#8f8a7a'

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: textPrimary, fontFamily: 'var(--font-display)' }}>Inicio</div>
        <div style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>Selecciona un servicio para registrarlo</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
        {SERVICE_TYPES.map(st => {
          const isExplored = explored[st.id]
          return (
            <button key={st.id} onClick={() => handleCardClick(st.id)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8,
              padding: '16px 14px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
              background: isExplored ? cardExploredBg : cardBg,
              border: `1px solid ${isExplored ? cardExploredBorder : cardBorder}`,
              opacity: isExplored ? 1 : 0.65,
              transition: 'all .2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = isExplored ? '1' : '0.65'; e.currentTarget.style.transform = 'none' }}
            >
              <span style={{ color: isExplored ? '#F5C518' : textMuted, transition: 'color .2s' }}>
                <ServiceIcon type={st.id} size={22} />
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>{st.label}</div>
                <div style={{ fontSize: 10, color: textMuted, marginTop: 2 }}>{st.desc}</div>
              </div>
              {isExplored && (
                <span style={{ alignSelf: 'flex-end', width: 6, height: 6, borderRadius: '50%', background: '#F5C518' }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
