import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import '@/styles/globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  weights: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weights: ['400', '500', '600'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CarLink — Llaveros NFC Inteligentes para tu Negocio',
  description: 'Transforma cada interacción física en una oportunidad digital. Llaveros NFC personalizados con IA para marketing, fidelización y automatización.',
  keywords: ['NFC', 'llaveros inteligentes', 'marketing digital', 'fidelización', 'automatización', 'CarLink', 'Ailink'],
  authors: [{ name: 'CarLink' }],
  creator: 'CarLink',
  publisher: 'CarLink',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: 'https://carlink.app',
    siteName: 'CarLink',
    title: 'CarLink — Llaveros NFC Inteligentes',
    description: 'Transforma cada interacción física en una oportunidad digital.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CarLink - Llaveros NFC Inteligentes',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CarLink — Llaveros NFC Inteligentes',
    description: 'Transforma cada interacción física en una oportunidad digital.',
    images: ['/og-image.png'],
  },
  verification: {
    google: 'google-site-verification-code',
  },
}

export const viewport: Viewport = {
  themeColor: '#0c0c16',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-bg text-fg antialiased">
        {children}
      </body>
    </html>
  )
}