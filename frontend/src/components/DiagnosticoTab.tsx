'use client'

import React, { useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDiagnostics } from '@/lib/hooks'
import { uploadFile } from '@/lib/upload'
import { isBusinessAccount } from '@/lib/constants'
import type { DiagnosticCdaCheck } from '@/lib/types'

interface Props {
  vehicleId: string | undefined
  accountType?: string
}

/* Categorías reales de una revisión técnico-mecánica y de gases (RTM/CDA) en
   Colombia — el listado en sí no es un dato inventado, lo que antes se
   inventaba era el RESULTADO (todo fijo en "PASA"). Ver
   docs/PLAN_MIGRACION_TALLERPRO.md Fase 6. */
const CDA_CATEGORIES = ['Emisión de gases', 'Frenos', 'Suspensión', 'Luces', 'Dirección', 'Llantas']

export default function DiagnosticoTab({ vehicleId, accountType }: Props) {
  const { diagnostics, loading, reload, addDiagnostic } = useDiagnostics(vehicleId)
  const [toast, setToast] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const isWorkshop = isBusinessAccount(accountType)

  const flash = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }, [])

  // El más reciente primero: useDiagnostics ya ordena por created_at desc, así
  // que cada nueva revisión CDA queda como "la vigente" — no se edita la
  // anterior porque cada renovación es, en la vida real, un certificado nuevo.
  const cda = diagnostics.find(d => d.alert_type === 'cda') || null
  const checks: DiagnosticCdaCheck[] = cda?.cda_checks || []
  const approved = checks.length > 0 && checks.every(c => c.passed)
  const hasFailures = checks.some(c => !c.passed)
  const expiryDate = cda?.cda_expiry_date ? new Date(cda.cda_expiry_date + 'T00:00:00') : null
  const isExpired = expiryDate ? expiryDate.getTime() < Date.now() : false

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(cardRef.current, { backgroundColor: null })
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = 'certificado-cda-carlink.png'
    a.click()
  }, [])

  return (
    <div style={{ animation: 'sectionIn .55s both', maxWidth: 900 }}>
      {toast && (
        <div style={{ position: 'fixed', left: '50%', bottom: 34, zIndex: 60, transform: 'translateX(-50%)', animation: 'toastIn .4s both', display: 'flex', gap: 11, alignItems: 'center', padding: '14px 24px', borderRadius: 999, background: 'rgba(16,16,16,0.94)', backdropFilter: 'blur(14px)', border: '1px solid rgba(245,197,24,0.5)', color: '#fff8e6', fontWeight: 600, fontSize: 14 }}>
          <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#F5C518', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          </span>
          {toast}
        </div>
      )}

      <div style={{ marginBottom: 16, animation: 'textIn .5s .04s both', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: '.24em', textTransform: 'uppercase', fontWeight: 700, color: '#F5C518' }}>Revisión técnica</div>
          <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 'clamp(24px,2.6vw,32px)', fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.15, margin: '2px 0 4px' }}>Centro de diagnóstico automotor</h1>
          <p style={{ color: 'var(--text-2)', margin: 0, maxWidth: '62ch' }}>Resultado real de tu última revisión CDA/RTM, con vencimiento y certificado.</p>
        </div>
        {isWorkshop && (
          <button onClick={() => setShowForm(true)} style={{ padding: '11px 18px', borderRadius: 12, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            + Registrar revisión CDA
          </button>
        )}
      </div>

      {loading ? (
        // Sin este branch, mientras useDiagnostics todavía carga (loading=true,
        // cda=null) el ternario de abajo caía derecho al `: null` final y no
        // mostraba nada — pantalla en blanco por un instante. Encontrado
        // corriendo el tab real en navegador, no con tsc.
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>Cargando…</div>
      ) : !cda ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-3)', fontSize: 14, border: '1px dashed var(--border-2)', borderRadius: 16 }}>
          Sin revisión CDA registrada en CarLink todavía.
          {!isWorkshop && <div style={{ marginTop: 6, fontSize: 12.5 }}>El taller o CDA que hizo tu revisión puede registrarla desde su cuenta.</div>}
        </div>
      ) : (
        <div className="diagnostico-grid grid2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start', animation: 'textIn .5s .1s both' }}>
          {/* Main card */}
          <div ref={cardRef} data-diag-card style={{ padding: 24, borderRadius: 22, background: 'linear-gradient(155deg,#1c1708,#141414)', border: '1px solid rgba(245,197,24,0.24)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ width: 54, height: 54, borderRadius: 14, background: '#F5C518', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111', boxShadow: '0 0 22px rgba(245,197,24,.4)' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 0-7 7c0 3 2 5 2 7h10c0-2 2-4 2-7a7 7 0 0 0-7-7z"/><path d="M9 21h6M10 18v3M14 18v3"/></svg>
                </span>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>CDA de la ciudad</div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{new Date(cda.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              {checks.length > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 800,
                  background: approved ? 'rgba(46,204,113,0.14)' : 'rgba(255,77,106,0.14)',
                  border: `1px solid ${approved ? 'rgba(46,204,113,0.45)' : 'rgba(255,77,106,0.45)'}`,
                  color: approved ? '#5be89a' : '#ff8a9a',
                }}>
                  {approved ? 'APROBADO' : 'CON OBSERVACIONES'}
                </span>
              )}
            </div>

            {/* Checks grid */}
            {checks.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginTop: 20 }}>
                {checks.map((check, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 13px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{check.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: check.passed ? '#5be89a' : '#ff8a9a' }}>{check.passed ? 'PASA' : 'NO PASA'}</span>
                  </div>
                ))}
              </div>
            )}

            {cda.cda_cert_url && (
              <div style={{ marginTop: 16 }}>
                <img src={cda.cda_cert_url} alt="Certificado CDA" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(245,197,24,0.2)' }} />
              </div>
            )}
          </div>

          {/* Right panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: 18, borderRadius: 18, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700 }}>Certificado RTM</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--text-2)', margin: '8px 0 4px' }}>{cda.cda_code || 'Sin código registrado'}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Vence</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 999, fontSize: 12, fontWeight: 700, color: isExpired ? '#ff4d6a' : '#ff8a3d', border: `1px solid ${isExpired ? '#ff4d6a' : '#ff8a3d'}`, background: isExpired ? 'rgba(255,77,106,0.08)' : 'rgba(255,138,61,0.08)' }}>
                  {expiryDate ? expiryDate.toLocaleDateString() : '—'}{isExpired ? ' · vencido' : ''}
                </span>
              </div>
            </div>

            {/* Download button */}
            {cda.cda_cert_url && (
              <button onClick={handleDownload}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 12, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 13, cursor: 'pointer', transition: 'all .18s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#FFD84D'}
                onMouseLeave={e => e.currentTarget.style.background = '#F5C518'}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
                Descargar certificado
              </button>
            )}

            {hasFailures && (
              <div style={{ padding: 14, borderRadius: 12, background: 'rgba(255,77,106,0.06)', border: '1px solid rgba(255,77,106,0.25)', fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>
                Esta revisión tiene categorías que no pasaron — corrígelas y agenda una nueva revisión.
              </div>
            )}
          </div>
        </div>
      )}

      {showForm && vehicleId && (
        <CdaFormModal
          vehicleId={vehicleId}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); reload(); flash('Revisión CDA registrada') }}
          addDiagnostic={addDiagnostic}
        />
      )}
    </div>
  )
}

function CdaFormModal({ vehicleId, onClose, onSaved, addDiagnostic }: {
  vehicleId: string
  onClose: () => void
  onSaved: () => void
  addDiagnostic: (data: any) => Promise<any>
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [code, setCode] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [checks, setChecks] = useState<Record<string, boolean>>(
    Object.fromEntries(CDA_CATEGORIES.map(c => [c, true]))
  )
  const [certUrl, setCertUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const url = await uploadFile(file, 'diagnostics')
    if (url) setCertUrl(url)
    else setError('No se pudo subir el archivo')
    setUploading(false)
  }

  const save = async () => {
    if (!expiryDate) { setError('Ingresa la fecha de vencimiento'); return }
    setSaving(true)
    setError('')
    const checksArray = CDA_CATEGORIES.map(name => ({ name, passed: checks[name] }))
    const allPassed = checksArray.every(c => c.passed)
    const result = await addDiagnostic({
      vehicle_id: vehicleId,
      alert_type: 'cda',
      description: allPassed ? 'Revisión técnico-mecánica y de gases — aprobada' : 'Revisión técnico-mecánica y de gases — con observaciones',
      severity: allPassed ? 'info' : 'warning',
      cda_code: code || undefined,
      cda_expiry_date: expiryDate,
      cda_checks: checksArray,
      cda_cert_url: certUrl || undefined,
    })
    setSaving(false)
    if (result) onSaved()
    else setError('No se pudo registrar la revisión')
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', padding: 20 }}>
      <div ref={ref} className="modal-panel" style={{ width: 480, maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto', background: 'var(--panel-bg)', color: 'var(--text-1)', border: '1px solid var(--panel-border)', borderRadius: 20, padding: 24, boxShadow: '0 30px 80px rgba(0,0,0,.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 800 }}>Registrar revisión CDA</h2>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#7c786e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ color: '#ff4d6a', fontSize: 12.5 }}>{error}</div>}

          <div>
            <label style={fieldLabel}>Código del certificado</label>
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="Ej. RTM-1234-2026" style={fieldInput} />
          </div>
          <div>
            <label style={fieldLabel}>Fecha de vencimiento *</label>
            <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} style={fieldInput} />
          </div>

          <div>
            <label style={fieldLabel}>Resultado por categoría</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {CDA_CATEGORIES.map(cat => (
                <label key={cat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 13.5, cursor: 'pointer' }}>
                  {cat}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: checks[cat] ? '#5be89a' : '#ff8a9a' }}>{checks[cat] ? 'PASA' : 'NO PASA'}</span>
                    <input type="checkbox" checked={checks[cat]} onChange={e => setChecks(c => ({ ...c, [cat]: e.target.checked }))} />
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label style={fieldLabel}>Certificado escaneado</label>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 18, borderRadius: 12, border: '1px dashed rgba(245,197,24,0.35)', background: 'rgba(245,197,24,0.04)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {uploading ? 'Subiendo…' : certUrl ? 'Certificado cargado — toca para cambiar' : 'Subir imagen o PDF'}
              <input type="file" accept="image/*,application/pdf" onChange={handleUpload} style={{ display: 'none' }} disabled={uploading} />
            </label>
          </div>

          <button onClick={save} disabled={saving || uploading} style={{ padding: '12px 18px', borderRadius: 12, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 14, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Guardando…' : 'Registrar revisión'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

const fieldLabel: React.CSSProperties = { fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, display: 'block', marginBottom: 5 }
const fieldInput: React.CSSProperties = { width: '100%', padding: '11px 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 14, outline: 'none', boxSizing: 'border-box' }
