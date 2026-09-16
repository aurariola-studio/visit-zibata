/**
 * Datos de prueba FICTICIOS (solo para tests). Usan exactamente la estructura de los datos reales.
 */
import { buildCatalog } from '../data/catalog.ts'
import type { Catalog, Category, Place, Plaza } from '../types/domain.ts'

export const categoriesFixture: Category[] = [
  {
    id: 'desayunos-y-cafe',
    label: { es: 'Desayunos y café' },
    icon: 'coffee',
    order: 10,
    synonyms: ['café', 'cafetería', 'coffee', 'desayuno'],
    subcategories: [{ id: 'panaderia', label: { es: 'Panadería' }, synonyms: ['pan', 'bakery'] }],
  },
  {
    id: 'tacos-y-antojitos',
    label: { es: 'Tacos y antojitos' },
    icon: 'taco',
    order: 30,
    synonyms: ['tacos', 'taquería', 'pastor'],
    subcategories: [],
  },
  {
    id: 'pizza',
    label: { es: 'Pizza' },
    icon: 'pizza',
    order: 70,
    synonyms: ['pizzería'],
    subcategories: [],
  },
]

/** Cuadrado de ~55 m centrado en el punto de la plaza (el punto debe caer dentro de su polígono). */
const square = (lng: number, lat: number): Plaza['geometry'] => ({
  type: 'Polygon',
  coordinates: [
    [
      [lng - 0.00025, lat - 0.00025],
      [lng + 0.00025, lat - 0.00025],
      [lng + 0.00025, lat + 0.00025],
      [lng - 0.00025, lat + 0.00025],
      [lng - 0.00025, lat - 0.00025],
    ],
  ],
})

export function makePlaza(overrides: Partial<Plaza> & Pick<Plaza, 'id'>): Plaza {
  const coordinates = overrides.coordinates ?? { lat: 20.68, lng: -100.32 }
  return {
    slug: overrides.id,
    name: `Plaza ${overrides.id}`,
    description: 'Plaza de prueba',
    address: null,
    coordinates,
    geometry: square(coordinates.lng, coordinates.lat),
    active: true,
    placeIds: [],
    categories: [],
    locationConfidence: 'high',
    locationSource: 'fixture',
    ...overrides,
  }
}

export function makePlace(overrides: Partial<Place> & Pick<Place, 'id' | 'plazaId'>): Place {
  return {
    slug: overrides.id,
    name: overrides.id,
    category: 'pizza',
    subcategory: null,
    description: null,
    localNumber: null,
    hours: null,
    location: null,
    googleMapsUri: null,
    googlePlaceId: null,
    phone: null,
    photos: [],
    links: { website: null, instagram: null, facebook: null, tiktok: null, whatsapp: null },
    tags: [],
    active: true,
    ...overrides,
  }
}

export const plazasFixture: Plaza[] = [
  makePlaza({
    id: 'plaza-norte',
    name: 'Plaza Norte',
    placeIds: ['cafe-aurora', 'tacos-el-farol', 'pizza-norte'],
    categories: ['desayunos-y-cafe', 'tacos-y-antojitos', 'pizza'],
  }),
  makePlaza({
    id: 'plaza-sur',
    name: 'Plaza Sur',
    coordinates: { lat: 20.675, lng: -100.33 },
    placeIds: ['panaderia-trigo', 'cerrado-hace-tiempo'],
    categories: ['desayunos-y-cafe'],
  }),
]

export const placesFixture: Place[] = [
  makePlace({
    id: 'cafe-aurora',
    plazaId: 'plaza-norte',
    name: 'Café Aurora',
    category: 'desayunos-y-cafe',
    tags: ['terraza'],
  }),
  makePlace({
    id: 'tacos-el-farol',
    plazaId: 'plaza-norte',
    name: 'Tacos El Farol',
    category: 'tacos-y-antojitos',
  }),
  makePlace({
    id: 'pizza-norte',
    plazaId: 'plaza-norte',
    name: 'Pizzería Norte',
    category: 'pizza',
  }),
  makePlace({
    id: 'panaderia-trigo',
    plazaId: 'plaza-sur',
    name: 'Trigo',
    category: 'desayunos-y-cafe',
    subcategory: 'panaderia',
    description: 'Pan de masa madre y café de especialidad.',
  }),
  makePlace({
    id: 'cerrado-hace-tiempo',
    plazaId: 'plaza-sur',
    name: 'Cerrado',
    category: 'pizza',
    active: false,
  }),
]

export function catalogFixture(): Catalog {
  return buildCatalog(categoriesFixture, plazasFixture, placesFixture)
}
