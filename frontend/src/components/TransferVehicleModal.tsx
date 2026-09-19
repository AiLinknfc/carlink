'use client'

import { useState, useEffect } from 'react'
import { apiGet } from '@/lib/api'
import type { NfcToken } from '@/lib/types'

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
  /** Antes faltaba (único modal de la app sin theme/isDark, 2026-09-18) —
   * el panel en sí ya usaba var(--panel-bg)/var(--panel-border) y sí
   * flipeaba, pero casi todo el texto de `styles` estaba hardcodeado con
   * los valores del tema oscuro copiados literalmente — en tema claro
   * quedaba texto claro sobre fondo claro, ilegible. */
  theme?: 'light' | 'dark'
  onClose: () => void
  onSuccess: () => void
}

export default function TransferVehicleModal({ vehicle, theme = 'dark', onClose, onSuccess }: Props) {
  const isDark = theme !== 'light'
  // Sombra un poco más liviana en tema claro, mismo criterio que el resto
  // de los paneles de la app (ej. AdminModal.tsx) — no hace falta que el
  // panel entero sea theme-aware acá, sólo este detalle.
  const containerStyle: React.CSSProperties = { ...styles.container, boxShadow: isDark ? '0 40px 90px rgba(0,0,0,.6)' : '0 30px 70px rgba(17,17,17,0.18)' }
  const [step, setStep] = useState<'form' | 'loading' | 'confirm' | 'done'>('form')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [buyerName, setBuyerName] = useState('')
  // Historial de mantenimiento y documentos siempre viajan con el vehículo —
  // no son elegibles (ver docs/PENDIENTES.md ítem 11: los 4 checkboxes que
  // había acá antes eran decorativos, no tocaban nada en accept/route.ts).
  // Lo único que sí requiere una elección real es, llavero por llavero, si
  // se va con el auto o el vendedor lo revoca — nfcChoices mapea
  // token.id -> true ("va con el vehículo") | false ("me lo quedo",
  // default seguro).
  const [transferData, setTransferData] = useState({ price: '', notes: '' })
  const [nfcTokens, setNfcTokens] = useState<NfcToken[]>([])
  const [nfcTokensLoading, setNfcTokensLoading] = useState(true)
  const [nfcChoices, setNfcChoices] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [transferId, setTransferId] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    apiGet<NfcToken[]>(`/nfc/tokens?vehicle_id=${vehicle.id}`).then(tokens => {
      if (cancelled) return
      const active = (tokens || []).filter(t => t.is_active)
      setNfcTokens(active)
      // Default seguro: ninguno marcado "va con el vehículo" hasta que el
      // vendedor lo elija explícitamente — un llavero que se pasa por alto
      // se revoca, nunca queda colgado bajo el dueño anterior.
      setNfcChoices(Object.fromEntries(active.map(t => [t.id, false])))
      setNfcTokensLoading(false)
    })
    return () => { cancelled = true }
  }, [vehicle.id])

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
          transferData: { ...transferData, nfcTokenChoices: nfcChoices },
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
      <div style={containerStyle}>
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
      <div style={containerStyle}>
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
            <li>Historial de mantenimiento y control de partes</li>
            <li>Documentos (SOAT, RTM, facturas, tarjeta de propiedad)</li>
            {nfcTokens.map(t => (
              <li key={t.id}>
                Llavero {t.label || t.token_prefix}: {nfcChoices[t.id] ? 'se transfiere al comprador' : 'se revoca (el vendedor lo conserva)'}
              </li>
            ))}
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
    <div style={containerStyle}>
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
          <p style={styles.checkboxDesc}>
            El historial de mantenimiento, el control de partes y los documentos (SOAT, RTM, facturas, tarjeta de propiedad) siempre se transfieren con el vehículo.
          </p>
        </div>

        <div style={styles.section}>
          <label style={styles.sectionLabel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            Llaveros NFC activos
          </label>
          {nfcTokensLoading ? (
            <div style={styles.checkboxDesc}>Cargando llaveros...</div>
          ) : nfcTokens.length === 0 ? (
            <div style={styles.checkboxDesc}>Este vehículo no tiene ningún llavero activo.</div>
          ) : (
            <div style={styles.checkboxGrid}>
              {nfcTokens.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <span style={styles.checkboxLabel}>{t.label || 'Llavero NFC'} · {t.token_prefix}</span>
                    <span style={styles.checkboxDesc}>{nfcChoices[t.id] ? 'Se transfiere al comprador, sigue funcionando sin cambios' : 'Se revoca al completar la transferencia — el vendedor lo conserva desactivado'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flex: '0 0 auto' }}>
                    <button type="button"
                      onClick={() => setNfcChoices(prev => ({ ...prev, [t.id]: false }))}
                      style={nfcChoices[t.id] ? styles.toggleBtnOff : styles.toggleBtnOn}>
                      Me lo quedo
                    </button>
                    <button type="button"
                      onClick={() => setNfcChoices(prev => ({ ...prev, [t.id]: true }))}
                      style={nfcChoices[t.id] ? styles.toggleBtnOn : styles.toggleBtnOff}>
                      Va con el vehículo
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
    color: 'var(--text-1)',
    fontFamily: 'var(--font-ui)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20, gap: 12,
  },
  headerIcon: { flex: '0 0 auto' },
  title: { fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 800, margin: 0 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 10,
    border: '1px solid var(--btn-ghost-border, rgba(255,255,255,0.14))',
    background: 'var(--btn-ghost-bg, rgba(255,255,255,0.05))',
    color: 'var(--btn-ghost-color, #b6b2a6)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flex: '0 0 auto',
  },
  description: { color: 'var(--text-2)', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' },
  errorBanner: { 
    padding: '10px 12px', borderRadius: 10, background: 'rgba(255,77,106,0.1)', 
    border: '1px solid rgba(255,77,106,0.3)', color: '#ff6b8a', fontSize: 13, marginBottom: 16 
  },
  field: { marginBottom: 16 },
  label: { fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: 6 },
  input: { 
    width: '100%', padding: '11px 13px', borderRadius: 10, 
    border: '1px solid var(--input-border, rgba(255,255,255,0.14))', 
    background: 'var(--input-bg, rgba(255,255,255,0.04))', 
    color: 'var(--text-1)', fontSize: 14, outline: 'none', boxSizing: 'border-box' 
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
  checkboxLabel: { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 },
  checkboxDesc: { display: 'block', fontSize: 11, color: 'var(--text-4)' },
  toggleBtnOn: {
    padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
    border: '1px solid #F5C518', background: 'rgba(245,197,24,0.15)', color: '#F5C518',
  },
  toggleBtnOff: {
    padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
    border: '1px solid var(--input-border, rgba(255,255,255,0.14))', background: 'transparent', color: 'var(--text-4)',
  },
  details: { 
    background: 'rgba(245,197,24,0.05)', border: '1px solid rgba(245,197,24,0.1)', 
    borderRadius: 12, padding: 16, marginBottom: 20, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8 
  },
  list: { margin: '8px 0 0 18px', padding: 0 },
  actions: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 },
  btnSecondary: { 
    padding: '12px 20px', borderRadius: 11, 
    border: '1px solid var(--input-border, rgba(255,255,255,0.14))', 
    background: 'var(--input-bg, rgba(255,255,255,0.04))', 
    color: 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' 
  },
  btnPrimary: { 
    padding: '12px 24px', borderRadius: 11, border: 'none', 
    background: '#F5C518', color: '#111', fontWeight: 800, fontSize: 13, 
    cursor: 'pointer', boxShadow: '0 0 20px rgba(245,197,24,0.35)',
  },
  successIcon: { color: '#2ecc71', marginBottom: 16 },
  confirmIcon: { color: '#F5C518', marginBottom: 16 },
  message: { color: 'var(--text-2)', fontSize: 14, lineHeight: 1.6, textAlign: 'center', marginBottom: 20 },
  infoBox: { 
    background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.2)', 
    borderRadius: 12, padding: '16px 20px', textAlign: 'center', marginBottom: 16 
  },
  infoLabel: { fontSize: 12, color: 'var(--text-4)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '.1em' },
  infoValue: { fontFamily: 'var(--font-display)', fontSize: 20, color: '#F5C518', margin: 0 },
  note: { color: 'var(--text-4)', fontSize: 12, textAlign: 'center', lineHeight: 1.5, marginTop: 16 },
}