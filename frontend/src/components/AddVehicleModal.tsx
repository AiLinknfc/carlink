'use client'

import { useState, useEffect, useMemo } from 'react'
import { apiPost } from '@/lib/api'
import { formatPlate, getPlateConfig, PLATE_TYPE_LABELS, type PlateType } from '@/lib/plate'
import { brandsForType, plateTypeFor, VEHICLE_TYPES, modelSuggestions, COLORS } from '@/lib/vehicleBrands'
import { CITIES } from '@/lib/constants'
import ThemedSuggestInput from './ThemedSuggestInput'

/* CSS vars (no un objeto de tema en JS como register/page.tsx) porque este
   modal ya usaba var(--input-bg)/var(--text-1)/etc. en todos sus otros
   campos — siguen el tema claro/oscuro solas, sin cálculo. */
const SUGGEST_THEME = { inputBg: 'var(--input-bg)', inputBorder: 'var(--input-border)', inputText: 'var(--text-1)', accent: '#F5C518', muted: 'var(--text-3)', panelBg: 'var(--panel-bg)' }

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 30 }, (_, i) => CURRENT_YEAR + 1 - i)
const YEAR_OPTIONS = YEARS.map(String)

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

  const plateType: PlateType = plateTypeFor(type)
  const plateConfig = getPlateConfig(plateType)
  const plate = formatPlate(plateLetters, plateNumbers, plateType)
  const plateComplete = plateLetters.length === plateConfig.letterLen && plateNumbers.length === (plateConfig.moto ? 3 : plateConfig.numLen)
  // Color ahora es obligatorio como el resto de los campos (pedido explícito) —
  // antes quedaba afuera de esta validación, se podía agregar el vehículo sin elegirlo.
  const canSubmit = plateComplete && brand && model.trim() && color && !saving
  const brandOptions = brandsForType(type)
  // Mismas sugerencias de modelo que app/register/page.tsx (@/lib/vehicleBrands,
  // antes vivían solo ahí) — filtradas por marca + tipo + año.
  const modelOptions = useMemo(() => modelSuggestions(brand, type, year), [brand, type, year])
  // La placa de moto colombiana usa una letra en el 3er carácter del segundo
  // grupo (ABC-12D) — apenas aparece, es inconfundiblemente una moto sin
  // esperar a que el resto del campo esté lleno.
  const looksLikeMoto = /[A-Z]/.test(plateNumbers)

  // Si cambian de carrocería y la marca elegida no existe en la lista nueva
  // (ej. Chevrolet con tipo Moto), se limpia en vez de dejar una combinación
  // imposible.
  useEffect(() => {
    if (brand && !brandOptions.includes(brand)) { setBrand(''); setModel('') }
  }, [type]) // eslint-disable-line react-hooks/exhaustive-deps

  // La placa manda sobre el Tipo, no al revés — antes era al revés (el campo
  // de números solo aceptaba letras si Tipo ya era "Moto", así que no se
  // podía ni escribir una placa de moto sin elegir el tipo primero). Apenas
  // se detecta una letra en el segundo grupo, cambia solo a Moto; si se borra
  // esa letra y el campo queda con 3 dígitos completos, vuelve al tipo por
  // defecto — nunca fuerza nada mientras el campo sigue incompleto y ambiguo.
  useEffect(() => {
    if (looksLikeMoto && type !== 'Moto') setType('Moto')
    else if (!looksLikeMoto && plateNumbers.length === 3 && type === 'Moto') setType(VEHICLE_TYPES[0])
  }, [plateNumbers]) // eslint-disable-line react-hooks/exhaustive-deps

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
              <input value={plateLetters} onChange={e => setPlateLetters(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, plateConfig.letterLen))} maxLength={plateConfig.letterLen} placeholder={'A'.repeat(plateConfig.letterLen)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: '#F5C518', fontFamily: 'var(--font-display)', fontSize: 17, letterSpacing: '.03em', outline: 'none' }} />
              <span style={{ padding: '0 6px', color: '#F5C518', fontFamily: 'var(--font-display)', fontSize: 17 }}>-</span>
              {/* Siempre acepta letras y números acá — antes solo dejaba
                  escribir una letra si Tipo ya era "Moto", así que era
                  imposible siquiera escribir una placa de moto sin elegirlo
                  primero. El límite de 3 caracteres cubre ambos formatos que
                  este Tipo puede representar (3 dígitos o 2 dígitos + letra). */}
              <input value={plateNumbers} onChange={e => setPlateNumbers(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 3))} maxLength={3} placeholder={plateConfig.moto ? '12D' : plateConfig.placeholder.split('-')[1]}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: '#F5C518', fontFamily: 'var(--font-display)', fontSize: 17, letterSpacing: '.03em', outline: 'none' }} />
            </div>
            {/* Se resalta apenas se reconoce una placa de moto — el Tipo ya
                se actualizó solo (ver el useEffect de arriba), esto es la
                confirmación visible de que pasó. */}
            {looksLikeMoto && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: '#F5C518', background: 'rgba(245,197,24,0.14)', border: '1px solid rgba(245,197,24,0.4)', borderRadius: 999, padding: '3px 9px', marginTop: 6, fontWeight: 700 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                Placa de {PLATE_TYPE_LABELS.moto} detectada
              </div>
            )}
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Ciudad</label>
            {/* Mismas opciones que app/register/page.tsx (@/lib/constants), no
                una lista aparte — mismo componente que Marca/Modelo en vez del
                <select> nativo (colores del sistema, esquinas rectas, ese azul
                que no es el de la app). */}
            <ThemedSuggestInput value={city} onChange={setCity} suggestions={CITIES} placeholder="Elige o escribe"
              style={{ padding: '11px 12px', fontSize: 14 }} theme={SUGGEST_THEME} />
          </div>
        </div>

        {/* Orden pedido: Marca, Tipo, Año, Modelo, Color — misma distribución
            de grillas (2 columnas + 3 columnas) que ya había, solo cambia qué
            campo va en cada casilla. */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Marca</label>
            <ThemedSuggestInput value={brand} onChange={setBrand} suggestions={brandOptions} placeholder="Elige o escribe"
              style={{ padding: '11px 12px', fontSize: 14 }} theme={SUGGEST_THEME} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Tipo</label>
            <ThemedSuggestInput value={type} onChange={setType} suggestions={VEHICLE_TYPES} placeholder="Elige o escribe"
              style={{ padding: '11px 12px', fontSize: 14 }} theme={SUGGEST_THEME} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Año</label>
            <ThemedSuggestInput value={String(year)} onChange={v => setYear(Number(v) || CURRENT_YEAR)} suggestions={YEAR_OPTIONS} placeholder="Elige o escribe"
              style={{ padding: '11px 12px', fontSize: 14 }} theme={SUGGEST_THEME} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Modelo</label>
            {/* Mismas sugerencias que el registro (marca + tipo + año), antes
                era un input libre sin ninguna ayuda. */}
            <ThemedSuggestInput value={model} onChange={setModel} suggestions={modelOptions}
              placeholder={modelOptions.length ? `Elige (ej. ${modelOptions[0]})` : (brand ? 'Escribe el modelo' : 'Elige marca primero')}
              style={{ padding: '11px 12px', fontSize: 14 }} theme={SUGGEST_THEME} />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Color <span style={{ color: '#F5C518' }}>*</span></label>
          {/* Paleta propia de la app en vez de texto libre — mismos colores y
              mismo estilo de pastilla que el registro (@/lib/vehicleBrands
              COLORS), elegir uno pone su nombre como valor. */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {COLORS.map(c => {
              const selected = color === c.name
              return (
                <button key={c.name} type="button" onClick={() => setColor(c.name)} title={c.name}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 999, cursor: 'pointer',
                    background: selected ? 'rgba(245,197,24,0.15)' : 'transparent',
                    border: `1.5px solid ${selected ? 'rgba(245,197,24,0.4)' : 'var(--input-border)'}`,
                    color: selected ? '#F5C518' : 'var(--text-3)', fontSize: 11.5, fontWeight: 600,
                  }}>
                  <span style={{ width: 13, height: 13, borderRadius: '50%', background: c.hex, border: '1px solid var(--input-border)', flex: '0 0 auto' }} />
                  {c.name}
                </button>
              )
            })}
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
