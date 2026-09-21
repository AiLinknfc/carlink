'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { track } from '@/lib/analytics'

/* Un evento `page_view` por cambio de ruta (App Router no recarga la página,
   así que hay que escucharlo). No renderiza nada. */
export default function PageViewTracker() {
  const pathname = usePathname()
  useEffect(() => {
    if (pathname) track('page_view', {}, pathname)
  }, [pathname])
  return null
}
