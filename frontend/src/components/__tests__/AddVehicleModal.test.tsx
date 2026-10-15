// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import AddVehicleModal from '../AddVehicleModal'

vi.mock('@/lib/api', () => ({ apiGet: vi.fn().mockResolvedValue(null), apiPost: vi.fn() }))

afterEach(cleanup)

const open = () => render(<AddVehicleModal onClose={() => {}} isFirstVehicle isBusinessAccount={false} onCreated={() => {}} />)

describe('Agregar vehiculo: combustible y kilometraje', () => {
  it('ya no pide el combustible (se completa luego en el panel lateral)', () => {
    open()
    expect(screen.queryByText(/combustible/i)).toBeNull()
  })

  it('al enfocar el kilometraje el aviso de cuidado se resalta y al salir vuelve a reposo', () => {
    open()
    const input = screen.getByPlaceholderText('Ej. 52000')
    const note = screen.getByRole('note')
    expect(note).toHaveAttribute('data-active', 'false')
    fireEvent.focus(input)
    expect(note).toHaveAttribute('data-active', 'true')
    fireEvent.blur(input)
    expect(note).toHaveAttribute('data-active', 'false')
  })
})
