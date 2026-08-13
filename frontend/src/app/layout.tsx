import type { Metadata } from 'next'
import { AuthProvider } from '@/store/auth'
import { ThemeProvider } from '@/store/theme'
import './globals.css'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://carlink.com.co'

/* Antes era el único title/description de todo el sitio, sin plantilla —
   /shop (y cualquier ruta futura) heredaba este mismo texto genérico
   ("Plataforma de mantenimiento vehicular") sin nada específico de esa
   página. El `template` deja que rutas hijas (ver shop/layout.tsx) definan
   su propio title sin perder el sufijo de marca; este metadata sigue
   siendo el default real para "/". */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'CarLink — Tu placa es tu identidad digital', template: '%s | CarLink' },
  description: 'Historial de mantenimiento de tu vehículo en la nube, accesible por placa o escaneando tu llavero NFC/QR — sin depender de facturas físicas ni del taller.',
  openGraph: {
    siteName: 'CarLink',
    locale: 'es_CO',
    type: 'website',
  },
}

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'CarLink',
  url: SITE_URL,
  description: 'Plataforma colombiana de historial y mantenimiento vehicular por placa o llavero NFC/QR.',
  areaServed: 'CO',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}