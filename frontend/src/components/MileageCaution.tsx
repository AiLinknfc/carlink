'use client'

/* Aviso de precaucion del kilometraje inicial (usado en el asistente y en "Agregar vehiculo"). En reposo se ve
   atenuado; al enfocar el campo del kilometraje (`active`) se resalta y pulsa un par de veces, para que la persona
   lo lea justo cuando va a escribir el dato. Con "reducir movimiento" activado solo cambia el resalte, sin animar. */
export default function MileageCaution({ active, accent = '#F5C518' }: { active: boolean; accent?: string }) {
  return (
    <>
      <style>{`
        @keyframes mileageCautionPulse {
          0% { box-shadow: 0 0 0 0 rgba(245,197,24,.55); transform: translateY(0); }
          35% { transform: translateY(-2px); }
          70% { box-shadow: 0 0 0 9px rgba(245,197,24,0); }
          100% { box-shadow: 0 0 0 0 rgba(245,197,24,0); transform: translateY(0); }
        }
        .mileage-caution[data-active="true"] { animation: mileageCautionPulse 1.1s ease-out 2; }
        @media (prefers-reduced-motion: reduce) { .mileage-caution[data-active="true"] { animation: none; } }
      `}</style>
      <div
        className="mileage-caution"
        data-active={active}
        role="note"
        style={{
          marginTop: 8, padding: '9px 12px', borderRadius: 10, display: 'flex', gap: 9, alignItems: 'flex-start',
          background: active ? 'rgba(245,197,24,0.16)' : 'rgba(245,197,24,0.08)',
          border: `1px solid ${active ? accent : 'rgba(245,197,24,0.3)'}`,
          opacity: active ? 1 : 0.8, transition: 'background .25s, border-color .25s, opacity .25s',
          fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.5,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: '0 0 auto', marginTop: 1 }}>
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" />
        </svg>
        <span>
          <b>Ten cuidado con este dato.</b> Es el punto de partida del historial del vehículo: desde aquí el kilometraje nunca puede bajar, y después solo se corrige durante 48 horas. Ingresa lo que marca el tablero hoy.
        </span>
      </div>
    </>
  )
}
