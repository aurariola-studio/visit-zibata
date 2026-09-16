// @vitest-environment jsdom
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makePlace } from '../../test/fixtures.ts'
import { renderWithCatalog } from '../../test/render.tsx'
import { PlaceCard } from './PlaceCard.tsx'

const allDay = {
  mon: ['00:00-24:00'],
  tue: ['00:00-24:00'],
  wed: ['00:00-24:00'],
  thu: ['00:00-24:00'],
  fri: ['00:00-24:00'],
  sat: ['00:00-24:00'],
  sun: ['00:00-24:00'],
}

describe('PlaceCard', () => {
  beforeEach(() => window.localStorage.clear())

  it('muestra nombre, categoría y número de local', async () => {
    const place = makePlace({
      id: 'trigo',
      plazaId: 'plaza-sur',
      name: 'Trigo',
      category: 'desayunos-y-cafe',
      localNumber: '12',
    })
    await renderWithCatalog(<PlaceCard place={place} onOpen={vi.fn()} />)
    expect(screen.getByText('Trigo')).toBeInTheDocument()
    expect(screen.getByText('Desayunos y café')).toBeInTheDocument()
    expect(screen.getByText(/Local 12/)).toBeInTheDocument()
  })

  it('usa la subcategoría y la plaza cuando corresponde', async () => {
    const place = makePlace({
      id: 'trigo',
      plazaId: 'plaza-sur',
      name: 'Trigo',
      category: 'desayunos-y-cafe',
      subcategory: 'panaderia',
    })
    await renderWithCatalog(<PlaceCard place={place} onOpen={vi.fn()} showPlaza />)
    expect(screen.getByText('Panadería')).toBeInTheDocument()
    expect(screen.getByText(/Plaza Sur/)).toBeInTheDocument()
  })

  it('solo muestra el estado de horario si hay horario', async () => {
    const withoutHours = makePlace({ id: 'a', plazaId: 'plaza-norte', name: 'Sin horario' })
    const { unmount } = await renderWithCatalog(<PlaceCard place={withoutHours} onOpen={vi.fn()} />)
    expect(screen.queryByText('Abierto')).not.toBeInTheDocument()
    expect(screen.queryByText('Cerrado')).not.toBeInTheDocument()
    unmount()

    const withHours = makePlace({
      id: 'b',
      plazaId: 'plaza-norte',
      name: 'Con horario',
      hours: allDay,
    })
    await renderWithCatalog(<PlaceCard place={withHours} onOpen={vi.fn()} />)
    expect(screen.getByText('Abierto')).toBeInTheDocument()
  })

  it('abre el detalle al pulsar la tarjeta', async () => {
    const onOpen = vi.fn()
    const place = makePlace({ id: 'x', plazaId: 'plaza-norte', name: 'Pizzería Norte' })
    await renderWithCatalog(<PlaceCard place={place} onOpen={onOpen} />)
    await userEvent.click(screen.getByRole('button', { name: 'Ver detalles de Pizzería Norte' }))
    expect(onOpen).toHaveBeenCalledWith(place)
  })

  it('guarda y quita favoritos en este dispositivo', async () => {
    const place = makePlace({ id: 'x', plazaId: 'plaza-norte', name: 'Pizzería Norte' })
    await renderWithCatalog(<PlaceCard place={place} onOpen={vi.fn()} />)
    const favorite = screen.getByRole('button', { name: /Guardar en favoritos: Pizzería Norte/ })
    expect(favorite).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(favorite)
    expect(screen.getByRole('button', { name: /Quitar de favoritos/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(JSON.parse(window.localStorage.getItem('zibata:favoritos') ?? '[]')).toEqual(['x'])
    await userEvent.click(screen.getByRole('button', { name: /Quitar de favoritos/ }))
    expect(JSON.parse(window.localStorage.getItem('zibata:favoritos') ?? '[]')).toEqual([])
  })
})
