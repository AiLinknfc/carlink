'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { RotateCcw, QrCode, Image, Loader2 } from 'lucide-react'

interface KeychainCustomizerProps {
  onConfigChange?: (config: KeychainConfig) => void
  initialConfig?: Partial<KeychainConfig>
}

export interface KeychainConfig {
  frontType: 'text' | 'image' | 'qr'
  frontText: string
  frontImage: string | null
  frontColor: string
  backType: 'text' | 'image' | 'qr'
  backText: string
  backImage: string | null
  backColor: string
  quantity: number
  finish: 'matte' | 'glossy' | 'metallic'
}

const COLORS = [
  { name: 'Violeta Neon', value: '#b14fff', bg: 'radial-gradient(circle at 35% 30%,#e5c8ff 0%,#b14fff 35%,#542aad 75%,#1a0a3a 100%)' },
  { name: 'Azul Eléctrico', value: '#2e2eff', bg: 'radial-gradient(circle at 35% 30%,#c8e0ff 0%,#2e2eff 35%,#1a1a5a 75%,#05052a 100%)' },
  { name: 'Magenta', value: '#ff3df0', bg: 'radial-gradient(circle at 35% 30%,#ffc8fa 0%,#ff3df0 35%,#ad0a8a 75%,#3a002a 100%)' },
  { name: 'Cian', value: '#4cf5ff', bg: 'radial-gradient(circle at 35% 30%,#c8fffc 0%,#4cf5ff 35%,#0aadaa 75%,#003a3a 100%)' },
  { name: 'Púrpura Profundo', value: '#542aad', bg: 'radial-gradient(circle at 35% 30%,#d8c8ff 0%,#542aad 35%,#2a105a 75%,#100520 100%)' },
  { name: 'Negro Carbón', value: '#1a1a2e', bg: 'radial-gradient(circle at 35% 30%,#3a3a5a 0%,#1a1a2e 35%,#0a0a15 75%,#000 100%)' },
]

const FINISHES = [
  { id: 'matte', name: 'Mate', icon: '⬤', desc: 'Suave, sin reflejos' },
  { id: 'glossy', name: 'Brillo', icon: '⬤', desc: 'Alto brillo, vibrante' },
  { id: 'metallic', name: 'Metálico', icon: '⬤', desc: 'Efecto metal cepillado' },
]

export function KeychainCustomizer({ onConfigChange, initialConfig }: KeychainCustomizerProps) {
  const [config, setConfig] = useState<KeychainConfig>({
    frontType: 'text',
    frontText: 'Mi Marca',
    frontImage: null,
    frontColor: COLORS[0].value,
    backType: 'qr',
    backText: 'https://carlink.app',
    backImage: null,
    backColor: COLORS[0].value,
    quantity: 1,
    finish: 'glossy',
    ...initialConfig,
  })
  const [showBack, setShowBack] = useState(false)
  const [showPalette, setShowPalette] = useState<'front' | 'back' | null>(null)
  const [isHover, setIsHover] = useState(false)
  const [isDropZone, setIsDropZone] = useState(false)
  const [animState, setAnimState] = useState<'idle' | 'snap'>('idle')
  const [draggingChip, setDraggingChip] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const keychainRef = useRef<HTMLDivElement>(null)
  const flipperRef = useRef<HTMLDivElement>(null)
  const paletteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    onConfigChange?.(config)
  }, [config, onConfigChange])

  const updateConfig = useCallback((updates: Partial<KeychainConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }, [])

  const handleImageUpload = (side: 'front' | 'back', file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      if (side === 'front') {
        updateConfig({ frontType: 'image', frontImage: dataUrl })
      } else {
        updateConfig({ backType: 'image', backImage: dataUrl })
      }
    }
    reader.readAsDataURL(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDropZone(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDropZone(false)
  }

  const handleDrop = (e: React.DragEvent, side: 'front' | 'back') => {
    e.preventDefault()
    e.stopPropagation()
    setIsDropZone(false)
    const file = e.dataTransfer.files[0]
    if (file) handleImageUpload(side, file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0]
    if (file) handleImageUpload(side, file)
  }

  const generateQR = (text: string) => {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, size, size)
    
    const qrSize = 20
    const cellSize = size / qrSize
    for (let y = 0; y < qrSize; y++) {
      for (let x = 0; x < qrSize; x++) {
        if (Math.random() > 0.5 || (x < 8 && y < 8) || (x > qrSize - 8 && y < 8) || (x < 8 && y > qrSize - 8)) {
          ctx.fillStyle = '#fff'
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
        }
      }
    }
    return canvas.toDataURL()
  }

  const handleFlip = () => {
    setAnimState('snap')
    setTimeout(() => {
      setShowBack(prev => !prev)
      setAnimState('idle')
    }, 300)
  }

  const handleColorSelect = (color: string, side: 'front' | 'back') => {
    if (side === 'front') updateConfig({ frontColor: color })
    else updateConfig({ backColor: color })
    setShowPalette(null)
  }

  const handleFinishSelect = (finish: KeychainConfig['finish']) => {
    updateConfig({ finish })
  }

  const frontColorObj = COLORS.find(c => c.value === config.frontColor) || COLORS[0]
  const backColorObj = COLORS.find(c => c.value === config.backColor) || COLORS[0]

  const currentSide = showBack ? config.backType : config.frontType
  const currentText = showBack ? config.backText : config.frontText
  const currentImage = showBack ? config.backImage : config.frontImage
  const currentColor = showBack ? backColorObj : frontColorObj

  return (
    <div className="relative">
      <div
        ref={keychainRef}
        className={cn(
          'keychain-mount transition-transform duration-500 ease-spring',
          isHover && 'is-hover',
          isDropZone && 'is-dropzone',
          animState === 'snap' && 'is-snap'
        )}
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => { setIsHover(false); setIsDropZone(false); }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, showBack ? 'back' : 'front')}
      >
        <svg
          className="keychain-hardware"
          viewBox="0 0 56 56"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="28" cy="28" r="24" stroke="url(#metal-gradient)" stroke-width="4"/>
          <path d="M28 4v8M28 44v8M4 28h8M44 28h8" stroke="url(#metal-gradient)" stroke-width="3" stroke-linecap="round"/>
          <defs>
            <linearGradient id="metal-gradient" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f4f5fa"/>
              <stop offset="22%" stopColor="#bcc0d2"/>
              <stop offset="50%" stopColor="#7d8094"/>
              <stop offset="78%" stopColor="#bcc0d2"/>
              <stop offset="100%" stopColor="#f4f5fa"/>
            </linearGradient>
          </defs>
        </svg>

        <div className="keychain-aro" aria-hidden="true">
          <div
            ref={flipperRef}
            className={cn('keychain-flipper', showBack && 'is-flipped')}
            style={{ transition: 'transform 700ms cubic-bezier(0.65, 0, 0.35, 1)' }}
          >
            <div className="keychain-face" style={{ background: currentColor.bg }}>
              <div className="keychain-spec" aria-hidden="true" />
              <div className="keychain-content">
                {currentSide === 'text' && (
                  <span className="keychain-text" style={{ color: '#fff' }}>
                    {currentText || 'Tu Texto'}
                  </span>
                )}
                {currentSide === 'image' && currentImage && (
                  <img
                    src={currentImage}
                    alt="Diseño personalizado"
                    className="keychain-img"
                    draggable="false"
                  />
                )}
                {currentSide === 'qr' && (
                  <div className="keychain-qr keychain-content--full" style={{ maskImage: 'radial-gradient(circle, #000 50%, transparent 50%)' }}>
                    <img
                      src={showBack ? generateQR(config.backText) : generateQR(config.frontText)}
                      alt="Código QR"
                      draggable="false"
                    />
                  </div>
                )}
                {currentSide === 'image' && !currentImage && (
                  <div className="keychain-placeholder">
                    <Image className="ph-glyph w-16 h-16 text-fg/50" />
                    <span className="ph-label text-[var(--ai-violet-bright)]">Suelta imagen aquí</span>
                  </div>
                )}
              </div>
            </div>
            <div className="keychain-face keychain-face--back" style={{ background: backColorObj.bg }}>
              <div className="keychain-spec" aria-hidden="true" />
              <div className="keychain-content">
                {config.backType === 'text' && (
                  <span className="keychain-text" style={{ color: '#fff' }}>
                    {config.backText || 'Tu Texto'}
                  </span>
                )}
                {config.backType === 'image' && config.backImage && (
                  <img src={config.backImage} alt="Diseño reverso" className="keychain-img" draggable="false" />
                )}
                {config.backType === 'qr' && (
                  <div className="keychain-qr keychain-content--full" style={{ maskImage: 'radial-gradient(circle, #000 50%, transparent 50%)' }}>
                    <img src={generateQR(config.backText)} alt="Código QR" draggable="false" />
                  </div>
                )}
                {config.backType === 'image' && !config.backImage && (
                  <div className="keychain-placeholder">
                    <Image className="ph-glyph w-16 h-16 text-fg/50" />
                    <span className="ph-label text-[var(--ai-violet-bright)]">Suelta imagen aquí</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="finish-picker flex flex-col gap-4 w-full max-w-md">
        <div className="flex items-center gap-4 flex-wrap">
          <button
            className={cn('flip-btn', showBack && 'is-back')}
            onClick={handleFlip}
            aria-label={showBack ? 'Ver frente' : 'Ver reverso'}
          >
            <RotateCcw className="w-4 h-4" />
            <span>{showBack ? 'Reverso' : 'Frente'}</span>
          </button>

          <div className="flex items-center gap-2 flex-1">
            {['front', 'back'].map((side, i) => {
              const isFront = side === 'front'
              const currentType = isFront ? config.frontType : config.backType
              const colorObj = isFront ? frontColorObj : backColorObj
              const activeSide = !showBack === isFront
              return (
                <div key={side} className="flex items-center gap-1">
                  <button
                    className={cn(
                      'finish-dot',
                      activeSide && 'is-active'
                    )}
                    onClick={() => {
                      if (activeSide) setShowPalette(side as 'front' | 'back')
                    }}
                    aria-label={isFront ? 'Color frente' : 'Color reverso'}
                    style={{
                      background: activeSide ? colorObj.bg : 'rgba(255,255,255,0.05)',
                    }}
                  >
                    <span style={{ background: colorObj.bg }} />
                  </button>
                  {i === 0 && !showBack && (
                    <span className="text-micro text-fg-dim hidden sm:inline">Frente</span>
                  )}
                  {i === 1 && showBack && (
                    <span className="text-micro text-fg-dim hidden sm:inline">Reverso</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="eyebrow text-xs">Acabado</span>
          <div className="flex gap-2 flex-1">
            {FINISHES.map((finish) => (
              <button
                key={finish.id}
                className={cn(
                  'btn btn--ghost btn--sm flex-1 justify-center gap-1',
                  config.finish === finish.id && 'bg-[rgba(177,79,255,0.12)] border-[rgba(177,79,255,0.55)] text-[var(--ai-violet-bright)]'
                )}
                onClick={() => handleFinishSelect(finish.id as KeychainConfig['finish'])}
              >
                <span>{finish.icon}</span>
                <span className="hidden sm:inline">{finish.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {showPalette && (
        <div
          ref={paletteRef}
          className="palette-pop fixed z-30"
          style={{
            top: showPalette === 'front' ? 'auto' : 'auto',
            right: 0,
          }}
          role="dialog"
          aria-label="Seleccionar color"
        >
          <div className="palette-title">Paleta de colores</div>
          <div className="palette-grid">
            {COLORS.map((color) => (
              <button
                key={color.value}
                className={cn('palette-sw', (showBack ? config.backColor : config.frontColor) === color.value && 'is-active')}
                onClick={() => handleColorSelect(color.value, showPalette)}
                style={{ background: color.bg }}
                aria-label={color.name}
                aria-pressed={(showBack ? config.backColor : config.frontColor) === color.value}
              />
            ))}
          </div>
          <div className="palette-hex">
            <label className="flex items-center gap-2 flex-1 cursor-pointer">
              <input
                type="color"
                value={(showBack ? config.backColor : config.frontColor)}
                onChange={(e) => handleColorSelect(e.target.value, showPalette)}
                className="w-7 h-7 rounded-sm border-border"
              />
              <span className="mono text-xs">
                {(showBack ? config.backColor : config.frontColor).toUpperCase()}
              </span>
            </label>
          </div>
        </div>
      )}

      <input
        type="file"
        id="front-image-upload"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'front')}
      />
      <input
        type="file"
        id="back-image-upload"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'back')}
      />
    </div>
  )
}