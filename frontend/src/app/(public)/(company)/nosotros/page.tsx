import type { Metadata } from 'next'
import AboutContent from '@/components/AboutContent'

export const metadata: Metadata = {
  title: 'Sobre CarLink',
  description: 'Quiénes somos, nuestra misión y cómo la red de talleres aliados respalda la ficha técnica digital de tu vehículo.',
  alternates: { canonical: '/nosotros' },
}

export default function NosotrosPage() {
  return <AboutContent />
}
