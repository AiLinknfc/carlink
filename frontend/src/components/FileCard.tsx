'use client'

/* Card compartida por Documentos y Certificados: una sola definición garantiza
   que ambas secciones tengan exactamente la misma estructura y dimensiones. */

import { useState, useRef } from 'react'
import { isPdf, proxyUrl } from '@/lib/upload'

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

/* Alto fijo de la card. */
const CARD_H = 250

/* Botón pequeño dentro del overlay de preview. */
const previewActionBtn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(0,0,0,0.5)',
  color: '#fff', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', transition: 'all .18s',
  backdropFilter: 'blur(4px)',
}

/* Icono del estado */
function StatusIcon({ status }: { status: string }) {
  const common = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (status === 'vigente') return <svg {...common} strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
  if (status === 'por_vencer') return <svg {...common} strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
  if (status === 'vencido') return <svg {...common} strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
  return <svg {...common} strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>
}

export interface FileCardProps {
  title: string
  item: any | null
  status: string
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

  const isPreTransfer = Boolean(doc?.is_pre_transfer)
  const [revealed, setRevealed] = useState(false)
  const showLockedState = isPreTransfer && hasFile && !revealed

  const [showActions, setShowActions] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)


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

      {/* Título + controles */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, flex: '0 0 auto' }}>
        <div title={title} style={{
          flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700, lineHeight: 1.25,
          overflowWrap: 'break-word',
          display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden',
        }}>{title}</div>
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

      {/* Slot del archivo */}
      <div style={{ flex: 1, minHeight: 0, borderRadius: 11, overflow: 'hidden' }}>
        {showLockedState ? (
          <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8,
            borderRadius: 11, border: '1px dashed rgba(255,138,61,0.4)',
            background: 'rgba(255,138,61,0.06)', color: '#ff8a3d',
            fontSize: 11, textAlign: 'center', padding: '0 14px',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span style={{ fontWeight: 600, lineHeight: 1.4 }}>Documento de antes del traslado — puede tener datos del dueño anterior</span>
            <button onClick={() => setRevealed(true)} style={{
              padding: '5px 12px', borderRadius: 999, border: '1px solid rgba(255,138,61,0.5)',
              background: 'transparent', color: '#ff8a3d', fontSize: 10.5, fontWeight: 700, cursor: 'pointer',
            }}>Ver de todas formas</button>
          </div>
        ) : hasFile ? (
          <div
            onClick={() => onPreview(proxyUrl(doc.file_url))}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
            style={{ position: 'relative', height: '100%', cursor: 'pointer', borderRadius: 11, overflow: 'hidden' }}
          >
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
              <img src={proxyUrl(doc.file_url)} alt={doc.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            )}
            {/* Overlay con acciones */}
            <div style={{
              position: 'absolute', inset: 0,
              background: showActions ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.4)',
              opacity: showActions ? 1 : 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'opacity .18s',
            }}>
              {/* Fila de iconos: ampliar + escanear + subir */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div title="Ampliar" style={previewActionBtn}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.6)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.5)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/></svg>
                </div>
                <div title="Escanear con la cámara" style={previewActionBtn}
                  onClick={e => { e.stopPropagation(); if (doc) onScan(doc.id) }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.6)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.5)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </div>
                <label title="Subir archivo o foto" style={{ ...previewActionBtn, cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.6)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.5)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="M7 9l5-5 5 5"/><path d="M12 4v12"/></svg>
                  <input type="file" accept="image/*,application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f && doc) onUpload(f, doc.id) }} style={{ display: 'none' }} />
                </label>
              </div>
              <span style={{ color: '#fff', fontSize: 11, fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>Ampliar</span>
            </div>
          </div>
        ) : (
          /* Empty state — toca para elegir: escanear o subir */
          <div style={{ position: 'relative', height: '100%' }}>
            <button
              onClick={() => setShowActions(v => !v)}
              style={{
                height: '100%', width: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 8,
                borderRadius: 11, border: '2px dashed rgba(245,197,24,0.35)',
                background: 'rgba(245,197,24,0.04)', color: '#F5C518',
                fontSize: 12, fontWeight: 600, textAlign: 'center', padding: '0 10px',
                cursor: 'pointer', transition: 'all .18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.1)'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.6)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.04)'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.35)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              <span>{doc ? 'Toca para subir o escanear' : 'Subir o escanear'}</span>
            </button>
            {showActions && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 300 }} onClick={() => setShowActions(false)} />
                <div style={{
                  position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                  marginBottom: 6, zIndex: 301, width: 180,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: 6, boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
                  animation: 'fadeUp .15s ease-out',
                }}>
                  <button onClick={() => { setShowActions(false); if (doc) onScan(doc.id) }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--text-1)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,197,24,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    Escanear
                  </button>
                  <button onClick={() => { setShowActions(false); fileInputRef.current?.click() }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--text-1)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,197,24,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="M7 9l5-5 5 5"/><path d="M12 4v12"/></svg>
                    Subir foto o PDF
                  </button>
                </div>
              </>
            )}
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f && doc) onUpload(f, doc.id) }} style={{ display: 'none' }} />
          </div>
        )}
      </div>
    </div>
  )
}
