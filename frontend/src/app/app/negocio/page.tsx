'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/store/auth'
import { useTheme } from '@/store/theme'
import { isBusinessAccount, isSubscriptionValid } from '@/lib/constants'
import { useMyWorkshop, useWorkshopNotifications } from '@/lib/hooks'
import type { WorkOrder } from '@/lib/types'
import Sidebar from '@/components/Sidebar'
import BgParticles from '@/components/BgParticles'
import SubscriptionExpiredCard from '@/components/SubscriptionExpiredCard'
import AdminModal from '@/components/admin/AdminModal'
import ResumenModule from '@/components/negocio/ResumenModule'
import ClientesModule from '@/components/negocio/ClientesModule'
import OrdenesModule from '@/components/negocio/OrdenesModule'
import InventarioModule from '@/components/negocio/InventarioModule'
import CitasModule from '@/components/negocio/CitasModule'
import NotificacionesModule from '@/components/negocio/NotificacionesModule'
import RentabilidadModule from '@/components/negocio/RentabilidadModule'
import DocumentosModule from '@/components/negocio/DocumentosModule'
import DiagnosticoIAModule from '@/components/negocio/DiagnosticoIAModule'
import PerfilModule from '@/components/negocio/PerfilModule'

/* Panel de negocio del taller/empresa — migración de tallerpro/ hacia
   CarLink (docs/PLAN_MIGRACION_TALLERPRO.md). Vive fuera de /app (que es
   siempre "un vehículo activo a la vez") porque este panel es multi-cliente:
   la cartera de clientes/vehículos propia del taller, no la ficha de un
   vehículo puntual. Las tabs Ficha/Taller/Diagnóstico/Partes/Config de /app
   no se tocan — este es un panel aditivo. */

/* Solo los 7 tabs que tallerpro trata como tabs de verdad + "Clientes &
   Vehículos" (decisión confirmada: se queda, ver
   docs/PLAN_PARIDAD_UI_TALLERPRO.md Fase B). "Diagnóstico IA" y
   "Documentos" salieron de aquí — el primero solo vive en el botón del
   topbar-actions, el segundo se abre desde dentro del detalle de una orden
   (igual que en tallerpro). "Perfil del taller" vive en NAV_ITEMS_ADMIN,
   como sección aparte, más el botón de perfil del topbar — dos accesos,
   igual que tallerpro. */
const NAV_ITEMS = [
  { id: 'resumen', label: 'Mi taller', icon: <><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></> },
  { id: 'clientes', label: 'Clientes & Vehículos', icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></> },
  { id: 'ordenes', label: 'Órdenes de trabajo', icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></> },
  { id: 'inventario', label: 'Inventario', icon: <><path d="M21 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2"/><path d="M3 8l1.5 12a2 2 0 0 0 2 1.8h11a2 2 0 0 0 2-1.8L21 8"/><path d="M9 12h6"/></> },
  { id: 'citas', label: 'Citas', icon: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></> },
  { id: 'notificaciones', label: 'Notificaciones', icon: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></> },
  { id: 'rentabilidad', label: 'Rentabilidad', icon: <><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></> },
]

// "Perfil del taller" salió de acá (queda solo detrás del botón de perfil
// del topbar, ver showPerfilModal más abajo — antes duplicaba ese acceso).
// El array queda vacío, pero se sigue pasando a <Sidebar> para que Admin NFC
// (isAdmin) se agrupe en la sección "Administración" en vez de aparecer
// suelto arriba, como sí pasa en /app persona.
const NAV_ITEMS_ADMIN: never[] = []

// Ícono del botón "Ficha pública" del topbar-actions — antes vivía en el
// sidebar como "Ficha Digital & QR"; se movió al topbar y se sacó "QR" del
// texto a pedido del usuario (el QR en sí ya vive dentro de la ficha
// pública misma, ver FichaQr en (public)/taller/[code]/page.tsx).
const FICHA_PUBLICA_ICON = <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 14v3M14 20h3M17 20h3v-3" /></>

// Título/subtítulo por sección — antes había uno solo, fijo, para toda la
// página ("Panel de negocio" / nombre del taller / código), sin importar la
// pestaña activa. Copy tomado de los encabezados reales de cada pantalla de
// tallerpro (DashboardOverview, WorkOrdersManager, InventoryManager,
// AppointmentsManager, NotificationsCenter, ProfitabilityReports,
// WorkshopProfileModal) — traducido a un h1 dinámico en vez de repetir
// siempre lo mismo. Pedido del usuario 2026-08-06.
const SECTION_HEADER: Record<string, { eyebrow: string; title: string; subtitle: string }> = {
  resumen: {
    eyebrow: 'Centro de control mecánico & operaciones',
    title: 'Control en tiempo real',
    subtitle: 'Gestión centralizada de mantenimientos, historial por placa, control de repuestos con notificaciones automáticas y análisis de rentabilidad.',
  },
  clientes: {
    eyebrow: 'Cartera de clientes',
    title: 'Clientes & vehículos',
    subtitle: 'Cartera propia del taller — con o sin cuenta CarLink — vinculable para que las facturas y el historial le lleguen al cliente real.',
  },
  ordenes: {
    eyebrow: 'Órdenes de trabajo',
    title: 'Gestión de órdenes de trabajo e historial',
    subtitle: 'Registro completo de reparaciones, evidencias fotográficas, repuestos e impresión de certificados y recibos.',
  },
  inventario: {
    eyebrow: 'Inventario',
    title: 'Inventario de repuestos & insumos',
    subtitle: 'Control de stock en tiempo real, alertas de desabastecimiento y cálculo automático de márgenes de ganancia.',
  },
  citas: {
    eyebrow: 'Agenda',
    title: 'Agenda de citas & mantenciones programadas',
    subtitle: 'Planificación de entregas, recepción de vehículos y conversión directa a órdenes de trabajo.',
  },
  notificaciones: {
    eyebrow: 'Comunicación con clientes',
    title: 'Centro de notificaciones automáticas',
    subtitle: 'Envío directo de avisos de vehículos listos, recordatorios de citas y confirmación de presupuestos por WhatsApp y Email.',
  },
  rentabilidad: {
    eyebrow: 'Finanzas',
    title: 'Reportes de rentabilidad & análisis financiero',
    subtitle: 'Métricas mensuales de ingresos, costos de repuestos, rendimiento de mano de obra y margen neto del taller.',
  },
  perfil: {
    eyebrow: 'Administración',
    title: 'Perfil y configuración del taller',
    subtitle: 'Personaliza la información oficial, catálogo de servicios, especialidades y equipo de mecánicos.',
  },
}

const MODULE_INFO: Record<string, { title: string; blurb: string }> = {
  clientes: { title: 'Clientes & Vehículos', blurb: 'Cartera propia de clientes y vehículos del taller — con o sin cuenta CarLink.' },
  ordenes: { title: 'Órdenes de trabajo', blurb: 'Mano de obra, repuestos, totales con tu IVA real y descuento automático de inventario.' },
  inventario: { title: 'Inventario', blurb: 'Stock de repuestos propio del taller, alertas de mínimo y reabastecimiento.' },
  citas: { title: 'Citas', blurb: 'Agenda del taller, con conversión directa a orden de trabajo.' },
  notificaciones: { title: 'Notificaciones', blurb: 'Aviso a clientes por email (WhatsApp/SMS en cuanto haya proveedor contratado).' },
  rentabilidad: { title: 'Rentabilidad', blurb: 'Ingresos, costos y margen calculados en tiempo real sobre tus órdenes.' },
  documentos: { title: 'Documentos', blurb: 'Facturas, garantías y certificados numerados, ligados a la orden de trabajo.' },
  ia: { title: 'Diagnóstico IA', blurb: 'Diagnóstico técnico preliminar a partir de los síntomas reportados.' },
  perfil: { title: 'Perfil del taller', blurb: 'Mecánicos, catálogo de servicios, redes sociales y tarifa de IVA — alimenta tu ficha pública.' },
}

export default function NegocioPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('resumen')
  const { workshop, loading: workshopLoading } = useMyWorkshop()
  // Mismo criterio que /app/page.tsx — habilita "Admin NFC" dentro de
  // "Administración" (ver NAV_ITEMS_ADMIN más arriba).
  const isAdmin = !!user && user.id === process.env.NEXT_PUBLIC_ADMIN_USER_ID

  /* topbar-actions: mismo patrón que /app (frontend/src/app/app/page.tsx) —
     cluster de botones flotante arriba-derecha sobre el contenido, no un
     <header> de barra completa (CarLink no usa ese patrón en ningún lado).
     Ver docs/PLAN_PARIDAD_UI_TALLERPRO.md Fase A: acompañan al botón de
     perfil los mismos dos botones que tallerpro traía en su Header
     (Diagnóstico IA y Nueva Orden) — se descarta el 3ro que tenía tallerpro
     ("Restablecer datos de ejemplo"), era un reset de localStorage para su
     demo mock y no aplica con datos reales. */
  const [showDiagnosticoModal, setShowDiagnosticoModal] = useState(false)
  const [showPerfilModal, setShowPerfilModal] = useState(false)
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [nuevaOrdenSignal, setNuevaOrdenSignal] = useState(0)
  const { notifications } = useWorkshopNotifications()

  /* "Generar documento" contextual desde el detalle de una orden, o general
     desde el botón "Emisión de documentos & recibos" del header de Órdenes
     (igual que tallerpro: DocumentGeneratorModal se abre desde
     WorkOrdersManager de ambas formas) — ver Fase B del plan de paridad.
     'general' = sin orden preseleccionada; no puede ser el mismo valor que
     "cerrado" (null), si no un click en el botón general no reabriría nada
     si ya se había abierto una vez con ese mismo estado. */
  const [documentoPrefillOrderId, setDocumentoPrefillOrderId] = useState<string | 'general' | null>(null)

  /* Click en una orden desde ResumenModule → cambia a la tab Órdenes y abre
     directo su detalle (igual que tallerpro: DashboardOverview →
     onSelectWorkOrder → WorkOrdersManager con initialSelectedOrder). */
  const [openOrderId, setOpenOrderId] = useState<string | null>(null)

  /* Solo redirige por falta de sesión — `user` llega junto con `authLoading`
     (misma llamada a getSession()). El account_type vive en `profile`, que
     AuthProvider trae en un fetch aparte DESPUÉS de que `authLoading` ya bajó
     a false: redirigir en base a `profile?.account_type` acá rebotaba a todo
     taller/empresa real de vuelta a /app por una condición de carrera
     (confirmado navegando la app real, no solo con tsc/tests). Si no es
     cuenta de negocio, se explica inline más abajo — sin redirect. */
  useEffect(() => {
    if (authLoading) return
    if (!user) router.push('/')
  }, [authLoading, user, router])

  const pageBg = theme === 'light' ? '#f7f6f2' : '#060606'
  const vignetteBg = theme === 'light'
    ? 'radial-gradient(circle at 50% 42%,transparent 40%,rgba(247,246,242,0.94) 100%)'
    : 'radial-gradient(circle at 50% 42%,transparent 40%,rgba(6,6,6,0.86) 100%)'
  const rootTextColor = theme === 'light' ? '#17171a' : '#f5f3ec'
  const cardBg = theme === 'light' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.04)'
  const border = theme === 'light' ? 'rgba(17,17,17,0.1)' : 'rgba(245,197,24,0.16)'
  const textMuted = theme === 'light' ? '#6f6a5f' : '#8f8a7a'

  // Mismos tokens que /app para el cluster topbar-actions (ver comentario arriba)
  const glassBg = theme === 'light' ? 'rgba(255,255,255,0.85)' : 'rgba(20,20,20,0.8)'
  const profileBtnBorder = theme === 'light' ? 'rgba(17,17,17,0.1)' : 'rgba(255,255,255,0.12)'
  const profileBtnColor = theme === 'light' ? '#17171a' : '#f5f3ec'
  const topBtn = (accent = '#F5C518'): React.CSSProperties => ({
    position: 'relative', width: 42, height: 42, borderRadius: 11,
    border: `1px solid ${accent}59`, background: glassBg, backdropFilter: 'blur(12px)',
    color: accent, cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', transition: 'all .16s', flex: '0 0 auto',
  })
  const topBtnHover = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>, accent = '#F5C518') => {
    e.currentTarget.style.background = accent
    e.currentTarget.style.color = '#111'
  }
  const topBtnLeave = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>, accent = '#F5C518') => {
    e.currentTarget.style.background = glassBg
    e.currentTarget.style.color = accent
  }

  const subValid = isSubscriptionValid(profile?.subscription_status, profile?.trial_ends_at, profile?.created_at)

  const navItems = NAV_ITEMS

  if (authLoading || !user) {
    return <div style={{ minHeight: '100vh', background: pageBg }} />
  }

  // `profile` todavía no llega (fetch aparte, ver comentario arriba) — espera
  // en vez de decidir con un account_type que aún no se sabe.
  if (!profile) {
    return <div style={{ minHeight: '100vh', background: pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: rootTextColor }}>Cargando…</div>
  }

  if (!isBusinessAccount(profile.account_type)) {
    return (
      <div style={{ minHeight: '100vh', background: pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: rootTextColor, padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 8 }}>Esto es para talleres y empresas</div>
          <p style={{ color: textMuted, fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>
            Tu cuenta es de tipo conductor. El panel de negocio es solo para cuentas taller/empresa.
          </p>
          <a href="/app" style={{ color: '#F5C518', fontWeight: 700 }}>Volver a mi ficha</a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: pageBg, color: rootTextColor, display: 'flex' }}>
      <BgParticles theme={theme} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', background: vignetteBg }} />
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        navItemsOverride={navItems}
        navItemsSecondary={NAV_ITEMS_ADMIN}
        isAdmin={isAdmin}
        userName={profile?.full_name || 'Usuario'}
        onLogout={signOut}
        accountType={profile?.account_type || undefined}
        theme={theme}
        subscriptionStatus={profile?.subscription_status}
        trialEndsAt={profile?.trial_ends_at}
        profileCreatedAt={profile?.created_at}
      />

      <div className="sidebar-wrap" style={{
        marginLeft: 'var(--rail-w, 266px)', transition: 'margin-left .22s cubic-bezier(0.22,1,0.36,1)', flex: 1, padding: '44px clamp(24px,4vw,56px) 72px',
        position: 'relative', zIndex: 2, minHeight: '100vh', color: rootTextColor,
        background: 'radial-gradient(ellipse at 0 -40%, rgba(245,197,24,0.04) 0%, transparent 55%)',
      }}>
        {workshop && (
          <div className="topbar-actions" style={{ position: 'absolute', top: 14, right: 'clamp(24px,4vw,56px)', zIndex: 18, display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Cambiar apariencia (contraste claro/oscuro) — ya existía en el
                topbar de /app (persona) pero nunca se trajo acá. Mismo botón,
                mismo ícono, mismo lugar (primero del cluster). */}
            <button onClick={toggleTheme} title="Cambiar apariencia" style={topBtn()} onMouseEnter={topBtnHover} onMouseLeave={topBtnLeave}>
              {theme === 'light'
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.4M12 19.1v2.4M4.4 4.4l1.7 1.7M17.9 17.9l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.4 19.6l1.7-1.7M17.9 6.1l1.7-1.7" /></svg>
                : <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M20.7 14.9A9 9 0 1 1 9.1 3.3a7.2 7.2 0 0 0 11.6 11.6z" /></svg>}
            </button>
            <button onClick={() => setShowNotifPanel(v => !v)} title="Notificaciones" style={topBtn()} onMouseEnter={topBtnHover} onMouseLeave={topBtnLeave}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
              {notifications.length > 0 && (
                <span style={{ position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 9, background: '#F5C518', color: '#111', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${theme === 'light' ? '#f0efe8' : '#141414'}` }}>{notifications.length}</span>
              )}
            </button>

            <button onClick={() => setShowDiagnosticoModal(true)} title="Diagnóstico IA"
              style={topBtn()}
              onMouseEnter={topBtnHover}
              onMouseLeave={topBtnLeave}>
              {/* Ícono "Bot" — el mismo que tallerpro usa para Diagnóstico IA
                  en su Header.tsx (lucide-react `Bot`), CarLink no tiene
                  lucide instalado así que se replica el path a mano. */}
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" />
              </svg>
            </button>

            <button onClick={() => { setActiveTab('ordenes'); setNuevaOrdenSignal(s => s + 1) }} title="Nueva orden de trabajo"
              style={topBtn()}
              onMouseEnter={topBtnHover}
              onMouseLeave={topBtnLeave}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </button>

            {/* Antes era un tab del sidebar ("Ficha Digital & QR") — se movió
                acá y se sacó "QR" del texto (el QR en sí vive dentro de la
                ficha pública, no en este botón). */}
            {workshop.code && (
              <a href={`/taller/${workshop.code}`} target="_blank" rel="noopener noreferrer" title="Ver ficha pública"
                style={{ ...topBtn(), textDecoration: 'none' }}
                onMouseEnter={topBtnHover}
                onMouseLeave={topBtnLeave}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{FICHA_PUBLICA_ICON}</svg>
              </a>
            )}

            <button onClick={() => setShowPerfilModal(true)} className="topbar-profile" title="Perfil y configuración del taller"
              style={{ display: 'flex', alignItems: 'center', gap: 9, height: 42, padding: '0 14px 0 6px', borderRadius: 999, border: `1px solid ${profileBtnBorder}`, background: glassBg, backdropFilter: 'blur(12px)', color: profileBtnColor, cursor: 'pointer', transition: 'all .16s' }}>
              <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#F5C518', color: '#111', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                {(workshop.manager_name || workshop.name || 'T').charAt(0).toUpperCase()}
              </span>
              <span className="action-btn-text" style={{ fontSize: 13, fontWeight: 600 }}>{workshop.manager_name || workshop.name}</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
            </button>
          </div>
        )}

        <div style={{ marginBottom: 24, animation: 'textIn .5s .04s both' }} key={activeTab}>
          <div style={{ fontSize: 12, letterSpacing: '.24em', textTransform: 'uppercase', fontWeight: 700, color: '#F5C518' }}>
            {SECTION_HEADER[activeTab]?.eyebrow || 'Panel de negocio'}
          </div>
          <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 'clamp(22px,2.6vw,32px)', fontWeight: 800, letterSpacing: '-.02em', margin: '2px 0 4px' }}>
            {workshopLoading ? 'Cargando…' : SECTION_HEADER[activeTab]?.title || workshop?.name || 'Mi negocio'}
          </h1>
          <p style={{ color: textMuted, margin: 0, fontSize: 13.5, maxWidth: '64ch', lineHeight: 1.5 }}>
            {SECTION_HEADER[activeTab]?.subtitle || (workshop?.code && (
              <>Código público <b style={{ color: rootTextColor }}>{workshop.code}</b>{workshop.city ? ` · ${workshop.city}` : ''}</>
            ))}
          </p>
        </div>

        {!workshopLoading && !workshop ? (
          <div style={{ padding: 40, textAlign: 'center', border: `1px dashed ${border}`, borderRadius: 18, color: textMuted }}>
            Tu cuenta es de tipo taller/empresa pero todavía no tiene un negocio registrado.{' '}
            <a href="/register" style={{ color: '#F5C518', fontWeight: 700 }}>Completa el registro</a>.
          </div>
        ) : !subValid ? (
          <SubscriptionExpiredCard theme={theme} />
        ) : activeTab === 'resumen' ? (
          <ResumenModule theme={theme}
            onNavigateTab={setActiveTab}
            onOpenNewWorkOrder={() => { setActiveTab('ordenes'); setNuevaOrdenSignal(s => s + 1) }}
            onOpenAiDiagnostic={() => setShowDiagnosticoModal(true)}
            onSelectWorkOrder={(o: WorkOrder) => { setActiveTab('ordenes'); setOpenOrderId(o.id) }}
          />
        ) : activeTab === 'clientes' ? (
          <ClientesModule theme={theme} />
        ) : activeTab === 'ordenes' ? (
          <OrdenesModule theme={theme} workshop={workshop!} autoNewSignal={nuevaOrdenSignal} onAutoNewHandled={() => setNuevaOrdenSignal(0)}
            openOrderId={openOrderId} onOpenOrderHandled={() => setOpenOrderId(null)}
            onOpenDocumentGenerator={orderId => setDocumentoPrefillOrderId(orderId || 'general')} />
        ) : activeTab === 'inventario' ? (
          <InventarioModule theme={theme} />
        ) : activeTab === 'citas' ? (
          <CitasModule theme={theme} onConverted={orderId => { setActiveTab('ordenes'); setOpenOrderId(orderId) }} />
        ) : activeTab === 'notificaciones' ? (
          <NotificacionesModule theme={theme} />
        ) : activeTab === 'rentabilidad' ? (
          <RentabilidadModule theme={theme} workshop={workshop!} />
        ) : activeTab === 'perfil' ? (
          <PerfilModule theme={theme} workshop={workshop!} />
        ) : (
          <PlaceholderModule id={activeTab} cardBg={cardBg} border={border} textMuted={textMuted} />
        )}
      </div>

      {/* Botones del topbar-actions: Diagnóstico IA y Perfil abren como modal,
          sin depender de la tab activa (ver docs/PLAN_PARIDAD_UI_TALLERPRO.md Fase A). */}
      {showDiagnosticoModal && (
        <AdminModal isOpen onClose={() => setShowDiagnosticoModal(false)} title="Diagnóstico IA" theme={theme} maxWidth={960}>
          <DiagnosticoIAModule theme={theme} />
        </AdminModal>
      )}
      {showPerfilModal && workshop && (
        <AdminModal isOpen onClose={() => setShowPerfilModal(false)} title="Perfil y configuración del taller" theme={theme} maxWidth={820}>
          <PerfilModule theme={theme} workshop={workshop} />
        </AdminModal>
      )}

      {/* "Generar documento" contextual desde el detalle de una orden, o
          general desde "Emisión de documentos & recibos" — ver
          onOpenDocumentGenerator más arriba y Fase B del plan de paridad. */}
      {documentoPrefillOrderId && workshop && (
        <AdminModal isOpen onClose={() => setDocumentoPrefillOrderId(null)} title="Documentos del taller" theme={theme} maxWidth={860}>
          <DocumentosModule theme={theme} workshop={workshop} prefillOrderId={documentoPrefillOrderId === 'general' ? undefined : documentoPrefillOrderId} />
        </AdminModal>
      )}

      {/* Panel de historial de notificaciones — mismo patrón visual que el
          panel de notificaciones de /app (dropdown arriba-derecha, no un
          modal centrado), a pedido del usuario. */}
      {showNotifPanel && (
        <div onClick={() => setShowNotifPanel(false)} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(4,4,4,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: '70px clamp(24px,4vw,56px) 24px' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 420, maxWidth: '94vw', maxHeight: '76vh', background: theme === 'dark' ? '#111318' : '#fff', border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,.5)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 800, color: rootTextColor }}>Notificaciones a clientes</span>
              </div>
              <button onClick={() => setShowNotifPanel(false)} style={{ width: 26, height: 26, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.08)', color: '#8f8a7a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div style={{ overflowY: 'auto', padding: '10px 14px' }}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: textMuted, fontSize: 13 }}>Sin notificaciones enviadas aún</div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} style={{ padding: '10px 4px', borderBottom: `1px solid ${border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 12.5, color: rootTextColor }}>{n.recipient_name}</span>
                      <span style={{ fontSize: 10.5, color: textMuted }}>{new Date(n.sent_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 9.5, fontWeight: 700, color: '#2ecc71', background: 'rgba(46,204,113,0.1)', padding: '2px 6px', borderRadius: 5 }}>{n.channel}</span>
                      <span style={{ fontSize: 10.5, color: textMuted }}>{n.notification_type}</span>
                    </div>
                    <div style={{ fontSize: 11, color: textMuted, marginTop: 4, fontStyle: 'italic' }}>&quot;{n.message}&quot;</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PlaceholderModule({ id, cardBg, border, textMuted }: { id: string; cardBg: string; border: string; textMuted: string }) {
  const info = MODULE_INFO[id] || { title: id, blurb: '' }
  return (
    <div style={{ animation: 'sectionIn .5s both', maxWidth: 560, padding: 32, borderRadius: 18, background: cardBg, border: `1px dashed ${border}` }}>
      <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#F5C518', fontWeight: 700, marginBottom: 8 }}>
        Próximamente
      </div>
      <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>{info.title}</h2>
      <p style={{ color: textMuted, margin: 0, fontSize: 14, lineHeight: 1.6 }}>{info.blurb}</p>
    </div>
  )
}
