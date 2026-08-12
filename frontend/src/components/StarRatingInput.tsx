'use client'

import { useState } from 'react'
import { STAR_PATH } from '@/lib/icons_new'

/** Input de estrellas clickeable — variante interactiva de RatingStars
 * (lib/icons_new.tsx, que es solo display). Mismo STAR_PATH, sin glifos `★`. */
export default function StarRatingInput({
  value, onChange, size = 26, color = '#F5C518', disabled = false,
}: {
  value: number
  onChange: (rating: number) => void
  size?: number
  color?: string
  disabled?: boolean
}) {
  const [hover, setHover] = useState(0)
  const shown = hover || value

  return (
    <span style={{ display: 'inline-flex', gap: 4, color }} onMouseLeave={() => setHover(0)}>
      {Array.from({ length: 5 }, (_, i) => {
        const star = i + 1
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            aria-label={`${star} estrella${star > 1 ? 's' : ''}`}
            style={{
              background: 'none', border: 'none', padding: 2, cursor: disabled ? 'default' : 'pointer',
              lineHeight: 0, transition: 'transform .12s ease',
              transform: hover === star ? 'scale(1.12)' : 'scale(1)',
            }}
          >
            <svg width={size} height={size} viewBox="0 0 24 24"
              fill={star <= shown ? 'currentColor' : 'none'}
              stroke="currentColor" strokeWidth={star <= shown ? 0 : 1.6}
              strokeLinecap="round" strokeLinejoin="round">
              <path d={STAR_PATH} />
            </svg>
          </button>
        )
      })}
    </span>
  )
}
