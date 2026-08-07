'use client'

import type { InvoicePdfOptions } from '@/lib/invoicePdf'

/* "Hoja" de documento imprimible, en vivo — igual que la pestaña "2. Vista
   Previa / Imprimir" de tallerpro (DocumentGeneratorModal.tsx: SHEET OF
   PAPER). Antes CarLink solo generaba el PDF a ciegas (una plantilla fuera
   de pantalla); esto deja verlo mientras se completa el formulario, con el
   mismo layout — cabecera del taller, número de documento, banner de tipo
   con estado, grid de datos, detalle y total. Blanco fijo (no sigue el tema
   claro/oscuro de la app): es una hoja para imprimir/descargar, no una
   card de la interfaz. docs/PLAN_FACTURACION_AUTOMATICA.md — pedido del
   usuario, paridad con tallerpro. */
export default function InvoiceDocumentPreview({ opts, statusLabel = 'VIGENTE' }: { opts: InvoicePdfOptions; statusLabel?: string }) {
  return (
    <div style={{
      width: '100%', maxWidth: 560, margin: '0 auto', background: '#fff', color: '#111',
      borderRadius: 14, border: '1px solid rgba(17,17,17,0.12)', boxShadow: '0 20px 50px rgba(0,0,0,.25)',
      padding: 32, fontFamily: 'Arial, sans-serif', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, borderBottom: '3px solid #F5C518', paddingBottom: 18, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, background: '#111', color: '#F5C518', fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
            {opts.issuerName.charAt(0).toUpperCase()}
          </span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{opts.issuerName}</div>
            {opts.issuerSubtitle && <div style={{ fontSize: 11, color: '#666', marginTop: 1 }}>{opts.issuerSubtitle}</div>}
          </div>
        </div>
        <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
          <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#fff', background: '#111', padding: '3px 9px', borderRadius: '6px 6px 0 0' }}>
            Documento oficial
          </div>
          <div style={{ border: '1px solid #ddd', borderTop: 'none', borderRadius: '0 0 6px 6px', padding: '6px 10px', background: '#fafafa' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 800, color: '#111' }}>{opts.docNumber || '—'}</div>
            <div style={{ fontSize: 10, color: '#888' }}>{opts.issueDate ? new Date(opts.issueDate).toLocaleDateString('es-CO') : '—'}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: '#f7f6f2', borderLeft: '4px solid #F5C518', borderRadius: '0 10px 10px 0', padding: '10px 14px', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.02em' }}>{opts.docType || 'Documento'}</div>
          <div style={{ fontSize: 10.5, color: '#666' }}>Respaldado por {opts.issuerName}</div>
        </div>
        <span style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', padding: '4px 10px', borderRadius: 999, background: 'rgba(46,204,113,0.14)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.3)', whiteSpace: 'nowrap' }}>
          {statusLabel}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: '#f7f6f2', borderRadius: 10, padding: 14, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#999' }}>{opts.leftColumn.label}</div>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2 }}>{opts.leftColumn.primary || '—'}</div>
          {opts.leftColumn.secondary && <div style={{ fontSize: 11, color: '#666' }}>{opts.leftColumn.secondary}</div>}
        </div>
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#999' }}>{opts.rightColumn.label}</div>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2 }}>{opts.rightColumn.primary || '—'}</div>
          {opts.rightColumn.secondary && <div style={{ fontSize: 11, color: '#666' }}>{opts.rightColumn.secondary}</div>}
        </div>
      </div>

      {opts.details && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#999', marginBottom: 5 }}>Detalle</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.6, color: '#333' }}>{opts.details}</div>
        </div>
      )}

      <div style={{ borderTop: '2px solid #111', paddingTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10.5, color: '#666' }}>Total</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{opts.amount != null ? `$${Math.round(opts.amount).toLocaleString('es-CO')}` : '—'}</div>
        </div>
      </div>

      <div style={{ marginTop: 28, fontSize: 10, color: '#999', textAlign: 'center' }}>{opts.footerNote}</div>
    </div>
  )
}
