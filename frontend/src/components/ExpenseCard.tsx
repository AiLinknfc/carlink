'use client'

import type { ReactNode } from 'react'
import { isPdf } from '@/lib/upload'
import type { VehicleExpense } from '@/lib/types'

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: ReactNode }> = {
  fuel: {
    label: 'Combustible',
    color: '#F5C518',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 22V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M3 12h8"/><path d="M3 22h8"/><path d="M14 8.4l3 2.6v6a1.4 1.4 0 0 0 2.8 0v-4.8l-2.2-2.2"/></svg>,
  },
  parts: {
    label: 'Repuestos',
    color: '#2ecc71',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  },
  service: {
    label: 'Servicio',
    color: '#60a5fa',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  },
  insurance: {
    label: 'Seguro',
    color: '#a78bfa',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  },
  other: {
    label: 'Otro',
    color: '#9a968a',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>,
  },
}

function formatCurrency(value: number | null): string {
  if (value == null) return '-'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
  } catch {
    return dateStr
  }
}

interface Props {
  expense: VehicleExpense
  onPreview?: (url: string) => void
  onDelete?: (id: string) => void
}

export default function ExpenseCard({ expense, onPreview, onDelete }: Props) {
  const cat = CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG.other
  const hasFile = Boolean(expense.file_url)

  return (
    <div style={{
      background: 'var(--tablero-bg, var(--surface))',
      border: '1px solid rgba(245,197,24,0.18)',
      borderRadius: 14,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      position: 'relative',
      minHeight: 140,
      transition: 'border-color .18s',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(245,197,24,0.4)' }}
    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(245,197,24,0.18)' }}
    >
      {/* Header: category badge + date */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 8px', borderRadius: 6,
          background: `${cat.color}14`, color: cat.color,
          fontSize: 10, fontWeight: 700, letterSpacing: '.03em',
          textTransform: 'uppercase',
        }}>
          {cat.icon}
          {cat.label}
        </span>
        {expense.issue_date && (
          <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 500 }}>
            {formatDate(expense.issue_date)}
          </span>
        )}
      </div>

      {/* Title */}
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.3 }}>
        {expense.title}
      </div>

      {/* Vendor */}
      {expense.vendor && (
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
          {expense.vendor}
        </div>
      )}

      {/* Fuel details */}
      {expense.category === 'fuel' && (
        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-2)' }}>
          {expense.fuel_liters && <span>{expense.fuel_liters} L</span>}
          {expense.price_per_liter && <span>${Number(expense.price_per_liter).toLocaleString('es-CO')}/L</span>}
          {expense.fuel_type && <span style={{ textTransform: 'capitalize' }}>{expense.fuel_type}</span>}
        </div>
      )}

      {/* Mileage */}
      {expense.mileage_at_purchase && (
        <div style={{ fontSize: 10, color: 'var(--text-4)' }}>
          {Number(expense.mileage_at_purchase).toLocaleString('es-CO')} km
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Footer: cost + actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: '#F5C518' }}>
          {formatCurrency(expense.cost)}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {hasFile && (
            <button
              onClick={() => onPreview?.(expense.file_url)}
              style={{
                width: 28, height: 28, borderRadius: 7,
                border: '1px solid var(--border-2)', background: 'var(--surface-2)',
                color: 'var(--text-2)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              title="Ver archivo"
            >
              {isPdf(expense.file_url) ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              )}
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(expense.id)}
              style={{
                width: 28, height: 28, borderRadius: 7,
                border: '1px solid var(--border-2)', background: 'var(--surface-2)',
                color: 'var(--text-3)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              title="Eliminar"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
