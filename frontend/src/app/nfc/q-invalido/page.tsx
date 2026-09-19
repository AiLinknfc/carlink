'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { SUPPORT_WHATSAPP } from '@/lib/checkout'

/* A dónde redirige GET /api/nfc/q/{slug} (backend/app/routers/nfc.py,
   access_via_qr) cuando el slug no resuelve a ninguna ficha — la causa más
   común con diferencia es un llavero recién comprado que todavía no se
   activó (el qr_slug se genera al aprovisionar el llavero físico, antes de
   que exista ninguna ficha para mostrar; ver NfcTokenWhitelist). No
   distingue ese caso de un QR realmente inválido/falso — mismo criterio que
   ya usaba este endpoint, esta página solo le da un lugar mejor para
   aterrizar en vez del JSON crudo que devolvía antes. */

const GOLD = '#F5C518'

export default function QrInvalidoPage() {
  const [isAuthed, setIsAuthed] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setIsAuthed(!!session)).catch(() => {})
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f5f3ec', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--font-ui)' }}>
      <div style={{ textAlign: 'center', padding: '40px 32px', borderRadius: 20, background: 'rgba(245,197,24,0.06)', border: '1px solid rgba(245,197,24,0.2)', maxWidth: 400 }}>
        <div style={{ marginBottom: 16, fontFamily: 'var(--font-display, Anton, sans-serif)', fontSize: 22 }}>
          Car<span style={{ color: GOLD }}>Link</span>
        </div>
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center', color: GOLD }}>
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h1v1H9zM14 9h1v1h-1zM9 14h1v1H9zM14 14h1v1h-1zM12 9v.01M9 12h.01M14 12h1M12 14v1M12 12h.01" /></svg>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Este llavero todav no est activado</div>
        <p style={{ fontSize: 13, color: '#b6b2a6', lineHeight: 1.6, margin: '0 0 22px' }}>
          Si acabs de comprarlo, actvalo desde la app con el cdigo impreso en el empaque —
          despus este mismo cdigo va a mostrar la ficha de tu vehculo.
        </p>
        <a href={isAuthed ? '/app' : '/'} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '13px 22px', borderRadius: 12, background: GOLD, color: '#111', fontWeight: 800, fontSize: 13, textDecoration: 'none', boxSizing: 'border-box' }}>
          {isAuthed ? 'Ir al panel' : 'Ir a CarLink para activarlo'}
        </a>
        <a href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent('Hola, escaneé un llavero CarLink y me dice que no está activado')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 14, fontSize: 12, color: '#7c786e', textDecoration: 'none' }}>
          Ya lo activaste y ves este mensaje? Escribinos por WhatsApp
        </a>
      </div>
    </div>
  )
}
