import type { Metadata } from 'next'

/* page.tsx de esta ruta es 'use client' (toda la landing es interactiva) —
   Next.js no permite exportar `metadata` desde un Client Component, así que
   vive acá, en el layout (Server Component) que lo envuelve. Antes esta
   página heredaba el title/description genérico del layout raíz
   ("Plataforma de mantenimiento vehicular"), idéntico al de toda página del
   sitio — nada específico del producto que se vende acá. */
export const metadata: Metadata = {
  // `absolute` para no heredar la plantilla "%s | CarLink" del layout raíz
  // — este title ya incluye la marca, se duplicaba ("... | CarLink").
  title: { absolute: 'Llavero NFC CarLink — Historial de tu vehículo en un toque' },
  description:
    'Llavero NFC/QR resistente al agua y caídas: escanéalo para ver el historial de mantenimiento de tu vehículo, o para que un taller registre un servicio. $39.900 COP, envío a toda Colombia.',
  openGraph: {
    title: 'Llavero NFC CarLink — Historial de tu vehículo en un toque',
    description:
      'Escanea el llavero y accede al historial de mantenimiento de tu vehículo. Resistente al agua, caídas y roce con otras llaves.',
    url: 'https://carlink.com.co/shop',
    siteName: 'CarLink',
    locale: 'es_CO',
    type: 'website',
  },
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children
}
