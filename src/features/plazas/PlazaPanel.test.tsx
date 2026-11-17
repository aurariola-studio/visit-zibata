// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  catalogFixture,
  categoriesFixture,
  placesFixture,
  plazasFixture,
} from '../../test/fixtures.ts'
import { InMemoryPlacesRepository, renderWithCatalog } from '../../test/render.tsx'
import { countByCategory } from '../filters/filters.ts'
import { PlazaPanel } from './PlazaPanel.tsx'

const catalog = catalogFixture()
const plaza = plazasFixture[0] as (typeof plazasFixture)[number]
const plazaPlaces = placesFixture.filter((place) => place.plazaId === plaza.id && place.active)

async function setup(overrides: Partial<Parameters<typeof PlazaPanel>[0]> = {}) {
  const props = {
    plaza,
    places: plazaPlaces,
    categoryCounts: countByCategory(plazaPlaces, catalog),
    filtersActive: false,
    activeCategoryId: null,
    onCategoryChange: vi.fn(),
    categoryHref: (id: string | null) => (id ? `/zona/x?categoria=${id}` : '/zona/x'),
    onClearFilters: vi.fn(),
    onOpenPlace: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  }
  await renderWithCatalog(<PlazaPanel {...props} />)
  return props
}

describe('PlazaPanel', () => {
  it('muestra nombre, descripción, número de lugares, categorías y lista', async () => {
    await setup()
    expect(screen.getByRole('heading', { level: 2, name: 'Plaza Norte' })).toBeInTheDocument()
    expect(screen.getByText('Plaza de prueba')).toBeInTheDocument()
    expect(screen.getByText(/Zona · 3 lugares/)).toBeInTheDocument()
    const categories = screen.getByRole('list', { name: 'Categorías' })
    expect(within(categories).getAllByRole('link')).toHaveLength(4)
    // El índice es una sola lista: el horario ordena pero ya no parte. Lo que se fija aquí es que
    // estén los tres lugares, en el orden en que queden.
    const indice = screen.getByRole('list', { name: /lugares/i })
    expect(within(indice).getAllByRole('listitem')).toHaveLength(3)
  })

  it('mueve el foco al título para lectores de pantalla', async () => {
    await setup()
    // El foco se mueve en un efecto, así que hay que esperarlo: comprobarlo a secas pasa aquí y
    // falla en una máquina cargada, que es exactamente lo que hizo en CI.
    await waitFor(() => expect(screen.getByRole('heading', { level: 2 })).toHaveFocus())
  })

  it('las pastillas anuncian los conteos con los filtros vigentes, no el total de la plaza', async () => {
    // Búsqueda activa que solo deja un lugar de tacos en la plaza.
    const tacos = plazaPlaces.filter((place) => place.giros.includes('taqueria'))
    await setup({
      places: tacos,
      categoryCounts: countByCategory(tacos, catalog),
      filtersActive: true,
    })
    const chips = within(screen.getByRole('list', { name: 'Categorías' }))
    // "Anuncian" literalmente: la cuenta vive en el nombre accesible, no en la pantalla.
    expect(chips.getByRole('link', { name: /^Todo/ })).toHaveAccessibleName('Todo 1')
    expect(chips.getByRole('link', { name: /Tacos y antojitos/ })).toHaveAccessibleName(
      'Tacos y antojitos 1',
    )
    // Y la que no tiene ninguno no anuncia ninguno: su nombre es solo la categoría.
    expect(chips.getByRole('link', { name: /Pizza/ })).toHaveAccessibleName('Pizza')
  })

  it('filtra por categoría dentro de la plaza', async () => {
    const props = await setup()
    const enlace = screen.getByRole('link', { name: /Tacos y antojitos/ })
    // Dentro de una zona la categoría es un filtro de la zona, no una página aparte.
    expect(enlace).toHaveAttribute('href', '/zona/x?categoria=tacos-y-antojitos')
    await userEvent.click(enlace)
    expect(props.onCategoryChange).toHaveBeenCalledWith('tacos-y-antojitos')
  })

  it('abre la ficha de un lugar', async () => {
    const props = await setup()
    await userEvent.click(screen.getByRole('link', { name: 'Ver detalles de Café Aurora' }))
    expect(props.onOpenPlace).toHaveBeenCalledWith(expect.objectContaining({ id: 'cafe-aurora' }))
  })

  it('muestra un estado vacío cuando los filtros no dejan resultados', async () => {
    const props = await setup({ places: [], filtersActive: true })
    expect(screen.getByText('Sin resultados')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ver todos los lugares de la zona' }))
    expect(props.onClearFilters).toHaveBeenCalled()
  })

  it('ofrece cómo llegar a la plaza y cerrar el panel', async () => {
    const props = await setup()
    const link = screen.getByRole('link', { name: /Cómo llegar a la zona/ })
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('https://www.google.com/maps/dir/?api=1'),
    )
    expect(link).toHaveAttribute('target', '_blank')
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }))
    expect(props.onClose).toHaveBeenCalled()
  })
})

describe('PlazaPanel: sectores dentro de la zona', () => {
  const sectores = [
    {
      id: 'comida',
      slug: { es: 'comida', en: 'food' },
      label: { es: 'Comida' },
      icon: 'utensils-crossed',
      order: 10,
    },
    {
      id: 'salud',
      slug: { es: 'salud', en: 'health' },
      label: { es: 'Salud' },
      icon: 'heart-pulse',
      order: 20,
    },
  ]
  // Pizza pasa a Salud: la zona queda con dos sectores (Comida: cafés y tacos; Salud: pizza, de mentiras).
  const categorias = categoriesFixture.map((categoria) => ({
    ...categoria,
    sectorId: categoria.id === 'pizza' ? 'salud' : 'comida',
  }))
  const repositorio = new InMemoryPlacesRepository({
    categories: categorias,
    plazas: plazasFixture,
    places: placesFixture,
  })

  async function conSectores(overrides: Partial<Parameters<typeof PlazaPanel>[0]> = {}) {
    const props = {
      plaza: { ...plaza, categories: ['desayunos-y-cafe', 'tacos-y-antojitos', 'pizza'] },
      places: plazaPlaces,
      categoryCounts: countByCategory(plazaPlaces, catalog),
      filtersActive: false,
      activeCategoryId: null,
      onCategoryChange: vi.fn(),
      categoryHref: (id: string | null) => (id ? `/zona/x?categoria=${id}` : '/zona/x'),
      sectors: sectores,
      sectorCounts: new Map([
        ['comida', 2],
        ['salud', 1],
      ]),
      activeSectorId: null,
      onSectorChange: vi.fn(),
      sectorHref: (id: string | null) => (id ? `/zona/x?sector=${id}` : '/zona/x'),
      onClearFilters: vi.fn(),
      onOpenPlace: vi.fn(),
      onClose: vi.fn(),
      ...overrides,
    }
    await renderWithCatalog(<PlazaPanel {...props} />, repositorio)
    return props
  }

  it('sin sector elegido muestra los sectores y no las categorías mezcladas', async () => {
    await conSectores()
    expect(screen.queryByRole('list', { name: 'Categorías' })).toBeNull()
    const sectoresLista = within(screen.getByRole('list', { name: 'Sectores' }))
    expect(sectoresLista.getAllByRole('link').map((enlace) => enlace.textContent)).toEqual([
      expect.stringContaining('Comida'),
      expect.stringContaining('Salud'),
    ])
    expect(sectoresLista.queryByRole('link', { name: /^Todo/ })).toBeNull()
  })

  it('elegir un sector llama a onSectorChange con su id', async () => {
    const props = await conSectores()
    await userEvent.click(
      within(screen.getByRole('list', { name: 'Sectores' })).getByRole('link', { name: /Salud/ }),
    )
    expect(props.onSectorChange).toHaveBeenCalledWith('salud')
  })

  it('con un sector elegido solo salen sus categorías, con el sector a la izquierda', async () => {
    await conSectores({ activeSectorId: 'comida' })
    const categorias = within(screen.getByRole('list', { name: 'Categorías' }))
    expect(categorias.queryByRole('link', { name: /Pizza/ })).toBeNull()
    expect(categorias.getByRole('link', { name: /Tacos y antojitos/ })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Comida/ }).length).toBeGreaterThan(0)
  })

  it('con un solo sector en la zona se quedan las categorías de siempre', async () => {
    await conSectores({
      plaza: { ...plaza, categories: ['desayunos-y-cafe', 'tacos-y-antojitos'] },
    })
    expect(screen.queryByRole('list', { name: 'Sectores' })).toBeNull()
    expect(
      within(screen.getByRole('list', { name: 'Categorías' })).getAllByRole('link'),
    ).toHaveLength(3)
  })
})
