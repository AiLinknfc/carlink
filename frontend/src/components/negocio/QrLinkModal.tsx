'use client'

/* Enlace + QR para compartir (ficha pública de un vehículo en venta, etc.). Mismo estilo de QR que el resto del panel. */
import { useEffect, useRef, useState } from 'react'
import AdminModal from '@/components/admin/AdminModal'
import { ghostBtnStyle, primaryBtnStyle } from './shared'

type Tokens = ReturnType<typeof import('./shared').negocioTokens>

export default function QrLinkModal({ t, theme, title, intro, url, onClose }: {
  t: Tokens; theme: 'light' | 'dark'; title: string; intro: string; url: string; onClose: () => void
}) {
  const qrBox = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!qrBox.current) return
    let cancelled = false
    import('qr-code-styling').then(({ default: QRCodeStyling }) => {
      if (cancelled || !qrBox.current) return
      const qr = new QRCodeStyling({
        width: 200, height: 200, data: url, margin: 8,
        qrOptions: { errorCorrectionLevel: 'H' },
        dotsOptions: { type: 'rounded', color: '#111111' },
        cornersSquareOptions: { type: 'extra-rounded', color: '#111111' },
        cornersDotOptions: { type: 'dot', color: '#111111' },
        backgroundOptions: { color: '#ffffff' },
      })
      qrBox.current.innerHTML = ''
      qr.append(qrBox.current)
    })
    return () => { cancelled = true }
  }, [url])

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* se puede seleccionar a mano */ }
  }

  return (
    <AdminModal isOpen onClose={onClose} title={title} theme={theme} maxWidth={440} footer={<button onClick={onClose} style={ghostBtnStyle(t)}>Cerrar</button>}>
      <p style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.55, margin: '0 0 14px' }}>{intro}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <div ref={qrBox} style={{ width: 200, height: 200, borderRadius: 10, overflow: 'hidden', background: '#fff' }} />
        <input readOnly value={url} aria-label="Enlace" onFocus={e => e.currentTarget.select()} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: 12, background: t.inputBg, color: t.textPrimary, border: `1px solid ${t.subtleBorder}` }} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={copy} style={primaryBtnStyle(t, false)}>{copied ? 'Copiado' : 'Copiar enlace'}</button>
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ ...ghostBtnStyle(t), textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Abrir</a>
        </div>
      </div>
    </AdminModal>
  )
}
