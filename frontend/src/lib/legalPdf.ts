import jsPDF from 'jspdf'
import { SUPPORT_PHONE_DISPLAY, SUPPORT_WHATSAPP_DISPLAY } from './checkout'
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

/** Hoja de autodiagnóstico para adjuntar a un ticket de soporte. */
export function downloadDiagnosticPdf(meta: Meta) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const w = doc.internal.pageSize.getWidth()
  const margin = 20
  doc.setFillColor(...DARK); doc.rect(0, 0, w, 40, 'F')
  doc.setFillColor(...GOLD); doc.rect(0, 40, w, 1.2, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(255, 255, 255)
  doc.text('CARLINK', margin, 17)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED)
  doc.text('AUTODIAGNOSTICO PARA SOPORTE', margin, 24)
  doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, margin, 31)

  let y = 56
  const row = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...DARK)
    doc.text(label, margin, y)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...BODY)
    const lines = doc.splitTextToSize(clean(value), w - margin * 2) as string[]
    doc.text(lines, margin, y + 5)
    y += 5 + lines.length * 4.5 + 5
  }
  row('PLACA', meta.plate || '-')
  row('CIUDAD DE REGISTRO', meta.city || '-')
  row('CORREO DE SOPORTE', LEGAL_EMAIL)
  row('WHATSAPP', SUPPORT_WHATSAPP_DISPLAY)
  row('TELEFONO', SUPPORT_PHONE_DISPLAY)
  row('QUE ADJUNTAR', 'Describe que ocurre, adjunta capturas de pantalla y, si es un problema con el llavero, indica el modelo de tu telefono y si tiene la funcion NFC activada.')
  doc.save(`CarLink_soporte_${meta.plate || 'general'}.pdf`)
}
