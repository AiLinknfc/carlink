'use client'

import styles from './Plate.module.css'
import { getPlateDisplay } from '@/lib/plate'

export type PlateSize = 'lg' | 'md' | 'sm'

interface Props {
  plate: string
  city?: string
  bg?: string
  inkColor?: string
  labelColor?: string
  showLabel?: boolean
  size?: PlateSize
  className?: string
}

const SIZE_CONFIG: Record<PlateSize, { width: number; height: number; fontLabel: number; fontNumber: number; fontCity: number; radius: number; shadow: string }> = {
  lg: { width: 448, height: 190, fontLabel: 18, fontNumber: 80, fontCity: 14, radius: 18, shadow: '0 30px 70px rgba(0,0,0,.6), inset 0 4px 0 rgba(255,255,255,.5), inset 0 -8px 18px rgba(90,60,0,.22)' },
  md: { width: 200, height: 78, fontLabel: 8, fontNumber: 38, fontCity: 7, radius: 8, shadow: '0 12px 30px rgba(0,0,0,.45), inset 0 2px 0 rgba(255,255,255,.4), inset 0 -4px 10px rgba(90,60,0,.18)' },
  sm: { width: 80, height: 39, fontLabel: 0, fontNumber: 14, fontCity: 0, radius: 5, shadow: '0 4px 12px rgba(0,0,0,.3)' },
}

export default function Plate3D({ plate, city = '', bg = '#F5C518', inkColor = '#111', labelColor, showLabel = true, size = 'lg', className }: Props) {
  const subColor = labelColor || 'rgba(0,0,0,.55)'
  const displayPlate = getPlateDisplay(plate)
  const cfg = SIZE_CONFIG[size]
  const showCol = showLabel && cfg.fontLabel > 0
  const showCity = city && cfg.fontCity > 0

  return (
    <div
      className={`${styles.plate} ${className || ''}`}
      style={{
        background: bg,
        width: cfg.width,
        height: cfg.height,
        maxWidth: '92vw',
        borderRadius: cfg.radius,
        boxShadow: cfg.shadow,
      }}
    >
      {showCol && (
        <div className={styles['plate-label']} style={{ color: subColor, fontSize: cfg.fontLabel }}>
          COLOMBIA
        </div>
      )}
      <div className={styles['plate-number']} style={{ color: inkColor, fontSize: cfg.fontNumber }}>
        {displayPlate}
      </div>
      {showCity && (
        <div className={styles['plate-city']} style={{ color: subColor, fontSize: cfg.fontCity }}>
          {city}
        </div>
      )}
      {size === 'lg' && <div className={styles['plate-shine']} />}
    </div>
  )
}
