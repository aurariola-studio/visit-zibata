/** Utilidades de test: catálogo en memoria detrás de la misma interfaz de repositorio que usa la app. */
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { CatalogProvider, useCatalogState, usePlaceDetails } from '../data/CatalogContext.tsx'
import type { PlacesRepository } from '../data/PlacesRepository.ts'
import { projectDetail, projectSummary } from '../data/placeParts.ts'
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
  async getPlaceSummaries() {
    return this.data.places.map(projectSummary)
  }
  async getPlaceDetails() {
    return this.data.places.map(projectDetail)
  }
}

function ReadyGate({ children, esperarDetalle }: { children: ReactNode; esperarDetalle: boolean }) {
  const { state } = useCatalogState()
  const detalles = usePlaceDetails()
  const listo = state.status === 'ready' && (!esperarDetalle || detalles.status !== 'loading')
  return listo ? <div data-testid="catalog-ready">{children}</div> : null
}

/**
 * Renderiza dentro de un catálogo listo (espera a la carga asíncrona del repositorio). Por omisión espera también
 * al detalle de los locales, que llega aparte; las pruebas del esqueleto lo dejan correr con
 * `esperarDetalle: false`.
 */
export async function renderWithCatalog(
  ui: ReactNode,
  repository: PlacesRepository = new InMemoryPlacesRepository(),
  { esperarDetalle = true }: { esperarDetalle?: boolean } = {},
) {
  const result = render(
    <CatalogProvider repository={repository}>
      <ReadyGate esperarDetalle={esperarDetalle}>{ui}</ReadyGate>
    </CatalogProvider>,
  )
  await screen.findByTestId('catalog-ready')
  return result
}
