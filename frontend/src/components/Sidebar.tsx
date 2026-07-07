'use client'

interface Props {
  activeTab: string
  onTabChange: (tab: string) => void
  vehicle?: { modelo?: string; anio?: number; tipo?: string; color?: string; owner?: string } | null
  plateText?: string
  city?: string
  vehicleLoading?: boolean
}

const NAV_ITEMS = [
  { id: 'ficha', label: 'Ficha técnica', icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></> },
  { id: 'historial', label: 'Historial', icon: <><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></> },
  { id: 'diagnostico', label: 'Diagnóstico', icon: <><path d="M12 2a7 7 0 0 0-7 7c0 3 2 5 2 7h10c0-2 2-4 2-7a7 7 0 0 0-7-7z"/><line x1="9" y1="21" x2="15" y2="21"/><line x1="10" y1="18" x2="10" y2="21"/><line x1="14" y1="18" x2="14" y2="21"/></> },
  { id: 'partes', label: 'Control de partes', icon: <circle cx="12" cy="12" r="3"/> },
  { id: 'galeria', label: 'Galería', icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></> },
  { id: 'certificados', label: 'Certificados', icon: <><path d="M5 2v20l2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1z"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/></> },
  { id: 'documentos', label: 'Documentos', icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 12 15 15 12"/><line x1="12" y1="9" x2="12" y2="15"/></> },
  { id: 'taller', label: 'Taller', icon: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2.3-.6-.6-2.3z"/> },
]

export default function Sidebar({ activeTab, onTabChange, vehicle, plateText, city, vehicleLoading }: Props) {
  return (
    <aside style={{
      position: 'absolute', left: 0, top: 0, bottom: 0, width: 266,
      background: 'rgba(9,9,9,0.86)', backdropFilter: 'blur(24px)',
      borderRight: '1px solid rgba(245,197,24,0.14)',
      display: 'flex', flexDirection: 'column', zIndex: 20,
    }}>
      <div style={{ padding: '22px 20px 12px', display: 'flex', alignItems: 'center', gap: 11 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 9, background: '#F5C518', color: '#111' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 12h11l-2-3 6 5-6 5 2-3H3z"/></svg>
        </span>
        <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 27, letterSpacing: '.01em', lineHeight: 1 }}>Car<span style={{ color: '#F5C518' }}>Link</span></div>
      </div>

      <div style={{ height: 94, flex: '0 0 94px' }} />

      {vehicleLoading ? (
        <div style={{ padding: '0 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700 }}>Vehículo</div>
          <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 24, letterSpacing: '.01em', margin: '4px 0 2px', color: '#3a3a3a' }}>—</div>
          <div style={{ fontSize: 12, color: '#3a3a3a' }}>— · — · —</div>
        </div>
      ) : vehicle && (
        <div style={{ padding: '0 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700 }}>Vehículo</div>
          <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 24, letterSpacing: '.01em', margin: '4px 0 2px' }}>{vehicle.modelo || '—'}</div>
          <div style={{ fontSize: 12, color: '#b6b2a6' }}>{vehicle.anio} · {vehicle.tipo} · {vehicle.color}</div>
          {plateText && (
            <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 8, background: '#F5C518', color: '#111', fontSize: 12, fontWeight: 800, letterSpacing: '.05em' }}>
              {plateText}<span style={{ width: 4, height: 4, borderRadius: '50%', background: '#111', opacity: .5 }} />{city}
            </div>
          )}
        </div>
      )}

      <nav style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map(item => {
          const isActive = activeTab === item.id
          return (
            <button key={item.id} onClick={() => onTabChange(item.id)}
              style={{
                position: 'relative', display: 'flex', alignItems: 'center', gap: 12,
                width: '100%', padding: '12px 14px', border: 'none',
                background: 'transparent', color: isActive ? '#fff' : '#7c786e',
                cursor: 'pointer', textAlign: 'left', fontSize: 14, fontWeight: 600,
                borderRadius: 11, transition: 'color .2s',
              }}>
              {isActive && (
                <>
                  <span style={{ position: 'absolute', inset: 0, borderRadius: 11, background: 'linear-gradient(90deg,rgba(245,197,24,0.22),rgba(245,197,24,0.02))' }} />
                  <span style={{ position: 'absolute', left: 0, top: '50%', height: 20, width: 3, borderRadius: '0 3px 3px 0', background: '#F5C518', transform: 'translateY(-50%)', boxShadow: '0 0 10px #F5C518' }} />
                </>
              )}
              <svg style={{ position: 'relative', zIndex: 1, flex: '0 0 auto' }} width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                {item.icon}
              </svg>
              <span style={{ position: 'relative', zIndex: 1 }}>{item.label}</span>
            </button>
          )
        })}
      </nav>

    </aside>
  )
}
