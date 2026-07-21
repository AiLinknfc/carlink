'use client'

import { useState, useCallback } from 'react'

interface Props {
  vehicle: {
    id: string
    plate: string
    brand: string
    model: string
    year: number
    color?: string
    city?: string
  }
  onClose: () => void
  onSuccess: () => void
}

export default function TransferVehicleModal({ vehicle, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<'form' | 'loading' | 'confirm' | 'done'>('form')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [transferData, setTransferData] = useState({
    keepMaintenance: true,
    keepDocuments: true,
    keepParts: true,
    keepNfc: true,
    revokeNfc: false,
    price: '',
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [transferId, setTransferId] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    if (!buyerEmail.trim()) {
      setErrors({ buyerEmail: 'Email del comprador es requerido' })
      return
    }
    if (!validateEmail(buyerEmail)) {
      setErrors({ buyerEmail: 'Email inválido' })
      return
    }

    setStep('loading')
    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerEmail: buyerEmail.trim().toLowerCase(),
          buyerName: buyerName.trim() || undefined,
          transferData,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear transferencia')

      setTransferId(data.transferId)
      setExpiresAt(data.expiresAt)
      setStep('confirm')
    } catch (err: any) {
      setErrors({ form: err.message })
      setStep('form')
    }
  }

  const handleDone = () => {
    onSuccess()
    onClose()
  }

  const formatDate = (iso: string) => new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  if (step === 'done') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="1.5" style={styles.successIcon}>
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <h3 style={styles.title}>¡Transferencia creada!</h3>
        </div>
        <p style={styles.message}>
          Se ha enviado un email a <strong>{buyerEmail}</strong> con el enlace para aceptar la transferencia.
        </p>
        <div style={styles.infoBox}>
          <p style={styles.infoLabel}>El enlace expira el</p>
          <p style={styles.infoValue}>{expiresAt ? formatDate(expiresAt) : '—'}</p>
        </div>
        <p style={styles.note}>
          El comprador tiene 7 días para aceptar. Si no lo hace, la transferencia se cancela automáticamente.
        </p>
        <button onClick={handleDone} style={styles.btnPrimary}>Entendido</button>
      </div>
    )
  }

  if (step === 'confirm') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="1.5" style={styles.confirmIcon}>
            <path d="M20 6L9 17l-5-5" />
            <path d="M21 12a9 9 0 0 0-9-9h-1a1 1 0 0 0 0 2h1a7 7 0 0 1 7 7v1" />
          </svg>
          <h3 style={styles.title}>Confirmar transferencia</h3>
        </div>
        <p style={styles.message}>
          Se ha creado la solicitud de transferencia para <strong>{buyerEmail}</strong>.
        </p>
        <div style={styles.details}>
          <p><strong>Vehículo:</strong> {vehicle.brand} {vehicle.model} ({vehicle.plate})</p>
          <p><strong>Expira:</strong> {expiresAt ? formatDate(expiresAt) : '—'}</p>
          <p><strong>Incluye:</strong></p>
          <ul style={styles.list}>
            {transferData.keepMaintenance && <li>Historial de mantenimiento</li>}
            {transferData.keepDocuments && <li>Documentos (SOAT, RTM, etc.)</li>}
            {transferData.keepParts && <li>Control de partes</li>}
            {transferData.keepNfc && <li>Llavero NFC activo</li>}
            {transferData.revokeNfc && <li>Llavero NFC será revocado</li>}
            {transferData.price && <li>Precio de venta: {transferData.price}</li>}
          </ul>
        </div>
        <div style={styles.actions}>
          <button onClick={() => setStep('form')} style={styles.btnSecondary}>Editar</button>
          <button onClick={handleDone} style={styles.btnPrimary}>Listo</button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="2" style={styles.headerIcon}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <h3 style={styles.title}>Transferir vehículo</h3>
        <button onClick={onClose} style={styles.closeBtn}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <p style={styles.description}>
          Transfiere la propiedad de <strong>{vehicle.brand} {vehicle.model} ({vehicle.plate})</strong> a otra persona. 
          El comprador recibirá un email para aceptar la transferencia.
        </p>

        {errors.form && <div style={styles.errorBanner}>{errors.form}</div>}

        <div style={styles.field}>
          <label style={styles.label}>Email del comprador *</label>
          <input
            type="email"
            value={buyerEmail}
            onChange={e => setBuyerEmail(e.target.value)}
            placeholder="comprador@email.com"
            style={{ ...styles.input, ...(errors.buyerEmail ? styles.inputError : {}) }}
            autoComplete="email"
            required
          />
          {errors.buyerEmail && <span style={styles.errorText}>{errors.buyerEmail}</span>}
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Nombre del comprador (opcional)</label>
          <input
            type="text"
            value={buyerName}
            onChange={e => setBuyerName(e.target.value)}
            placeholder="Juan Pérez"
            style={styles.input}
            autoComplete="name"
          />
        </div>

        <div style={styles.section}>
          <label style={styles.sectionLabel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Qué se transfiere con el vehículo
          </label>
          <div style={styles.checkboxGrid}>
            {[
              { key: 'keepMaintenance', label: 'Historial de mantenimiento', desc: 'Todos los servicios y kilometrajes' },
              { key: 'keepDocuments', label: 'Documentos legales', desc: 'SOAT, RTM, facturas, tarjeta de propiedad' },
              { key: 'keepParts', label: 'Control de partes', desc: 'Estado de componentes mecánicos' },
              { key: 'keepNfc', label: 'Llavero NFC activo', desc: 'El llavero actual seguirá funcionando' },
            ].map(item => (
              <label key={item.key} style={styles.checkboxItem}>
                <input
                  type="checkbox"
                  checked={transferData[item.key as keyof typeof transferData] as boolean}
                  onChange={e => setTransferData(prev => ({ ...prev, [item.key]: e.target.checked }))}
                  style={styles.checkbox}
                />
                <div>
                  <span style={styles.checkboxLabel}>{item.label}</span>
                  <span style={styles.checkboxDesc}>{item.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <label style={styles.sectionLabel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            Opciones adicionales
          </label>
          <div style={styles.checkboxGrid}>
            <label style={styles.checkboxItem}>
              <input
                type="checkbox"
                checked={transferData.revokeNfc}
                onChange={e => setTransferData(prev => ({ ...prev, revokeNfc: e.target.checked }))}
                style={styles.checkbox}
              />
              <div>
                <span style={styles.checkboxLabel}>Revocar llavero NFC actual</span>
                <span style={styles.checkboxDesc}>El comprador deberá solicitar uno nuevo</span>
              </div>
            </label>
          </div>
        </div>

        <div style={styles.section}>
          <label style={styles.sectionLabel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            Información de venta (opcional)
          </label>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={styles.field}>
              <label style={styles.label}>Precio de venta</label>
              <input
                type="text"
                value={transferData.price}
                onChange={e => setTransferData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="Ej. 45.000.000"
                style={styles.input}
              />
            </div>
            <div style={{ ...styles.field, flex: 1, minWidth: 200 }}>
              <label style={styles.label}>Notas adicionales</label>
              <textarea
                value={transferData.notes}
                onChange={e => setTransferData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Condiciones, forma de pago, etc."
                rows={2}
                style={{ ...styles.input, resize: 'vertical' }}
              />
            </div>
          </div>
        </div>

        <div style={styles.actions}>
          <button type="button" onClick={onClose} style={styles.btnSecondary}>Cancelar</button>
          <button type="submit" disabled={step === 'loading'} style={styles.btnPrimary}>
            {step === 'loading' ? 'Creando...' : 'Crear transferencia'}
          </button>
        </div>
      </form>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%', maxWidth: 520,
    background: 'var(--panel-bg, #141414)',
    border: '1px solid var(--panel-border, rgba(245,197,24,0.3))',
    borderRadius: 14,
    padding: 24,
    boxShadow: '0 40px 90px rgba(0,0,0,.6)',
    color: '#f5f3ec',
    fontFamily: "'Inter',system-ui,sans-serif",
    overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20, gap: 12,
  },
  headerIcon: { flex: '0 0 auto' },
  title: { fontFamily: "'Anton',sans-serif", fontSize: 24, textTransform: 'uppercase', margin: 0, letterSpacing: '.01em' },
  closeBtn: {
    width: 36, height: 36, borderRadius: 10,
    border: '1px solid var(--btn-ghost-border, rgba(255,255,255,0.14))',
    background: 'var(--btn-ghost-bg, rgba(255,255,255,0.05))',
    color: 'var(--btn-ghost-color, #b6b2a6)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flex: '0 0 auto',
  },
  description: { color: '#b6b2a6', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' },
  errorBanner: { 
    padding: '10px 12px', borderRadius: 10, background: 'rgba(255,77,106,0.1)', 
    border: '1px solid rgba(255,77,106,0.3)', color: '#ff6b8a', fontSize: 13, marginBottom: 16 
  },
  field: { marginBottom: 16 },
  label: { fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#9a968a', fontWeight: 600, display: 'block', marginBottom: 6 },
  input: { 
    width: '100%', padding: '11px 13px', borderRadius: 10, 
    border: '1px solid var(--input-border, rgba(255,255,255,0.14))', 
    background: 'var(--input-bg, rgba(255,255,255,0.04))', 
    color: '#f5f3ec', fontSize: 14, outline: 'none', boxSizing: 'border-box' 
  },
  inputError: { borderColor: '#ff4d6a' },
  errorText: { fontSize: 12, color: '#ff6b8a', marginTop: 4, display: 'block' },
  section: { marginBottom: 20 },
  sectionLabel: { 
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', 
    color: '#F5C518', fontWeight: 700, marginBottom: 12 
  },
  checkboxGrid: { display: 'flex', flexDirection: 'column', gap: 10 },
  checkboxItem: {
    display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
  },
  checkbox: { 
    width: 18, height: 18, accentColor: '#F5C518', cursor: 'pointer', flex: '0 0 auto', marginTop: 2 
  },
  checkboxLabel: { display: 'block', fontSize: 13, fontWeight: 600, color: '#f5f3ec', marginBottom: 2 },
  checkboxDesc: { display: 'block', fontSize: 11, color: '#8f8a7a' },
  details: { 
    background: 'rgba(245,197,24,0.05)', border: '1px solid rgba(245,197,24,0.1)', 
    borderRadius: 12, padding: 16, marginBottom: 20, fontSize: 13, color: '#d8d4c8', lineHeight: 1.8 
  },
  list: { margin: '8px 0 0 18px', padding: 0 },
  actions: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 },
  btnSecondary: { 
    padding: '12px 20px', borderRadius: 11, 
    border: '1px solid var(--input-border, rgba(255,255,255,0.14))', 
    background: 'var(--input-bg, rgba(255,255,255,0.04))', 
    color: '#b6b2a6', fontSize: 13, fontWeight: 600, cursor: 'pointer' 
  },
  btnPrimary: { 
    padding: '12px 24px', borderRadius: 11, border: 'none', 
    background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 13, 
    cursor: 'pointer', boxShadow: '0 0 20px rgba(245,197,24,0.35)',
  },
  successIcon: { color: '#2ecc71', marginBottom: 16 },
  confirmIcon: { color: '#F5C518', marginBottom: 16 },
  message: { color: '#b6b2a6', fontSize: 14, lineHeight: 1.6, textAlign: 'center', marginBottom: 20 },
  infoBox: { 
    background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.2)', 
    borderRadius: 12, padding: '16px 20px', textAlign: 'center', marginBottom: 16 
  },
  infoLabel: { fontSize: 12, color: '#8f8a7a', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '.1em' },
  infoValue: { fontFamily: "'Anton',sans-serif", fontSize: 20, color: '#F5C518', margin: 0 },
  note: { color: '#8f8a7a', fontSize: 12, textAlign: 'center', lineHeight: 1.5, marginTop: 16 },
}