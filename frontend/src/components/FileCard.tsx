'use client'

/* Card compartida por Documentos y Certificados: una sola definición garantiza
   que ambas secciones tengan exactamente la misma estructura y dimensiones. */

import { isPdf } from '@/lib/upload'

export function getStatusColor(status: string): string {
  switch (status) {
    case 'vigente': return '#2ecc71'
    case 'por_vencer': return '#ff8a3d'
    case 'vencido': return '#ff4d6a'
    default: return 'var(--text-3)'
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'vigente': return 'Vigente'
    case 'por_vencer': return 'Por vencer'
    case 'vencido': return 'Vencido'
    default: return 'Pendiente'
  }
}

/* Botón de icono del encabezado de cada card. */
const iconBtn: React.CSSProperties = {
  width: 27, height: 27, borderRadius: 8, flex: '0 0 auto',
  border: '1px solid var(--border-2)', background: 'var(--surface-2)',
  color: 'var(--text-2)', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', transition: 'all .18s',
}

/* Alto fijo de la card. Todo lo demás dentro es de alto fijo salvo el slot del
   archivo, que lleva flex:1 — así el contenido se adapta (título de 1 o 2 líneas,
   con archivo o sin él) sin que la card cambie nunca de tamaño. */
const CARD_H = 250

/* Con descargar movido al encabezado quedan 2 acciones, así que caben en fila
   (icono + texto) en vez de apiladas: se lee mejor y ocupa 4px menos de alto. */
const cardActionBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '6px 4px', borderRadius: 10, height: 40, boxSizing: 'border-box',
  border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text-2)',
  fontSize: 11.5, fontWeight: 600, cursor: 'pointer', transition: 'all .18s',
}

/* Icono del estado — el check verde es el de "vigente"; los demás estados usan
   su propio glifo para que el botón siga informando en los 27px. */
function StatusIcon({ status }: { status: string }) {
  const common = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (status === 'vigente') return <svg {...common} strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
  if (status === 'por_vencer') return <svg {...common} strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
  if (status === 'vencido') return <svg {...common} strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
  return <svg {...common} strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>
}

export interface FileCardProps {
  title: string
  /* null = el registro aún no existe; la card mantiene su tamaño igual. */
  item: any | null
  status: string
  /* Textos que cambian entre documentos y certificados. */
  emptyLabel: string
  createLabel: string
  onCreate: () => void
  onEdit: (item: any) => void
  onPreview: (url: string) => void
  onDownload: (item: any) => void
  onScan: (id: string) => void
  onUpload: (file: File, id: string) => void
}

export default function FileCard({ title, item: doc, status, emptyLabel, createLabel, onCreate, onEdit, onPreview, onDownload, onScan, onUpload }: FileCardProps) {
  const statusColor = getStatusColor(status)
  const statusLabel = getStatusLabel(status)
  const hasFile = Boolean(doc?.file_url)
  const isPdfFile = hasFile && isPdf(doc.file_url)
  const idleBorder = hasFile ? 'rgba(245,197,24,0.22)' : 'var(--border)'


  return (
    <div style={{
      height: CARD_H, boxSizing: 'border-box',
      padding: 14, borderRadius: 18, background: 'var(--surface)',
      border: `1px solid ${idleBorder}`,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)', transition: 'border-color .18s',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(245,197,24,0.4)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = idleBorder}>

      {/* Título + controles en una sola fila, los 3 botones alineados a la derecha */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, flex: '0 0 auto' }}>
        <div title={title} style={{
          flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700, lineHeight: 1.25,
          overflowWrap: 'break-word',
          display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden',
        }}>{title}</div>
        {/* Estado — mismo tamaño que los otros dos; el texto sale al pasar el mouse */}
        <span title={statusLabel} style={{
          ...iconBtn, cursor: 'default',
          color: statusColor, borderColor: statusColor,
          background: status === 'pendiente' ? 'var(--surface-2)' :
            status === 'vigente' ? 'rgba(46,204,113,0.08)' :
            status === 'por_vencer' ? 'rgba(255,138,61,0.08)' :
            'rgba(255,77,106,0.08)',
        }}>
          <StatusIcon status={status} />
        </span>
        {doc && (
          <>
            <button onClick={() => onDownload(doc)} disabled={!hasFile}
              title={hasFile ? 'Descargar archivo' : 'Aún no hay archivo para descargar'}
              style={{ ...iconBtn, cursor: hasFile ? 'pointer' : 'default', opacity: hasFile ? 1 : 0.4 }}
              onMouseEnter={e => { if (hasFile) { e.currentTarget.style.color = '#F5C518'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.4)' } }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border-2)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
            <button onClick={() => onEdit(doc)} title="Editar" style={iconBtn}
              onMouseEnter={e => { e.currentTarget.style.color = '#F5C518'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.4)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border-2)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
            </button>
          </>
        )}
      </div>

      {/* Slot del archivo — único bloque elástico de la card */}
      <div style={{ flex: 1, minHeight: 0, borderRadius: 11, overflow: 'hidden' }}>
        {hasFile ? (
          <div onClick={() => onPreview(doc.file_url)} style={{ position: 'relative', height: '100%', cursor: 'pointer', borderRadius: 11, overflow: 'hidden' }}>
            {isPdfFile ? (
              <div style={{
                height: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 5,
                background: 'rgba(245,197,24,0.06)',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                <span style={{ fontSize: 11, color: '#F5C518', fontWeight: 600 }}>Ver PDF</span>
              </div>
            ) : (
              <img src={doc.file_url} alt={doc.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            )}
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', opacity: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              color: '#fff', fontSize: 12, fontWeight: 700, transition: 'opacity .18s',
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0'}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/></svg>
              Ampliar
            </div>
          </div>
        ) : (
          <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 6,
            borderRadius: 11, border: '1px dashed var(--border-2)',
            color: 'var(--text-3)', fontSize: 11, textAlign: 'center', padding: '0 10px',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            {doc ? 'Sin archivo adjunto' : emptyLabel}
          </div>
        )}
      </div>

      {/* Acciones — misma altura exista o no el documento.
          Sin .regGrid a propósito: esa clase apila a 1 columna bajo 860px y
          desbordaría la card de alto fijo. La card ya es full-width en móvil. */}
      {doc ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, flex: '0 0 auto' }}>
          <button onClick={() => onScan(doc.id)} title="Escanear con la cámara" style={cardActionBtn}
            onMouseEnter={e => { e.currentTarget.style.color = '#F5C518' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            Escanear
          </button>
          <label title="Subir archivo o foto" style={cardActionBtn}
            onMouseEnter={e => { e.currentTarget.style.color = '#F5C518' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="M7 9l5-5 5 5"/><path d="M12 4v12"/></svg>
            Subir
            <input type="file" accept="image/*,application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f, doc.id) }} style={{ display: 'none' }} />
          </label>
        </div>
      ) : (
        <button onClick={onCreate}
          style={{
            width: '100%', height: 44, boxSizing: 'border-box', borderRadius: 10,
            border: '1px dashed rgba(245,197,24,0.35)', background: 'rgba(245,197,24,0.04)',
            color: '#F5C518', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
            transition: 'all .18s', flex: '0 0 auto',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.1)'; e.currentTarget.style.borderColor = '#F5C518' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.04)'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.35)' }}>
          {createLabel}
        </button>
      )}
    </div>
  )
}
