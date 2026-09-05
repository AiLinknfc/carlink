'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export const TOTAL_FRAMES = 121
const FRAME_PATH = (n: number) => `/frames/frame_${String(n).padStart(4, '0')}.webp`

const FULL_RECT = { sx: 300, sy: 0, sw: 1400, sh: 1030 }
const CONTENT_RECT = { sx: 650, sy: 0, sw: 880, sh: 1030 }
const FULL_ASPECT = FULL_RECT.sw / FULL_RECT.sh
const NARROW_ASPECT = 0.5
const ZOOM_BLEND_CAP = 0.8

export default function KeychainScrub() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const imagesRef = useRef<HTMLImageElement[]>([])
  const currentFrameRef = useRef(0)
  const accumulatedRef = useRef(0)
  const [loaded, setLoaded] = useState(false)

  // Preload all frames
  useEffect(() => {
    let count = 0
    const imgs: HTMLImageElement[] = []
    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image()
      img.onload = img.onerror = () => {
        count++
        if (count === TOTAL_FRAMES) {
          imagesRef.current = imgs
          setLoaded(true)
        }
      }
      img.src = FRAME_PATH(i)
      imgs[i - 1] = img
    }
  }, [])

  const drawFrame = useCallback((index: number) => {
    const canvas = canvasRef.current
    const img = imagesRef.current[index]
    if (!canvas || !img || !img.complete || img.naturalWidth === 0) return

    currentFrameRef.current = index
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cw = canvas.width
    const ch = canvas.height
    const canvasAspect = cw / ch
    const t = Math.min(1, Math.max(0, (FULL_ASPECT - canvasAspect) / (FULL_ASPECT - NARROW_ASPECT)))

    const sx = FULL_RECT.sx + (CONTENT_RECT.sx - FULL_RECT.sx) * t
    const sy = FULL_RECT.sy + (CONTENT_RECT.sy - FULL_RECT.sy) * t
    const sw = FULL_RECT.sw + (CONTENT_RECT.sw - FULL_RECT.sw) * t
    const sh = FULL_RECT.sh + (CONTENT_RECT.sh - FULL_RECT.sh) * t

    const coverScale = Math.max(cw / sw, ch / sh)
    const containScale = Math.min(cw / sw, ch / sh)
    const fgScale = coverScale - (coverScale - containScale) * t * ZOOM_BLEND_CAP
    const dw = sw * fgScale
    const dh = sh * fgScale
    const dx = (cw - dw) / 2
    const dy = (ch - dh) / 2

    ctx.clearRect(0, 0, cw, ch)
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
  }, [])

  // Resize canvas
  useEffect(() => {
    if (!loaded) return
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      drawFrame(Math.max(currentFrameRef.current, 0))
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [loaded, drawFrame])

  // Scroll intercept: consume wheel delta for frames, then release to page
  useEffect(() => {
    if (!loaded) return

    const PX_PER_FRAME = 5

    const getSection = () => wrapRef.current?.closest('section[data-r="shopHero"]') as HTMLElement | null

    const isSectionFullyVisible = () => {
      const section = getSection()
      if (!section) return false
      const rect = section.getBoundingClientRect()
      return rect.top >= -2 && rect.bottom <= window.innerHeight + 2
    }

    const isSectionVisible = () => {
      const section = getSection()
      if (!section) return false
      const rect = section.getBoundingClientRect()
      return rect.top < window.innerHeight && rect.bottom > 0
    }

    const onWheel = (e: WheelEvent) => {
      const scrollingUp = e.deltaY < 0
      const scrollingDown = e.deltaY > 0

      if (scrollingUp && !isSectionFullyVisible()) return
      if (scrollingDown && !isSectionVisible()) return

      const atFirstFrame = currentFrameRef.current <= 0
      const atLastFrame = currentFrameRef.current >= TOTAL_FRAMES - 1

      if (scrollingDown && atLastFrame) return
      if (scrollingUp && atFirstFrame) return

      e.preventDefault()

      let delta = e.deltaY
      if (e.deltaMode === 1) delta *= 16
      else if (e.deltaMode === 2) delta *= window.innerHeight
      accumulatedRef.current += delta

      if (accumulatedRef.current >= PX_PER_FRAME) {
        const steps = Math.floor(accumulatedRef.current / PX_PER_FRAME)
        accumulatedRef.current -= steps * PX_PER_FRAME
        drawFrame(Math.min(currentFrameRef.current + steps, TOTAL_FRAMES - 1))
      } else if (accumulatedRef.current <= -PX_PER_FRAME) {
        const steps = Math.floor(-accumulatedRef.current / PX_PER_FRAME)
        accumulatedRef.current += steps * PX_PER_FRAME
        drawFrame(Math.max(currentFrameRef.current - steps, 0))
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const isUp = e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'Home'
      const isDown = e.key === 'ArrowDown' || e.key === ' ' || e.key === 'PageDown' || e.key === 'End'
      if (isUp && !isSectionFullyVisible()) return
      if (isDown && !isSectionVisible()) return
      const atFirstFrame = currentFrameRef.current <= 0
      const atLastFrame = currentFrameRef.current >= TOTAL_FRAMES - 1
      if ((isDown && atLastFrame) || (isUp && atFirstFrame)) return
      if (isDown) {
        e.preventDefault()
        drawFrame(Math.min(currentFrameRef.current + 1, TOTAL_FRAMES - 1))
        accumulatedRef.current = 0
      } else if (isUp) {
        e.preventDefault()
        drawFrame(Math.max(currentFrameRef.current - 1, 0))
        accumulatedRef.current = 0
      }
    }

    let touchStartY = 0
    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY
    }
    const onTouchMove = (e: TouchEvent) => {
      const dy = touchStartY - e.touches[0].clientY
      touchStartY = e.touches[0].clientY
      if (dy > 0 && !isSectionFullyVisible()) return
      if (dy < 0 && !isSectionVisible()) return
      const atFirstFrame = currentFrameRef.current <= 0
      const atLastFrame = currentFrameRef.current >= TOTAL_FRAMES - 1
      if ((dy > 0 && atLastFrame) || (dy < 0 && atFirstFrame)) return
      e.preventDefault()
      accumulatedRef.current += dy
      if (Math.abs(accumulatedRef.current) >= PX_PER_FRAME) {
        const steps = Math.floor(Math.abs(accumulatedRef.current) / PX_PER_FRAME)
        accumulatedRef.current -= Math.sign(accumulatedRef.current) * steps * PX_PER_FRAME
        drawFrame(Math.min(Math.max(currentFrameRef.current + Math.sign(dy) * steps, 0), TOTAL_FRAMES - 1))
      }
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [loaded, drawFrame])

  // Repaint on theme change
  useEffect(() => {
    if (loaded) drawFrame(Math.max(currentFrameRef.current, 0))
  }, [loaded, drawFrame])

  return (
    <div
      ref={wrapRef}
      data-r="keychainScrub"
      style={{ position: 'relative', width: '100%' }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: 'auto', aspectRatio: '16/10' }}
      />
    </div>
  )
}
