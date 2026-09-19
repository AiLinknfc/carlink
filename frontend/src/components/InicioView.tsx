'use client'

import { useState, useEffect, useCallback } from 'react'
import { ServiceTypeIcon } from '@/lib/icons_new'

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
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}

function markExplored(id: string) {
  const explored = getExplored()
  explored[id] = true
  localStorage.setItem(STORAGE_KEY, JSON.stringify(explored))
}

interface Props {
  onAddService: (serviceType?: string) => void
  onOpenScan?: () => void
  onOpenNfc?: () => void
  onNavigate?: (tab: string) => void
  theme: 'light' | 'dark'
  vehicle?: any
  documents?: any[]
  maintenanceRecords?: any[]
  nfcActive?: boolean
  isVerified?: boolean
  /** Tabs bloqueados por el plan gratuito (candado en los accesos rápidos). */
  lockedTabs?: string[]
  /** Plan gratuito: único servicio que se puede registrar; el resto se ve bloqueado. */
  freeServiceId?: string
}

export default function InicioView({ onAddService, onOpenScan, onOpenNfc, onNavigate, theme, vehicle, documents, maintenanceRecords, nfcActive, isVerified, lockedTabs, freeServiceId }: Props) {
  const isDark = theme !== 'light'
  const [explored, setExplored] = useState<Record<string, boolean>>({})

  useEffect(() => { setExplored(getExplored()) }, [])

  const handleCardClick = useCallback((id: string) => {
    if (freeServiceId && id !== freeServiceId) { onAddService(id); return }
    markExplored(id)
    setExplored(prev => ({ ...prev, [id]: true }))
    onAddService(id)
  }, [onAddService, freeServiceId])

  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,17,0.08)'
  const cardExploredBg = isDark ? 'rgba(245,197,24,0.06)' : 'rgba(245,197,24,0.08)'
  const cardExploredBorder = 'rgba(245,197,24,0.35)'
  const textPrimary = isDark ? '#f5f3ec' : '#17171a'
  const textMuted = isDark ? '#6f6a5f' : '#8f8a7a'
  const accentDim = isDark ? 'rgba(245,197,24,0.08)' : 'rgba(245,197,24,0.1)'

  // Status indicators
  const docsCount = documents?.length || 0
  const docsPending = Math.max(0, 4 - docsCount)
  const servicesCount = maintenanceRecords?.length || 0

  const statusIcon = (ok: boolean) => ok
    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffb020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>

  const quickActionStyle = {
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8,
    padding: '16px 8px', borderRadius: 14, cursor: 'pointer', textAlign: 'center' as const,
    background: cardBg, border: `1px solid ${cardBorder}`,
    transition: 'all .2s', flex: '1 1 0', minWidth: 90,
  }

  const statusCardStyle = {
    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12,
    background: cardBg, border: `1px solid ${cardBorder}`, flex: '1 1 0', minWidth: 140,
  }

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: textPrimary, fontFamily: 'var(--font-display)' }}>Inicio</div>
        <div style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>{vehicle?.plate ? `${vehicle.plate} — ` : ''}Accesos rapidos y registro de servicios</div>
      </div>

      {/* Acciones rapidas */}
      <div data-tour="inicio-quick-actions" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>Acciones rapidas</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => onAddService()} style={quickActionStyle}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,197,24,0.35)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = cardBorder; e.currentTarget.style.transform = 'none' }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, background: accentDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5C518' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: textPrimary }}>Nuevo servicio</span>
          </button>

          <button onClick={onOpenScan} style={quickActionStyle}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,197,24,0.35)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = cardBorder; e.currentTarget.style.transform = 'none' }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, background: accentDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5C518' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: textPrimary }}>Escanear doc</span>
          </button>

          <button onClick={onOpenNfc} style={quickActionStyle}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,197,24,0.35)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = cardBorder; e.currentTarget.style.transform = 'none' }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, background: accentDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5C518' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="10"/><path d="M6 12a6 6 0 0 1 6-6M8.5 12a3.5 3.5 0 0 1 3.5-3.5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: textPrimary }}>Llavero NFC</span>
          </button>

          <button onClick={() => onNavigate?.('certificados')} style={quickActionStyle}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,197,24,0.35)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = cardBorder; e.currentTarget.style.transform = 'none' }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, background: accentDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5C518' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 2v20l2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1z"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/></svg>
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: textPrimary, display: 'inline-flex', alignItems: 'center', gap: 5 }}>Facturas{lockedTabs?.includes('certificados') && <svg aria-label="Bloqueado" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" ><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>}</span>
          </button>

          <button onClick={() => onNavigate?.('documentos')} style={quickActionStyle}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,197,24,0.35)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = cardBorder; e.currentTarget.style.transform = 'none' }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, background: accentDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5C518' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 12 15 15 12"/><line x1="12" y1="9" x2="12" y2="15"/></svg>
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: textPrimary, display: 'inline-flex', alignItems: 'center', gap: 5 }}>Documentos{lockedTabs?.includes('documentos') && <svg aria-label="Bloqueado" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" ><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>}</span>
          </button>
        </div>
      </div>

      {/* Estado del vehiculo */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>Estado de tu vehiculo</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={statusCardStyle}>
            {statusIcon(!!nfcActive)}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: textPrimary }}>Llavero</div>
              <div style={{ fontSize: 10, color: nfcActive ? '#2ecc71' : textMuted, marginTop: 1 }}>{nfcActive ? 'Activo' : 'Sin activar'}</div>
            </div>
          </div>

          <div style={statusCardStyle}>
            {statusIcon(docsPending === 0)}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: textPrimary }}>Documentos</div>
              <div style={{ fontSize: 10, color: docsPending === 0 ? '#2ecc71' : '#ffb020', marginTop: 1 }}>{docsPending === 0 ? 'Completos' : `${docsPending} pendiente${docsPending > 1 ? 's' : ''}`}</div>
            </div>
          </div>

          <div style={statusCardStyle}>
            {statusIcon(!!isVerified)}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: textPrimary }}>Perfil</div>
              <div style={{ fontSize: 10, color: isVerified ? '#2ecc71' : textMuted, marginTop: 1 }}>{isVerified ? 'Verificado' : 'Sin verificar'}</div>
            </div>
          </div>

          {/* Clickeable a historial completo — reemplaza la sección aparte "Ultimos
             servicios" que había abajo: mismo acceso, ubicado en el estado que ya
             existe en vez de agregar una lista nueva. */}
          <button onClick={() => onNavigate?.('historial')} style={{ ...statusCardStyle, cursor: onNavigate ? 'pointer' : 'default', textAlign: 'left', font: 'inherit' }}
            onMouseEnter={e => { if (onNavigate) e.currentTarget.style.borderColor = 'rgba(245,197,24,0.35)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = cardBorder }}>
            {statusIcon(servicesCount > 0)}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: textPrimary }}>Servicios</div>
              <div style={{ fontSize: 10, color: servicesCount > 0 ? '#2ecc71' : textMuted, marginTop: 1 }}>{servicesCount > 0 ? `${servicesCount} registrado${servicesCount > 1 ? 's' : ''}` : 'Ninguno'}</div>
            </div>
            {onNavigate && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto' }}><path d="M9 6l6 6-6 6" /></svg>
            )}
          </button>
        </div>
      </div>

      {/* Registrar servicio */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>Registrar servicio</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
          {SERVICE_TYPES.map(st => {
            const isExplored = explored[st.id]
            const isLockedSvc = !!freeServiceId && st.id !== freeServiceId
            return (
              <button key={st.id} onClick={() => handleCardClick(st.id)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
                padding: '14px 12px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                background: isExplored ? cardExploredBg : cardBg,
                border: `1px solid ${isExplored ? cardExploredBorder : cardBorder}`,
                opacity: isLockedSvc ? 0.45 : isExplored ? 1 : 0.65,
                position: 'relative',
                transition: 'all .2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = isExplored ? '1' : '0.65'; e.currentTarget.style.transform = 'none' }}
              >
                {isLockedSvc && <span style={{ position: 'absolute', top: 10, right: 10, display: 'flex' }}><svg aria-label="Bloqueado" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto' }}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></span>}
                <span style={{ color: isExplored ? '#F5C518' : textMuted, transition: 'color .2s' }}>
                  <ServiceTypeIcon type={st.id} size={32} />
                </span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: textPrimary }}>{st.label}</div>
                  <div style={{ fontSize: 9, color: textMuted, marginTop: 1 }}>{st.desc}</div>
                </div>
                {isExplored && (
                  <span style={{ alignSelf: 'flex-end', width: 5, height: 5, borderRadius: '50%', background: '#F5C518' }} />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
