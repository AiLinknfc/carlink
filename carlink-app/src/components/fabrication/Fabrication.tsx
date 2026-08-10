'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Minus, Plus, ChevronRight, Loader2, Truck, Box, Sparkles } from 'lucide-react'

const LAYERS = [
  {
    id: 1,
    name: 'Capa de Personalización',
    desc: 'Impresión 3D de tu nombre, logo o código QR en resina de alta definición.',
    detail: 'Resina UV 405nm · 0.05mm layer height · 120s cura',
    icon: Sparkles,
    color: 'radial-gradient(circle at 40% 30%, #f6f7fb 0%, #cfd2dc 50%, #8c8f9d 100%)',
  },
  {
    id: 2,
    name: 'Base Estructural',
    desc: 'Cuerpo principal del llavero en polímero reforzado para máxima durabilidad.',
    detail: 'PETG-CF · 20% infill gyroid · 45min print',
    icon: Box,
    color: 'linear-gradient(180deg,#a4a8b3 0%,#7c8090 100%)',
  },
  {
    id: 3,
    name: 'Placa NFC',
    desc: 'Chip NTAG216 embebido con antena de cobre grabada, programado y verificado.',
    detail: 'NTAG216 · 888 bytes · ISO 14443-A · 13.56 MHz',
    icon: Loader2,
    color: 'radial-gradient(circle at 40% 30%, #f6f7fb 0%, #cfd2dc 50%, #8c8f9d 100%)',
  },
  {
    id: 4,
    name: 'Carcasa Inferior',
    desc: 'Base con alojamiento preciso para el chip y rosca para el aro metálico.',
    detail: 'ASA negro · 100% infill · Acabado mate tacto suave',
    icon: Truck,
    color: 'radial-gradient(circle at 50% 50%, #4d505d 0%, #6f7382 60%, #9988aa 100%)',
  },
]

export function Fabrication() {
  const [explode, setExplode] = useState(0)
  const [activeLayer, setActiveLayer] = useState(0)

  const handleStepClick = useCallback((index: number) => {
    setActiveLayer(index)
    setExplode(1)
    setTimeout(() => setExplode(0), 800)
  }, [])

  return (
    <section id="fabricacion" className="relative py-20 lg:py-32 overflow-hidden">
      <div className="relative z-10 max-w-[var(--content-max)] mx-auto px-[var(--gutter)]">
        <div className="fab-head max-w-2xl mb-12 lg:mb-20 text-center">
          <span className="eyebrow inline-block mb-4">Fabricación en 4 Capas</span>
          <h2 className="h1 mb-6">Cada llavero se imprime en <span className="brand-grad">etapas precisas</span></h2>
          <p className="lead max-w-xl mx-auto">
            De la resina personalizada al chip NFC verificado: controlamos cada micrón 
            para que tu llavero sea una pieza de ingeniería, no solo un accesorio.
          </p>
        </div>

        <div className="fab-stage grid lg:grid-cols-2 gap-8 lg:gap-14 items-start">
          <div className="fab-canvas relative min-h-[560px] flex items-center justify-center" style={{ perspective: '1400px' }}>
            <div 
              className="fab-stack relative" 
              style={{ 
                width: '280px', 
                height: '480px',
                transformStyle: 'preserve-3d',
                transform: 'rotateX(28deg) rotateZ(-18deg)',
              }}
            >
              <svg
                className="fab-hardware"
                viewBox="0 0 56 56"
                style={{
                  position: 'absolute',
                  top: `calc(-2px - ${explode * 80}px)`,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '56px',
                  height: '56px',
                  filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))',
                  transition: 'top 600ms cubic-bezier(0.65, 0, 0.35, 1)',
                }}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <circle cx="28" cy="28" r="24" stroke="url(#metal-gradient-fab)" strokeWidth="4"/>
                <path d="M28 4v8M28 44v8M4 28h8M44 28h8" stroke="url(#metal-gradient-fab)" strokeWidth="3" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="metal-gradient-fab" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#f4f5fa"/>
                    <stop offset="22%" stopColor="#bcc0d2"/>
                    <stop offset="50%" stopColor="#7d8094"/>
                    <stop offset="78%" stopColor="#bcc0d2"/>
                    <stop offset="100%" stopColor="#f4f5fa"/>
                  </linearGradient>
                </defs>
              </svg>

              {LAYERS.map((layer, i) => (
                <div
                  key={layer.id}
                  className={cn(
                    'fab-disc cursor-pointer transition-all duration-700 ease-in-out',
                    activeLayer === i && 'is-active'
                  )}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    width: layer.id === 4 ? '232px' : '220px',
                    height: layer.id === 4 ? '232px' : '220px',
                    borderRadius: '50%',
                    background: layer.color,
                    backgroundBlendMode: 'screen, normal',
                    padding: '6px',
                    boxShadow: `
                      0 1px 0 rgba(255,255,255,0.6) inset,
                      0 -8px 14px rgba(0,0,0,0.4) inset,
                      0 22px 36px -10px rgba(0,0,0,0.55)
                      ${activeLayer === i ? `
                        , 0 0 0 2px rgba(177,79,255,0.5)
                        , 0 0 40px rgba(177,79,255,0.4)
                      ` : ''}
                    `,
                    top: '50%',
                    transform: `translate(-50%, calc(-50% + ${explode * (i === 0 ? -180 : i === 1 ? -60 : i === 2 ? 60 : 160)}px)) translateZ(0)`,
                    zIndex: layer.id === 4 ? 1 : 4 - i,
                    cursor: 'pointer',
                  }}
                  onClick={() => handleStepClick(i)}
                  onMouseEnter={() => setActiveLayer(i)}
                  onMouseLeave={() => setActiveLayer(-1)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Capa ${layer.id}: ${layer.name}`}
                  aria-pressed={activeLayer === i}
                >
                  <div
                    className="fab-disc__top"
                    style={{
                      position: 'absolute',
                      inset: '6px',
                      borderRadius: '50%',
                      background: layer.color,
                      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.2), inset 0 -4px 10px rgba(0,0,0,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    <div className="layer-detail" style={{ width: '70%', height: '70%' }}>
                      <layer.icon className="w-full h-full text-[var(--ai-violet-deep)]" />
                    </div>
                  </div>

                  <div
                    className="fab-disc__guide"
                    style={{
                      position: 'absolute',
                      top: '50%',
                      right: '-160px',
                      width: '150px',
                      height: '1px',
                      background: `repeating-linear-gradient(to right, rgba(255,255,255,0.4) 0 4px, transparent 4px 10px)`,
                      transform: 'translateY(-50%)',
                      opacity: `${explode * 0.6 + 0.2}`,
                      pointerEvents: 'none',
                      transition: 'opacity 220ms',
                    }}
                    aria-hidden="true"
                  />
                  <div
                    className="fab-disc__index mono"
                    style={{
                      position: 'absolute',
                      top: '50%',
                      right: '-190px',
                      transform: 'translateY(-50%)',
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.7)',
                      background: 'rgba(20,20,31,0.7)',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      border: '1px solid var(--border)',
                      opacity: `${explode * 0.7 + 0.3}`,
                      transition: 'opacity 220ms',
                    }}
                    aria-hidden="true"
                  >
                    {`Z${['-180','-60','+60','+160'][i]}`}
                  </div>
                </div>
              ))}

              <div
                className="fab-floor"
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: '-20px',
                  transform: 'translateX(-50%)',
                  width: '320px',
                  height: '36px',
                  background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 70%)',
                  filter: 'blur(10px)',
                  pointerEvents: 'none',
                  zIndex: 0,
                }}
                aria-hidden="true"
              />
            </div>

            <div
              className="fab-explode"
              style={{
                position: 'absolute',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(20,20,31,0.7)',
                backdropFilter: 'blur(14px)',
                border: '1px solid var(--border)',
                borderRadius: '999px',
                padding: '8px 16px',
                minWidth: '320px',
              }}
              role="group"
              aria-label="Control de explosión"
            >
              <button
                onClick={() => setExplode(Math.max(0, explode - 0.25))}
                className="p-2 rounded-full hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                aria-label="Reducir separación"
              >
                <Minus className="w-5 h-5 text-fg-muted" />
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={explode}
                onChange={(e) => setExplode(Number(e.target.value))}
                className="flex-1 accent-[var(--ai-violet)]"
                aria-label="Nivel de explosión"
              />
              <button
                onClick={() => setExplode(Math.min(1, explode + 0.25))}
                className="p-2 rounded-full hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                aria-label="Aumentar separación"
              >
                <Plus className="w-5 h-5 text-fg-muted" />
              </button>
              <span className="mono text-xs text-fg-muted text-right min-w-[76px] lowercase">
                {Math.round(explode * 100)}%
              </span>
            </div>
          </div>

          <div className="fab-steps flex flex-col gap-3">
            {LAYERS.map((layer, i) => (
              <button
                key={layer.id}
                className={cn(
                  'fab-step text-left p-5 rounded-2xl transition-all duration-300 ease-out',
                  activeLayer === i && 'is-active'
                )}
                onClick={() => handleStepClick(i)}
                style={{
                  background: activeLayer === i 
                    ? 'linear-gradient(135deg,rgba(177,79,255,0.10),rgba(20,20,31,0.7))'
                    : 'rgba(20,20,31,0.6)',
                  borderColor: activeLayer === i ? 'rgba(177,79,255,0.65)' : 'var(--border)',
                  boxShadow: activeLayer === i ? '0 8px 28px rgba(177,79,255,0.18)' : 'none',
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="fab-step__num flex-shrink-0 mono" style={{ color: 'var(--ai-violet-bright)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="fab-step__title font-semibold text-base mb-1">
                      {layer.name}
                    </div>
                    <div className="fab-step__desc text-sm text-fg-muted mb-2">
                      {layer.desc}
                    </div>
                    <div className="fab-step__mono mono text-[11px] text-fg-dim px-3 py-1.5 rounded bg-[rgba(0,0,0,0.25)] inline-block">
                      {layer.detail}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}