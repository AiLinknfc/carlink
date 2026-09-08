'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

type ThemeName = 'light' | 'dark'

interface ThemeCtx {
  theme: ThemeName
  isDark: boolean
  toggleTheme: () => void
  /** Pin the *displayed* theme regardless of the saved preference — for
   *  pages (como la landing) que deben verse siempre en un tema fijo. Pasa
   *  `null` para soltar el pin. Nunca toca la preferencia guardada. */
  forceTheme: (theme: ThemeName | null) => void
}

const ThemeContext = createContext<ThemeCtx>({
  theme: 'dark', isDark: true, toggleTheme: () => {}, forceTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [savedTheme, setSavedTheme] = useState<ThemeName>('dark')
  const [forcedTheme, setForcedTheme] = useState<ThemeName | null>(null)
  // Tema efectivo: lo que se pinta en pantalla. Todo (el atributo del DOM
  // de acá abajo y los `isDark` que usan los componentes para calcular
  // colores en JS) lee de este único valor — antes la landing escribía el
  // atributo del DOM por su cuenta para forzar oscuro, y esa segunda
  // escritura se desincronizaba del estado real al navegar del lado del
  // cliente (login → /app → logout → "/"), dejando texto de un tema
  // pintado sobre fondo del otro.
  const theme = forcedTheme ?? savedTheme

  useEffect(() => {
    try {
      if (window.localStorage.getItem('carlink_theme') === 'light') setSavedTheme('light')
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    // Sync favicon with app theme
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"][sizes="48x48"]')
    if (link) link.href = theme === 'light' ? '/favicon-light-48.png' : '/favicon-dark-48.png'
  }, [theme])

  const toggleTheme = useCallback(() => {
    setSavedTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light'
      try { window.localStorage.setItem('carlink_theme', next) } catch { /* ignore */ }
      return next
    })
  }, [])

  const forceTheme = useCallback((t: ThemeName | null) => setForcedTheme(t), [])

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme !== 'light', toggleTheme, forceTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
