/** Utilidades de test: catálogo en memoria detrás de la misma interfaz de repositorio que usa la app. */
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { CatalogProvider, useCatalogState } from '../data/CatalogContext.tsx'
import type { PlacesRepository } from '../data/PlacesRepository.ts'
import type { Category, Place, Plaza } from '../types/domain.ts'
import { categoriesFixture, placesFixture, plazasFixture } from './fixtures.ts'

export class InMemoryPlacesRepository implements PlacesRepository {
  private readonly data: { categories: Category[]; plazas: Plaza[]; places: Place[] }
  constructor(
    data = { categories: categoriesFixture, plazas: plazasFixture, places: placesFixture },
  ) {
    this.data = data
  }
  async getCategories() {
    return this.data.categories
  }
  async getPlazas() {
    return this.data.plazas
  }
  async getPlaces() {
    return this.data.places
  }
}

function ReadyGate({ children }: { children: ReactNode }) {
  const { state } = useCatalogState()
  return state.status === 'ready' ? <div data-testid="catalog-ready">{children}</div> : null
}

/** Renderiza dentro de un catálogo listo (espera a la carga asíncrona del repositorio). */
export async function renderWithCatalog(
  ui: ReactNode,
  repository: PlacesRepository = new InMemoryPlacesRepository(),
) {
  const result = render(
    <CatalogProvider repository={repository}>
      <ReadyGate>{ui}</ReadyGate>
    </CatalogProvider>,
  )
  await screen.findByTestId('catalog-ready')
  return result
}
