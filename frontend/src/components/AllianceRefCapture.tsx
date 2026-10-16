'use client'

import { useEffect } from 'react'
import { captureAllianceRef } from '@/lib/alliance'

/* Guarda el `?ref=TLR-XXXXX` de cualquier página pública para que el checkout lo prellene (lib/alliance.ts). */
export default function AllianceRefCapture() {
  useEffect(() => { captureAllianceRef(window.location.search) }, [])
  return null
}
