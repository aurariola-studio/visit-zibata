import { describe, expect, it } from 'vitest'
import categories from '../../data/commercial/categories.json'
import places from '../../data/commercial/places.json'
import plazas from '../../data/commercial/plazas.json'
import extent from '../../data/geographic/extent.json'
import { buildCatalog } from '../data/catalog.ts'
import { isInsidePlazaGeometry } from '../data/relations.ts'
import { isGoogleMapsUrl } from '../data/rules.ts'
import type { Category, LatLng, Place, Plaza } from '../types/domain.ts'
import { placeDirections, plazaDirectionsUrl } from './maps-url.ts'

const metresBetween = (a: LatLng, b: LatLng) => {
  const dx = (a.lng - b.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180)
  const dy = (a.lat - b.lat) * 111_320
  return Math.hypot(dx, dy)
}

describe('enlaces "Cómo llegar" del dataset publicado', () => {
  const catalog = buildCatalog(
    categories.categories as Category[],
    plazas.plazas as Plaza[],
    places.places as Place[],
  )
  const [west, south, east, north] = extent.areaBbox as [number, number, number, number]

  it('cada lugar visible lleva a su plaza con un enlace de Google Maps válido', () => {
    expect(catalog.places.length).toBeGreaterThan(0)
    for (const place of catalog.places) {
      const plaza = catalog.plazaById.get(place.plazaId) as Plaza
      const url = plazaDirectionsUrl(plaza)
      expect(isGoogleMapsUrl(url), place.id).toBe(true)
      if (plaza.googleMapsUri) {
        // Enlace aportado y comprobado por el propietario: se usa tal cual, sin reconstruir nada.
        expect(url, place.id).toBe(plaza.googleMapsUri)
        continue
      }
      const destination = new URL(url).searchParams.get('destination') ?? ''
      if (plaza.address) {
        // El destino nombra la plaza y su dirección: Google no lo rotula con un local de dentro.
        expect(destination, place.id).toBe(`${plaza.name}, ${plaza.address}`)
        continue
      }
      // Sin dirección publicada, coordenadas: siempre dentro del polígono de la plaza y del área.
      const [lat = Number.NaN, lng = Number.NaN] = destination.split(',').map(Number)
      expect([lat, lng], place.id).toEqual([plaza.coordinates.lat, plaza.coordinates.lng])
      expect(lng >= west && lng <= east && lat >= south && lat <= north, place.id).toBe(true)
      expect(isInsidePlazaGeometry({ lat, lng }, plaza.geometry), place.id).toBe(true)
    }
  })

  it('todas las plazas activas con dirección publicada usan nombre + dirección', () => {
    const active = catalog.plazas.filter((plaza) => plaza.active && !plaza.googleMapsUri)
    const withAddress = active.filter((plaza) => plaza.address)
    expect(withAddress.length).toBeGreaterThanOrEqual(active.length - 1)
    for (const plaza of withAddress) {
      const destination = new URL(plazaDirectionsUrl(plaza)).searchParams.get('destination')
      expect(destination, plaza.id).toBe(`${plaza.name}, ${plaza.address}`)
    }
  })

  it('un local solo lleva a su propia puerta si su ubicación está verificada', () => {
    for (const place of catalog.places) {
      const plaza = catalog.plazaById.get(place.plazaId) as Plaza
      const { url, toPlace } = placeDirections(place, plaza)
      if (place.googleMapsUri) {
        expect(toPlace, place.id).toBe(true)
        expect(url, place.id).toBe(place.googleMapsUri)
        // Una ubicación propia cae en su plaza, no a kilómetros: si no, el enlace es de otra
        // sucursal. Se mide contra el punto de la plaza porque su polígono es aproximado.
        expect(place.location, place.id).not.toBeNull()
        expect(metresBetween(place.location as LatLng, plaza.coordinates), place.id).toBeLessThan(
          250,
        )
      } else {
        expect(toPlace, place.id).toBe(false)
        expect(url, place.id).toBe(plazaDirectionsUrl(plaza))
      }
    }
    expect(catalog.places.some((place) => place.googleMapsUri)).toBe(true)
  })
})
