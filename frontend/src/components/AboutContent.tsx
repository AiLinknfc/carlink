import { CarLinkMark } from '@/lib/icons_new'
import Link from 'next/link'

const TIMELINE = [
  { year: '2024', title: 'La idea', desc: 'Un grupo de ingenieros y conductores cansados de perder facturas y no saber el historial real de sus vehículos. La primera versión nació como un prototipo simple: ingresas tu placa y obtienes una ficha básica.' },
  { year: '2025', title: 'El llavero NFC', desc: 'Lanzamos el llavero NFC CarLink — un toque contra el teléfono y tu ficha técnica aparece al instante. Sin apps, sin búsqueda, sin fricción. Los primeros talleres aliados en Bogotá empezaron a verificar servicios en segundos.' },
  { year: '2026', title: 'La red crece', desc: 'Hoy operamos en múltiples ciudades colombianas, con talleres verificados sumándose cada mes. Cada servicio registrado en CarLink queda con sello de garantía visible, historial inalterable y datos protegidos bajo tu control.' },
]

const VALUES = [
  { icon: '🛡️', title: 'Transparencia', desc: 'Cada dato queda con fecha, taller y kilometraje — nadie lo puede reescribir después.' },
  { icon: '🤝', title: 'Confianza', desc: 'Los talleres aliados pasan por un proceso de verificación antes de poder actualizar fichas.' },
  { icon: '🔐', title: 'Privacidad', desc: 'Solo tú decides quién ve tu ficha. La verificación es tuya, no de terceros.' },
  { icon: '⚡', title: 'Simplicidad', desc: 'Sin apps complicadas. Ingresa tu placa, toca el llavero y tu ficha aparece al instante.' },
]

export default function AboutContent() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px clamp(16px,4vw,40px) 60px' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 18, background: 'var(--accent)', color: '#111', marginBottom: 20 }}>
          <CarLinkMark size={36} />
        </div>
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
            Nuestra plataforma conecta conductores, talleres aliados y compradores en un ecosistema donde cada dato de mantenimiento queda registrado con fecha, kilometraje y firma digital — imposible de alterar después.
          </p>
        </div>
      </section>

      {/* Visión */}
      <section style={{ marginBottom: 36 }}>
        <div style={{ padding: 28, borderRadius: 20, background: 'linear-gradient(135deg, var(--accent-dim), transparent)', border: '1px solid var(--accent-border)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 12px' }}>Nuestra visión</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-2)', margin: 0 }}>
            Ser la plataforma de confianza para cada transacción vehicular en Latinoamérica. Visualizamos un futuro donde el kilometraje real, los servicios ejecutados y la condición mecánica de cualquier vehículo estén al alcance de un toque — sin burocracia, sin intermediarios, sin sorpresas.
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
          {VALUES.map(v => (
            <div key={v.title} style={{ padding: 20, borderRadius: 16, background: 'var(--surface-2)', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{v.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{v.title}</div>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-2)', margin: 0 }}>{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

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
