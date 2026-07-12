'use client'

import { useState, useCallback, useEffect } from 'react'
import { uploadFile, isPdf, downloadFile, fileExtension } from '@/lib/upload'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import CameraCapture from './CameraCapture'
import type { Document } from '@/lib/types'

const DOCUMENT_TYPES = [
  { name: 'SOAT', type: 'soat', defaultCode: 'SOAT-XXXX-XX' },
  { name: 'Revisión tecnomecánica', type: 'rtm', defaultCode: 'RTM-XXXX-XX' },
  { name: 'Tarjeta de propiedad', type: 'propiedad', defaultCode: 'LIC-XXXXXXXX' },
  { name: 'Póliza todo riesgo', type: 'poliza', defaultCode: 'POL-XXXX-XXXX' },
]

function getStatusColor(status: string): string {
  switch (status) {
    case 'vigente': return '#2ecc71'
    case 'por_vencer': return '#ff8a3d'
    case 'vencido': return '#ff4d6a'
    default: return 'var(--text-3)'
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'vigente': return 'Vigente'
    case 'por_vencer': return 'Por vencer'
    case 'vencido': return 'Vencido'
    default: return 'Pendiente'
  }
}

function FileLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  const [loadError, setLoadError] = useState(false)

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 75,
      background: 'rgba(4,4,4,0.88)', backdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24, cursor: 'zoom-out',
    }}>
      {isPdf(url) && !loadError ? (
        <iframe
          src={url}
          style={{ width: '90%', maxWidth: 800, height: '80vh', borderRadius: 14, border: '1px solid rgba(245,197,24,0.3)' }}
          onError={() => setLoadError(true)}
        />
      ) : (
        <img
          src={url} alt=""
          onError={() => setLoadError(true)}
          style={{ maxWidth: '92vw', maxHeight: '80vh', borderRadius: 14, boxShadow: '0 30px 90px rgba(0,0,0,.7)', border: '1px solid rgba(245,197,24,0.3)' }}
        />
      )}
      {loadError && (
        <div style={{ color: '#ff4d6a', fontSize: 14, marginTop: 12 }}>
          No se pudo cargar el archivo.{' '}
          <a href={url} target="_blank" rel="noopener" style={{ color: '#F5C518', textDecoration: 'underline' }}>Abrir en nueva pestaña</a>
        </div>
      )}
      <button onClick={onClose} style={{
        marginTop: 16, padding: '10px 20px', borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.2)',
        background: 'rgba(255,255,255,0.06)', color: '#fff',
        fontSize: 13, fontWeight: 600, cursor: 'pointer',
      }}>
        Cerrar
      </button>
    </div>
  )
}

interface Props {
  vehicleId: string | undefined
  vehicle?: any
  refreshKey?: number
}

export default function DocumentosTab({ vehicleId, refreshKey }: Props) {
  const [toast, setToast] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingDoc, setEditingDoc] = useState<string | null>(null)
  const [editExpiry, setEditExpiry] = useState('')
  const [editCode, setEditCode] = useState('')
  const [scanTarget, setScanTarget] = useState<string | null>(null)

  const flash = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }, [])

  const determineStatus = useCallback((doc: any): string => {
    if (doc.notes?.includes('status=vigente')) return 'vigente'
    if (doc.notes?.includes('status=por_vencer')) return 'por_vencer'
    if (doc.notes?.includes('status=vencido')) return 'vencido'
    if (doc.file_url) return 'vigente'
    return 'pendiente'
  }, [])

  const loadDocs = useCallback(async () => {
    if (!vehicleId) { setLoading(false); return }
    setLoading(true)
    try {
      const data = await apiGet(`/documents/vehicle/${vehicleId}`)
      if (data) {
        const enriched = data.map((d: any) => {
          const docType = DOCUMENT_TYPES.find(t => t.type === d.type) || { name: d.name, type: 'other' }
          const status = determineStatus(d)
          return { ...d, status, statusLabel: getStatusLabel(status), statusColor: getStatusColor(status), docType }
        })
        setDocuments(enriched)
      }
    } catch (e) { console.warn(e) }
    setLoading(false)
  }, [vehicleId, determineStatus])

  useEffect(() => { loadDocs() }, [loadDocs, refreshKey])

  const handleUpload = useCallback(async (file: File, docId: string) => {
    setUploading(true)
    const url = await uploadFile(file, 'documents')
    if (url) {
      await apiPut(`/documents/${docId}`, { file_url: url })
      flash('Documento subido correctamente')
      loadDocs()
    } else {
      flash('Error al subir el documento')
    }
    setUploading(false)
  }, [flash, loadDocs])

  const handleCreateDoc = useCallback(async (name: string, type: string) => {
    if (!vehicleId) return
    const result = await apiPost('/documents', {
      vehicle_id: vehicleId,
      name,
      type,
    })
    if (result) {
      flash(`${name} creado — sube el archivo`)
      loadDocs()
    }
  }, [vehicleId, flash, loadDocs])

  const handleDownload = useCallback(async (doc: any) => {
    if (!doc.file_url) return
    const ok = await downloadFile(`/documents/${doc.id}/download`, `${doc.name}.${fileExtension(doc.file_url)}`)
    flash(ok ? 'Descargando…' : 'No se pudo descargar el archivo')
  }, [flash])

  const handleDelete = useCallback(async (id: string) => {
    await apiDelete(`/documents/${id}`)
    flash('Documento eliminado')
    loadDocs()
  }, [flash, loadDocs])

  const handleScan = useCallback(async (file: File) => {
    const docId = scanTarget
    setScanTarget(null)
    if (!docId || !file) return
    setUploading(true)
    const url = await uploadFile(file, 'documents')
    if (url) {
      await apiPut(`/documents/${docId}`, { file_url: url })
      flash('Documento escaneado correctamente')
      loadDocs()
    } else {
      flash('Error al procesar la foto')
    }
    setUploading(false)
  }, [scanTarget, flash, loadDocs])

  const openEdit = useCallback((doc: any) => {
    setEditingDoc(doc.id)
    const expiryMatch = doc.notes?.match(/expires=([\d-]+)/)
    setEditExpiry(expiryMatch ? expiryMatch[1] : '')
    const codeMatch = doc.notes?.match(/code=([\w-]+)/)
    setEditCode(codeMatch ? codeMatch[1] : '')
  }, [])

  const saveEdit = useCallback(async (docId: string, type: string, name: string) => {
    const notes = `status=vigente;expires=${editExpiry || ''};code=${editCode || ''};type=${type}`
    const result = await apiPut(`/documents/${docId}`, { name, type, notes })
    if (result) {
      flash('Documento actualizado')
      setEditingDoc(null)
      loadDocs()
    }
  }, [editExpiry, editCode, flash, loadDocs])

  return (
    <div style={{ animation: 'sectionIn .55s both', maxWidth: 880 }}>
      {toast && (
        <div style={{
          position: 'fixed', left: '50%', bottom: 34, zIndex: 60,
          transform: 'translateX(-50%)', animation: 'toastIn .4s both',
          display: 'flex', gap: 11, alignItems: 'center',
          padding: '14px 24px', borderRadius: 999,
          background: 'rgba(16,16,16,0.94)', backdropFilter: 'blur(14px)',
          border: '1px solid rgba(245,197,24,0.5)', color: '#fff8e6',
          fontWeight: 600, fontSize: 14,
        }}>
          <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#F5C518', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          </span>
          {toast}
        </div>
      )}

      {lightboxUrl && <FileLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}

      {scanTarget && <CameraCapture onCapture={handleScan} onClose={() => setScanTarget(null)} />}

      <div style={{ marginBottom: 22, animation: 'textIn .5s .04s both' }}>
        <div style={{ fontSize: 12, letterSpacing: '.24em', textTransform: 'uppercase', fontWeight: 700, color: '#F5C518' }}>
          Legales al día
        </div>
        <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: 'clamp(30px,3.8vw,46px)', letterSpacing: '.01em', margin: '8px 0 8px', textTransform: 'uppercase' }}>
          Documentos del vehículo
        </h1>
        <p style={{ color: 'var(--text-2)', margin: 0 }}>
          Gestiona tus documentos legales. Sube fotos o PDFs, actualiza fechas de vencimiento.
        </p>
      </div>

      <button onClick={() => handleCreateDoc('Nuevo documento', 'custom')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '12px 20px', borderRadius: 12,
          border: 'none', background: '#F5C518', color: '#111',
          fontWeight: 800, fontSize: 13, cursor: 'pointer',
          marginBottom: 18, transition: 'all .16s',
          boxShadow: '0 0 20px rgba(245,197,24,0.35)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#e6b300' }}
        onMouseLeave={e => { e.currentTarget.style.background = '#F5C518' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
        Agregar documento
      </button>

      {uploading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 11, background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.3)', marginBottom: 16, animation: 'fadeUp .3s both' }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(245,197,24,0.2)', borderTopColor: '#F5C518', animation: 'spin .7s linear infinite' }} />
          <span style={{ fontSize: 13, color: '#d8c98a' }}>Subiendo documento...</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14, animation: 'textIn .5s .1s both' }}>
        {DOCUMENT_TYPES.map(dt => {
          const doc = documents.find((d: any) => d.type === dt.type)
          const status = doc?.status || 'pendiente'
          const statusColor = getStatusColor(status)
          const statusLabel = getStatusLabel(status)
          const isEditing = editingDoc === doc?.id
          const isPdfFile = doc?.file_url && isPdf(doc.file_url)

          return (
            <div key={dt.type} style={{
              padding: 18, borderRadius: 18, background: 'var(--surface)',
              border: `1px solid ${doc?.file_url ? 'rgba(245,197,24,0.22)' : 'var(--border)'}`,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)', transition: 'border-color .18s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(245,197,24,0.4)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = doc?.file_url ? 'rgba(245,197,24,0.22)' : 'var(--border)'}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{dt.name}</div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 11px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                  color: statusColor,
                  border: `1px solid ${statusColor}`,
                  background: status === 'pendiente' ? 'var(--surface-2)' :
                    status === 'vigente' ? 'rgba(46,204,113,0.08)' :
                    status === 'por_vencer' ? 'rgba(255,138,61,0.08)' :
                    'rgba(255,77,106,0.08)',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
                  {statusLabel}
                </span>
              </div>

              {doc && (
                <>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: 'var(--text-3)', margin: '12px 0 4px' }}>
                    {doc.id?.slice(0, 8) || '—'}
                  </div>

                  {/* Preview / Upload */}
                  <div style={{ marginTop: 14 }}>
                    {doc.file_url ? (
                      <>
                        <div onClick={() => setLightboxUrl(doc.file_url)} style={{ position: 'relative', cursor: 'pointer', borderRadius: 11, overflow: 'hidden' }}>
                          {isPdfFile ? (
                            <div style={{
                              width: '100%', height: 100, display: 'flex', flexDirection: 'column',
                              alignItems: 'center', justifyContent: 'center', gap: 6,
                              background: 'rgba(245,197,24,0.06)', borderRadius: 11,
                            }}>
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/>
                              </svg>
                              <span style={{ fontSize: 11, color: '#F5C518', fontWeight: 600 }}>Ver PDF</span>
                            </div>
                          ) : (
                            <img src={doc.file_url} alt={doc.name} style={{ width: '100%', maxHeight: 120, objectFit: 'cover', display: 'block', borderRadius: 11 }} />
                          )}
                          <div style={{
                            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
                            opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: 6, color: '#fff', fontSize: 12, fontWeight: 700,
                            transition: 'opacity .18s',
                          }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '0'}>
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/></svg>
                            {isPdfFile ? 'Ver' : 'Ampliar'}
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 8 }}>
                          <button onClick={() => handleDownload(doc)} style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                            padding: '9px 4px', borderRadius: 10,
                            border: '1px solid var(--border-2)',
                            background: 'var(--surface-2)', color: 'var(--text-2)',
                            fontSize: 10.5, fontWeight: 600, cursor: 'pointer',
                            transition: 'all .18s', minHeight: 46,
                          }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#F5C518' }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)' }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Descargar
                          </button>
                          <button onClick={() => setScanTarget(doc.id)} style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                            padding: '9px 4px', borderRadius: 10,
                            border: '1px solid var(--border-2)',
                            background: 'var(--surface-2)', color: 'var(--text-2)',
                            fontSize: 10.5, fontWeight: 600, cursor: 'pointer',
                            transition: 'all .18s', minHeight: 46,
                          }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#F5C518' }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)' }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                            Escanear
                          </button>
                          <label style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                            padding: '9px 4px', borderRadius: 10,
                            border: '1px solid var(--border-2)',
                            background: 'var(--surface-2)', color: 'var(--text-2)',
                            fontSize: 10.5, fontWeight: 600, cursor: 'pointer',
                            transition: 'all .18s', minHeight: 46,
                          }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#F5C518' }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)' }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="M7 9l5-5 5 5"/><path d="M12 4v12"/></svg>
                            Reemplazar
                            <input type="file" accept="image/*,application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f, doc.id) }} style={{ display: 'none' }} />
                          </label>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setScanTarget(doc.id)} style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          padding: 14, borderRadius: 11,
                          border: '1px dashed rgba(245,197,24,0.35)',
                          background: 'rgba(245,197,24,0.04)', color: '#F5C518',
                          fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          transition: 'all .18s', minHeight: 44,
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.1)'; e.currentTarget.style.borderColor = '#F5C518' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.04)'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.35)' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                          Escanear
                        </button>
                        <label style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          padding: 14, borderRadius: 11,
                          border: '1px dashed rgba(245,197,24,0.35)',
                          background: 'rgba(245,197,24,0.04)', color: '#F5C518',
                          fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          transition: 'all .18s', minHeight: 44,
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.1)'; e.currentTarget.style.borderColor = '#F5C518'; e.currentTarget.style.color = '#fff' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.04)'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.35)'; e.currentTarget.style.color = 'var(--text-2)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                          Subir
                          <input type="file" accept="image/*,application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f, doc.id) }} style={{ display: 'none' }} />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Edit expiry button */}
                  <button onClick={() => openEdit(doc)} style={{
                    marginTop: 10, width: '100%', padding: '9px 0', borderRadius: 10,
                    border: '1px solid var(--border-2)',
                    background: 'var(--surface-2)', color: 'var(--text-2)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    transition: 'all .18s', minHeight: 38,
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.08)'; e.currentTarget.style.color = '#F5C518' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-2)' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-2px', marginRight: 6 }}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>Editar vencimiento
                  </button>

                  {/* Edit form */}
                  {isEditing && (
                    <div style={{ marginTop: 10, padding: 12, borderRadius: 12, background: 'rgba(245,197,24,0.06)', border: '1px solid rgba(245,197,24,0.2)' }}>
                      <label style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Fecha de vencimiento</label>
                      <input type="date" value={editExpiry} onChange={e => setEditExpiry(e.target.value)}
                        style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: '#f5f3ec', fontSize: 13, outline: 'none', marginBottom: 8, boxSizing: 'border-box' }} />
                      <label style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Número de documento</label>
                      <input type="text" value={editCode} onChange={e => setEditCode(e.target.value.toUpperCase())}
                        placeholder="Ej. SOAT-8842-XZ"
                        style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: '#f5f3ec', fontSize: 13, outline: 'none', marginBottom: 8, boxSizing: 'border-box' }} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => saveEdit(doc.id, dt.type, dt.name)} style={{
                          flex: 1, padding: '9px 0', borderRadius: 8, border: 'none',
                          background: '#F5C518', color: '#111', fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', minHeight: 38,
                        }}>Guardar</button>
                        <button onClick={() => setEditingDoc(null)} style={{
                          flex: 1, padding: '9px 0', borderRadius: 8,
                          border: '1px solid var(--border-2)',
                          background: 'transparent', color: 'var(--text-2)',
                          fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        }}>Cancelar</button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {!doc && (
                <button onClick={() => handleCreateDoc(dt.name, dt.type)}
                  style={{
                    marginTop: 14, width: '100%', padding: '12px 0', borderRadius: 11,
                    border: '1px dashed rgba(245,197,24,0.35)',
                    background: 'rgba(245,197,24,0.04)', color: '#F5C518',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    transition: 'all .18s', minHeight: 44,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.1)'; e.currentTarget.style.borderColor = '#F5C518' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.04)'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.35)' }}>
                  + Crear {dt.name}
                </button>
              )}
            </div>
          )
        })}

        {/* Extra user-created documents */}
        {documents.filter((d: any) => !DOCUMENT_TYPES.find(t => t.type === d.type)).map((doc: any) => {
          const isPdfFile = doc?.file_url && isPdf(doc.file_url)
          return (
            <div key={doc.id} style={{ padding: 18, borderRadius: 18, background: 'var(--surface)', border: `1px solid ${doc.file_url ? 'rgba(245,197,24,0.22)' : 'var(--border)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{doc.name}</div>
                <button onClick={() => handleDelete(doc.id)} title="Eliminar" style={{
                  background: 'transparent', border: 'none', color: 'var(--text-3)',
                  cursor: 'pointer', padding: 4, fontSize: 14, minHeight: 32, minWidth: 32,
                }}
                  onMouseEnter={e => e.currentTarget.style.color = '#ff4d6a'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div style={{ marginTop: 12 }}>
                {doc.file_url ? (
                  isPdfFile ? (
                    <div onClick={() => setLightboxUrl(doc.file_url)} style={{ cursor: 'pointer', borderRadius: 11, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 20, background: 'rgba(245,197,24,0.06)' }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/>
                      </svg>
                      <span style={{ fontSize: 12, color: '#F5C518', fontWeight: 600 }}>Ver PDF</span>
                    </div>
                  ) : (
                    <img src={doc.file_url} alt={doc.name} style={{ width: '100%', maxHeight: 100, objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }} onClick={() => setLightboxUrl(doc.file_url)} />
                  )
                ) : null}
                {doc.file_url && (
                  <button onClick={() => handleDownload(doc)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    marginTop: 8, padding: 9, borderRadius: 10,
                    border: '1px solid var(--border-2)',
                    background: 'var(--surface-2)', color: 'var(--text-2)',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    transition: 'all .18s', minHeight: 38,
                  }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Descargar
                  </button>
                )}
                {!doc.file_url && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setScanTarget(doc.id)} style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: 14, borderRadius: 11, border: '1px dashed rgba(245,197,24,0.35)',
                      color: '#F5C518', fontSize: 12, fontWeight: 700, cursor: 'pointer', minHeight: 44,
                      background: 'rgba(245,197,24,0.04)',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.1)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.04)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      Escanear
                    </button>
                    <label style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: 14, borderRadius: 11, border: '1px dashed rgba(245,197,24,0.35)',
                      color: 'var(--text-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 44,
                      background: 'rgba(245,197,24,0.04)',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                      Subir
                      <input type="file" accept="image/*,application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f, doc.id) }} style={{ display: 'none' }} />
                    </label>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {!loading && documents.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)', fontSize: 14 }}>
          Crea tus documentos legales desde los botones superiores.
        </div>
      )}
    </div>
  )
}
