// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import CanalesPanel from '../admin/CanalesPanel'
import { channelsApi } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  channelsApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), provision: vi.fn(), keychains: vi.fn(), markDistributed: vi.fn() },
}))

const C = { bg: '#000', card: '#111', border: '#222', text: '#fff', muted: '#888', accent: '#F5C518' }
const CH = { id: 'c1', name: 'Shopify prueba', kind: 'tienda_propia' as const, notes: '', status: 'active' as const, created_at: '2026-10-02T00:00:00Z', total: 10, distributed: 8, activated: 4 }

describe('CanalesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(channelsApi.list).mockResolvedValue([CH])
    vi.mocked(channelsApi.keychains).mockResolvedValue([])
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })
  afterEach(() => cleanup())

  it('muestra el canal con asignados, enviados, activados y la tasa de activación', async () => {
    render(<CanalesPanel c={C} />)
    expect(await screen.findByText(/Shopify prueba/)).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument() // 4 activados / 8 enviados
  })

  it('no crea un canal con el nombre vacío', async () => {
    render(<CanalesPanel c={C} />)
    await screen.findByText(/Shopify prueba/)
    fireEvent.click(screen.getByRole('button', { name: '+ Crear canal' }))
    fireEvent.click(screen.getByRole('button', { name: 'Crear' }))
    expect(await screen.findByText(/Escribe el nombre del canal/)).toBeInTheDocument()
    expect(channelsApi.create).not.toHaveBeenCalled()
  })

  it('crea el canal y recarga la lista', async () => {
    vi.mocked(channelsApi.create).mockResolvedValue(CH)
    render(<CanalesPanel c={C} />)
    await screen.findByText(/Shopify prueba/)
    fireEvent.click(screen.getByRole('button', { name: '+ Crear canal' }))
    fireEvent.change(screen.getByPlaceholderText('Shopify - prueba 1'), { target: { value: 'Mercado Libre' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear' }))
    await waitFor(() => expect(channelsApi.create).toHaveBeenCalledWith({ name: 'Mercado Libre', kind: 'marketplace', notes: '' }))
    await waitFor(() => expect(channelsApi.list).toHaveBeenCalledTimes(2))
  })

  it('rechaza cantidades fuera de 1-50 al generar llaveros', async () => {
    render(<CanalesPanel c={C} />)
    await screen.findByText(/Shopify prueba/)
    fireEvent.click(screen.getByRole('button', { name: 'Ver lote' }))
    const qty = await screen.findByDisplayValue('5')
    fireEvent.change(qty, { target: { value: '99' } })
    fireEvent.click(screen.getByRole('button', { name: 'Generar llaveros' }))
    expect(await screen.findByText('La cantidad debe estar entre 1 y 50.')).toBeInTheDocument()
    expect(channelsApi.provision).not.toHaveBeenCalled()
  })

  it('genera llaveros y muestra las URL de los chips una sola vez', async () => {
    vi.mocked(channelsApi.provision).mockResolvedValue([{ id: 'k1', tag_uid: 'ch-abc-00', activation_code: 'ABCD-1234', token_url: 'https://x/nfc/tok', qr_url: 'https://x/nfc/q/s' }])
    render(<CanalesPanel c={C} />)
    await screen.findByText(/Shopify prueba/)
    fireEvent.click(screen.getByRole('button', { name: 'Ver lote' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Generar llaveros' }))
    await waitFor(() => expect(channelsApi.provision).toHaveBeenCalledWith('c1', 5, ''))
    expect(await screen.findByText(/no se vuelven a mostrar/)).toBeInTheDocument()
    expect(screen.getByText('ABCD-1234')).toBeInTheDocument()
  })

  it('un canal cerrado no permite generar llaveros', async () => {
    vi.mocked(channelsApi.list).mockResolvedValue([{ ...CH, status: 'closed' }])
    render(<CanalesPanel c={C} />)
    await screen.findByText(/Shopify prueba/)
    fireEvent.click(screen.getByRole('button', { name: 'Ver lote' }))
    await screen.findByText('Sin llaveros todavía.')
    expect(screen.queryByRole('button', { name: 'Generar llaveros' })).toBeNull()
  })
})
