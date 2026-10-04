// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { InfoDialog } from './InfoDialog.tsx'

describe('InfoDialog', () => {
  it('muestra una sola página y lleva a las otras dos', async () => {
    const onGoTo = vi.fn()
    render(<InfoDialog topic="privacidad" onClose={vi.fn()} onGoTo={onGoTo} />)

    expect(screen.getByRole('dialog', { name: 'Privacidad' })).toBeInTheDocument()
    expect(screen.getByText(/no usa cuentas, analítica ni cookies/)).toBeInTheDocument()
    expect(screen.getByText(/únicamente en este navegador/)).toBeInTheDocument()
    // Las otras páginas no se amontonan aquí: son enlaces a su propia ruta.
    expect(screen.queryByText(/OpenStreetMap/)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Sugiere un cambio' }))
    expect(onGoTo).toHaveBeenCalledWith('sugerir')
  })

  it('la página "Acerca" incluye créditos, versión y firma, y ningún enlace muerto', () => {
    render(<InfoDialog topic="acerca" onClose={vi.fn()} onGoTo={vi.fn()} />)
    expect(screen.getByText(/OpenStreetMap/)).toBeInTheDocument()
    expect(screen.getByText(/Versión/)).toBeInTheDocument()
    // El único enlace es la firma de autoría, y apunta a algún sitio: sin canal de contacto
    // abierto, cualquier otro enlace aquí sería un enlace muerto.
    const enlaces = screen.getAllByRole('link')
    expect(enlaces).toHaveLength(1)
    expect(enlaces[0]).toHaveAttribute('href', 'https://aurariola.com')
  })

  it('se cierra con Escape', async () => {
    const onClose = vi.fn()
    render(<InfoDialog topic="sugerir" onClose={onClose} onGoTo={vi.fn()} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})
