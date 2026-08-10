import { Hero } from '@/components/layout/Hero'
import { Fabrication } from '@/components/fabrication/Fabrication'
import { AIAgent } from '@/components/agent/AIAgent'
import { Shop } from '@/components/shop/Shop'
import { Footer } from '@/components/layout/Footer'
import { Nav } from '@/components/layout/Nav'

export default function HomePage() {
  return (
    <main className="relative z-10">
      <Nav />
      <Hero />
      <Fabrication />
      <AIAgent />
      <Shop />
      <Footer />
    </main>
  )
}