// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { categoriesFixture, plazasFixture } from '../../test/fixtures.ts'
import { FilterBar } from './FilterBar.tsx'

function setup(overrides: Partial<ComponentProps<typeof FilterBar>> = {}) {
  const props: ComponentProps<typeof FilterBar> = {
    categories: categoriesFixture,
    categoryCounts: new Map([
      ['desayunos-y-cafe', 2],
      ['tacos-y-antojitos', 1],
      ['pizza', 1],
    ]),
    totalCount: 4,
    activeCategoryId: null,
    onCategoryChange: vi.fn(),
    plazas: plazasFixture,
    selectedPlazaId: null,
    onPlazaChange: vi.fn(),
    favoritesCount: 0,
    favoritesOnly: false,
    onToggleFavorites: vi.fn(),
    filtersActive: false,
    resultCount: 4,
    onClear: vi.fn(),
    ...overrides,
  }
  render(<FilterBar {...props} />)
  return props
}

describe('FilterBar', () => {
  it('muestra categorías con su conteo y "Todo" activo por defecto', () => {
    setup()
    const chips = screen.getByRole('list', { name: 'Categorías' })
    expect(chips).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Todo/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Desayunos y café/ })).toHaveTextContent('2')
  })

  it('selecciona una categoría y al volver a pulsarla la quita', async () => {
    const props = setup()
    await userEvent.click(screen.getByRole('button', { name: /Pizza/ }))
    expect(props.onCategoryChange).toHaveBeenCalledWith('pizza')

    const active = setup({ activeCategoryId: 'pizza' })
    const [, pizzaActive] = screen.getAllByRole('button', { name: /Pizza/ })
    expect(pizzaActive).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(pizzaActive as HTMLElement)
    expect(active.onCategoryChange).toHaveBeenCalledWith(null)
  })

  it('filtra por plaza con un selector nativo', async () => {
    const props = setup()
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Plaza' }), 'Plaza Sur')
    expect(props.onPlazaChange).toHaveBeenCalledWith('plaza-sur')
  })

  it('con filtros activos muestra resultados y permite limpiarlos', async () => {
    const props = setup({ filtersActive: true, resultCount: 1, activeCategoryId: 'pizza' })
    expect(screen.getByText('1 resultado')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(props.onClear).toHaveBeenCalled()
  })

  it('oculta "Limpiar filtros" y favoritos cuando no aplican', () => {
    setup()
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Favoritos/ })).not.toBeInTheDocument()
  })

  it('muestra el filtro de favoritos cuando hay alguno guardado', async () => {
    const props = setup({ favoritesCount: 2 })
    await userEvent.click(screen.getByRole('button', { name: /Favoritos/ }))
    expect(props.onToggleFavorites).toHaveBeenCalled()
  })
})
