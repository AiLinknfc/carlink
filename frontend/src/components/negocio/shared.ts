/* Tokens de estilo compartidos por los módulos del panel de negocio
   (taller/empresa) — ver docs/PLAN_MIGRACION_TALLERPRO.md Fase 4. Mismo
   sistema visual que el resto de CarLink (acento #F5C518, sin Tailwind). */
import type { CSSProperties } from 'react'

export function negocioTokens(theme: 'light' | 'dark') {
  const isDark = theme === 'dark'
  return {
    isDark,
    gold: '#F5C518',
    cardBg: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
    border: isDark ? 'rgba(245,197,24,0.16)' : 'rgba(17,17,17,0.1)',
    subtleBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,17,0.08)',
    textPrimary: isDark ? '#f5f3ec' : '#17171a',
    textSecondary: isDark ? '#b6b2a6' : '#5c584e',
    textMuted: isDark ? '#8f8a7a' : '#6f6a5f',
    inputBg: isDark ? 'rgba(0,0,0,0.35)' : '#ffffff',
    danger: '#ff4d6a',
    success: '#2ecc71',
    warning: '#ff8a3d',
  }
}

export type NegocioTokens = ReturnType<typeof negocioTokens>

export function inputStyle(t: NegocioTokens): CSSProperties {
  return {
    padding: '10px 12px', borderRadius: 10, fontSize: 13.5, fontFamily: 'inherit', outline: 'none',
    width: '100%', boxSizing: 'border-box', background: t.inputBg,
    border: `1px solid ${t.subtleBorder}`, color: t.textPrimary,
  }
}

export function labelStyle(t: NegocioTokens): CSSProperties {
  return { fontSize: 10.5, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 5 }
}

export function primaryBtnStyle(t: NegocioTokens, disabled?: boolean): CSSProperties {
  return {
    padding: '11px 20px', borderRadius: 11, border: 'none', background: t.gold, color: '#111',
    fontWeight: 800, fontSize: 13.5, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.55 : 1,
    display: 'inline-flex', alignItems: 'center', gap: 8,
  }
}

export function ghostBtnStyle(t: NegocioTokens): CSSProperties {
  return {
    padding: '11px 20px', borderRadius: 11, cursor: 'pointer', fontSize: 13.5, fontWeight: 700,
    background: 'transparent', color: t.textSecondary, border: `1px solid ${t.subtleBorder}`,
  }
}

export function money(n: number | undefined | null): string {
  return `$${Math.round(n || 0).toLocaleString('es-CO')}`
}

export function emptyState(t: NegocioTokens, text: string) {
  return { textAlign: 'center' as const, padding: 40, color: t.textMuted, fontSize: 14, border: `1px dashed ${t.subtleBorder}`, borderRadius: 16 }
}
