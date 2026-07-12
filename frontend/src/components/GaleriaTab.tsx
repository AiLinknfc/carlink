'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useGallery } from '@/lib/hooks'
import { uploadFile } from '@/lib/upload'
import type { GalleryImage } from '@/lib/types'

const DEFAULT_CATEGORIES = [
  'Frontal', 'Lateral', 'Trasera', 'Motor', 'Tablero', 'Llantas',
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

function GalleryCard({
  caption,
  image,
  uploading,
  onFilePick,
  onDelete,
  onLightbox,
  onSaveCaption,
}: {
  caption: string
  image: GalleryImage | undefined
  uploading: boolean
  onFilePick: (e: React.ChangeEvent<HTMLInputElement>, caption: string) => void
  onDelete: (id: string, caption: string) => void
  onLightbox: (img: GalleryImage) => void
  onSaveCaption: (id: string, caption: string) => Promise<void>
}) {
  return (
    <div
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        background: 'var(--surface)',
        border: `1px solid ${image ? 'rgba(245,197,24,0.22)' : 'var(--border)'}`,
        transition: 'border-color .18s',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,197,24,0.4)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = image ? 'rgba(245,197,24,0.22)' : 'var(--border)' }}
    >
      <label
        style={{
          display: 'block',
          position: 'relative',
          width: '100%',
          aspectRatio: '4/3',
          cursor: 'pointer',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {image ? (
          <>
            <img
              src={image.image_url}
              alt={caption}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {/* Desktop hover overlay */}
            <div
              style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.4)',
                opacity: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'opacity .18s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0'}
            >
              <span
                onClick={e => { e.preventDefault(); e.stopPropagation(); onLightbox(image) }}
                style={{
                  padding: '8px 14px', borderRadius: 8,
                  background: 'rgba(0,0,0,0.6)', color: '#fff',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 4 }}>
                  <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/>
                </svg>
                Ampliar
              </span>
            </div>
            {/* Delete button — always visible on mobile (via translucent bg), visible on hover on desktop */}
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete(image.id, caption) }}
              style={{
                position: 'absolute', top: 6, right: 6,
                width: 32, height: 32,
                borderRadius: '50%', border: 'none',
                background: 'rgba(0,0,0,0.55)',
                color: '#fff', fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 2,
                backdropFilter: 'blur(4px)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </>
        ) : (
          <div
            style={{
              width: '100%', height: '100%',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 8, color: 'var(--text-3)', fontSize: 12, fontWeight: 600,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
            <span>{caption}</span>
          </div>
        )}
        <input type="file" accept="image/*" onChange={e => onFilePick(e, caption)} style={{ display: 'none' }} />
      </label>

      {/* Footer with editable caption */}
      <div
        style={{
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          minHeight: 44,
        }}
      >
        {image ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <EditableCaption
              imageId={image.id}
              value={image.caption || caption}
              onSave={onSaveCaption}
            />
          </div>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{caption}</span>
        )}
        {/* Touch target: lightbox button always visible on mobile */}
        {image && (
          <button
            onClick={() => onLightbox(image)}
            style={{
              flexShrink: 0,
              width: 34, height: 34,
              borderRadius: 8,
              border: '1px solid rgba(245,197,24,0.25)',
              background: 'rgba(245,197,24,0.08)',
              color: '#F5C518',
              fontSize: 16,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
            title="Ampliar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

export default function GaleriaTab({ vehicleId }: Props) {
  const { images, loading, reload, addImage, updateImage, deleteImage } = useGallery(vehicleId)
  const [toast, setToast] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null)
  const [uploading, setUploading] = useState(false)
  const [extraSlots, setExtraSlots] = useState<{ id: string; caption: string }[]>([])

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

  const handleSaveCaption = useCallback(async (id: string, caption: string) => {
    await updateImage(id, { caption })
    flash('Título actualizado')
  }, [updateImage, flash])

  const addExtraSlot = useCallback(() => {
    const id = 'slot-' + Date.now()
    setExtraSlots(prev => [...prev, { id, caption: `Foto extra ${prev.length + 1}` }])
    flash('Nuevo espacio para foto agregado')
  }, [flash])

  useEffect(() => { if (vehicleId) reload() }, [vehicleId, reload])

  const imageMap = new Map<string, GalleryImage>()
  images.forEach(img => {
    const key = img.caption || 'sin-titulo'
    if (!imageMap.has(key)) imageMap.set(key, img)
  })

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
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position: 'fixed', inset: 0, zIndex: 75,
          background: 'rgba(4,4,4,0.88)', backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 24, cursor: 'zoom-out',
        }}>
          <img src={lightbox.image_url} alt={lightbox.caption}
            style={{
              maxWidth: '92vw', maxHeight: '80vh', borderRadius: 14,
              boxShadow: '0 30px 90px rgba(0,0,0,.7)',
              border: '1px solid rgba(245,197,24,0.3)',
            }}
          />
          <div style={{ marginTop: 12, fontSize: 14, color: 'var(--text-2)' }}>
            {lightbox.caption}
          </div>
          <button onClick={() => setLightbox(null)} style={{
            marginTop: 16, padding: '10px 20px', borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.06)', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            Cerrar
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 22, animation: 'textIn .5s .04s both' }}>
        <div style={{ fontSize: 12, letterSpacing: '.24em', textTransform: 'uppercase', fontWeight: 700, color: '#F5C518' }}>
          Evidencia visual
        </div>
        <h1 style={{
          fontFamily: "'Anton',sans-serif", fontSize: 'clamp(30px,3.8vw,46px)',
          letterSpacing: '.01em', margin: '8px 0 8px', textTransform: 'uppercase',
        }}>
          Galería del vehículo
        </h1>
        <p style={{ color: 'var(--text-2)', margin: 0 }}>
          Toca cada espacio para subir fotos. Toca el título de la foto para editarlo.
        </p>
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

      {/* Add slot button */}
      <button onClick={addExtraSlot}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '12px 20px', borderRadius: 12,
          border: 'none', background: '#F5C518', color: '#111',
          fontWeight: 800, fontSize: 13, cursor: 'pointer',
          marginBottom: 16, transition: 'all .16s',
          boxShadow: '0 0 20px rgba(245,197,24,0.35)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#e6b300' }}
        onMouseLeave={e => { e.currentTarget.style.background = '#F5C518' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
        Agregar espacio
      </button>

      {/* Gallery grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))',
        gap: 16,
        animation: 'textIn .5s .1s both',
      }}>
        {([...DEFAULT_CATEGORIES, ...extraSlots] as (string | { id: string; caption: string })[]).map((slot, i) => {
          const caption = typeof slot === 'string' ? slot : slot.caption
          const img = imageMap.get(caption)
          const key = typeof slot === 'string' ? slot : slot.id
          return (
            <GalleryCard
              key={key}
              caption={caption}
              image={img}
              uploading={uploading}
              onFilePick={handleFilePick}
              onDelete={handleDelete}
              onLightbox={setLightbox}
              onSaveCaption={handleSaveCaption}
            />
          )
        })}
      </div>

      {!loading && images.length === 0 && extraSlots.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)', fontSize: 14 }}>
          Aún no hay fotos. Usa el botón &quot;+ Agregar espacio&quot; para empezar.
        </div>
      )}
    </div>
  )
}
