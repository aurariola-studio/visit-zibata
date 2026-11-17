/**
 * Una plaza apagada y sin verificar. Las pruebas de activar plazas necesitan una y el dataset real no tiene
 * por qué traerla: apagada, sin ser un "próximamente" y con estado `uncertain`. Antes la daba una plaza real
 * (FoodTrucks Pickleball) y, al activarse esa, las pruebas se pusieron en rojo sin que nada hubiera fallado.
 */
export const ZONA_APAGADA = {
  id: 'zona-apagada-de-prueba',
  slug: 'zona-apagada-de-prueba',
  name: 'Zona apagada de prueba',
  description: null,
  address: null,
  coordinates: { lat: 20.6799, lng: -100.3158 },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-100.31588, 20.680137],
        [-100.315535, 20.679893],
        [-100.31572, 20.679663],
        [-100.316065, 20.679907],
        [-100.31588, 20.680137],
      ],
    ],
  },
  active: false,
  placeIds: [],
  categories: [],
  locationConfidence: 'low',
  locationSource: 'Dato de prueba.',
  verification: {
    status: 'uncertain',
    confidence: 'low',
    lastVerifiedAt: '2026-01-01',
    sources: ['https://example.com/'],
  },
} as const

/** El JSON de plazas con la zona apagada de prueba al final. */
export function conZonaApagada<T extends { plazas: readonly unknown[] }>(json: T) {
  return { ...json, plazas: [...json.plazas, ZONA_APAGADA] }
}
