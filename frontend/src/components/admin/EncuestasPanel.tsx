'use client'

import { useCallback, useEffect, useState } from 'react'
import { surveysApi } from '@/lib/api'
import type { AdminSurvey, ReviewTargetType, SurveyTriggerInfo } from '@/lib/types'

interface Colors { bg: string; card: string; border: string; text: string; muted: string; accent: string }

const CATEGORY: Record<string, string> = { platform: 'Plataforma', product: 'Producto', workshop: 'Taller' }
const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : '—')

/* Catálogo de encuestas de satisfacción (migración 064), dentro de Admin > Reseñas > Encuestas.
   Cada encuesta sale como tarjeta flotante en la app del cliente cuando ocurre su evento. Aquí se
   ve dónde y cuándo sale, si el cliente la responde o la salta (analítica propia), se edita el
   texto, se pausa y se crean nuevas sobre los momentos que la app ya sabe disparar. */
export default function EncuestasPanel({ c }: { c: Colors }) {
  const [rows, setRows] = useState<AdminSurvey[]>([])
  const [triggers, setTriggers] = useState<SurveyTriggerInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState({ title: '', hint: '' })
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newSurvey, setNewSurvey] = useState<{ title: string; hint: string; trigger_key: string; target_type: ReviewTargetType }>({ title: '', hint: '', trigger_key: '', target_type: 'platform' })
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [list, trig] = await Promise.all([surveysApi.adminList(), surveysApi.adminTriggers()])
    setFailed(list === null)
    setRows(list || [])
    setTriggers(trig || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const patch = async (key: string, data: { title?: string; hint?: string; is_active?: boolean }) => {
    setSaving(true)
    const res = await surveysApi.adminUpdate(key, data)
    setSaving(false)
    if (res) setRows(prev => prev.map(r => (r.key === key ? { ...r, ...data } : r)))
    return !!res
  }
  const startEdit = (s: AdminSurvey) => { setEditing(s.key); setDraft({ title: s.title, hint: s.hint }) }
  const saveEdit = async (key: string) => { if (await patch(key, draft)) setEditing(null) }

  const remove = async (s: AdminSurvey) => {
    if (!window.confirm(`¿Borrar la encuesta "${s.title}"? Solo es posible porque no tiene respuestas.`)) return
    setError('')
    const ok = await surveysApi.adminDelete(s.key)
    if (ok) setRows(prev => prev.filter(r => r.key !== s.key))
    else setError('No se pudo borrar: tiene respuestas (pausa la encuesta en su lugar).')
  }

  const trigger = triggers.find(t => t.key === newSurvey.trigger_key)
  const occupied = rows.find(r => r.is_active && r.trigger_key === newSurvey.trigger_key)
  const pickTrigger = (key: string) => {
    const t = triggers.find(x => x.key === key)
    setNewSurvey(n => ({ ...n, trigger_key: key, target_type: t?.target_types.includes(n.target_type) ? n.target_type : (t?.target_types[0] ?? 'platform') }))
  }
  const create = async () => {
    setSaving(true); setError('')
    const res = await surveysApi.adminCreate(newSurvey)
    setSaving(false)
    if (!res) { setError('No se pudo crear la encuesta. Revisa los campos.'); return }
    setCreating(false)
    setNewSurvey({ title: '', hint: '', trigger_key: '', target_type: 'platform' })
    setLoading(true)
    await load()
  }

  const btn = (primary = false): React.CSSProperties => ({ padding: '7px 12px', borderRadius: 8, border: `1px solid ${c.border}`, background: primary ? c.accent : 'transparent', color: primary ? '#111' : c.muted, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' })
  const input: React.CSSProperties = { width: '100%', padding: '9px 11px', borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.text, fontSize: 13.5, fontFamily: 'inherit', boxSizing: 'border-box' }
  const label: React.CSSProperties = { fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 700, color: c.muted, marginBottom: 3 }
  const stat = (value: string, name: string, hint?: string) => (
    <div title={hint} style={{ textAlign: 'center', minWidth: 74 }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: c.accent }}>{value}</div>
      <div style={{ fontSize: 11, color: c.muted }}>{name}</div>
    </div>
  )

  return (
    <div>
      <p style={{ margin: '0 0 14px', fontSize: 13.5, lineHeight: 1.6, color: c.muted, maxWidth: 780 }}>
        Cada encuesta sale como una tarjeta flotante en la app del cliente (abajo a la derecha) cuando ocurre su evento, y no
        se repite si el cliente ya respondió o la cerró. Aquí ves dónde y cuándo sale, cuántas veces se mostró, cuántas
        respondieron y cuántas se cerraron sin responder. Las respuestas individuales están en la vista Respuestas.
      </p>

      <div style={{ marginBottom: 16 }}>
        {!creating && <button onClick={() => { setCreating(true); setError('') }} style={btn(true)}>+ Nueva encuesta</button>}
        {creating && (
          <div style={{ background: c.card, border: `1px solid ${c.accent}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontWeight: 800 }}>Nueva encuesta</div>
            <div>
              <div style={label}>¿En qué momento debe salir?</div>
              <select value={newSurvey.trigger_key} onChange={e => pickTrigger(e.target.value)} style={input}>
                <option value="">Elige un momento…</option>
                {triggers.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
              {trigger && <div style={{ fontSize: 12.5, color: c.muted, marginTop: 6, lineHeight: 1.5 }}>{trigger.location}. {trigger.timing}.</div>}
              {occupied && <div style={{ fontSize: 12.5, color: '#ff8a3d', marginTop: 6, lineHeight: 1.5 }}>Ya hay una encuesta activa en este momento (&quot;{occupied.title}&quot;). Si dejas ambas activas, solo sale la primera de la lista: pausa la otra para que salga la nueva.</div>}
            </div>
            {trigger && trigger.target_types.length > 1 && (
              <div>
                <div style={label}>Categoría</div>
                <select value={newSurvey.target_type} onChange={e => setNewSurvey(n => ({ ...n, target_type: e.target.value as ReviewTargetType }))} style={input}>
                  {trigger.target_types.map(t => <option key={t} value={t}>{CATEGORY[t]}</option>)}
                </select>
              </div>
            )}
            <div><div style={label}>Pregunta</div><input value={newSurvey.title} maxLength={140} onChange={e => setNewSurvey(n => ({ ...n, title: e.target.value }))} placeholder="Ej. ¿Qué tal fue escanear tu llavero?" style={input} /></div>
            <div><div style={label}>Texto de apoyo</div><textarea value={newSurvey.hint} maxLength={300} rows={2} onChange={e => setNewSurvey(n => ({ ...n, hint: e.target.value }))} style={{ ...input, resize: 'vertical' }} /></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={create} disabled={saving || !newSurvey.trigger_key || newSurvey.title.trim().length < 3} style={btn(true)}>{saving ? 'Creando...' : 'Crear encuesta'}</button>
              <button onClick={() => setCreating(false)} style={btn()}>Cancelar</button>
            </div>
          </div>
        )}
        {error && <div style={{ color: '#ff6b6b', fontSize: 13, marginTop: 8 }}>{error}</div>}
      </div>

      {loading && <div style={{ color: c.muted, padding: 20 }}>Cargando...</div>}
      {!loading && failed && <div style={{ color: '#ff8a3d', padding: 20 }}>No se pudo cargar el catálogo. Verifica que la migración 064_surveys.sql esté aplicada.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map(s => (
          <div key={s.key} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 16, opacity: s.is_active ? 1 : 0.65 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: 'rgba(245,197,24,0.14)', color: c.accent }}>{CATEGORY[s.target_type] || s.target_type}</span>
                <span style={{ fontSize: 12, color: c.muted, fontFamily: 'monospace' }}>{s.key}</span>
              </div>
              <button onClick={() => patch(s.key, { is_active: !s.is_active })} disabled={saving} style={btn(s.is_active)}>{s.is_active ? 'Activa' : 'Pausada'}</button>
            </div>

            {editing === s.key ? (
              <div style={{ margin: '12px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div><div style={label}>Pregunta</div><input value={draft.title} maxLength={140} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} style={input} /></div>
                <div><div style={label}>Texto de apoyo</div><textarea value={draft.hint} maxLength={300} rows={2} onChange={e => setDraft(d => ({ ...d, hint: e.target.value }))} style={{ ...input, resize: 'vertical' }} /></div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => saveEdit(s.key)} disabled={saving || draft.title.trim().length < 3} style={btn(true)}>{saving ? 'Guardando...' : 'Guardar'}</button>
                  <button onClick={() => setEditing(null)} style={btn()}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div style={{ margin: '12px 0' }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: c.muted, marginTop: 3, lineHeight: 1.5 }}>{s.hint}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <button onClick={() => startEdit(s)} style={btn()}>Editar texto</button>
                  {s.responses === 0 && s.key !== 'workshop_service' && <button onClick={() => remove(s)} style={btn()}>Borrar</button>}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', padding: '12px 0', borderTop: `1px solid ${c.border}` }}>
              {stat(String(s.shown), 'Mostrada', 'Veces que apareció en pantalla')}
              {stat(String(s.responses), 'Respondida', s.responses > 0 ? `Promedio ${s.average.toFixed(1)} de 5` : 'Sin respuestas')}
              {stat(String(s.dismissed), 'Cerrada sin responder', 'El cliente la cerró con x, Después o Ahora no')}
              {stat(pct(s.responses, s.shown), 'Tasa de respuesta')}
              {stat(pct(s.dismissed, s.shown), 'Tasa de salto')}
              {stat(s.responses > 0 ? s.average.toFixed(1) : '—', 'Promedio')}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(230px,100%),1fr))', gap: 12, borderTop: `1px solid ${c.border}`, paddingTop: 12 }}>
              <div><div style={label}>Dónde aparece</div><div style={{ fontSize: 13, lineHeight: 1.5 }}>{s.location || '—'}</div></div>
              <div><div style={label}>Cuándo aparece</div><div style={{ fontSize: 13, lineHeight: 1.5 }}>{s.timing || '—'}</div></div>
              <div>
                <div style={label}>Última vez mostrada</div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                  {s.last_shown_at ? `${new Date(s.last_shown_at).toLocaleString('es-CO')}${s.last_shown_path ? ` · ${s.last_shown_path}` : ''}` : 'Aún no se ha mostrado'}
                </div>
                <div style={{ fontSize: 11.5, color: c.muted, fontFamily: 'monospace', marginTop: 2 }}>evento: {s.trigger_key}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
