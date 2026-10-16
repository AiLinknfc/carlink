// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import HelpTip from '../taller/HelpTip'

const tip = () => render(<div><HelpTip label="Razón social" isDark border="#333" muted="#999" textColor="#fff">Es el nombre legal de tu RUT.</HelpTip><button>afuera</button></div>)

describe('HelpTip: botón "?" con ayuda flotante', () => {
  afterEach(() => cleanup())

  it('arranca cerrada y es un botón accesible', () => {
    tip()
    const b = screen.getByRole('button', { name: 'Ayuda: Razón social' })
    expect(b).toHaveTextContent('?')
    expect(b).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('un clic la fija y otro la cierra', () => {
    tip()
    const b = screen.getByRole('button', { name: 'Ayuda: Razón social' })
    fireEvent.click(b)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Es el nombre legal de tu RUT.')
    expect(b).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(b)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('se abre con el mouse encima y se cierra al salir (sin fijarse)', () => {
    tip()
    const b = screen.getByRole('button', { name: 'Ayuda: Razón social' })
    fireEvent.mouseEnter(b.parentElement!)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    fireEvent.mouseLeave(b.parentElement!)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('se abre con el foco del teclado y Escape la cierra', () => {
    tip()
    const b = screen.getByRole('button', { name: 'Ayuda: Razón social' })
    fireEvent.focus(b)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('tocar afuera la cierra', () => {
    tip()
    fireEvent.click(screen.getByRole('button', { name: 'Ayuda: Razón social' }))
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    fireEvent.pointerDown(screen.getByRole('button', { name: 'afuera' }))
    expect(screen.queryByRole('tooltip')).toBeNull()
  })
})
