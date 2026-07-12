'use client'

import { useEffect, useRef } from 'react'

export default function BgParticles({ theme = 'dark' }: { theme?: 'light' | 'dark' }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const themeRef = useRef(theme)
  themeRef.current = theme

  useEffect(() => {
    const cvs = ref.current!
    const ctx = cvs.getContext('2d')!
    let W = 0, H = 0, cx = 0, cy = 0
    const streaks: { a: number; r: number; sp: number; w: number; yellow: boolean }[] = []
    const puffs: { x: number; y: number; vx: number; vy: number; r: number; gr: number; life: number; decay: number; hue: number }[] = []

    function newStreak(fresh: boolean) {
      const a = Math.random() * Math.PI * 2
      return {
        a,
        r: fresh ? Math.random() * 20 : Math.random() * Math.hypot(W, H) * 0.55,
        sp: 0.9 + Math.random() * 2.2,
        w: 0.6 + Math.random() * 1.5,
        yellow: Math.random() < 0.14,
      }
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = cvs.clientWidth
      H = cvs.clientHeight
      cvs.width = Math.max(1, W * dpr)
      cvs.height = Math.max(1, H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cx = W / 2
      cy = H * 0.46
    }

    resize()
    const onResize = resize
    window.addEventListener('resize', onResize)

    for (let i = 0; i < 170; i++) streaks.push(newStreak(false))

    const mouse = { x: cx, y: cy, px: cx, py: cy }

    function onMove(e: { clientX: number; clientY: number }) {
      mouse.px = mouse.x
      mouse.py = mouse.y
      mouse.x = e.clientX
      mouse.y = e.clientY
      const dx = mouse.x - mouse.px
      const dy = mouse.y - mouse.py
      const sp = Math.hypot(dx, dy)
      if (sp > 1.2) {
        const n = Math.min(5, 1 + Math.floor(sp / 7))
        for (let k = 0; k < n; k++) {
          puffs.push({
            x: mouse.x + (Math.random() - 0.5) * 12,
            y: mouse.y + (Math.random() - 0.5) * 12,
            vx: -dx * 0.07 + (Math.random() - 0.5) * 0.6,
            vy: -dy * 0.07 - 0.5 - Math.random() * 0.8,
            r: 5 + Math.random() * 8,
            gr: 0.55 + Math.random() * 1.1,
            life: 1,
            decay: 0.011 + Math.random() * 0.011,
            hue: 34 + Math.random() * 20,
          })
        }
      }
    }

    const onMouseMove = (e: MouseEvent) => onMove(e)
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) onMove(e.touches[0])
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('touchmove', onTouchMove, { passive: true })

    let raf = 0

    function loop() {
      if (cvs.width === 0) { raf = requestAnimationFrame(loop); return }
      ctx.globalCompositeOperation = 'source-over'
      const isDark = themeRef.current !== 'light'
      ctx.fillStyle = isDark ? 'rgba(6,6,6,0.30)' : 'rgba(247,246,242,0.34)'
      ctx.fillRect(0, 0, W, H)
      const lim = Math.hypot(W, H) * 0.62
      for (const s of streaks) {
        const cosA = Math.cos(s.a), sinA = Math.sin(s.a)
        const px = cx + cosA * s.r, py = cy + sinA * s.r
        s.r += s.sp * (1 + s.r / lim * 3.2)
        const nx = cx + cosA * s.r, ny = cy + sinA * s.r
        const alpha = Math.min(0.55, (s.r / lim) * 0.6)
        ctx.strokeStyle = s.yellow ? `rgba(220,168,0,${alpha})` : (isDark ? `rgba(205,205,205,${alpha * 0.6})` : `rgba(30,28,24,${alpha * 0.55})`)
        ctx.lineWidth = s.w
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo(nx, ny)
        ctx.stroke()
        if (s.r > lim) Object.assign(s, newStreak(true))
      }
      ctx.globalCompositeOperation = 'lighter'
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i]
        p.x += p.vx
        p.y += p.vy
        p.vy -= 0.006
        p.vx *= 0.99
        p.r += p.gr
        p.life -= p.decay
        if (p.life <= 0) { puffs.splice(i, 1); continue }
        const a = Math.max(0, p.life) * 0.15
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r)
        g.addColorStop(0, `hsla(${p.hue},95%,62%,${a})`)
        g.addColorStop(0.45, `hsla(${p.hue - 12},85%,45%,${a * 0.5})`)
        g.addColorStop(1, `hsla(${p.hue},60%,28%,0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, 6.2832)
        ctx.fill()
      }
      if (puffs.length > 180) puffs.splice(0, puffs.length - 180)
      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  return (
    <canvas ref={ref} style={{
      position: 'fixed', inset: 0, zIndex: 0,
      width: '100%', height: '100%',
      pointerEvents: 'none', background: theme === 'light' ? '#f7f6f2' : '#060606',
    }} />
  )
}
