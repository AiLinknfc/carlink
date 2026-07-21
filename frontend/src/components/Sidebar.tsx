'use client'

import { useState, useEffect } from 'react'
import Plate3D from '@/components/Plate3D'

interface Props {
  activeTab: string
  onTabChange: (tab: string) => void
  vehicle?: { modelo?: string; anio?: number; tipo?: string; color?: string; owner?: string; wallet_bg_preset_id?: string | null; wallet_bg_custom_url?: string | null; wallet_logo_url?: string | null } | null
  plateText?: string
  city?: string
  vehicleLoading?: boolean
  onLogout?: () => void
  accountType?: string
  theme?: 'light' | 'dark'
}

const ALL_NAV_ITEMS = [
  { id: 'ficha', label: 'Ficha técnica', icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></> },
  { id: 'historial', label: 'Historial', icon: <><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></> },
  { id: 'partes', label: 'Control de partes', icon: <><path d="M12 14l3.5-3.5"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></> },
  { id: 'galeria', label: 'Galería', icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></> },
  { id: 'certificados', label: 'Certificados', icon: <><path d="M5 2v20l2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1z"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/></> },
  { id: 'documentos', label: 'Documentos', icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 12 15 15 12"/><line x1="12" y1="9" x2="12" y2="15"/></> },
]

const TALLER_NAV_ITEMS = [
  ALL_NAV_ITEMS[0],
  { id: 'taller', label: 'Taller', icon: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2.3-.6-.6-2.3z"/> },
  { id: 'diagnostico', label: 'Diagnóstico', icon: <><path d="M12 2a7 7 0 0 0-7 7c0 3 2 5 2 7h10c0-2 2-4 2-7a7 7 0 0 0-7-7z"/><line x1="9" y1="21" x2="15" y2="21"/><line x1="10" y1="18" x2="10" y2="21"/><line x1="14" y1="18" x2="14" y2="21"/></> },
  ALL_NAV_ITEMS[2],
  { id: 'config', label: 'Promoción', icon: <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></> },
]

export default function Sidebar({ activeTab, onTabChange, vehicle, plateText, city, vehicleLoading, onLogout, accountType, theme }: Props) {
  const [railExpanded, setRailExpanded] = useState(true)
  const [hoveredTab, setHoveredTab] = useState<string | null>(null)
  const [detectedDark, setDetectedDark] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const navItems = accountType === 'taller' ? TALLER_NAV_ITEMS : ALL_NAV_ITEMS
  const plateShort = plateText ? plateText.split('-')[0] : ''

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const railWidth = isMobile ? 266 : railExpanded ? 266 : 76

  // Prefer the explicit `theme` prop; fall back to detecting --page-bg for callers that don't pass it.
  const isDark = theme ? theme === 'dark' : detectedDark

  useEffect(() => {
    if (theme) return
    const checkTheme = () => {
      const bg = document.documentElement.style.getPropertyValue('--page-bg')
      setDetectedDark(bg !== '#f7f6f2')
    }
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })
    return () => observer.disconnect()
  }, [theme])

  const sidebarBg = isDark ? 'rgba(9,9,9,0.86)' : 'rgba(247,246,242,0.92)'
  const sidebarBorder = isDark ? 'rgba(245,197,24,0.14)' : 'rgba(17,17,17,0.1)'
  const textPrimary = isDark ? '#fff' : '#17171a'
  const textSecondary = isDark ? '#7c786e' : '#6f6a5f'
  const textMuted = isDark ? '#6f6a5f' : '#8f8a7a'
  const dividerColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(17,17,17,0.06)'

  return (
    <>
      {/* Mobile hamburger button */}
      {isMobile && !mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          style={{
            position: 'fixed', top: 14, left: 14, zIndex: 35,
            width: 42, height: 42, borderRadius: 11,
            border: `1px solid ${sidebarBorder}`,
            background: sidebarBg, backdropFilter: 'blur(24px)',
            color: textPrimary, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      )}

      {/* Mobile overlay backdrop */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 29,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          }}
        />
      )}

    <aside
      onMouseEnter={() => { if (!isMobile) setRailExpanded(true) }}
      onMouseLeave={() => { if (!isMobile) setRailExpanded(false) }}
      style={{
        position: 'fixed', left: isMobile ? (mobileOpen ? 0 : -266) : 0, top: 0, bottom: 0, width: railWidth,
        background: sidebarBg, backdropFilter: 'blur(24px)',
        borderRight: `1px solid ${sidebarBorder}`,
        display: 'flex', flexDirection: 'column', zIndex: isMobile ? 30 : 30,
        overflow: 'hidden',
        transition: isMobile ? 'left .25s cubic-bezier(0.22,1,0.36,1)' : 'width .22s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      <div style={{ padding: '22px 20px 12px', display: 'flex', alignItems: 'center', gap: 11 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 9, background: '#F5C518', color: '#111', flex: '0 0 auto' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.2"/><path d="M12 3.2v5.6M12 15.2v5.6M3.2 12h5.6M15.2 12h5.6"/></svg>
        </span>
        <div
          style={{
            fontFamily: "'Anton',sans-serif", fontSize: 27, letterSpacing: '.01em', lineHeight: 1,
            whiteSpace: 'nowrap', opacity: railExpanded ? 1 : 0, transition: 'opacity .15s',
            color: textPrimary,
          }}
        >
          Car<span style={{ color: '#F5C518' }}>Link</span>
        </div>
        <button
          onClick={() => setRailExpanded(!railExpanded)}
          title="Fijar / colapsar menú"
          style={{
            marginLeft: 'auto', flex: '0 0 auto', width: 26, height: 26, borderRadius: 7,
            border: `1px solid ${sidebarBorder}`, background: isDark ? 'rgba(17,17,17,0.03)' : 'rgba(17,17,17,0.03)',
            color: textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: railExpanded ? 1 : 0, transition: 'opacity .15s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: railExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {railExpanded && !vehicleLoading && vehicle && (
        <div style={{ padding: '0 20px 16px', borderBottom: `1px solid ${dividerColor}`, whiteSpace: 'nowrap' }}>
          <div style={{ fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: textSecondary, fontWeight: 700 }}>Vehículo</div>
          <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 24, letterSpacing: '.01em', margin: '4px 0 2px', color: textPrimary }}>{vehicle.modelo || '—'}</div>
          <div style={{ fontSize: 12, color: textMuted }}>{vehicle.anio} · {vehicle.tipo} · {vehicle.color}</div>
          {plateText && (
            <div style={{ width: 134, height: 66, margin: '4px 0 0', position: 'relative', overflow: 'visible', pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, transform: 'scale(0.3)', transformOrigin: 'top left' }}>
                <Plate3D plate={plateText} city={city || ''} />
              </div>
            </div>
          )}
        </div>
      )}

      {!railExpanded && !vehicleLoading && vehicle && plateText && (
        <div style={{ padding: '0 0 8px', borderBottom: `1px solid ${dividerColor}`, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <span style={{ width: 38, height: 38, borderRadius: 10, background: '#F5C518', color: '#111', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>{plateShort}</span>
        </div>
      )}

      <nav style={{ flex: 1, overflowY: 'auto', padding: railExpanded ? '14px 12px' : '14px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowX: 'hidden', alignItems: railExpanded ? 'stretch' : 'center' }}>
        {navItems.map(item => {
          const isActive = activeTab === item.id
          const isHovered = hoveredTab === item.id
          const showGlow = isActive || isHovered
          return (
            <button key={item.id} onClick={() => onTabChange(item.id)}
              onMouseEnter={() => setHoveredTab(item.id)}
              onMouseLeave={() => setHoveredTab(null)}
              style={{
                position: 'relative', display: 'flex', alignItems: 'center', gap: 12,
                width: railExpanded ? '100%' : 44, justifyContent: railExpanded ? 'flex-start' : 'center',
                padding: railExpanded ? '12px 14px' : '12px 0', border: 'none',
                background: 'transparent', color: isActive ? textPrimary : isHovered ? textPrimary : textSecondary,
                cursor: 'pointer', textAlign: railExpanded ? 'left' : 'center', fontSize: 14, fontWeight: 600,
                borderRadius: 11, transition: 'color .2s',
              }}>
              <span style={{
                position: 'absolute', inset: 0, borderRadius: 11,
                background: 'linear-gradient(90deg,rgba(245,197,24,0.22),rgba(245,197,24,0.02))',
                opacity: showGlow ? 1 : 0, transition: 'opacity .25s',
              }} />
              <span style={{
                position: 'absolute', left: 0, top: '50%', height: 20, width: 3,
                borderRadius: '0 3px 3px 0', background: '#F5C518',
                transform: 'translateY(-50%)',
                opacity: showGlow ? 1 : 0, transition: 'opacity .25s',
                boxShadow: '0 0 10px #F5C518',
              }} />
              <svg style={{ position: 'relative', zIndex: 1, flex: '0 0 auto' }} width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                {item.icon}
              </svg>
              <span
                style={{
                  position: 'relative', zIndex: 1, whiteSpace: 'nowrap',
                  display: railExpanded ? 'inline' : 'none',
                }}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>

      {vehicle?.owner && (
        <div style={{ padding: '14px 16px', borderTop: `1px solid ${dividerColor}`, display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}>
          <span style={{ width: 34, height: 34, borderRadius: '50%', background: '#F5C518', color: '#111', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flex: '0 0 auto' }}>
            {(vehicle.owner?.charAt(0) || 'U').toUpperCase()}
          </span>
          {railExpanded && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>
                {vehicle.owner}
                {accountType === 'taller' && <span style={{ marginLeft: 6, fontSize: 9, padding: '2px 7px', borderRadius: 999, background: 'rgba(245,197,24,0.12)', color: '#F5C518', fontWeight: 700, letterSpacing: '.05em', verticalAlign: 'middle' }}>TALLER</span>}
              </div>
              <div style={{ fontSize: 11, color: textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plateText || ''}</div>
            </div>
          )}
          {onLogout && (
            <button onClick={onLogout} title="Salir" style={{ background: 'transparent', border: 'none', color: textSecondary, cursor: 'pointer', padding: 6, borderRadius: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            </button>
          )}
        </div>
      )}
    </aside>
    </>
  )
}