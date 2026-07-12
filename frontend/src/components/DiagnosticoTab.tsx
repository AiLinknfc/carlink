'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useDiagnostics } from '@/lib/hooks'
import { uploadFile, uploadImageViaFileReader } from '@/lib/upload'

interface Props {
  vehicleId: string | undefined
}

const DEFAULT_CHECKS = [
  { name: 'Emisión de gases', val: 'PASA' },
  { name: 'Frenos', val: 'PASA' },
  { name: 'Suspensión', val: 'PASA' },
  { name: 'Luces', val: 'PASA' },
  { name: 'Dirección', val: 'PASA' },
  { name: 'Llantas', val: 'PASA' },
]

export default function DiagnosticoTab({ vehicleId }: Props) {
  const { diagnostics, loading, reload, addDiagnostic } = useDiagnostics(vehicleId)
  const [toast, setToast] = useState<string | null>(null)
  const [cdaCertUrl, setCdaCertUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const flash = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }, [])

  useEffect(() => {
    if (vehicleId) {
      const key = `carlink_cda_${vehicleId}`
      try { const v = localStorage.getItem(key); if (v) setCdaCertUrl(v) } catch (e) {}
    }
  }, [vehicleId])

  const handleUploadCda = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !vehicleId) return
    setUploading(true)

    const dataUrl = await uploadImageViaFileReader(file)
    if (dataUrl) {
      setCdaCertUrl(dataUrl)
      const key = `carlink_cda_${vehicleId}`
      try { localStorage.setItem(key, dataUrl) } catch (ex) {}
      flash('Certificado CDA cargado')
    } else {
      flash('Error al cargar el archivo')
    }
    setUploading(false)
  }, [vehicleId, flash])

  const cda = diagnostics.find(d => d.alert_type === 'cda') || null
  const latestDiag = diagnostics.length > 0 ? diagnostics[0] : null
  const cdaCode = `RTM-${String(Math.floor(Math.random() * 9000) + 1000)}-${new Date().getFullYear()}`
  const cdaExpiry = new Date(Date.now() + 365 * 86400000).toLocaleDateString()

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

      <div style={{ marginBottom: 22, animation: 'textIn .5s .04s both' }}>
        <div style={{ fontSize: 12, letterSpacing: '.24em', textTransform: 'uppercase', fontWeight: 700, color: '#F5C518' }}>Revisión técnica</div>
        <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: 'clamp(30px,3.8vw,46px)', letterSpacing: '.01em', margin: '8px 0 8px', textTransform: 'uppercase' }}>Centro de diagnóstico automotor</h1>
        <p style={{ color: '#b6b2a6', margin: 0, maxWidth: '62ch' }}>Resultados de tu última visita al CDA, con vencimiento y descarga del certificado.</p>
      </div>

      {uploading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 11, background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.3)', marginBottom: 16, animation: 'fadeUp .3s both' }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(245,197,24,0.2)', borderTopColor: '#F5C518', animation: 'spin .7s linear infinite' }} />
          <span style={{ fontSize: 13, color: '#d8c98a' }}>Subiendo certificado...</span>
        </div>
      )}

      <div className="grid2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start', animation: 'textIn .5s .1s both' }}>
        {/* Main card */}
        <div ref={React.createRef<HTMLDivElement>() as any} style={{ padding: 24, borderRadius: 22, background: 'linear-gradient(155deg,#1c1708,#141414)', border: '1px solid rgba(245,197,24,0.24)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ width: 54, height: 54, borderRadius: 14, background: '#F5C518', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111', boxShadow: '0 0 22px rgba(245,197,24,.4)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 0-7 7c0 3 2 5 2 7h10c0-2 2-4 2-7a7 7 0 0 0-7-7z"/><path d="M9 21h6M10 18v3M14 18v3"/></svg>
              </span>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>CDA de la ciudad</div>
                <div style={{ fontSize: 13, color: '#b6b2a6' }}>
                  {latestDiag ? new Date(latestDiag.created_at).toLocaleDateString() : '—'}
                </div>
              </div>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 999, background: 'rgba(46,204,113,0.14)', border: '1px solid rgba(46,204,113,0.45)', color: '#5be89a', fontSize: 12, fontWeight: 800 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2ecc71', boxShadow: '0 0 8px #2ecc71' }}></span>
              APROBADO
            </span>
          </div>

          {/* Checks grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginTop: 20 }}>
            {DEFAULT_CHECKS.map((check, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 13px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: 13, color: '#d8d4c8' }}>{check.name}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#5be89a' }}>{check.val}</span>
              </div>
            ))}
          </div>

          {/* Ceritificado RTM */}
          {cdaCertUrl && (
            <div style={{ marginTop: 16 }}>
              <img src={cdaCertUrl} alt="Certificado CDA" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(245,197,24,0.2)' }} />
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: 18, borderRadius: 18, background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700 }}>Certificado RTM</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: '#d8d4c8', margin: '8px 0 4px' }}>{cdaCode}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <span style={{ fontSize: 13, color: '#b6b2a6' }}>Vence</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 999, fontSize: 12, fontWeight: 700, color: '#ff8a3d', border: '1px solid #ff8a3d', background: 'rgba(255,138,61,0.08)' }}>{cdaExpiry}</span>
            </div>
          </div>

          <div style={{ padding: 18, borderRadius: 18, background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, marginBottom: 8 }}>Adjuntar certificado escaneado</div>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 22, borderRadius: 12, border: `1px dashed ${cdaCertUrl ? 'rgba(245,197,24,0.5)' : 'rgba(245,197,24,0.35)'}`, background: 'rgba(245,197,24,0.04)', color: '#c9c6ba', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .18s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#F5C518'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = cdaCertUrl ? 'rgba(245,197,24,0.5)' : 'rgba(245,197,24,0.35)'; e.currentTarget.style.color = '#c9c6ba' }}>
              {cdaCertUrl ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  Certificado cargado — toca para cambiar
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                  Subir imagen o PDF
                </span>
              )}
              <input type="file" accept="image/*,application/pdf" onChange={handleUploadCda} style={{ display: 'none' }} />
            </label>
          </div>

          {/* Download button */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => { const el = document.querySelector('[data-diag-card]'); if (el) (window as any).html2canvas?.(el).then((c: HTMLCanvasElement) => { const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = 'certificado-cda-carlink.png'; a.click() }) }}
              style={{ flex: 1, minWidth: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 12, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 13, cursor: 'pointer', transition: 'all .18s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#FFD84D'}
              onMouseLeave={e => e.currentTarget.style.background = '#F5C518'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
              Descargar certificado
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
