'use client'

import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Menu, X, ShoppingBag, Sparkles } from 'lucide-react'
import { useState, useEffect } from 'react'

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { href: '#inicio', label: 'Inicio' },
    { href: '#fabricacion', label: 'Fabricación' },
    { href: '#agente-ia', label: 'Agente IA' },
    { href: '#tienda', label: 'Tienda' },
  ]

  return (
    <nav
      className={cn(
        'fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-[1180px] px-4 transition-all duration-300',
        scrolled && 'top-2 bg-[rgba(20,20,31,0.7)]'
      )}
      role="navigation"
      aria-label="Navegación principal"
    >
      <div className="relative flex items-center gap-6 rounded-full border border-border bg-[rgba(20,20,31,0.55)] backdrop-blur-[20px] backdrop-saturate-140 py-2.5 px-5 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <Link href="#inicio" className="flex items-center gap-3 text-fg font-bold" aria-label="CarLink - Inicio">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--ai-violet)] to-[var(--ai-violet-deep)] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg tracking-tight hidden sm:block">
            Car<span className="text-[var(--ai-violet-bright)] font-extrabold">Link</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 mx-auto text-sm text-fg-muted">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-fg"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2 ml-auto">
          <Link href="#tienda" className="btn btn--ghost btn--sm">
            <ShoppingBag className="w-4 h-4" />
            <span>Tienda</span>
          </Link>
          <Link href="#tienda" className="btn btn--primary btn--sm">
            Personalizar
          </Link>
        </div>

        <button
          className="md:hidden p-2 rounded-full text-fg-muted hover:text-fg hover:bg-[rgba(255,255,255,0.05)] transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div id="mobile-menu" className="md:hidden mt-3 rounded-2xl border border-border bg-[rgba(20,20,31,0.9)] backdrop-blur-[20px] p-4 shadow-lg animate-slide-down">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-3 text-center text-fg-muted hover:text-fg hover:bg-[rgba(255,255,255,0.05)] rounded-xl transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-border flex flex-col gap-2">
              <Link href="#tienda" className="btn btn--ghost justify-center" onClick={() => setMobileOpen(false)}>
                <ShoppingBag className="w-4 h-4" />
                <span>Tienda</span>
              </Link>
              <Link href="#tienda" className="btn btn--primary justify-center" onClick={() => setMobileOpen(false)}>
                Personalizar
              </Link>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down { animation: slide-down 200ms var(--ease-out); }
      `}</style>
    </nav>
  )
}