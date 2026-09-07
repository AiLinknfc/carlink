'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

interface ThemeCtx {
  theme: 'light' | 'dark'
  isDark: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeCtx>({
  theme: 'dark', isDark: true, toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    try {
      if (window.localStorage.getItem('carlink_theme') === 'light') setTheme('light')
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    // Sync favicon with app theme
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"][sizes="48x48"]')
    if (link) link.href = theme === 'light' ? '/favicon-light-48.png' : '/favicon-dark-48.png'
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light'
      try { window.localStorage.setItem('carlink_theme', next) } catch { /* ignore */ }
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme !== 'light', toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
