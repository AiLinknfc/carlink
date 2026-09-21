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
  title: { absolute: 'Únete a la red de talleres CarLink — Postula tu taller o negocio' },
  description:
    'Registra los servicios de tus clientes en su ficha digital, respalda tus garantías y hazte visible en la red de talleres aliados de CarLink. Postula tu taller o negocio del sector.',
  openGraph: {
    title: 'Únete a la red de talleres CarLink',
    description:
      'Postula tu taller o negocio del sector: historial de tus clientes, garantías con respaldo y visibilidad en la red.',
    url: 'https://carlink.com.co/taller',
    siteName: 'CarLink',
    locale: 'es_CO',
    type: 'website',
  },
}

export default function TallerLandingLayout({ children }: { children: React.ReactNode }) {
  return children
}
