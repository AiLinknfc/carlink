'use client'

import { cn } from '@/lib/utils'
import { KeychainCustomizer } from '@/components/keychain/KeychainCustomizer'
import { ArrowRight, Sparkles, Zap, Shield, Users, TrendingUp } from 'lucide-react'
import { ShaderBackground } from '@/components/ui/ShaderBackground'

const FEATURES = [
  { icon: Sparkles, title: 'Personalización Total', desc: 'Diseña tu llavero NFC con texto, imágenes o códigos QR en tiempo real.' },
  { icon: Zap, title: 'IA Integrada', desc: 'Nuestro agente IA recomienda la mejor configuración para tu negocio.' },
  { icon: Shield, title: 'Seguridad NFC', desc: 'Chips NFC certificados, encriptados y compatibles con todos los smartphones.' },
  { icon: Users, title: 'Fidelización Real', desc: 'Convierte cada tap en puntos, recompensas y datos de clientes valiosos.' },
  { icon: TrendingUp, title: 'Analytics en Vivo', desc: 'Dashboard en tiempo real con métricas de engagement y conversión.' },
]

export function Hero() {
  return (
    <section id="inicio" className="relative min-h-screen flex items-center overflow-hidden">
      <ShaderBackground intensity={1} />
      
      <div className="relative z-10 w-full max-w-[var(--content-max)] mx-auto px-[var(--gutter)] py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[80vh]">
          <div className="hero-copy space-y-6">
            <span className="eyebrow inline-block">Plataforma NFC Inteligente</span>
            <h1 className="display text-fg leading-[1.02] tracking-tight">
              Llaveros NFC que{' '}
              <span className="brand-grad">conectan tu negocio</span>{' '}
              con el mundo digital
            </h1>
            <p className="lead max-w-xl">
              Transforma cada interacción física en una oportunidad digital. 
              Personaliza, automatiza y mide el engagement de tus clientes con un simple toque.
            </p>
            
            <div className="hero-cta flex flex-wrap gap-4">
              <button className="btn btn--primary group">
                <span>Comenzar Gratis</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button className="btn btn--outline">
                Ver Demo en Vivo
              </button>
            </div>

            <div className="brand-drawer pt-6 border-t border-border">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <span className="eyebrow--dim block mb-2">Empresas que confían en CarLink</span>
                  <div className="flex flex-wrap gap-2">
                    {['Café Juan Valdez', 'Bancolombia', 'Éxito', 'Rappi', 'Homecenter'].map((name, i) => (
                      <span key={i} className="px-3 py-1 text-xs font-medium bg-[rgba(255,255,255,0.05)] border border-border rounded-full text-fg-muted">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="eyebrow--dim block mb-2">Resultados promedio</span>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-[var(--ai-violet-bright)]">+340%</span>
                      <span className="text-fg-muted">engagement</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-[var(--ai-violet-bright)]">2.8x</span>
                      <span className="text-fg-muted">retención</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-[var(--ai-violet-bright)]">89%</span>
                      <span className="text-fg-muted">tap rate</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="hero-stage">
            <KeychainCustomizer />
            
            <div className="mt-8 grid grid-cols-3 gap-4 text-center">
              {FEATURES.slice(0, 3).map((feature, i) => (
                <div key={i} className="p-4 rounded-2xl bg-[rgba(20,20,31,0.5)] backdrop-blur-sm border border-border hover:border-[rgba(177,79,255,0.3)] transition-colors">
                  <div className="w-10 h-10 mx-auto mb-3 bg-[rgba(177,79,255,0.15)] rounded-xl flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-[var(--ai-violet-bright)]" />
                  </div>
                  <h4 className="font-semibold text-sm mb-1">{feature.title}</h4>
                  <p className="text-xs text-fg-muted">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-fg-dim">
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </div>
    </section>
  )
}