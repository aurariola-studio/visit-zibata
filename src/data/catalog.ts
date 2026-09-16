import { ZIBATA_EXTENT } from '../config/map.ts'
import type { Catalog, Category, Place, Plaza } from '../types/domain.ts'
import { DataLoadError, type PlacesRepository } from './PlacesRepository.ts'
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
): Catalog {
  const sortedCategories = [...categories].sort((a, b) => a.order - b.order)
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

  return {
    categories: sortedCategories,
    plazas,
    places,
    categoryById: new Map(sortedCategories.map((c) => [c.id, c])),
    plazaById: new Map(plazas.map((p) => [p.id, p])),
    plazaBySlug: new Map(plazas.map((p) => [p.slug, p])),
    placeById: new Map(places.map((p) => [p.id, p])),
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
  const categoryById = new Map(dataset.categories.map((category) => [category.id, category]))

  const places: Place[] = []
  for (const place of dataset.places) {
    const category = categoryById.get(place.category)
    const problem = !plazaIds.has(place.plazaId)
      ? `plaza "${place.plazaId}" inexistente`
      : !category
        ? `categoría "${place.category}" inexistente`
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
    if (place.subcategory && !category?.subcategories.some((s) => s.id === place.subcategory)) {
      notes.push(`local [${place.id}]: subcategoría "${place.subcategory}" ignorada`)
      fixed = { ...fixed, subcategory: null }
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
  const catalog = buildCatalog(dataset.categories, dataset.plazas, dataset.places)
  if (catalog.categories.length === 0 || !catalog.plazas.some((plaza) => plaza.active)) {
    throw new DataLoadError('No hay datos comerciales válidos para mostrar', notes)
  }
  return catalog
}
