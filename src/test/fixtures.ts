/**
 * Datos de prueba FICTICIOS (solo para tests). Usan exactamente la estructura de los datos reales.
 */
import { buildCatalog } from '../data/catalog.ts'
import type { Catalog, Category, Place, Plaza } from '../types/domain.ts'

export const categoriesFixture: Category[] = [
  {
    id: 'desayunos-y-cafe',
    slug: { es: 'desayunos-y-cafe', en: 'breakfast-and-coffee' },
    label: { es: 'Desayunos y café' },
    icon: 'coffee',
    order: 10,
    synonyms: ['café', 'cafetería', 'coffee', 'desayuno'],
    giros: [
      {
        id: 'cafeteria',
        label: { es: 'Cafetería' },
        icon: 'coffee',
        synonyms: ['café'],
        general: true,
      },
      {
        id: 'panaderia',
        label: { es: 'Panadería' },
        icon: 'croissant',
        synonyms: ['pan', 'bakery'],
      },
    ],
  },
  {
    id: 'tacos-y-antojitos',
    slug: { es: 'tacos-y-antojitos', en: 'tacos-and-street-food' },
    label: { es: 'Tacos y antojitos' },
    icon: 'taco',
    order: 30,
    synonyms: ['tacos', 'taquería', 'pastor'],
    giros: [
      {
        id: 'taqueria',
        label: { es: 'Taquería' },
        icon: 'taco',
        synonyms: ['tacos'],
        general: true,
      },
    ],
  },
  {
    id: 'pizza',
    slug: { es: 'pizza', en: 'pizza' },
    label: { es: 'Pizza' },
    icon: 'pizza',
    order: 70,
    synonyms: ['pizzería'],
    giros: [
      { id: 'pizza', label: { es: 'Pizza' }, icon: 'pizza', synonyms: ['pizzería'], general: true },
    ],
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
    description: { es: 'Plaza de prueba', en: 'Test plaza' },
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
    giros: ['pizza'],
    secundarios: [],
    description: null,
    hours: null,
    location: null,
    googleMapsUri: null,
    googlePlaceId: null,
    phone: null,
    photos: [],
    links: { website: null, instagram: null, facebook: null, tiktok: null, whatsapp: null },
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
    giros: ['cafeteria'],
  }),
  makePlace({
    id: 'tacos-el-farol',
    plazaId: 'plaza-norte',
    name: 'Tacos El Farol',
    giros: ['taqueria'],
  }),
  makePlace({
    id: 'pizza-norte',
    plazaId: 'plaza-norte',
    name: 'Pizzería Norte',
    giros: ['pizza'],
  }),
  makePlace({
    id: 'panaderia-trigo',
    plazaId: 'plaza-sur',
    name: 'Trigo',
    giros: ['panaderia'],
    description: { es: 'Pan de masa madre y café de especialidad.' },
  }),
  makePlace({
    id: 'cerrado-hace-tiempo',
    plazaId: 'plaza-sur',
    name: 'Cerrado',
    giros: ['pizza'],
    active: false,
  }),
]

export function catalogFixture(): Catalog {
  return buildCatalog(categoriesFixture, plazasFixture, placesFixture)
}
