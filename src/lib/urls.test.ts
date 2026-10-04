import { describe, expect, it } from 'vitest'
import { makePlaza } from '../test/fixtures.ts'
import { directionsUrl, plazaDirectionsUrl, telUrl, whatsappUrl } from './maps-url.ts'
import { buildHash, parseHash } from './url-state.ts'

describe('Google Maps', () => {
  const plaza = makePlaza({ id: 'plaza-norte', coordinates: { lat: 20.6793, lng: -100.315 } })

  it('sin dirección publicada lleva a las coordenadas de la plaza', () => {
    const url = new URL(plazaDirectionsUrl(plaza))
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/')
    expect(url.searchParams.get('api')).toBe('1')
    expect(url.searchParams.get('destination')).toBe('20.6793,-100.315')
    expect(url.searchParams.has('destination_place_id')).toBe(false)
  })

  it('con dirección lleva a la plaza por nombre, no a un local de dentro', () => {
    const withAddress = makePlaza({
      id: 'plaza-norte',
      name: 'Plaza Norte',
      address: 'Av. Paseo de las Pitahayas 9-B, Zibatá',
      coordinates: { lat: 20.6793, lng: -100.315 },
    })
    const url = new URL(plazaDirectionsUrl(withAddress))
    expect(url.searchParams.get('destination')).toBe(
      'Plaza Norte, Av. Paseo de las Pitahayas 9-B, Zibatá',
    )
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
      infoTopic: null,
    })
    expect(parseHash('#/lugar/tomassa')).toEqual({
      plazaSlug: null,
      placeSlug: 'tomassa',
      categoryId: null,
      infoTopic: null,
    })
  })

  it('cada página de información tiene su propia ruta', () => {
    expect(parseHash('#/info/privacidad').infoTopic).toBe('privacidad')
    expect(parseHash('#/info/sugerir').infoTopic).toBe('sugerir')
    // Un tema que no existe no abre nada.
    expect(parseHash('#/info/loquesea').infoTopic).toBeNull()
    expect(
      buildHash({ plazaSlug: 'condesa', placeSlug: null, categoryId: null, infoTopic: 'acerca' }),
    ).toBe('#/info/acerca')
  })

  it('ignora rutas desconocidas o slugs inválidos', () => {
    const empty = { plazaSlug: null, placeSlug: null, categoryId: null, infoTopic: null }
    expect(parseHash('')).toEqual(empty)
    expect(parseHash('#/plaza/<script>')).toEqual(empty)
    expect(parseHash('#/otra/cosa?categoria=A B')).toEqual(empty)
  })

  it('construye el hash y es reversible', () => {
    const state = {
      plazaSlug: 'condesa',
      placeSlug: null,
      categoryId: 'bar-y-botana',
      infoTopic: null,
    }
    expect(buildHash(state)).toBe('#/plaza/condesa?categoria=bar-y-botana')
    expect(parseHash(buildHash(state))).toEqual(state)
    expect(
      buildHash({
        plazaSlug: 'condesa',
        placeSlug: 'bendito-bocado',
        categoryId: null,
        infoTopic: null,
      }),
    ).toBe('#/lugar/bendito-bocado')
    expect(buildHash({ plazaSlug: null, placeSlug: null, categoryId: null, infoTopic: null })).toBe(
      '#/',
    )
  })
})
