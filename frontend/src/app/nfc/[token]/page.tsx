'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getWalletBackground } from '@/lib/wallet-bg'

interface NfcVehicle {
  plate: string
  brand: string
  model: string
  year: number
  color: string
  type: string
  vehicle_id: string
  current_mileage: number | null
  next_service_mileage: number | null
  lubricant_brand: string
  lubricant_type: string
  total_services: number
  latest_service_date: string | null
  workshop_name: string | null
  sell_enabled: boolean
  sell_price: string
  sell_city: string
  sell_zip: string
  sell_phone: string
  sell_description: string
  workshop_rating: number
  vehicle_condition: string
  published_at: string | null
  owner_whatsapp: string
  owner_name: string
  wallet_bg_preset_id: string | null
  wallet_bg_custom_url: string | null
  wallet_logo_url: string | null
}

const STAMPS = ['Aceite', 'Filtros', 'Frenos', 'Llantas', 'Suspensión', 'Batería']

export default function NfcPage() {
  const params = useParams()
  const token = params.token as string
  const [data, setData] = useState<NfcVehicle | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const [showReport, setShowReport] = useState(false)
  const [reportName, setReportName] = useState('')
  const [reportPhone, setReportPhone] = useState('')
  const [reportMessage, setReportMessage] = useState('')
  const [reportSent, setReportSent] = useState(false)
  const [reportSending, setReportSending] = useState(false)
  const [reportError, setReportError] = useState('')
  const [isAuthed, setIsAuthed] = useState(false)

  useEffect(() => {
    if (!token) return
    if (token.length !== 64) {
      setError('short_token')
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(`/api/nfc/${encodeURIComponent(token)}`)
      .then(r => {
        if (r.status === 429) throw new Error('rate_limited')
        if (!r.ok) throw new Error('not_found')
        return r.json()
      })
      .then(j => { setData(j); setLoading(false) })
      .catch(e => {
        setError(e.message === 'rate_limited' ? 'rate_limited' : 'not_found')
        setLoading(false)
      })
  }, [token])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setIsAuthed(!!session)).catch(() => {})
  }, [])

  const rawPlate = data?.plate ?? ''
  const plateText = rawPlate.length > 6 ? `${rawPlate.slice(0, 3)}-${rawPlate.slice(3)}` : rawPlate

  const currentKm = data?.current_mileage
  const nextServiceKm = data?.next_service_mileage
  const kmToNext = nextServiceKm != null && currentKm != null ? Math.max(0, nextServiceKm - currentKm) : null
  /* Igual que el club de socios: el llenado es el avance dentro del ciclo actual
     (último servicio → próximo), no la fracción del odómetro total. Sin el km del
     último servicio se asume un ciclo de 5.000 km terminando en el próximo. */
  const oilCycleKm = 5000
  const cycleStart = nextServiceKm != null ? nextServiceKm - oilCycleKm : null
  const progWidth = nextServiceKm != null && currentKm != null && cycleStart != null
    ? `${Math.min(100, Math.max(0, ((currentKm - cycleStart) / oilCycleKm) * 100))}%`
    : '0%'

  const stamps = useMemo(() => STAMPS.map((label, i) => ({
    label,
    on: data != null && i < (data.total_services || 0),
  })), [data?.total_services])

  const hasFicha = data != null && (currentKm != null || data.total_services > 0)

  const handleSendReport = async () => {
    if (!reportName.trim() || !reportPhone.trim() || !reportMessage.trim()) {
      setReportError('Completa tu nombre, teléfono y mensaje.')
      return
    }
    setReportSending(true)
    setReportError('')
    try {
      const endpoint = isAuthed ? '/api/found-requests' : '/api/found-requests/public'
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (isAuthed) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          vehicle_id: data?.vehicle_id,
          message: reportMessage,
          contact_method: 'phone',
          finder_phone: reportPhone,
          finder_name: reportName,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || 'Error al enviar')
      }
      setReportSent(true)
    } catch (e: any) {
      setReportError(e.message || 'Error al enviar. Intenta de nuevo.')
    }
    setReportSending(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#f5f3ec',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: "'Inter',system-ui,sans-serif",
    }}>
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 32px' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(245,197,24,0.2)', borderTopColor: '#F5C518', animation: 'spin .8s linear infinite', margin: '0 auto 16px' }} />
          <div style={{ fontSize: 14, color: '#7c786e' }}>Cargando ficha técnica…</div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {error === 'rate_limited' && (
        <div style={{ textAlign: 'center', padding: '40px 32px', borderRadius: 20, background: 'rgba(255,55,55,0.06)', border: '1px solid rgba(255,55,55,0.2)', maxWidth: 380 }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center', color: '#ff6b6b' }}><svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4M12 16h.01"/></svg></div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Demasiadas solicitudes</div>
          <div style={{ fontSize: 13, color: '#b6b2a6', lineHeight: 1.5 }}>Espera un momento y vuelve a escanear el llavero.</div>
        </div>
      )}

      {error === 'short_token' && (
        <div style={{ textAlign: 'center', padding: '40px 32px', borderRadius: 20, background: 'rgba(255,55,55,0.06)', border: '1px solid rgba(255,55,55,0.2)', maxWidth: 380 }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center', color: '#ff6b6b' }}><svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"/><path d="M2 2l20 20"/></svg></div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Enlace incompleto</div>
          <div style={{ fontSize: 13, color: '#b6b2a6', lineHeight: 1.5 }}>Este enlace no es válido. Si eres el propietario, abre CarLink y usa "Ver ficha pública" desde el panel NFC.</div>
        </div>
      )}

      {error === 'not_found' && (
        <div style={{ textAlign: 'center', padding: '40px 32px', borderRadius: 20, background: 'rgba(255,55,55,0.06)', border: '1px solid rgba(255,55,55,0.2)', maxWidth: 380 }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center', color: '#ff6b6b' }}><svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"/><path d="M2 2l20 20"/></svg></div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Enlace no válido</div>
          <div style={{ fontSize: 13, color: '#b6b2a6', lineHeight: 1.5 }}>Este llavero NFC no está vinculado a ningún vehículo o fue revocado. Contacta a tu taller para reprogramarlo.</div>
        </div>
      )}

      {data && (
        <div style={{ width: 460, maxWidth: '100%' }}>
          {/* Botón volver — fuera del card, alineado a la izquierda */}
          {isAuthed && (
            <a href="/app" style={{ marginBottom: 14, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', color: '#b6b2a6', fontSize: 13, fontWeight: 600, textDecoration: 'none', cursor: 'pointer', transition: 'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#F5C518'; e.currentTarget.style.borderColor = 'rgba(245,197,24,0.4)' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#b6b2a6'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
              Volver al panel
            </a>
          )}
          <div style={{
            borderRadius: 26,
            overflow: 'hidden',
            background: getWalletBackground(data, 'dark'),
            border: '1px solid rgba(245,197,24,0.35)',
            boxShadow: '0 30px 80px rgba(0,0,0,.55),0 0 60px rgba(245,197,24,0.12)',
            padding: 30,
            color: '#f5f3ec',
          }}>
            {/* Header: CarLink + Verificada */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 9, background: '#F5C518', color: '#111' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                    <circle cx="12" cy="12" r="8.3"/><circle cx="12" cy="12" r="2.8"/>
                    <path d="M12 3.7v3M12 17.3v3M3.7 12h3M17.3 12h3M6.2 6.2l2.1 2.1M15.7 15.7l2.1 2.1M6.2 17.8l2.1-2.1M15.7 8.3l2.1-2.1"/>
                  </svg>
                </span>
                <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 19, color: '#f5f3ec' }}>Car<span style={{ color: '#F5C518' }}>Link</span></span>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: 'rgba(245,197,24,0.14)', border: '1px solid rgba(245,197,24,0.4)', color: '#F5C518', fontSize: 11, fontWeight: 700 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F5C518', boxShadow: '0 0 6px #F5C518' }} />
                Verificada
              </span>
            </div>

            {/* Placa */}
            <div style={{ margin: '6px 0 2px', fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: '#a8a496', fontWeight: 700 }}>Placa</div>
            <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 42, color: '#F5C518', letterSpacing: '.02em' }}>{plateText}</div>

            {/* Info bar: stars */}
            {data.workshop_rating > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 14 }}>
                {[1, 2, 3, 4, 5].map(s => (
                  <svg key={s} width="13" height="13" viewBox="0 0 24 24" fill={s <= Math.round(data.workshop_rating) ? '#F5C518' : 'none'} stroke="#F5C518" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                ))}
                <span style={{ fontSize: 11, color: '#a8a496', fontWeight: 600, marginLeft: 4 }}>{data.workshop_rating.toFixed(1)}/5</span>
              </div>
            )}

            {/* ── SECCIÓN VENTA: solo si sell_enabled ── */}
            {data.sell_enabled && (
              <div style={{ marginTop: 22 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div><div style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#a8a496', fontWeight: 700 }}>Vehículo</div><div style={{ fontSize: 15, fontWeight: 700, color: '#f5f3ec', marginTop: 3 }}>{data.brand} {data.model}</div></div>
                  <div><div style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#a8a496', fontWeight: 700 }}>Año</div><div style={{ fontSize: 15, fontWeight: 700, color: '#f5f3ec', marginTop: 3 }}>{data.year}</div></div>
                  <div><div style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#a8a496', fontWeight: 700 }}>Color</div><div style={{ fontSize: 15, fontWeight: 700, color: '#f5f3ec', marginTop: 3 }}>{data.color || '—'}</div></div>
                  <div><div style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#a8a496', fontWeight: 700 }}>Tipo</div><div style={{ fontSize: 15, fontWeight: 700, color: '#f5f3ec', marginTop: 3 }}>{data.type || '—'}</div></div>
                </div>
                <div style={{ marginTop: 20, padding: '16px 18px', borderRadius: 16, background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.25)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#a8a496', fontWeight: 700 }}>Precio de venta</span>
                    <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 22, color: '#F5C518' }}>{data.sell_price || 'Consultar'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {data.sell_city && <div><div style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#a8a496', fontWeight: 700 }}>Ciudad</div><div style={{ fontSize: 14, fontWeight: 600, color: '#f5f3ec', marginTop: 2 }}>{data.sell_city}{data.sell_zip ? ` · ${data.sell_zip}` : ''}</div></div>}
                    {data.sell_phone && <div><div style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#a8a496', fontWeight: 700 }}>Contacto</div><div style={{ fontSize: 14, fontWeight: 600, color: '#f5f3ec', marginTop: 2 }}>{data.sell_phone}</div></div>}
                  </div>
                  {data.sell_description && <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 13, color: '#c9c6ba', lineHeight: 1.6 }}>{data.sell_description}</div>}
                  {data.published_at && (
                    <div style={{ marginTop: 10, fontSize: 11, color: '#a8a496' }}>Publicado {new Date(data.published_at).toLocaleDateString()}</div>
                  )}
                </div>
              </div>
            )}

            {/* ── FICHA TÉCNICA ── */}
            {hasFicha && (
              <>
                <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: '#a8a496', fontWeight: 700, marginBottom: 16 }}>Ficha técnica</div>
                  {data.lubricant_brand && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#a8a496', fontWeight: 700 }}>Lubricante</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#f5f3ec', marginTop: 3 }}>{data.lubricant_brand}</div>
                      {data.lubricant_type && <div style={{ fontSize: 12, color: '#c9c6ba', marginTop: 2 }}>{data.lubricant_type}</div>}
                    </div>
                  )}
                  {currentKm != null && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: '#a8a496', fontWeight: 700 }}>Kilometraje actual</div>
                      <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 40, letterSpacing: '.01em', lineHeight: 1, color: '#f5f3ec', marginTop: 4 }}>
                        {currentKm.toLocaleString()}<span style={{ fontSize: 16, color: '#a8a496', fontFamily: "'Inter'", fontWeight: 600 }}> km</span>
                      </div>
                    </div>
                  )}
                  {nextServiceKm != null && currentKm != null && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#c9c6ba', marginBottom: 7 }}>
                        <span>Próximo servicio</span>
                        <span style={{ color: '#f5f3ec', fontWeight: 600 }}>{nextServiceKm.toLocaleString()} km · faltan {kmToNext?.toLocaleString()} km</span>
                      </div>
                      <div style={{ height: 9, borderRadius: 6, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: progWidth, background: 'linear-gradient(90deg,#8a6a00,#F5C518,#FFD84D)', borderRadius: 6, transition: 'width .7s cubic-bezier(0.22,1,0.36,1)' }} />
                      </div>
                    </div>
                  )}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: '#a8a496', fontWeight: 700, marginBottom: 8 }}>Servicios realizados</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {stamps.map((st, i) => (
                        <span key={i} title={st.label} style={{ width: 18, height: 18, borderRadius: '50%', background: st.on ? 'rgba(245,197,24,0.3)' : 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(245,197,24,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111' }}>
                          {st.on && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
                        </span>
                      ))}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 10, color: '#a8a496' }}>{data.total_services} sellos · Nivel Oro</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#a8a496', fontWeight: 700 }}>Servicios tomados</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#F5C518', marginTop: 2 }}>
                        {data.total_services} {data.total_services === 1 ? 'servicio registrado' : 'servicios registrados'}
                      </div>
                    </div>
                    {data.latest_service_date && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#a8a496', fontWeight: 700 }}>Más reciente</div>
                        <div style={{ fontSize: 13, color: '#c9c6ba', marginTop: 2 }}>{new Date(data.latest_service_date).toLocaleDateString()}</div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Footer message */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#a8a496' }}>Ficha técnica verificada por tu taller de confianza</div>
            </div>
          </div>

          {/* ── SECCIÓN LLAVERO PERDIDO ── */}
          <div style={{
            marginTop: 16,
            borderRadius: 20,
            overflow: 'hidden',
            background: 'linear-gradient(155deg,rgba(255,68,68,0.08),rgba(20,20,20,0.9))',
            border: '1px solid rgba(255,68,68,0.2)',
            padding: 24,
          }}>
            {!showReport ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      <path d="M12 8v4M12 16h.01"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#ff6b6b' }}>¿Encontraste este llavero?</div>
                    <div style={{ fontSize: 12, color: '#a8a496', marginTop: 2 }}>Si lo encontraste, avísale al propietario</div>
                  </div>
                </div>

                {/* WhatsApp directo si el dueño lo tiene activo */}
                {data.owner_whatsapp && (
                  <a href={`https://wa.me/${data.owner_whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 12, border: 'none', background: '#25d366', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 10, textDecoration: 'none' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Contactar por WhatsApp
                  </a>
                )}

                {/* Botón principal: iniciar sesión */}
                <div style={{ fontSize: 13, color: '#c9c6ba', lineHeight: 1.6, marginBottom: 12 }}>
                  Inicia sesión para que el propietario sepa quién encontró su llavero.
                </div>
                <a href="/app" style={{ display: 'block', textAlign: 'center', padding: '12px 0', borderRadius: 12, border: 'none', background: '#F5C518', color: '#111', fontWeight: 700, fontSize: 13, cursor: 'pointer', textDecoration: 'none', marginBottom: 10 }}>
                  Iniciar sesión para reportar
                </a>

                {/* Alternativa: dejar contacto sin autenticar */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#7c786e', marginBottom: 8 }}>¿No tienes cuenta?</div>
                  <button onClick={() => { setReportName(''); setReportPhone(''); setReportMessage(''); setShowReport(true) }}
                    style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#c9c6ba', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                    Déjanos tu teléfono y te notificamos
                  </button>
                </div>
              </>
            ) : reportSent ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(74,222,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#4ade80', marginBottom: 6 }}>Mensaje enviado</div>
                <div style={{ fontSize: 13, color: '#a8a496', lineHeight: 1.5 }}>
                  El propietario recibirá tu mensaje y podrá contactarte por el medio que indique.
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <button onClick={() => setShowReport(false)} style={{ background: 'none', border: 'none', color: '#a8a496', cursor: 'pointer', padding: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                  </button>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#ff6b6b' }}>Reportar llavero encontrado</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#a8a496', fontWeight: 600, display: 'block', marginBottom: 5 }}>Tu nombre</label>
                    <input value={reportName} onChange={e => setReportName(e.target.value)} placeholder="Nombre completo"
                      style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f5f3ec', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: '#a8a496', fontWeight: 600, display: 'block', marginBottom: 5 }}>Tu teléfono</label>
                    <input value={reportPhone} onChange={e => setReportPhone(e.target.value)} placeholder="+57 300 123 4567" type="tel"
                      style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f5f3ec', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: '#a8a496', fontWeight: 600, display: 'block', marginBottom: 5 }}>Mensaje para el propietario</label>
                    <textarea value={reportMessage} onChange={e => setReportMessage(e.target.value)} rows={3} placeholder="Hola, encontré tu llavero NFC en…"
                      style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f5f3ec', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ fontSize: 11, color: '#7c786e', lineHeight: 1.5, textAlign: 'center' }}>
                    El propietario recibirá tu número y mensaje por correo y notificación interna.
                  </div>

                  {reportError && <div style={{ fontSize: 12, color: '#ff6b6b', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,68,68,0.1)' }}>{reportError}</div>}

                  <button onClick={handleSendReport} disabled={reportSending} style={{ padding: '13px 0', borderRadius: 12, border: 'none', background: reportSending ? 'rgba(255,107,107,0.5)' : '#ff6b6b', color: '#fff', fontWeight: 700, fontSize: 14, cursor: reportSending ? 'default' : 'pointer', opacity: reportSending ? 0.7 : 1 }}>
                    {reportSending ? 'Enviando…' : 'Enviar mensaje al propietario'}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: 20, padding: 16 }}>
            <div style={{ fontSize: 12, color: '#5c5c6a', lineHeight: 1.6, maxWidth: 300, margin: '0 auto' }}>
              Cualquiera con este enlace podrá ver esta versión resumida de tu ficha — sin datos personales sensibles.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
