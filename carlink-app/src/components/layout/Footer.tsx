'use client'

import Link from 'next/link'
import { Sparkles, Instagram, Linkedin, Youtube, ExternalLink } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative py-16 lg:py-20" style={{ borderTop: '1px solid var(--border)' }}>
      <div className="max-w-[var(--content-max)] mx-auto px-[var(--gutter)]">
        <div className="footer-grid grid lg:grid-cols-[2fr_1fr_1fr_1fr] gap-8">
          <div>
            <Link href="#inicio" className="inline-flex items-center gap-3 text-2xl font-bold mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--ai-violet)] to-[var(--ai-violet-deep)] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span>
                Car<span className="text-[var(--ai-violet-bright)]">Link</span>
              </span>
            </Link>
            <p className="text-sm text-fg-muted leading-relaxed max-w-sm mt-3">
              Llaveros NFC inteligentes para la transformación digital de tu negocio. 
              Personaliza, automatiza y mide cada interacción con tus clientes.
            </p>
            <div className="flex gap-3 mt-6">
              {[
                { icon: Instagram, label: 'Instagram' },
                { icon: Linkedin, label: 'LinkedIn' },
                { icon: Youtube, label: 'YouTube' },
              ].map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-[rgba(177,79,255,0.15)] hover:border-[rgba(177,79,255,0.5)]"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--border)',
                    color: 'var(--fg-muted)',
                  }}
                  aria-label={label}
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="footer-h text-xs font-bold tracking-widest uppercase mb-4" style={{ color: 'var(--ai-violet-bright)' }}>
              Producto
            </h4>
            <ul className="space-y-2">
              {[
                { label: 'Llaveros NFC', href: '#tienda' },
                { label: 'Personalización', href: '#inicio' },
                { label: 'Agente IA', href: '#agente-ia' },
                { label: 'Integraciones', href: '#' },
                { label: 'Precios', href: '#tienda' },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-sm text-fg-muted hover:text-fg transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="footer-h text-xs font-bold tracking-widest uppercase mb-4" style={{ color: 'var(--ai-violet-bright)' }}>
              Recursos
            </h4>
            <ul className="space-y-2">
              {[
                { label: 'Documentación', href: '#' },
                { label: 'API Reference', href: '#' },
                { label: 'Blog', href: '#' },
                { label: 'Casos de Éxito', href: '#' },
                { label: 'Soporte', href: '#' },
              ].map((item) => (
                <li key={item.label}>
                  <a href={item.href} className="text-sm text-fg-muted hover:text-fg transition-colors flex items-center gap-1">
                    {item.label}
                    {item.href.startsWith('http') && <ExternalLink className="w-3 h-3" />}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="footer-h text-xs font-bold tracking-widest uppercase mb-4" style={{ color: 'var(--ai-violet-bright)' }}>
              Empresa
            </h4>
            <ul className="space-y-2">
              {[
                { label: 'Sobre Nosotros', href: '#' },
                { label: 'Carreras', href: '#' },
                { label: 'Contacto', href: '#' },
                { label: 'Términos', href: '#' },
                { label: 'Privacidad', href: '#' },
              ].map((item) => (
                <li key={item.label}>
                  <a href={item.href} className="text-sm text-fg-muted hover:text-fg transition-colors">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-12 pt-6 text-xs text-fg-dim" style={{ borderTop: '1px solid var(--border)' }}>
          <p>© {currentYear} CarLink. Todos los derechos reservados.</p>
          <p className="flex items-center gap-1">
            Hecho con <span className="text-[var(--ai-violet-bright)]">♡</span> en Colombia 🇨🇴
          </p>
        </div>
      </div>
    </footer>
  )
}