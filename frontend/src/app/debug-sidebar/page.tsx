'use client'
import Sidebar from '@/components/Sidebar'

export default function DebugSidebar() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0b0e' }}>
      <Sidebar
        activeTab="ficha"
        onTabChange={() => {}}
        vehicle={{ modelo: 'Mazda 3', anio: 2021, tipo: 'Particular', color: 'Rojo' }}
        plateText="GHK-472"
        city="Bogotá D.C."
        vehicleLoading={false}
        theme="dark"
      />
    </div>
  )
}
