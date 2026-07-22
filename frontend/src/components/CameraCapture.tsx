'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  onCapture: (file: File) => void
  onClose: () => void
}

export default function CameraCapture({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')

  const startCamera = useCallback(async () => {
    try {
      if (stream) stream.getTracks().forEach(t => t.stop())
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      setStream(s)
      setError(null)
      if (videoRef.current) videoRef.current.srcObject = s
    } catch (e: any) {
      if (e.name === 'NotAllowedError') {
        setError('Permiso de cámara denegado. Ve a configuración y actívalo.')
      } else if (e.name === 'NotFoundError') {
        setError('No se encontró ninguna cámara en este dispositivo.')
      } else {
        setError(`Error al abrir la cámara: ${e.message || 'desconocido'}`)
      }
    }
  }, [facingMode])

  useEffect(() => {
    startCamera()
    return () => { stream?.getTracks().forEach(t => t.stop()) }
  }, [])

  useEffect(() => {
    startCamera()
  }, [facingMode])

  const capture = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !stream) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      if (!blob) return
      const file = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' })
      stream.getTracks().forEach(t => t.stop())
      setStream(null)
      onCapture(file)
    }, 'image/jpeg', 0.92)
  }, [stream, onCapture])

  const toggleCamera = useCallback(() => {
    setFacingMode(f => f === 'environment' ? 'user' : 'environment')
  }, [])

  const handleClose = useCallback(() => {
    stream?.getTracks().forEach(t => t.stop())
    setStream(null)
    onClose()
  }, [stream, onClose])

  /* Va por portal a document.body: si se renderiza en su sitio, queda atrapada
     en el stacking context que crea el `animation` del contenedor de la pestaña
     y los modales portaleados la tapan por muy alto que sea su z-index.
     El z-index queda por encima de modales (200/210) y menús (300). */
  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: '#000',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>
      {error ? (
        <div style={{ textAlign: 'center', padding: 40, maxWidth: 400 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ff4d6a" strokeWidth="1.6" style={{ marginBottom: 16 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Cámara no disponible</div>
          <div style={{ color: '#b6b2a6', fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>{error}</div>
          <button onClick={handleClose}
            style={{ padding: '12px 24px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Cerrar
          </button>
        </div>
      ) : (
        <>
          <video ref={videoRef} autoPlay playsInline muted
            style={{ width: '100%', maxWidth: 500, maxHeight: '70vh', objectFit: 'cover', borderRadius: 16, transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <div style={{ display: 'flex', gap: 20, marginTop: 24, alignItems: 'center' }}>
            <button onClick={handleClose}
              style={{ width: 48, height: 48, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>

            <button onClick={capture}
              style={{ width: 72, height: 72, borderRadius: '50%', border: '4px solid #F5C518', background: 'rgba(245,197,24,0.15)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>
            </button>

            <button onClick={toggleCamera} title="Cambiar cámara"
              style={{ width: 48, height: 48, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </button>
          </div>
        </>
      )}
    </div>,
    document.body
  )
}
