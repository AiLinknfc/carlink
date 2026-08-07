'use client'

import { useEffect, useState } from 'react'
import { useWorkshopDocuments, useWorkOrders, useWorkshopVehicles } from '@/lib/hooks'
import type { Workshop, WorkshopDocument } from '@/lib/types'
import { downloadInvoicePdf, type InvoicePdfOptions } from '@/lib/invoicePdf'
import AdminModal from '@/components/admin/AdminModal'
import InvoiceDocumentPreview from './InvoiceDocumentPreview'
import { negocioTokens, inputStyle, labelStyle, primaryBtnStyle, ghostBtnStyle, emptyState, money } from './shared'

/* PDF real (no solo la imagen que ya usa DiagnosticoTab.tsx para el
   certificado CDA) — plantilla compartida con la vista del cliente
   (lib/invoicePdf.ts) para no duplicarla. docs/PLAN_FACTURACION_AUTOMATICA.md
   Paso 1 ("el taller lo descarga en PDF"). */
function downloadDocumentPdf(doc: WorkshopDocument, workshop: Workshop) {
  return downloadInvoicePdf({
    docNumber: doc.doc_number, docType: doc.doc_type, issueDate: doc.issue_date,
    amount: doc.amount, details: doc.details,
    issuerName: workshop.name,
    issuerSubtitle: [workshop.address, workshop.city].filter(Boolean).join(' · ') || undefined,
    leftColumn: { label: 'Cliente', primary: doc.client_name, secondary: doc.client_tax_id || undefined },
    rightColumn: { label: 'Vehículo', primary: `${doc.vehicle_plate || ''} ${doc.vehicle_model || ''}`.trim(), secondary: doc.mechanic_name ? `Atendido por ${doc.mechanic_name}` : undefined },
    footerNote: `Emitido por ${doc.issued_by} · Generado con CarLink`,
    fileName: `${doc.doc_type.toLowerCase().replace(/\s+/g, '-')}-${doc.doc_number}.pdf`,
  })
}

const DOC_TYPES = ['Factura de compra', 'Garantía', 'Póliza de seguro', 'Nómina / Recibo de pago', 'Contrato', 'Certificado de Mantenimiento / CDA', 'Otro certificado']

// Selector de tipo como grid de cards (no <select>) — igual que tallerpro
// (DocumentGeneratorModal: DOCUMENT_TYPES con desc + punto de color).
const DOC_TYPE_META: Record<string, { desc: string; color: string }> = {
  'Factura de compra': { desc: 'Comprobante de pago de servicios, repuestos e IVA.', color: '#2ecc71' },
  'Garantía': { desc: 'Respaldo técnico con cobertura en meses/kilometraje.', color: '#3aa0ff' },
  'Póliza de seguro': { desc: 'Comprobante de aseguramiento de custodia.', color: '#8b5cf6' },
  'Nómina / Recibo de pago': { desc: 'Comprobante de pago a mecánicos/personal.', color: '#ec4899' },
  'Contrato': { desc: 'Acuerdo de servicio entre taller y cliente.', color: '#06b6d4' },
  'Certificado de Mantenimiento / CDA': { desc: 'Certificado técnico de revisión/mantenimiento.', color: '#F5C518' },
  'Otro certificado': { desc: 'Cualquier otro documento emitido por el taller.', color: '#8f8a7a' },
}

// Plantilla de "Detalle" por tipo de documento — igual que tallerpro
// (DocumentGeneratorModal: un párrafo por tipo, interpolado con los datos
// reales del formulario, nunca datos inventados). Solo se aplica si el
// campo todavía está vacío, para no pisar lo que el taller ya escribió.
function buildDetailsTemplate(docType: string, opts: { clientName: string; vehiclePlate: string; issuerName: string; validityMonths: string }): string {
  const client = opts.clientName || '[cliente]'
  const plate = opts.vehiclePlate || '[placa]'
  switch (docType) {
    case 'Factura de compra':
      return `Comprobante de pago por mano de obra, repuestos e IVA correspondientes al servicio realizado al vehículo ${plate}.`
    case 'Garantía':
      return `Garantía de servicio y/o repuesto con cobertura de ${opts.validityMonths || '[meses]'} meses para el vehículo ${plate}.`
    case 'Póliza de seguro':
      return `Póliza de responsabilidad civil y custodia del vehículo ${plate} durante su estadía en las instalaciones del taller.`
    case 'Nómina / Recibo de pago':
      return `Comprobante de pago de honorarios y mano de obra para ${client}.`
    case 'Contrato':
      return `Contrato de prestación de servicios de mantenimiento automotriz entre ${opts.issuerName} y ${client}.`
    case 'Certificado de Mantenimiento / CDA':
      return `Certificado de mantenimiento técnico expedido por ${opts.issuerName} para el vehículo ${plate}, tras la revisión correspondiente.`
    default:
      return `Documento oficial expedido por ${opts.issuerName} a solicitud de ${client}.`
  }
}

export default function DocumentosModule({ theme, workshop, prefillOrderId }: {
  theme: 'light' | 'dark'; workshop: Workshop
  /** Abre el formulario ya con esta orden seleccionada — ver "Generar
   * documento" en OrdenesModule (docs/PLAN_PARIDAD_UI_TALLERPRO.md Fase B). */
  prefillOrderId?: string
}) {
  const t = negocioTokens(theme)
  const { documents, loading, createDocument } = useWorkshopDocuments()
  // Este módulo ya solo se monta al disparar el generador desde OrdenesModule
  // (con o sin orden preseleccionada) — nunca como tab propio — así que el
  // formulario de creación se abre siempre de inmediato, igual que tallerpro.
  const [modal, setModal] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const handleDownload = async (doc: WorkshopDocument) => {
    setDownloadingId(doc.id)
    try {
      await downloadDocumentPdf(doc, workshop)
    } finally {
      setDownloadingId(null)
    }
  }

  useEffect(() => {
    if (prefillOrderId) setModal(true)
  }, [prefillOrderId])

  return (
    <div style={{ animation: 'sectionIn .4s both' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => setModal(true)} style={primaryBtnStyle(t)}>+ Emitir documento</button>
      </div>

      {!loading && documents.length === 0 && <div style={emptyState(t, 'Sin documentos emitidos')} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {documents.map(d => (
          <div key={d.id} style={{
            display: 'grid', gridTemplateColumns: '120px minmax(160px,1fr) 130px 100px 40px', gap: 14, alignItems: 'center',
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
            <button onClick={() => handleDownload(d)} disabled={downloadingId === d.id} title="Descargar PDF"
              style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: downloadingId === d.id ? 'default' : 'pointer', padding: 4, justifySelf: 'end' }}>
              {downloadingId === d.id
                ? <div style={{ width: 15, height: 15, borderRadius: '50%', border: `2px solid ${t.subtleBorder}`, borderTopColor: t.gold, animation: 'spin .7s linear infinite' }} />
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>}
            </button>
          </div>
        ))}
      </div>

      {modal && (
        <DocumentFormModal t={t} theme={theme} workshop={workshop} initialWorkOrderId={prefillOrderId}
          onClose={() => setModal(false)} onCreate={createDocument} />
      )}
    </div>
  )
}

function DocumentFormModal({ t, theme, workshop, initialWorkOrderId, onClose, onCreate }: {
  t: ReturnType<typeof negocioTokens>
  theme: 'light' | 'dark'
  workshop: Workshop
  initialWorkOrderId?: string
  onClose: () => void
  onCreate: (data: any) => Promise<unknown>

}) {
  const { workOrders } = useWorkOrders()
  // Para resolver placa/modelo reales — antes `applyOrder` guardaba el UUID
  // de `workshop_vehicle_id` directo en `vehiclePlate` (bug preexistente:
  // ese campo nunca mostraba una placa de verdad, mostraba un UUID).
  const { vehicles } = useWorkshopVehicles()
  const [docType, setDocType] = useState(DOC_TYPES[0])
  const [clientName, setClientName] = useState('')
  const [clientTaxId, setClientTaxId] = useState('')
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [vehicleModel, setVehicleModel] = useState('')
  const [workOrderId, setWorkOrderId] = useState('')
  const [amount, setAmount] = useState('')
  const [validityMonths, setValidityMonths] = useState('')
  const [details, setDetails] = useState('')
  const [detailsTouched, setDetailsTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  // "1. Configurar datos" / "2. Vista previa e imprimir" — igual que
  // tallerpro (DocumentGeneratorModal: activeView 'form'|'preview').
  const [view, setView] = useState<'form' | 'preview'>('form')

  const applyOrder = (id: string) => {
    setWorkOrderId(id)
    const o = workOrders.find(w => w.id === id)
    if (!o) return
    setAmount(String(o.final_total))
    const v = vehicles.find(x => x.id === o.workshop_vehicle_id)
    if (v) { setVehiclePlate(v.license_plate); setVehicleModel(`${v.brand} ${v.model}`.trim()) }
  }

  // Aplica la orden con la que se abrió este modal apenas termine de cargar
  // la lista de órdenes/vehículos (una sola vez — no se re-aplica si el
  // usuario cambia el selector después).
  useEffect(() => {
    if (initialWorkOrderId && workOrders.length && vehicles.length && !workOrderId) applyOrder(initialWorkOrderId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialWorkOrderId, workOrders, vehicles])

  // Plantilla de detalle por tipo — solo mientras el taller no haya escrito
  // la suya (detailsTouched), igual criterio que tallerpro (se regenera al
  // cambiar de tipo hasta que el usuario edita el campo a mano).
  useEffect(() => {
    if (!detailsTouched) {
      setDetails(buildDetailsTemplate(docType, { clientName, vehiclePlate, issuerName: workshop.name, validityMonths }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docType, clientName, vehiclePlate, validityMonths])

  const save = async () => {
    if (!clientName.trim()) return
    setSaving(true)
    const result = await onCreate({
      doc_type: docType, client_name: clientName, client_tax_id: clientTaxId, vehicle_plate: vehiclePlate,
      vehicle_model: vehicleModel, work_order_id: workOrderId || undefined, amount: amount ? Number(amount) : undefined,
      validity_months: validityMonths ? Number(validityMonths) : undefined, details, issued_by: workshop.name,
    })
    setSaving(false)
    if (result) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
  }

  const previewOpts: InvoicePdfOptions = {
    docNumber: workOrderId ? workOrders.find(o => o.id === workOrderId)?.order_number || 'Por asignar' : 'Por asignar',
    docType, issueDate: new Date().toISOString(), amount: amount ? Number(amount) : null, details,
    issuerName: workshop.name,
    issuerSubtitle: [workshop.address, workshop.city].filter(Boolean).join(' · ') || undefined,
    leftColumn: { label: docType === 'Nómina / Recibo de pago' ? 'Mecánico / Receptor' : 'Cliente', primary: clientName, secondary: clientTaxId || undefined },
    rightColumn: { label: 'Vehículo', primary: `${vehiclePlate} ${vehicleModel}`.trim(), secondary: undefined },
    footerNote: `Emitido por ${workshop.name} · Generado con CarLink`,
    fileName: `${docType.toLowerCase().replace(/\s+/g, '-')}-preview.pdf`,
  }

  const [downloading, setDownloading] = useState(false)
  const handlePreviewDownload = async () => {
    setDownloading(true)
    try { await downloadInvoicePdf(previewOpts) } finally { setDownloading(false) }
  }
  const handleWhatsApp = () => {
    const msg = `${docType} ${previewOpts.docNumber !== 'Por asignar' ? `(${previewOpts.docNumber}) ` : ''}de ${workshop.name}${clientName ? ` para ${clientName}` : ''}${amount ? ` — ${money(Number(amount))}` : ''}.`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <AdminModal isOpen onClose={onClose} title="Emitir documento" theme={theme} maxWidth={900}
      footer={<>
        {saved && <span style={{ fontSize: 12.5, color: t.success, fontWeight: 700, marginRight: 'auto' }}>¡Emitido!</span>}
        <button onClick={onClose} style={ghostBtnStyle(t)}>Cerrar</button>
        <button onClick={save} disabled={saving || !clientName.trim()} style={primaryBtnStyle(t, saving || !clientName.trim())}>{saving ? 'Emitiendo…' : 'Emitir & Guardar'}</button>
      </>}>
      {/* Selector "1. Configurar datos" / "2. Vista previa e imprimir" */}
      <div style={{ display: 'flex', gap: 6, padding: 4, borderRadius: 12, background: t.subtleBorder, width: 'fit-content' }}>
        {(['form', 'preview'] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: '8px 16px', borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', border: 'none',
            background: view === v ? t.gold : 'transparent', color: view === v ? '#111' : t.textSecondary,
          }}>{v === 'form' ? '1. Configurar datos' : '2. Vista previa e imprimir'}</button>
        ))}
      </div>

      {view === 'form' ? (
        <>
          <div>
            <label style={labelStyle(t)}>Tipo de documento</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {DOC_TYPES.map(dt => {
                const meta = DOC_TYPE_META[dt]
                const active = docType === dt
                return (
                  <button key={dt} type="button" onClick={() => setDocType(dt)} style={{
                    textAlign: 'left', padding: '9px 12px', borderRadius: 12, cursor: 'pointer',
                    border: `1px solid ${active ? t.gold : t.subtleBorder}`,
                    background: active ? 'rgba(245,197,24,0.1)' : t.inputBg,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta?.color || t.textMuted, flex: '0 0 auto' }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, lineHeight: 1.2 }}>{dt}</span>
                    </div>
                    {meta && <div style={{ fontSize: 10.5, color: t.textMuted, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta.desc}</div>}
                  </button>
                )
              })}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={labelStyle(t)}>{docType === 'Nómina / Recibo de pago' ? 'Empleado / Mecánico' : 'Cliente'}</label><input style={inputStyle(t)} value={clientName} onChange={e => setClientName(e.target.value)} /></div>
            <div><label style={labelStyle(t)}>NIT/Documento</label><input style={inputStyle(t)} value={clientTaxId} onChange={e => setClientTaxId(e.target.value)} /></div>
          </div>
          <div>
            <label style={labelStyle(t)}>Orden de trabajo relacionada (opcional)</label>
            <select style={inputStyle(t)} value={workOrderId} onChange={e => applyOrder(e.target.value)}>
              <option value="">Ninguna</option>
              {workOrders.map(o => <option key={o.id} value={o.id}>{o.order_number} — {money(o.final_total)}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={labelStyle(t)}>Placa</label><input style={inputStyle(t)} value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value.toUpperCase())} /></div>
            <div><label style={labelStyle(t)}>Modelo / Marca</label><input style={inputStyle(t)} value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={labelStyle(t)}>Monto</label><input type="number" style={inputStyle(t)} value={amount} onChange={e => setAmount(e.target.value)} /></div>
            {docType === 'Garantía' && (
              <div><label style={labelStyle(t)}>Vigencia (meses)</label><input type="number" style={inputStyle(t)} value={validityMonths} onChange={e => setValidityMonths(e.target.value)} /></div>
            )}
          </div>
          <div><label style={labelStyle(t)}>Detalle</label><textarea rows={3} style={{ ...inputStyle(t), resize: 'vertical' }} value={details} onChange={e => { setDetails(e.target.value); setDetailsTouched(true) }} /></div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 12, borderRadius: 12, background: t.cardBg, border: `1px solid ${t.subtleBorder}` }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: t.textPrimary }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.success }} />
              Listo para imprimir/enviar
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleWhatsApp} style={{ ...ghostBtnStyle(t), padding: '8px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.12-2.9-6.98A9.82 9.82 0 0 0 12.05 2z" /></svg>
                WhatsApp
              </button>
              <button onClick={handlePreviewDownload} disabled={downloading} style={{ ...primaryBtnStyle(t, downloading), padding: '8px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                {downloading ? 'Generando…' : 'Imprimir / PDF'}
              </button>
            </div>
          </div>
          <InvoiceDocumentPreview opts={previewOpts} />
        </>
      )}
    </AdminModal>
  )
}
