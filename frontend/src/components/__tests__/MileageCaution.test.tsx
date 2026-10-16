// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { describe, it, expect } from 'vitest'
import MileageCaution from '../MileageCaution'

afterEach(cleanup)

describe('MileageCaution', () => {
  it('muestra el aviso de precaucion siempre', () => {
    render(<MileageCaution active={false} />)
    expect(screen.getByRole('note').textContent).toContain('Ten cuidado con este dato')
  })

  it('se marca activo al enfocar el campo (dispara el resalte)', () => {
    const { rerender } = render(<MileageCaution active={false} />)
    expect(screen.getByRole('note').getAttribute('data-active')).toBe('false')
    rerender(<MileageCaution active />)
    expect(screen.getByRole('note').getAttribute('data-active')).toBe('true')
  })
})
