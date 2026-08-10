'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { 
  Send, Loader2, Bot, User, Shield, HeartHandshake, 
  UtensilsCrossed, Wrench, Briefcase, MapPin, Sprout,
  Sparkles, CheckCircle, ChevronRight
} from 'lucide-react'
import { SECTORS, type Sector, type ChatMessage, type SectorRecommendation } from '@/lib/utils'

const SECTOR_ICONS: Record<string, React.ElementType> = {
  emergencias: Shield,
  fidelizacion: HeartHandshake,
  restaurantes: UtensilsCrossed,
  mantenimiento: Wrench,
  servicios: Briefcase,
  turismo: MapPin,
  agro: Sprout,
}

const AGENT_RESPONSES: Record<string, { rationale: string; confidence: number }> = {
  emergencias: { 
    rationale: 'Los llaveros SOS permiten alertas instantáneas a contactos de emergencia y servicios médicos con un solo toque. Ideal para adultos mayores, deportistas de riesgo y personal de seguridad.', 
    confidence: 0.95 
  },
  fidelizacion: { 
    rationale: 'El sistema de puntos por tap gamifica la recurrencia. Cada visita suma, y los premios automáticos (descuentos, productos gratis) disparan el LTV un 40% promedio.', 
    confidence: 0.92 
  },
  restaurantes: { 
    rationale: 'Menú digital + pedidos en mesa + programa de fidelidad en un solo llavero. Reduce tiempos de espera 60% y aumenta ticket promedio 23% con upsells contextuales.', 
    confidence: 0.89 
  },
  mantenimiento: { 
    rationale: 'Historial de servicios inmutable en el chip. El cliente tapa y ve su próximo mantenimiento; el taller recibe la orden automática. Cero papel, cero errores.', 
    confidence: 0.91 
  },
  servicios: { 
    rationale: 'Agenda, cotizaciones y seguimiento de proyectos en el llavero del cliente. Notificaciones push automáticas en cada hito. Profesionaliza tu operación.', 
    confidence: 0.87 
  },
  turismo: { 
    rationale: 'Guía offline + rutas GPS + check-ins gamificados. Los turistas coleccionan "stamps" digitales por visita. Destinos reportan 3x engagement vs apps tradicionales.', 
    confidence: 0.85 
  },
  agro: { 
    rationale: 'Trazabilidad de lote a mesa. Cada llavero registra cosecha, tratamiento y certificación. El consumidor final escanea y ve el viaje completo. Premium pricing +25%.', 
    confidence: 0.88 
  },
}

const QUICK_REPLIES = [
  'Quiero fidelizar clientes en mi café',
  'Necesito un botón de emergencia para mi familia',
  'Tengo un restaurante y quiero menú digital',
  'Gestiono mantenimientos de flotas',
  'Quiero promocionar mi destino turístico',
]

export function AIAgent() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: '¡Hola! Soy el agente IA de CarLink. Cuéntame qué necesitas y te recomendaré el paquete NFC perfecto para tu negocio.',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [pinnedSector, setPinnedSector] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const simulateAgentResponse = useCallback((userMessage: string) => {
    setIsTyping(true)
    
    const lowerMessage = userMessage.toLowerCase()
    let matchedSector: Sector | null = null
    let maxScore = 0

    SECTORS.forEach(sector => {
      const keywords = sector.name.toLowerCase().split(' ')
      const descKeywords = sector.description.toLowerCase().split(' ')
      const allKeywords = [...keywords, ...descKeywords]
      
      let score = 0
      allKeywords.forEach(kw => {
        if (lowerMessage.includes(kw)) score += 1
      })
      
      if (score > maxScore) {
        maxScore = score
        matchedSector = sector
      }
    })

    if (!matchedSector) {
      matchedSector = SECTORS[Math.floor(Math.random() * SECTORS.length)]
    }

    const response = AGENT_RESPONSES[matchedSector.id] || AGENT_RESPONSES.fidelizacion

    setTimeout(() => {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Te recomiendo el paquete **${matchedSector.name}**. ${response.rationale}`,
        timestamp: new Date(),
        sectorRecommendation: {
          sector: matchedSector,
          rationale: response.rationale,
          confidence: response.confidence,
        },
      }
      setMessages(prev => [...prev, newMessage])
      setIsTyping(false)
    }, 1500 + Math.random() * 1000)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isTyping) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = input
    setInput('')
    simulateAgentResponse(currentInput)
  }

  const handleQuickReply = (reply: string) => {
    setInput(reply)
    handleSubmit(new Event('submit') as React.FormEvent)
  }

  const handleSectorClick = (sector: Sector) => {
    setPinnedSector(prev => prev === sector.id ? null : sector.id)
  }

  return (
    <section id="agente-ia" className="relative py-20 lg:py-32 overflow-hidden">
      <div className="relative z-10 max-w-[var(--content-max)] mx-auto px-[var(--gutter)]">
        <div className="agent-head max-w-2xl mb-12 text-center">
          <span className="eyebrow inline-block mb-4">Agente Inteligente</span>
          <h2 className="h1 mb-6">Describe tu necesidad, <span className="brand-grad">la IA elige por ti</span></h2>
          <p className="lead max-w-xl mx-auto">
            No necesitas saber de tecnología. Solo cuéntanos tu objetivo y nuestro agente 
            te recomienda la configuración exacta: sector, funcionalidades y precio.
          </p>
        </div>

        <div className="agent-grid grid lg:grid-cols-[1fr_1.05fr] gap-8 items-start">
          <div className="agent-sectors grid grid-cols-2 gap-3">
            {SECTORS.map((sector) => {
              const Icon = SECTOR_ICONS[sector.id]
              const isPinned = pinnedSector === sector.id
              return (
                <button
                  key={sector.id}
                  className={cn(
                    'sector-card p-5 rounded-2xl text-left transition-all duration-300 ease-out',
                    isPinned && 'is-pinned'
                  )}
                  onClick={() => handleSectorClick(sector)}
                  aria-pressed={isPinned}
                >
                  <div 
                    className="sector-ico rounded-xl flex items-center justify-center"
                    style={{ 
                      background: `linear-gradient(135deg, rgba(177,79,255,0.15), rgba(46,46,255,0.1))`,
                      border: '1px solid rgba(177,79,255,0.2)',
                    }}
                  >
                    <Icon className="w-6 h-6 text-[var(--ai-violet-bright)]" />
                  </div>
                  <div className="sector-name font-semibold">{sector.name}</div>
                  <div className="sector-pitch text-sm text-fg-muted">{sector.description}</div>
                  {isPinned && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-[var(--ai-violet-bright)] font-medium">
                      <CheckCircle className="w-4 h-4" />
                      <span>Seleccionado</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          <div className="agent-chat flex flex-col rounded-2xl border border-border overflow-hidden" style={{ 
            minHeight: '520px',
            background: 'rgba(12,12,22,0.7)',
            backdropFilter: 'blur(18px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}>
            <div className="chat-head px-5 py-4 border-b border-border flex items-center gap-3">
              <div className="chat-avatar w-10 h-10 rounded-full flex items-center justify-center" style={{
                background: 'var(--ai-graphite)',
                border: '1px solid rgba(177,79,255,0.4)',
                boxShadow: '0 0 16px rgba(177,79,255,0.4)',
              }}>
                <Bot className="w-6 h-6 text-[var(--ai-violet-bright)]" />
              </div>
              <div>
                <div className="chat-name font-medium">CarLink AI</div>
                <div className="chat-status flex items-center gap-1.5">
                  <span className="dot dot--ok" />
                  <span>En línea · Responde en segundos</span>
                </div>
              </div>
            </div>

            <div className="chat-body flex-1 overflow-y-auto p-5 space-y-4" style={{ maxHeight: '420px' }}>
              {messages.map((msg) => (
                <div key={msg.id} className={cn('flex', msg.role === 'user' && 'justify-end')}>
                  <div className={cn(
                    'bubble max-w-[86%] px-4 py-3 rounded-2xl',
                    msg.role === 'user' ? 'bubble--user' : 'bubble--assistant'
                  )}>
                    {msg.sectorRecommendation && (
                      <div className="bubble-eyebrow">Recomendación IA</div>
                    )}
                    <div className="bubble-text whitespace-pre-wrap">{msg.content}</div>
                    {msg.sectorRecommendation && (
                      <div className="bubble-cta mt-3 flex items-center gap-3">
                        <span className="chip px-3 py-1 rounded-full text-xs font-semibold border" style={{
                          background: 'rgba(177,79,255,0.12)',
                          borderColor: 'rgba(177,79,255,0.4)',
                          color: 'var(--ai-violet-bright)',
                        }}>
                          {msg.sectorRecommendation.sector.name}
                        </span>
                        <span className="text-xs text-fg-muted">
                          Confianza: {Math.round(msg.sectorRecommendation.confidence * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bubble bubble--assistant px-4 py-3">
                    <div className="typing flex gap-1">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-suggest px-5 pb-5 flex flex-wrap gap-2">
              {QUICK_REPLIES.slice(0, 3).map((reply, i) => (
                <button
                  key={i}
                  className="chat-suggest-btn px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                  onClick={() => handleQuickReply(reply)}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    borderColor: 'var(--border)',
                    color: 'var(--fg-muted)',
                  }}
                >
                  {reply}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="chat-input px-4 py-3 border-t border-border flex items-center gap-3" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu necesidad... (ej: 'Tengo una cafetería y quiero fidelizar clientes')"
                className="flex-1 px-4 py-2.5 rounded-full text-base outline-none transition-all"
                style={{
                  background: 'rgba(20,20,31,0.7)',
                  border: '1px solid var(--border)',
                  color: 'var(--fg)',
                  fontFamily: 'inherit',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(177,79,255,0.6)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(177,79,255,0.18)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border)'
                  e.target.style.boxShadow = 'none'
                }}
                disabled={isTyping}
                aria-label="Tu mensaje"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="btn btn--primary p-3 rounded-full"
                style={{ minWidth: '48px' }}
                aria-label="Enviar"
              >
                {isTyping ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}