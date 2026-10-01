import type { SafetyKind } from '@/lib/types'

const PATHS: Record<string, React.ReactNode> = {
  extintor: <><path d="M9 6h6v3H9z" /><path d="M8 9h8v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z" /><path d="M15 6l4-2" /><path d="M9 6V4h4" /></>,
  botiquin: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M12 11v5M9.5 13.5h5" /></>,
  kit_carretera: <><path d="M12 3l9 16H3z" /><path d="M12 10v4M12 17h.01" /></>,
  otro: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></>,
  // Piezas del kit de carretera (claves de KIT_ITEMS en lib/safety.ts)
  // Gato hidraulico: base, cuerpo del ariete y la silla de apoyo arriba.
  gato: <><rect x="5" y="19" width="14" height="2" rx="1" /><path d="M10 19v-9a2 2 0 0 1 2-2 2 2 0 0 1 2 2v9" /><rect x="9" y="4" width="6" height="3" rx="1" /></>,
  llave_ruedas: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2.3-.6-.6-2.3z" />,
  // Mismo cono de trafico que tenia el icono de "Seguridad" del menu lateral (reemplazado ahi por
  // un candado) — le queda mejor aca, a la pieza que literalmente es el triangulo/cono del kit.
  triangulos: <><path d="M10.5 4h3l4 13h-11z" /><path d="M9.2 9.5h5.6M7.9 13.7h8.2" /><rect x="3.5" y="17" width="17" height="3.5" rx="1" /></>,
  chaleco: <path d="M8 3l4 3 4-3 3 4-2 2v12H7V9L5 7z" />,
  herramientas: <><path d="M4 20l8-8" /><path d="M14 4l6 6-3 3-6-6z" /></>,
}

export default function SafetyIcon({ type, size = 22 }: { type: SafetyKind | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[type] ?? PATHS.otro}
    </svg>
  )
}
