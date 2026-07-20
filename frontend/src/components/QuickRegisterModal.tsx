'use client'

import { useState, useCallback } from 'react'
import { uploadFile, scanDocument, type OcrExtractResult } from '@/lib/upload'
import { apiPost } from '@/lib/api'
import CameraCapture from './CameraCapture'

const TYPE_OPTIONS = [
  { value: 'certificado', label: 'Certificado / Factura', api: 'certificates', defaultName: 'Factura' },
  { value: 'soat', label: 'SOAT', api: 'documents', defaultName: 'SOAT' },
  { value: 'rtm', label: 'Revisión tecnomecánica', api: 'documents', defaultName: 'Revisión tecnomecánica' },
  { value: 'propiedad', label: 'Tarjeta de propiedad', api: 'documents', defaultName: 'Tarjeta de propiedad' },
  { value: 'poliza', label: 'Póliza todo riesgo', api: 'documents', defaultName: 'Póliza todo riesgo' },
  { value: 'other', label: 'Otro documento', api: 'documents', defaultName: 'Documento' },
]

interface Props {
  vehicleId: string
  onClose: () => void
  onSuccess: (msg: string) => void
  onSaved?: () => void
}

export default function QuickRegisterModal({ vehicleId, onClose, onSuccess, onSaved }: Props) {
  const [step, setStep] = useState<'scan' | 'form'>('scan')
  const [type, setType] = useState('certificado')
  const [name, setName] = useState('')
  const [issuedBy, setIssuedBy] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [docCode, setDocCode] = useState('')
  const [cost, setCost] = useState('')
  const [notes, setNotes] = useState('')
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [ocrHint, setOcrHint] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showCam, setShowCam] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [extractedFields, setExtractedFields] = useState<OcrExtractResult | null>(null)

  const applyOcrResult = useCallback((result: OcrExtractResult, currentType: string) => {
    const opt = TYPE_OPTIONS.find(t => t.value === currentType)
    const today = new Date().toISOString().split('T')[0]

    let detectedType = currentType
    if (result.title) {
      const lower = result.title.toLowerCase()
      if (lower.includes('soat')) detectedType = 'soat'
      else if (lower.includes('rtm') || lower.includes('tecnomecánica') || lower.includes('tecno')) detectedType = 'rtm'
      else if (lower.includes('póliza') || lower.includes('poliza')) detectedType = 'poliza'
      else if (lower.includes('propiedad')) detectedType = 'propiedad'
      else if (lower.includes('factura') || lower.includes('certificado')) detectedType = 'certificado'
    }

    setType(detectedType)
    const newOpt = TYPE_OPTIONS.find(t => t.value === detectedType)
    if (result.title) setName(result.title.slice(0, 60))
    else if (newOpt) setName(newOpt.defaultName)
    if (result.vendor) setIssuedBy(result.vendor)
    if (result.issue_date) setIssueDate(result.issue_date)
    if (result.cost != null) setCost(String(result.cost))
    setExtractedFields(result)

    setOcrHint('Datos detectados — revisa antes de guardar')
  }, [])

  const processFile = useCallback(async (file: File, currentType: string) => {
    setUploading(true)
    setUploadError(null)
    setOcrHint(null)
    const url = await uploadFile(file)
    if (!url) {
      setUploadError('No se pudo subir el archivo. Verifica tu conexión e intenta de nuevo.')
      setUploading(false)
      return
    }
    setFileUrl(url)
    setUploading(false)

    setScanning(true)
    const result = await scanDocument(file)
    if (result) {
      applyOcrResult(result, currentType)
      setStep('form')
    } else {
      setStep('form')
    }
    setScanning(false)
  }, [applyOcrResult])

  const handleFilePick = useCallback((file: File) => {
    processFile(file, type)
  }, [processFile, type])

  const handleCameraCapture = useCallback((file: File) => {
    setShowCam(false)
    processFile(file, type)
  }, [processFile, type])

  const handleSave = useCallback(async () => {
    if (!name.trim() || !vehicleId) return
    setSaving(true)

    const opt = TYPE_OPTIONS.find(t => t.value === type)
    const today = new Date().toISOString().split('T')[0]

    if (opt?.api === 'certificates') {
      const result = await apiPost('/certificates', {
        vehicle_id: vehicleId,
        name: name.trim(),
        issued_by: issuedBy,
        issue_date: issueDate || today,
        file_url: fileUrl || '',
        cost: cost.trim() ? Number(cost) : null,
        notes: notes,
      })
      if (result) {
        onSuccess(`"${name}" registrado correctamente`)
        onSaved?.()
        onClose()
      } else {
        onSuccess('Error al guardar el certificado')
      }
    } else {
      const notesStr = [
        `status=vigente`,
        expiryDate ? `expires=${expiryDate}` : '',
        docCode ? `code=${docCode}` : '',
        `type=${type}`,
        notes || '',
      ].filter(Boolean).join(';')

      const result = await apiPost('/documents', {
        vehicle_id: vehicleId,
        name: name.trim(),
        type: type,
        file_url: fileUrl || '',
        notes: notesStr,
      })
      if (result) {
        onSuccess(`"${name}" registrado correctamente`)
        onSaved?.()
        onClose()
      } else {
        onSuccess('Error al guardar el documento')
      }
    }
    setSaving(false)
  }, [type, name, issuedBy, issueDate, expiryDate, docCode, cost, notes, fileUrl, vehicleId, onSuccess, onSaved, onClose])

  const isCert = type === 'certificado'

  return (
    <>
      {showCam && <CameraCapture onCapture={handleCameraCapture} onClose={() => setShowCam(false)} />}

      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 72,
        background: 'rgba(4,4,4,0.72)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}>
        <div onClick={e => e.stopPropagation()} className="modal-panel" style={{
          width: 480, maxWidth: '94vw', maxHeight: '88vh', overflowY: 'auto',
          background: 'var(--panel-bg, #141414)', border: '1px solid var(--panel-border, rgba(245,197,24,0.3))', borderRadius: 22,
          padding: 24, boxShadow: '0 40px 90px rgba(0,0,0,.6)',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(245,197,24,0.14)', border: '1px solid #F5C518',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5C518',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
                  <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
                  <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
                  <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
                  <line x1="7" y1="12" x2="17" y2="12"/>
                </svg>
              </span>
              <div>
                <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 20, textTransform: 'uppercase', lineHeight: 1.1, color: 'var(--text-2, #f5f3ec)' }}>
                  {step === 'scan' ? 'Escanear documento' : 'Validar datos'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3, #7c786e)', marginTop: 2 }}>
                  {step === 'scan' ? 'Captura o sube tu documento' : 'Revisa la información extraída'}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{
              width: 34, height: 34, borderRadius: 9,
              border: '1px solid var(--btn-ghost-border, rgba(255,255,255,0.14))',
              background: 'var(--btn-ghost-bg, rgba(255,255,255,0.05))', color: 'var(--btn-ghost-color, #b6b2a6)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* STEP: Scan */}
          {step === 'scan' && (
            <>
              {/* Upload area prominente */}
              <div style={{ marginBottom: 18 }}>
                {uploading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 32, borderRadius: 14, background: 'rgba(245,197,24,0.06)', border: '1px dashed rgba(245,197,24,0.4)' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(245,197,24,0.2)', borderTopColor: '#F5C518', animation: 'spin .7s linear infinite' }} />
                    <span style={{ fontSize: 14, color: '#d8c98a', fontWeight: 600 }}>Subiendo archivo…</span>
                  </div>
                ) : scanning ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 32, borderRadius: 14, background: 'rgba(245,197,24,0.06)', border: '1px dashed rgba(245,197,24,0.4)' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(245,197,24,0.2)', borderTopColor: '#F5C518', animation: 'spin .7s linear infinite' }} />
                    <span style={{ fontSize: 14, color: '#d8c98a', fontWeight: 600 }}>Analizando documento…</span>
                    <span style={{ fontSize: 12, color: '#9a968a' }}>Extrayendo texto e información</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setShowCam(true)}
                      style={{
                        flex: 1.2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '24px 0', borderRadius: 14,
                        border: '2px dashed rgba(245,197,24,0.5)',
                        background: 'rgba(245,197,24,0.06)', color: '#F5C518',
                        cursor: 'pointer', transition: 'all .18s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.12)'; e.currentTarget.style.borderColor = '#F5C518' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.06)'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.5)' }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                      </svg>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>Escanear con cámara</span>
                      <span style={{ fontSize: 11, color: '#9a968a' }}>Captura foto del documento</span>
                    </button>
                    <label
                      style={{
                        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '24px 0', borderRadius: 14,
                        border: '2px dashed rgba(245,197,24,0.35)',
                        background: 'rgba(245,197,24,0.03)', color: '#d8c98a',
                        cursor: 'pointer', transition: 'all .18s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.08)'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.5)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.03)'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.35)' }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>Subir archivo</span>
                      <span style={{ fontSize: 11, color: '#9a968a' }}>PDF o imagen</span>
                      <input type="file" accept="image/*,application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) handleFilePick(f); e.target.value = '' }} style={{ display: 'none' }} />
                    </label>
                  </div>
                )}
              </div>

              {uploadError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,77,106,0.08)', border: '1px solid rgba(255,77,106,0.25)', marginBottom: 16, fontSize: 12, color: '#ff6b8a' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff4d6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {uploadError}
                </div>
              )}

              <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(245,197,24,0.04)', border: '1px solid rgba(245,197,24,0.15)', fontSize: 12, color: '#9a968a', lineHeight: 1.5 }}>
                <b style={{ color: '#d8c98a' }}>Tip:</b> El scanner detectará automáticamente el tipo de documento, nombre, proveedor y fechas.
              </div>
            </>
          )}

          {/* STEP: Form */}
          {step === 'form' && (
            <>
              {/* OCR hint */}
              {ocrHint && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'rgba(46,204,113,0.06)', border: '1px solid rgba(46,204,113,0.25)', marginBottom: 16, fontSize: 12, color: '#5be89a' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                  {ocrHint}
                </div>
              )}

              {/* Type selector */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: 'var(--text-3, #9a968a)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Tipo de documento</label>
                <select value={type} onChange={e => { setType(e.target.value); const opt = TYPE_OPTIONS.find(t => t.value === e.target.value); if (opt && !name) setName(opt.defaultName) }}
                  style={{
                    width: '100%', padding: '11px 13px', borderRadius: 10,
                    border: '1px solid var(--input-border, rgba(255,255,255,0.14))',
                    background: 'var(--input-bg, rgba(255,255,255,0.04))', color: 'var(--text-2, #f5f3ec)',
                    fontSize: 14, outline: 'none', cursor: 'pointer',
                  }}>
                  {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {/* Name */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: 'var(--text-3, #9a968a)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Nombre</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="Nombre del documento"
                  style={{
                    width: '100%', padding: '11px 13px', borderRadius: 10,
                    border: '1px solid var(--input-border, rgba(255,255,255,0.14))',
                    background: 'var(--input-bg, rgba(255,255,255,0.04))', color: 'var(--text-2, #f5f3ec)',
                    fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  }} />
              </div>

              {/* Certificate-specific fields */}
              {isCert && (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, color: 'var(--text-3, #9a968a)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Emitido por</label>
                    <input value={issuedBy} onChange={e => setIssuedBy(e.target.value)}
                      placeholder="Ej. Taller Automotriz XYZ"
                      style={{
                        width: '100%', padding: '11px 13px', borderRadius: 10,
                        border: '1px solid var(--input-border, rgba(255,255,255,0.14))',
                        background: 'var(--input-bg, rgba(255,255,255,0.04))', color: 'var(--text-2, #f5f3ec)',
                        fontSize: 14, outline: 'none', boxSizing: 'border-box',
                      }} />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, color: 'var(--text-3, #9a968a)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Fecha del documento</label>
                    <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)}
                      style={{
                        width: '100%', padding: '11px 13px', borderRadius: 10,
                        border: '1px solid var(--input-border, rgba(255,255,255,0.14))',
                        background: 'var(--input-bg, rgba(255,255,255,0.04))', color: 'var(--text-2, #f5f3ec)',
                        fontSize: 14, outline: 'none', boxSizing: 'border-box',
                      }} />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, color: 'var(--text-3, #9a968a)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Costo (opcional)</label>
                    <input type="number" step="0.01" min="0" value={cost} onChange={e => setCost(e.target.value)}
                      placeholder="Ej. 185000"
                      style={{
                        width: '100%', padding: '11px 13px', borderRadius: 10,
                        border: '1px solid var(--input-border, rgba(255,255,255,0.14))',
                        background: 'var(--input-bg, rgba(255,255,255,0.04))', color: 'var(--text-2, #f5f3ec)',
                        fontSize: 14, outline: 'none', boxSizing: 'border-box',
                      }} />
                  </div>
                </>
              )}

              {/* Document-specific fields */}
              {!isCert && (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, color: 'var(--text-3, #9a968a)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Fecha de vencimiento</label>
                    <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                      style={{
                        width: '100%', padding: '11px 13px', borderRadius: 10,
                        border: '1px solid var(--input-border, rgba(255,255,255,0.14))',
                        background: 'var(--input-bg, rgba(255,255,255,0.04))', color: 'var(--text-2, #f5f3ec)',
                        fontSize: 14, outline: 'none', boxSizing: 'border-box',
                      }} />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, color: 'var(--text-3, #9a968a)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Número de documento</label>
                    <input value={docCode} onChange={e => setDocCode(e.target.value.toUpperCase())}
                      placeholder="Ej. SOAT-8842-XZ"
                      style={{
                        width: '100%', padding: '11px 13px', borderRadius: 10,
                        border: '1px solid var(--input-border, rgba(255,255,255,0.14))',
                        background: 'var(--input-bg, rgba(255,255,255,0.04))', color: 'var(--text-2, #f5f3ec)',
                        fontSize: 14, outline: 'none', boxSizing: 'border-box',
                      }} />
                  </div>
                </>
              )}

              {/* Notes */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: 'var(--text-3, #9a968a)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Notas (opcional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Información adicional…"
                  rows={2}
                  style={{
                    width: '100%', padding: '11px 13px', borderRadius: 10,
                    border: '1px solid var(--input-border, rgba(255,255,255,0.14))',
                    background: 'var(--input-bg, rgba(255,255,255,0.04))', color: 'var(--text-2, #f5f3ec)',
                    fontSize: 14, outline: 'none', resize: 'vertical',
                    fontFamily: 'inherit', boxSizing: 'border-box',
                  }} />
              </div>

              {/* File status */}
              {fileUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, background: 'rgba(46,204,113,0.06)', border: '1px solid rgba(46,204,113,0.25)', marginBottom: 16 }}>
                  <span style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(46,204,113,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2ecc71', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  </span>
                  <span style={{ fontSize: 13, color: '#b6b2a6', flex: 1 }}>Archivo adjunto listo</span>
                  <button onClick={() => setFileUrl(null)}
                    style={{ background: 'transparent', border: 'none', color: '#7c786e', cursor: 'pointer', padding: 4, display: 'inline-flex' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep('scan')}
                  style={{
                    flex: 1, padding: 12, borderRadius: 12,
                    border: '1px solid rgba(245,197,24,0.3)',
                    background: 'transparent', color: '#F5C518',
                    fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  }}>
                  ← Volver
                </button>
                <button onClick={handleSave} disabled={saving || !name.trim()}
                  style={{
                    flex: 2, padding: 13, borderRadius: 12, border: 'none',
                    background: saving ? 'rgba(245,197,24,0.4)' : '#F5C518',
                    color: '#111', fontWeight: 800, fontSize: 14,
                    cursor: saving ? 'default' : 'pointer',
                    transition: 'all .18s', opacity: !name.trim() ? 0.5 : 1,
                  }}>
                  {saving ? 'Guardando…' : 'Guardar documento'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
