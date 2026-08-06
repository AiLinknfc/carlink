'use client'

import { useState } from 'react'
import { useWorkshopClients, useWorkshopVehicles } from '@/lib/hooks'
import type { WorkshopClient, WorkshopVehicle } from '@/lib/types'
import AdminModal from '@/components/admin/AdminModal'
import { negocioTokens, inputStyle, labelStyle, primaryBtnStyle, ghostBtnStyle, emptyState } from './shared'

export default function ClientesModule({ theme }: { theme: 'light' | 'dark' }) {
  const t = negocioTokens(theme)
  const [q, setQ] = useState('')
  const { clients, loading, addClient, updateClient, deleteClient } = useWorkshopClients(q)
  const [selected, setSelected] = useState<WorkshopClient | null>(null)
  const [clientModal, setClientModal] = useState<WorkshopClient | null | 'new'>(null)
  const [vehicleModal, setVehicleModal] = useState<WorkshopVehicle | null | 'new'>(null)

  return (
    <div style={{ animation: 'sectionIn .4s both' }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Buscar por nombre, teléfono, email o documento…"
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ ...inputStyle(t), maxWidth: 360 }}
        />
        <button onClick={() => setClientModal('new')} style={primaryBtnStyle(t)}>+ Nuevo cliente</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) 1.4fr', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!loading && clients.length === 0 && <div style={emptyState(t, 'Sin clientes registrados')} />}
          {clients.map(c => (
            <div
              key={c.id}
              onClick={() => setSelected(c)}
              style={{
                padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
                background: selected?.id === c.id ? 'rgba(245,197,24,0.1)' : t.cardBg,
                border: `1px solid ${selected?.id === c.id ? t.gold : t.subtleBorder}`,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14, color: t.textPrimary }}>{c.name}</div>
              <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>{c.phone || c.email || 'Sin contacto'}</div>
            </div>
          ))}
        </div>

        <div>
          {!selected ? (
            <div style={emptyState(t, 'Selecciona un cliente para ver sus datos y vehículos')} />
          ) : (
            <ClientDetail
              t={t}
              client={selected}
              onEdit={() => setClientModal(selected)}
              onDelete={async () => { await deleteClient(selected.id); setSelected(null) }}
              onAddVehicle={() => setVehicleModal('new')}
              onEditVehicle={v => setVehicleModal(v)}
            />
          )}
        </div>
      </div>

      {clientModal && (
        <ClientFormModal
          t={t}
          theme={theme}
          client={clientModal === 'new' ? null : clientModal}
          onClose={() => setClientModal(null)}
          onSave={async (data) => {
            const result = clientModal === 'new' ? await addClient(data) : await updateClient(clientModal.id, data)
            if (result && clientModal !== 'new') setSelected(result)
            setClientModal(null)
          }}
        />
      )}

      {vehicleModal && selected && (
        <VehicleFormModal
          t={t}
          theme={theme}
          clientId={selected.id}
          vehicle={vehicleModal === 'new' ? null : vehicleModal}
          onClose={() => setVehicleModal(null)}
        />
      )}
    </div>
  )
}

function ClientDetail({ t, client, onEdit, onDelete, onAddVehicle, onEditVehicle }: {
  t: ReturnType<typeof negocioTokens>
  client: WorkshopClient
  onEdit: () => void
  onDelete: () => void
  onAddVehicle: () => void
  onEditVehicle: (v: WorkshopVehicle) => void
}) {
  const { vehicles, loading, deleteVehicle, linkVehicle, unlinkVehicle } = useWorkshopVehicles({ clientId: client.id })
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)

  // Vincular con la cuenta CarLink real del cliente (por placa exacta) —
  // sin esto, las facturas/historial automáticos (Paso 1-2) no tienen a
  // quién llegarle. docs/PLAN_FACTURACION_AUTOMATICA.md Paso 3.
  const handleLink = async (v: WorkshopVehicle) => {
    setLinkingId(v.id)
    setLinkError(null)
    const result = await linkVehicle(v.id)
    setLinkingId(null)
    if (!result) setLinkError(v.id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ padding: 18, borderRadius: 16, background: t.cardBg, border: `1px solid ${t.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: t.textPrimary }}>{client.name}</div>
            <div style={{ fontSize: 13, color: t.textMuted, marginTop: 4 }}>
              {client.phone && <span>{client.phone}</span>}
              {client.email && <span> · {client.email}</span>}
              {client.document_id && <span> · {client.document_id}</span>}
            </div>
            {client.address && <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>{client.address}</div>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onEdit} style={ghostBtnStyle(t)}>Editar</button>
            <button onClick={onDelete} style={{ ...ghostBtnStyle(t), color: t.danger, borderColor: 'rgba(255,77,106,0.3)' }}>Eliminar</button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: t.gold, fontWeight: 700 }}>Vehículos</div>
        <button onClick={onAddVehicle} style={{ ...ghostBtnStyle(t), padding: '7px 14px', fontSize: 12.5 }}>+ Agregar vehículo</button>
      </div>

      {!loading && vehicles.length === 0 && <div style={emptyState(t, 'Este cliente no tiene vehículos registrados')} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {vehicles.map(v => (
          <div key={v.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px',
            borderRadius: 12, background: t.cardBg, border: `1px solid ${t.subtleBorder}`,
          }}>
            <div onClick={() => onEditVehicle(v)} style={{ cursor: 'pointer' }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: t.textPrimary }}>{v.license_plate}</div>
              <div style={{ fontSize: 12, color: t.textMuted }}>{[v.brand, v.model, v.year].filter(Boolean).join(' ') || '—'}</div>
              {linkError === v.id && <div style={{ fontSize: 11, color: t.danger, marginTop: 3 }}>Ninguna cuenta CarLink tiene esta placa</div>}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {v.linked_vehicle_id ? (
                <button onClick={() => unlinkVehicle(v.id)} title="Desvincular de la cuenta CarLink" style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, cursor: 'pointer',
                  background: 'rgba(46,204,113,0.12)', color: t.success, border: 'none',
                }}>CarLink ✓</button>
              ) : (
                <button onClick={() => handleLink(v)} disabled={linkingId === v.id} title="Buscar una cuenta CarLink con esta placa y vincularla" style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, cursor: linkingId === v.id ? 'default' : 'pointer',
                  background: 'transparent', color: t.textMuted, border: `1px dashed ${t.subtleBorder}`,
                }}>{linkingId === v.id ? 'Buscando…' : 'Vincular'}</button>
              )}
              <button onClick={() => deleteVehicle(v.id)} style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', padding: 4 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" /></svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ClientFormModal({ t, theme, client, onClose, onSave }: {
  t: ReturnType<typeof negocioTokens>
  theme: 'light' | 'dark'
  client: WorkshopClient | null
  onClose: () => void
  onSave: (data: { name: string; phone: string; email: string; address: string; document_id: string }) => void
}) {
  const [name, setName] = useState(client?.name || '')
  const [phone, setPhone] = useState(client?.phone || '')
  const [email, setEmail] = useState(client?.email || '')
  const [address, setAddress] = useState(client?.address || '')
  const [documentId, setDocumentId] = useState(client?.document_id || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    await onSave({ name: name.trim(), phone, email, address, document_id: documentId })
    setSaving(false)
  }

  return (
    <AdminModal isOpen onClose={onClose} title={client ? 'Editar cliente' : 'Nuevo cliente'} theme={theme} maxWidth={440}
      footer={<>
        <button onClick={onClose} style={ghostBtnStyle(t)}>Cancelar</button>
        <button onClick={save} disabled={saving || !name.trim()} style={primaryBtnStyle(t, saving || !name.trim())}>{saving ? 'Guardando…' : 'Guardar'}</button>
      </>}>
      <div><label style={labelStyle(t)}>Nombre</label><input style={inputStyle(t)} value={name} onChange={e => setName(e.target.value)} /></div>
      <div><label style={labelStyle(t)}>Teléfono</label><input style={inputStyle(t)} value={phone} onChange={e => setPhone(e.target.value)} /></div>
      <div><label style={labelStyle(t)}>Email</label><input style={inputStyle(t)} value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div><label style={labelStyle(t)}>Documento</label><input style={inputStyle(t)} value={documentId} onChange={e => setDocumentId(e.target.value)} /></div>
      <div><label style={labelStyle(t)}>Dirección</label><input style={inputStyle(t)} value={address} onChange={e => setAddress(e.target.value)} /></div>
    </AdminModal>
  )
}

function VehicleFormModal({ t, theme, clientId, vehicle, onClose }: {
  t: ReturnType<typeof negocioTokens>
  theme: 'light' | 'dark'
  clientId: string
  vehicle: WorkshopVehicle | null
  onClose: () => void
}) {
  const { addVehicle, updateVehicle } = useWorkshopVehicles({ clientId })
  const [plate, setPlate] = useState(vehicle?.license_plate || '')
  const [brand, setBrand] = useState(vehicle?.brand || '')
  const [model, setModel] = useState(vehicle?.model || '')
  const [year, setYear] = useState(vehicle?.year?.toString() || '')
  const [color, setColor] = useState(vehicle?.color || '')
  const [mileage, setMileage] = useState(vehicle?.mileage?.toString() || '0')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!plate.trim()) return
    setSaving(true)
    if (vehicle) {
      await updateVehicle(vehicle.id, { license_plate: plate, brand, model, year: year ? Number(year) : undefined, color, mileage: Number(mileage) || 0 })
    } else {
      await addVehicle({ client_id: clientId, license_plate: plate, brand, model, year: year ? Number(year) : undefined, color, mileage: Number(mileage) || 0 })
    }
    setSaving(false)
    onClose()
  }

  return (
    <AdminModal isOpen onClose={onClose} title={vehicle ? 'Editar vehículo' : 'Nuevo vehículo'} theme={theme} maxWidth={440}
      footer={<>
        <button onClick={onClose} style={ghostBtnStyle(t)}>Cancelar</button>
        <button onClick={save} disabled={saving || !plate.trim()} style={primaryBtnStyle(t, saving || !plate.trim())}>{saving ? 'Guardando…' : 'Guardar'}</button>
      </>}>
      <div><label style={labelStyle(t)}>Placa</label><input style={inputStyle(t)} value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div><label style={labelStyle(t)}>Marca</label><input style={inputStyle(t)} value={brand} onChange={e => setBrand(e.target.value)} /></div>
        <div><label style={labelStyle(t)}>Modelo</label><input style={inputStyle(t)} value={model} onChange={e => setModel(e.target.value)} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div><label style={labelStyle(t)}>Año</label><input type="number" style={inputStyle(t)} value={year} onChange={e => setYear(e.target.value)} /></div>
        <div><label style={labelStyle(t)}>Color</label><input style={inputStyle(t)} value={color} onChange={e => setColor(e.target.value)} /></div>
      </div>
      <div><label style={labelStyle(t)}>Kilometraje</label><input type="number" style={inputStyle(t)} value={mileage} onChange={e => setMileage(e.target.value)} /></div>
    </AdminModal>
  )
}
