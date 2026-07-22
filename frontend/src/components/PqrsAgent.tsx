'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { addPqrs, KIND_LABEL, PqrsKind, PqrsMsg, PqrsEntry } from '@/lib/pqrs'

interface Props {
  isOpen: boolean
  onClose: () => void
  theme: 'light' | 'dark'
  plate?: string
  city?: string
  defaultEmail?: string
}

const GOLD = '#F5C518'
const GREEN = '#2ecc71'

type Step = 'kind' | 'category' | 'carModel' | 'message' | 'email' | 'done'

const KINDS: { id: PqrsKind; hint: string }[] = [
  { id: 'peticion', hint: 'Necesito algo' },
  { id: 'sugerencia', hint: 'Tengo una idea' },
  { id: 'queja', hint: 'Algo me molestó' },
  { id: 'reclamo', hint: 'Quiero una solución' },
]

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'modelo', label: 'Falta el modelo o marca de mi auto' },
  { id: 'bug', label: 'Algo no funciona como debería' },
  { id: 'ux', label: 'Mejorar la experiencia de uso' },
  { id: 'servicio', label: 'Un taller o servicio de la red' },
  { id: 'otro', label: 'Otro tema' },
]

export default function PqrsAgent({ isOpen, onClose, theme, plate, city, defaultEmail }: Props) {
  const [step, setStep] = useState<Step>('kind')
  const [msgs, setMsgs] = useState<PqrsMsg[]>([])
  const [kind, setKind] = useState<PqrsKind | null>(null)
  const [category, setCategory] = useState<{ id: string; label: string } | null>(null)
  const [carModel, setCarModel] = useState('')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [draft, setDraft] = useState('')
  const [saved, setSaved] = useState<PqrsEntry | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isDark = theme === 'dark'
  const panelBg = isDark ? 'rgba(16,16,16,0.97)' : 'rgba(247,246,242,0.98)'
  const border = isDark ? 'rgba(245,197,24,0.22)' : 'rgba(17,17,17,0.12)'
  const subtle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,17,0.08)'
  const botBubble = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(17,17,17,0.05)'
  const inputBg = isDark ? 'rgba(0,0,0,0.35)' : '#ffffff'
  const textPrimary = isDark ? '#f5f3ec' : '#17171a'
  const textMuted = isDark ? '#8f8a7a' : '#7a756a'

  const pushBot = (text: string) => setMsgs(m => [...m, { role: 'bot', text }])
  const pushUser = (text: string) => setMsgs(m => [...m, { role: 'user', text }])

  // Reinicia y saluda cada vez que se abre
  useEffect(() => {
    if (!isOpen) return
    setStep('kind'); setKind(null); setCategory(null); setCarModel(''); setMessage(''); setEmail(''); setDraft(''); setSaved(null)
    setMsgs([
      { role: 'bot', text: '¡Hola! Soy CarLia, tu asistente CarLink 🤝 Aprendo de tu experiencia para que el equipo mejore la app más rápido.' },
      { role: 'bot', text: '¿Qué quieres compartir hoy?' },
    ])
  }, [isOpen])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, step])

  useEffect(() => {
    if ((step === 'carModel' || step === 'message' || step === 'email') && isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 120)
      return () => clearTimeout(t)
    }
  }, [step, isOpen])

  const selectKind = (k: PqrsKind) => {
    setKind(k)
    pushUser(KIND_LABEL[k])
    pushBot('Perfecto. ¿Con qué tiene que ver? Elige lo que más se acerque:')
    setStep('category')
  }

  const selectCategory = (c: { id: string; label: string }) => {
    setCategory(c)
    pushUser(c.label)
    if (c.id === 'modelo') {
      pushBot('¡Gracias! Nos ayuda muchísimo a completar el catálogo. ¿Qué marca y modelo (y año) faltan?')
      setStep('carModel')
    } else {
      pushBot('Cuéntame con detalle qué pasó o qué mejorarías. Entre más contexto, más rápido lo resolvemos 👇')
      setStep('message')
    }
  }

  const submitDraft = () => {
    const v = draft.trim()
    if (!v) return
    pushUser(v)
    setDraft('')
    if (step === 'carModel') {
      setCarModel(v)
      pushBot('Anotado. Ahora, ¿qué te gustaría que pasara o qué detalle debemos saber?')
      setStep('message')
    } else if (step === 'message') {
      setMessage(v)
      pushBot('¡Listo! ¿A qué correo te avisamos cuando lo resolvamos? (opcional)')
      setStep('email')
    } else if (step === 'email') {
      setEmail(v)
      finalize(v)
    }
  }

  const finalize = (mail?: string) => {
    const transcript = [...msgs]
    const entry = addPqrs({
      kind: kind || 'sugerencia',
      category: category?.id || 'otro',
      categoryLabel: category?.label || 'Otro tema',
      carModel: carModel || undefined,
      message: message || draft.trim() || category?.label || '',
      email: (mail ?? email) || defaultEmail || undefined,
      plate, city,
      transcript,
    })
    setSaved(entry)
    pushBot(`¡Gracias! Registré tu ${KIND_LABEL[entry.kind].toLowerCase()} con el radicado ${entry.ticket}. El servicio técnico ya puede verlo dentro de la app y lo resolverá pronto. 🛠️`)
    setStep('done')
  }

  const quickReplies = (() => {
    if (step === 'kind') return KINDS.map(k => ({ key: k.id, label: KIND_LABEL[k.id], hint: k.hint, onClick: () => selectKind(k.id) }))
    if (step === 'category') return CATEGORIES.map(c => ({ key: c.id, label: c.label, hint: '', onClick: () => selectCategory(c) }))
    return []
  })()

  const showInput = step === 'carModel' || step === 'message' || step === 'email'
  const placeholder = step === 'carModel' ? 'Ej. Mazda CX-30 2023' : step === 'email' ? (defaultEmail || 'tucorreo@gmail.com') : 'Escribe aquí…'

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }}>
          <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} />

          <motion.div initial={{ opacity: 0, y: 40, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 460, height: 'min(640px, 88vh)', display: 'flex', flexDirection: 'column', background: panelBg, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: `1px solid ${border}`, borderRadius: 24, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,.6)', color: textPrimary, marginBottom: 8 }}>

            {/* Header */}
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${subtle}`, display: 'flex', alignItems: 'center', gap: 11 }}>
              <span style={{ position: 'relative', width: 40, height: 40, borderRadius: 12, background: GOLD, color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M8 10h.01M12 10h.01M16 10h.01" /></svg>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.1 }}>CarLia · Asistente PQRS</div>
                <div style={{ fontSize: 11, color: textMuted }}>Peticiones · Quejas · Reclamos · Sugerencias</div>
              </div>
              <button onClick={onClose} aria-label="Cerrar" style={{ width: 34, height: 34, borderRadius: 10, background: botBubble, border: `1px solid ${subtle}`, color: textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Chat */}
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {msgs.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', padding: '10px 13px', fontSize: 13.5, lineHeight: 1.5, borderRadius: m.role === 'user' ? '14px 14px 3px 14px' : '14px 14px 14px 3px', background: m.role === 'user' ? GOLD : botBubble, color: m.role === 'user' ? '#111' : textPrimary, fontWeight: m.role === 'user' ? 600 : 400 }}>
                  {m.text}
                </motion.div>
              ))}

              {/* Quick replies */}
              {quickReplies.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 4 }}>
                  {quickReplies.map(q => (
                    <button key={q.key} onClick={q.onClick}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, textAlign: 'left', padding: '11px 14px', borderRadius: 12, border: `1px solid ${border}`, background: 'rgba(245,197,24,0.06)', color: textPrimary, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .14s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.16)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.06)' }}>
                      <span>{q.label}</span>
                      {q.hint && <span style={{ fontSize: 11, color: textMuted, fontWeight: 500, flex: '0 0 auto' }}>{q.hint}</span>}
                    </button>
                  ))}
                </div>
              )}

              {step === 'done' && saved && (
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ padding: 14, borderRadius: 14, background: 'rgba(46,204,113,0.1)', border: '1px solid rgba(46,204,113,0.25)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: GREEN, fontSize: 13.5 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                      Radicado {saved.ticket}
                    </div>
                    <div style={{ fontSize: 12, color: textMuted }}>Estado: Nuevo · visible para el servicio técnico dentro de la app.</div>
                  </div>
                  <button onClick={onClose} style={{ padding: '12px', borderRadius: 12, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 13.5, cursor: 'pointer' }}>Listo, cerrar</button>
                </div>
              )}
            </div>

            {/* Input */}
            {showInput && (
              <div style={{ padding: 12, borderTop: `1px solid ${subtle}`, display: 'flex', gap: 8, alignItems: 'center' }}>
                <input ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitDraft() }}
                  placeholder={placeholder} type={step === 'email' ? 'email' : 'text'}
                  style={{ flex: 1, padding: '11px 14px', borderRadius: 12, border: `1px solid ${subtle}`, background: inputBg, color: textPrimary, fontSize: 13.5, outline: 'none', fontFamily: 'inherit' }} />
                {step === 'email' && (
                  <button onClick={() => finalize('')} title="Omitir" style={{ padding: '11px 12px', borderRadius: 12, border: `1px solid ${subtle}`, background: 'transparent', color: textMuted, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', flex: '0 0 auto' }}>Omitir</button>
                )}
                <button onClick={submitDraft} aria-label="Enviar" style={{ width: 42, height: 42, borderRadius: 12, border: 'none', background: GOLD, color: '#111', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
