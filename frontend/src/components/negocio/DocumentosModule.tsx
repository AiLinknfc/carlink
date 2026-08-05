'use client'

import { useState } from 'react'
import { useWorkshopDocuments, useWorkOrders } from '@/lib/hooks'
import type { Workshop } from '@/lib/types'
import AdminModal from '@/components/admin/AdminModal'
import { negocioTokens, inputStyle, labelStyle, primaryBtnStyle, ghostBtnStyle, emptyState, money } from './shared'

const DOC_TYPES = ['Factura de compra', 'Garantía', 'Póliza de seguro', 'Nómina / Recibo de pago', 'Contrato', 'Certificado de Mantenimiento / CDA', 'Otro certificado']

export default function DocumentosModule({ theme, workshop }: { theme: 'light' | 'dark'; workshop: Workshop }) {
  const t = negocioTokens(theme)
  const { documents, loading, createDocument } = useWorkshopDocuments()
  const [modal, setModal] = useState(false)

  return (
    <div style={{ animation: 'sectionIn .4s both' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => setModal(true)} style={primaryBtnStyle(t)}>+ Emitir documento</button>
      </div>

      {!loading && documents.length === 0 && <div style={emptyState(t, 'Sin documentos emitidos')} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {documents.map(d => (
          <div key={d.id} style={{
            display: 'grid', gridTemplateColumns: '120px minmax(160px,1fr) 130px 100px', gap: 14, alignItems: 'center',
            padding: '13px 18px', borderRadius: 12, background: t.cardBg, border: `1px solid ${t.subtleBorder}`,
          }}>
            <div style={{ fontWeight: 800, fontSize: 12.5, color: t.gold }}>{d.doc_number}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary }}>{d.doc_type}</div>
              <div style={{ fontSize: 11.5, color: t.textMuted }}>{d.client_name} · {new Date(d.issue_date).toLocaleDateString()}</div>
            </div>
            <div style={{ fontSize: 13, color: t.textPrimary }}>{d.amount != null ? money(d.amount) : '—'}</div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 9px', borderRadius: 999, background: 'rgba(46,204,113,0.14)', color: t.success }}>{d.status.toUpperCase()}</span>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <DocumentFormModal t={t} theme={theme} workshop={workshop} onClose={() => setModal(false)} onCreate={async data => { await createDocument(data); setModal(false) }} />
      )}
    </div>
  )
}

function DocumentFormModal({ t, theme, workshop, onClose, onCreate }: {
  t: ReturnType<typeof negocioTokens>
  theme: 'light' | 'dark'
  workshop: Workshop
  onClose: () => void
  onCreate: (data: any) => void
}) {
  const { workOrders } = useWorkOrders()
  const [docType, setDocType] = useState(DOC_TYPES[0])
  const [clientName, setClientName] = useState('')
  const [clientTaxId, setClientTaxId] = useState('')
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [workOrderId, setWorkOrderId] = useState('')
  const [amount, setAmount] = useState('')
  const [validityMonths, setValidityMonths] = useState('')
  const [details, setDetails] = useState('')
  const [saving, setSaving] = useState(false)

  const applyOrder = (id: string) => {
    setWorkOrderId(id)
    const o = workOrders.find(w => w.id === id)
    if (o) { setAmount(String(o.final_total)); setVehiclePlate(o.workshop_vehicle_id) }
  }

  const save = async () => {
    if (!clientName.trim()) return
    setSaving(true)
    await onCreate({
      doc_type: docType, client_name: clientName, client_tax_id: clientTaxId, vehicle_plate: vehiclePlate,
      work_order_id: workOrderId || undefined, amount: amount ? Number(amount) : undefined,
      validity_months: validityMonths ? Number(validityMonths) : undefined, details, issued_by: workshop.name,
    })
    setSaving(false)
  }

  return (
    <AdminModal isOpen onClose={onClose} title="Emitir documento" theme={theme} maxWidth={460}
      footer={<>
        <button onClick={onClose} style={ghostBtnStyle(t)}>Cancelar</button>
        <button onClick={save} disabled={saving || !clientName.trim()} style={primaryBtnStyle(t, saving || !clientName.trim())}>{saving ? 'Emitiendo…' : 'Emitir'}</button>
      </>}>
      <div>
        <label style={labelStyle(t)}>Tipo de documento</label>
        <select style={inputStyle(t)} value={docType} onChange={e => setDocType(e.target.value)}>
          {DOC_TYPES.map(dt => <option key={dt} value={dt}>{dt}</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div><label style={labelStyle(t)}>Cliente</label><input style={inputStyle(t)} value={clientName} onChange={e => setClientName(e.target.value)} /></div>
        <div><label style={labelStyle(t)}>NIT/Documento del cliente</label><input style={inputStyle(t)} value={clientTaxId} onChange={e => setClientTaxId(e.target.value)} /></div>
      </div>
      <div>
        <label style={labelStyle(t)}>Orden de trabajo relacionada (opcional)</label>
        <select style={inputStyle(t)} value={workOrderId} onChange={e => applyOrder(e.target.value)}>
          <option value="">Ninguna</option>
          {workOrders.map(o => <option key={o.id} value={o.id}>{o.order_number} — {money(o.final_total)}</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div><label style={labelStyle(t)}>Monto</label><input type="number" style={inputStyle(t)} value={amount} onChange={e => setAmount(e.target.value)} /></div>
        <div><label style={labelStyle(t)}>Vigencia (meses)</label><input type="number" style={inputStyle(t)} value={validityMonths} onChange={e => setValidityMonths(e.target.value)} /></div>
      </div>
      <div><label style={labelStyle(t)}>Detalles</label><textarea rows={3} style={{ ...inputStyle(t), resize: 'vertical' }} value={details} onChange={e => setDetails(e.target.value)} /></div>
    </AdminModal>
  )
}
