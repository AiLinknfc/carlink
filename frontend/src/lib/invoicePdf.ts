/* PDF real de una factura/certificado emitido por un taller — usado tanto
   del lado taller (DocumentosModule.tsx) como del lado persona
   (DocumentosTab.tsx, sección "Facturas"), así que vive acá compartido en
   vez de duplicarse. Misma técnica que ya usaba DiagnosticoTab.tsx para el
   certificado CDA (html2canvas rasteriza una plantilla HTML), pero
   empotrada en una página A4 con jsPDF para que el archivo sea un .pdf de
   verdad, no solo una imagen. docs/PLAN_FACTURACION_AUTOMATICA.md. */

export interface InvoicePdfColumn {
  label: string
  primary: string
  secondary?: string
}

export interface InvoicePdfOptions {
  docNumber: string
  docType: string
  issueDate: string
  amount: number | null
  details: string
  issuerName: string
  issuerSubtitle?: string
  leftColumn: InvoicePdfColumn
  rightColumn: InvoicePdfColumn
  footerNote: string
  fileName: string
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString('es-CO')}`
}

export async function downloadInvoicePdf(opts: InvoicePdfOptions) {
  const template = document.createElement('div')
  template.style.cssText = 'position:fixed;left:-9999px;top:0;width:780px;padding:48px;background:#fff;color:#111;font-family:Arial,sans-serif;'
  template.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #F5C518;padding-bottom:20px;margin-bottom:24px;">
      <div>
        <div style="font-size:22px;font-weight:800;">${escapeHtml(opts.issuerName)}</div>
        ${opts.issuerSubtitle ? `<div style="font-size:12px;color:#666;margin-top:2px;">${escapeHtml(opts.issuerSubtitle)}</div>` : ''}
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#999;">${escapeHtml(opts.docType)}</div>
        <div style="font-size:18px;font-weight:800;color:#111;">${escapeHtml(opts.docNumber)}</div>
        <div style="font-size:12px;color:#666;">${new Date(opts.issueDate).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px;">
      <div>
        <div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#999;margin-bottom:4px;">${escapeHtml(opts.leftColumn.label)}</div>
        <div style="font-size:14px;font-weight:700;">${escapeHtml(opts.leftColumn.primary || '—')}</div>
        ${opts.leftColumn.secondary ? `<div style="font-size:12px;color:#666;">${escapeHtml(opts.leftColumn.secondary)}</div>` : ''}
      </div>
      <div>
        <div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#999;margin-bottom:4px;">${escapeHtml(opts.rightColumn.label)}</div>
        <div style="font-size:14px;font-weight:700;">${escapeHtml(opts.rightColumn.primary || '—')}</div>
        ${opts.rightColumn.secondary ? `<div style="font-size:12px;color:#666;">${escapeHtml(opts.rightColumn.secondary)}</div>` : ''}
      </div>
    </div>
    ${opts.details ? `<div style="margin-bottom:28px;"><div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#999;margin-bottom:6px;">Detalle</div><div style="font-size:13px;line-height:1.6;color:#333;">${escapeHtml(opts.details)}</div></div>` : ''}
    <div style="border-top:2px solid #111;padding-top:16px;display:flex;justify-content:flex-end;">
      <div style="text-align:right;">
        <div style="font-size:11px;color:#666;">Total</div>
        <div style="font-size:26px;font-weight:800;">${opts.amount != null ? money(opts.amount) : '—'}</div>
      </div>
    </div>
    <div style="margin-top:40px;font-size:10.5px;color:#999;text-align:center;">${escapeHtml(opts.footerNote)}</div>
  `
  document.body.appendChild(template)
  try {
    const html2canvas = (await import('html2canvas')).default
    const { default: jsPDF } = await import('jspdf')
    const canvas = await html2canvas(template, { backgroundColor: '#ffffff', scale: 2 })
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const imgH = (canvas.height * pageW) / canvas.width
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, imgH)
    pdf.save(opts.fileName)
  } finally {
    document.body.removeChild(template)
  }
}
