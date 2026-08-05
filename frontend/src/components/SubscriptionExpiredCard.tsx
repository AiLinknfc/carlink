'use client'

/* Compartido entre /app (tabs Taller/Config) y /app/negocio (panel de
   negocio taller/empresa) — antes vivía solo en app/page.tsx, extraído aquí
   para no duplicarlo (ver docs/PLAN_MIGRACION_TALLERPRO.md Fase 3). */
export default function SubscriptionExpiredCard({ theme }: { theme: 'light' | 'dark' }) {
  const isDark = theme === 'dark'
  const GOLD = '#F5C518'
  return (
    <div style={{ maxWidth: 440, margin: '60px auto', textAlign: 'center', padding: 32, borderRadius: 20, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,17,0.08)'}` }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,77,106,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff4d6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, textTransform: 'uppercase', letterSpacing: '.02em', color: isDark ? '#f5f3ec' : '#17171a', marginBottom: 8 }}>Suscripción vencida</div>
      <p style={{ fontSize: 13, color: isDark ? '#8f8a7a' : '#6f6a5f', lineHeight: 1.5, margin: '0 0 20px' }}>Tu período de prueba ha terminado. Renueva tu plan para seguir usando las funciones del taller.</p>
      <button style={{ padding: '12px 28px', borderRadius: 12, border: 'none', background: GOLD, color: '#111', fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 0 20px rgba(245,197,24,0.35)' }}>Suscribirme ahora</button>
    </div>
  )
}
