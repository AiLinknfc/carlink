'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/* Escáner con la cámara del dispositivo para la Cámara de Comercio o el RUT (formulario de postulación de talleres).
   Muestra la cámara con una guía de encuadre, toma la foto, deja revisarla y la entrega como archivo. Si no hay cámara,
   el permiso se niega o el navegador no la ofrece, avisa y ofrece subir el archivo en su lugar. */
export default function ScanCameraModal({ onCapture, onClose, onUpload, isDark, border, muted, textColor }: {
  onCapture: (file: File) => void
  onClose: () => void
  onUpload: () => void
  isDark: boolean
  border: string
  muted: string
  textColor: string
}) {
  const GOLD = '#F5C518'
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [state, setState] = useState<'starting' | 'live' | 'preview' | 'error'>('starting')
  const [error, setError] = useState('')
  const [shot, setShot] = useState<{ url: string; blob: Blob } | null>(null)

  const stop = useCallback(() => { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null }, [])

  const start = useCallback(async () => {
    setState('starting'); setError('')
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false })
      stream.current = s
      if (video.current) { video.current.srcObject = s; await video.current.play().catch(() => {}) }
      setState('live')
    } catch (e) {
      const name = e instanceof DOMException ? e.name : ''
      setError(name === 'NotAllowedError' ? 'No diste permiso para usar la cámara. Actívalo en el navegador o sube el archivo.'
        : name === 'NotFoundError' ? 'No encontramos una cámara en este dispositivo. Sube el archivo.'
        : 'No pudimos abrir la cámara. Sube el archivo.')
      setState('error')
    }
  }, [])

  useEffect(() => {
    void start()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); stop() }
  }, [start, stop, onClose])
  useEffect(() => () => { if (shot) URL.revokeObjectURL(shot.url) }, [shot])

  const take = () => {
    const v = video.current
    if (!v || !v.videoWidth) return
    const c = document.createElement('canvas')
    c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext('2d')?.drawImage(v, 0, 0)
    c.toBlob(b => { if (b) { setShot({ url: URL.createObjectURL(b), blob: b }); setState('preview'); stop() } }, 'image/jpeg', 0.92)
  }
  const retake = () => { setShot(null); void start() }
  const use = () => { if (shot) onCapture(new File([shot.blob], 'documento-escaneado.jpg', { type: 'image/jpeg' })) }

  const btn: React.CSSProperties = { padding: '12px 22px', borderRadius: 11, border: 'none', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }
  const ghost: React.CSSProperties = { ...btn, background: 'transparent', color: textColor, border: `1px solid ${border}`, fontWeight: 600 }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(8px,3vw,24px)' }}>
      <div role="dialog" aria-modal="true" aria-label="Escanear documento" onClick={e => e.stopPropagation()}
        style={{ width: 'min(100%, 560px)', maxHeight: '100%', overflowY: 'auto', background: isDark ? '#141414' : '#fff', border: `1px solid ${border}`, borderRadius: 18, padding: 'clamp(14px,3vw,22px)', color: textColor, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Escanear Cámara de Comercio o RUT</div>
          <div style={{ fontSize: 13, color: muted, marginTop: 4, lineHeight: 1.5 }}>Pon el documento completo dentro del marco, con buena luz y sin reflejos. Sirve cualquiera de los dos.</div>
        </div>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', borderRadius: 12, overflow: 'hidden', background: '#000', border: `1px solid ${border}` }}>
          <video ref={video} playsInline muted autoPlay aria-label="Vista de la cámara" style={{ width: '100%', height: '100%', objectFit: 'cover', display: state === 'preview' ? 'none' : 'block' }} />
          {state === 'preview' && shot && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shot.url} alt="Foto tomada del documento" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
          )}
          {state === 'live' && <div aria-hidden="true" style={{ position: 'absolute', inset: '8%', border: `2px dashed ${GOLD}`, borderRadius: 10, pointerEvents: 'none' }} />}
          {state === 'starting' && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 14 }}>Abriendo la cámara...</div>}
          {state === 'error' && <div role="alert" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center', color: '#ffb347', fontSize: 14, lineHeight: 1.5 }}>{error}</div>}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={ghost}>Cancelar</button>
          {state === 'error' && <button type="button" onClick={onUpload} style={{ ...btn, background: GOLD, color: '#111' }}>Subir archivo</button>}
          {state === 'live' && <button type="button" onClick={take} style={{ ...btn, background: GOLD, color: '#111' }}>Tomar foto</button>}
          {state === 'preview' && <><button type="button" onClick={retake} style={ghost}>Repetir</button><button type="button" onClick={use} style={{ ...btn, background: GOLD, color: '#111' }}>Usar esta foto</button></>}
        </div>
      </div>
    </div>
  )
}
