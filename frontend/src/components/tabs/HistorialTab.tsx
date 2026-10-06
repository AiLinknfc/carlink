'use client'

import { useEffect, useState } from 'react'
import { useMaintenance } from '@/lib/hooks'
import HistoryStack from '@/components/HistoryStack'
import PriorHistoryModal from '@/components/PriorHistoryModal'
import type { MaintenanceRecord } from '@/lib/types'

interface HistorialTabProps {
  vehicleId?: string
  /** created_at del vehículo (límite del historial anterior). */
  vehicleJoinedAt?: string
  onAddService: () => void
  onEditService: (r: MaintenanceRecord) => void
  refreshKey?: number
}

export default function HistorialTab({ vehicleId, vehicleJoinedAt, onAddService, onEditService, refreshKey }: HistorialTabProps) {
  const { records, loading, reload } = useMaintenance(vehicleId)
  const [showPrior, setShowPrior] = useState(false)
  useEffect(() => { if (vehicleId) reload() }, [vehicleId, reload, refreshKey])

  return (
    <div style={{ animation: 'sectionIn .4s both' }}>
      <div style={{ marginBottom: 22, animation: 'textIn .5s .04s both' }}>
        <div style={{ fontSize: 12, letterSpacing: '.24em', textTransform: 'uppercase', fontWeight: 700, color: '#F5C518' }}>
          Bitácora del vehículo
        </div>
        <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 'clamp(24px,2.6vw,32px)', fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.15, margin: '2px 0 4px' }}>
          Historial de mantenimiento
        </h1>
        <p style={{ color: 'var(--text-2)', margin: 0, maxWidth: '60ch', fontSize: 14 }}>
          Registro completo de cada servicio realizado. Consulta fechas, costos y kilometraje de una mirada.
        </p>
      </div>
      {vehicleId && (
        <button type="button" onClick={() => setShowPrior(true)} style={{
          marginBottom: 16, padding: '9px 16px', borderRadius: 999, cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
          border: '1.5px solid rgba(245,197,24,0.45)', background: 'rgba(245,197,24,0.12)', color: '#F5C518',
        }}>
          Cargar historial anterior
        </button>
      )}
      {showPrior && vehicleId && (
        <PriorHistoryModal vehicleId={vehicleId} joinedAt={vehicleJoinedAt} onClose={() => setShowPrior(false)} onSaved={reload} />
      )}
      {!loading && records.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)', fontSize: 14, border: '1px dashed var(--border-2)', borderRadius: 16 }}>
          Aún no hay registros
        </div>
      ) : (
        <HistoryStack records={records} onEdit={onEditService} />
      )}
    </div>
  )
}
