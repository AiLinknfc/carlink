'use client'

import { useMemo, useState } from 'react'
import { useWorkOrders, useWorkshopClients, useWorkshopVehicles, useWorkshopMechanics, useWorkshopInventory, useUpload } from '@/lib/hooks'
import { workOrdersApi } from '@/lib/api'
import type { WorkOrder, WorkOrderLaborItemIn, WorkOrderPartIn, WorkOrderStatus } from '@/lib/types'
import type { Workshop } from '@/lib/types'
import AdminModal from '@/components/admin/AdminModal'
import { negocioTokens, inputStyle, labelStyle, primaryBtnStyle, ghostBtnStyle, emptyState, money } from './shared'

const STATUSES: (WorkOrderStatus | string)[] = ['Pendiente', 'En Proceso', 'Diagnosticado', 'Listo para Entrega', 'Entregado', 'Cancelado']

const STATUS_COLOR: Record<string, string> = {
  'Pendiente': '#8f8a7a', 'En Proceso': '#F5C518', 'Diagnosticado': '#3aa0ff',
  'Listo para Entrega': '#ff8a3d', 'Entregado': '#2ecc71', 'Cancelado': '#ff4d6a',
}

export default function OrdenesModule({ theme, workshop }: { theme: 'light' | 'dark'; workshop: Workshop }) {
  const t = negocioTokens(theme)
  const [statusFilter, setStatusFilter] = useState('')
  const { workOrders, loading, updateWorkOrderStatus, reload } = useWorkOrders({ status: statusFilter || undefined })
  const [modal, setModal] = useState<WorkOrder | null | 'new'>(null)

  return (
    <div style={{ animation: 'sectionIn .4s both' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {['', ...STATUSES].map(s => (
          <button key={s || 'todas'} onClick={() => setStatusFilter(s)} style={{
            padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            border: `1px solid ${statusFilter === s ? t.gold : t.subtleBorder}`,
            background: statusFilter === s ? 'rgba(245,197,24,0.14)' : 'transparent',
            color: statusFilter === s ? t.gold : t.textMuted,
          }}>{s || 'Todas'}</button>
        ))}
        <button onClick={() => setModal('new')} style={{ ...primaryBtnStyle(t), marginLeft: 'auto' }}>+ Nueva orden</button>
      </div>

      {!loading && workOrders.length === 0 && <div style={emptyState(t, 'Sin órdenes de trabajo')} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {workOrders.map(o => (
          <div key={o.id} onClick={() => setModal(o)} style={{
            display: 'grid', gridTemplateColumns: '100px minmax(140px,1fr) 140px 110px 100px', gap: 14, alignItems: 'center',
            padding: '14px 18px', borderRadius: 12, background: t.cardBg, border: `1px solid ${t.subtleBorder}`, cursor: 'pointer',
          }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: t.gold }}>{o.order_number}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.symptoms || o.category || '—'}</div>
              <div style={{ fontSize: 11.5, color: t.textMuted }}>{new Date(o.entry_date).toLocaleDateString()}</div>
            </div>
            <div>
              <select
                value={o.status}
                onClick={e => e.stopPropagation()}
                onChange={e => updateWorkOrderStatus(o.id, e.target.value)}
                style={{ fontSize: 11.5, fontWeight: 700, padding: '5px 8px', borderRadius: 8, border: `1px solid ${STATUS_COLOR[o.status] || t.subtleBorder}`, background: 'transparent', color: STATUS_COLOR[o.status] || t.textMuted }}
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>{money(o.final_total)}</div>
            <div style={{ textAlign: 'right' }}>
              {o.is_paid
                ? <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 9px', borderRadius: 999, background: 'rgba(46,204,113,0.14)', color: t.success }}>PAGADA</span>
                : <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 9px', borderRadius: 999, background: 'rgba(255,138,61,0.12)', color: t.warning }}>PENDIENTE</span>}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <WorkOrderFormModal
          t={t} theme={theme} workshop={workshop} order={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { reload(); setModal(null) }}
        />
      )}
    </div>
  )
}

function WorkOrderFormModal({ t, theme, workshop, order, onClose, onSaved }: {
  t: ReturnType<typeof negocioTokens>
  theme: 'light' | 'dark'
  workshop: Workshop
  order: WorkOrder | null
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
        <button onClick={onClose} style={ghostBtnStyle(t)}>Cancelar</button>
        <button onClick={save} disabled={saving} style={primaryBtnStyle(t, saving)}>{saving ? 'Guardando…' : 'Guardar orden'}</button>
      </>}>
      {error && <div style={{ color: t.danger, fontSize: 12.5 }}>{error}</div>}

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

      <div><label style={labelStyle(t)}>Categoría</label><input style={inputStyle(t)} value={category} onChange={e => setCategory(e.target.value)} placeholder="Mantenimiento Preventivo, Sistema de Frenos…" /></div>
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
