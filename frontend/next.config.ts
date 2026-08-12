import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
      // Bug crítico corregido 2026-08-12: los QR de los llaveros codifican
      // `{frontend_url}/nfc/q/{slug}` (backend/app/services/nfc_provisioning.py
      // y sus otros usos en admin.py/partners.py/nfc.py) pero esa ruta nunca
      // existió en el frontend — todo QR escaneado daba 404. El backend sí
      // resuelve el slug en GET /api/nfc/q/{slug} (redirect 302 a la ficha
      // real). Este rewrite hace que la URL YA IMPRESA en llaveros físicos
      // reales empiece a funcionar sin tener que reimprimir nada.
      {
        source: '/nfc/q/:slug',
        destination: `${apiUrl}/api/nfc/q/:slug`,
      },
    ]
  },
}

export default nextConfig
