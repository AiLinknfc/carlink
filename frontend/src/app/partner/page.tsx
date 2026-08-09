'use client'

import { useEffect, useState } from 'react'
import { useTheme } from '@/store/theme'
import { partnerApi } from '@/lib/api'
import type { PartnerMe, PartnerBatch, PartnerProvisionResult, PartnerToken } from '@/lib/types'
import QrCodePanel from '@/components/QrCodePanel'

// Panel de prueba para el rol partner (aprovisionamiento escopeado, ver
// docs/PLAN_PARTNER_MODEL.md) — separado por completo de /admin: un partner
// nunca inicia sesión con Supabase, se autentica con una api key propia
// (creada desde /admin → pestaña "Partners") y solo ve su propio cupo y sus
// propios lotes, nunca nada del resto del sistema.
//
// "Listo para cuando el proyecto madure": hoy no existe ningún partner real,
// esto es para que el dueño de la cuenta pruebe el flujo con una clave de
// prueba generada por él mismo.

const STORAGE_KEY = 'carlink_partner_api_key'

export default function PartnerPage() {
  const { isDark } = useTheme()
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [keyInput, setKeyInput] = useState('')
  const [me, setMe] = useState<PartnerMe | null>(null)
  const [batches, setBatches] = useState<PartnerBatch[]>([])
  const [tokens, setTokens] = useState<PartnerToken[]>([])
  const [tokensBatchFilter, setTokensBatchFilter] = useState<string | null>(null)
  const [qrModalUrl, setQrModalUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [quantity, setQuantity] = useState('5')
  const [batchNote, setBatchNote] = useState('')
  const [provisioning, setProvisioning] = useState(false)
  const [lastBatch, setLastBatch] = useState<PartnerProvisionResult | null>(null)

  const c = {
    bg: isDark ? '#0a0b0e' : '#f5f3ec',
    card: isDark ? '#111318' : '#fff',
    border: isDark ? 'rgba(245,197,24,0.15)' : 'rgba(17,17,17,0.08)',
    text: isDark ? '#f5f3ec' : '#17171a',
    muted: isDark ? '#777' : '#999',
    accent: '#F5C518',
  }

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEY)
      if (stored) setApiKey(stored)
    } catch { /* sessionStorage no disponible (SSR/incógnito estricto) */ }
  }, [])

  useEffect(() => {
    if (apiKey) loadMe(apiKey)
  }, [apiKey])

  async function loadMe(key: string) {
    setLoading(true)
    setError('')
    const [meRes, batchesRes, tokensRes] = await Promise.all([partnerApi.me(key), partnerApi.batches(key), partnerApi.tokens(key)])
    setLoading(false)
    if (meRes.error) {
      setError(meRes.error)
      setMe(null)
      try { window.sessionStorage.removeItem(STORAGE_KEY) } catch { /* noop */ }
      setApiKey(null)
      return
    }
    setMe(meRes.data)
    if (batchesRes.data) setBatches(batchesRes.data)
    if (tokensRes.data) setTokens(tokensRes.data)
  }

  async function loadTokens(batchId: string | null) {
    if (!apiKey) return
    const res = await partnerApi.tokens(apiKey, batchId || undefined)
    if (res.data) setTokens(res.data)
  }

  function connect() {
    if (!keyInput.trim()) return
    try { window.sessionStorage.setItem(STORAGE_KEY, keyInput.trim()) } catch { /* noop */ }
    setApiKey(keyInput.trim())
  }

  function disconnect() {
    try { window.sessionStorage.removeItem(STORAGE_KEY) } catch { /* noop */ }
    setApiKey(null)
    setMe(null)
    setKeyInput('')
    setLastBatch(null)
  }

  async function submitProvision() {
    if (!apiKey) return
    const n = parseInt(quantity, 10)
    if (!n || n < 1) return
    setProvisioning(true)
    setError('')
    const res = await partnerApi.provision(apiKey, n, batchNote.trim())
    setProvisioning(false)
    if (res.error) { setError(res.error); return }
    setLastBatch(res.data)
    setBatchNote('')
    loadMe(apiKey)
  }

  const inputStyle: React.CSSProperties = {
    padding: '10px 12px', borderRadius: 10, fontSize: 13.5, outline: 'none', width: '100%', boxSizing: 'border-box',
    background: isDark ? 'rgba(0,0,0,0.35)' : '#ffffff',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(17,17,17,0.12)'}`,
    color: c.text,
  }
  const btnStyle: React.CSSProperties = { background: c.accent, color: '#111', border: 'none', borderRadius: 10, padding: '10px 18px', cursor: 'pointer', fontSize: 13.5, fontWeight: 700 }
  const cardStyle: React.CSSProperties = { background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, padding: 20 }

  return (
    <div style={{ minHeight: '100vh', background: c.bg, color: c.text, fontFamily: 'var(--font-ui)' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 16px' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: c.accent, margin: 0 }}>Panel de partner</h1>
          <p style={{ fontSize: 13, color: c.muted, margin: '4px 0 0' }}>
            Aprovisiona llaveros dentro de tu cupo. No tiene acceso a nada fuera de tus propios lotes.
          </p>
        </div>

        {!apiKey ? (
          <div style={cardStyle}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Ingresa tu api key de partner</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                value={keyInput} onChange={e => setKeyInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') connect() }}
                placeholder="pk_partner_..." style={{ ...inputStyle, flex: 1, minWidth: 220, fontFamily: 'monospace' }}
              />
              <button onClick={connect} disabled={!keyInput.trim()} style={{ ...btnStyle, opacity: keyInput.trim() ? 1 : 0.5 }}>Entrar</button>
            </div>
            <p style={{ fontSize: 11.5, color: c.muted, marginTop: 10, lineHeight: 1.5 }}>
              La clave se guarda solo en esta pestaña (sessionStorage) — se pierde al cerrarla. Un admin la genera
              desde Admin NFC → pestaña &quot;Partners&quot;, y se muestra una única vez.
            </p>
            {error && <div style={{ color: '#ff4d6a', fontSize: 12.5, marginTop: 10 }}>{error}</div>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {loading && !me ? (
              <div style={{ color: c.muted, fontSize: 13 }}>Cargando...</div>
            ) : me && (
              <>
                <div style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{me.name}</div>
                      <div style={{ fontSize: 12, color: me.status === 'active' ? '#2ecc71' : '#ff4d6a', marginTop: 2 }}>
                        {me.status === 'active' ? 'Cuenta activa' : 'Cuenta suspendida'}
                      </div>
                    </div>
                    <button onClick={disconnect} style={{ background: 'transparent', color: c.muted, border: `1px solid ${c.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>Salir</button>
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: c.muted, marginBottom: 4 }}>
                      <span>Cupo usado</span><span>{me.quota_used} / {me.quota_total}</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,17,0.08)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${me.quota_total ? Math.min(100, (me.quota_used / me.quota_total) * 100) : 0}%`, background: c.accent }} />
                    </div>
                    <div style={{ fontSize: 11.5, color: c.muted, marginTop: 6 }}>Quedan {me.quota_remaining} llavero(s) por aprovisionar.</div>
                  </div>
                </div>

                <div style={cardStyle}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Provisionar lote</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    <div style={{ width: 100 }}>
                      <input type="number" min={1} max={me.quota_remaining || undefined} value={quantity} onChange={e => setQuantity(e.target.value)} style={inputStyle} placeholder="Cantidad" />
                    </div>
                    <input value={batchNote} onChange={e => setBatchNote(e.target.value)} placeholder="Nota del lote (opcional)" style={{ ...inputStyle, flex: 1, minWidth: 180 }} />
                  </div>
                  <button
                    onClick={submitProvision}
                    disabled={provisioning || me.status !== 'active' || me.quota_remaining <= 0 || !parseInt(quantity, 10)}
                    style={{ ...btnStyle, opacity: (provisioning || me.status !== 'active' || me.quota_remaining <= 0) ? 0.5 : 1 }}
                  >
                    {provisioning ? 'Generando…' : 'Provisionar'}
                  </button>
                  {me.quota_remaining <= 0 && <div style={{ fontSize: 12, color: '#ff4d6a', marginTop: 8 }}>Sin cupo disponible — contacta al administrador.</div>}
                  {error && <div style={{ color: '#ff4d6a', fontSize: 12.5, marginTop: 10 }}>{error}</div>}
                </div>

                {lastBatch && (
                  <div style={{ ...cardStyle, border: `2px solid ${c.accent}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: c.accent }}>Lote generado — guarda esto, no se vuelve a mostrar</div>
                      <button onClick={() => setLastBatch(null)} style={{ background: 'none', border: 'none', color: c.muted, cursor: 'pointer', fontSize: 16 }}>×</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {lastBatch.items.map(item => (
                        <div key={item.id} style={{ padding: '8px 10px', borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(17,17,17,0.03)', fontSize: 12 }}>
                          <div style={{ color: c.muted }}>Tag: <code>{item.tag_uid}</code></div>
                          <div style={{ color: c.muted }}>Código de activación: <b style={{ fontSize: 14, letterSpacing: '.08em', color: c.text }}>{item.activation_code}</b></div>
                          <div style={{ color: c.muted, wordBreak: 'break-all' }}>URL a grabar en el chip: <code style={{ fontSize: 10.5 }}>{item.token_url}</code></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={cardStyle}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Tus lotes</div>
                  <p style={{ fontSize: 11, color: c.muted, margin: '-6px 0 10px' }}>Tocá un lote para ver y manejar el QR de cada llavero de esa campaña.</p>
                  {batches.length === 0 ? (
                    <div style={{ fontSize: 12, color: c.muted }}>Sin lotes todavía.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {batches.map(b => (
                        <button key={b.batch_id}
                          onClick={() => { const next = tokensBatchFilter === b.batch_id ? null : b.batch_id; setTokensBatchFilter(next); loadTokens(next) }}
                          style={{
                            textAlign: 'left', fontSize: 12.5, padding: '8px 10px', borderRadius: 9, cursor: 'pointer',
                            border: `1px solid ${tokensBatchFilter === b.batch_id ? c.accent : c.border}`,
                            background: tokensBatchFilter === b.batch_id ? 'rgba(245,197,24,0.1)' : 'transparent',
                            color: tokensBatchFilter === b.batch_id ? c.accent : c.text,
                          }}>
                          {new Date(b.created_at).toLocaleString()} · {b.claimed}/{b.total} activados{b.note ? ` · ${b.note}` : ''}
                        </button>
                      ))}
                      {tokensBatchFilter && (
                        <button onClick={() => { setTokensBatchFilter(null); loadTokens(null) }} style={{ alignSelf: 'flex-start', fontSize: 11.5, color: c.muted, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: '2px 0' }}>
                          Ver todos los lotes
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div style={cardStyle}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Tus llaveros</div>
                  <p style={{ fontSize: 11, color: c.muted, margin: '0 0 10px' }}>
                    Control estricto por llavero: generá y descargá el QR (simple, estándar o máxima resistencia) cuando lo necesites para el evento.
                  </p>
                  {tokens.length === 0 ? (
                    <div style={{ fontSize: 12, color: c.muted }}>Sin llaveros todavía.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {tokens.map(t => (
                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 10px', borderRadius: 9, border: `1px solid ${c.border}` }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontFamily: 'monospace', color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.tag_uid}</div>
                            <div style={{ fontSize: 11, color: t.status === 'available' ? c.muted : '#2ecc71' }}>{t.status === 'available' ? 'Disponible' : 'Activado'}</div>
                          </div>
                          {t.qr_url && (
                            <button onClick={() => setQrModalUrl(t.qr_url)} style={{ flex: '0 0 auto', padding: '6px 12px', borderRadius: 8, border: `1px solid ${c.accent}`, background: 'transparent', color: c.accent, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>Ver QR</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <QrCodePanel isOpen={!!qrModalUrl} onClose={() => setQrModalUrl(null)} theme={isDark ? 'dark' : 'light'} qrUrl={qrModalUrl} />
    </div>
  )
}
