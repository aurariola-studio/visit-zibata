import { describe, expect, it } from 'vitest'
import { catalogFixture } from '../../test/fixtures.ts'
import { createSearchIndex } from '../search/searchIndex.ts'
import {
  applyFilters,
  countByCategory,
  countByPlaza,
  EMPTY_FILTERS,
  groupByPlaza,
  hasActiveFilters,
} from './filters.ts'

const catalog = catalogFixture()
const index = createSearchIndex(catalog)
const ids = (places: { id: string }[]) => places.map((place) => place.id)

describe('applyFilters', () => {
  it('sin filtros devuelve todos los lugares activos', () => {
    expect(ids(applyFilters(catalog, index, EMPTY_FILTERS))).toEqual([
      'cafe-aurora',
      'tacos-el-farol',
      'pizza-norte',
      'panaderia-trigo',
    ])
  })

  it('filtra por categoría', () => {
    const result = applyFilters(catalog, index, {
      ...EMPTY_FILTERS,
      categoryId: 'desayunos-y-cafe',
    })
    expect(ids(result)).toEqual(['cafe-aurora', 'panaderia-trigo'])
  })

  it('combina plaza y categoría', () => {
    const result = applyFilters(catalog, index, {
      ...EMPTY_FILTERS,
      categoryId: 'desayunos-y-cafe',
      plazaId: 'plaza-sur',
    })
    expect(ids(result)).toEqual(['panaderia-trigo'])
  })

  it('combina búsqueda y categoría', () => {
    const result = applyFilters(catalog, index, {
      ...EMPTY_FILTERS,
      query: 'norte',
      categoryId: 'pizza',
    })
    expect(ids(result)).toEqual(['pizza-norte'])
  })

  it('filtra por favoritos', () => {
    const result = applyFilters(
      catalog,
      index,
      { ...EMPTY_FILTERS, favoritesOnly: true },
      new Set(['trigo', 'tacos-el-farol']),
    )
    expect(ids(result)).toEqual(['tacos-el-farol'])
  })

  it('devuelve lista vacía cuando nada coincide', () => {
    expect(applyFilters(catalog, index, { ...EMPTY_FILTERS, query: 'sushi' })).toEqual([])
  })
})

describe('utilidades de filtros', () => {
  it('detecta filtros activos (la plaza no cuenta)', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false)
    expect(hasActiveFilters({ ...EMPTY_FILTERS, query: 'a' })).toBe(false)
    // Coherente con la búsqueda: varias letras sueltas no filtran, así que no cuentan como filtro.
    expect(hasActiveFilters({ ...EMPTY_FILTERS, query: 'a b' })).toBe(false)
    expect(hasActiveFilters({ ...EMPTY_FILTERS, query: 'ta' })).toBe(true)
    expect(hasActiveFilters({ ...EMPTY_FILTERS, categoryId: 'pizza' })).toBe(true)
  })

  it('cuenta y agrupa por plaza y categoría', () => {
    const all = applyFilters(catalog, index, EMPTY_FILTERS)
    expect(countByPlaza(all)).toEqual(
      new Map([
        ['plaza-norte', 3],
        ['plaza-sur', 1],
      ]),
    )
    expect(groupByPlaza(all).map(([plazaId, places]) => [plazaId, places.length])).toEqual([
      ['plaza-norte', 3],
      ['plaza-sur', 1],
    ])
    expect(countByCategory(all).get('desayunos-y-cafe')).toBe(2)
  })
})
