'use client'

import { useState } from 'react'
import { useWorkshopInventory } from '@/lib/hooks'
import type { WorkshopInventoryPart } from '@/lib/types'
import AdminModal from '@/components/admin/AdminModal'
import { negocioTokens, inputStyle, labelStyle, primaryBtnStyle, ghostBtnStyle, emptyState, money } from './shared'

const CATEGORIES = ['Otros', 'Motor', 'Frenos', 'Suspensión', 'Eléctrico', 'Filtros', 'Neumáticos', 'Carrocería']

export default function InventarioModule({ theme }: { theme: 'light' | 'dark' }) {
  const t = negocioTokens(theme)
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const { parts, loading, addPart, updatePart, updateStock, deletePart } = useWorkshopInventory(lowStockOnly)
  const [modal, setModal] = useState<WorkshopInventoryPart | null | 'new'>(null)

  return (
    <div style={{ animation: 'sectionIn .4s both' }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => setLowStockOnly(v => !v)}
          style={{
            padding: '8px 16px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
            border: `1px solid ${lowStockOnly ? t.gold : t.subtleBorder}`,
            background: lowStockOnly ? 'rgba(245,197,24,0.14)' : 'transparent',
            color: lowStockOnly ? t.gold : t.textMuted,
          }}
        >Solo stock bajo</button>
        <button onClick={() => setModal('new')} style={{ ...primaryBtnStyle(t), marginLeft: 'auto' }}>+ Nuevo repuesto</button>
      </div>

      {!loading && parts.length === 0 && <div style={emptyState(t, 'Sin repuestos en inventario')} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {parts.map(p => {
          const low = p.stock <= p.min_stock
          return (
            <div key={p.id} style={{
              display: 'grid', gridTemplateColumns: 'minmax(140px,1fr) 90px 100px 100px 90px', gap: 14, alignItems: 'center',
              padding: '13px 18px', borderRadius: 12, background: t.cardBg,
              border: `1px solid ${low ? 'rgba(255,138,61,0.35)' : t.subtleBorder}`,
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: t.textPrimary, cursor: 'pointer' }} onClick={() => setModal(p)}>{p.name}</div>
                <div style={{ fontSize: 11.5, color: t.textMuted }}>{p.sku || '—'} · {p.category}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => updateStock(p.id, Math.max(0, p.stock - 1))} style={stockBtn(t)}>−</button>
                <span style={{ minWidth: 22, textAlign: 'center', fontWeight: 700, color: low ? t.warning : t.textPrimary }}>{p.stock}</span>
                <button onClick={() => updateStock(p.id, p.stock + 1)} style={stockBtn(t)}>+</button>
              </div>
              <div style={{ fontSize: 12, color: t.textMuted }}>mín. {p.min_stock}</div>
              <div style={{ fontSize: 13, color: t.textPrimary }}>{money(p.retail_price)}</div>
              <div style={{ textAlign: 'right' }}>
                {low && <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 9px', borderRadius: 999, background: 'rgba(255,138,61,0.14)', color: t.warning }}>BAJO</span>}
              </div>
            </div>
          )
        })}
      </div>

      {modal && (
        <PartFormModal
          t={t} theme={theme} part={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={async data => { modal === 'new' ? await addPart(data) : await updatePart(modal.id, data); setModal(null) }}
          onDelete={modal !== 'new' ? async () => { await deletePart(modal.id); setModal(null) } : undefined}
        />
      )}
    </div>
  )
}

function stockBtn(t: ReturnType<typeof negocioTokens>): React.CSSProperties {
  return { width: 24, height: 24, borderRadius: 7, border: `1px solid ${t.subtleBorder}`, background: 'transparent', color: t.textPrimary, cursor: 'pointer', fontSize: 15, lineHeight: 1 }
}

function PartFormModal({ t, theme, part, onClose, onSave, onDelete }: {
  t: ReturnType<typeof negocioTokens>
  theme: 'light' | 'dark'
  part: WorkshopInventoryPart | null
  onClose: () => void
  onSave: (data: any) => void
  onDelete?: () => void
}) {
  const [name, setName] = useState(part?.name || '')
  const [sku, setSku] = useState(part?.sku || '')
  const [category, setCategory] = useState(part?.category || 'Otros')
  const [stock, setStock] = useState(String(part?.stock ?? 0))
  const [minStock, setMinStock] = useState(String(part?.min_stock ?? 0))
  const [costPrice, setCostPrice] = useState(String(part?.cost_price ?? 0))
  const [retailPrice, setRetailPrice] = useState(String(part?.retail_price ?? 0))
  const [location, setLocation] = useState(part?.location || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    await onSave({
      name: name.trim(), sku, category, stock: Number(stock) || 0, min_stock: Number(minStock) || 0,
      cost_price: Number(costPrice) || 0, retail_price: Number(retailPrice) || 0, location,
    })
    setSaving(false)
  }

  return (
    <AdminModal isOpen onClose={onClose} title={part ? 'Editar repuesto' : 'Nuevo repuesto'} theme={theme} maxWidth={440}
      footer={<>
        {onDelete && <button onClick={onDelete} style={{ ...ghostBtnStyle(t), color: t.danger, borderColor: 'rgba(255,77,106,0.3)', marginRight: 'auto' }}>Eliminar</button>}
        <button onClick={onClose} style={ghostBtnStyle(t)}>Cancelar</button>
        <button onClick={save} disabled={saving || !name.trim()} style={primaryBtnStyle(t, saving || !name.trim())}>{saving ? 'Guardando…' : 'Guardar'}</button>
      </>}>
      <div><label style={labelStyle(t)}>Nombre</label><input style={inputStyle(t)} value={name} onChange={e => setName(e.target.value)} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div><label style={labelStyle(t)}>SKU</label><input style={inputStyle(t)} value={sku} onChange={e => setSku(e.target.value)} /></div>
        <div>
          <label style={labelStyle(t)}>Categoría</label>
          <select style={inputStyle(t)} value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div><label style={labelStyle(t)}>Stock actual</label><input type="number" style={inputStyle(t)} value={stock} onChange={e => setStock(e.target.value)} /></div>
        <div><label style={labelStyle(t)}>Stock mínimo</label><input type="number" style={inputStyle(t)} value={minStock} onChange={e => setMinStock(e.target.value)} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div><label style={labelStyle(t)}>Precio de costo</label><input type="number" style={inputStyle(t)} value={costPrice} onChange={e => setCostPrice(e.target.value)} /></div>
        <div><label style={labelStyle(t)}>Precio de venta</label><input type="number" style={inputStyle(t)} value={retailPrice} onChange={e => setRetailPrice(e.target.value)} /></div>
      </div>
      <div><label style={labelStyle(t)}>Ubicación</label><input style={inputStyle(t)} value={location} onChange={e => setLocation(e.target.value)} placeholder="Estante A-3" /></div>
    </AdminModal>
  )
}
