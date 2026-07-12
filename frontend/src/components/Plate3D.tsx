'use client'

import styles from './Plate.module.css'

interface Props {
  plate: string
  city: string
  bg?: string
  inkColor?: string
  labelColor?: string
  tag?: string
}

export default function Plate3D({ plate, city, bg = '#F5C518', inkColor = '#111', labelColor, tag }: Props) {
  const subColor = labelColor || 'rgba(0,0,0,.55)'
  return (
    <div className={styles.plate} style={{ background: bg }}>
      <div className={styles['plate-label']} style={{ color: subColor }}>COLOMBIA</div>
      <div className={styles['plate-number']} style={{ color: inkColor }}>{plate}</div>
      <div className={styles['plate-city']} style={{ color: subColor }}>{city}</div>
      {tag && <div className={styles['plate-tag']} style={{ color: subColor, borderColor: subColor }}>{tag}</div>}
      <div className={styles['plate-shine']} />
    </div>
  )
}
