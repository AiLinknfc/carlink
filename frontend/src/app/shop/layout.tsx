'use client'

import { CartProvider } from '@/lib/shop-cart-context'

export default function ShopProviderLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>
}
