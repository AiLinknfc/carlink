'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useCertificates } from '@/lib/hooks'
import { uploadFile, isPdf, downloadFile, fileExtension } from '@/lib/upload'
import { CertIcon } from '@/lib/icons'
import CameraCapture from './CameraCapture'
import type { Certificate } from '@/lib/types'

// Example certificate types offered in the "Agregar" menu. Each can be added or
// removed per client — they are just quick-start templates, not fixed slots.
const CERTIFICATE_TYPES = [
  { name: 'Factura de compra', type: 'factura' },
  { name: 'SOAT', type: 'soat' },
  { name: 'Revisión tecnomecánica', type: 'rtm' },
  { name: 'Tarjeta de propiedad', type: 'propiedad' },
  { name: 'Póliza todo riesgo', type: 'poliza' },
  { name: 'Otro certificado', type: 'otro' },
]

function certTypeFor(name: string): string {
  return CERTIFICATE_TYPES.find(t => t.name === name)?.type || 'otro'
}

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
        <iframe src={url} style={{ width: '90%', maxWidth: 800, height: '80vh', borderRadius: 14, border: '1px solid rgba(245,197,24,0.3)' }} onError={() => setLoadError(true)} />
      ) : (
        <img src={url} alt="" onError={() => setLoadError(true)} style={{ maxWidth: '92vw', maxHeight: '80vh', borderRadius: 14, boxShadow: '0 30px 90px rgba(0,0,0,.7)', border: '1px solid rgba(245,197,24,0.3)' }} />
      )}
      {loadError && (
        <div style={{ color: '#ff4d6a', fontSize: 14, marginTop: 12 }}>
          No se pudo cargar el archivo.{' '}
          <a href={url} target="_blank" rel="noopener" style={{ color: '#F5C518', textDecoration: 'underline' }}>Abrir en nueva pestaña</a>
        </div>
      )}
      <button onClick={onClose} style={{ marginTop: 16, padding: '10px 20px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cerrar</button>
    </div>
  )
}

interface Props {
  vehicleId: string | undefined
  refreshKey?: number
}

export default function CertificadosTab({ vehicleId, refreshKey }: Props) {
  const { certificates, loading, reload, addCertificate, updateCertificate, deleteCertificate } = useCertificates(vehicleId)
  const [toast, setToast] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [editingCert, setEditingCert] = useState<string | null>(null)
  const [editExpiry, setEditExpiry] = useState('')
  const [scanTarget, setScanTarget] = useState<string | null>(null)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Certificate | null>(null)
  const addMenuRef = useRef<HTMLDivElement>(null)

  const flash = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }, [])

  useEffect(() => { if (vehicleId) reload() }, [vehicleId, reload, refreshKey])

  useEffect(() => {
    if (!showAddMenu) return
    const handler = (e: MouseEvent) => { if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setShowAddMenu(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showAddMenu])

  const determineStatus = useCallback((cert: Certificate): string => {
    if (!cert.file_url) return 'pendiente'
    if (cert.expiry_date) {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const expiry = new Date(cert.expiry_date); expiry.setHours(0, 0, 0, 0)
      const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays < 0) return 'vencido'
      if (diffDays <= 30) return 'por_vencer'
    }
    return 'vigente'
  }, [])

  const handleUpload = useCallback(async (file: File, certId: string) => {
    setUploading(true)
    const url = await uploadFile(file, 'certificates')
    if (url) {
      const today = new Date().toISOString().split('T')[0]
      await updateCertificate(certId, { file_url: url, issue_date: today })
      flash('Archivo subido correctamente')
    } else {
      flash('Error al subir el archivo')
    }
    setUploading(false)
  }, [updateCertificate, flash])

  const handleScan = useCallback(async (file: File) => {
    const certId = scanTarget
    setScanTarget(null)
    if (!certId || !file) return
    setUploading(true)
    const url = await uploadFile(file, 'certificates')
    if (url) {
      const today = new Date().toISOString().split('T')[0]
      await updateCertificate(certId, { file_url: url, issue_date: today })
      flash('Foto escaneada correctamente')
    } else {
      flash('Error al procesar la foto')
    }
    setUploading(false)
  }, [scanTarget, updateCertificate, flash])

  const handleCreateCert = useCallback(async (name: string) => {
    if (!vehicleId || !name.trim()) return
    setShowAddMenu(false)
    await addCertificate({ vehicle_id: vehicleId, name: name.trim(), issued_by: '' })
    flash(`${name.trim()} agregado — sube el archivo`)
  }, [vehicleId, addCertificate, flash])

  const handleAddCustom = useCallback(() => {
    const name = window.prompt('Nombre del certificado o factura a agregar:')
    if (name && name.trim()) handleCreateCert(name)
  }, [handleCreateCert])

  const handleDownload = useCallback(async (cert: Certificate) => {
    if (!cert.file_url) return
    const ok = await downloadFile(`/certificates/${cert.id}/download`, `${cert.name}.${fileExtension(cert.file_url)}`)
    flash(ok ? 'Descargando…' : 'No se pudo descargar el archivo')
  }, [flash])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    const target = deleteTarget
    setDeleteTarget(null)
    await deleteCertificate(target.id)
    flash('Certificado eliminado')
  }, [deleteTarget, deleteCertificate, flash])

  const openEdit = useCallback((cert: Certificate) => {
    setEditingCert(cert.id)
    setEditExpiry(cert.expiry_date || '')
  }, [])

  const saveEdit = useCallback(async (certId: string) => {
    const result = await updateCertificate(certId, { expiry_date: editExpiry || null })
    if (result) { flash('Certificado actualizado'); setEditingCert(null) }
  }, [editExpiry, updateCertificate, flash])

  const isEmpty = !loading && certificates.length === 0

  return (
    <div style={{ animation: 'sectionIn .55s both', maxWidth: 880 }}>
      {toast && (
        <div style={{ position: 'fixed', left: '50%', bottom: 34, zIndex: 60, transform: 'translateX(-50%)', animation: 'toastIn .4s both', display: 'flex', gap: 11, alignItems: 'center', padding: '14px 24px', borderRadius: 999, background: 'rgba(16,16,16,0.94)', backdropFilter: 'blur(14px)', border: '1px solid rgba(245,197,24,0.5)', color: '#fff8e6', fontWeight: 600, fontSize: 14 }}>
          <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#F5C518', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          </span>
          {toast}
        </div>
      )}

      {lightboxUrl && <FileLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
      {scanTarget && <CameraCapture onCapture={handleScan} onClose={() => setScanTarget(null)} />}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div onClick={() => setDeleteTarget(null)} style={{ position: 'fixed', inset: 0, zIndex: 76, background: 'rgba(4,4,4,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 380, maxWidth: '94vw', background: '#141414', border: '1px solid rgba(255,77,106,0.35)', borderRadius: 18, padding: 24, boxShadow: '0 30px 80px rgba(0,0,0,.7)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
              <span style={{ width: 40, height: 40, borderRadius: 11, flex: '0 0 auto', background: 'rgba(255,77,106,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff4d6a' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              </span>
              <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 20, textTransform: 'uppercase', lineHeight: 1.1, color: '#fff' }}>Eliminar certificado</div>
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

      {/* Header + Agregar */}
      <div style={{ marginBottom: 22, animation: 'textIn .5s .04s both', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: '.24em', textTransform: 'uppercase', fontWeight: 700, color: '#F5C518' }}>Respaldo de compras</div>
          <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: 'clamp(30px,3.8vw,46px)', letterSpacing: '.01em', margin: '8px 0 8px', textTransform: 'uppercase' }}>Certificados y facturas</h1>
          <p style={{ color: 'var(--text-2)', margin: 0 }}>Agrega las facturas o documentos que quieras conservar. Toca una tarjeta para subir su archivo o editar vencimientos.</p>
        </div>
        <div ref={addMenuRef} style={{ position: 'relative', flex: '0 0 auto' }}>
          <button onClick={() => setShowAddMenu(m => !m)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 12, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '0 0 20px rgba(245,197,24,0.35)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            Agregar
          </button>
          {showAddMenu && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 20, width: 260, background: '#161616', border: '1px solid rgba(245,197,24,0.25)', borderRadius: 14, padding: 8, boxShadow: '0 20px 50px rgba(0,0,0,.6)' }}>
              <div style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, padding: '6px 10px 8px' }}>Ejemplos</div>
              {CERTIFICATE_TYPES.map(ct => (
                <button key={ct.type} onClick={() => handleCreateCert(ct.name)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', borderRadius: 10, border: 'none', background: 'transparent', color: '#f5f3ec', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,197,24,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ color: '#F5C518', display: 'flex', flex: '0 0 auto' }}><CertIcon type={ct.type} size={18} /></span>
                  {ct.name}
                </button>
              ))}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '6px 4px' }} />
              <button onClick={handleAddCustom} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px', borderRadius: 10, border: '1px dashed rgba(245,197,24,0.4)', background: 'rgba(245,197,24,0.05)', color: '#F5C518', fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto' }}><path d="M12 5v14M5 12h14"/></svg>
                Personalizado…
              </button>
            </div>
          )}
        </div>
      </div>

      {uploading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 11, background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.3)', marginBottom: 16, animation: 'fadeUp .3s both' }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(245,197,24,0.2)', borderTopColor: '#F5C518', animation: 'spin .7s linear infinite' }} />
          <span style={{ fontSize: 13, color: '#d8c98a' }}>Subiendo archivo...</span>
        </div>
      )}

      {/* Empty state — example cards the client can add */}
      {isEmpty && (
        <div style={{ animation: 'textIn .5s .1s both' }}>
          <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700, marginBottom: 12 }}>Ejemplos — toca para agregar</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
            {CERTIFICATE_TYPES.map(ct => (
              <button key={ct.type} onClick={() => handleCreateCert(ct.name)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, background: 'var(--surface-2)', border: '1px dashed var(--border-2)', cursor: 'pointer', textAlign: 'left', color: 'inherit', transition: 'border-color .18s, background .18s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,197,24,0.5)'; e.currentTarget.style.background = 'rgba(245,197,24,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.background = 'var(--surface-2)' }}>
                <span style={{ width: 40, height: 40, borderRadius: 11, flex: '0 0 auto', background: 'rgba(245,197,24,0.12)', color: '#F5C518', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CertIcon type={ct.type} size={20} /></span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{ct.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>Agregar
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Client certificates */}
      {!isEmpty && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14, animation: 'textIn .5s .1s both' }}>
          {certificates.map((cert: Certificate) => {
            const status = determineStatus(cert)
            const statusColor = getStatusColor(status)
            const statusLabel = getStatusLabel(status)
            const isEditing = editingCert === cert.id
            const isPdfFile = cert.file_url && isPdf(cert.file_url)

            return (
              <div key={cert.id} style={{ padding: 18, borderRadius: 18, background: 'var(--surface)', border: `1px solid ${cert.file_url ? 'rgba(245,197,24,0.22)' : 'var(--border)'}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)', transition: 'border-color .18s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(245,197,24,0.4)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = cert.file_url ? 'rgba(245,197,24,0.22)' : 'var(--border)'}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                    <span style={{ width: 34, height: 34, borderRadius: 9, flex: '0 0 auto', background: 'rgba(245,197,24,0.12)', color: '#F5C518', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CertIcon type={certTypeFor(cert.name)} size={18} /></span>
                    <div style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cert.name}</div>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 999, fontSize: 11, fontWeight: 700, flex: '0 0 auto', color: statusColor, border: `1px solid ${statusColor}`, background: status === 'pendiente' ? 'var(--surface-2)' : status === 'vigente' ? 'rgba(46,204,113,0.08)' : status === 'por_vencer' ? 'rgba(255,138,61,0.08)' : 'rgba(255,77,106,0.08)' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
                    {statusLabel}
                  </span>
                </div>

                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: 'var(--text-3)', margin: '12px 0 4px' }}>{cert.id?.slice(0, 8) || '—'}</div>

                {/* Preview / Upload */}
                <div style={{ marginTop: 14 }}>
                  {cert.file_url ? (
                    <>
                      <div onClick={() => setLightboxUrl(cert.file_url)} style={{ position: 'relative', cursor: 'pointer', borderRadius: 11, overflow: 'hidden' }}>
                        {isPdfFile ? (
                          <div style={{ width: '100%', height: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(245,197,24,0.06)', borderRadius: 11 }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                            <span style={{ fontSize: 11, color: '#F5C518', fontWeight: 600 }}>Ver PDF</span>
                          </div>
                        ) : (
                          <img src={cert.file_url} alt={cert.name} style={{ width: '100%', maxHeight: 120, objectFit: 'cover', display: 'block', borderRadius: 11 }} />
                        )}
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#fff', fontSize: 12, fontWeight: 700, transition: 'opacity .18s' }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '0'}>
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/></svg>
                          {isPdfFile ? 'Ver' : 'Ampliar'}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 8 }}>
                        <button onClick={() => handleDownload(cert)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '9px 4px', borderRadius: 10, border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text-2)', fontSize: 10.5, fontWeight: 600, cursor: 'pointer', transition: 'all .18s', minHeight: 46 }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#F5C518' }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          Descargar
                        </button>
                        <button onClick={() => setScanTarget(cert.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '9px 4px', borderRadius: 10, border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text-2)', fontSize: 10.5, fontWeight: 600, cursor: 'pointer', transition: 'all .18s', minHeight: 46 }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#F5C518' }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                          Escanear
                        </button>
                        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '9px 4px', borderRadius: 10, border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text-2)', fontSize: 10.5, fontWeight: 600, cursor: 'pointer', transition: 'all .18s', minHeight: 46 }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#F5C518' }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="M7 9l5-5 5 5"/><path d="M12 4v12"/></svg>
                          Reemplazar
                          <input type="file" accept="image/*,application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f, cert.id) }} style={{ display: 'none' }} />
                        </label>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setScanTarget(cert.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 14, borderRadius: 11, border: '1px dashed rgba(245,197,24,0.35)', background: 'rgba(245,197,24,0.04)', color: '#F5C518', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all .18s', minHeight: 44 }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.1)'; e.currentTarget.style.borderColor = '#F5C518' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.04)'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.35)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                        Escanear
                      </button>
                      <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 14, borderRadius: 11, border: '1px dashed rgba(245,197,24,0.35)', background: 'rgba(245,197,24,0.04)', color: '#F5C518', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all .18s', minHeight: 44 }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.1)'; e.currentTarget.style.borderColor = '#F5C518' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.04)'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.35)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                        Subir
                        <input type="file" accept="image/*,application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f, cert.id) }} style={{ display: 'none' }} />
                      </label>
                    </div>
                  )}
                </div>

                {/* Edit expiry */}
                <button onClick={() => openEdit(cert)} style={{ marginTop: 10, width: '100%', padding: '9px 0', borderRadius: 10, border: '1px solid var(--border-2)', background: 'var(--surface-3)', color: 'var(--text-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .18s', minHeight: 38, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.08)'; e.currentTarget.style.color = '#F5C518' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--text-2)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
                  Editar vencimiento
                </button>

                {isEditing && (
                  <div style={{ marginTop: 10, padding: 12, borderRadius: 12, background: 'rgba(245,197,24,0.06)', border: '1px solid rgba(245,197,24,0.2)' }}>
                    <label style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Fecha de vencimiento</label>
                    <input type="date" value={editExpiry} onChange={e => setEditExpiry(e.target.value)} style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'inherit', fontSize: 13, outline: 'none', marginBottom: 8 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => saveEdit(cert.id)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: '#F5C518', color: '#111', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Guardar</button>
                      <button onClick={() => setEditingCert(null)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text-2)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                    </div>
                  </div>
                )}

                {/* Delete (with confirmation) */}
                <button onClick={() => setDeleteTarget(cert)} style={{ marginTop: 10, width: '100%', padding: '9px 0', borderRadius: 10, border: '1px solid rgba(255,55,55,0.3)', background: 'rgba(255,55,55,0.06)', color: '#ff4d6a', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .18s', minHeight: 38, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,55,55,0.12)'; e.currentTarget.style.color = '#ff6b8a' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,55,55,0.06)'; e.currentTarget.style.color = '#ff4d6a' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                  Eliminar
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
