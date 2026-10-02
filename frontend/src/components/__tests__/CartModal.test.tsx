// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import CartModal from '../CartModal'
import { apiPost } from '@/lib/api'
import { openWompiCheckout } from '@/lib/wompi'

vi.mock('@/lib/analytics', () => ({ track: vi.fn() }))
vi.mock('@/lib/metaPixel', () => ({ fbqTrack: vi.fn() }))
vi.mock('@/lib/api', () => ({
  apiGet: vi.fn().mockResolvedValue(null),
  apiPost: vi.fn(),
  analyticsApi: { trackWhatsappClick: vi.fn() },
}))
vi.mock('@/lib/wompi', () => ({ openWompiCheckout: vi.fn() }))
vi.mock('@/components/Plate3D', () => ({ default: () => null }))
// Componentes estables (no crear uno nuevo por render, si no React remonta el árbol).
vi.mock('framer-motion', () => {
  const Stub = ({ children, initial, animate, exit, transition, ...dom }: any) => <div {...dom}>{children}</div>
  return { motion: { div: Stub }, AnimatePresence: ({ children }: any) => <>{children}</> }
})

const CREATED = { order_id: 'o1', reference: 'CL-TEST-1', amount_in_cents: 3990000, currency: 'COP', integrity_signature: 'sig' }

// skipPlateStep: es el flujo de la landing pública (arranca en Envío).
function renderCart() {
  return render(<CartModal isOpen onClose={() => {}} theme="dark" plateText="" plateType="" city="" skipPlateStep />)
}

function fillShipping(over: Partial<Record<'name' | 'email' | 'phone' | 'address' | 'city', string>> = {}) {
  const v = { name: 'Juan Perez', email: 'juan@correo.com', phone: '3001234567', address: 'Cra 7 #45-12', city: 'Bogotá', ...over }
  fireEvent.change(screen.getByPlaceholderText('Juan Pérez'), { target: { value: v.name } })
  fireEvent.change(screen.getByPlaceholderText('correo@ejemplo.com'), { target: { value: v.email } })
  fireEvent.change(screen.getByPlaceholderText('3001234567'), { target: { value: v.phone } })
  fireEvent.change(screen.getByPlaceholderText('Cra 7 #45-12, Apto 301'), { target: { value: v.address } })
  fireEvent.change(screen.getByPlaceholderText('Escribe tu ciudad o pueblo...'), { target: { value: v.city } })
  const opt = screen.queryByRole('button', { name: v.city })
  if (opt) fireEvent.click(opt)
}

const goPayBtn = () => screen.getByRole('button', { name: 'Ir al pago' })

describe('CartModal — paso de envío (validación de campos)', () => {
  beforeEach(() => { vi.clearAllMocks() })
  afterEach(() => cleanup())

  it('el botón se llama "Ir al pago" y arranca deshabilitado', () => {
    renderCart()
    expect(goPayBtn()).toBeDisabled()
  })

  it('se habilita solo con todos los campos válidos', () => {
    renderCart()
    fillShipping()
    expect(goPayBtn()).toBeEnabled()
  })

  it.each([
    ['nombre vacío', { name: '' }],
    ['correo sin dominio', { email: 'juan@correo' }],
    ['celular de 9 dígitos', { phone: '300123456' }],
    ['dirección de menos de 5 caracteres', { address: 'Cra' }],
    ['ciudad vacía', { city: '' }],
  ])('queda deshabilitado con %s', (_l, over) => {
    renderCart()
    fillShipping(over)
    expect(goPayBtn()).toBeDisabled()
  })

  it('el celular solo acepta dígitos y máximo 10', async () => {
    renderCart()
    const phone = screen.getByPlaceholderText('3001234567') as HTMLInputElement
    fireEvent.change(phone, { target: { value: '30a01-23456789999' } })
    await waitFor(() => expect(phone.value).toBe('3001234567'))
  })

  it('muestra los errores de correo y dirección', () => {
    renderCart()
    fillShipping({ email: 'malo', address: 'abc' })
    expect(screen.getByText('Ingresa un correo válido')).toBeInTheDocument()
    expect(screen.getByText('Mínimo 5 caracteres')).toBeInTheDocument()
  })

  it('acepta una ciudad fuera de la lista con "no está en la lista"', () => {
    renderCart()
    fillShipping({ city: 'Pueblito Inventado' })
    expect(goPayBtn()).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /no está en la lista/ }))
    expect(goPayBtn()).toBeEnabled()
  })
})

describe('CartModal — total y pago', () => {
  beforeEach(() => { vi.clearAllMocks() })
  afterEach(() => cleanup())

  it('el total mostrado es $39.900 y el botón dice Pagar con ese valor', () => {
    renderCart()
    fillShipping()
    fireEvent.click(goPayBtn())
    expect(screen.getAllByText(/39\.900/).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Pagar .*39\.900/ })).toBeInTheDocument()
    expect(screen.queryByText(/29\.900|49\.900/)).toBeNull()
  })

  it('crea la orden sin mandar precio y abre Wompi con el monto del backend', async () => {
    vi.mocked(apiPost).mockResolvedValueOnce(CREATED)
    vi.mocked(openWompiCheckout).mockResolvedValueOnce(undefined) // cierra el widget sin pagar
    renderCart()
    fillShipping()
    fireEvent.click(goPayBtn())
    fireEvent.click(screen.getByRole('button', { name: /Pagar/ }))
    await waitFor(() => expect(openWompiCheckout).toHaveBeenCalled())
    const [path, body] = vi.mocked(apiPost).mock.calls[0] as [string, Record<string, unknown>]
    expect(path).toBe('/shop/orders')
    expect(body).toMatchObject({ quantity: 1, customer_email: 'juan@correo.com', customer_phone: '3001234567', shipping_city: 'Bogotá', payment_method: 'wompi' })
    expect(body).not.toHaveProperty('amount')
    expect(body).not.toHaveProperty('price')
    expect(vi.mocked(openWompiCheckout).mock.calls[0][0]).toMatchObject({ reference: 'CL-TEST-1', amountInCents: 3990000 })
  })

  it('pago aprobado muestra la pantalla final', async () => {
    vi.mocked(apiPost).mockResolvedValueOnce(CREATED).mockResolvedValueOnce({ status: 'approved' })
    vi.mocked(openWompiCheckout).mockResolvedValueOnce({ id: 'tx1' } as never)
    renderCart()
    fillShipping()
    fireEvent.click(goPayBtn())
    fireEvent.click(screen.getByRole('button', { name: /Pagar/ }))
    expect(await screen.findByText('Pago confirmado')).toBeInTheDocument()
    // El código llega por correo; WhatsApp es solo un enlace discreto de respaldo, no un botón principal.
    expect(screen.getByText('juan@correo.com')).toBeInTheDocument()
    expect(screen.queryByText('Recibir mi código de activación por WhatsApp')).toBeNull()
    expect(screen.getByRole('link', { name: 'Escríbenos por WhatsApp' })).toHaveAttribute('href', expect.stringContaining('CL-TEST-1'))
    expect(vi.mocked(apiPost).mock.calls[1][0]).toBe('/shop/orders/CL-TEST-1/confirm')
  })

  it('pago rechazado muestra el error y no avanza', async () => {
    vi.mocked(apiPost).mockResolvedValueOnce(CREATED).mockResolvedValueOnce({ status: 'declined' })
    vi.mocked(openWompiCheckout).mockResolvedValueOnce({ id: 'tx1' } as never)
    renderCart()
    fillShipping()
    fireEvent.click(goPayBtn())
    fireEvent.click(screen.getByRole('button', { name: /Pagar/ }))
    expect(await screen.findByText(/no se pudo procesar/)).toBeInTheDocument()
    expect(screen.queryByText('Pago confirmado')).toBeNull()
  })

  it('no ofrece coordinar el pago por WhatsApp y siempre crea la orden como wompi', async () => {
    vi.mocked(apiPost).mockResolvedValueOnce(CREATED)
    vi.mocked(openWompiCheckout).mockResolvedValueOnce(undefined)
    renderCart()
    fillShipping()
    fireEvent.click(goPayBtn())
    expect(screen.queryByText(/Coordinar pago por WhatsApp/)).toBeNull()
    expect(screen.queryByText(/Continuar por WhatsApp/)).toBeNull()
    expect(screen.getByText('Tarjeta, Nequi, PSE o Bancolombia')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Pagar/ }))
    await waitFor(() => expect(apiPost).toHaveBeenCalled())
    expect(vi.mocked(apiPost).mock.calls[0][1]).toMatchObject({ payment_method: 'wompi' })
  })

  it('si falla la creación de la orden muestra el error y no abre Wompi', async () => {
    vi.mocked(apiPost).mockRejectedValueOnce(new Error('500'))
    renderCart()
    fillShipping()
    fireEvent.click(goPayBtn())
    fireEvent.click(screen.getByRole('button', { name: /Pagar/ }))
    expect(await screen.findByText(/No pudimos conectar/)).toBeInTheDocument()
    expect(openWompiCheckout).not.toHaveBeenCalled()
  })
})
