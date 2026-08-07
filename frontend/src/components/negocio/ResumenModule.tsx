'use client'

import { useMemo, useState } from 'react'
import { useWorkshopDashboard, useWorkOrders, useAppointments, useWorkshopInventory, useWorkshopClients, useWorkshopVehicles, useWorkshopMechanics } from '@/lib/hooks'
import type { WorkOrder } from '@/lib/types'
import { negocioTokens, money, primaryBtnStyle, ghostBtnStyle } from './shared'

/* Réplica de la distribución de tallerpro/src/components/DashboardOverview.tsx
   (docs/PLAN_PARIDAD_UI_TALLERPRO.md Fase C.1): banner con 2 accesos rápidos,
   stat-row de 4 tarjetas clicables, y grid principal 2/3 (órdenes activas +
   banner de IA) + 1/3 (citas de hoy + alertas de stock). A diferencia de
   tallerpro (datos mock en localStorage), todo sale de los hooks reales —
   WorkOrder/Appointment solo traen IDs de cliente/vehículo/mecánico, así que
   se arman mapas por id para resolver los nombres a mostrar. */

const ACTIVE_STATUSES = ['Pendiente', 'En Proceso', 'Diagnosticado', 'Listo para Entrega']

const STATUS_COLOR: Record<string, string> = {
  'Pendiente': '#8f8a7a', 'En Proceso': '#F5C518', 'Diagnosticado': '#3aa0ff',
  'Listo para Entrega': '#ff8a3d', 'Entregado': '#2ecc71', 'Cancelado': '#ff4d6a',
}

export default function ResumenModule({ theme, onNavigateTab, onOpenNewWorkOrder, onOpenAiDiagnostic, onSelectWorkOrder }: {
  theme: 'light' | 'dark'
  onNavigateTab: (tab: string) => void
  onOpenNewWorkOrder: () => void
  onOpenAiDiagnostic: () => void
  onSelectWorkOrder: (order: WorkOrder) => void
}) {
  const t = negocioTokens(theme)
  const { dashboard, loading: dashLoading } = useWorkshopDashboard()
  const { workOrders } = useWorkOrders()
  const { appointments, convertAppointment } = useAppointments()
  const { parts: lowStockParts } = useWorkshopInventory(true)
  const { clients } = useWorkshopClients()
  const { vehicles } = useWorkshopVehicles()
  const { mechanics } = useWorkshopMechanics()
  const [converting, setConverting] = useState<string | null>(null)

  const clientById = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients])
  const vehicleById = useMemo(() => Object.fromEntries(vehicles.map(v => [v.id, v])), [vehicles])
  const mechanicById = useMemo(() => Object.fromEntries(mechanics.map(m => [m.id, m])), [mechanics])

  const activeOrders = workOrders.filter(o => ACTIVE_STATUSES.includes(o.status))
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayAppointments = appointments.filter(a => a.appointment_date === todayStr || a.status === 'Confirmada').slice(0, 4)

  const handleConvert = async (id: string) => {
    setConverting(id)
    const result = await convertAppointment(id)
    setConverting(null)
    if (result) onNavigateTab('ordenes')
  }

  const cardStyle: React.CSSProperties = {
    padding: 18, borderRadius: 16, background: t.cardBg, border: `1px solid ${t.border}`,
    cursor: 'pointer', transition: 'border-color .16s, transform .16s',
  }
  const iconBox = (bg: string, color: string): React.CSSProperties => ({
    width: 38, height: 38, borderRadius: 11, background: bg, color,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
  })
  const widgetStyle: React.CSSProperties = { padding: 18, borderRadius: 16, background: t.cardBg, border: `1px solid ${t.border}` }

  const stats = [
    {
      label: 'Vehículos en taller', value: dashboard?.active_work_orders ?? 0, tab: 'ordenes',
      icon: <path d="M5 17h14M5 17a2 2 0 0 1-2-2v-3l2-5h10l3 5h1a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2M5 17a2 2 0 1 0 4 0m6 0a2 2 0 1 0 4 0" />,
      iconBg: 'rgba(58,160,255,0.12)', iconColor: '#3aa0ff', hint: 'Órdenes activas',
    },
    {
      label: 'Citas programadas', value: dashboard?.today_appointments ?? 0, tab: 'citas',
      icon: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
      iconBg: 'rgba(46,204,113,0.12)', iconColor: t.success, hint: 'Ver agenda completa',
    },
    {
      label: 'Alertas repuestos', value: dashboard?.low_stock_alerts ?? 0, tab: 'inventario',
      icon: <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
      iconBg: 'rgba(255,138,61,0.12)', iconColor: t.warning, hint: 'Gestionar inventario',
    },
    {
      label: 'Rentabilidad mensual', value: money(dashboard?.current_month_profit ?? 0), tab: 'rentabilidad',
      icon: <><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></>,
      iconBg: 'rgba(245,197,24,0.12)', iconColor: t.gold, hint: `Ingresos: ${money(dashboard?.current_month_revenue ?? 0)}`,
    },
  ]

  return (
    <div style={{ animation: 'sectionIn .4s both', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Accesos rápidos — antes vivían dentro de una card de banner ("Centro
          de control del taller" / "Gestión en tiempo real"). Pedido del
          usuario 2026-08-06: sacar esa card y dejar los botones sueltos, con
          el mismo estilo (ghost + primario) que usa el resto del panel
          (OrdenesModule, CitasModule, etc.) — no hace falta un card para que
          existan. */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={onOpenAiDiagnostic} style={{ ...ghostBtnStyle(t), display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 0-7 7c0 3 2 5 2 7h10c0-2 2-4 2-7a7 7 0 0 0-7-7z" /><path d="M9 21h6M10 18v3M14 18v3" /></svg>
          Asistente Diagnóstico IA
        </button>
        <button onClick={onOpenNewWorkOrder} style={primaryBtnStyle(t)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Ingresar vehículo
        </button>
      </div>

      {/* Stat-row de 4 */}
      {dashLoading ? (
        <div style={{ padding: 40, textAlign: 'center', color: t.textMuted }}>Cargando resumen…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {stats.map(s => (
            <div key={s.label} onClick={() => onNavigateTab(s.tab)} style={cardStyle}
              onMouseEnter={e => { e.currentTarget.style.borderColor = t.gold }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.border }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: t.textMuted }}>{s.label}</span>
                <span style={iconBox(s.iconBg, s.iconColor)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{s.icon}</svg>
                </span>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: t.textPrimary, marginTop: 10 }}>{s.value}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5, color: t.textMuted, marginTop: 6 }}>
                <span>{s.hint}</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M9 7h8v8" /></svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid principal: órdenes activas (2/3) + widgets (1/3) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(260px,1fr)', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div style={widgetStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: `1px solid ${t.subtleBorder}`, marginBottom: 4 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: t.textPrimary }}>Órdenes de trabajo activas</div>
              <button onClick={() => onNavigateTab('ordenes')} style={{ background: 'transparent', border: 'none', color: t.gold, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>Ver todas →</button>
            </div>
            {activeOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: t.textMuted }}>
                <p style={{ fontSize: 13, margin: '0 0 10px' }}>No hay vehículos en taller actualmente</p>
                <button onClick={onOpenNewWorkOrder} style={{ padding: '9px 16px', borderRadius: 10, border: 'none', background: t.gold, color: '#111', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>+ Ingresar primer vehículo</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {activeOrders.map(o => {
                  const vehicle = vehicleById[o.workshop_vehicle_id]
                  const client = clientById[o.client_id]
                  const mechanic = o.mechanic_id ? mechanicById[o.mechanic_id] : null
                  return (
                    <div key={o.id} onClick={() => onSelectWorkOrder(o)} style={{
                      display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                      padding: '12px 6px', borderTop: `1px solid ${t.subtleBorder}`, cursor: 'pointer',
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11.5, fontWeight: 800, color: t.gold }}>{o.order_number}</span>
                          {vehicle && <span style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, background: t.subtleBorder, padding: '2px 8px', borderRadius: 6 }}>{vehicle.license_plate}</span>}
                          <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: `${STATUS_COLOR[o.status] || t.textMuted}22`, color: STATUS_COLOR[o.status] || t.textMuted }}>{o.status}</span>
                        </div>
                        <div style={{ fontSize: 12.5, color: t.textSecondary, marginTop: 3 }}>
                          {vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Vehículo'} — {client?.name || 'Cliente'}
                        </div>
                        {o.symptoms && <div style={{ fontSize: 11.5, color: t.textMuted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 420 }}>🔧 {o.symptoms}</div>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: t.textPrimary }}>{money(o.final_total)}</div>
                        {mechanic && <div style={{ fontSize: 11, color: t.textMuted }}>{mechanic.name}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Banner de IA — atajo secundario, igual que tallerpro */}
          <div onClick={onOpenAiDiagnostic} style={{
            padding: 18, borderRadius: 16, background: 'linear-gradient(155deg,#1c1708,#141414)', border: '1px solid rgba(245,197,24,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={iconBox('rgba(245,197,24,0.14)', t.gold)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 0-7 7c0 3 2 5 2 7h10c0-2 2-4 2-7a7 7 0 0 0-7-7z" /><path d="M9 21h6M10 18v3M14 18v3" /></svg>
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#f5f3ec' }}>¿Falla técnica difícil de precisar?</div>
                <div style={{ fontSize: 11.5, color: '#8f8a7a', marginTop: 2 }}>El asistente IA sugiere causas, mano de obra y repuestos a partir de los síntomas.</div>
              </div>
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: t.gold, whiteSpace: 'nowrap' }}>Consultar →</span>
          </div>
        </div>

        {/* Widgets laterales */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={widgetStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: `1px solid ${t.subtleBorder}`, marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: t.textPrimary }}>Citas del día</div>
              <button onClick={() => onNavigateTab('citas')} style={{ background: 'transparent', border: 'none', color: t.success, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ Agendar</button>
            </div>
            {todayAppointments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 8px', color: t.textMuted, fontSize: 12.5 }}>No hay citas agendadas para hoy</div>
            ) : (
              <div>
                {todayAppointments.map(a => (
                  <div key={a.id} style={{ padding: '10px 2px', borderTop: `1px solid ${t.subtleBorder}`, display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: t.success, background: 'rgba(46,204,113,0.1)', padding: '2px 6px', borderRadius: 6 }}>{a.time_slot}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary }}>{a.vehicle_plate}</span>
                      </div>
                      <div style={{ fontSize: 12, color: t.textSecondary, marginTop: 2 }}>{a.client_name}</div>
                      <div style={{ fontSize: 11, color: t.textMuted }}>{a.service_category}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      {a.converted_to_work_order_id || a.status === 'Cancelada' ? (
                        <span style={{ fontSize: 9.5, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: t.subtleBorder, color: t.textMuted }}>
                          {a.converted_to_work_order_id ? 'INGRESADO' : 'CANCELADA'}
                        </span>
                      ) : (
                        <button onClick={() => handleConvert(a.id)} disabled={converting === a.id} style={{
                          fontSize: 9.5, fontWeight: 800, padding: '4px 9px', borderRadius: 999, border: 'none',
                          background: t.gold, color: '#111', cursor: 'pointer',
                        }}>{converting === a.id ? '…' : 'Crear OT'}</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={widgetStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: `1px solid ${t.subtleBorder}`, marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: t.textPrimary }}>Alertas de stock bajo</div>
              <button onClick={() => onNavigateTab('inventario')} style={{ background: 'transparent', border: 'none', color: t.warning, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Ver inventario</button>
            </div>
            {lowStockParts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 8px', color: t.textMuted, fontSize: 12.5 }}>Inventario de repuestos óptimo</div>
            ) : (
              <div>
                {lowStockParts.slice(0, 4).map(p => (
                  <div key={p.id} style={{ padding: '10px 2px', borderTop: `1px solid ${t.subtleBorder}`, display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: 10.5, color: t.textMuted }}>SKU: {p.sku || '—'}</div>
                    </div>
                    <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                      <div style={{ fontSize: 11.5, fontWeight: 800, color: t.danger, background: 'rgba(255,77,106,0.1)', padding: '2px 8px', borderRadius: 999 }}>{p.stock} disp.</div>
                      <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2 }}>Mín: {p.min_stock}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
