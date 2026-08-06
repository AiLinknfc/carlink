'use client'

import { useState } from 'react'
import { useWorkshopInventory } from '@/lib/hooks'
import type { WorkshopInventoryPart } from '@/lib/types'
import AdminModal from '@/components/admin/AdminModal'
import { negocioTokens, inputStyle, labelStyle, primaryBtnStyle, ghostBtnStyle, emptyState, money } from './shared'

const CATEGORIES = ['Otros', 'Motor', 'Frenos', 'Suspensión', 'Eléctrico', 'Filtros', 'Neumáticos', 'Carrocería']

export default function InventarioModule({ theme }: { theme: 'light' | 'dark' }) {
  const t = negocioTokens(theme)
  const { parts, loading, addPart, updatePart, updateStock, deletePart } = useWorkshopInventory()
  const [modal, setModal] = useState<WorkshopInventoryPart | null | 'new'>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [stockFilter, setStockFilter] = useState('')

  const lowStockParts = parts.filter(p => p.stock <= p.min_stock)
  // Costo aproximado de reabastecer cada repuesto bajo hasta 2x su mínimo —
  // mismo cálculo que tallerpro (InventoryManager: totalReorderCost).
  const totalReorderCost = lowStockParts.reduce((acc, p) => acc + Math.max(0, p.min_stock * 2 - p.stock) * Number(p.cost_price), 0)

  const filteredParts = parts.filter(p => {
    if (categoryFilter && p.category !== categoryFilter) return false
    const low = p.stock <= p.min_stock
    if (stockFilter === 'low' && !low) return false
    if (stockFilter === 'ok' && low) return false
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
  })

  return (
    <div style={{ animation: 'sectionIn .4s both' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => setModal('new')} style={primaryBtnStyle(t)}>+ Nuevo repuesto</button>
      </div>

      {/* Alerta de reabastecimiento — igual que tallerpro (InventoryManager:
          banner de stock bajo con costo total estimado de reabastecer). */}
      {lowStockParts.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderRadius: 14, marginBottom: 16,
          background: 'rgba(255,138,61,0.08)', border: '1px solid rgba(255,138,61,0.28)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: t.warning, color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            </span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: t.textPrimary }}>¡Atención! Hay {lowStockParts.length} repuesto{lowStockParts.length !== 1 ? 's' : ''} por debajo del stock mínimo.</div>
              <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>Costo aproximado para reabastecer a nivel óptimo: <b style={{ color: t.textPrimary }}>{money(totalReorderCost)}</b></div>
            </div>
          </div>
          <button onClick={() => setStockFilter('low')} style={{ padding: '9px 16px', borderRadius: 10, border: 'none', background: t.warning, color: '#111', fontWeight: 800, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Ver repuestos críticos
          </button>
        </div>
      )}

      {/* Búsqueda + filtros — igual que tallerpro */}
      <div style={{ padding: 16, borderRadius: 16, background: t.cardBg, border: `1px solid ${t.border}`, marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: t.textMuted }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o SKU…" style={{ ...inputStyle(t), paddingLeft: 32 }} />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ ...inputStyle(t), width: 'auto', flex: '0 1 190px' }}>
          <option value="">Todas las categorías</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={stockFilter} onChange={e => setStockFilter(e.target.value)} style={{ ...inputStyle(t), width: 'auto', flex: '0 1 190px' }}>
          <option value="">Todos los niveles de stock</option>
          <option value="low">⚠️ Alertas de stock bajo</option>
          <option value="ok">✅ Stock normal</option>
        </select>
      </div>

      {!loading && parts.length === 0 && <div style={emptyState(t, 'Sin repuestos en inventario')} />}
      {!loading && parts.length > 0 && filteredParts.length === 0 && <div style={emptyState(t, 'Ningún repuesto coincide con los filtros')} />}

      {filteredParts.length > 0 && (
        <div style={{ borderRadius: 16, border: `1px solid ${t.border}`, background: t.cardBg, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 820 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(160px,1.4fr) 140px 110px 130px 100px 100px 80px 70px', gap: 12, padding: '11px 18px', borderBottom: `1px solid ${t.subtleBorder}`, fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: t.textMuted }}>
                <div>SKU / Repuesto</div><div>Categoría</div><div>Ubicación</div><div style={{ textAlign: 'center' }}>Stock</div><div style={{ textAlign: 'right' }}>Costo</div><div style={{ textAlign: 'right' }}>Venta</div><div style={{ textAlign: 'center' }}>Margen</div><div style={{ textAlign: 'center' }}>Acciones</div>
              </div>
              {filteredParts.map(p => {
                const low = p.stock <= p.min_stock
                const margin = Number(p.cost_price) > 0 ? ((Number(p.retail_price) - Number(p.cost_price)) / Number(p.cost_price)) * 100 : 0
                return (
                  <div key={p.id} style={{
                    display: 'grid', gridTemplateColumns: 'minmax(160px,1.4fr) 140px 110px 130px 100px 100px 80px 70px', gap: 12, alignItems: 'center',
                    padding: '12px 18px', borderTop: `1px solid ${t.subtleBorder}`, background: low ? 'rgba(255,138,61,0.05)' : 'transparent',
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: t.textMuted, background: t.subtleBorder, padding: '2px 6px', borderRadius: 5 }}>{p.sku || '—'}</span>
                      <div style={{ fontWeight: 700, fontSize: 13, color: t.textPrimary, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    </div>
                    <div style={{ fontSize: 12, color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.category}</div>
                    <div style={{ fontSize: 12, color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.location || '—'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <button onClick={() => updateStock(p.id, Math.max(0, p.stock - 1))} style={stockBtn(t)}>−</button>
                      <span style={{ minWidth: 22, textAlign: 'center', fontWeight: 800, fontSize: 12.5, color: low ? t.warning : t.textPrimary }}>{p.stock}</span>
                      <button onClick={() => updateStock(p.id, p.stock + 1)} style={stockBtn(t)}>+</button>
                    </div>
                    <div style={{ fontSize: 12, color: t.textMuted, textAlign: 'right' }}>{money(p.cost_price)}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, textAlign: 'right' }}>{money(p.retail_price)}</div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: t.success, background: 'rgba(46,204,113,0.12)', padding: '3px 7px', borderRadius: 999 }}>+{margin.toFixed(0)}%</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      <button onClick={() => setModal(p)} title="Editar" style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', padding: 4 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" /></svg>
                      </button>
                      <button onClick={() => deletePart(p.id)} title="Eliminar" style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', padding: 4 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" /></svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

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
