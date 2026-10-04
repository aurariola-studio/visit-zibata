/**
 * Enlaces externos a Google Maps (solo navegación: el mapa del producto es MapLibre).
 * El destino es la plaza salvo que el local tenga una ubicación propia verificada: una ruta que termina
 * en el sitio equivocado es peor que una que deja en la plaza correcta.
 * https://developers.google.com/maps/documentation/urls/get-started
 */
import type { LatLng, Place, Plaza } from '../types/domain.ts'

const DIRECTIONS = 'https://www.google.com/maps/dir/?api=1'

export function directionsUrl(destination: LatLng): string {
  const params = new URLSearchParams({ destination: `${destination.lat},${destination.lng}` })
  return `${DIRECTIONS}&${params.toString()}`
}

/**
 * Con un destino en coordenadas, Google lo rotula con el negocio más cercano y la ruta parece llevar a
 * un local suelto dentro de la plaza. Con el nombre y la dirección, el destino es la plaza. Si la plaza
 * no tiene dirección publicada se vuelve a las coordenadas, que siempre existen.
 */
export function plazaDirectionsUrl(plaza: Plaza): string {
  // Enlace aportado y comprobado a mano: es el sitio exacto, mejor que cualquier búsqueda.
  if (plaza.googleMapsUri) return plaza.googleMapsUri
  if (!plaza.address) return directionsUrl(plaza.coordinates)
  const params = new URLSearchParams({ destination: `${plaza.name}, ${plaza.address}` })
  return `${DIRECTIONS}&${params.toString()}`
}

/**
 * "Cómo llegar" desde la ficha de un local: a su puerta solo si su ubicación está verificada y es la
 * actual (el dataset solo trae `googleMapsUri` en ese caso); si no, a la plaza.
 */
export function placeDirections(place: Place, plaza: Plaza): { url: string; toPlace: boolean } {
  if (place.googleMapsUri) return { url: place.googleMapsUri, toPlace: true }
  return { url: plazaDirectionsUrl(plaza), toPlace: false }
}

export function whatsappUrl(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}`
}

export function telUrl(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}
