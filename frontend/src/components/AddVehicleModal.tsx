'use client'

import { useState } from 'react'
import { apiPost } from '@/lib/api'
import { formatPlate } from '@/lib/plate'

const BRANDS = [
  'Chevrolet', 'Renault', 'Mazda', 'Toyota', 'Nissan', 'Kia', 'Hyundai',
  'Volkswagen', 'Ford', 'Suzuki', 'BMW', 'Mercedes-Benz', 'Audi', 'Mitsubishi',
]

/* Mismo criterio que app/register/page.tsx: en Colombia "sedán" se reconoce
   como carrocería, no como tipo de vehículo del día a día. */
const VEHICLE_TYPES = ['Auto', 'SUV', 'Camioneta', 'Moto', 'Deportivo', 'Hatchback', 'Pickup', 'Furgoneta']

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 30 }, (_, i) => CURRENT_YEAR + 1 - i)

interface Props {
  onClose: () => void
  /** true si esta cuenta no tenía ningún vehículo antes de este — solo ese
   * caso recibe la ficha de prueba gratis de taller/empresa (ver
   * backend/app/routers/vehicles.py::create_vehicle). Sirve para elegir el
   * mensaje correcto después de crear. */
  isFirstVehicle: boolean
  isBusinessAccount: boolean
  onCreated: (vehicle: any) => void
}

export default function AddVehicleModal({ onClose, isFirstVehicle, isBusinessAccount, onCreated }: Props) {
  const [plateLetters, setPlateLetters] = useState('')
  const [plateNumbers, setPlateNumbers] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState(CURRENT_YEAR)
  const [type, setType] = useState(VEHICLE_TYPES[0])
  const [color, setColor] = useState('')
  const [city, setCity] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ vehicle: any; gotTrial: boolean } | null>(null)

  const plate = formatPlate(plateLetters, plateNumbers)
  const canSubmit = plateLetters.length === 3 && plateNumbers.length === 3 && brand && model.trim() && !saving

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    const created = await apiPost('/vehicles', { plate, brand, model: model.trim(), year, type, color, city })
    setSaving(false)
    if (!created) {
      setError('No se pudo agregar el vehículo — revisa la placa e intenta de nuevo.')
      return
    }
    // El backend solo mintea la ficha de prueba gratis en el primer vehículo
    // de una cuenta taller/empresa (docs/PENDIENTES.md "Modelo de cuentas
    // taller/persona") — cualquier otro caso necesita llavero comprado.
    const gotTrial = isBusinessAccount && isFirstVehicle
    setResult({ vehicle: created, gotTrial })
  }

  if (result) {
    return (
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(4,4,4,0.74)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div onClick={e => e.stopPropagation()} className="modal-panel" style={{ width: 440, maxWidth: '94vw', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: 20, padding: 26, boxShadow: '0 40px 90px rgba(0,0,0,.5)', textAlign: 'center' }}>
          <span style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(46,204,113,0.12)', border: '2px solid #2ecc71', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2ecc71', margin: '0 auto 14px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          </span>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 800, color: 'var(--text-1)', marginBottom: 6 }}>Vehículo agregado</div>
          <div style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 18, lineHeight: 1.5 }}>
            {result.gotTrial ? (
              <>{result.vehicle.plate} ya tiene su ficha de prueba activa por 7 días — se generó automáticamente.</>
            ) : (
              <>{result.vehicle.plate} quedó guardado en tu cuenta. Para que tenga ficha pública escaneable
                necesitás comprar y activar un llavero NFC para él — un llavero es siempre para un solo vehículo.</>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {!result.gotTrial && (
              <a href="/shop" style={{ flex: 1, padding: 12, borderRadius: 11, border: '1px solid rgba(245,197,24,0.4)', background: 'transparent', color: '#F5C518', fontWeight: 700, fontSize: 13, cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Comprar llavero
              </a>
            )}
            <button onClick={() => onCreated(result.vehicle)} style={{ flex: 1, padding: 12, borderRadius: 11, border: 'none', background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
              Ver este vehículo
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(4,4,4,0.74)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} className="modal-panel" style={{ width: 480, maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: 20, padding: 24, boxShadow: '0 40px 90px rgba(0,0,0,.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 800, color: 'var(--text-1)' }}>Agregar vehículo</div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--btn-ghost-border)', background: 'var(--btn-ghost-bg)', color: 'var(--btn-ghost-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {!isFirstVehicle && (
          <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5, margin: '4px 0 16px' }}>
            {isBusinessAccount
              ? 'Este no es tu primer vehículo, así que no recibe ficha de prueba gratis — vas a necesitar comprar y activar un llavero NFC aparte para él.'
              : 'Vas a necesitar comprar y activar un llavero NFC para que este vehículo tenga ficha pública.'}
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14, marginTop: isFirstVehicle ? 16 : 0 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Placa</label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input value={plateLetters} onChange={e => setPlateLetters(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3))} maxLength={3} placeholder="ABC"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: '#F5C518', fontFamily: 'var(--font-display)', fontSize: 17, letterSpacing: '.03em', outline: 'none' }} />
              <span style={{ padding: '0 6px', color: '#F5C518', fontFamily: 'var(--font-display)', fontSize: 17 }}>-</span>
              <input value={plateNumbers} onChange={e => setPlateNumbers(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))} maxLength={3} placeholder="123"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: '#F5C518', fontFamily: 'var(--font-display)', fontSize: 17, letterSpacing: '.03em', outline: 'none' }} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Ciudad</label>
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="Bogotá"
              style={{ width: '100%', padding: '11px 12px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-1)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Marca</label>
            <input value={brand} onChange={e => setBrand(e.target.value)} list="addVehicleBrands" placeholder="Elige o escribe"
              style={{ width: '100%', padding: '11px 12px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-1)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            <datalist id="addVehicleBrands">{BRANDS.map(b => <option key={b} value={b} />)}</datalist>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Modelo</label>
            <input value={model} onChange={e => setModel(e.target.value)} placeholder="Ej. 3, Duster, Spark"
              style={{ width: '100%', padding: '11px 12px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-1)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Año</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              style={{ width: '100%', padding: '11px 8px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-1)', fontSize: 14, outline: 'none', cursor: 'pointer' }}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Tipo</label>
            <select value={type} onChange={e => setType(e.target.value)}
              style={{ width: '100%', padding: '11px 8px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-1)', fontSize: 14, outline: 'none', cursor: 'pointer' }}>
              {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Color</label>
            <input value={color} onChange={e => setColor(e.target.value)} placeholder="Blanco"
              style={{ width: '100%', padding: '11px 12px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-1)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        {error && <div style={{ fontSize: 12.5, color: '#ff4d6a', marginBottom: 14 }}>{error}</div>}

        <button onClick={handleSubmit} disabled={!canSubmit}
          style={{
            width: '100%', padding: 14, borderRadius: 13, border: 'none',
            background: saving ? 'rgba(245,197,24,0.4)' : '#F5C518', color: '#111',
            fontWeight: 800, fontSize: 14.5, cursor: canSubmit ? 'pointer' : 'not-allowed',
            opacity: canSubmit ? 1 : 0.5, transition: 'all .16s',
          }}>
          {saving ? 'Agregando…' : 'Agregar vehículo'}
        </button>
      </div>
    </div>
  )
}
