import type { ReactNode } from 'react'

/* Line-style SVG logos that replace emojis across the app.
   Rendered inline; color follows `currentColor`. */

const svg = (children: ReactNode, size: number, strokeWidth = 1.7): ReactNode => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
)

const SERVICE_PATHS: Record<string, ReactNode> = {
  Aceite: <path d="M12 2c-3 4-6 7-6 11a6 6 0 0 0 12 0c0-4-3-7-6-11z" />,
  Aire: <><path d="M4 12h10a3 3 0 1 0-3-3" /><path d="M4 16h14a3 3 0 1 1-3 3" /></>,
  Combustible: <><path d="M3 22h12V4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z" /><path d="M15 8h3a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2" /></>,
  Frenos: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /></>,
  Refrigerante: <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />,
  Llantas: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.5" /></>,
  'Suspensión': <path d="M7 3v3M17 3v3M7 21v-3M17 21v-3M7 6c5 1 5 4 0 5s0 4 5 5M17 6c-5 1-5 4 0 5s0 4-5 5" />,
  'Batería': <><rect x="3" y="7" width="18" height="12" rx="2" /><path d="M7 4v3M17 4v3M8 13h3M9.5 11.5v3M15 13h1.5" /></>,
  'Transmisión': <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" /></>,
  Otro: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></>,
}

export function ServiceIcon({ type, size = 18, strokeWidth = 1.7 }: { type?: string; size?: number; strokeWidth?: number }): ReactNode {
  return svg(SERVICE_PATHS[type || ''] || SERVICE_PATHS.Otro, size, strokeWidth)
}

const CERT_PATHS: Record<string, ReactNode> = {
  factura: <><path d="M5 2v20l2-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l2-1.5L19 22V2l-2 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7 3.5z" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  soat: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>,
  rtm: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2.3-.6-.6-2.3z" />,
  propiedad: <><rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="12" r="2.2" /><path d="M13 10h5M13 14h5M4.5 16c.6-1.6 2.2-2.2 3.5-2.2s2.9.6 3.5 2.2" /></>,
  poliza: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></>,
  otro: <><path d="M9 3h6a1 1 0 0 1 1 1v1h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2V4a1 1 0 0 1 1-1z" /><path d="M9 5h6" /></>,
}

export function CertIcon({ type, size = 20, strokeWidth = 1.7 }: { type?: string; size?: number; strokeWidth?: number }): ReactNode {
  return svg(CERT_PATHS[type || ''] || CERT_PATHS.otro, size, strokeWidth)
}
