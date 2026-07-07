'use client'

import { useState, useCallback } from 'react'
import styles from './Plate.module.css'

interface Props {
  plate: string
  city: string
  isMoto?: boolean
  bg?: string
  labelColor?: string
  inkColor?: string
  subColor?: string
  tag?: string
}

export default function Plate3D({ plate, city, isMoto, bg = '#F5C518', inkColor = '#111', tag }: Props) {
  const [spinning, setSpinning] = useState(false)

  const handleClick = useCallback(() => {
    if (spinning) return
    setSpinning(true)
    setTimeout(() => setSpinning(false), 1100)
  }, [spinning])

  const cls = `${styles.plate}${isMoto ? ` ${styles.moto}` : ''}${spinning ? ` ${styles.spinning}` : ''}`

  return (
    <div className={cls} style={{ background: bg }} onClick={handleClick}>
      <div className={styles['plate-country']} style={{ color: '#7c786e' }}>COLOMBIA</div>
      <div className={styles['plate-number']} style={{ color: inkColor }}>{plate}</div>
      <div className={styles['plate-city']} style={{ color: 'rgba(0,0,0,.55)' }}>{city}</div>
      {tag && <div className={styles['plate-tag']} style={{ color: 'rgba(0,0,0,.55)', borderColor: 'rgba(0,0,0,.55)' }}>{tag}</div>}
      <div className={styles['plate-shine']} />
    </div>
  )
}
