import { describe, expect, it } from 'vitest'
import categories from '../../data/commercial/categories.json'
import places from '../../data/commercial/places.json'
import plazas from '../../data/commercial/plazas.json'
import extent from '../../data/geographic/extent.json'
import { buildCatalog } from '../data/catalog.ts'
import { isInsidePlazaGeometry } from '../data/relations.ts'
import { isGoogleMapsUrl } from '../data/rules.ts'
import type { Category, Place, Plaza } from '../types/domain.ts'
import { placeDirectionsUrl } from './maps-url.ts'

describe('enlaces «Cómo llegar» del dataset publicado', () => {
  const catalog = buildCatalog(
    categories.categories as Category[],
    plazas.plazas as Plaza[],
    places.places as Place[],
  )
  const [west, south, east, north] = extent.areaBbox as [number, number, number, number]

  it('cada lugar visible tiene un enlace de Google Maps válido que llega a su plaza en Zibatá', () => {
    expect(catalog.places.length).toBe(76)
    for (const place of catalog.places) {
      const plaza = catalog.plazaById.get(place.plazaId) as Plaza
      const url = placeDirectionsUrl(place, plaza)
      expect(isGoogleMapsUrl(url), place.id).toBe(true)
      if (place.googleMapsUri) continue
      const destination = new URL(url).searchParams.get('destination') ?? ''
      const [lat = Number.NaN, lng = Number.NaN] = destination.split(',').map(Number)
      const point = place.location ?? plaza.coordinates
      expect([lat, lng], place.id).toEqual([point.lat, point.lng])
      expect(lng >= west && lng <= east && lat >= south && lat <= north, place.id).toBe(true)
      if (!place.location)
        expect(isInsidePlazaGeometry({ lat, lng }, plaza.geometry), place.id).toBe(true)
    }
  })
})
