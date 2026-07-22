'use client'

import { useEffect } from 'react'
import { useMaintenance } from '@/lib/hooks'
import HistoryStack from '@/components/HistoryStack'
import type { MaintenanceRecord } from '@/lib/types'

interface HistorialTabProps {
  vehicleId?: string
  onAddService: () => void
  onEditService: (r: MaintenanceRecord) => void
  refreshKey?: number
}

export default function HistorialTab({ vehicleId, onAddService, onEditService, refreshKey }: HistorialTabProps) {
  const { records, loading, reload } = useMaintenance(vehicleId)
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
