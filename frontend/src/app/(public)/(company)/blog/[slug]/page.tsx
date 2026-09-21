import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatPostDate, getPost, publishedPosts } from '@/lib/blog'

interface Props { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return publishedPosts().map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { title: post.title, description: post.excerpt, type: 'article', publishedTime: post.date, locale: 'es_CO', siteName: 'CarLink' },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    author: { '@type': 'Organization', name: 'CarLink' },
    publisher: { '@type': 'Organization', name: 'CarLink' },
  }

  return (
    <article style={{ maxWidth: 720, margin: '0 auto', padding: '40px clamp(16px,4vw,40px) 72px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/blog" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-2)', textDecoration: 'none', marginBottom: 24 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        Todas las entradas
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 600, marginBottom: 14 }}>
        <span style={{ padding: '3px 10px', borderRadius: 999, background: 'var(--accent-dim)', color: 'var(--accent)' }}>{post.category}</span>
        <span style={{ color: 'var(--text-3)' }}>{formatPostDate(post.date)} · {post.readMinutes} min de lectura</span>
      </div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,4vw,42px)', lineHeight: 1.05, margin: '0 0 28px', textTransform: 'uppercase' }}>{post.title}</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {post.blocks.map((b, i) => {
          if (b.type === 'h2') return <h2 key={i} style={{ fontSize: 20, fontWeight: 800, margin: '14px 0 0', color: 'var(--text-1)' }}>{b.text}</h2>
          if (b.type === 'ul') return (
            <ul key={i} style={{ margin: 0, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 15, lineHeight: 1.7, color: 'var(--text-2)' }}>
              {b.items.map(it => <li key={it}>{it}</li>)}
            </ul>
          )
          return <p key={i} style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--text-2)', margin: 0 }}>{b.text}</p>
        })}
      </div>
      <div style={{ marginTop: 40, padding: 22, borderRadius: 16, background: 'var(--surface-2)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Crea tu ficha técnica digital gratis</div>
        <Link href="/" style={{ padding: '11px 22px', borderRadius: 12, background: 'var(--accent)', color: '#111', fontWeight: 800, fontSize: 14, textDecoration: 'none' }}>Crear mi ficha</Link>
      </div>
    </article>
  )
}
