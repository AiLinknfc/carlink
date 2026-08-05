'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/store/auth'
import { useTheme } from '@/store/theme'
import { isBusinessAccount, isSubscriptionValid } from '@/lib/constants'
import { useMyWorkshop, useWorkshopDashboard } from '@/lib/hooks'
import Sidebar from '@/components/Sidebar'
import BgParticles from '@/components/BgParticles'
import SubscriptionExpiredCard from '@/components/SubscriptionExpiredCard'

/* Panel de negocio del taller/empresa — migración de tallerpro/ hacia
   CarLink (docs/PLAN_MIGRACION_TALLERPRO.md). Vive fuera de /app (que es
   siempre "un vehículo activo a la vez") porque este panel es multi-cliente:
   la cartera de clientes/vehículos propia del taller, no la ficha de un
   vehículo puntual. Las tabs Ficha/Taller/Diagnóstico/Partes/Config de /app
   no se tocan — este es un panel aditivo. */

const NAV_ITEMS = [
  { id: 'resumen', label: 'Resumen', icon: <><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></> },
  { id: 'clientes', label: 'Clientes & Vehículos', icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></> },
  { id: 'ordenes', label: 'Órdenes de trabajo', icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></> },
  { id: 'inventario', label: 'Inventario', icon: <><path d="M21 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2"/><path d="M3 8l1.5 12a2 2 0 0 0 2 1.8h11a2 2 0 0 0 2-1.8L21 8"/><path d="M9 12h6"/></> },
  { id: 'citas', label: 'Citas', icon: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></> },
  { id: 'notificaciones', label: 'Notificaciones', icon: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></> },
  { id: 'rentabilidad', label: 'Rentabilidad', icon: <><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></> },
  { id: 'documentos', label: 'Documentos', icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 12 15 15 12"/><line x1="12" y1="9" x2="12" y2="15"/></> },
  { id: 'ia', label: 'Diagnóstico IA', icon: <><path d="M12 2a7 7 0 0 0-7 7c0 3 2 5 2 7h10c0-2 2-4 2-7a7 7 0 0 0-7-7z"/><path d="M9 21h6M10 18v3M14 18v3"/></> },
  { id: 'perfil', label: 'Perfil del taller', icon: <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></> },
]

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
  const { theme } = useTheme()
  const [activeTab, setActiveTab] = useState('resumen')
  const { workshop, loading: workshopLoading } = useMyWorkshop()

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

  const subValid = isSubscriptionValid(profile?.subscription_status, profile?.trial_ends_at, profile?.created_at)

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
        navItemsOverride={NAV_ITEMS}
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
        <div style={{ marginBottom: 24, animation: 'textIn .5s .04s both' }}>
          <div style={{ fontSize: 12, letterSpacing: '.24em', textTransform: 'uppercase', fontWeight: 700, color: '#F5C518' }}>
            Panel de negocio
          </div>
          <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 'clamp(24px,2.8vw,34px)', fontWeight: 800, letterSpacing: '-.02em', margin: '2px 0 4px' }}>
            {workshopLoading ? 'Cargando…' : workshop?.name || 'Mi negocio'}
          </h1>
          {workshop?.code && (
            <p style={{ color: textMuted, margin: 0, fontSize: 13 }}>
              Código público <b style={{ color: rootTextColor }}>{workshop.code}</b>
              {workshop.city ? ` · ${workshop.city}` : ''}
            </p>
          )}
        </div>

        {!workshopLoading && !workshop ? (
          <div style={{ padding: 40, textAlign: 'center', border: `1px dashed ${border}`, borderRadius: 18, color: textMuted }}>
            Tu cuenta es de tipo taller/empresa pero todavía no tiene un negocio registrado.{' '}
            <a href="/register" style={{ color: '#F5C518', fontWeight: 700 }}>Completa el registro</a>.
          </div>
        ) : !subValid ? (
          <SubscriptionExpiredCard theme={theme} />
        ) : activeTab === 'resumen' ? (
          <ResumenModule cardBg={cardBg} border={border} textMuted={textMuted} rootTextColor={rootTextColor} />
        ) : (
          <PlaceholderModule id={activeTab} cardBg={cardBg} border={border} textMuted={textMuted} />
        )}
      </div>
    </div>
  )
}

function ResumenModule({ cardBg, border, textMuted, rootTextColor }: { cardBg: string; border: string; textMuted: string; rootTextColor: string }) {
  const { dashboard, loading } = useWorkshopDashboard()

  const stats = [
    { label: 'Órdenes activas', value: dashboard?.active_work_orders ?? 0 },
    { label: 'Citas de hoy', value: dashboard?.today_appointments ?? 0 },
    { label: 'Alertas de stock bajo', value: dashboard?.low_stock_alerts ?? 0 },
    { label: 'Clientes totales', value: dashboard?.total_clients ?? 0 },
  ]

  const money = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

  return (
    <div style={{ animation: 'sectionIn .5s both' }}>
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: textMuted }}>Cargando resumen…</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
            {stats.map(s => (
              <div key={s.label} style={{ padding: 18, borderRadius: 16, background: cardBg, border: `1px solid ${border}` }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: '#F5C518' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: 20, borderRadius: 18, background: cardBg, border: `1px solid ${border}` }}>
            <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#F5C518', fontWeight: 700, marginBottom: 14 }}>
              Este mes
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: textMuted }}>Ingresos</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: rootTextColor }}>{money(dashboard?.current_month_revenue ?? 0)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: textMuted }}>Ganancia neta</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: rootTextColor }}>{money(dashboard?.current_month_profit ?? 0)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: textMuted }}>Margen</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: rootTextColor }}>{(dashboard?.avg_profit_margin ?? 0).toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </>
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
