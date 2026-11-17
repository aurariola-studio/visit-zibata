import { ZIBATA_EXTENT } from '../config/map.ts'
import type { Catalog, Category, Place, Plaza, Sector } from '../types/domain.ts'
import { DataLoadError, type PlacesRepository, type RetiredPlace } from './PlacesRepository.ts'
import {
  type Bounds,
  type CommercialDataset,
  deriveCategoryIds,
  isWithinBounds,
} from './relations.ts'
import { PUBLISHABLE_STATUS } from './rules.ts'

export function buildCatalog(
  categories: Category[],
  allPlazas: Plaza[],
  allPlaces: Place[],
  retired: readonly RetiredPlace[] = [],
  allSectors: readonly Sector[] = [],
): Catalog {
  const sortedCategories = [...categories].sort((a, b) => a.order - b.order)
  const sectors = [...allSectors].sort((a, b) => a.order - b.order)
  const sectorById = new Map(sectors.map((sector) => [sector.id, sector]))
  const activePlazas = new Set(allPlazas.filter((plaza) => plaza.active).map((plaza) => plaza.id))
  const places = allPlaces.filter((place) => place.active && activePlazas.has(place.plazaId))

  const placesByPlaza = new Map<string, Place[]>()
  const plazas = allPlazas.map((plaza) => {
    const ofPlaza = places.filter((p) => p.plazaId === plaza.id)
    // Respeta el orden curado de `placeIds`; un local que falte en la lista va al final.
    const rank = new Map(plaza.placeIds.map((id, index) => [id, index]))
    const ordered = [...ofPlaza].sort(
      (a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity),
    )
    placesByPlaza.set(plaza.id, ordered)
    // `categories` se deriva de los locales visibles para que la plaza nunca anuncie lo que no muestra.
    return { ...plaza, categories: deriveCategoryIds(ordered, sortedCategories) }
  })

  // Los giros y su categoría, una sola vez: es el índice del que dependen filtros, buscador y fichas.
  const giroById = new Map(sortedCategories.flatMap((c) => c.giros.map((g) => [g.id, g] as const)))
  const categoryOfGiro = new Map(
    sortedCategories.flatMap((c) => c.giros.map((g) => [g.id, c] as const)),
  )

  // Lo que no se muestra pero se marcó alguna vez: los ocultos conservan sus datos y los borrados
  // dejan su huella en `redirects.json`. Un local que sí se muestra no entra (manda el real).
  const shown = new Set(places.map((place) => place.id))
  const retiredById = new Map<string, Pick<Place, 'giros' | 'plazaId'>>([
    ...retired.map(({ id, giros, plazaId }) => [id, { giros, plazaId }] as const),
    ...allPlaces
      .filter((place) => !shown.has(place.id))
      .map(({ id, giros, plazaId }) => [id, { giros, plazaId }] as const),
  ])

  return {
    categories: sortedCategories,
    sectors,
    plazas,
    places,
    categoryById: new Map(sortedCategories.map((c) => [c.id, c])),
    sectorById,
    sectorOfCategory: new Map(
      sortedCategories.flatMap((category) => {
        const sector = category.sectorId ? sectorById.get(category.sectorId) : undefined
        return sector ? [[category.id, sector] as const] : []
      }),
    ),
    giroById,
    categoryOfGiro,
    plazaById: new Map(plazas.map((p) => [p.id, p])),
    plazaBySlug: new Map(plazas.map((p) => [p.slug, p])),
    placeById: new Map(places.map((p) => [p.id, p])),
    retiredById,
    placeBySlug: new Map(places.map((p) => [p.slug, p])),
    placesByPlaza,
  }
}

/**
 * Descarta o corrige lo que rompe las relaciones entre colecciones (plaza o categoría inexistente, slug
 * repetido, coordenadas fuera de Zibatá, estado no publicable) en lugar de bloquear toda la guía.
 * `npm run data:validate` trata todo esto como error en build; aquí solo protege al usuario.
 */
export function sanitizeDataset(
  dataset: CommercialDataset,
  bounds: Bounds,
): { dataset: CommercialDataset; notes: string[] } {
  const notes: string[] = []
  const slugs = new Set<string>()
  const uniqueSlug = (slug: string) => !slugs.has(slug) && Boolean(slugs.add(slug))

  const plazas = dataset.plazas.filter((plaza) => {
    const problem = !isWithinBounds(plaza.coordinates, bounds)
      ? 'fuera de Zibatá'
      : !uniqueSlug(`plaza:${plaza.slug}`)
        ? 'slug repetido'
        : null
    if (problem) notes.push(`plaza [${plaza.id}] omitida: ${problem}`)
    return problem === null
  })
  const plazaIds = new Set(plazas.map((plaza) => plaza.id))
  const giroIds = new Set(dataset.categories.flatMap((c) => c.giros.map((giro) => giro.id)))

  const places: Place[] = []
  for (const place of dataset.places) {
    // Los giros que no existen se ignoran; si no queda ninguno, el local no se puede colocar.
    const giros = place.giros.filter((giro) => giroIds.has(giro))
    const problem = !plazaIds.has(place.plazaId)
      ? `plaza "${place.plazaId}" inexistente`
      : giros.length === 0
        ? 'sin ningún giro que exista'
        : place.verification && !PUBLISHABLE_STATUS.includes(place.verification.status)
          ? `estado "${place.verification.status}" no publicable`
          : !uniqueSlug(`place:${place.slug}`)
            ? 'slug repetido'
            : null
    if (problem) {
      notes.push(`local [${place.id}] omitido: ${problem}`)
      continue
    }
    let fixed = place
    if (giros.length !== place.giros.length) {
      notes.push(`local [${place.id}]: giro inexistente ignorado`)
      fixed = { ...fixed, giros }
    }
    if (place.location && !isWithinBounds(place.location, bounds)) {
      notes.push(`local [${place.id}]: coordenadas fuera de Zibatá ignoradas`)
      fixed = { ...fixed, location: null }
    }
    places.push(fixed)
  }
  return { dataset: { categories: dataset.categories, plazas, places }, notes }
}

export async function loadCatalog(repository: PlacesRepository): Promise<Catalog> {
  const [categories, plazas, places] = await Promise.all([
    repository.getCategories(),
    repository.getPlazas(),
    repository.getPlaces(),
  ])
  const [west, south, east, north] = ZIBATA_EXTENT.areaBbox
  const { dataset, notes } = sanitizeDataset(
    { categories, plazas, places },
    { west, south, east, north },
  )
  for (const note of notes) console.warn(`[datos] ${note}`)
  // Los borrados solo afinan las recomendaciones: si su archivo falla, la guía sigue sin ellos.
  const retired = await (repository.getRetired?.() ?? Promise.resolve([])).catch(() => [])
  // Los sectores solo agrupan: si su archivo falla, las categorías siguen yendo sueltas.
  const sectors = await (repository.getSectors?.() ?? Promise.resolve([])).catch(() => [])
  const catalog = buildCatalog(dataset.categories, dataset.plazas, dataset.places, retired, sectors)
  if (catalog.categories.length === 0 || !catalog.plazas.some((plaza) => plaza.active)) {
    throw new DataLoadError('No hay datos comerciales válidos para mostrar', notes)
  }
  return catalog
}

/**
 * Lo que se sabe de un local que alguien marcó, esté o no a la vista: el local, o al menos sus giros y
 * su plaza. Lo usa el algoritmo para aprender gustos; no sirve para mostrar nada.
 */
export function markedPlace(
  catalog: Catalog,
  id: string,
): Pick<Place, 'giros' | 'plazaId'> | undefined {
  return catalog.placeById.get(id) ?? catalog.retiredById.get(id)
}
