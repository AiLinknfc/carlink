import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://carlink.com.co'

/* /robots.txt — no existía ninguno antes. Permite explícitamente los
   crawlers conocidos de motores de IA (además de los buscadores
   tradicionales, que ya entraban por defecto sin este archivo) — sin esto
   algunos de estos bots respetan un robots.txt ausente como "todo
   permitido" y otros como "mejor no", así que declararlo explícito no deja
   nada a la ambigüedad. No es una garantía de que citen el sitio, solo
   quita la barrera de entrada. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/app/', '/admin/', '/partner/', '/api/'],
      },
      { userAgent: 'GPTBot', allow: '/' },
      { userAgent: 'ChatGPT-User', allow: '/' },
      { userAgent: 'ClaudeBot', allow: '/' },
      { userAgent: 'Claude-Web', allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'Google-Extended', allow: '/' },
      { userAgent: 'CCBot', allow: '/' },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
