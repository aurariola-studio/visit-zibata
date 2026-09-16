import { describe, expect, it } from 'vitest'
import { appReducer, initialAppState } from './state.ts'

describe('appReducer', () => {
  it('seleccionar plaza cierra la ficha y la lista', () => {
    const state = appReducer(
      { ...initialAppState, selectedPlaceId: 'x', listOpen: true },
      { type: 'selectPlaza', plazaId: 'paseo-zibata' },
    )
    expect(state).toMatchObject({
      selectedPlazaId: 'paseo-zibata',
      selectedPlaceId: null,
      listOpen: false,
    })
  })

  it('al volver de una ficha abierta desde resultados regresa a los resultados', () => {
    const opened = appReducer(initialAppState, {
      type: 'selectPlace',
      placeId: 'tomassa',
      plazaId: 'paseo-zibata',
      origin: 'results',
    })
    expect(opened).toMatchObject({
      selectedPlazaId: 'paseo-zibata',
      selectedPlaceId: 'tomassa',
      sheetExpanded: true,
    })
    expect(appReducer(opened, { type: 'closePlace' })).toMatchObject({
      selectedPlazaId: null,
      selectedPlaceId: null,
    })
  })

  it('al volver de una ficha abierta desde la plaza se mantiene la plaza', () => {
    const opened = appReducer(initialAppState, {
      type: 'selectPlace',
      placeId: 'tomassa',
      plazaId: 'paseo-zibata',
      origin: 'plaza',
    })
    expect(appReducer(opened, { type: 'closePlace' })).toMatchObject({
      selectedPlazaId: 'paseo-zibata',
      selectedPlaceId: null,
    })
  })

  it('limpiar filtros conserva la plaza seleccionada', () => {
    const state = appReducer(
      {
        ...initialAppState,
        selectedPlazaId: 'condesa',
        activeCategoryId: 'pizza',
        searchQuery: 'x',
        favoritesOnly: true,
      },
      { type: 'clearFilters' },
    )
    expect(state).toMatchObject({
      selectedPlazaId: 'condesa',
      activeCategoryId: null,
      searchQuery: '',
      favoritesOnly: false,
    })
  })

  it('cerrar el panel limpia la selección', () => {
    const state = appReducer(
      {
        ...initialAppState,
        selectedPlazaId: 'condesa',
        selectedPlaceId: 'x',
        listOpen: true,
        sheetExpanded: true,
      },
      { type: 'closePanel' },
    )
    expect(state).toMatchObject({
      selectedPlazaId: null,
      selectedPlaceId: null,
      listOpen: false,
      sheetExpanded: false,
    })
  })

  it('un enlace no publicado muestra el aviso hasta cerrarlo', () => {
    const synced = appReducer(initialAppState, {
      type: 'syncFromUrl',
      plazaId: null,
      placeId: null,
      categoryId: null,
      missingLink: true,
    })
    expect(synced.missingLinkNotice).toBe(true)
    expect(appReducer(synced, { type: 'dismissNotice' }).missingLinkNotice).toBe(false)
  })
})
