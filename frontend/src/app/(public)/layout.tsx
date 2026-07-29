export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)', color: 'var(--text-1)', fontFamily: 'var(--font-ui)' }}>
      {children}
    </div>
  )
}
