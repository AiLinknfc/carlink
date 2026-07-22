'use client'

import { useState, useEffect } from 'react'
import { apiGet, apiPut } from '@/lib/api'

interface WorkshopConfigTabProps {
  theme: 'light' | 'dark'
}

export default function WorkshopConfigTab({ theme }: WorkshopConfigTabProps) {
  const [stampsRequired, setStampsRequired] = useState(6)
  const [promoDesc, setPromoDesc] = useState('')
  const [workshopName, setWorkshopName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  const isDark = theme === 'dark'
  const textPrimary = isDark ? '#f5f3ec' : '#17171a'
  const textMuted = isDark ? '#7c786e' : '#7a756a'
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)'
  const border = isDark ? 'rgba(245,197,24,0.22)' : 'rgba(17,17,17,0.12)'
  const subtle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,17,0.08)'
  const inputBg = isDark ? 'rgba(0,0,0,0.35)' : '#ffffff'

  useEffect(() => {
    apiGet('/workshops/me').then((w: any) => {
      if (w) {
        setStampsRequired(w.stamps_required || 6)
        setPromoDesc(w.promotion_description || '')
        setWorkshopName(w.name || '')
      }
    }).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiPut('/workshops/me', {
        stamps_required: stampsRequired,
        promotion_description: promoDesc,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: textMuted, fontSize: 13 }}>Cargando configuración…</div>
  }

  return (
    <div style={{ animation: 'sectionIn .4s both', maxWidth: 560 }}>
      <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 800, margin: '0 0 6px' }}>
        Configuración de promoción
      </h2>
      <p style={{ fontSize: 13, color: textMuted, margin: '0 0 24px', lineHeight: 1.5 }}>
        Define cuántos sellos necesita un cliente para obtener un beneficio y personaliza la descripción de tu promoción.
      </p>

      {/* Preview de sellos */}
      <div style={{ padding: 20, borderRadius: 16, background: cardBg, border: `1px solid ${border}`, marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#F5C518', marginBottom: 12 }}>
          Vista previa — Sellos del cliente
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {Array.from({ length: stampsRequired }).map((_, i) => (
            <div key={i} style={{
              width: 32, height: 32, borderRadius: '50%',
              border: '2px solid rgba(245,197,24,0.4)',
              background: 'rgba(245,197,24,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#F5C518',
            }}>
              {i + 1}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: textMuted }}>
          {stampsRequired} sellos para obtener el beneficio
        </div>
      </div>

      {/* Config */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>
            Sellos requeridos para beneficio
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="range"
              min={1}
              max={20}
              value={stampsRequired}
              onChange={e => setStampsRequired(parseInt(e.target.value))}
              style={{ flex: 1, accentColor: '#F5C518' }}
            />
            <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 28, color: '#F5C518', minWidth: 40, textAlign: 'center' }}>
              {stampsRequired}
            </span>
          </div>
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>
            Descripción de la promoción
          </label>
          <textarea
            rows={3}
            value={promoDesc}
            onChange={e => setPromoDesc(e.target.value)}
            placeholder="Ej. Cambio de aceite gratis al completar todos los sellos"
            style={{
              width: '100%', padding: '11px 13px', borderRadius: 11,
              border: `1px solid ${subtle}`, background: inputBg,
              color: textPrimary, fontSize: 13, outline: 'none', resize: 'none',
              fontFamily: 'inherit', lineHeight: 1.5,
            }}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '13px 24px', borderRadius: 12, border: 'none',
            background: saved ? '#2ecc71' : '#F5C518', color: '#111',
            fontWeight: 800, fontSize: 14, cursor: 'pointer',
            opacity: saving ? 0.6 : 1, transition: 'all .2s',
          }}
        >
          {saving ? 'Guardando…' : saved ? '¡Guardado!' : 'Guardar configuración'}
        </button>

        {saved && (
          <div style={{ padding: 12, borderRadius: 11, background: 'rgba(46,204,113,0.1)', border: '1px solid rgba(46,204,113,0.25)', color: '#2ecc71', fontSize: 12.5, textAlign: 'center' }}>
            Configuración de promoción actualizada para {workshopName}
          </div>
        )}
      </div>
    </div>
  )
}
