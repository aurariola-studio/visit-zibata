import { searchTerms } from '../../lib/text.ts'
import type { Catalog, Place } from '../../types/domain.ts'
import type { SearchIndex } from '../search/searchIndex.ts'

export interface Filters {
  query: string
  categoryId: string | null
  /** Plaza activa: la seleccionada en el mapa o en el filtro de plazas. */
  plazaId: string | null
  favoritesOnly: boolean
}

export const EMPTY_FILTERS: Filters = {
  query: '',
  categoryId: null,
  plazaId: null,
  favoritesOnly: false,
}

/** Filtros que reducen la lista (la plaza no cuenta: seleccionarla es navegar, no filtrar). */
export function hasActiveFilters(
  filters: Pick<Filters, 'query' | 'categoryId' | 'favoritesOnly'>,
): boolean {
  return (
    searchTerms(filters.query).length > 0 || filters.categoryId !== null || filters.favoritesOnly
  )
}

/**
 * Aplica búsqueda + categoría + favoritos (+ plaza si se indica). Con búsqueda activa los resultados
 * van por relevancia; sin ella, en el orden curado del catálogo.
 */
export function applyFilters(
  catalog: Catalog,
  searchIndex: SearchIndex,
  filters: Filters,
  favoriteIds: ReadonlySet<string> = new Set(),
): Place[] {
  const ranked = searchIndex.search(filters.query)
  const candidates =
    ranked === null
      ? catalog.places
      : ranked
          .map((id) => catalog.placeById.get(id))
          .filter((place): place is Place => place !== undefined)

  return candidates.filter(
    (place) =>
      (filters.categoryId === null || place.category === filters.categoryId) &&
      (filters.plazaId === null || place.plazaId === filters.plazaId) &&
      (!filters.favoritesOnly || favoriteIds.has(place.id)),
  )
}

export function countByPlaza(places: readonly Place[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const place of places) counts.set(place.plazaId, (counts.get(place.plazaId) ?? 0) + 1)
  return counts
}

/** Lugares agrupados por plaza conservando el orden de aparición. */
export function groupByPlaza(places: readonly Place[]): [string, Place[]][] {
  const groups = new Map<string, Place[]>()
  for (const place of places) {
    const list = groups.get(place.plazaId) ?? []
    list.push(place)
    groups.set(place.plazaId, list)
  }
  return [...groups]
}

/** Nº de lugares por categoría dentro de un conjunto (para las pastillas de filtro). */
export function countByCategory(places: readonly Place[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const place of places) counts.set(place.category, (counts.get(place.category) ?? 0) + 1)
  return counts
}
