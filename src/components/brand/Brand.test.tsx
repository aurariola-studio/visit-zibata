// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Brand } from './Brand.tsx'

describe('Brand', () => {
  it('separa el nombre del lema para los lectores de pantalla', () => {
    render(<Brand />)
    // Sin la coma oculta, NVDA leía "ZibatáCOMER Y BEBER" de corrido.
    expect(screen.getByText(/Zibatá/).closest('p')?.textContent).toBe('Zibatá, Comer y beber')
  })

  it('en modo compacto solo muestra el símbolo', () => {
    render(<Brand compact />)
    expect(screen.queryByText(/Comer y beber/)).toBeNull()
  })
})
