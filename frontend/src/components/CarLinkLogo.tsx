'use client'

import React from 'react'
import { useTheme } from '@/store/theme'

interface Props {
  size?: number
  className?: string
}

export default function CarLinkLogo({ size = 32, className }: Props) {
  const { theme } = useTheme()
  const isDark = theme !== 'light'

  return (
    <img
      src={isDark ? '/logo-dark.svg' : '/logo-light.svg'}
      alt="CarLink"
      className={className}
      style={{
        width: size,
        height: size,
        display: 'block',
        flexShrink: 0,
      }}
    />
  )
}
