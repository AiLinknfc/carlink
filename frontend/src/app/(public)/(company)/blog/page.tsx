import type { Metadata } from 'next'
import BlogCard from '@/components/company/BlogCard'
import { publishedPosts } from '@/lib/blog'

export const metadata: Metadata = {
  title: 'Blog y noticias',
  description: 'Novedades de CarLink, guías para cuidar tu vehículo y noticias de la red de talleres aliados.',
  alternates: { canonical: '/blog' },
}

export default function BlogPage() {
  const posts = publishedPosts()
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '48px clamp(16px,4vw,40px) 72px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>Blog y noticias</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,4vw,42px)', lineHeight: 1, margin: '0 0 12px', textTransform: 'uppercase' }}>
          Novedades de <span style={{ color: 'var(--accent)' }}>CarLink</span>
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-2)', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
          Anuncios, guías para cuidar tu vehículo y noticias de la red de talleres aliados.
        </p>
      </div>
      {posts.length === 0
        ? <p style={{ textAlign: 'center', color: 'var(--text-2)' }}>Pronto publicaremos las primeras entradas.</p>
        : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 18 }}>
            {posts.map(p => <BlogCard key={p.slug} post={p} />)}
          </div>
        )}
    </div>
  )
}
