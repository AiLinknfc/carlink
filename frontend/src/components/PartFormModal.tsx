'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase'

interface Props {
  vehicleId: string
  editPart?: any | null
  onClose: () => void
  onSaved: () => void
}

export default function PartFormModal({ vehicleId, editPart, onClose, onSaved }: Props) {
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [partNumber, setPartNumber] = useState('')
  const [status, setStatus] = useState('ok')
  const [mileageInstalled, setMileageInstalled] = useState('')
  const [lifespanMileage, setLifespanMileage] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editPart) {
      setName(editPart.name || '')
      setBrand(editPart.brand || '')
      setPartNumber(editPart.part_number || '')
      setStatus(editPart.status || 'ok')
      setMileageInstalled(editPart.mileage_installed != null ? String(editPart.mileage_installed) : '')
      setLifespanMileage(editPart.lifespan_mileage != null ? String(editPart.lifespan_mileage) : '')
      setNotes(editPart.notes || '')
    }
  }, [editPart])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    setError('')
    const body = {
      vehicle_id: vehicleId,
      name: name.trim(),
      brand: brand.trim(),
      part_number: partNumber.trim(),
      status,
      mileage_installed: mileageInstalled ? parseInt(mileageInstalled) : null,
      lifespan_mileage: lifespanMileage ? parseInt(lifespanMileage) : null,
      notes: notes.trim(),
    }
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) { setError('Sesión expirada. Inicia sesión de nuevo.'); return }
      const url = editPart ? `/api/parts/${editPart.id}` : '/api/parts'
      const method = editPart ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const msg = await res.text().catch(() => '')
        setError(msg || `Error ${res.status}: no se pudo guardar la parte`)
        return
      }
      onSaved()
    } catch (e: any) {
      setError(e.message || 'Error de red. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', padding: 20 }}>
      <div ref={ref} style={{ width: '100%', maxWidth: 'min(480px, 94vw)', maxHeight: '90vh', overflowY: 'auto', background: '#141414', border: '1px solid rgba(245,197,24,0.25)', borderRadius: 20, padding: 'clamp(16px, 3.5vw, 28px)', boxShadow: '0 30px 80px rgba(0,0,0,.7)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontFamily: "'Anton',sans-serif", fontSize: 'clamp(20px,5vw,24px)', letterSpacing: '.01em' }}>{editPart ? 'Editar parte' : 'Nueva parte'}</h2>
            <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#7c786e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, display: 'block', marginBottom: 5 }}>Nombre de la parte *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Pastillas de freno" style={{ width: '100%', padding: '11px 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 14, outline: 'none' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, display: 'block', marginBottom: 5 }}>Marca / Proveedor</label>
                <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Ej. Bosch" style={{ width: '100%', padding: '11px 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 14, outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, display: 'block', marginBottom: 5 }}>N° de pieza</label>
                <input value={partNumber} onChange={e => setPartNumber(e.target.value)} placeholder="Opcional" style={{ width: '100%', padding: '11px 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 14, outline: 'none' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, display: 'block', marginBottom: 5 }}>Km instalado</label>
                <input value={mileageInstalled} onChange={e => setMileageInstalled(e.target.value)} type="number" placeholder="Ej. 45000" style={{ width: '100%', padding: '11px 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 14, outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, display: 'block', marginBottom: 5 }}>Vida útil (km)</label>
                <input value={lifespanMileage} onChange={e => setLifespanMileage(e.target.value)} type="number" placeholder="Ej. 60000" style={{ width: '100%', padding: '11px 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 14, outline: 'none' }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, display: 'block', marginBottom: 5 }}>Estado</label>
              <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: '100%', padding: '11px 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 14, outline: 'none', cursor: 'pointer' }}>
                <option value="ok">Bien</option>
                <option value="worn">Próximo a reemplazar</option>
                <option value="critical">Urgente</option>
                <option value="replaced">Reemplazado</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c786e', fontWeight: 700, display: 'block', marginBottom: 5 }}>Notas</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcional" rows={2} style={{ width: '100%', padding: '11px 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: '#f5f3ec', fontSize: 14, outline: 'none', resize: 'vertical' }} />
            </div>
          </div>
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 10, marginTop: 16, marginBottom: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 13 }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#b6b2a6', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleSave} disabled={!name.trim() || saving} style={{ flex: 1, padding: '12px', borderRadius: 11, border: 'none', background: !name.trim() || saving ? '#3a3a3a' : '#F5C518', color: '#111', fontWeight: 800, fontSize: 14, cursor: !name.trim() || saving ? 'default' : 'pointer' }}>
              {saving ? 'Guardando…' : editPart ? 'Guardar cambios' : 'Agregar parte'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    )
}
