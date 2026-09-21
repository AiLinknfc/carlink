import type { MetadataRoute } from 'next'
import { publishedPosts } from '@/lib/blog'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://carlink.com.co'

/* /sitemap.xml — no existía. Solo las páginas públicas y estáticas; el resto
   del sitio (/app, /admin, /partner, fichas por token/placa) es privado o
   dinámico por usuario y no aporta nada indexado. */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/taller', '/nosotros', '/blog', '/trabaja', '/register', ...publishedPosts().map(p => `/blog/${p.slug}`)]
  return routes.map(route => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : 0.7,
  }))
}
