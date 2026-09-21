'use client'

import BgParticles from '@/components/BgParticles'

/* Fondo animado de la home (partículas + viñeta) para el resto de las páginas públicas.
   Es `position: fixed`; el contenido de la página va en un contenedor con `zIndex: 10` y sus
   secciones sin fondo propio, para que el efecto se vea a través de todas. Mismos colores que
   `tk.pageBg` / `tk.vignette` de app/page.tsx. */

export const backdropPageBg = (theme: 'light' | 'dark') => (theme === 'dark' ? '#060606' : '#f7f6f2')

export default function SiteBackdrop({ theme }: { theme: 'light' | 'dark' }) {
  const dark = theme === 'dark'
  return (
    <>
      <BgParticles theme={theme} />
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: dark
          ? 'radial-gradient(circle at 50% 42%, transparent 40%, rgba(6,6,6,0.86) 100%)'
          : 'radial-gradient(circle at 50% 42%, transparent 45%, rgba(247,246,242,0.92) 100%)',
      }} />
    </>
  )
}
