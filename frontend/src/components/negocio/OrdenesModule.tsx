'use client'

import { useEffect, useMemo, useState } from 'react'
import { useWorkOrders, useWorkshopClients, useWorkshopVehicles, useWorkshopMechanics, useWorkshopInventory, useUpload } from '@/lib/hooks'
import { workOrdersApi } from '@/lib/api'
import type { WorkOrder, WorkOrderLaborItemIn, WorkOrderPartIn, WorkOrderStatus } from '@/lib/types'
import type { Workshop } from '@/lib/types'
import AdminModal from '@/components/admin/AdminModal'
import { negocioTokens, inputStyle, labelStyle, primaryBtnStyle, ghostBtnStyle, emptyState, money, SERVICE_CATEGORIES } from './shared'

const STATUSES: (WorkOrderStatus | string)[] = ['Pendiente', 'En Proceso', 'Diagnosticado', 'Listo para Entrega', 'Entregado', 'Cancelado']

const STATUS_COLOR: Record<string, string> = {
  'Pendiente': '#8f8a7a', 'En Proceso': '#F5C518', 'Diagnosticado': '#3aa0ff',
  'Listo para Entrega': '#ff8a3d', 'Entregado': '#2ecc71', 'Cancelado': '#ff4d6a',
}

export default function OrdenesModule({ theme, workshop, autoNewSignal, onAutoNewHandled, openOrderId, onOpenOrderHandled, onOpenDocumentGenerator }: {
  theme: 'light' | 'dark'; workshop: Workshop; autoNewSignal?: number
  /** El padre resetea `autoNewSignal` a 0 acá — sin esto, volver a esta tab
   * por el sidebar (no por el botón "+") reabría el modal de nueva orden
   * solo, con el último valor de la señal todavía en pie de una visita
   * anterior. Bug real reportado por el usuario, no hipotético. */
  onAutoNewHandled?: () => void
  /** Abre directo el detalle de esta orden — click en una fila desde
   * ResumenModule (igual que tallerpro: DashboardOverview → onSelectWorkOrder
   * → WorkOrdersManager con initialSelectedOrder). */
  openOrderId?: string | null
  /** Mismo motivo que onAutoNewHandled — sin resetear `openOrderId`, volver
   * a esta tab reabre el detalle de la última orden vista, sola. */
  onOpenOrderHandled?: () => void
  /** Igual que tallerpro (WorkOrdersManager → DocumentGeneratorModal): el
   * generador de documentos se abre desde el detalle de una orden, no desde
   * un tab propio — ver docs/PLAN_PARIDAD_UI_TALLERPRO.md Fase B. Sin
   * `orderId` es el botón general "Emisión de Documentos & Recibos" del
   * header (tallerpro lo llama sin argumento — `onOpenDocumentGenerator()`). */
  onOpenDocumentGenerator?: (orderId?: string) => void
}) {
  const t = negocioTokens(theme)
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [search, setSearch] = useState('')
  // Consulta de historial por placa — igual que tallerpro (WorkOrdersManager:
  // "Vehicle Historial Quick Lookup Tool", al pie de la sección). Es una
  // herramienta aparte del buscador de la tabla de arriba: busca sobre
  // TODAS las órdenes del taller (sin importar los filtros de estado/
  // categoría activos), como en tallerpro.
  const [vehicleHistorySearch, setVehicleHistorySearch] = useState('')
  const { workOrders, loading, updateWorkOrderStatus, reload } = useWorkOrders({ status: statusFilter || undefined })
  const [modal, setModal] = useState<WorkOrder | null | 'new'>(null)

  // Búsqueda y columna Vehículo/Placa/Cliente/Mecánico de la lista — igual
  // que tallerpro (WorkOrdersManager: buscador + tabla con esas columnas).
  // WorkOrder solo trae IDs, así que se resuelven por mapa.
  const { clients } = useWorkshopClients()
  const { vehicles } = useWorkshopVehicles()
  const { mechanics } = useWorkshopMechanics()
  const clientById = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients])
  const vehicleById = useMemo(() => Object.fromEntries(vehicles.map(v => [v.id, v])), [vehicles])
  const mechanicById = useMemo(() => Object.fromEntries(mechanics.map(m => [m.id, m])), [mechanics])

  const filteredOrders = workOrders.filter(o => {
    if (categoryFilter && o.category !== categoryFilter) return false
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    const vehicle = vehicleById[o.workshop_vehicle_id]
    const client = clientById[o.client_id]
    return [o.order_number, vehicle?.license_plate, vehicle?.model, client?.name].some(v => v?.toLowerCase().includes(q))
  })

  const vehicleHistoryOrders = vehicleHistorySearch.trim()
    ? workOrders.filter(o => {
        const q = vehicleHistorySearch.trim().toLowerCase()
        const vehicle = vehicleById[o.workshop_vehicle_id]
        const client = clientById[o.client_id]
        return vehicle?.license_plate?.toLowerCase().includes(q) || client?.name?.toLowerCase().includes(q)
      })
    : []

  // Disparado por el botón "Nueva orden" del topbar-actions (fuera de este
  // módulo) — ver docs/PLAN_PARIDAD_UI_TALLERPRO.md Fase A. `onAutoNewHandled`
  // resetea la señal en el padre apenas se consume: si no, la señal se queda
  // en pie y la próxima vez que se entra a esta tab por el sidebar (sin
  // tocar el botón "+") el modal de nueva orden se reabre solo — bug real,
  // no hipotético (reportado por el usuario 2026-08-06).
  useEffect(() => {
    if (autoNewSignal) {
      setModal('new')
      onAutoNewHandled?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoNewSignal])

  useEffect(() => {
    if (!openOrderId) return
    const o = workOrders.find(w => w.id === openOrderId)
    if (o) {
      setModal(o)
      onOpenOrderHandled?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openOrderId, workOrders])

  const ROW_COLS = '90px minmax(150px,1.2fr) minmax(120px,1fr) minmax(130px,1fr) 130px 150px 90px 90px'

  return (
    <div style={{ animation: 'sectionIn .4s both' }}>
      {/* Barra de búsqueda + filtros — igual que tallerpro (WorkOrdersManager:
          buscador por placa/cliente/#OT/modelo + estado + categoría). */}
      <div style={{ padding: 16, borderRadius: 16, background: t.cardBg, border: `1px solid ${t.border}`, marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: t.textMuted }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por placa, cliente, # OT o modelo…"
            style={{ ...inputStyle(t), paddingLeft: 32 }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle(t), width: 'auto', flex: '0 1 180px' }}>
          <option value="">Todos los estados</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ ...inputStyle(t), width: 'auto', flex: '0 1 200px' }}>
          <option value="">Todas las categorías</option>
          {SERVICE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {/* Botón general (sin orden preseleccionada) — igual que tallerpro:
            WorkOrdersManager llama onOpenDocumentGenerator() sin argumento,
            al lado de "Nueva Orden de Trabajo". El acceso puntual por orden
            sigue viviendo en "Generar documento" dentro del detalle. */}
        {onOpenDocumentGenerator && (
          <button onClick={() => onOpenDocumentGenerator()} style={{ ...ghostBtnStyle(t), marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="m9 15 2 2 4-4" /></svg>
            Emisión de documentos & recibos
          </button>
        )}
        <button onClick={() => setModal('new')} style={primaryBtnStyle(t)}>+ Nueva orden</button>
      </div>

      {!loading && workOrders.length === 0 && <div style={emptyState(t, 'Sin órdenes de trabajo')} />}
      {!loading && workOrders.length > 0 && filteredOrders.length === 0 && <div style={emptyState(t, 'Ninguna orden coincide con la búsqueda')} />}

      {filteredOrders.length > 0 && (
        <div style={{ borderRadius: 16, border: `1px solid ${t.border}`, background: t.cardBg, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 900 }}>
              {/* Encabezado — igual que las columnas de la tabla de tallerpro */}
              <div style={{ display: 'grid', gridTemplateColumns: ROW_COLS, gap: 14, padding: '11px 18px', borderBottom: `1px solid ${t.subtleBorder}`, fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: t.textMuted }}>
                <div>Orden #</div><div>Vehículo / Placa</div><div>Cliente</div><div>Categoría</div><div>Mecánico</div><div>Estado</div><div>Total</div><div>Pago</div>
              </div>
              {filteredOrders.map(o => {
                const vehicle = vehicleById[o.workshop_vehicle_id]
                const client = clientById[o.client_id]
                const mechanic = o.mechanic_id ? mechanicById[o.mechanic_id] : null
                return (
                  <div key={o.id} onClick={() => setModal(o)} style={{
                    display: 'grid', gridTemplateColumns: ROW_COLS, gap: 14, alignItems: 'center',
                    padding: '13px 18px', borderTop: `1px solid ${t.subtleBorder}`, cursor: 'pointer',
                  }}>
                    <div style={{ fontWeight: 800, fontSize: 12.5, color: t.gold }}>{o.order_number}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      {vehicle && <span style={{ fontSize: 11, fontWeight: 800, color: t.gold, background: 'rgba(245,197,24,0.1)', padding: '3px 7px', borderRadius: 6, flex: '0 0 auto' }}>{vehicle.license_plate}</span>}
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vehicle ? `${vehicle.brand} ${vehicle.model}` : (o.symptoms || o.category || '—')}</span>
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client?.name || '—'}</div>
                    <div style={{ fontSize: 12, color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.category || '—'}</div>
                    <div style={{ fontSize: 12, color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mechanic?.name || 'Sin asignar'}</div>
                    <div>
                      <select
                        value={o.status}
                        onClick={e => e.stopPropagation()}
                        onChange={e => updateWorkOrderStatus(o.id, e.target.value)}
                        style={{ fontSize: 11, fontWeight: 700, padding: '5px 8px', borderRadius: 8, border: `1px solid ${STATUS_COLOR[o.status] || t.subtleBorder}`, background: 'transparent', color: STATUS_COLOR[o.status] || t.textMuted, maxWidth: '100%' }}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>{money(o.final_total)}</div>
                    <div>
                      {o.is_paid
                        ? <span style={{ fontSize: 9.5, fontWeight: 700, padding: '4px 8px', borderRadius: 999, background: 'rgba(46,204,113,0.14)', color: t.success }}>PAGADA</span>
                        : <span style={{ fontSize: 9.5, fontWeight: 700, padding: '4px 8px', borderRadius: 999, background: 'rgba(255,138,61,0.12)', color: t.warning }}>PENDIENTE</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Consulta de historial por placa — igual que tallerpro
          (WorkOrdersManager: "Consulta de Historial por Placa" al pie de la
          sección, tarjeta oscura con acento dorado, buscador independiente
          por placa o cliente sobre el historial completo). */}
      <div style={{ marginTop: 16, padding: 22, borderRadius: 16, background: 'linear-gradient(155deg,#1c1708,#141414)', border: '1px solid rgba(245,197,24,0.2)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: t.gold, fontWeight: 800, fontSize: 14.5 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2" /><circle cx="6.5" cy="16.5" r="2.5" /><circle cx="16.5" cy="16.5" r="2.5" /></svg>
              Consulta de historial por placa
            </div>
            <p style={{ fontSize: 12, color: '#b6b2a6', margin: '5px 0 0' }}>Busca el expediente histórico completo de mantenciones de cualquier vehículo que haya ingresado al taller.</p>
          </div>
          <div style={{ position: 'relative', width: '100%', maxWidth: 300 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#8f8a7a' }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input
              value={vehicleHistorySearch}
              onChange={e => setVehicleHistorySearch(e.target.value)}
              placeholder="Ingresa placa o cliente…"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 12px 10px 32px', borderRadius: 10, fontSize: 13,
                fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: '.02em', outline: 'none',
                background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.12)', color: '#f5f3ec',
              }}
            />
          </div>
        </div>

        {vehicleHistorySearch.trim() && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#b6b2a6', marginBottom: 10 }}>
              Historial encontrado ({vehicleHistoryOrders.length} {vehicleHistoryOrders.length === 1 ? 'registro' : 'registros'} para &quot;{vehicleHistorySearch.toUpperCase()}&quot;)
            </div>
            {vehicleHistoryOrders.length === 0 ? (
              <p style={{ fontSize: 12.5, color: '#8f8a7a' }}>No hay registros con esa placa o cliente.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                {vehicleHistoryOrders.map(o => {
                  const vehicle = vehicleById[o.workshop_vehicle_id]
                  const mechanic = o.mechanic_id ? mechanicById[o.mechanic_id] : null
                  return (
                    <div key={o.id} onClick={() => setModal(o)} style={{ padding: 14, borderRadius: 12, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 12, color: t.gold }}>{o.order_number}</span>
                        <span style={{ fontSize: 10.5, color: '#8f8a7a' }}>{o.created_at ? new Date(o.created_at).toLocaleDateString('es-CO') : ''}</span>
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#f5f3ec' }}>{vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.license_plate})` : '—'}</div>
                      <div style={{ fontSize: 11.5, color: '#b6b2a6', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>📋 {o.symptoms || 'Sin síntomas registrados'}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 10.5, color: '#8f8a7a' }}>
                        <span>Mecánico: {mechanic?.name || 'Sin asignar'}</span>
                        <span style={{ fontWeight: 800, color: t.success }}>{money(o.final_total)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {modal && (
        <WorkOrderFormModal
          t={t} theme={theme} workshop={workshop} order={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { reload(); setModal(null) }}
          onOpenDocumentGenerator={onOpenDocumentGenerator}
        />
      )}
    </div>
  )
}

function WorkOrderFormModal({ t, theme, workshop, order, onClose, onSaved, onOpenDocumentGenerator }: {
  t: ReturnType<typeof negocioTokens>
  theme: 'light' | 'dark'
  workshop: Workshop
  order: WorkOrder | null
  onOpenDocumentGenerator?: (orderId: string) => void
  onClose: () => void
  onSaved: () => void
}) {
  const { clients } = useWorkshopClients()
  const { mechanics } = useWorkshopMechanics()
  const { parts: inventory } = useWorkshopInventory()
  const { uploadFile } = useUpload()
  const { addWorkOrder, updateWorkOrder } = useWorkOrders()

  const [clientId, setClientId] = useState(order?.client_id || '')
  const { vehicles } = useWorkshopVehicles({ clientId: clientId || undefined })
  const [vehicleId, setVehicleId] = useState(order?.workshop_vehicle_id || '')
  const [mechanicId, setMechanicId] = useState(order?.mechanic_id || '')
  const [status, setStatus] = useState(order?.status || 'Pendiente')
  const [category, setCategory] = useState(order?.category || '')
  const [symptoms, setSymptoms] = useState(order?.symptoms || '')
  const [technicalNotes, setTechnicalNotes] = useState(order?.technical_notes || '')
  const [isPaid, setIsPaid] = useState(order?.is_paid || false)
  const [paymentMethod, setPaymentMethod] = useState(order?.payment_method || '')
  const [laborItems, setLaborItems] = useState<WorkOrderLaborItemIn[]>(
    order?.labor_items.map(l => ({ description: l.description, hours: l.hours, rate_per_hour: l.rate_per_hour })) || []
  )
  const [partsItems, setPartsItems] = useState<WorkOrderPartIn[]>(
    order?.parts_items.map(p => ({ part_id: p.part_id, part_name: p.part_name, sku: p.sku, quantity: p.quantity, unit_cost: p.unit_cost, unit_price: p.unit_price })) || []
  )
  const [photos, setPhotos] = useState(order?.photo_evidences || [])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const laborTotal = laborItems.reduce((s, l) => s + (Number(l.hours) || 0) * (Number(l.rate_per_hour) || 0), 0)
  const partsTotal = partsItems.reduce((s, p) => s + (Number(p.quantity) || 0) * (Number(p.unit_price) || 0), 0)
  const preTax = laborTotal + partsTotal
  const tax = preTax * (Number(workshop.tax_rate_percent) / 100)
  const estTotal = preTax + tax

  const addLabor = () => setLaborItems(v => [...v, { description: '', hours: 1, rate_per_hour: 0 }])
  const addPart = () => setPartsItems(v => [...v, { part_name: '', sku: '', quantity: 1, unit_cost: 0, unit_price: 0 }])

  const pickInventoryPart = (idx: number, partId: string) => {
    const inv = inventory.find(p => p.id === partId)
    setPartsItems(v => v.map((p, i) => i === idx ? {
      ...p, part_id: partId || null, part_name: inv?.name || p.part_name, sku: inv?.sku || '',
      unit_cost: inv?.cost_price ?? p.unit_cost, unit_price: inv?.retail_price ?? p.unit_price,
    } : p))
  }

  const handlePhotoUpload = async (file: File) => {
    if (!order) return
    setUploadingPhoto(true)
    const url = await uploadFile(file, 'work-orders')
    if (url) {
      const photo = await workOrdersApi.addPhoto(order.id, { url, category: 'Ingreso' })
      if (photo) setPhotos(v => [...v, photo])
    }
    setUploadingPhoto(false)
  }

  const save = async () => {
    setError('')
    if (!order && (!clientId || !vehicleId)) { setError('Selecciona cliente y vehículo'); return }
    setSaving(true)
    const payload = {
      mechanic_id: mechanicId || undefined,
      status, category, symptoms, technical_notes: technicalNotes,
      is_paid: isPaid, payment_method: paymentMethod,
      labor_items: laborItems.filter(l => l.description.trim()),
      parts_items: partsItems.filter(p => p.part_name.trim()),
    }
    const result = order
      ? await updateWorkOrder(order.id, payload)
      : await addWorkOrder({ workshop_vehicle_id: vehicleId, client_id: clientId, ...payload })
    setSaving(false)
    if (result) onSaved()
    else setError('No se pudo guardar la orden')
  }

  return (
    <AdminModal isOpen onClose={onClose} title={order ? `Orden ${order.order_number}` : 'Nueva orden de trabajo'} theme={theme} maxWidth={640}
      footer={<>
        {order && onOpenDocumentGenerator && (
          <button onClick={() => onOpenDocumentGenerator(order.id)} style={{ ...ghostBtnStyle(t), marginRight: 'auto' }}>Generar documento</button>
        )}
        <button onClick={onClose} style={ghostBtnStyle(t)}>Cancelar</button>
        <button onClick={save} disabled={saving} style={primaryBtnStyle(t, saving)}>{saving ? 'Guardando…' : 'Guardar orden'}</button>
      </>}>
      {error && <div style={{ color: t.danger, fontSize: 12.5 }}>{error}</div>}

      {/* Ficha de datos del vehículo/cliente — igual que tallerpro
          (WorkOrdersManager: "Datos del Vehículo" / "Datos del Cliente" al
          abrir el detalle de una orden ya creada, p.ej. tras convertir una
          cita). Antes esta info "importante" no se mostraba en absoluto al
          editar una orden existente — solo al crearla. */}
      {order && (() => {
        const client = clients.find(c => c.id === order.client_id)
        const vehicle = vehicles.find(v => v.id === order.workshop_vehicle_id)
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: 14, borderRadius: 12, background: t.subtleBorder }}>
            <div>
              <div style={{ ...labelStyle(t), marginBottom: 4 }}>Datos del vehículo</div>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: t.textPrimary }}>{vehicle ? `${vehicle.brand} ${vehicle.model}` : '—'}</div>
              {vehicle && <div style={{ fontSize: 12, fontWeight: 700, color: t.gold, marginTop: 2 }}>Placa: {vehicle.license_plate}</div>}
            </div>
            <div>
              <div style={{ ...labelStyle(t), marginBottom: 4 }}>Datos del cliente</div>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: t.textPrimary }}>{client?.name || '—'}</div>
              {client?.phone && <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>📞 {client.phone}</div>}
              {client?.email && <div style={{ fontSize: 12, color: t.textMuted }}>✉️ {client.email}</div>}
            </div>
          </div>
        )
      })()}

      {!order && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelStyle(t)}>Cliente</label>
            <select style={inputStyle(t)} value={clientId} onChange={e => { setClientId(e.target.value); setVehicleId('') }}>
              <option value="">Selecciona…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle(t)}>Vehículo</label>
            <select style={inputStyle(t)} value={vehicleId} onChange={e => setVehicleId(e.target.value)} disabled={!clientId}>
              <option value="">Selecciona…</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.license_plate} — {v.brand} {v.model}</option>)}
            </select>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={labelStyle(t)}>Estado</label>
          <select style={inputStyle(t)} value={status} onChange={e => setStatus(e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle(t)}>Mecánico asignado</label>
          <select style={inputStyle(t)} value={mechanicId} onChange={e => setMechanicId(e.target.value)}>
            <option value="">Sin asignar</option>
            {mechanics.filter(m => m.active).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label style={labelStyle(t)}>Categoría</label>
        <input style={inputStyle(t)} list="service-categories" value={category} onChange={e => setCategory(e.target.value)} placeholder="Mantenimiento Preventivo, Sistema de Frenos…" />
        <datalist id="service-categories">{SERVICE_CATEGORIES.map(c => <option key={c} value={c} />)}</datalist>
      </div>
      <div><label style={labelStyle(t)}>Síntomas / falla reportada</label><textarea rows={2} style={{ ...inputStyle(t), resize: 'vertical' }} value={symptoms} onChange={e => setSymptoms(e.target.value)} /></div>
      <div><label style={labelStyle(t)}>Notas técnicas</label><textarea rows={2} style={{ ...inputStyle(t), resize: 'vertical' }} value={technicalNotes} onChange={e => setTechnicalNotes(e.target.value)} /></div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ ...labelStyle(t), marginBottom: 0 }}>Mano de obra</label>
          <button onClick={addLabor} style={{ ...ghostBtnStyle(t), padding: '5px 12px', fontSize: 11.5 }}>+ Agregar</button>
        </div>
        {laborItems.map((l, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px 24px', gap: 8, marginBottom: 6, alignItems: 'center' }}>
            <input style={inputStyle(t)} placeholder="Descripción" value={l.description} onChange={e => setLaborItems(v => v.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))} />
            <input type="number" style={inputStyle(t)} placeholder="Hrs" value={l.hours} onChange={e => setLaborItems(v => v.map((x, idx) => idx === i ? { ...x, hours: Number(e.target.value) } : x))} />
            <input type="number" style={inputStyle(t)} placeholder="$/hr" value={l.rate_per_hour} onChange={e => setLaborItems(v => v.map((x, idx) => idx === i ? { ...x, rate_per_hour: Number(e.target.value) } : x))} />
            <button onClick={() => setLaborItems(v => v.filter((_, idx) => idx !== i))} style={{ background: 'transparent', border: 'none', color: t.danger, cursor: 'pointer' }}>×</button>
          </div>
        ))}
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ ...labelStyle(t), marginBottom: 0 }}>Repuestos usados</label>
          <button onClick={addPart} style={{ ...ghostBtnStyle(t), padding: '5px 12px', fontSize: 11.5 }}>+ Agregar</button>
        </div>
        {partsItems.map((p, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 55px 80px 24px', gap: 8, marginBottom: 6, alignItems: 'center' }}>
            <select style={inputStyle(t)} value={p.part_id || ''} onChange={e => pickInventoryPart(i, e.target.value)}>
              <option value="">Repuesto libre…</option>
              {inventory.map(inv => <option key={inv.id} value={inv.id}>{inv.name} (stock {inv.stock})</option>)}
            </select>
            <input type="number" style={inputStyle(t)} placeholder="Cant" value={p.quantity} onChange={e => setPartsItems(v => v.map((x, idx) => idx === i ? { ...x, quantity: Number(e.target.value) } : x))} />
            <input type="number" style={inputStyle(t)} placeholder="$ venta" value={p.unit_price} onChange={e => setPartsItems(v => v.map((x, idx) => idx === i ? { ...x, unit_price: Number(e.target.value) } : x))} />
            <button onClick={() => setPartsItems(v => v.filter((_, idx) => idx !== i))} style={{ background: 'transparent', border: 'none', color: t.danger, cursor: 'pointer' }}>×</button>
          </div>
        ))}
        {!partsItems.every(p => p.part_id) && partsItems.some(p => !p.part_id) && (
          <div style={{ fontSize: 11, color: t.textMuted }}>Si no eliges un repuesto del inventario, escribe su nombre manualmente al guardar.</div>
        )}
      </div>

      {order && (
        <div>
          <label style={labelStyle(t)}>Evidencia fotográfica</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {photos.map(ph => <img key={ph.id} src={ph.url} alt={ph.caption} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: `1px solid ${t.subtleBorder}` }} />)}
          </div>
          <label style={{ ...ghostBtnStyle(t), display: 'inline-flex', cursor: uploadingPhoto ? 'default' : 'pointer', fontSize: 12 }}>
            {uploadingPhoto ? 'Subiendo…' : '+ Subir foto'}
            <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingPhoto} onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f) }} />
          </label>
        </div>
      )}

      <div style={{ padding: 14, borderRadius: 12, background: 'rgba(245,197,24,0.06)', border: `1px solid ${t.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: t.textMuted }}><span>Mano de obra + repuestos</span><span>{money(preTax)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: t.textMuted }}><span>IVA ({Number(workshop.tax_rate_percent)}%)</span><span>{money(tax)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, color: t.textPrimary, marginTop: 4 }}><span>Total estimado</span><span>{money(estTotal)}</span></div>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: t.textPrimary }}>
        <input type="checkbox" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} /> Pagada
      </label>
      {isPaid && (
        <select style={inputStyle(t)} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
          <option value="">Método de pago…</option>
          <option value="Efectivo">Efectivo</option>
          <option value="Tarjeta">Tarjeta</option>
          <option value="Transferencia">Transferencia</option>
        </select>
      )}
    </AdminModal>
  )
}
