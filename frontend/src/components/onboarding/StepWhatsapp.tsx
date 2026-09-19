'use client'

import { useState, useEffect } from 'react'
import { apiPut } from '@/lib/api'
import { useAuth } from '@/store/auth'
import { getDraft, saveDraft } from './OnboardingWizard'

interface Props {
  userId: string
  theme: 'light' | 'dark'
  existingNumber?: string
  onContinue: () => void
}

const DRAFT_KEY = 'whatsapp_number'

/* Paso opcional del wizard — guarda `whatsapp_number` en Profile vía
   `PUT /auth/me`, mismo campo que el modal de perfil. Sólo guarda el
   contacto — NO toca `whatsapp_enabled` (2026-09-15, corrección: antes este
   paso mandaba `whatsapp_enabled: true`, que es el mismo flag que gatea si
   el número se muestra en la ficha pública — nfc.py:
   `if owner.whatsapp_enabled: owner_whatsapp = ...`. Eso hacía que cargar el
   número acá lo publicara en la ficha sin que el usuario haya pasado por el
   toggle "Contacto WhatsApp" de Publicar mi perfil, que es el que de verdad
   debe decidir la exposición pública). Mostrar el número en la ficha sigue
   siendo una decisión aparte, tomada ahí.

   Sin pantalla de "Numero guardado" (2026-09-15, pedido del usuario: sobraba
   — ya se puede verificar desde "Mi perfil" o desde el toggle "Contacto
   WhatsApp" de la ficha). Guardar avanza directo al siguiente paso; si ya
   había un número (`existingNumber`, viene del perfil real, no de un flag
   local), el paso se salta solo al entrar. */
export default function StepWhatsapp({ userId, theme, existingNumber, onContinue }: Props) {
  const isDark = theme !== 'light'
  const textPrimary = 'var(--text-1)'
  const textMuted = 'var(--text-3)'
  const inputBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(17,17,17,0.04)'
  const inputBorder = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(17,17,17,0.12)'

  const { refreshProfile } = useAuth()
  const [number, setNumber] = useState(() => getDraft(userId, DRAFT_KEY) || existingNumber || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (existingNumber) {
      saveDraft(userId, DRAFT_KEY, '')
      onContinue()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingNumber])

  const handleNumberChange = (v: string) => {
    setNumber(v)
    saveDraft(userId, DRAFT_KEY, v)
  }

  const handleSave = async () => {
    if (!number.trim()) return
    setSaving(true)
    setError(null)
    // Indicativo fijo +57 (2026-09-18): el usuario ya no lo tipea, así el
    // número queda siempre en el formato que espera el link de WhatsApp
    // público (nfc/[token]/page.tsx limpia todo lo que no sea dígito).
    const result = await apiPut('/auth/me', { whatsapp_number: `+57 ${number.trim()}` })
    setSaving(false)
    if (result) {
      saveDraft(userId, DRAFT_KEY, '')
      // Sin esto, el `profile` en memoria (useAuth, compartido por toda la
      // app) queda con el número viejo hasta recargar la página — el número
      // ya está guardado en la base, pero "Mi perfil" y el toggle de
      // Contacto WhatsApp lo seguirían mostrando vacío en la misma sesión
      // (2026-09-15, bug real reportado por el usuario).
      await refreshProfile()
      onContinue()
    } else {
      setError('No se pudo guardar el numero. Intenta de nuevo.')
    }
  }

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 800, color: textPrimary, marginBottom: 4 }}>Numero de contacto</div>
      <div style={{ fontSize: 12, color: textMuted, lineHeight: 1.6, marginBottom: 16 }}>
        Guarda tu WhatsApp en tu cuenta. Es solo tu contacto — para mostrarlo en tu ficha publica hace falta un paso aparte, desde tu ficha.
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: textMuted, fontWeight: 700, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.06em' }}>Numero de WhatsApp</label>
        {/* Indicativo fijo +57 (2026-09-18) — desplegable de una sola
           opción por ahora (CarLink solo opera en Colombia); el usuario ya
           no tiene que escribirlo, sólo el número local. Cuando se opere en
           más países, esto pasa a un <select> real con las mismas opciones. */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" disabled title="Por ahora CarLink solo opera en Colombia"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto', padding: '0 12px', height: 46, boxSizing: 'border-box',
              borderRadius: 10, border: `1px solid ${inputBorder}`, background: inputBg, color: textPrimary, fontSize: 14, fontWeight: 700, cursor: 'default',
            }}>
            +57
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><path d="M6 9l6 6 6-6" /></svg>
          </button>
          <input value={number} onChange={e => handleNumberChange(e.target.value)} placeholder="300 123 4567"
            onKeyDown={e => { if (e.key === 'Enter' && !saving && number.trim()) handleSave() }}
            style={{ flex: 1, minWidth: 0, height: 46, boxSizing: 'border-box', padding: '0 12px', borderRadius: 10, border: `1px solid ${inputBorder}`, background: inputBg, color: textPrimary, fontSize: 14, fontFamily: 'var(--font-ui)', letterSpacing: '.02em', outline: 'none' }} />
        </div>
      </div>

      {error && <div style={{ fontSize: 12, color: '#ff4d6a', marginBottom: 12 }}>{error}</div>}

      {/* Único botón de toda la app que lleva el verde de WhatsApp
          (2026-09-15, regla del usuario) — es la acción de guardar el
          contacto en sí; el resto de los controles relacionados (el toggle
          "Contacto WhatsApp", el botón de la sección de llaveros
          encontrados) usan el amarillo de la app. */}
      <button onClick={handleSave} disabled={!number.trim() || saving}
        style={{
          width: '100%', padding: 13, borderRadius: 12, border: 'none',
          background: (!number.trim() || saving) ? 'rgba(74,222,128,0.3)' : '#4ade80', color: '#111',
          fontWeight: 800, fontSize: 14, cursor: (!number.trim() || saving) ? 'not-allowed' : 'pointer',
          opacity: (!number.trim() || saving) ? 0.6 : 1, transition: 'all .16s',
        }}>
        {saving ? 'Guardando...' : 'Guardar numero'}
      </button>
    </div>
  )
}
