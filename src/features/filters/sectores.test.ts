import { describe, expect, it } from 'vitest'
import { appReducer, initialAppState } from '../../app/state.ts'
import { buildCatalog } from '../../data/catalog.ts'
import { buildPath, parsePath, rutaDeSector, type UrlState, vistaDe } from '../../lib/url-state.ts'
import { categoriesFixture, makePlace, placesFixture, plazasFixture } from '../../test/fixtures.ts'
import type { Category, Sector } from '../../types/domain.ts'
import { createSearchIndex } from '../search/searchIndex.ts'
import {
  applyFilters,
  countByCategory,
  countBySector,
  EMPTY_FILTERS,
  hasActiveFilters,
  sectorsOf,
} from './filters.ts'

/*
 * Dos sectores, con datos ficticios: hasta que haya lugares de salud en la guía real, la fila de sectores
 * no se ve, así que es aquí donde se prueba lo que hará cuando se vea.
 */
const sectores: Sector[] = [
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
const dentistas: Category = {
  id: 'dentistas',
  slug: { es: 'dentistas', en: 'dentists' },
  sectorId: 'salud',
  label: { es: 'Dentistas' },
  icon: 'tooth',
  order: 220,
  synonyms: ['dentista'],
  giros: [
    { id: 'dentista', label: { es: 'Dentista' }, icon: 'tooth', synonyms: [], general: true },
  ],
}
const categorias: Category[] = [
  ...categoriesFixture.map((categoria) => ({ ...categoria, sectorId: 'comida' })),
  dentistas,
]
const lugares = [
  ...placesFixture,
  makePlace({ id: 'sonrisa-norte', plazaId: 'plaza-norte', name: 'Sonrisa', giros: ['dentista'] }),
  // Un local que reúne comida y salud: cuenta en los dos sectores.
  makePlace({
    id: 'cafe-clinica',
    plazaId: 'plaza-sur',
    name: 'Café Clínica',
    giros: ['cafeteria', 'dentista'],
  }),
]
const catalog = buildCatalog(categorias, plazasFixture, lugares, [], sectores)
const indice = createSearchIndex(catalog)
const ids = (places: { id: string }[]) => places.map((place) => place.id)

describe('el catálogo con sectores', () => {
  it('ordena los sectores y sabe el de cada categoría', () => {
    expect(catalog.sectors.map((sector) => sector.id)).toEqual(['comida', 'salud'])
    expect(catalog.sectorOfCategory.get('dentistas')?.id).toBe('salud')
    expect(catalog.sectorOfCategory.get('pizza')?.id).toBe('comida')
  })

  it('sin sectores en el archivo, el catálogo queda sin ellos y todo sigue igual', () => {
    const sinSectores = buildCatalog(categoriesFixture, plazasFixture, placesFixture)
    expect(sinSectores.sectors).toEqual([])
    expect(sinSectores.sectorOfCategory.size).toBe(0)
  })
})

describe('filtrar por sector', () => {
  it('deja los lugares de ese sector, y un local de dos sectores sale en los dos', () => {
    const salud = applyFilters(catalog, indice, { ...EMPTY_FILTERS, sectorId: 'salud' })
    expect(ids(salud)).toEqual(['sonrisa-norte', 'cafe-clinica'])
    const comida = applyFilters(catalog, indice, { ...EMPTY_FILTERS, sectorId: 'comida' })
    expect(ids(comida)).toContain('cafe-clinica')
    expect(ids(comida)).not.toContain('sonrisa-norte')
  })

  it('se combina con la zona y con la búsqueda', () => {
    const enSur = applyFilters(catalog, indice, {
      ...EMPTY_FILTERS,
      sectorId: 'salud',
      plazaId: 'plaza-sur',
    })
    expect(ids(enSur)).toEqual(['cafe-clinica'])
    const buscando = applyFilters(catalog, indice, {
      ...EMPTY_FILTERS,
      sectorId: 'salud',
      query: 'sonrisa',
    })
    expect(ids(buscando)).toEqual(['sonrisa-norte'])
  })

  it('cuenta como filtro activo', () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS })).toBe(false)
    expect(hasActiveFilters({ ...EMPTY_FILTERS, sectorId: 'salud' })).toBe(true)
  })

  it('sectorsOf y countBySector cuentan cada local una vez por sector', () => {
    const cafeClinica = catalog.placeById.get('cafe-clinica')
    if (!cafeClinica) throw new Error('falta el local de prueba')
    expect(sectorsOf(cafeClinica, catalog).sort()).toEqual(['comida', 'salud'])
    const cuentas = countBySector(catalog.places, catalog)
    expect(cuentas.get('salud')).toBe(2)
    expect(cuentas.get('comida')).toBe(5)
  })

  it('las categorías cuentan dentro del sector que se mira', () => {
    const dentroDeSalud = applyFilters(catalog, indice, { ...EMPTY_FILTERS, sectorId: 'salud' })
    const cuentas = countByCategory(dentroDeSalud, catalog)
    expect(cuentas.get('dentistas')).toBe(2)
    // El café de la clínica aparece también como cafetería: es de lo que "Salud" no se libra.
    expect(cuentas.get('desayunos-y-cafe')).toBe(1)
  })
})

describe('el estado del sector', () => {
  it('elegir una categoría suelta el sector, quitarla lo deja', () => {
    const enSalud = appReducer(initialAppState, { type: 'setSector', sectorId: 'salud' })
    expect(enSalud.activeSectorId).toBe('salud')
    const conCategoria = appReducer(enSalud, { type: 'setCategory', categoryId: 'dentistas' })
    expect(conCategoria.activeCategoryId).toBe('dentistas')
    expect(conCategoria.activeSectorId).toBeNull()
    const sinCategoria = appReducer(enSalud, { type: 'setCategory', categoryId: null })
    expect(sinCategoria.activeSectorId).toBe('salud')
  })

  it('elegir un sector quita la categoría, y limpiar filtros quita los dos', () => {
    const conCategoria = appReducer(initialAppState, { type: 'setCategory', categoryId: 'pizza' })
    const enSalud = appReducer(conCategoria, { type: 'setSector', sectorId: 'salud' })
    expect(enSalud.activeCategoryId).toBeNull()
    expect(enSalud.activeSectorId).toBe('salud')
    const limpio = appReducer(enSalud, { type: 'clearFilters' })
    expect(limpio.activeSectorId).toBeNull()
    expect(limpio.activeCategoryId).toBeNull()
  })

  it('la URL manda: syncFromUrl pone o quita el sector', () => {
    const base = {
      type: 'syncFromUrl' as const,
      plazaId: null,
      placeId: null,
      categoryId: null,
      missingLink: false,
      infoTopic: null,
    }
    expect(appReducer(initialAppState, { ...base, sectorId: 'salud' }).activeSectorId).toBe('salud')
    const enSalud = appReducer(initialAppState, { type: 'setSector', sectorId: 'salud' })
    expect(appReducer(enSalud, { ...base, sectorId: null }).activeSectorId).toBeNull()
  })
})

describe('la ruta del sector', () => {
  const vacio = {
    plazaSlug: null,
    placeSlug: null,
    categorySlug: null,
    sectorSlug: null,
    infoTopic: null,
  } satisfies Omit<UrlState, 'locale'>
  const BASE = '/'

  it('sola es su página, en cada idioma, y se lee de vuelta', () => {
    expect(buildPath({ ...vacio, locale: 'es', sectorSlug: 'salud' }, BASE)).toBe(
      '/es/sector/salud',
    )
    expect(buildPath({ ...vacio, locale: 'en', sectorSlug: 'health' }, BASE)).toBe(
      '/en/sector/health',
    )
    expect(parsePath('/es/sector/salud', '', BASE).sectorSlug).toBe('salud')
    expect(parsePath('/en/sector/health', '', BASE).sectorSlug).toBe('health')
  })

  it('dentro de una zona es un filtro, como la categoría', () => {
    const ruta = buildPath(
      { ...vacio, locale: 'es', plazaSlug: 'condesa', sectorSlug: 'salud' },
      BASE,
    )
    expect(ruta).toBe('/es/zona/condesa?sector=salud')
    const leido = parsePath('/es/zona/condesa', '?sector=salud', BASE)
    expect(leido.plazaSlug).toBe('condesa')
    expect(leido.sectorSlug).toBe('salud')
  })

  it('si hay categoría, el sector sobra: la categoría ya lo implica', () => {
    const leido = parsePath('/es/zona/condesa', '?categoria=dentistas&sector=salud', BASE)
    expect(leido.categorySlug).toBe('dentistas')
    expect(leido.sectorSlug).toBeNull()
  })

  it('pasar de la portada a un sector es filtrar la misma vista, no navegar', () => {
    expect(vistaDe('/es/sector/salud')).toBe(vistaDe('/es'))
    expect(vistaDe('/es/sector/salud')).toBe(vistaDe('/es/categoria/dentistas'))
  })

  it('rutaDeSector apunta a la vista sin sector cuando no hay slug', () => {
    expect(rutaDeSector('salud', null, 'es', BASE)).toBe('/es/sector/salud')
    expect(rutaDeSector(null, null, 'es', BASE)).toBe('/es')
    expect(rutaDeSector('salud', 'condesa', 'es', BASE)).toBe('/es/zona/condesa?sector=salud')
  })
})
