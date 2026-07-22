import type { ReactNode } from 'react'

const svgIcon = (children: ReactNode, size: number, strokeWidth = 1.7): ReactNode => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
)

const SERVICE_PATHS: Record<string, ReactNode> = {
  /* Aceite: lámpara de Aladino — forma clásica de vasija con pico y llama */
  Aceite: <><path d="M10 3c-.6 1.2-1 2.6-1 4 0 3.3 2.7 6 6 6 .3 0 .7 0 1-.1" /><path d="M16 8l2.5-1.5c.8-.5.8-1.7 0-2.2L16 3" /><path d="M15 13c-1.3 1.4-2 3.3-2 5.3 0 1.7 1.3 3 3 3s3-1.3 3-3c0-2-.7-3.9-2-5.3" /><path d="M14 16.5c-2.4 0-4.5-1-5.5-2.5" /><path d="M8.5 14c-1.7-.5-3-2-3-3.8 0-.8.3-1.6.7-2.2" /><circle cx="13" cy="3.5" r="1.5" fill="currentColor" stroke="none" /></>,

  /* Aire: hélice/turbina de aire — tres palas rotando */
  Aire: <><path d="M12 12c-3-3-7-4-7-4s1-4 4-7c3 3 7 4 7 4s-1 4-4 7z" /><path d="M12 12c3 3 4 7 4 7s4-1 7-4c-3-3-4-7-4-7s-4 1-7 4z" /><path d="M12 12c0 3.3-1.3 6-3 6s-3-2.7-3-6c0-3.3 1.3-6 3-6s3 2.7 3 6z" /><circle cx="12" cy="12" r="2" /></>,

  /* Combustible: bomba de gasolina clásica con manguera */
  Combustible: <><rect x="4" y="6" width="12" height="14" rx="2" /><path d="M16 10h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-1" /><path d="M8 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M8 12h6" /><path d="M8 15h4" /><circle cx="19" cy="8" r="2.5" fill="currentColor" stroke="none" /></>,

  /* Frenos: disco de freno ventilado con caliper */
  Frenos: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="2.5" /><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" /></>,

  /* Refrigerante: termómetro de mercurio — bulbo + escala */
  Refrigerante: <><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" /><path d="M11.5 17a2.5 2.5 0 0 1 0-5" fill="currentColor" stroke="none" /><path d="M10 8h3M10 11h3" /></>,

  /* Llantas: neumático con llanta CarLink — doble círculo con patrón de rodamiento */
  Llantas: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2" /><path d="M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" /></>,

  /* Suspensión: resorte helicoidal con amortiguador */
  'Suspensión': <><path d="M4 20h16" /><path d="M12 4v3" /><path d="M9 7h6" /><path d="M8 9c2 1 6 1 8 0" /><path d="M8 12c2 1 6 1 8 0" /><path d="M8 15c2 1 6 1 8 0" /><path d="M9 17h6" /></>,

  /* Batería: batería automotriz con bornes + + y - */
  'Batería': <><rect x="3" y="7" width="18" height="12" rx="2" /><path d="M7 4v3M17 4v3" /><path d="M7 13h3M8.5 11.5v3" /><path d="M14 13h4" /><path d="M16 11.5v3" /></>,

  /* Transmisión: engranajes dobles — piñón + corona */
  'Transmisión': <><circle cx="8" cy="8" r="3" /><circle cx="16" cy="16" r="3" /><circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" /><circle cx="16" cy="16" r="1" fill="currentColor" stroke="none" /><path d="M8 5v-1M8 12v1M5 8H4M12 8h1" /><path d="M16 13v-1M16 20v1M13 16h-1M20 16h1" /><path d="M10.5 10.5l3 3" /></>,

  /* Otro: llave inglesa premium */
  Otro: <><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a4 4 0 0 1-5.6 5.6L6.4 20.4a2.1 2.1 0 0 1-3-3l6.9-6.9a4 4 0 0 1 5.6-5.6z" /><circle cx="6" cy="18" r="1.5" fill="currentColor" stroke="none" /></>,
}

export function ServiceIcon({ type, size = 18, strokeWidth = 1.7 }: { type?: string; size?: number; strokeWidth?: number }): ReactNode {
  return svgIcon(SERVICE_PATHS[type || ''] || SERVICE_PATHS.Otro, size, strokeWidth)
}

const CERT_PATHS: Record<string, ReactNode> = {
  factura: <><path d="M5 2v20l2-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l2-1.5L19 22V2l-2 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7 3.5z" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  soat: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>,
  rtm: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2.3-.6-.6-2.3z" />,
  propiedad: <><rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="12" r="2.2" /><path d="M13 10h5M13 14h5M4.5 16c.6-1.6 2.2-2.2 3.5-2.2s2.9.6 3.5 2.2" /></>,
  poliza: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></>,
  otro: <><path d="M9 3h6a1 1 0 0 1 1 1v1h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2V4a1 1 0 0 1 1-1z" /><path d="M9 5h6" /></>,
}

const ICON_PATHS: Record<string, ReactNode> = {
  ArrowRight: <path d="M5 12h14M12 5l7 7-7 7" />,
  Mail: <><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6L12 13L2 6"/></>,
  Eye: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>,
  Key: <><path d="M14 21V5l-6-6-6 6M21 17v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3"/><circle cx="16" cy="11" r="3"/></>,
  X: <><path d="M18 6L6 18M6 6l12 12"/></>,
}

export function Icon({ type, size = 18, strokeWidth = 1.7 }: { type: keyof typeof ICON_PATHS; size?: number; strokeWidth?: number }): ReactNode {
  return svgIcon(ICON_PATHS[type], size, strokeWidth)
}

export function CertIcon({ type, size = 20, strokeWidth = 1.7 }: { type?: string; size?: number; strokeWidth?: number }): ReactNode {
  return svgIcon(CERT_PATHS[type || ''] || CERT_PATHS.otro, size, strokeWidth)
}

/* ServiceLogo: larger, detailed logos with color fills for tablero/ficha indicators */
export function ServiceLogo({ type, size = 48 }: { type: string; size?: number }): ReactNode {
  const s = size
  const logos: Record<string, ReactNode> = {
    Aceite: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        {/* Lámpara de Aladino */}
        <ellipse cx="24" cy="34" rx="10" ry="7" fill="#F5C518" opacity="0.15" />
        <path d="M18 28c0-8 3-14 6-16 3 2 6 8 6 16" stroke="#F5C518" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M16 28c-2 0-4-1-4-3s2-3 4-3h16c2 0 4 1 4 3s-2 3-4 3" stroke="#F5C518" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M24 12l-4 8" stroke="#F5C518" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M24 12l4 8" stroke="#F5C518" strokeWidth="1.8" strokeLinecap="round" />
        <ellipse cx="24" cy="9" rx="3" ry="4" fill="#F5C518" opacity="0.7" />
        <ellipse cx="24" cy="8" rx="1.5" ry="2.5" fill="#fff" opacity="0.6" />
        <path d="M18 31c0 3 2.7 5 6 5s6-2 6-5" stroke="#F5C518" strokeWidth="1.8" fill="none" />
      </svg>
    ),
    Refrigerante: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        {/* Termómetro premium */}
        <path d="M20 38V12a4 4 0 0 1 8 0v26a6 6 0 1 1-8 0z" stroke="#4d9dd8" strokeWidth="2.2" fill="none" />
        <ellipse cx="24" cy="34" rx="4" ry="4" fill="#4d9dd8" opacity="0.3" />
        <path d="M22 34a2 2 0 0 1 4 0" fill="#4d9dd8" />
        <rect x="23" y="16" width="2" height="16" rx="1" fill="#4d9dd8" opacity="0.7" />
        <circle cx="24" cy="34" r="3" fill="#4d9dd8" />
        <path d="M30 18h3M30 22h3M30 26h3" stroke="#4d9dd8" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M31 18v1M31 22v1M31 26v1" stroke="#4d9dd8" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    Llantas: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        {/* Neumático con llanta CarLink */}
        <circle cx="24" cy="24" r="18" stroke="#c9c9c9" strokeWidth="3" />
        <circle cx="24" cy="24" r="13" stroke="#c9c9c9" strokeWidth="1.5" opacity="0.5" />
        <circle cx="24" cy="24" r="8" stroke="#c9c9c9" strokeWidth="2" />
        <circle cx="24" cy="24" r="3" fill="#c9c9c9" />
        <path d="M24 6v4M24 38v4M6 24h4M38 24h4" stroke="#c9c9c9" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M11.3 11.3l2.8 2.8M33.9 33.9l2.8 2.8M11.3 36.7l2.8-2.8M33.9 14.1l2.8-2.8" stroke="#c9c9c9" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    Aire: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        {/* Hélice de aire */}
        <path d="M24 24c-6-6-14-8-14-8s2-8 8-14c6 6 14 8 14 8s-2 8-8 14z" stroke="#4dd8d8" strokeWidth="2" fill="#4dd8d8" opacity="0.12" />
        <path d="M24 24c6 6 8 14 8 14s8-2 14-8c-6-6-8-14-8-14s-8 2-14 8z" stroke="#4dd8d8" strokeWidth="2" fill="#4dd8d8" opacity="0.12" />
        <circle cx="24" cy="24" r="4" fill="#4dd8d8" opacity="0.3" />
        <circle cx="24" cy="24" r="2" fill="#4dd8d8" />
      </svg>
    ),
    Combustible: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        {/* Bomba de gasolina premium */}
        <rect x="8" y="12" width="20" height="26" rx="3" stroke="#4ade80" strokeWidth="2.2" fill="#4ade80" opacity="0.1" />
        <path d="M28 20h4a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-2" stroke="#4ade80" strokeWidth="2" fill="none" />
        <path d="M14 12V8a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v4" stroke="#4ade80" strokeWidth="2" fill="none" />
        <path d="M12 22h12" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 28h8" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="37" cy="14" r="3.5" fill="#4ade80" opacity="0.4" />
      </svg>
    ),
    Frenos: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        {/* Disco de freno ventilado con caliper */}
        <circle cx="24" cy="24" r="18" stroke="#ef4444" strokeWidth="2.5" />
        <circle cx="24" cy="24" r="11" stroke="#ef4444" strokeWidth="1.5" opacity="0.4" />
        <circle cx="24" cy="24" r="5" fill="#ef4444" opacity="0.25" />
        <circle cx="24" cy="24" r="2.5" fill="#ef4444" />
        <path d="M24 6v5M24 37v5M6 24h5M37 24h5" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M11.3 11.3l3.5 3.5M33.2 33.2l3.5 3.5M11.3 36.7l3.5-3.5M33.2 14.8l3.5-3.5" stroke="#ef4444" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
    Suspensión: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        {/* Resorte helicoidal con amortiguador */}
        <path d="M10 40h28" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" />
        <path d="M24 8v5" stroke="#c084fc" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M18 13h12" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" />
        <path d="M16 17c4 1.5 12 1.5 16 0" stroke="#c084fc" strokeWidth="2" fill="none" />
        <path d="M16 23c4 1.5 12 1.5 16 0" stroke="#c084fc" strokeWidth="2" fill="none" />
        <path d="M16 29c4 1.5 12 1.5 16 0" stroke="#c084fc" strokeWidth="2" fill="none" />
        <path d="M18 35h12" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    Batería: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        {/* Batería automotriz premium */}
        <rect x="6" y="14" width="36" height="22" rx="3" stroke="#facc15" strokeWidth="2.2" fill="#facc15" opacity="0.08" />
        <path d="M14 14V9h6v5M28 14V9h6v5" stroke="#facc15" strokeWidth="2" strokeLinecap="round" />
        <path d="M14 24h8M18 21v6" stroke="#facc15" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M28 24h6" stroke="#facc15" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M31 21v6" stroke="#facc15" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    ),
    Transmisión: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        {/* Engranajes dobles premium */}
        <circle cx="18" cy="18" r="7" stroke="#9ca3af" strokeWidth="2" />
        <circle cx="32" cy="32" r="7" stroke="#9ca3af" strokeWidth="2" />
        <circle cx="18" cy="18" r="2.5" fill="#9ca3af" />
        <circle cx="32" cy="32" r="2.5" fill="#9ca3af" />
        <path d="M18 11v-2M18 27v-2M11 18H9M27 18h-2" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
        <path d="M32 25v-2M32 41v-2M25 32h-2M41 32h-2" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
        <path d="M23 23l4 4" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    Otro: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        {/* Llave inglesa premium */}
        <path d="M29.4 12.6a1.5 1.5 0 0 0 0 2.1l2.4 2.4a1.5 1.5 0 0 0 2.1 0l5.7-5.7a6 6 0 0 1-8.4 8.4L9.6 41.6a3.2 3.2 0 0 1-4.5-4.5L21 21a6 6 0 0 1 8.4-8.4z" stroke="#F5C518" strokeWidth="2.2" fill="#F5C518" opacity="0.08" />
        <circle cx="9" cy="39" r="2.5" fill="#F5C518" opacity="0.4" />
      </svg>
    ),
  }
  return logos[type] || logos.Otro
}

/* Logo del llavero NFC — cuerpo del llavero con su anilla y las ondas de lectura.
   Reemplaza al icono de arcos tipo wifi, que no representaba el producto. */
export function NfcKeyIcon({ size = 18, strokeWidth = 1.7 }: { size?: number; strokeWidth?: number }): ReactNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="11" height="18" rx="5.5" />
      <circle cx="8.5" cy="7.8" r="1.5" />
      <path d="M17.2 9.2a4.6 4.6 0 0 1 0 5.6" />
      <path d="M20 6.6a8.4 8.4 0 0 1 0 10.8" />
    </svg>
  )
}

/* Marca CarLink — la rueda del topbar del landing (8 radios, aro fino), tomada
   como referencia única. Antes la app usaba otra versión de 4 radios. */
export function CarLinkMark({ size = 20, strokeWidth = 1.7 }: { size?: number; strokeWidth?: number }): ReactNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round">
      <circle cx="12" cy="12" r="8.3" />
      <circle cx="12" cy="12" r="2.8" />
      <path d="M12 3.7v3M12 17.3v3M3.7 12h3M17.3 12h3M6.2 6.2l2.1 2.1M15.7 15.7l2.1 2.1M6.2 17.8l2.1-2.1M15.7 8.3l2.1-2.1" />
    </svg>
  )
}
