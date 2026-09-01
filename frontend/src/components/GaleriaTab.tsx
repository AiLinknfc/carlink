'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useGallery } from '@/lib/hooks'
import { uploadFile, proxyUrl } from '@/lib/upload'
import CameraCapture from './CameraCapture'
import type { GalleryImage } from '@/lib/types'

const SUGGESTED_CATEGORIES = [
  'Frontal', 'Lateral derecha', 'Lateral izquierda', 'Trasera',
  'Motor', 'Tablero', 'Llantas', 'Maletero',
  'Interior delantero', 'Interior trasero', 'Puertas abiertas',
  'Capó abierto', 'Cajuela', 'Faroles', 'Parachoques',
  'Espejos', 'Aros', 'Suspensión', 'Frenos',
  'Kilometraje', 'Serial / VIN', 'Daños', 'Rayones', 'Techo',
]

interface Props {
  vehicleId: string | undefined
}

function EditableCaption({
  imageId,
  value,
  onSave,
}: {
  imageId: string
  value: string
  onSave: (id: string, caption: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  const commit = useCallback(async () => {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === value) {
      setEditing(false)
      return
    }
    setSaving(true)
    await onSave(imageId, trimmed)
    setSaving(false)
    setEditing(false)
  }, [draft, value, imageId, onSave])

  if (saving) {
    return (
      <span style={{ color: 'var(--text-3)', fontSize: 12, fontStyle: 'italic' }}>
        guardando…
      </span>
    )
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') { setDraft(value); setEditing(false) }
        }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          background: 'rgba(245,197,24,0.08)',
          border: '1px solid #F5C518',
          borderRadius: 6,
          padding: '6px 8px',
          fontSize: 13,
          color: '#fff8e6',
          outline: 'none',
          fontFamily: 'inherit',
          lineHeight: 1.3,
          boxSizing: 'border-box',
        }}
      />
    )
  }

  return (
    <span
      onClick={e => { e.stopPropagation(); setEditing(true) }}
      style={{
        cursor: 'text',
        borderBottom: '1px dashed rgba(245,197,24,0.3)',
        padding: '2px 0',
        display: 'inline-block',
        minHeight: 22,
      }}
      title="Toca para editar"
    >
      {value}
    </span>
  )
}

/* Botón de icono del encabezado — mismo estilo que FileCard. */
const iconBtn: React.CSSProperties = {
  width: 27, height: 27, borderRadius: 8, flex: '0 0 auto',
  border: '1px solid var(--border-2)', background: 'var(--surface-2)',
  color: 'var(--text-2)', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', transition: 'all .18s',
}

/* Botón pequeño dentro del overlay de preview — mismo que FileCard. */
const previewActionBtn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(0,0,0,0.5)',
  color: '#fff', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', transition: 'all .18s',
  backdropFilter: 'blur(4px)',
}

function GalleryCard({
  caption,
  image,
  uploading,
  onFilePick,
  onFileSelect,
  onDelete,
  onLightbox,
  onSaveCaption,
  onRemoveSpace,
}: {
  caption: string
  image: GalleryImage | undefined
  uploading: boolean
  onFilePick: (e: React.ChangeEvent<HTMLInputElement>, caption: string) => void
  onFileSelect: (file: File, caption: string) => void
  onDelete: (id: string, caption: string) => void
  onLightbox: (img: GalleryImage) => void
  onSaveCaption: (id: string, caption: string) => Promise<void>
  onRemoveSpace: () => void
}) {
  const [showScanModal, setShowScanModal] = useState(false)
  const [showCam, setShowCam] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasImage = Boolean(image)
  const idleBorder = hasImage ? 'rgba(245,197,24,0.22)' : 'var(--border)'

  const handleCameraCapture = (file: File) => {
    setShowCam(false)
    setShowScanModal(false)
    onFileSelect(file, caption)
  }

  const handleFilePick = (file: File) => {
    setShowScanModal(false)
    onFileSelect(file, caption)
  }

  return (
    <>
      {showCam && <CameraCapture onCapture={handleCameraCapture} onClose={() => setShowCam(false)} />}

      <div
        style={{
          height: 250, boxSizing: 'border-box',
          padding: 14, borderRadius: 18, background: 'var(--surface)',
          border: `1px solid ${idleBorder}`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)', transition: 'border-color .18s',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,197,24,0.4)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = idleBorder }}
      >
        {/* Título + controles — cabecera estilo FileCard */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, flex: '0 0 auto' }}>
          <div title={caption} style={{
            flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700, lineHeight: 1.25,
            overflowWrap: 'break-word',
            display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden',
          }}>
            {image ? (
              <EditableCaption
                imageId={image.id}
                value={image.caption || caption}
                onSave={onSaveCaption}
              />
            ) : caption}
          </div>
          {hasImage && (
            <span title="Con foto" style={{
              ...iconBtn, cursor: 'default',
              color: '#2ecc71', borderColor: '#2ecc71',
              background: 'rgba(46,204,113,0.08)',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            </span>
          )}
          {hasImage && (
            <>
              <label title="Reemplazar foto" style={iconBtn}
                onMouseEnter={e => { e.currentTarget.style.color = '#F5C518'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.4)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border-2)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                <input type="file" accept="image/*" onChange={e => onFilePick(e, caption)} style={{ display: 'none' }} />
              </label>
              <button onClick={() => onDelete(image!.id, caption)} title="Quitar foto" style={iconBtn}
                onMouseEnter={e => { e.currentTarget.style.color = '#F5C518'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.4)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border-2)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              </button>
            </>
          )}
          <button onClick={onRemoveSpace} title="Quitar este espacio" style={iconBtn}
            onMouseEnter={e => { e.currentTarget.style.color = '#ff4d6a'; e.currentTarget.style.borderColor = 'rgba(255,77,106,0.4)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border-2)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Slot del archivo — imagen o empty state */}
        <div style={{ flex: 1, minHeight: 0, borderRadius: 11, overflow: 'hidden' }}>
          {hasImage ? (
            <div
              onClick={() => onLightbox(image!)}
              onMouseEnter={() => setShowActions(true)}
              onMouseLeave={() => setShowActions(false)}
              style={{ position: 'relative', height: '100%', cursor: 'pointer', borderRadius: 11, overflow: 'hidden' }}
            >
              <img
                src={proxyUrl(image!.image_url)}
                alt={caption}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {/* Overlay con acciones — mismo estilo que FileCard */}
              <div style={{
                position: 'absolute', inset: 0,
                background: showActions ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.4)',
                opacity: showActions ? 1 : 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'opacity .18s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div title="Ampliar" style={previewActionBtn}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.6)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.5)' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/></svg>
                  </div>
                  <label title="Reemplazar foto" style={{ ...previewActionBtn, cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.6)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.5)' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    <input type="file" accept="image/*" onChange={e => { e.stopPropagation(); onFilePick(e, caption) }} style={{ display: 'none' }} />
                  </label>
                  <div title="Quitar foto" style={previewActionBtn}
                    onClick={e => { e.stopPropagation(); onDelete(image!.id, caption) }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.6)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.5)' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                  </div>
                </div>
                <span style={{ color: '#fff', fontSize: 11, fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>Ampliar</span>
              </div>
            </div>
          ) : (
            /* Empty state — estilo idéntico a FileCard */
            <button
              onClick={() => setShowScanModal(true)}
              style={{
                height: '100%', width: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 8,
                borderRadius: 11, border: '2px dashed rgba(245,197,24,0.35)',
                background: 'rgba(245,197,24,0.04)', color: '#F5C518',
                fontSize: 12, fontWeight: 600, textAlign: 'center', padding: '0 10px',
                cursor: 'pointer', transition: 'all .18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.1)'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.6)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.04)'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.35)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <span>Toca para subir o escanear</span>
            </button>
          )}
        </div>
      </div>

      {/* Modal de escaneo — estilo idéntico a FileCard */}
      {showScanModal && createPortal(
        <div onClick={() => setShowScanModal(false)} style={{
          position: 'fixed', inset: 0, zIndex: 72,
          background: 'rgba(4,4,4,0.72)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} className="modal-panel" style={{
            width: 480, maxWidth: '94vw',
            background: 'var(--panel-bg, #141414)', border: '1px solid var(--panel-border, rgba(245,197,24,0.3))', borderRadius: 20,
            padding: 24, boxShadow: '0 40px 90px rgba(0,0,0,.6)',
          }}>
            {/* Header — mismo que FileCard */}
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
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 800, lineHeight: 1.15, color: 'var(--text-1)' }}>
                    Subir o escanear
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3, #7c786e)', marginTop: 2 }}>
                    Captura o sube tu archivo
                  </div>
                </div>
              </div>
              <button onClick={() => setShowScanModal(false)} style={{
                width: 34, height: 34, borderRadius: 9,
                border: '1px solid var(--btn-ghost-border, rgba(255,255,255,0.14))',
                background: 'var(--btn-ghost-bg, rgba(255,255,255,0.05))', color: 'var(--btn-ghost-color, #b6b2a6)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Botones de acción — mismos que FileCard */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowScanModal(false); setShowCam(true) }}
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
                <span style={{ fontSize: 11, color: '#9a968a' }}>Imagen</span>
                <input ref={fileInputRef} type="file" accept="image/*"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFilePick(f); e.target.value = '' }}
                  style={{ display: 'none' }} />
              </label>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export default function GaleriaTab({ vehicleId }: Props) {
  const { images, loading, reload, addImage, updateImage, deleteImage } = useGallery(vehicleId)
  const [toast, setToast] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null)
  const [uploading, setUploading] = useState(false)
  const [extraSlots, setExtraSlots] = useState<{ id: string; caption: string }[]>([])
  const [showSlotModal, setShowSlotModal] = useState(false)
  const [slotName, setSlotName] = useState('')
  const [activeCategories, setActiveCategories] = useState<string[]>([...SUGGESTED_CATEGORIES.slice(0, 6)])

  const flash = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }, [])

  const handleUpload = useCallback(async (file: File, caption: string) => {
    if (!vehicleId) return
    setUploading(true)
    const url = await uploadFile(file, 'gallery')
    if (!url) { flash('Error al subir la imagen'); setUploading(false); return }
    await addImage({ vehicle_id: vehicleId, image_url: url, caption })
    setUploading(false)
    flash(`Foto "${caption}" agregada`)
  }, [vehicleId, addImage, flash])

  const handleDelete = useCallback(async (id: string, caption: string) => {
    await deleteImage(id)
    flash(`Foto "${caption}" eliminada`)
  }, [deleteImage, flash])

  const handleFilePick = useCallback((e: React.ChangeEvent<HTMLInputElement>, caption: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    handleUpload(file, caption)
    e.target.value = ''
  }, [handleUpload])

  const handleFileSelect = useCallback((file: File, caption: string) => {
    handleUpload(file, caption)
  }, [handleUpload])

  const handleSaveCaption = useCallback(async (id: string, caption: string) => {
    await updateImage(id, { caption })
    flash('Título actualizado')
  }, [updateImage, flash])

  const imageMap = new Map<string, GalleryImage>()
  images.forEach(img => {
    const key = img.caption || 'sin-titulo'
    if (!imageMap.has(key)) imageMap.set(key, img)
  })

  /* Un espacio activo puede venir de una categoría sugerida o de uno propio;
     el chip los trata igual y sólo se diferencian al quitarlos. */
  const allCategoriesActive = SUGGESTED_CATEGORIES.every(c => activeCategories.includes(c))

  const activeSpacesRaw = [
    ...activeCategories.map(c => ({ key: `cat-${c}`, caption: c, isCategory: true })),
    ...extraSlots.map(sl => ({ key: sl.id, caption: sl.caption, isCategory: false })),
  ]

  /* Si no todos los sugeridos están activos, reordenar: los que tienen foto
     primero, para que la galería se vea más completa de entrada. Cuando todos
     están activos, se mantiene el orden propuesto. */
  const activeSpaces = allCategoriesActive
    ? activeSpacesRaw
    : [...activeSpacesRaw].sort((a, b) => {
        const aHas = imageMap.has(a.caption) ? 0 : 1
        const bHas = imageMap.has(b.caption) ? 0 : 1
        return aHas - bHas
      })

  /* Sugerencias que aún no están activas — son las que ofrece el desplegable. */
  const availableCategories = SUGGESTED_CATEGORIES.filter(c => !activeCategories.includes(c))

  const removeSpace = useCallback((sp: { key: string; caption: string; isCategory: boolean }) => {
    if (sp.isCategory) setActiveCategories(prev => prev.filter(c => c !== sp.caption))
    else setExtraSlots(prev => prev.filter(sl => sl.id !== sp.key))
    flash(`"${sp.caption}" quitado de la galería`)
  }, [flash])

  const addExtraSlot = useCallback(() => {
    const name = slotName.trim()
    if (!name) return
    /* Si coincide con una sugerida se activa como categoría en vez de duplicarla
       como espacio propio, así el chip y el desplegable no se contradicen. */
    if (SUGGESTED_CATEGORIES.includes(name)) {
      if (!activeCategories.includes(name)) setActiveCategories(prev => [...prev, name])
    } else {
      setExtraSlots(prev => [...prev, { id: 'slot-' + Date.now(), caption: name }])
    }
    setShowSlotModal(false)
    flash(`"${name}" agregado a la galería`)
  }, [slotName, activeCategories, flash])

  useEffect(() => { if (vehicleId) reload() }, [vehicleId, reload])

  return (
    <div style={{ animation: 'sectionIn .55s cubic-bezier(0.22,1,0.36,1) both', maxWidth: 960 }}>
      {/* Toast */}
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
          <span style={{
            width: 22, height: 22, borderRadius: '50%',
            background: '#F5C518', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: '#111',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          </span>
          {toast}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && createPortal(
        <div onClick={() => setLightbox(null)} style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.92)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 24, cursor: 'zoom-out',
        }}>
          <img src={proxyUrl(lightbox.image_url)} alt={lightbox.caption}
            style={{
              maxWidth: '94vw', maxHeight: '82vh', borderRadius: 20,
              boxShadow: '0 30px 90px rgba(0,0,0,.7)',
              border: '1px solid rgba(245,197,24,0.3)',
              objectFit: 'contain',
            }}
          />
          <div style={{ marginTop: 12, fontSize: 14, color: '#fff8e6', fontWeight: 600 }}>
            {lightbox.caption}
          </div>
        </div>,
        document.body
      )}

      {/* Modal espacio personalizado — mismo patrón que "Nuevo documento" */}
      {showSlotModal && createPortal(
        <div onClick={() => setShowSlotModal(false)} style={{
          position: 'fixed', inset: 0, zIndex: 72,
          background: 'rgba(4,4,4,0.72)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} className="modal-panel" style={{
            width: 480, maxWidth: '94vw',
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                </span>
                <div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 800, lineHeight: 1.15, color: 'var(--text-1)' }}>Espacio personalizado</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Crea un espacio propio para tus fotos</div>
                </div>
              </div>
              <button onClick={() => setShowSlotModal(false)} style={{
                width: 32, height: 32, borderRadius: 8,
                border: '1px solid var(--btn-ghost-border)',
                background: 'var(--btn-ghost-bg)', color: 'var(--btn-ghost-color)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Sugerencias que aún no están activas */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Espacios sugeridos</label>
              <select value={SUGGESTED_CATEGORIES.includes(slotName) ? slotName : ''}
                onChange={e => setSlotName(e.target.value)}
                disabled={availableCategories.length === 0}
                style={{
                  width: '100%', padding: '11px 13px', borderRadius: 10,
                  border: '1px solid var(--input-border, rgba(255,255,255,0.14))',
                  background: 'var(--input-bg, rgba(255,255,255,0.04))',
                  color: 'var(--text-2, #f5f3ec)',
                  fontSize: 14, outline: 'none', cursor: 'pointer',
                }}>
                <option value="">{availableCategories.length ? 'Elige uno de la lista…' : 'Ya agregaste todos los sugeridos'}</option>
                {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 14px' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700 }}>o</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Nombre propio</label>
              <input value={slotName} onChange={e => setSlotName(e.target.value)} autoFocus
                onKeyDown={e => { if (e.key === 'Enter' && slotName.trim()) addExtraSlot() }}
                placeholder="Ej. Techo panorámico"
                style={{
                  width: '100%', padding: '11px 13px', borderRadius: 10,
                  border: '1px solid var(--input-border)', background: 'var(--input-bg)',
                  color: 'var(--text-1)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowSlotModal(false)} style={{
                flex: 1, padding: 12, borderRadius: 12,
                border: '1px solid rgba(245,197,24,0.3)', background: 'transparent',
                color: '#F5C518', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}>Cancelar</button>
              <button onClick={addExtraSlot} disabled={!slotName.trim()} style={{
                flex: 2, padding: 13, borderRadius: 12, border: 'none',
                background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 14,
                cursor: slotName.trim() ? 'pointer' : 'default',
                transition: 'all .18s', opacity: slotName.trim() ? 1 : 0.5,
              }}>Crear espacio</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Header */}
      <div style={{ marginBottom: 16, animation: 'textIn .5s .04s both' }}>
        <div style={{ fontSize: 12, letterSpacing: '.24em', textTransform: 'uppercase', fontWeight: 700, color: '#F5C518' }}>
          Evidencia visual
        </div>
        <h1 style={{
          fontFamily: 'var(--font-ui)', fontSize: 'clamp(24px,2.6vw,32px)',
          fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.15, margin: '2px 0 4px',
        }}>
          Galería del vehículo
        </h1>
        <p style={{ color: 'var(--text-2)', margin: 0 }}>
          Toca cada espacio para subir fotos. Toca el título de la foto para editarlo.
        </p>
        <button onClick={() => { setSlotName(''); setShowSlotModal(true) }} style={{
          marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '12px 20px', borderRadius: 12,
          border: 'none', background: '#F5C518', color: '#111',
          fontWeight: 800, fontSize: 13, cursor: 'pointer',
          boxShadow: '0 0 20px rgba(245,197,24,0.35)', transition: 'all .16s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = '#e6b300' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#F5C518' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Espacio personalizado
        </button>
      </div>

      {/* Espacios activos — las sugerencias sin activar viven en el modal */}
      <div style={{ marginBottom: 16, animation: 'textIn .5s .06s both' }}>
        <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700, marginBottom: 10 }}>
          {activeSpaces.length} espacios activos
        </div>
        {/* Solo indicativos: quitar un espacio se hace desde su propia card. */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {activeSpaces.map(sp => (
            <span key={sp.key} style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '8px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              border: '1px solid rgba(245,197,24,0.5)', background: 'rgba(245,197,24,0.12)',
              color: '#F5C518', whiteSpace: 'nowrap', userSelect: 'none',
            }}>
              {sp.caption}
            </span>
          ))}
          {activeSpaces.length === 0 && (
            <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Ninguno todavía — agrega uno con el botón de arriba.</span>
          )}
        </div>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', borderRadius: 11,
          background: 'rgba(245,197,24,0.08)',
          border: '1px solid rgba(245,197,24,0.3)',
          marginBottom: 16, animation: 'fadeUp .3s both',
        }}>
          <div style={{
            width: 18, height: 18, borderRadius: '50%',
            border: '2px solid rgba(245,197,24,0.2)',
            borderTopColor: '#F5C518',
            animation: 'spin .7s linear infinite',
          }}/>
          <span style={{ fontSize: 13, color: '#d8c98a' }}>Subiendo imagen...</span>
        </div>
      )}

      {/* Gallery grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))',
        gap: 16,
        animation: 'textIn .5s .1s both',
      }}>
        {activeSpaces.map(sp => {
          const caption = sp.caption
          const img = imageMap.get(caption)
          return (
            <GalleryCard
              key={sp.key}
              caption={caption}
              image={img}
              uploading={uploading}
              onFilePick={handleFilePick}
              onFileSelect={handleFileSelect}
              onDelete={handleDelete}
              onLightbox={setLightbox}
              onSaveCaption={handleSaveCaption}
              onRemoveSpace={() => removeSpace(sp)}
            />
          )
        })}
      </div>

      {!loading && images.length === 0 && activeCategories.length === 0 && extraSlots.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)', fontSize: 14 }}>
          Agrega un espacio con el botón «Espacio personalizado» para empezar.
        </div>
      )}
    </div>
  )
}
