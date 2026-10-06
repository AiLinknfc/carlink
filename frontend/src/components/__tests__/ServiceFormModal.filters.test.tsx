// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import ServiceFormModal from '../ServiceFormModal'

vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } } }))
vi.mock('@/lib/api', () => ({ apiGet: vi.fn().mockResolvedValue(null), apiPost: vi.fn(), apiPut: vi.fn() }))

afterEach(cleanup)

const open = (props: Record<string, any> = {}) =>
  render(<ServiceFormModal vehicleId="v1" defaultServiceType="Aire" hideServiceType onClose={() => {}} onSaved={() => {}} {...props} />)

const radios = () => screen.getAllByRole('radio').map(r => r.textContent || '')

describe('Registrar servicio > Filtros (paso 1)', () => {
  it('carro: ofrece aceite, aire, habitáculo, combustible y transmisión', () => {
    open({ vehicleBodyType: 'Sedán', vehiclePlateType: 'particular', fuelType: 'gasolina' })
    const labels = radios().join(' | ')
    for (const l of ['Aceite', 'Aire del motor', 'Habitáculo / A/C', 'Combustible', 'Transmisión']) expect(labels).toContain(l)
    expect(labels).not.toContain('Partículas')
  })

  it('moto: solo aceite, aire y combustible, detectado sin que el usuario lo elija', () => {
    open({ vehicleBodyType: 'Auto', vehiclePlateType: 'Moto', fuelType: 'gasolina' }) // caso real: body_type quedó en "Auto"
    expect(radios()).toHaveLength(3)
    expect(radios().join(' | ')).not.toContain('Habitáculo')
  })

  it('la selección es exclusiva', () => {
    open({ vehicleBodyType: 'Sedán', vehiclePlateType: 'particular' })
    const [oil, air] = screen.getAllByRole('radio')
    fireEvent.click(oil)
    expect(oil).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(air)
    expect(air).toHaveAttribute('aria-checked', 'true')
    expect(oil).toHaveAttribute('aria-checked', 'false')
    expect(screen.getAllByRole('radio').filter(r => r.getAttribute('aria-checked') === 'true')).toHaveLength(1)
  })

  it('"Flujo de aire verificado" solo aparece con el filtro de aire', () => {
    open({ vehicleBodyType: 'Sedán', vehiclePlateType: 'particular' })
    expect(screen.queryByText(/Flujo de aire verificado/)).toBeNull()
    fireEvent.click(screen.getAllByRole('radio')[1])
    expect(screen.getByText(/Flujo de aire verificado/)).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('radio')[0])
    expect(screen.queryByText(/Flujo de aire verificado/)).toBeNull()
  })

  it('al elegir un filtro aparecen marca y referencia opcionales en el mismo paso (sin pasos nuevos)', () => {
    open({ vehicleBodyType: 'Sedán', vehiclePlateType: 'particular' })
    expect(screen.queryByPlaceholderText('Ej. C 25 114')).toBeNull()
    fireEvent.click(screen.getAllByRole('radio')[1])
    expect(screen.getByPlaceholderText('Ej. C 25 114')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ej. Mann-Filter')).toBeInTheDocument()
    expect(screen.getByText(/Paso 1 de 3/)).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('Ej. C 25 114'), { target: { value: 'C 25 114' } })
    fireEvent.click(screen.getAllByRole('radio')[2]) // otro filtro: se limpia la referencia
    expect((screen.getByPlaceholderText('Ej. C 25 114') as HTMLInputElement).value).toBe('')
  })
})


describe('Registrar servicio > Batería (wizard de 4 pasos)', () => {
  const openBattery = (props: Record<string, any> = {}) =>
    render(<ServiceFormModal vehicleId="v1" defaultServiceType="Batería" hideServiceType onClose={() => {}} onSaved={() => {}} {...props} />)
  const next = () => fireEvent.click(screen.getByText('Siguiente'))

  it('abierto desde Inicio, que manda el id sin tilde "Bateria", muestra el wizard de batería', () => {
    openBattery({ defaultServiceType: 'Bateria', vehicleBodyType: 'Sedán', vehiclePlateType: 'particular' })
    expect(screen.getByText(/Paso 1 de 4/)).toBeInTheDocument()
    expect(radios().join(' | ')).toContain('AGM / EFB')
  })

  it('carro: ofrece MF, convencional, AGM/EFB e híbrido/eléctrico; moto: MF/AGM, convencional y litio; camión: 12/24 V', () => {
    openBattery({ vehicleBodyType: 'Sedán', vehiclePlateType: 'particular' })
    const t = radios().join(' | ')
    for (const l of ['Sin mantenimiento (MF)', 'Convencional', 'AGM / EFB', 'Híbrido / eléctrico']) expect(t).toContain(l)
    cleanup()
    openBattery({ vehicleBodyType: 'Auto', vehiclePlateType: 'Moto' })
    expect(radios().join(' | ')).toContain('Litio')
    expect(radios().join(' | ')).not.toContain('AGM / EFB')
    cleanup()
    openBattery({ vehicleBodyType: 'Camión', vehiclePlateType: 'carga' })
    expect(radios().join(' | ')).toContain('12 V / 24 V')
  })

  it('tiene 4 pasos: tipo → medición → datos generales → confirmar, y no avanza sin elegir el tipo', () => {
    openBattery({ vehicleBodyType: 'Sedán', vehiclePlateType: 'particular' })
    expect(screen.getByText(/Paso 1 de 4/)).toBeInTheDocument()
    next()
    expect(screen.getByText(/Elige el tipo de batería/)).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('radio')[2]) // AGM / EFB
    next()
    expect(screen.getByText(/Paso 2 de 4/)).toBeInTheDocument()
    expect(screen.getByText('Cambié la batería')).toBeInTheDocument()
    expect(screen.getByText('Solo la revisé')).toBeInTheDocument()
  })

  it('el voltaje se interpreta y uno imposible bloquea el paso', () => {
    openBattery({ vehicleBodyType: 'Sedán', vehiclePlateType: 'particular' })
    fireEvent.click(screen.getAllByRole('radio')[0]); next()
    const input = screen.getByPlaceholderText('Ej. 12.6')
    fireEvent.change(input, { target: { value: '12.7' } })
    expect(screen.getByText('Carga completa')).toBeInTheDocument()
    fireEvent.change(input, { target: { value: '11.5' } })
    expect(screen.getByText('Descargada')).toBeInTheDocument()
    fireEvent.change(input, { target: { value: '99' } })
    next()
    expect(screen.getByText(/El voltaje no es válido/)).toBeInTheDocument()
    expect(screen.getByText(/Paso 2 de 4/)).toBeInTheDocument()
  })
})


describe('Registrar servicio > Aceite (primer paso: tipo de lubricante)', () => {
  const openOil = (props: Record<string, any> = {}) =>
    render(<ServiceFormModal vehicleId="v1" defaultServiceType="Aceite" hideServiceType onClose={() => {}} onSaved={() => {}} {...props} />)
  const next = () => fireEvent.click(screen.getByText('Siguiente'))

  it('el paso 1 pregunta si el lubricante es de motor, caja o transmisión (4 pasos en total)', () => {
    openOil({ vehicleBodyType: 'Sedán', vehiclePlateType: 'particular' })
    expect(screen.getByText(/Paso 1 de 4/)).toBeInTheDocument()
    const t = radios().join(' | ')
    for (const l of ['Motor', 'Caja de cambios', 'Transmisión']) expect(t).toContain(l)
  })

  it('la moto también ofrece transmisión (scooter o moto automática)', () => {
    openOil({ vehicleBodyType: 'Moto', vehiclePlateType: 'Moto' })
    expect(radios().join(' | ')).toContain('Transmisión')
  })

  it('motor (por defecto) lleva a la pasarela de marcas y viscosidad', () => {
    openOil({ vehicleBodyType: 'Sedán', vehiclePlateType: 'particular' })
    next()
    expect(screen.getByText(/Paso 2 de 4/)).toBeInTheDocument()
    expect(screen.getByLabelText('Buscar marca de aceite')).toBeInTheDocument()
  })

  it('caja pide marca, viscosidad de valvulina y norma; no avanza sin marca y viscosidad', () => {
    openOil({ vehicleBodyType: 'Sedán', vehiclePlateType: 'particular' })
    fireEvent.click(screen.getAllByRole('radio')[1]) // Caja de cambios
    next()
    expect(screen.queryByLabelText('Buscar marca de aceite')).toBeNull()
    expect(screen.getByText('75W-90')).toBeInTheDocument()
    expect(screen.getByText('API GL-5')).toBeInTheDocument()
    next()
    expect(screen.getByText(/Indica el aceite utilizado/)).toBeInTheDocument()
    expect(screen.getByText(/Paso 2 de 4/)).toBeInTheDocument()
  })

  it('transmisión pide el tipo de fluido (ATF, CVT, DCT...)', () => {
    openOil({ vehicleBodyType: 'Sedán', vehiclePlateType: 'particular' })
    fireEvent.click(screen.getAllByRole('radio')[2]) // Transmisión
    next()
    for (const l of ['ATF Dexron VI', 'CVT', 'DCT / DSG']) expect(screen.getByText(l)).toBeInTheDocument()
    next()
    expect(screen.getByText(/Indica el lubricante utilizado/)).toBeInTheDocument()
  })

  it('cambiar de caso borra los datos del anterior', () => {
    openOil({ vehicleBodyType: 'Sedán', vehiclePlateType: 'particular' })
    fireEvent.click(screen.getAllByRole('radio')[1]); next()
    fireEvent.click(screen.getByText('75W-90'))
    expect(screen.getByText('75W-90').getAttribute('aria-checked')).toBe('true')
    fireEvent.click(screen.getByText('Atrás'))
    fireEvent.click(screen.getAllByRole('radio')[2]); next()
    expect(screen.queryByText('75W-90')).toBeNull()
  })
})
