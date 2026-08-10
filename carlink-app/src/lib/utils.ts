import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number, currency = 'COP'): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

export const SECTORS = [
  { id: 'emergencias', name: 'Emergencias', icon: 'shield-alert', description: 'Alertas SOS y contacto inmediato' },
  { id: 'fidelizacion', name: 'Fidelización', icon: 'heart-handshake', description: 'Puntos, recompensas y retorno' },
  { id: 'restaurantes', name: 'Restaurantes', icon: 'utensils-crossed', description: 'Menú digital, pedidos y promos' },
  { id: 'mantenimiento', name: 'Mantenimiento', icon: 'wrench', description: 'Historial de servicios y recordatorios' },
  { id: 'servicios', name: 'Servicios', icon: 'briefcase', description: 'Agenda, cotizaciones y seguimiento' },
  { id: 'turismo', name: 'Turismo', icon: 'map-pin', description: 'Guías, rutas y experiencias' },
  { id: 'agro', name: 'Agro', icon: 'sprout', description: 'Trazabilidad, cosechas y mercado' },
] as const

export type SectorId = typeof SECTORS[number]['id']

export interface Sector {
  id: SectorId
  name: string
  icon: string
  description: string
}

export interface KeychainConfig {
  frontType: 'text' | 'image' | 'qr'
  frontText: string
  frontImage: string | null
  frontColor: string
  backType: 'text' | 'image' | 'qr'
  backText: string
  backImage: string | null
  backColor: string
  quantity: number
  finish: 'matte' | 'glossy' | 'metallic'
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isTyping?: boolean
  sectorRecommendation?: SectorRecommendation
}

export interface SectorRecommendation {
  sector: Sector
  rationale: string
  confidence: number
}

export interface CartItem {
  id: string
  config: KeychainConfig
  unitPrice: number
  quantity: number
}