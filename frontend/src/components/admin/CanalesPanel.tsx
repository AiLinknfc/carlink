'use client'

import { useCallback, useEffect, useState } from 'react'
import { channelsApi } from '@/lib/api'
import type { ChannelKeychain, ChannelKind, ChannelProvisionedItem, SalesChannel } from '@/lib/types'

interface Colors { bg: string; card: string; border: string; text: string; muted: string; accent: string }

const KIND_LABEL: Record<ChannelKind, string> = { marketplace: 'Marketplace', tienda_propia: 'Tienda propia', otro: 'Otro' }
const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : '—')

/* Canales de venta: experimentos para medir cómo se comportan los llaveros vendidos por otra vía
   (Shopify, Mercado Libre...). NO son partners — un partner es un aliado que vende productos de
   CarLink. Un llavero de canal nunca entra al inventario de la web. Aquí se crea el canal, se
   generan sus llaveros, se ve el lote con su código de activación y se marca lo que ya se envió. */
export default function CanalesPanel({ c }: { c: Colors }) {
  const [rows, setRows] = useState<SalesChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<{ name: string; kind: ChannelKind; notes: string }>({ name: '', kind: 'marketplace', notes: '' })
  const [busy, setBusy] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [lote, setLote] = useState<ChannelKeychain[]>([])
  const [qty, setQty] = useState('5')
  const [note, setNote] = useState('')
  const [fresh, setFresh] = useState<ChannelProvisionedItem[] | null>(null)

  const load = useCallback(async () => {
    const list = await channelsApi.list()
    setFailed(list === null)
    setRows(list || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const loadLote = async (id: string) => setLote((await channelsApi.keychains(id)) || [])

  const toggle = async (id: string) => {
    setFresh(null)
    if (openId === id) { setOpenId(null); return }
    setOpenId(id)
    setLote([])
    await loadLote(id)
  }

  const create = async () => {
    if (form.name.trim().length < 2) { setError('Escribe el nombre del canal (mínimo 2 caracteres).'); return }
    setBusy(true); setError('')
    const res = await channelsApi.create({ name: form.name.trim(), kind: form.kind, notes: form.notes.trim() })
    setBusy(false)
    if (!res) { setError('No se pudo crear el canal. Puede que ya exista uno con ese nombre.'); return }
    setForm({ name: '', kind: 'marketplace', notes: '' })
    setCreating(false)
    await load()
  }

  const provision = async (ch: SalesChannel) => {
    const n = parseInt(qty, 10)
    if (isNaN(n) || n < 1 || n > 50) { setError('La cantidad debe estar entre 1 y 50.'); return }
    if (!confirm(`Generar ${n} llavero(s) para "${ch.name}"? Se crean en la base real y no entran al inventario de la web.`)) return
    setBusy(true); setError('')
    const res = await channelsApi.provision(ch.id, n, note.trim())
    setBusy(false)
    if (!res) { setError('No se pudieron generar los llaveros.'); return }
    setFresh(res)
    await Promise.all([load(), loadLote(ch.id)])
  }

  const markSent = async (ch: SalesChannel) => {
    if (!confirm(`Marcar como enviados todos los llaveros pendientes de "${ch.name}"?`)) return
    setBusy(true); setError('')
    const res = await channelsApi.markDistributed(ch.id)
    setBusy(false)
    if (!res) { setError('No se pudo marcar el envío.'); return }
    await Promise.all([load(), loadLote(ch.id)])
  }

  const toggleStatus = async (ch: SalesChannel) => {
    const next = ch.status === 'active' ? 'closed' : 'active'
    const res = await channelsApi.update(ch.id, { status: next })
    if (res) setRows(prev => prev.map(x => (x.id === ch.id ? { ...x, status: res.status } : x)))
  }

  const downloadCsv = (ch: SalesChannel) => {
    const head = 'tag_uid,codigo_activacion,qr,estado,enviado\n'
    const body = lote.map(k => [k.tag_uid, k.activation_code ?? '', k.qr_url ?? '', k.status, k.distributed_at ? 'si' : 'no'].join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([head + body], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `canal-${ch.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const btn: React.CSSProperties = { padding: '6px 12px', fontSize: 12, borderRadius: 8, border: `1px solid ${c.accent}`, background: 'transparent', color: c.accent, cursor: 'pointer', fontWeight: 600 }
  const solid: React.CSSProperties = { ...btn, background: c.accent, color: '#111' }
  const input: React.CSSProperties = { padding: '8px 10px', borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.text, fontSize: 13, fontFamily: 'inherit' }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => { setCreating(v => !v); setError('') }} style={solid}>{creating ? 'Cancelar' : '+ Crear canal'}</button>
        <span style={{ fontSize: 12, color: c.muted }}>
          Un canal es un experimento de venta (Shopify, Mercado Libre...). No es un partner, y sus llaveros nunca se venden por la web.
        </span>
      </div>

      {creating && (
        <div style={{ marginBottom: 16, padding: 16, borderRadius: 12, background: c.card, border: `1px solid ${c.border}`, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ fontSize: 11, color: c.muted, display: 'flex', flexDirection: 'column', gap: 4 }}>Nombre
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Shopify - prueba 1" style={{ ...input, width: 220 }} />
          </label>
          <label style={{ fontSize: 11, color: c.muted, display: 'flex', flexDirection: 'column', gap: 4 }}>Tipo
            <select value={form.kind} onChange={e => setForm(f => ({ ...f, kind: e.target.value as ChannelKind }))} style={input}>
              {(Object.keys(KIND_LABEL) as ChannelKind[]).map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 11, color: c.muted, display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 180 }}>Notas (opcional)
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Qué se quiere medir con este canal" style={input} />
          </label>
          <button onClick={create} disabled={busy} style={solid}>{busy ? 'Creando...' : 'Crear'}</button>
        </div>
      )}

      {error && <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 12, color: '#ef4444' }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map(ch => (
          <div key={ch.id} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {ch.name} · <span style={{ color: ch.status === 'active' ? '#2ecc71' : c.muted }}>{ch.status === 'active' ? 'Activo' : 'Cerrado'}</span>
                </div>
                <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>{KIND_LABEL[ch.kind]}{ch.notes ? ` · ${ch.notes}` : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 18, textAlign: 'center' }}>
                <div><div style={{ fontWeight: 700, fontSize: 15 }}>{ch.total}</div><div style={{ fontSize: 11, color: c.muted }}>asignados</div></div>
                <div><div style={{ fontWeight: 700, fontSize: 15 }}>{ch.distributed}</div><div style={{ fontSize: 11, color: c.muted }}>enviados</div></div>
                <div><div style={{ fontWeight: 700, fontSize: 15 }}>{ch.activated}</div><div style={{ fontSize: 11, color: c.muted }}>activados</div></div>
                <div><div style={{ fontWeight: 700, fontSize: 15 }}>{pct(ch.activated, ch.distributed)}</div><div style={{ fontSize: 11, color: c.muted }}>activación</div></div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button onClick={() => toggle(ch.id)} style={btn}>{openId === ch.id ? 'Ocultar lote' : 'Ver lote'}</button>
              <button onClick={() => toggleStatus(ch)} style={btn}>{ch.status === 'active' ? 'Cerrar canal' : 'Reactivar'}</button>
            </div>

            {openId === ch.id && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${c.border}` }}>
                {ch.status === 'active' && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
                    <label style={{ fontSize: 11, color: c.muted, display: 'flex', flexDirection: 'column', gap: 4 }}>Cantidad (1-50)
                      <input value={qty} onChange={e => setQty(e.target.value.replace(/\D/g, ''))} inputMode="numeric" style={{ ...input, width: 80 }} />
                    </label>
                    <label style={{ fontSize: 11, color: c.muted, display: 'flex', flexDirection: 'column', gap: 4 }}>Nota del lote (opcional)
                      <input value={note} onChange={e => setNote(e.target.value)} placeholder="Lote 1" style={{ ...input, width: 200 }} />
                    </label>
                    <button onClick={() => provision(ch)} disabled={busy} style={solid}>{busy ? 'Generando...' : 'Generar llaveros'}</button>
                  </div>
                )}

                {fresh && (
                  <div style={{ marginBottom: 12, padding: 12, borderRadius: 10, border: `2px solid ${c.accent}` }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: c.accent, marginBottom: 6 }}>
                      Llaveros generados: guarda las URL para grabar los chips, no se vuelven a mostrar
                    </div>
                    {fresh.map(i => (
                      <div key={i.id} style={{ fontSize: 11, color: c.muted, padding: '2px 0', wordBreak: 'break-all' }}>
                        <b style={{ color: c.text }}>{i.tag_uid}</b> · código <b style={{ color: c.text }}>{i.activation_code}</b> · chip: {i.token_url}
                      </div>
                    ))}
                    <button onClick={() => navigator.clipboard?.writeText(fresh.map(i => `${i.tag_uid}\t${i.activation_code}\t${i.token_url}\t${i.qr_url}`).join('\n'))} style={{ ...btn, marginTop: 8 }}>Copiar todo</button>
                  </div>
                )}

                {lote.length === 0 ? (
                  <div style={{ fontSize: 12, color: c.muted }}>Sin llaveros todavía.</div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      <button onClick={() => markSent(ch)} disabled={busy || lote.every(k => k.distributed_at)} style={btn}>Marcar pendientes como enviados</button>
                      <button onClick={() => downloadCsv(ch)} style={btn}>Descargar CSV (códigos y QR)</button>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ color: c.muted, textAlign: 'left' }}>
                            <th style={{ padding: '4px 8px' }}>Llavero</th><th style={{ padding: '4px 8px' }}>Código de activación</th>
                            <th style={{ padding: '4px 8px' }}>Estado</th><th style={{ padding: '4px 8px' }}>Envío</th><th style={{ padding: '4px 8px' }}>QR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lote.map(k => (
                            <tr key={k.id} style={{ borderTop: `1px solid ${c.border}` }}>
                              <td style={{ padding: '4px 8px' }}>{k.tag_uid}</td>
                              <td style={{ padding: '4px 8px', fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}>{k.activation_code ?? '—'}</td>
                              <td style={{ padding: '4px 8px', color: k.status === 'claimed' ? '#2ecc71' : c.muted }}>{k.status === 'claimed' ? 'Activado' : 'Disponible'}</td>
                              <td style={{ padding: '4px 8px', color: k.distributed_at ? '#2ecc71' : c.muted }}>{k.distributed_at ? `Enviado ${new Date(k.distributed_at).toLocaleDateString()}` : 'Pendiente'}</td>
                              <td style={{ padding: '4px 8px' }}>{k.qr_url ? <a href={k.qr_url} target="_blank" rel="noopener noreferrer" style={{ color: c.accent }}>Abrir</a> : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
        {loading && <div style={{ color: c.muted, padding: 20, textAlign: 'center' }}>Cargando...</div>}
        {failed && !loading && <div style={{ color: '#ef4444', padding: 20, textAlign: 'center' }}>No se pudieron cargar los canales.</div>}
        {!loading && !failed && rows.length === 0 && <div style={{ color: c.muted, padding: 20, textAlign: 'center' }}>Sin canales todavía</div>}
      </div>
    </div>
  )
}
