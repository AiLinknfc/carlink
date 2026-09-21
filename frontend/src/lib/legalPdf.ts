import jsPDF from 'jspdf'
import { SUPPORT_PHONE_DISPLAY, SUPPORT_WHATSAPP_DISPLAY } from './checkout'
import type { DiagnosticCheck, DiagnosticReport } from './diagnostics'
import {
  LEGAL_ADDRESS, LEGAL_DOCS, LEGAL_EMAIL, LEGAL_ORDER, LEGAL_UPDATED, LEGAL_VERSION,
  type LegalDoc, type LegalTabId,
} from './legalContent'

/* PDF del expediente legal. Lee el mismo contenido que el modal (legalContent.ts) y pagina
   de verdad: encabezado/pie en cada hoja, salto de página antes de que un bloque se corte
   con el pie, y numeración "Página X de Y". Las fuentes estándar de jsPDF solo cubren
   Latin-1, así que se normalizan los signos tipográficos que quedarían como basura. */

const GOLD = [245, 197, 24] as const
const DARK = [20, 20, 20] as const
const MUTED = [120, 120, 120] as const
const BODY = [55, 55, 55] as const

const clean = (s: string) =>
  s.replace(/[—–]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, '...')

interface Meta { plate: string; city: string }

function build(meta: Meta, tabs: LegalTabId[], title: string): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  const margin = 20
  const cw = w - margin * 2
  const top = 24 // debajo del encabezado corrido
  const bottom = h - 22 // encima del pie
  let y = 0

  const header = (first: boolean) => {
    if (first) {
      doc.setFillColor(...DARK); doc.rect(0, 0, w, 40, 'F')
      doc.setFillColor(...GOLD); doc.rect(0, 40, w, 1.2, 'F')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(255, 255, 255)
      doc.text('CARLINK', margin, 17)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED)
      doc.text(clean(title.toUpperCase()), margin, 24)
      doc.setFontSize(8)
      const who = meta.plate ? `Placa: ${meta.plate}${meta.city ? '  |  Ciudad: ' + meta.city : ''}  |  ` : ''
      doc.text(clean(`${who}Version ${LEGAL_VERSION}  |  Actualizado: ${LEGAL_UPDATED}  |  Generado: ${new Date().toLocaleDateString('es-CO')}`), margin, 31)
      doc.setTextColor(...GOLD); doc.setFontSize(7)
      doc.text('carlink.com.co', w - margin, 17, { align: 'right' })
      y = 52
    } else {
      doc.setFillColor(...DARK); doc.rect(0, 0, w, 12, 'F')
      doc.setFillColor(...GOLD); doc.rect(0, 12, w, 0.6, 'F')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255)
      doc.text('CARLINK', margin, 8)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...MUTED)
      doc.text(clean(title), w - margin, 8, { align: 'right' })
      y = top
    }
  }

  const ensure = (need: number) => {
    if (y + need > bottom) { doc.addPage(); header(false) }
  }

  const write = (text: string, opts: { size?: number; bold?: boolean; color?: readonly [number, number, number]; indent?: number; gap?: number }) => {
    const { size = 9, bold = false, color = BODY, indent = 0, gap = 2.2 } = opts
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(...color)
    const lh = size * 0.47
    const lines = doc.splitTextToSize(clean(text), cw - indent) as string[]
    for (const line of lines) {
      ensure(lh)
      doc.text(line, margin + indent, y)
      y += lh
    }
    y += gap
  }

  const docTitle = (d: LegalDoc) => {
    ensure(30)
    doc.setFillColor(...GOLD); doc.rect(margin, y - 4, 2.5, 12, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12.5); doc.setTextColor(...DARK)
    const tl = doc.splitTextToSize(clean(d.title.toUpperCase()), cw - 6) as string[]
    doc.text(tl, margin + 6, y + 2)
    y += tl.length * 5.5 + 6
    write(d.law, { size: 7.5, color: MUTED, gap: 3 })
    write(d.intro.text, { size: 9, gap: 5 })
  }

  header(true)

  tabs.forEach((id, i) => {
    const d = LEGAL_DOCS[id]
    if (i > 0) { doc.addPage(); header(false) }
    docTitle(d)
    for (const s of d.sections) {
      ensure(18)
      write(s.title, { size: 10, bold: true, color: DARK, gap: 1.8 })
      s.paras?.forEach(p => write(p, { gap: 2 }))
      s.items?.forEach(it => {
        // Viñeta manual: jsPDF no dibuja "•" de forma fiable en helvetica estándar.
        ensure(5)
        doc.setFillColor(...GOLD); doc.circle(margin + 2, y - 1.1, 0.6, 'F')
        write(it, { indent: 5, gap: 1.4 })
      })
      if (s.note) {
        y += 0.8
        write(s.note, { size: 8.5, bold: true, color: DARK, indent: 0, gap: 2 })
      }
      y += 3.5
    }
  })

  // Contacto final
  ensure(24)
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.4); doc.line(margin, y, w - margin, y)
  y += 6
  write('Contacto y ejercicio de derechos', { size: 10, bold: true, color: DARK, gap: 1.8 })
  write(`CarLink S.A.S. - ${LEGAL_ADDRESS}. Correo: ${LEGAL_EMAIL}. WhatsApp: ${SUPPORT_WHATSAPP_DISPLAY}. Telefono: ${SUPPORT_PHONE_DISPLAY}. Autoridad de protección de datos y del consumidor: Superintendencia de Industria y Comercio (sic.gov.co).`, { size: 8.5, gap: 2 })

  // Pie y numeración en todas las hojas
  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    doc.setFillColor(...DARK); doc.rect(0, h - 14, w, 14, 'F')
    doc.setFillColor(...GOLD); doc.rect(0, h - 14, w, 0.5, 'F')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(180, 180, 180)
    doc.text(clean(`CarLink S.A.S.  |  Bogota D.C., Colombia  |  ${LEGAL_EMAIL}  |  ${SUPPORT_WHATSAPP_DISPLAY}`), margin, h - 7)
    doc.setTextColor(...GOLD)
    doc.text(`Pagina ${p} de ${total}`, w - margin, h - 7, { align: 'right' })
  }
  return doc
}

/** Documento completo: privacidad + garantía + uso/planes/espacio, o solo las pestañas pedidas. */
export function downloadLegalPdf(meta: Meta, tabs: LegalTabId[] = LEGAL_ORDER) {
  const single = tabs.length === 1
  const title = single ? LEGAL_DOCS[tabs[0]].tabLabel : 'Expediente legal completo'
  const doc = build(meta, tabs, title)
  const suffix = single ? tabs[0] : 'expediente'
  doc.save(`CarLink_${suffix}_${meta.plate || 'general'}.pdf`)
}

/** Reporte de autodiagnóstico para adjuntar a un ticket de soporte (datos reales, ver lib/diagnostics.ts). */
export function downloadDiagnosticPdf(r: DiagnosticReport) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  const margin = 20
  const cw = w - margin * 2
  const bottom = h - 22
  let y = 0

  const header = (first: boolean) => {
    if (first) {
      doc.setFillColor(...DARK); doc.rect(0, 0, w, 40, 'F')
      doc.setFillColor(...GOLD); doc.rect(0, 40, w, 1.2, 'F')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(255, 255, 255)
      doc.text('CARLINK', margin, 17)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED)
      doc.text('REPORTE DE AUTODIAGNOSTICO PARA SOPORTE', margin, 24)
      doc.setFontSize(8)
      doc.text(clean(`ID: ${r.id}  |  Generado: ${new Date(r.generatedAt).toLocaleString('es-CO')}`), margin, 31)
      y = 52
    } else {
      doc.setFillColor(...DARK); doc.rect(0, 0, w, 12, 'F')
      doc.setFillColor(...GOLD); doc.rect(0, 12, w, 0.6, 'F')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255)
      doc.text('CARLINK', margin, 8)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...MUTED)
      doc.text(clean(`Autodiagnostico ${r.id}`), w - margin, 8, { align: 'right' })
      y = 24
    }
  }
  const ensure = (need: number) => { if (y + need > bottom) { doc.addPage(); header(false) } }
  const write = (text: string, size: number, bold: boolean, color: readonly [number, number, number], x = margin, width = cw, gap = 2) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(...color)
    const lines = doc.splitTextToSize(clean(text), width) as string[]
    const lh = size * 0.47
    for (const ln of lines) { ensure(lh); doc.text(ln, x, y); y += lh }
    y += gap
  }
  const STATE_COLOR: Record<string, readonly [number, number, number]> = { ok: [46, 160, 90], warn: [214, 120, 30], fail: [200, 50, 70], info: [110, 110, 110] }
  const STATE_LABEL: Record<string, string> = { ok: 'OK', warn: 'REVISAR', fail: 'FALLA', info: 'INFO' }
  const section = (title: string, checks: DiagnosticCheck[]) => {
    ensure(20)
    write(title, 10, true, DARK, margin, cw, 1.5)
    y += 0.5; doc.setDrawColor(...GOLD); doc.setLineWidth(0.3); doc.line(margin, y, w - margin, y); y += 5
    for (const c of checks) {
      ensure(7)
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...DARK)
      doc.text(clean(c.label), margin, y)
      doc.setTextColor(...STATE_COLOR[c.state]); doc.text(STATE_LABEL[c.state], w - margin, y, { align: 'right' })
      y += 4
      write(c.value, 8.5, false, BODY, margin + 2, cw - 4, 2.2)
    }
    y += 3
  }

  header(true)

  // Resumen
  doc.setFillColor(245, 243, 236); doc.roundedRect(margin, y - 4, cw, 16, 2, 2, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...DARK)
  doc.text(clean(`Resultado: ${r.summary.ok} en orden  |  ${r.summary.warn} por revisar  |  ${r.summary.fail} con falla`), margin + 4, y + 2)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED)
  doc.text(clean(`Pagina: ${r.url}`), margin + 4, y + 8)
  y += 20

  write('Contexto', 10, true, DARK, margin, cw, 1.5)
  write(`Placa: ${r.plate || '(no indicada)'}   |   Ciudad: ${r.city || '(no indicada)'}`, 9, false, BODY, margin, cw, 5)

  section('Servicio de CarLink', r.checks.service)
  section('Conexion', r.checks.connection)
  section('Sesion', r.checks.session)
  section('NFC', r.checks.nfc)
  section('Dispositivo', r.checks.device)

  ensure(24)
  write('Que hacer ahora', 10, true, DARK, margin, cw, 1.5)
  for (const hint of r.hints) write(`- ${hint}`, 9, false, BODY, margin + 2, cw - 4, 1.5)
  y += 3
  write(`Adjunta este archivo a tu ticket y menciona el ID ${r.id}. Contacto: ${LEGAL_EMAIL}, WhatsApp ${SUPPORT_WHATSAPP_DISPLAY} o telefono ${SUPPORT_PHONE_DISPLAY}.`, 9, false, BODY, margin, cw, 3)
  write('Privacidad: este reporte se genero en tu dispositivo y no se envio a CarLink. No incluye contrasenas, tokens ni documentos; tu correo aparece enmascarado.', 7.5, false, MUTED, margin, cw, 0)

  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    doc.setFillColor(...DARK); doc.rect(0, h - 14, w, 14, 'F')
    doc.setFillColor(...GOLD); doc.rect(0, h - 14, w, 0.5, 'F')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(180, 180, 180)
    doc.text(clean(`CarLink S.A.S.  |  ${LEGAL_EMAIL}  |  ${SUPPORT_WHATSAPP_DISPLAY}`), margin, h - 7)
    doc.setTextColor(...GOLD)
    doc.text(`Pagina ${p} de ${total}`, w - margin, h - 7, { align: 'right' })
  }
  doc.save(`CarLink_${r.id}.pdf`)
}
