/**
 * Enlaces externos a Google Maps (solo navegación: el mapa del producto es MapLibre).
 * Funciona sin googlePlaceId y sin coordenadas propias del local (usa las de su plaza).
 * https://developers.google.com/maps/documentation/urls/get-started
 */
import { isGoogleMapsUrl } from '../data/rules.ts'
import type { LatLng, Place, Plaza } from '../types/domain.ts'

const DIRECTIONS = 'https://www.google.com/maps/dir/?api=1'

export function directionsUrl(destination: LatLng, placeId?: string | null): string {
  const params = new URLSearchParams({ destination: `${destination.lat},${destination.lng}` })
  if (placeId) params.set('destination_place_id', placeId)
  return `${DIRECTIONS}&${params.toString()}`
}

export function placeDirectionsUrl(place: Place, plaza: Plaza): string {
  if (place.googleMapsUri && isGoogleMapsUrl(place.googleMapsUri)) return place.googleMapsUri
  return directionsUrl(place.location ?? plaza.coordinates, place.googlePlaceId)
}

export function plazaDirectionsUrl(plaza: Plaza): string {
  return directionsUrl(plaza.coordinates)
}

export function whatsappUrl(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}`
}

export function telUrl(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}
