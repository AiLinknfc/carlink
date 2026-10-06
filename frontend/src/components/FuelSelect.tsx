'use client'

import { FUEL_OPTIONS } from '@/lib/fuelType'
import ThemedSelect from '@/components/ThemedSelect'

/* Combustible en una sola fila: usa el `ThemedSelect` de la app (menú propio, no `<option>`
   nativo — ver docs/DESIGN_GUIDELINES.md → "Select / Dropdown Styling"). Sin opción "sin definir":
   el valor sale de la tarjeta de propiedad y, si no se leyó, se elige acá. */
const THEME = { inputBg: 'var(--input-bg)', inputBorder: 'var(--input-border)', inputText: 'var(--text-1)', accent: '#F5C518', muted: 'var(--text-3)', panelBg: 'var(--panel-bg)' }
const LABELS = FUEL_OPTIONS.map(o => o.label)

export default function FuelSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const current = FUEL_OPTIONS.find(o => o.value === value)?.label || ''
  return (
    <ThemedSelect
      value={current} options={LABELS} placeholder="Selecciona el combustible" ariaLabel="Combustible" theme={THEME}
      onChange={label => onChange(FUEL_OPTIONS.find(o => o.label === label)?.value || '')} />
  )
}
