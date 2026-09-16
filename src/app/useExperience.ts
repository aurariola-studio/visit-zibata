/** Datos derivados del estado: resultados, conteos por plaza y qué muestra el panel. */
import { useDeferredValue, useMemo } from 'react'
import { useFavorites } from '../features/favorites/useFavorites.ts'
import {
  applyFilters,
  countByCategory,
  countByPlaza,
  hasActiveFilters,
} from '../features/filters/filters.ts'
import { createSearchIndex } from '../features/search/searchIndex.ts'
import type { Catalog, Place, Plaza } from '../types/domain.ts'
import { useAppState } from './AppStateContext.tsx'

export type PanelMode =
  | { kind: 'idle' }
  | { kind: 'explore' }
  | { kind: 'results'; places: Place[] }
  | { kind: 'plaza'; plaza: Plaza; places: Place[] }
  | { kind: 'place'; place: Place; plaza: Plaza; fromResults: boolean }

export function useExperience(catalog: Catalog) {
  const state = useAppState()
  const favorites = useFavorites()
  const searchIndex = useMemo(() => createSearchIndex(catalog), [catalog])
  const query = useDeferredValue(state.searchQuery)

  const filtersActive = hasActiveFilters({
    query,
    categoryId: state.activeCategoryId,
    favoritesOnly: state.favoritesOnly,
  })

  const matching = useMemo(
    () =>
      applyFilters(
        catalog,
        searchIndex,
        {
          query,
          categoryId: state.activeCategoryId,
          plazaId: null,
          favoritesOnly: state.favoritesOnly,
        },
        favorites.ids,
      ),
    [catalog, searchIndex, query, state.activeCategoryId, state.favoritesOnly, favorites.ids],
  )

  const matchCounts = useMemo(
    () => (filtersActive ? countByPlaza(matching) : null),
    [filtersActive, matching],
  )

  // Conteo por categoría con los demás filtros aplicados (búsqueda, favoritos y plaza seleccionada, sin la
  // propia categoría): así cada pastilla anuncia exactamente los resultados que dará al pulsarla.
  const categoryCounts = useMemo(
    () =>
      countByCategory(
        applyFilters(
          catalog,
          searchIndex,
          {
            query,
            categoryId: null,
            plazaId: state.selectedPlazaId,
            favoritesOnly: state.favoritesOnly,
          },
          favorites.ids,
        ),
      ),
    [catalog, searchIndex, query, state.selectedPlazaId, state.favoritesOnly, favorites.ids],
  )

  /** Solo categorías con algún lugar activo: nunca pastillas que no llevan a nada. */
  const visibleCategories = useMemo(() => {
    const used = new Set(catalog.places.map((place) => place.category))
    return catalog.categories.filter((category) => used.has(category.id))
  }, [catalog])

  const placeCounts = useMemo(
    () =>
      new Map(
        catalog.plazas.map((plaza) => [plaza.id, catalog.placesByPlaza.get(plaza.id)?.length ?? 0]),
      ),
    [catalog],
  )

  const selectedPlaza = state.selectedPlazaId
    ? catalog.plazaById.get(state.selectedPlazaId)
    : undefined
  const selectedPlace = state.selectedPlaceId
    ? catalog.placeById.get(state.selectedPlaceId)
    : undefined

  const panel: PanelMode = useMemo(() => {
    if (selectedPlace) {
      const plaza = catalog.plazaById.get(selectedPlace.plazaId)
      if (plaza)
        return {
          kind: 'place',
          place: selectedPlace,
          plaza,
          fromResults: state.placeOrigin === 'results',
        }
    }
    if (selectedPlaza) {
      const places = filtersActive
        ? matching.filter((place) => place.plazaId === selectedPlaza.id)
        : (catalog.placesByPlaza.get(selectedPlaza.id) ?? [])
      return { kind: 'plaza', plaza: selectedPlaza, places }
    }
    if (filtersActive) return { kind: 'results', places: matching }
    if (state.listOpen) return { kind: 'explore' }
    return { kind: 'idle' }
  }, [
    catalog,
    selectedPlace,
    selectedPlaza,
    filtersActive,
    matching,
    state.listOpen,
    state.placeOrigin,
  ])

  return {
    state,
    favorites,
    filtersActive,
    matching,
    matchCounts,
    placeCounts,
    categoryCounts,
    visibleCategories,
    panel,
    activePlazas: catalog.plazas.filter((plaza) => plaza.active),
  }
}
