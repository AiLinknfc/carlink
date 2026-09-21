import PublicChrome from '@/components/company/PublicChrome'

// Nosotros, Blog y Trabaja con nosotros comparten header, footer y modal de políticas.
export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  return <PublicChrome>{children}</PublicChrome>
}
