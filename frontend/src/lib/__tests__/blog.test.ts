import { describe, it, expect } from 'vitest'
import { POSTS, publishedPosts, getPost, formatPostDate, type BlogPost } from '../blog'

describe('blog', () => {
  it('publishedPosts excluye borradores y ordena de mas nuevo a mas viejo', () => {
    const dates = publishedPosts().map(p => p.date)
    expect(dates).toEqual([...dates].sort().reverse())
    expect(publishedPosts().every(p => p.published)).toBe(true)
  })

  it('getPost encuentra un post publicado y devuelve undefined para slug inexistente', () => {
    const first = publishedPosts()[0]
    expect(getPost(first.slug)?.title).toBe(first.title)
    expect(getPost('no-existe')).toBeUndefined()
    expect(getPost('')).toBeUndefined()
  })

  it('un post con published false no tiene pagina', () => {
    const draft: BlogPost = { ...POSTS[0], slug: 'borrador-temporal', published: false }
    POSTS.push(draft)
    try {
      expect(getPost('borrador-temporal')).toBeUndefined()
      expect(publishedPosts().some(p => p.slug === 'borrador-temporal')).toBe(false)
    } finally {
      POSTS.pop()
    }
  })

  it('slugs unicos y con formato URL seguro', () => {
    const slugs = POSTS.map(p => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('fechas ISO validas y sin emojis en el contenido (regla de diseno)', () => {
    const emoji = /\p{Extended_Pictographic}/u
    for (const p of POSTS) {
      expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(Number.isNaN(new Date(p.date).getTime())).toBe(false)
      expect(p.readMinutes).toBeGreaterThan(0)
      expect(emoji.test(JSON.stringify(p))).toBe(false)
    }
  })

  it('formatPostDate no se corre de dia por zona horaria', () => {
    const s = formatPostDate('2026-09-21')
    expect(s).toContain('21')
    expect(s).toContain('2026')
    expect(s.toLowerCase()).toContain('septiembre')
    expect(formatPostDate('2026-01-01')).toContain('1')
    expect(formatPostDate('2026-12-31')).toContain('31')
  })
})
