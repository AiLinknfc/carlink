'use client'

import { useState, useCallback, useEffect } from 'react'
import { useCertificates } from '@/lib/hooks'
import { uploadFile, isPdf, downloadFile, fileExtension } from '@/lib/upload'
import CameraCapture from './CameraCapture'
import type { Certificate } from '@/lib/types'

const CERTIFICATE_TYPES = [
  { name: 'Factura de compra', type: 'factura', icon: '🧾' },
  { name: 'SOAT', type: 'soat', icon: '📄' },
  { name: 'Revisión tecnomecánica', type: 'rtm', icon: '🔧' },
  { name: 'Tarjeta de propiedad', type: 'propiedad', icon: '🪪' },
  { name: 'Póliza todo riesgo', type: 'poliza', icon: '🛡️' },
  { name: 'Otro certificado', type: 'otro', icon: '📋' },
]

function getStatusColor(status: string): string {
  switch (status) {
    case 'vigente': return '#2ecc71'
    case 'por_vencer': return '#ff8a3d'
    case 'vencido': return '#ff4d6a'
    default: return '#7c786e'
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

  const flash = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }, [])

  useEffect(() => { if (vehicleId) reload() }, [vehicleId, reload, refreshKey])

  const determineStatus = useCallback((cert: Certificate): string => {
    if (!cert.file_url) return 'pendiente'
    if (cert.expiry_date) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const expiry = new Date(cert.expiry_date)
      expiry.setHours(0, 0, 0, 0)
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

  const handleCreateCert = useCallback(async (type: string) => {
    if (!vehicleId) return
    const certType = CERTIFICATE_TYPES.find(t => t.type === type) || CERTIFICATE_TYPES[0]
    await addCertificate({ vehicle_id: vehicleId, name: certType.name, issued_by: '' })
    flash(`${certType.name} creado — sube el archivo`)
  }, [vehicleId, addCertificate, flash])

  const handleDownload = useCallback(async (cert: Certificate) => {
    if (!cert.file_url) return
    const ok = await downloadFile(`/certificates/${cert.id}/download`, `${cert.name}.${fileExtension(cert.file_url)}`)
    flash(ok ? 'Descargando…' : 'No se pudo descargar el archivo')
  }, [flash])

  const handleDelete = useCallback(async (id: string) => {
    await deleteCertificate(id)
    flash('Certificado eliminado')
  }, [deleteCertificate, flash])

  const openEdit = useCallback((cert: Certificate) => {
    setEditingCert(cert.id)
    setEditExpiry(cert.expiry_date || '')
  }, [])

  const saveEdit = useCallback(async (certId: string) => {
    const result = await updateCertificate(certId, { expiry_date: editExpiry || null })
    if (result) {
      flash('Certificado actualizado')
      setEditingCert(null)
    }
  }, [editExpiry, updateCertificate, flash])

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
          Respaldo de compras
        </div>
        <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: 'clamp(30px,3.8vw,46px)', letterSpacing: '.01em', margin: '8px 0 8px', textTransform: 'uppercase' }}>
          Certificados y facturas
        </h1>
        <p style={{ color: '#b6b2a6', margin: 0 }}>
          Sube fotos de tus facturas o recibos, o archivos PDF. Toca para editar vencimientos.
        </p>
      </div>

      <div style={{ marginBottom: 14, animation: 'textIn .5s .07s both' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CERTIFICATE_TYPES.map(ct => (
            <button key={ct.type} onClick={() => handleCreateCert(ct.type)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', borderRadius: 999, border: 'none',
                background: 'rgba(245,197,24,0.12)', color: '#F5C518',
                fontWeight: 700, fontSize: 12, cursor: 'pointer',
                transition: 'all .18s', minHeight: 40,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F5C518'; e.currentTarget.style.color = '#111' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.12)'; e.currentTarget.style.color = '#F5C518' }}>
              <span>{ct.icon}</span>
              {ct.name}
            </button>
          ))}
        </div>
      </div>

      {uploading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 11, background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.3)', marginBottom: 16, animation: 'fadeUp .3s both' }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(245,197,24,0.2)', borderTopColor: '#F5C518', animation: 'spin .7s linear infinite' }} />
          <span style={{ fontSize: 13, color: '#d8c98a' }}>Subiendo archivo...</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14, animation: 'textIn .5s .1s both' }}>
        {CERTIFICATE_TYPES.map(ct => {
          const cert = certificates.find((c: Certificate) => c.name === ct.name)
          const status = cert ? determineStatus(cert) : 'pendiente'
          const statusColor = getStatusColor(status)
          const statusLabel = getStatusLabel(status)
          const isEditing = editingCert === cert?.id
          const isPdfFile = cert?.file_url && isPdf(cert.file_url)

          return (
            <div key={ct.type} style={{
              padding: 18, borderRadius: 18, background: '#141414',
              border: `1px solid ${cert?.file_url ? 'rgba(245,197,24,0.22)' : 'rgba(255,255,255,0.08)'}`,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)', transition: 'border-color .18s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(245,197,24,0.4)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = cert?.file_url ? 'rgba(245,197,24,0.22)' : 'rgba(255,255,255,0.08)'}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{ct.icon}</span>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{ct.name}</div>
                </div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 11px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                  color: statusColor,
                  border: `1px solid ${statusColor}`,
                  background: status === 'pendiente' ? 'rgba(255,255,255,0.04)' :
                    status === 'vigente' ? 'rgba(46,204,113,0.08)' :
                    status === 'por_vencer' ? 'rgba(255,138,61,0.08)' :
                    'rgba(255,77,106,0.08)',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
                  {statusLabel}
                </span>
              </div>

              {cert && (
                <>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#7c786e', margin: '12px 0 4px' }}>
                    {cert.id?.slice(0, 8) || '—'}
                  </div>

                  {/* Preview / Upload */}
                  <div style={{ marginTop: 14 }}>
                    {cert.file_url ? (
                      <>
                        <div onClick={() => setLightboxUrl(cert.file_url)} style={{ position: 'relative', cursor: 'pointer', borderRadius: 11, overflow: 'hidden' }}>
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
                            <img src={cert.file_url} alt={cert.name} style={{ width: '100%', maxHeight: 120, objectFit: 'cover', display: 'block', borderRadius: 11 }} />
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
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button onClick={() => handleDownload(cert)} style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            padding: 9, borderRadius: 10,
                            border: '1px solid rgba(255,255,255,0.12)',
                            background: 'rgba(255,255,255,0.04)', color: '#b6b2a6',
                            fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            transition: 'all .18s', minHeight: 38,
                          }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#fff' }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#b6b2a6' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Descargar
                          </button>
                          <button onClick={() => setScanTarget(cert.id)} style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            padding: 9, borderRadius: 10,
                            border: '1px solid rgba(255,255,255,0.12)',
                            background: 'rgba(255,255,255,0.04)', color: '#b6b2a6',
                            fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            transition: 'all .18s', minHeight: 38,
                          }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#fff' }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#b6b2a6' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                            Escanear
                          </button>
                          <label style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            padding: 9, borderRadius: 10,
                            border: '1px solid rgba(255,255,255,0.12)',
                            background: 'rgba(255,255,255,0.04)', color: '#b6b2a6',
                            fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            transition: 'all .18s', minHeight: 38,
                          }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#fff' }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#b6b2a6' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="M7 9l5-5 5 5"/><path d="M12 4v12"/></svg>
                            Reemplazar
                            <input type="file" accept="image/*,application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f, cert.id) }} style={{ display: 'none' }} />
                          </label>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setScanTarget(cert.id)} style={{
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
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.04)'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.35)'; e.currentTarget.style.color = '#c9c6ba' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                          Subir
                          <input type="file" accept="image/*,application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f, cert.id) }} style={{ display: 'none' }} />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Edit expiry button */}
                  <button onClick={() => openEdit(cert)} style={{
                    marginTop: 10, width: '100%', padding: '9px 0', borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.03)', color: '#a8a496',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    transition: 'all .18s', minHeight: 38,
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.08)'; e.currentTarget.style.color = '#F5C518' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#a8a496' }}>
                    ✎ Editar vencimiento
                  </button>

                  {/* Edit form */}
                  {isEditing && (
                    <div style={{ marginTop: 10, padding: 12, borderRadius: 12, background: 'rgba(245,197,24,0.06)', border: '1px solid rgba(245,197,24,0.2)' }}>
                      <label style={{ fontSize: 10, color: '#a8a496', fontWeight: 600, display: 'block', marginBottom: 4 }}>Fecha de vencimiento</label>
                      <input type="date" value={editExpiry} onChange={e => setEditExpiry(e.target.value)}
                        style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 13, outline: 'none', marginBottom: 8 }} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => saveEdit(cert.id)} style={{
                          flex: 1, padding: '9px 0', borderRadius: 8, border: 'none',
                          background: '#F5C518', color: '#111', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                        }}>Guardar</button>
                        <button onClick={() => setEditingCert(null)} style={{
                          flex: 1, padding: '9px 0', borderRadius: 8,
                          border: '1px solid rgba(255,255,255,0.14)',
                          background: 'rgba(255,255,255,0.04)', color: '#b6b2a6', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                        }}>Cancelar</button>
                      </div>
                    </div>
                  )}

                  {/* Delete button */}
                  <button onClick={() => handleDelete(cert.id)} style={{
                    marginTop: 10, width: '100%', padding: '9px 0', borderRadius: 10,
                    border: '1px solid rgba(255,55,55,0.3)',
                    background: 'rgba(255,55,55,0.06)', color: '#ff4d6a',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    transition: 'all .18s', minHeight: 38,
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,55,55,0.12)'; e.currentTarget.style.color = '#ff6b8a' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,55,55,0.06)'; e.currentTarget.style.color = '#ff4d6a' }}>
                    Eliminar certificado
                  </button>
                </>
              )}

              {!cert && (
                <div style={{ marginTop: 14, padding: 12, borderRadius: 11, background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', textAlign: 'center', color: '#7c786e', fontSize: 13 }}>
                  Sin certificado registrado
                </div>
              )}
            </div>
          )
        })}

        {!loading && certificates.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: '#7c786e', fontSize: 14 }}>
            Sin certificados aún. Usa los botones arriba para agregar uno.
          </div>
        )}
      </div>
    </div>
  )
}