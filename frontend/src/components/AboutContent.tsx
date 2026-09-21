import CarLinkLogo from '@/components/CarLinkLogo'
import { Icon } from '@/lib/icons_new'
import Link from 'next/link'
import BlogCard from '@/components/company/BlogCard'
import { publishedPosts } from '@/lib/blog'

const TIMELINE = [
  { year: '2024', title: 'La idea', desc: 'Un grupo de ingenieros y conductores cansados de perder facturas y no saber el historial real de sus vehículos. La primera versión nació como un prototipo simple: ingresas tu placa y obtienes una ficha básica.' },
  { year: '2025', title: 'El llavero NFC', desc: 'Lanzamos el llavero NFC CarLink — un toque contra el teléfono y tu ficha técnica aparece al instante. Sin apps, sin búsqueda, sin fricción. Los primeros talleres aliados en Bogotá empezaron a verificar servicios en segundos.' },
  { year: '2026', title: 'La red crece', desc: 'Hoy operamos en múltiples ciudades colombianas, con talleres verificados sumándose cada mes. Cada servicio registrado en CarLink queda con su fecha, su kilometraje y el taller que lo hizo, y tus datos siguen bajo tu control.' },
]

const VALUES = [
  { icon: 'Shield' as const, title: 'Transparencia', desc: 'Cada servicio queda registrado con fecha, taller y kilometraje, para que el historial sea claro y consultable.' },
  { icon: 'Handshake' as const, title: 'Confianza', desc: 'Los talleres aliados pasan por un proceso de verificación antes de poder actualizar fichas.' },
  { icon: 'Lock' as const, title: 'Privacidad', desc: 'Solo tú decides quién ve tu ficha. La verificación es tuya, no de terceros.' },
  { icon: 'Zap' as const, title: 'Simplicidad', desc: 'Sin apps complicadas. Toca el llavero con tu celular y la ficha aparece al instante.' },
]

export default function AboutContent() {
  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '48px clamp(16px,4vw,40px) 72px' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><CarLinkLogo size={82} /></div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,4vw,42px)', lineHeight: 1, margin: '0 0 12px', textTransform: 'uppercase' }}>
          Sobre <span style={{ color: 'var(--accent)' }}>CarLink</span>
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-2)', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
          La ficha técnica digital de tu vehículo, viva y verificada por talleres reales.
        </p>
      </div>

      {/* Misión */}
      <section style={{ marginBottom: 36 }}>
        <div style={{ padding: 28, borderRadius: 20, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 12px' }}>Nuestra misión</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-2)', margin: '0 0 12px' }}>
            En CarLink creemos que cada vehículo merece un historial de mantenimiento transparente, verificable y accesible. Nacimos en Bogotá con la visión de eliminar los papeles sueltos, las facturas perdidas y la incertidumbre al comprar un carro usado.
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-2)', margin: 0 }}>
            Nuestra plataforma conecta conductores, talleres aliados y compradores en un ecosistema donde cada dato de mantenimiento queda registrado con fecha, kilometraje y el taller que lo realizó, con un historial claro para quien lo consulta.
          </p>
        </div>
      </section>

      {/* Visión */}
      <section style={{ marginBottom: 36 }}>
        <div style={{ padding: 28, borderRadius: 20, background: 'linear-gradient(135deg, var(--accent-dim), transparent)', border: '1px solid var(--accent-border)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 12px' }}>Nuestra visión</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-2)', margin: 0 }}>
            Ser la plataforma de confianza para el historial de cada vehículo en Colombia y, más adelante, en Latinoamérica. Trabajamos por un futuro donde el historial de mantenimiento de cualquier vehículo esté al alcance de un toque, con información clara para quien compra, vende o repara.
          </p>
        </div>
      </section>

      {/* Cómo empezamos */}
      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Cómo empezamos</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {TIMELINE.map(item => (
            <div key={item.year} style={{ display: 'flex', gap: 16, padding: 18, borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--accent)', lineHeight: 1, flex: '0 0 auto' }}>{item.year}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{item.title}</div>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-2)', margin: 0 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Valores */}
      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Nuestros valores</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 14 }}>
          {VALUES.map(v => (
            <div key={v.title} style={{ padding: 20, borderRadius: 16, background: 'var(--surface-2)', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center', color: 'var(--accent)' }}><Icon type={v.icon} size={32} strokeWidth={1.5} /></div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{v.title}</div>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-2)', margin: 0 }}>{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Blog y noticias */}
      {publishedPosts().length > 0 && (
        <section style={{ marginBottom: 44 }} aria-labelledby="about-blog">
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <h2 id="about-blog" style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Blog y noticias</h2>
            <Link href="/blog" style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}>Ver todas las entradas</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>
            {publishedPosts().slice(0, 3).map(p => <BlogCard key={p.slug} post={p} />)}
          </div>
        </section>
      )}

      {/* CTA */}
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: 12, background: 'var(--accent)', color: '#111', fontWeight: 800, fontSize: 14, textDecoration: 'none', boxShadow: '0 0 24px var(--accent-dim)' }}>
          Crear mi ficha
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </Link>
      </div>
    </div>
  )
}
