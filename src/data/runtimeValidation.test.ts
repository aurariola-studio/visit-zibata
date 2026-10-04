import { describe, expect, it, vi } from 'vitest'
import categories from '../../data/commercial/categories.json'
import places from '../../data/commercial/places.json'
import plazas from '../../data/commercial/plazas.json'
import {
  categoriesFixture,
  makePlace,
  makePlaza,
  placesFixture,
  plazasFixture,
} from '../test/fixtures.ts'
import { loadCatalog, sanitizeDataset } from './catalog.ts'
import type { PlacesRepository } from './PlacesRepository.ts'
import { validateCategories, validatePlaces, validatePlazas } from './runtimeValidation.ts'
import { CategorySchema, PlaceSchema, PlazaSchema } from './schemas.ts'

const bounds = { west: -100.37, south: 20.65, east: -100.29, north: 20.705 }
const place = makePlace({ id: 'cafe-ejemplo', plazaId: 'plaza-norte' })
const plaza = makePlaza({ id: 'plaza-ejemplo' })
const links = place.links

// Cada variante debe ser aceptada o rechazada igual por Zod (build) y por la validación de runtime.
const placeVariants: [string, unknown][] = [
  ['válido', place],
  [
    'con horario, fotos y enlaces',
    {
      ...place,
      hours: { mon: ['08:00-22:00'], sun: [], note: 'Festivos varía' },
      photos: [
        {
          src: 'images/x.webp',
          alt: 'Fachada',
          width: 800,
          variants: [480],
          placeholder: '#aabbcc',
        },
      ],
      links: { ...links, website: 'https://example.com', whatsapp: '+524421234567' },
      googleMapsUri: 'https://maps.app.goo.gl/abc',
      phone: '+524421234567',
    },
  ],
  ['id con mayúsculas', { ...place, id: 'Café' }],
  ['nombre vacío', { ...place, name: '  ' }],
  ['enlace javascript:', { ...place, links: { ...links, website: 'javascript:alert(1)' } }],
  ['enlace data:', { ...place, links: { ...links, instagram: 'data:text/html,x' } }],
  ['enlace relativo', { ...place, links: { ...links, facebook: '/perfil' } }],
  ['whatsapp sin formato', { ...place, links: { ...links, whatsapp: '442 123' } }],
  ['latitud imposible', { ...place, location: { lat: 120, lng: 0 } }],
  ['Maps de otro dominio', { ...place, googleMapsUri: 'https://example.com' }],
  ['Maps por http', { ...place, googleMapsUri: 'http://maps.google.com' }],
  ['teléfono local', { ...place, phone: '442 123 4567' }],
  ['horario mal formado', { ...place, hours: { mon: ['8:00-22:00'] } }],
  ['horario de rango nulo', { ...place, hours: { mon: ['10:00-10:00'] } }],
  ['día desconocido', { ...place, hours: { lunes: ['10:00-12:00'] } }],
  ['foto con ruta absoluta', { ...place, photos: [{ src: '/x.webp', alt: 'x' }] }],
  ['foto por http', { ...place, photos: [{ src: 'http://cdn.com/x.webp', alt: 'x' }] }],
  ['foto javascript:', { ...place, photos: [{ src: 'javascript:alert(1)', alt: 'x' }] }],
  ['foto sin alt', { ...place, photos: [{ src: 'images/x.webp', alt: '' }] }],
  ['active texto', { ...place, active: 'yes' }],
  ['sin links', { ...place, links: undefined }],
  ['no objeto', 'cafe'],
]

describe('validación de runtime', () => {
  it.each(placeVariants)('coincide con Zod para un local: %s', (_label, record) => {
    const { valid } = validatePlaces([record])
    expect(valid.length === 1).toBe(PlaceSchema.safeParse(record).success)
  })

  it.each<[string, unknown]>([
    ['válida', plaza],
    ['sin geometría', { ...plaza, geometry: null }],
    [
      'anillo corto',
      {
        ...plaza,
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 1],
            ],
          ],
        },
      },
    ],
    ['tipo desconocido', { ...plaza, geometry: { type: 'Point', coordinates: [0, 0] } }],
    ['confianza inválida', { ...plaza, locationConfidence: 'total' }],
    ['coordenadas texto', { ...plaza, coordinates: { lat: '20', lng: -100 } }],
  ])('coincide con Zod para una plaza: %s', (_label, record) => {
    expect(validatePlazas([record]).valid.length === 1).toBe(PlazaSchema.safeParse(record).success)
  })

  it.each<[string, unknown]>([
    ['válida', categoriesFixture[0]],
    ['sin etiqueta', { ...categoriesFixture[0], label: { es: '' } }],
    ['orden decimal', { ...categoriesFixture[0], order: 1.5 }],
    ['giro roto', { ...categoriesFixture[0], giros: [{ id: 'X' }] }],
  ])('coincide con Zod para una categoría: %s', (_label, record) => {
    expect(validateCategories([record]).valid.length === 1).toBe(
      CategorySchema.safeParse(record).success,
    )
  })

  it('omite solo el registro inválido o duplicado y conserva el resto', () => {
    const { valid, issues } = validatePlaces([
      place,
      { ...place, id: 'roto', links: { ...links, website: 'javascript:x' } },
      place,
    ])
    expect(valid).toEqual([place])
    expect(issues.map((issue) => issue.message)).toEqual([
      'links: enlace no válido',
      'identificador duplicado',
    ])
  })

  it('los datos reales pasan íntegros', () => {
    expect(validateCategories(categories.categories).issues).toEqual([])
    expect(validatePlazas(plazas.plazas).issues).toEqual([])
    expect(validatePlaces(places.places).issues).toEqual([])
  })
})

describe('sanitizeDataset y loadCatalog', () => {
  const dataset = { categories: categoriesFixture, plazas: plazasFixture, places: placesFixture }
  const verification = {
    status: 'closed' as const,
    confidence: 'high' as const,
    lastVerifiedAt: '2026-09-14',
    sources: ['https://example.com'],
  }

  it('un conjunto coherente queda intacto', () => {
    expect(sanitizeDataset(dataset, bounds)).toEqual({ dataset, notes: [] })
  })

  it('omite o corrige registros con relaciones rotas sin bloquear el resto', () => {
    const broken = {
      ...dataset,
      places: [
        ...placesFixture,
        makePlace({ id: 'huerfano', plazaId: 'plaza-fantasma' }),
        makePlace({ id: 'sin-giro', plazaId: 'plaza-norte', giros: ['sushi'] }),
        makePlace({ id: 'lejos', plazaId: 'plaza-norte', location: { lat: 19.4, lng: -99.1 } }),
        makePlace({ id: 'giro-ajeno', plazaId: 'plaza-norte', giros: ['pizza', 'sushi'] }),
        makePlace({ id: 'cerrado', plazaId: 'plaza-norte', verification }),
      ],
    }
    const { dataset: clean, notes } = sanitizeDataset(broken, bounds)
    expect(clean.places.map((p) => p.id)).toEqual([
      ...placesFixture.map((p) => p.id),
      'lejos',
      'giro-ajeno',
    ])
    expect(clean.places.find((p) => p.id === 'lejos')?.location).toBeNull()
    // El giro que no existe se cae y el local se queda con los que sí.
    expect(clean.places.find((p) => p.id === 'giro-ajeno')?.giros).toEqual(['pizza'])
    expect(notes).toHaveLength(5)
  })

  it('loadCatalog muestra la guía con registros rotos y pone al final los locales ausentes de placeIds', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const repository: PlacesRepository = {
      getCategories: async () => categoriesFixture,
      getPlazas: async () => [
        ...plazasFixture,
        makePlaza({ id: 'fuera', coordinates: { lat: 0, lng: 0 } }),
      ],
      getPlaces: async () => [
        ...placesFixture,
        makePlace({ id: 'nuevo', plazaId: 'plaza-norte' }),
        makePlace({ id: 'huerfano', plazaId: 'fuera' }),
      ],
    }
    const catalog = await loadCatalog(repository)
    expect(catalog.plazaById.has('fuera')).toBe(false)
    expect(catalog.placesByPlaza.get('plaza-norte')?.map((p) => p.id)).toEqual([
      'cafe-aurora',
      'tacos-el-farol',
      'pizza-norte',
      'nuevo',
    ])
    expect(warn).toHaveBeenCalledTimes(2)
    warn.mockRestore()
  })

  it('loadCatalog falla si no queda ninguna plaza válida', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const repository: PlacesRepository = {
      getCategories: async () => categoriesFixture,
      getPlazas: async () => [makePlaza({ id: 'fuera', coordinates: { lat: 0, lng: 0 } })],
      getPlaces: async () => [],
    }
    await expect(loadCatalog(repository)).rejects.toThrow('No hay datos comerciales válidos')
    warn.mockRestore()
  })
})
