import { describe, expect, it } from 'vitest'
import { makePlace, makePlaza } from '../test/fixtures.ts'
import {
  directionsUrl,
  placeDirectionsUrl,
  plazaDirectionsUrl,
  telUrl,
  whatsappUrl,
} from './maps-url.ts'
import { buildHash, parseHash } from './url-state.ts'

describe('Google Maps', () => {
  const plaza = makePlaza({ id: 'plaza-norte', coordinates: { lat: 20.6793, lng: -100.315 } })

  it('usa las coordenadas de la plaza si el lugar no tiene propias', () => {
    const url = new URL(placeDirectionsUrl(makePlace({ id: 'x', plazaId: plaza.id }), plaza))
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/')
    expect(url.searchParams.get('api')).toBe('1')
    expect(url.searchParams.get('destination')).toBe('20.6793,-100.315')
    expect(url.searchParams.has('destination_place_id')).toBe(false)
  })

  it('prefiere coordenadas y googlePlaceId del lugar', () => {
    const place = makePlace({
      id: 'x',
      plazaId: plaza.id,
      location: { lat: 20.68, lng: -100.316 },
      googlePlaceId: 'ChIJabcdefghijk',
    })
    const url = new URL(placeDirectionsUrl(place, plaza))
    expect(url.searchParams.get('destination')).toBe('20.68,-100.316')
    expect(url.searchParams.get('destination_place_id')).toBe('ChIJabcdefghijk')
  })

  it('usa googleMapsUri tal cual cuando es un enlace de Google Maps', () => {
    const place = makePlace({
      id: 'x',
      plazaId: plaza.id,
      googleMapsUri: 'https://maps.app.goo.gl/abc123',
    })
    expect(placeDirectionsUrl(place, plaza)).toBe('https://maps.app.goo.gl/abc123')
  })

  it('ignora googleMapsUri que no son de Google', () => {
    const place = makePlace({
      id: 'x',
      plazaId: plaza.id,
      googleMapsUri: 'https://example.com/maps',
    })
    expect(placeDirectionsUrl(place, plaza)).toContain('https://www.google.com/maps/dir/')
  })

  it('genera enlaces de plaza, WhatsApp y teléfono', () => {
    expect(plazaDirectionsUrl(plaza)).toBe(directionsUrl(plaza.coordinates))
    expect(whatsappUrl('+52 442 123 4567')).toBe('https://wa.me/524421234567')
    expect(telUrl('+52 (442) 123-4567')).toBe('tel:+524421234567')
  })
})

describe('estado en la URL (hash)', () => {
  it('interpreta plaza, lugar y categoría', () => {
    expect(parseHash('#/plaza/paseo-zibata?categoria=pizza')).toEqual({
      plazaSlug: 'paseo-zibata',
      placeSlug: null,
      categoryId: 'pizza',
    })
    expect(parseHash('#/lugar/tomassa')).toEqual({
      plazaSlug: null,
      placeSlug: 'tomassa',
      categoryId: null,
    })
  })

  it('ignora rutas desconocidas o slugs inválidos', () => {
    expect(parseHash('')).toEqual({ plazaSlug: null, placeSlug: null, categoryId: null })
    expect(parseHash('#/plaza/<script>')).toEqual({
      plazaSlug: null,
      placeSlug: null,
      categoryId: null,
    })
    expect(parseHash('#/otra/cosa?categoria=A B')).toEqual({
      plazaSlug: null,
      placeSlug: null,
      categoryId: null,
    })
  })

  it('construye el hash y es reversible', () => {
    const state = { plazaSlug: 'condesa', placeSlug: null, categoryId: 'bistro' }
    expect(buildHash(state)).toBe('#/plaza/condesa?categoria=bistro')
    expect(parseHash(buildHash(state))).toEqual(state)
    expect(buildHash({ plazaSlug: 'condesa', placeSlug: 'bendito-bocado', categoryId: null })).toBe(
      '#/lugar/bendito-bocado',
    )
    expect(buildHash({ plazaSlug: null, placeSlug: null, categoryId: null })).toBe('#/')
  })
})
