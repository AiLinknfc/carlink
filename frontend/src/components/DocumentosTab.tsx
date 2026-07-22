'use client'

import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { uploadFile, isPdf, downloadFile, fileExtension } from '@/lib/upload'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import CameraCapture from './CameraCapture'
import FileCard, { getStatusColor, getStatusLabel } from './FileCard'
import type { Document } from '@/lib/types'

function FileLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return createPortal(
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24, cursor: 'zoom-out',
    }}>
      {isPdf(url) ? (
        <iframe
          src={url}
          style={{ width: '90%', maxWidth: 800, height: '80vh', borderRadius: 14, border: '1px solid rgba(245,197,24,0.3)' }}
        />
      ) : (
        <img
          src={url} alt=""
          style={{ maxWidth: '94vw', maxHeight: '82vh', borderRadius: 20, boxShadow: '0 30px 90px rgba(0,0,0,.7)', border: '1px solid rgba(245,197,24,0.3)', objectFit: 'contain' }}
        />
      )}
    </div>,
    document.body
  )
}

const DOCUMENT_TYPES = [
  { name: 'SOAT', type: 'soat', defaultCode: 'SOAT-XXXX-XX' },
  { name: 'Revisión tecnomecánica', type: 'rtm', defaultCode: 'RTM-XXXX-XX' },
  { name: 'Tarjeta de propiedad', type: 'propiedad', defaultCode: 'LIC-XXXXXXXX' },
  { name: 'Póliza todo riesgo', type: 'poliza', defaultCode: 'POL-XXXX-XXXX' },
]

/* scanTarget para el documento que todavía no se ha creado. */
const NEW_DOC = '__new__'

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
  const [editingDoc, setEditingDoc] = useState<any | null>(null)
  const [editExpiry, setEditExpiry] = useState('')
  const [editCode, setEditCode] = useState('')
  const [editName, setEditName] = useState('')
  const [scanTarget, setScanTarget] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createType, setCreateType] = useState('')
  const [createName, setCreateName] = useState('')
  const [createCode, setCreateCode] = useState('')
  const [createExpiry, setCreateExpiry] = useState('')
  const [createSaving, setCreateSaving] = useState(false)
  const [createFile, setCreateFile] = useState<File | null>(null)

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
      flash('Error al subir — verifica tamaño (máx 10MB) y formato (imagen o PDF)')
    }
    setUploading(false)
  }, [flash, loadDocs])

  const openCreateModal = useCallback((type?: string) => {
    const dt = type ? DOCUMENT_TYPES.find(t => t.type === type) : null
    setCreateType(dt?.type || 'custom')
    setCreateName(dt?.name || '')
    setCreateCode(dt?.defaultCode || '')
    setCreateExpiry('')
    setCreateFile(null)
    setShowCreateModal(true)
  }, [])

  const handleCreateDoc = useCallback(async () => {
    if (!vehicleId || !createName.trim()) return
    setCreateSaving(true)

    const notesStr = [
      `status=vigente`,
      createExpiry ? `expires=${createExpiry}` : '',
      createCode ? `code=${createCode}` : '',
      `type=${createType}`,
    ].filter(Boolean).join(';')

    const result = await apiPost('/documents', {
      vehicle_id: vehicleId,
      name: createName.trim(),
      type: createType,
      notes: notesStr,
    })
    if (result) {
      let msg = `${createName} creado — sube el archivo`
      if (createFile) {
        const url = await uploadFile(createFile, 'documents')
        if (url) {
          await apiPut(`/documents/${result.id}`, { file_url: url })
          msg = `${createName} creado con su archivo`
        } else {
          msg = `${createName} creado, pero el archivo no se pudo subir — reintenta desde la card`
        }
      }
      flash(msg)
      loadDocs()
      setShowCreateModal(false)
    } else {
      flash('Error al crear el documento')
    }
    setCreateSaving(false)
  }, [vehicleId, createName, createType, createCode, createExpiry, createFile, flash, loadDocs])

  const handleDownload = useCallback(async (doc: any) => {
    if (!doc.file_url) return
    const ok = await downloadFile(`/documents/${doc.id}/download`, `${doc.name}.${fileExtension(doc.file_url)}`)
    flash(ok ? 'Descargando…' : 'No se pudo descargar el archivo')
  }, [flash])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    const target = deleteTarget
    setDeleteTarget(null)
    setEditingDoc(null)
    await apiDelete(`/documents/${target.id}`)
    flash('Documento eliminado')
    loadDocs()
  }, [deleteTarget, flash, loadDocs])

  const handleScan = useCallback(async (file: File) => {
    const docId = scanTarget
    setScanTarget(null)
    if (!docId || !file) return
    /* El documento aún no existe: se guarda la foto y se sube tras crearlo. */
    if (docId === NEW_DOC) { setCreateFile(file); return }
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
    setEditingDoc(doc)
    setEditName(doc.name || '')
    const expiryMatch = doc.notes?.match(/expires=(\d{4}-\d{2}-\d{2})/)
    const codeMatch = doc.notes?.match(/code=([^\s;]+)/)
    setEditExpiry(expiryMatch?.[1] || '')
    setEditCode(codeMatch?.[1] || '')
  }, [])

  const saveEdit = useCallback(async () => {
    if (!editingDoc) return
    const notesStr = [
      `status=vigente`,
      editExpiry ? `expires=${editExpiry}` : '',
      editCode ? `code=${editCode}` : '',
      `type=${editingDoc.type || 'custom'}`,
    ].filter(Boolean).join(';')

    await apiPut(`/documents/${editingDoc.id}`, { name: editName || undefined, notes: notesStr })
    flash('Documento actualizado')
    setEditingDoc(null)
    loadDocs()
  }, [editingDoc, editName, editExpiry, editCode, flash, loadDocs])

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

      {/* Editar documento — instancia única; se abre desde el lápiz de la card */}
      {editingDoc && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setEditingDoc(null)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,4,4,0.72)' }} />
          <div onClick={e => e.stopPropagation()} style={{
            position: 'relative', width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto',
            background: 'var(--panel-bg)', borderRadius: 20, border: '1px solid var(--border)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.55)', padding: 24,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 800, color: 'var(--text-1)' }}>Editar documento</h3>
              <button onClick={() => setEditingDoc(null)} style={{
                width: 32, height: 32, borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <label style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Nombre del documento</label>
            <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 14, outline: 'none', marginBottom: 14, boxSizing: 'border-box' }} />
            <label style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Número de documento</label>
            <input type="text" value={editCode} onChange={e => setEditCode(e.target.value.toUpperCase())}
              placeholder="Ej. SOAT-8842-XZ"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 14, outline: 'none', marginBottom: 14, boxSizing: 'border-box' }} />
            <label style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Fecha de vencimiento</label>
            <input type="date" className="date-field date-field--sm" value={editExpiry} onChange={e => setEditExpiry(e.target.value)}
              style={{ marginBottom: 20 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={saveEdit} style={{
                flex: 1, padding: '11px 0', borderRadius: 10, border: 'none',
                background: '#F5C518', color: '#111', fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
              }}>Guardar</button>
              <button onClick={() => setEditingDoc(null)} style={{
                flex: 1, padding: '11px 0', borderRadius: 10,
                border: '1px solid var(--border-2)', background: 'transparent',
                color: 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>Cancelar</button>
            </div>
            {/* Eliminar vive aquí, ya no en la card */}
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setDeleteTarget(editingDoc)} style={{
                width: '100%', padding: '10px 0', borderRadius: 10,
                border: '1px solid rgba(255,55,55,0.3)', background: 'rgba(255,55,55,0.06)',
                color: '#ff4d6a', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                transition: 'all .18s', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,55,55,0.12)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,55,55,0.06)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                Eliminar documento
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div onClick={() => setDeleteTarget(null)} style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(4,4,4,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} className="modal-panel" style={{ width: 480, maxWidth: '94vw', background: 'var(--panel-bg)', color: 'var(--text-1)', border: '1px solid rgba(255,77,106,0.35)', borderRadius: 20, padding: 24, boxShadow: '0 30px 80px rgba(0,0,0,.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
              <span style={{ width: 40, height: 40, borderRadius: 11, flex: '0 0 auto', background: 'rgba(255,77,106,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff4d6a' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              </span>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 800, lineHeight: 1.15, color: '#fff' }}>Eliminar documento</div>
            </div>
            <p style={{ fontSize: 14, color: '#b6b2a6', lineHeight: 1.5, margin: '0 0 20px' }}>
              ¿Seguro que deseas eliminar <b style={{ color: '#f5f3ec' }}>{deleteTarget.name}</b>? Esta acción no se puede deshacer y ya no lo conservarás.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: 12, borderRadius: 11, border: '1px solid rgba(255,255,255,0.14)', background: 'transparent', color: '#b6b2a6', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={confirmDelete} style={{ flex: 1, padding: 12, borderRadius: 11, border: 'none', background: '#ff4d6a', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal crear documento */}
      {showCreateModal && createPortal(
        <div onClick={() => setShowCreateModal(false)} style={{
          position: 'fixed', inset: 0, zIndex: 72,
          background: 'rgba(4,4,4,0.72)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} className="modal-panel" style={{
            width: 480, maxWidth: '94vw', maxHeight: '85vh', overflowY: 'auto',
            background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: 20,
            padding: 22, boxShadow: '0 30px 80px rgba(0,0,0,.55)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  width: 40, height: 40, borderRadius: 11,
                  background: 'rgba(245,197,24,0.12)', border: '1px solid rgba(245,197,24,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5C518',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </span>
                <div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 800, lineHeight: 1.15, color: 'var(--text-1)' }}>Nuevo documento</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Completa los datos del documento</div>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={{
                width: 32, height: 32, borderRadius: 8,
                border: '1px solid var(--btn-ghost-border)',
                background: 'var(--btn-ghost-bg)', color: 'var(--btn-ghost-color)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Type selector */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: 'var(--text-3, #9a968a)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Tipo de documento</label>
              <select value={createType} onChange={e => {
                const val = e.target.value
                setCreateType(val)
                const dt = DOCUMENT_TYPES.find(t => t.type === val)
                if (dt) { setCreateName(dt.name); setCreateCode(dt.defaultCode) }
                else { setCreateName(''); setCreateCode('') }
              }}
                style={{
                  width: '100%', padding: '11px 13px', borderRadius: 10,
                  border: '1px solid var(--input-border, rgba(255,255,255,0.14))',
                  background: 'var(--input-bg, rgba(255,255,255,0.04))', color: 'var(--text-2, #f5f3ec)',
                  fontSize: 14, outline: 'none', cursor: 'pointer',
                }}>
                {DOCUMENT_TYPES.map(t => <option key={t.type} value={t.type}>{t.name}</option>)}
                <option value="custom">Otro documento</option>
              </select>
            </div>

            {/* Name */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: 'var(--text-3, #9a968a)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Nombre</label>
              <input value={createName} onChange={e => setCreateName(e.target.value)}
                placeholder="Nombre del documento"
                style={{
                  width: '100%', padding: '11px 13px', borderRadius: 10,
                  border: '1px solid var(--input-border, rgba(255,255,255,0.14))',
                  background: 'var(--input-bg, rgba(255,255,255,0.04))', color: 'var(--text-2, #f5f3ec)',
                  fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }} />
            </div>

            {/* Code */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: 'var(--text-3, #9a968a)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Número de documento</label>
              <input value={createCode} onChange={e => setCreateCode(e.target.value.toUpperCase())}
                placeholder="Ej. SOAT-8842-XZ"
                style={{
                  width: '100%', padding: '11px 13px', borderRadius: 10,
                  border: '1px solid var(--input-border, rgba(255,255,255,0.14))',
                  background: 'var(--input-bg, rgba(255,255,255,0.04))', color: 'var(--text-2, #f5f3ec)',
                  fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }} />
            </div>

            {/* Expiry */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: 'var(--text-3, #9a968a)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Fecha de vencimiento</label>
              <input type="date" className="date-field" value={createExpiry} onChange={e => setCreateExpiry(e.target.value)} />
            </div>

            {/* Archivo — se adjunta al crear, sin tener que volver a la card */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: 'var(--text-3, #9a968a)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Archivo <span style={{ fontWeight: 500 }}>(opcional)</span></label>
              {createFile ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
                  border: '1px solid rgba(46,204,113,0.35)', background: 'rgba(46,204,113,0.06)',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto' }}><path d="M20 6L9 17l-5-5"/></svg>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{createFile.name}</span>
                  <button onClick={() => setCreateFile(null)} title="Quitar archivo" style={{
                    flex: '0 0 auto', width: 26, height: 26, borderRadius: 8, border: 'none',
                    background: 'transparent', color: 'var(--text-3)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ff4d6a'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <label style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    height: 42, borderRadius: 10, boxSizing: 'border-box',
                    border: '1px dashed rgba(245,197,24,0.35)', background: 'rgba(245,197,24,0.04)',
                    color: '#F5C518', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', transition: 'all .18s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.1)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.04)' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="M7 9l5-5 5 5"/><path d="M12 4v12"/></svg>
                    Subir
                    <input type="file" accept="image/*,application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) setCreateFile(f) }} style={{ display: 'none' }} />
                  </label>
                  <button onClick={() => setScanTarget(NEW_DOC)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    height: 42, borderRadius: 10, boxSizing: 'border-box',
                    border: '1px dashed rgba(245,197,24,0.35)', background: 'rgba(245,197,24,0.04)',
                    color: '#F5C518', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', transition: 'all .18s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.1)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.04)' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    Escanear
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowCreateModal(false)}
                style={{
                  flex: 1, padding: 12, borderRadius: 12,
                  border: '1px solid rgba(245,197,24,0.3)',
                  background: 'transparent', color: '#F5C518',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}>
                Cancelar
              </button>
              <button onClick={handleCreateDoc} disabled={createSaving || !createName.trim()}
                style={{
                  flex: 2, padding: 13, borderRadius: 12, border: 'none',
                  background: createSaving ? 'rgba(245,197,24,0.4)' : '#F5C518',
                  color: '#111', fontWeight: 800, fontSize: 14,
                  cursor: createSaving ? 'default' : 'pointer',
                  transition: 'all .18s', opacity: !createName.trim() ? 0.5 : 1,
                }}>
                {createSaving ? (createFile ? 'Subiendo…' : 'Creando…') : 'Crear documento'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div style={{ marginBottom: 16, animation: 'textIn .5s .04s both' }}>
        <div style={{ fontSize: 12, letterSpacing: '.24em', textTransform: 'uppercase', fontWeight: 700, color: '#F5C518' }}>
          Legales al día
        </div>
        <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 'clamp(24px,2.6vw,32px)', fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.15, margin: '2px 0 4px' }}>
          Documentos del vehículo
        </h1>
        <p style={{ color: 'var(--text-2)', margin: 0 }}>
          Gestiona tus documentos legales. Sube fotos o PDFs, actualiza fechas de vencimiento.
        </p>
      </div>

      <button onClick={() => openCreateModal()}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '12px 20px', borderRadius: 12,
          border: 'none', background: '#F5C518', color: '#111',
          fontWeight: 800, fontSize: 13, cursor: 'pointer',
          marginBottom: 16, transition: 'all .16s',
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

      <div className="doc-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16, animation: 'textIn .5s .1s both' }}>
        {DOCUMENT_TYPES.map(dt => {
          const doc = documents.find((d: any) => d.type === dt.type) || null
          return (
            <FileCard key={dt.type} title={dt.name} item={doc} status={doc?.status || 'pendiente'}
              emptyLabel="Documento no creado" createLabel="+ Crear documento"
              onCreate={() => openCreateModal(dt.type)} onEdit={openEdit}
              onPreview={setLightboxUrl} onDownload={handleDownload}
              onScan={setScanTarget} onUpload={handleUpload} />
          )
        })}

        {/* Extra user-created documents */}
        {documents.filter((d: any) => !DOCUMENT_TYPES.find(t => t.type === d.type)).map((doc: any) => (
          <FileCard key={doc.id} title={doc.name} item={doc} status={doc.status || 'pendiente'}
            emptyLabel="Documento no creado" createLabel="+ Crear documento"
            onCreate={() => openCreateModal()} onEdit={openEdit}
            onPreview={setLightboxUrl} onDownload={handleDownload}
            onScan={setScanTarget} onUpload={handleUpload} />
        ))}
      </div>

      {!loading && documents.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)', fontSize: 14 }}>
          Crea tus documentos legales desde los botones superiores.
        </div>
      )}
    </div>
  )
}
