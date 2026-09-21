import Link from 'next/link'
import { formatPostDate, type BlogPost } from '@/lib/blog'

/* Tarjeta de una entrada del blog — usada en /blog y en la vista previa de /nosotros. */
export default function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 22, borderRadius: 16, background: 'var(--surface-2)', border: '1px solid var(--border)', textDecoration: 'none', color: 'inherit', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5, fontWeight: 600 }}>
        <span style={{ padding: '3px 10px', borderRadius: 999, background: 'var(--accent-dim)', color: 'var(--accent)' }}>{post.category}</span>
        <span style={{ color: 'var(--text-3)' }}>{formatPostDate(post.date)}</span>
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3, margin: 0, color: 'var(--text-1)' }}>{post.title}</h3>
      <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-2)', margin: 0, flex: 1 }}>{post.excerpt}</p>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>Leer más · {post.readMinutes} min</span>
    </Link>
  )
}
