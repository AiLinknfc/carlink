'use client'

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { ServiceTypeIcon } from '@/lib/icons_new'

/* Stack de historial, estilo/efectos adaptados 1:1 de una referencia de "wallet" de tarjetas
   apiladas (stage fijo de pantalla completa, una tarjeta activa al frente, el resto se acomoda
   detras en profundidad 3D segun el scroll) — el CONTENIDO de cada card es exactamente el mismo
   de siempre, solo cambia como se ve/anima.

   Diferencia clave con la referencia (que asume una cantidad fija de tarjetas, ej. 6): el scroll
   total no crece sin limite con el numero de registros. La referencia usa `height:560vh` para 6
   tarjetas (~93vh cada una) — con un historial real de decenas de registros eso volveria la
   pagina absurdamente larga. Acá TRACK_EXTRA_VH tiene un techo (MAX_EXTRA_VH): pasado ese punto,
   agregar mas registros los hace "acumularse" en el mazo (mas profundidad visible detras de la
   tarjeta activa) en vez de alargar el scroll. El tramo tambien se acorto (antes 46vh por
   tarjeta, techo 420vh — con un historial largo eran ~5 pantallas completas de scroll solo para
   esta seccion, se sentia interminable) a algo que se recorre rapido sin importar cuantos
   servicios tenga el vehiculo. */
const PER_CARD_VH = 22
const MAX_EXTRA_VH = 220
const CARD_MIN_H = 280
// El grupo (tarjetas + puntos) va pegado arriba del stage, sin margen — lo mas cerca posible del
// texto de la cabecera de HistorialTab que queda justo encima. El gap entre tarjetas y puntos es
// chico a proposito: el indicador va pegado a la ultima tarjeta, no separado.
const STACK_DOTS_GAP = 14
// Primer tramo del scroll (fraccion del track) donde las tarjetas todavia no se mueven — le da al
// usuario un momento para "entrar" a la seccion antes de que el apilado arranque, en vez de que
// se mueva de entrada apenas se pega el stage. El resto del track (1 - DEAD_ZONE) es lo que
// realmente recorre las N tarjetas.
const DEAD_ZONE = 0.1

const SERVICE_CARD_THEME: Record<string, { bg: string; accent: string; text: string; sub: string }> = {
  Aceite:       { bg: 'linear-gradient(135deg,#3a2a06 0%,#6b4b0c 45%,#231903 100%)', accent: '#F5C518', text: '#fff6dc', sub: '#d8c98a' },
  Aire:         { bg: 'linear-gradient(135deg,#062626 0%,#0c4a4a 45%,#031616 100%)', accent: '#4dd8d8', text: '#e6fbfb', sub: '#8adede' },
  Combustible:  { bg: 'linear-gradient(135deg,#062608 0%,#144a1c 45%,#031603 100%)', accent: '#4ade80', text: '#e9fbee', sub: '#8fdba5' },
  Frenos:       { bg: 'linear-gradient(135deg,#2a0606 0%,#5c0c0c 45%,#170303 100%)', accent: '#ef4444', text: '#fdeaea', sub: '#d88a8a' },
  Refrigerante: { bg: 'linear-gradient(135deg,#04121e 0%,#0a2c4a 45%,#020a14 100%)', accent: '#4d9dd8', text: '#e6f1fb', sub: '#8ab6de' },
  Llantas:      { bg: 'linear-gradient(135deg,#161616 0%,#2e2e2e 45%,#0a0a0a 100%)', accent: '#c9c9c9', text: '#f2f2f2', sub: '#a8a8a8' },
  'Suspensión': { bg: 'linear-gradient(135deg,#1c0626 0%,#3c0c4a 45%,#100316 100%)', accent: '#c084fc', text: '#f5e9fd', sub: '#c9a0de' },
  'Batería':    { bg: 'linear-gradient(135deg,#262006 0%,#4a3e0c 45%,#161203 100%)', accent: '#facc15', text: '#fdf6dc', sub: '#dcc98a' },
  'Transmisión':{ bg: 'linear-gradient(135deg,#0e0e0e 0%,#2c2c2c 45%,#080808 100%)', accent: '#9ca3af', text: '#f0f0f0', sub: '#aeb0b4' },
  Otro:         { bg: 'linear-gradient(135deg,#1c1708 0%,#3a2f0c 45%,#0d0d0d 100%)', accent: '#F5C518', text: '#f5f0d8', sub: '#c0b080' },
}
function getTheme(type?: string) {
  return SERVICE_CARD_THEME[type || ''] || SERVICE_CARD_THEME.Otro
}
interface Props {
  records: any[]
  onEdit?: (r: any) => void
}

function CardFace({ r, theme, onEdit, shineRef }: { r: any; theme: { bg: string; accent: string; text: string; sub: string }; onEdit?: (r: any) => void; shineRef?: (el: HTMLDivElement | null) => void }) {
  return (
    <div style={{
      position: 'relative', borderRadius: 24, overflow: 'hidden',
      padding: '22px 26px', minHeight: CARD_MIN_H,
      background: theme.bg,
      border: `1px solid ${theme.accent}55`,
      color: theme.text,
    }}>
      {/* glossy shine sweep — recorre TODO el ancho de la tarjeta (antes la banda era angosta y
          quedaba confinada al lado izquierdo, nunca cruzaba toda la superficie); su posicion la
          controla el scroll (solo mientras es la tarjeta activa) */}
      <div ref={shineRef} style={{
        position: 'absolute', top: '-25%', left: '-15%', width: '130%', height: '190%',
        background: 'linear-gradient(115deg,transparent 32%,rgba(255,255,255,.30) 48%,rgba(255,255,255,.06) 52%,transparent 68%)',
        backgroundSize: '230% 100%', backgroundPosition: '160% 0',
        transform: 'skewX(-18deg)', pointerEvents: 'none',
      }} />

      {/* header: chip + service name + date + edit */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <span style={{
            width: 46, height: 34, borderRadius: 7, flex: '0 0 auto',
            background: 'linear-gradient(135deg,rgba(255,255,255,0.35),rgba(255,255,255,0.05))',
            border: `1px solid ${theme.accent}88`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.accent,
          }}><ServiceTypeIcon type={r.service_type} size={18} /></span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: theme.accent, fontWeight: 800 }}>CarLink Service Record</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '.01em', color: theme.text, marginTop: 2 }}>{r.service_type}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>
          <span style={{ fontSize: 12, color: theme.sub, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {r.date ? new Date(r.date).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
          </span>
          {/* Registrado solo por un taller (docs/PLAN_FACTURACION_AUTOMATICA.md
              Paso 3) — nunca editable, ni siquiera por el dueño del vehículo. */}
          {r.workshop_id ? (
            <span title="Registrado por el taller — no editable" style={{
              fontSize: 9.5, fontWeight: 700, padding: '4px 8px', borderRadius: 999,
              background: 'rgba(255,255,255,0.1)', color: theme.sub, whiteSpace: 'nowrap',
            }}>Del taller</span>
          ) : onEdit && (
            <button onClick={() => onEdit(r)} title="Editar" style={{
              width: 30, height: 30, borderRadius: 8, border: `1px solid ${theme.accent}55`,
              background: 'rgba(255,255,255,0.06)', color: theme.text, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>
          )}
        </div>
      </div>

      {/* "card number" styled mileage — the embossed-digits look */}
      <div style={{ margin: '22px 0 6px', position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: theme.sub, fontWeight: 700 }}>Kilometraje actual</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 27, color: theme.text, marginTop: 4 }}>
            {r.mileage != null ? r.mileage.toLocaleString() : '——————'} <span style={{ fontSize: 13, opacity: .7 }}>KM</span>
          </div>
        </div>
        {r.next_service_mileage != null && (
          <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
            <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: theme.sub, fontWeight: 700 }}>Próximo servicio</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 16, color: theme.accent, marginTop: 2 }}>
              {r.next_service_mileage.toLocaleString()} <span style={{ fontSize: 11, opacity: .7 }}>KM</span>
            </div>
          </div>
        )}
      </div>

      {r.description && (
        <div style={{ fontSize: 13, color: theme.sub, marginTop: 6, maxWidth: '70%', position: 'relative' }}>{r.description}</div>
      )}

      {/* footer: workshop / cost / lubricant + brand mark */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 20, flexWrap: 'wrap', gap: 12, position: 'relative' }}>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: theme.sub, fontWeight: 700 }}>Taller</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: theme.text, marginTop: 2 }}>{r.workshop || 'No registrado'}</div>
          </div>
          {r.cost > 0 && (
            <div>
              <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: theme.sub, fontWeight: 700 }}>Costo</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: theme.text, marginTop: 2 }}>${Number(r.cost).toLocaleString()}</div>
            </div>
          )}
          {r.lubricant_brand && (
            <div>
              <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: theme.sub, fontWeight: 700 }}>Lubricante</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: theme.text, marginTop: 2 }}>{r.lubricant_brand}{r.lubricant_type ? ` · ${r.lubricant_type}` : ''}</div>
            </div>
          )}
          {r.next_service_mileage != null && r.mileage != null && (
            <div>
              <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: theme.sub, fontWeight: 700 }}>Vida útil</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: theme.accent, marginTop: 2 }}>{(r.next_service_mileage - r.mileage).toLocaleString()} km</div>
            </div>
          )}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: theme.accent, letterSpacing: '.03em', opacity: .85, flex: '0 0 auto' }}>CarLink</div>
      </div>
    </div>
  )
}

export default function HistoryStack({ records, onEdit }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const shineRefs = useRef<(HTMLDivElement | null)[]>([])
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([])
  const counterRef = useRef<HTMLSpanElement>(null)

  const N = records.length
  const extraVh = Math.min(MAX_EXTRA_VH, Math.max(0, (N - 1) * PER_CARD_VH))

  const paint = useCallback((force: boolean) => {
    const track = trackRef.current
    if (!track || N === 0) return
    const trackDocTop = track.getBoundingClientRect().top + window.scrollY
    const span = track.offsetHeight - window.innerHeight
    const rawProgress = span > 0 ? Math.min(1, Math.max(0, (window.scrollY - trackDocTop) / span)) : 0
    // Los primeros DEAD_ZONE de scroll no mueven nada todavia (ver constante arriba).
    const progress = Math.min(1, Math.max(0, (rawProgress - DEAD_ZONE) / (1 - DEAD_ZONE)))
    const scrollPos = progress * (N - 1)
    const frac = scrollPos - Math.floor(scrollPos)
    const activeIdx = Math.min(N - 1, Math.round(scrollPos))

    cardRefs.current.forEach((el, i) => {
      if (!el) return
      const rel = i - scrollPos
      let transform: string, opacity: number, zIndex: number
      if (rel < -0.45) {
        // Ya paso hace rato: se despega hacia la camara y se desvanece (deja de "acumularse").
        const t = Math.min(1, (-rel - 0.45) / 0.6)
        transform = `translateY(${-170 - t * 220}px) translateZ(90px) rotateX(${-15 * t}deg) scale(${1 - t * 0.1})`
        opacity = Math.max(0, 1 - t)
        zIndex = 300
      } else {
        // Activa (rel≈0) o todavia por venir (rel>0): se acomoda detras, mas profundidad cuanto
        // mas lejos en el mazo — esto es lo que "acumula" sin alargar el scroll: con mas registros
        // simplemente hay mas capas visibles detras, no mas distancia para llegar a la activa.
        const cl = Math.max(-0.45, rel)
        const lift = rel < 0 ? -rel * 60 : 0
        transform = `translateY(${cl * 30 - lift}px) translateZ(${-cl * 46}px) rotateX(${4 + cl * 2.2}deg) scale(${1 - cl * 0.05})`
        opacity = cl > 5.5 ? Math.max(0, 1 - (cl - 5.5)) : 1
        zIndex = Math.round(200 - cl * 10)
      }
      el.style.transform = transform
      el.style.opacity = String(opacity)
      el.style.zIndex = String(zIndex)
      const face = el.firstElementChild as HTMLElement | null
      if (face) {
        const sd = Math.max(0, rel)
        face.style.boxShadow = `0 ${18 + sd * 8}px ${44 + sd * 14}px rgba(0,0,0,${Math.max(0.16, 0.56 - Math.min(0.4, sd * 0.06))}), inset 0 1px 0 rgba(255,255,255,.14)`
      }
      const shine = shineRefs.current[i]
      if (shine) shine.style.backgroundPosition = (activeIdx === i ? (frac * 220 - 60) : 160) + '% 0'
    })

    dotRefs.current.forEach((el, i) => {
      if (!el) return
      const on = i === activeIdx
      el.style.width = on ? '22px' : '7px'
      el.style.background = on ? 'linear-gradient(90deg,#fff6dc,#F5C518)' : 'rgba(255,255,255,0.22)'
    })
    if (counterRef.current) counterRef.current.textContent = String(activeIdx + 1).padStart(2, '0') + '/' + String(N).padStart(2, '0')
    void force
  }, [N])

  const measure = useCallback(() => { paint(true) }, [paint])

  useLayoutEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  useEffect(() => {
    let raf = 0
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; paint(false) }) }
    paint(true)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [paint])

  if (!N) return null

  return (
    <div ref={trackRef} style={{ position: 'relative', height: `calc(100vh + ${extraVh}vh)` }}>
      <style>{`@media(prefers-reduced-motion:reduce){ .hist-stage *{transition:none !important} }`}</style>
      <div className="hist-stage" style={{ position: 'sticky', top: 0, height: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflow: 'hidden', perspective: 1500, padding: '0 16px' }}>
        {/* Tarjetas + puntos son UN solo bloque, pegado arriba del stage (sin margen/top) — lo mas
            cerca posible del texto de la cabecera de HistorialTab, que queda justo encima en el
            documento. El indicador de puntos no se separa a su propia posicion (eso fue lo que lo
            "movio" antes) y queda pegado a la ultima tarjeta con un gap chico. */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: STACK_DOTS_GAP, maxWidth: '100%' }}>
          <div style={{ position: 'relative', width: 'min(92vw, 480px)', maxWidth: '100%', transformStyle: 'preserve-3d' }}>
            {records.map((r, i) => {
              const theme = getTheme(r.service_type)
              return (
                <div key={r.id || i}
                  ref={el => { cardRefs.current[i] = el }}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', willChange: 'transform', transformOrigin: 'bottom center', transition: 'transform .25s cubic-bezier(0.22,1,0.36,1), opacity .25s' }}>
                  <CardFace r={r} theme={theme} onEdit={onEdit} shineRef={el => { shineRefs.current[i] = el }} />
                </div>
              )
            })}
            {/* Referencia invisible que le da su alto real al contenedor relativo (el mas nuevo, i=0). */}
            <div style={{ visibility: 'hidden', pointerEvents: 'none' }}><CardFace r={records[0]} theme={getTheme(records[0]?.service_type)} /></div>
          </div>

          <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px 8px 12px', borderRadius: 999, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', backdropFilter: 'blur(16px)' }}>
            <span ref={counterRef} style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', color: 'var(--text-3)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {records.map((r, i) => (
                <span key={r.id || i} ref={el => { dotRefs.current[i] = el }} style={{ width: 7, height: 7, borderRadius: 999, background: 'rgba(255,255,255,0.22)', transition: 'width .4s cubic-bezier(.2,.8,.2,1), background .4s' }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
