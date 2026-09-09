import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  // No hay ningún config de ESLint hasta la auditoría de 2026-09-09 (ver
  // docs/PENDIENTES.md ítem 12c) — antes, sin config, `next build` saltaba el lint en
  // silencio (por eso nunca rompió un deploy real). Con el config nuevo, `next build`
  // SÍ lo aplica y frena la compilación con el backlog de 214 hallazgos que nunca se
  // había revisado — se mantiene el build desacoplado del lint a propósito, igual que
  // ya estaba (de facto) hasta ahora, mientras ese backlog se paga en una pasada
  // dedicada. El paso "Lint frontend" de CI sigue corriendo (no bloqueante) para verlo.
  eslint: {
    ignoreDuringBuilds: true,
  },
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
