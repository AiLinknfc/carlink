'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  isOpen: boolean
  onClose: () => void
  theme: 'light' | 'dark'
  qrUrl: string | null
  plateText?: string
}

const GOLD = '#F5C518'

type Shape = 'square' | 'rounded' | 'dots' | 'classy'
type Protection = 'M' | 'Q' | 'H'

const SHAPES: { id: Shape; label: string; dotsType: 'square' | 'rounded' | 'dots' | 'classy'; cornerSquare: 'square' | 'extra-rounded' | 'dot'; cornerDot: 'square' | 'dot' }[] = [
  { id: 'square', label: 'Cuadrados', dotsType: 'square', cornerSquare: 'square', cornerDot: 'square' },
  { id: 'rounded', label: 'Redondeado', dotsType: 'rounded', cornerSquare: 'extra-rounded', cornerDot: 'dot' },
  { id: 'dots', label: 'Puntos', dotsType: 'dots', cornerSquare: 'dot', cornerDot: 'dot' },
  { id: 'classy', label: 'Clásico', dotsType: 'classy', cornerSquare: 'extra-rounded', cornerDot: 'square' },
]

const PROTECTIONS: { id: Protection; label: string; hint: string }[] = [
  { id: 'M', label: 'Simple', hint: 'Patrón más limpio' },
  { id: 'Q', label: 'Estándar', hint: 'Buen balance' },
  { id: 'H', label: 'Máxima resistencia', hint: 'Aguanta rayones y suciedad' },
]

/** Dispara la descarga de un Blob SVG con el nombre de archivo dado. */
function downloadSvgBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Genera SVG con SOLO <rect> y <circle> — nada de <path>/curvas bezier — a
 * partir de la matriz del QR. Existe aparte de "SVG" (que usa el motor real
 * de qr-code-styling, con <path> de arcos) porque el importador SVG del
 * usuario (Blender) no resuelve bien esa versión: qr-code-styling pinta
 * TODO — fondo, esquinas y área de datos — con la técnica
 * <rect fill clip-path="url(#...)">, y el área de datos completa queda
 * comprimida en un único clipPath con ~450 figuras adentro (los 3
 * detectores de esquina, en cambio, son un clipPath de 1 figura cada uno —
 * por eso esos sí se reconocen). Esta versión no usa clip-path en absoluto
 * — cada figura es un <rect>/<circle> con fill directo — así no hay máscara
 * compuesta que un importador básico pueda descartar.
 *
 * Tampoco dibuja fondo blanco (fill de página): así no queda nada que
 * borrar a mano en Illustrator antes de pasar el archivo a Blender.
 *
 * Un <rect>/<circle> por módulo, cada uno con su propio antialiasing, deja
 * además una costura gris de 1px entre módulos vecinos que en algunos casos
 * llega a impedir la lectura (verificado render→decode). Para evitarlo y
 * para que el patrón se vea lo más simple posible, fusiona los módulos
 * oscuros contiguos en bloques rectangulares — en las dos dimensiones, no
 * solo por fila — antes de dibujar: mismos píxeles pintados (no cambia qué
 * queda oscuro), pero muchas menos figuras sueltas.
 *
 * Los tres patrones de detección (las esquinas grandes) se dibujan aparte,
 * siempre como cuadrado nítido — es la combinación con más margen de
 * lectura (validado: la única 100% confiable en las pruebas; redondearlos,
 * aunque sea poco, hace fallar la detección con cierta frecuencia). El
 * resto del patrón sí sigue la forma elegida (Redondeado/Puntos/Clásico).
 */
function buildMatrixSvg(matrix: boolean[][], shape: Shape, size: number, marginUnits: number): string {
  const count = matrix.length
  const cell = size / (count + marginUnits * 2)
  const parts: string[] = []

  const finders = [
    { row: 0, col: 0 },
    { row: 0, col: count - 7 },
    { row: count - 7, col: 0 },
  ]
  const inFinder = (row: number, col: number) => finders.some(f => row >= f.row && row < f.row + 7 && col >= f.col && col < f.col + 7)

  // El anillo del detector NO se dibuja como cuadrado negro + parche blanco
  // encima (eso deja un objeto blanco real flotando entre las dos capas
  // negras al importar en Blender — el "hueco" nunca fue un hueco de
  // verdad, era pintura blanca tapando). Se arma como una moldura: 4 tiras
  // rectangulares que forman el marco, dejando el centro genuinamente sin
  // ninguna figura — vacío de verdad, no pintado de blanco.
  for (const f of finders) {
    const ox = (f.col + marginUnits) * cell
    const oy = (f.row + marginUnits) * cell
    const band = cell // grosor del marco: 1 módulo
    const outer = cell * 7
    const inner = cell * 5 // hueco entre el marco y el cuadrado central
    parts.push(`<rect x="${ox.toFixed(2)}" y="${oy.toFixed(2)}" width="${outer.toFixed(2)}" height="${band.toFixed(2)}" fill="#111"/>`) // borde superior
    parts.push(`<rect x="${ox.toFixed(2)}" y="${(oy + outer - band).toFixed(2)}" width="${outer.toFixed(2)}" height="${band.toFixed(2)}" fill="#111"/>`) // borde inferior
    parts.push(`<rect x="${ox.toFixed(2)}" y="${(oy + band).toFixed(2)}" width="${band.toFixed(2)}" height="${inner.toFixed(2)}" fill="#111"/>`) // borde izquierdo
    parts.push(`<rect x="${(ox + outer - band).toFixed(2)}" y="${(oy + band).toFixed(2)}" width="${band.toFixed(2)}" height="${inner.toFixed(2)}" fill="#111"/>`) // borde derecho
    parts.push(`<rect x="${(ox + cell * 2).toFixed(2)}" y="${(oy + cell * 2).toFixed(2)}" width="${(cell * 3).toFixed(2)}" height="${(cell * 3).toFixed(2)}" fill="#111"/>`) // cuadrado central
  }

  // Fuera de los detectores: agrupa cada módulo oscuro con sus vecinos en
  // el bloque rectangular más grande posible (extiende la corrida
  // horizontal hacia abajo mientras la misma corrida siga oscura y libre).
  const isBlockDark = (row: number, col: number) => matrix[row][col] && !inFinder(row, col)
  const used: boolean[][] = Array.from({ length: count }, () => new Array(count).fill(false))

  for (let row = 0; row < count; row++) {
    let col = 0
    while (col < count) {
      if (used[row][col] || !isBlockDark(row, col)) { col++; continue }

      let end = col
      while (end + 1 < count && !used[row][end + 1] && isBlockDark(row, end + 1)) end++

      let bottom = row
      rowsLoop:
      while (bottom + 1 < count) {
        for (let c = col; c <= end; c++) {
          if (used[bottom + 1][c] || !isBlockDark(bottom + 1, c)) break rowsLoop
        }
        bottom++
      }
      for (let r = row; r <= bottom; r++) for (let c = col; c <= end; c++) used[r][c] = true

      const runW = end - col + 1
      const runH = bottom - row + 1
      const x = (col + marginUnits) * cell
      const y = (row + marginUnits) * cell
      const w = runW * cell
      const h = runH * cell

      if (shape === 'dots') {
        const isolated = runW === 1 && runH === 1
        if (isolated) {
          parts.push(`<circle cx="${(x + cell / 2).toFixed(2)}" cy="${(y + cell / 2).toFixed(2)}" r="${(cell / 2 * 0.88).toFixed(2)}" fill="#111"/>`)
        } else {
          const r = Math.min(w, h) / 2
          parts.push(`<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" rx="${r.toFixed(2)}" ry="${r.toFixed(2)}" fill="#111"/>`)
        }
      } else if (shape === 'rounded' || shape === 'classy') {
        const r = cell * 0.38
        parts.push(`<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" rx="${r.toFixed(2)}" ry="${r.toFixed(2)}" fill="#111"/>`)
      } else {
        parts.push(`<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" fill="#111"/>`)
      }
      col = end + 1
    }
  }

  // Sin <rect> de fondo a propósito: nada de blanco que haya que
  // seleccionar y borrar antes de llevar el archivo a Blender.
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`,
    ...parts.map(p => '  ' + p),
    '</svg>',
  ].join('\n')
}

export default function QrCodePanel({ isOpen, onClose, theme, qrUrl, plateText }: Props) {
  const [shape, setShape] = useState<Shape>('rounded')
  const [protection, setProtection] = useState<Protection>('H')
  const containerRef = useRef<HTMLDivElement>(null)
  const qrRef = useRef<any>(null)

  const isDark = theme === 'dark'
  const panelBg = isDark ? 'rgba(16,16,16,0.97)' : 'rgba(247,246,242,0.98)'
  const border = isDark ? 'rgba(245,197,24,0.22)' : 'rgba(17,17,17,0.12)'
  const subtle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,17,0.08)'
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)'
  const textPrimary = isDark ? '#f5f3ec' : '#17171a'
  const textMuted = isDark ? '#7c786e' : '#7a756a'

  useEffect(() => {
    if (!isOpen || !qrUrl) return
    let cancelled = false

    import('qr-code-styling').then(({ default: QRCodeStyling }) => {
      if (cancelled || !containerRef.current) return
      const active = SHAPES.find(s => s.id === shape) || SHAPES[1]

      if (!qrRef.current) {
        qrRef.current = new QRCodeStyling({
          width: 220, height: 220, data: qrUrl, margin: 8,
          qrOptions: { errorCorrectionLevel: protection },
          dotsOptions: { type: active.dotsType, color: '#111111' },
          cornersSquareOptions: { type: active.cornerSquare, color: '#111111' },
          cornersDotOptions: { type: active.cornerDot, color: '#111111' },
          backgroundOptions: { color: '#ffffff' },
        })
        containerRef.current.innerHTML = ''
        qrRef.current.append(containerRef.current)
      } else {
        qrRef.current.update({
          data: qrUrl,
          qrOptions: { errorCorrectionLevel: protection },
          dotsOptions: { type: active.dotsType, color: '#111111' },
          cornersSquareOptions: { type: active.cornerSquare, color: '#111111' },
          cornersDotOptions: { type: active.cornerDot, color: '#111111' },
        })
      }
    })

    return () => { cancelled = true }
  }, [isOpen, qrUrl, shape, protection])

  useEffect(() => {
    if (!isOpen) qrRef.current = null
  }, [isOpen])

  const fileSlug = (plateText || 'llavero').replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

  const handleDownloadPng = () => {
    if (!qrRef.current) return
    qrRef.current.download({ name: `qr-${fileSlug}`, extension: 'png' })
  }

  const handleDownloadSvg = async () => {
    if (!qrRef.current) return
    const blob = await qrRef.current.getRawData('svg')
    if (!blob || !(blob instanceof Blob)) return
    downloadSvgBlob(blob, `qr-${fileSlug}.svg`)
  }

  // "Matrix" es un SVG aparte de "SVG" (no el mismo archivo): la máquina de
  // grabado/corte no soporta curvas, y el render normal de qr-code-styling
  // usa <path> con arcos para las esquinas redondeadas. Este toma la matriz
  // de módulos del QR ya renderizado y la reconstruye con buildMatrixSvg
  // (solo <rect>/<circle>, ver comentario ahí).
  const handleDownloadMatrix = () => {
    const qr = qrRef.current?._qr
    if (!qr) return
    const active = SHAPES.find(s => s.id === shape) || SHAPES[1]
    const count = qr.getModuleCount()
    const marginUnits = 8
    const matrix: boolean[][] = []
    for (let row = 0; row < count; row++) {
      const r: boolean[] = []
      for (let col = 0; col < count; col++) r.push(qr.isDark(row, col))
      matrix.push(r)
    }
    const svgString = buildMatrixSvg(matrix, active.id, 220, marginUnits)
    downloadSvgBlob(new Blob([svgString], { type: 'image/svg+xml' }), `qr-${fileSlug}-matrix-${protection}.svg`)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', background: panelBg, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: `1px solid ${border}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,.6)', color: textPrimary }}
          >
            <div style={{ padding: '18px 22px', borderBottom: `1px solid ${subtle}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Código QR del llavero</h2>
                <p style={{ fontSize: 11.5, color: textMuted, margin: '2px 0 0' }}>Escanéalo o imprímelo — lleva a tu ficha pública</p>
              </div>
              <button onClick={onClose} aria-label="Cerrar" style={{ width: 34, height: 34, borderRadius: 10, background: cardBg, border: `1px solid ${subtle}`, color: textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
              {!qrUrl ? (
                <p style={{ fontSize: 12.5, color: textMuted, textAlign: 'center', margin: '20px 0' }}>Activa tu llavero primero para generar el código QR.</p>
              ) : (
                <>
                  <div style={{ padding: 14, borderRadius: 14, background: '#ffffff', border: `1px solid ${subtle}` }}>
                    <div ref={containerRef} />
                  </div>

                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '.08em' }}>Forma del patrón</span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {SHAPES.map(s => (
                        <button key={s.id} onClick={() => setShape(s.id)} style={{
                          padding: '7px 11px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          border: `1px solid ${shape === s.id ? GOLD : subtle}`,
                          background: shape === s.id ? 'rgba(245,197,24,0.14)' : 'transparent',
                          color: shape === s.id ? GOLD : textPrimary,
                        }}>{s.label}</button>
                      ))}
                    </div>
                  </div>

                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '.08em' }}>Nivel de protección</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {PROTECTIONS.map(p => (
                        <button key={p.id} onClick={() => setProtection(p.id)} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left',
                          padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
                          border: `1px solid ${protection === p.id ? GOLD : subtle}`,
                          background: protection === p.id ? 'rgba(245,197,24,0.1)' : 'transparent',
                          color: textPrimary,
                        }}>
                          <span style={{ fontSize: 12.5, fontWeight: 700 }}>{p.label}</span>
                          <span style={{ fontSize: 11, color: textMuted }}>{p.hint}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <button onClick={handleDownloadPng} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 12, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                      PNG
                    </button>
                    <button onClick={handleDownloadSvg} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 12, border: `1px solid ${subtle}`, background: 'transparent', color: textPrimary, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                      SVG
                    </button>
                    <button onClick={handleDownloadMatrix} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 12, border: `1px solid ${subtle}`, background: 'transparent', color: textPrimary, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                      Matrix
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
