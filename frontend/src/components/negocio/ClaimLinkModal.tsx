'use client'

/* Enlace/QR de reclamo para un cliente (docs/PLAN_VINCULO_TALLER_CONDUCTOR.md, escenarios B y orden-QR).
   El token en claro solo existe en esta respuesta: no se puede volver a mostrar. Generar uno nuevo invalida el anterior. */
import { useEffect, useRef, useState } from 'react'
import AdminModal from '@/components/admin/AdminModal'
import type { ClaimToken } from '@/lib/workshopLinks'
import { ghostBtnStyle, primaryBtnStyle } from './shared'

type Tokens = ReturnType<typeof import('./shared').negocioTokens>

export default function ClaimLinkModal({ t, theme, title, intro, phone, generate, onClose, pathPrefix = '/vincular', footnote, shareText }: {
  t: Tokens; theme: 'light' | 'dark'; title: string; intro: string; phone?: string
  generate: () => Promise<ClaimToken | null>; onClose: () => void
  /** Ruta pública a la que apunta el enlace (por defecto el vínculo cliente-taller). */
  pathPrefix?: string
  footnote?: string
  shareText?: (url: string, workshopName: string) => string
}) {
  const [token, setToken] = useState<ClaimToken | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [copied, setCopied] = useState(false)
  const qrBox = useRef<HTMLDivElement>(null)

  const url = token && typeof window !== 'undefined' ? `${window.location.origin}${pathPrefix}/${token.token}` : ''

  const make = async () => {
    setBusy(true); setFailed(false); setCopied(false)
    const res = await generate()
    setBusy(false)
    if (res) setToken(res); else setFailed(true)
  }

  useEffect(() => {
    if (!url || !qrBox.current) return
    let cancelled = false
    import('qr-code-styling').then(({ default: QRCodeStyling }) => {
      if (cancelled || !qrBox.current) return
      const qr = new QRCodeStyling({
        width: 190, height: 190, data: url, margin: 8,
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
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }
  const digits = (phone || '').replace(/\D/g, '')
  const wa = token && digits
    ? `https://wa.me/${digits.length === 10 ? `57${digits}` : digits}?text=${encodeURIComponent(shareText ? shareText(url, token.workshop_name) : `Hola, te envío el enlace de ${token.workshop_name} para guardar el historial de tu vehículo en CarLink: ${url}`)}`
    : ''

  return (
    <AdminModal isOpen onClose={onClose} title={title} theme={theme} maxWidth={440}
      footer={<button onClick={onClose} style={ghostBtnStyle(t)}>Cerrar</button>}>
      <p style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.55, margin: '0 0 14px' }}>{intro}</p>
      {!token ? (
        <>
          <button onClick={make} disabled={busy} style={primaryBtnStyle(t, busy)}>{busy ? 'Generando…' : 'Generar enlace'}</button>
          {failed && <div style={{ fontSize: 12.5, color: t.danger, marginTop: 10 }}>No se pudo generar el enlace. Inténtalo de nuevo.</div>}
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <div ref={qrBox} style={{ width: 190, height: 190, borderRadius: 10, overflow: 'hidden', background: '#fff' }} />
          <input readOnly value={url} onFocus={e => e.currentTarget.select()} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: 12, background: t.inputBg, color: t.textPrimary, border: `1px solid ${t.subtleBorder}` }} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={copy} style={primaryBtnStyle(t, false)}>{copied ? 'Copiado' : 'Copiar enlace'}</button>
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" style={{ ...ghostBtnStyle(t), textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Enviar por WhatsApp</a>}
            <button onClick={make} disabled={busy} style={ghostBtnStyle(t)}>{busy ? 'Generando…' : 'Generar uno nuevo'}</button>
          </div>
          <div style={{ fontSize: 11.5, color: t.textMuted, textAlign: 'center', lineHeight: 1.5 }}>
            Sirve una sola vez y vence el {new Date(token.expires_at).toLocaleDateString('es-CO')}. Si generas uno nuevo, el anterior deja de funcionar.
            {footnote ?? 'Tu cliente decide qué comparte y puede quitar el vínculo cuando quiera.'}
          </div>
        </div>
      )}
    </AdminModal>
  )
}
