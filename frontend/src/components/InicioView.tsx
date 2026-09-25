'use client'

import { useState, useEffect, useCallback } from 'react'
import { ServiceTypeIcon } from '@/lib/icons_new'
import { useDocuments, useSafetyItems } from '@/lib/hooks'
import SafetyFormModal from '@/components/SafetyFormModal'
import SafetyIcon from '@/components/SafetyIcon'
import { KIT_ITEMS } from '@/lib/safety'
import type { SafetyItem, SafetyKind } from '@/lib/types'

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
  /** Abre "Mi perfil" con solo la verificacion del vehiculo desplegada. */
  onOpenVerification?: () => void
  theme: 'light' | 'dark'
  vehicle?: any
  documents?: any[]
  maintenanceRecords?: any[]
  nfcActive?: boolean
  isVerified?: boolean
  /** Plan gratuito: único servicio que se puede registrar; el resto se ve bloqueado. */
  freeServiceId?: string
}

export default function InicioView({ onAddService, onOpenScan, onOpenNfc, onNavigate, onOpenVerification, theme, vehicle, documents, maintenanceRecords, nfcActive, isVerified, freeServiceId }: Props) {
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
  // Documentos pendientes = de los 4 que pide la seccion Documentos (SOAT, tecnomecanica, tarjeta
  // de propiedad, poliza), cuantos no tienen todavia un archivo cargado.
  const { documents: fetchedDocuments } = useDocuments(vehicle?.id)
  const docList = documents ?? fetchedDocuments
  const REQUIRED_DOCS = ['soat', 'rtm', 'propiedad', 'poliza']
  const docsPending = REQUIRED_DOCS.filter(t => !docList.some((d: { type: string; file_url?: string }) => d.type === t && d.file_url)).length
  const servicesCount = maintenanceRecords?.length || 0

  // Elementos de seguridad (extintor, botiquin, kit de carretera y sus piezas): mismas tarjetas que
  // "Registrar servicio"; una tarjeta se marca como registrada si ya existe ese elemento.
  const { items: safetyItems, reload: reloadSafety } = useSafetyItems(vehicle?.id)
  const [safetyForm, setSafetyForm] = useState<{ kind: SafetyKind; item: SafetyItem | null; presetCheck?: string } | null>(null)
  const kit = safetyItems.find(i => i.kind === 'kit_carretera') ?? null
  const SAFETY_CARDS: { id: string; kind: SafetyKind; label: string; desc: string; presetCheck?: string; done: boolean }[] = [
    { id: 'extintor', kind: 'extintor', label: 'Extintor', desc: 'Compra, recarga y vencimiento', done: safetyItems.some(i => i.kind === 'extintor') },
    { id: 'botiquin', kind: 'botiquin', label: 'Botiquin', desc: 'Revision y elementos faltantes', done: safetyItems.some(i => i.kind === 'botiquin') },
    { id: 'kit', kind: 'kit_carretera', label: 'Kit de carretera', desc: 'Revisa que tiene tu kit', done: !!kit },
    ...KIT_ITEMS.map(k => ({ id: k.key, kind: 'kit_carretera' as SafetyKind, label: k.label, desc: 'Marcalo en tu kit', presetCheck: k.key, done: !!kit?.checklist?.[k.key] })),
    { id: 'otro', kind: 'otro', label: 'Otro elemento', desc: 'Linterna, cables, etc.', done: safetyItems.some(i => i.kind === 'otro') },
  ]

  // Toque en un indicador: pequeno "empujon" animado y luego la accion (evita el salto seco).
  const [nudge, setNudge] = useState<string | null>(null)
  const go = (id: string, action?: () => void) => {
    setNudge(id)
    window.setTimeout(() => { setNudge(null); action?.() }, 180)
  }
  const statusItems = [
    { id: 'llavero', title: 'Llavero', ok: !!nfcActive, text: nfcActive ? 'Activo' : 'Sin activar', color: nfcActive ? '#2ecc71' : textMuted, action: onOpenNfc, aria: 'Abre el panel del llavero NFC' },
    { id: 'documentos', title: 'Documentos', ok: docsPending === 0, text: docsPending === 0 ? 'Completos' : `${docsPending} pendiente${docsPending > 1 ? 's' : ''}`, color: docsPending === 0 ? '#2ecc71' : '#ffb020', action: () => onNavigate?.('documentos'), aria: 'Va a la seccion de documentos' },
    { id: 'perfil', title: 'Perfil', ok: !!isVerified, text: isVerified ? 'Verificado' : 'Sin verificar', color: isVerified ? '#2ecc71' : textMuted, action: onOpenVerification, aria: 'Abre Mi perfil en la verificacion' },
    { id: 'servicios', title: 'Servicios', ok: servicesCount > 0, text: servicesCount > 0 ? `${servicesCount} registrado${servicesCount > 1 ? 's' : ''}` : 'Ninguno', color: servicesCount > 0 ? '#2ecc71' : textMuted, action: () => onNavigate?.('historial'), aria: 'Va al historial de servicios' },
  ]

  const quickActionStyle = {
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8,
    padding: '16px 8px', borderRadius: 14, cursor: 'pointer', textAlign: 'center' as const,
    background: cardBg, border: `1px solid ${cardBorder}`,
    transition: 'all .2s', flex: '1 1 0', minWidth: 90,
  }

  // Botones amarillos solidos (mismo estilo que los CTA de la app); el estado se lee en el icono
  // (check = listo, exclamacion = pendiente) y en el texto, no en el color del fondo.
  const statusCardStyle = {
    display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderRadius: 12,
    background: '#F5C518', border: 'none', color: '#111', flex: '1 1 0', minWidth: 140,
    boxShadow: '0 0 20px rgba(245,197,24,0.28)',
  }
  const statusBadge = (ok: boolean) => (
    <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(17,17,17,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111', flex: '0 0 auto' }}>
      {ok
        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7v6M12 17h.01" /></svg>}
    </span>
  )

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
            <span style={{ fontSize: 11, fontWeight: 700, color: textPrimary, display: 'inline-flex', alignItems: 'center', gap: 5 }}>Facturas</span>
          </button>

          <button onClick={() => onNavigate?.('documentos')} style={quickActionStyle}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,197,24,0.35)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = cardBorder; e.currentTarget.style.transform = 'none' }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, background: accentDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5C518' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 12 15 15 12"/><line x1="12" y1="9" x2="12" y2="15"/></svg>
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: textPrimary, display: 'inline-flex', alignItems: 'center', gap: 5 }}>Documentos</span>
          </button>
        </div>
      </div>

      {/* Estado del vehiculo — cada indicador es un acceso directo al lugar donde se resuelve:
          Llavero abre el panel NFC, Documentos va a esa seccion, Perfil abre "Mi perfil" con solo la
          verificacion desplegada, Servicios va al historial. */}
      <style>{`
        @keyframes statusNudge { 0%{transform:scale(1)} 35%{transform:scale(.94) translateX(3px)} 70%{transform:scale(1.03) translateX(-2px)} 100%{transform:scale(1)} }
        @keyframes statusPulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.22);opacity:.7} }
        [data-r="statusCard"]{transition:transform .18s ease,box-shadow .18s ease,background .18s ease}
        [data-r="statusCard"]:hover{transform:translateY(-3px);background:#FFD84D !important;box-shadow:0 10px 28px rgba(245,197,24,0.42) !important}
        [data-r="statusCard"]:active{transform:scale(.97)}
        [data-r="statusCard"][data-nudge="1"]{animation:statusNudge .32s ease}
        [data-r="statusCard"]:focus-visible{outline:2px solid #F5C518;outline-offset:2px}
        [data-r="statusCard"][data-pending="1"] [data-r="statusIcon"]{animation:statusPulse 2.2s ease-in-out infinite}
        @media(prefers-reduced-motion:reduce){[data-r="statusCard"],[data-r="statusCard"] [data-r="statusIcon"]{animation:none !important;transition:none !important}}
      `}</style>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>Estado de tu vehiculo</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {statusItems.map(it => (
            <button key={it.id} type="button" data-r="statusCard" data-pending={it.ok ? '0' : '1'} data-nudge={nudge === it.id ? '1' : '0'}
              onClick={() => go(it.id, it.action)} aria-label={`${it.title}: ${it.text}. ${it.aria}`}
              style={{ ...statusCardStyle, cursor: 'pointer', textAlign: 'left', font: 'inherit' }}>
              <span data-r="statusIcon" style={{ display: 'flex', flex: '0 0 auto' }}>{statusBadge(it.ok)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#111' }}>{it.title}</div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: 'rgba(17,17,17,0.72)', marginTop: 1 }}>{it.text}</div>
              </div>
            </button>
          ))}
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

      {/* Registrar elemento de seguridad — mismo estilo que "Registrar servicio" */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>Registrar elemento de seguridad</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
          {SAFETY_CARDS.map(c => {
            const existing = c.kind === 'kit_carretera' ? kit : null
            return (
              <button key={c.id} onClick={() => setSafetyForm({ kind: c.kind, item: existing, presetCheck: c.presetCheck })} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
                padding: '14px 12px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                background: c.done ? cardExploredBg : cardBg,
                border: `1px solid ${c.done ? cardExploredBorder : cardBorder}`,
                opacity: c.done ? 1 : 0.65, transition: 'all .2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = c.done ? '1' : '0.65'; e.currentTarget.style.transform = 'none' }}
              >
                <span style={{ color: c.done ? '#F5C518' : textMuted, transition: 'color .2s' }}>
                  <SafetyIcon type={c.presetCheck ?? c.kind} size={32} />
                </span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: textPrimary }}>{c.label}</div>
                  <div style={{ fontSize: 9, color: textMuted, marginTop: 1 }}>{c.desc}</div>
                </div>
                {c.done && <span style={{ alignSelf: 'flex-end', width: 5, height: 5, borderRadius: '50%', background: '#F5C518' }} />}
              </button>
            )
          })}
        </div>
      </div>

      {safetyForm && vehicle?.id && (
        <SafetyFormModal vehicleId={vehicle.id} item={safetyForm.item} defaultKind={safetyForm.kind} presetCheck={safetyForm.presetCheck}
          onClose={() => setSafetyForm(null)} onSaved={reloadSafety} />
      )}
    </div>
  )
}
