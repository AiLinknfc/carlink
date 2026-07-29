'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { loadCart, addToCart, updateCartItemQty, removeFromCart, clearCart, type Cart, type CartItem } from '@/lib/shop'

interface CartCtx {
  cart: Cart
  addItem: (item: CartItem) => void
  updateQty: (index: string, qty: number) => void
  removeItem: (index: string) => void
  clear: () => void
}

const CartContext = createContext<CartCtx>({ cart: { items: [], total: 0, count: 0 }, addItem: () => {}, updateQty: () => {}, removeItem: () => {}, clear: () => {} })

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>({ items: [], total: 0, count: 0 })
  useEffect(() => { setCart(loadCart()) }, [])
  const addItem = useCallback((item: CartItem) => setCart(addToCart(item)), [])
  const updateQty = useCallback((index: string, qty: number) => setCart(updateCartItemQty(index, qty)), [])
  const removeItem = useCallback((index: string) => setCart(removeFromCart(index)), [])
  const clear = useCallback(() => { clearCart(); setCart({ items: [], total: 0, count: 0 }) }, [])
  return <CartContext.Provider value={{ cart, addItem, updateQty, removeItem, clear }}>{children}</CartContext.Provider>
}

export const useShopCart = () => useContext(CartContext)
