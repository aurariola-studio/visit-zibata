import { describe, expect, it } from 'vitest'
import { makePlaza } from '../test/fixtures.ts'
import { directionsUrl, plazaDirectionsUrl, telUrl, whatsappUrl } from './maps-url.ts'
import { buildPath, parsePath, pathFromLegacyHash, type UrlState } from './url-state.ts'

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

const VACIO = {
  plazaSlug: null,
  placeSlug: null,
  categorySlug: null,
  infoTopic: null,
} satisfies Omit<UrlState, 'locale'>

/** Ninguna prueba usa la raíz: así se detecta cualquier ruta que se escriba sin la base. */
const BASE = '/visit-zibata/'

describe('estado en la URL · árbol español', () => {
  it('interpreta plaza, lugar y categoría', () => {
    expect(parsePath('/visit-zibata/plaza/paseo-zibata', '?categoria=italiana', BASE)).toEqual({
      ...VACIO,
      locale: 'es',
      plazaSlug: 'paseo-zibata',
      categorySlug: 'italiana',
    })
    expect(parsePath('/visit-zibata/lugar/tomassa', '', BASE)).toEqual({
      ...VACIO,
      locale: 'es',
      placeSlug: 'tomassa',
    })
  })

  it('cada página de información tiene su propia ruta', () => {
    expect(parsePath('/visit-zibata/info/privacidad', '', BASE).infoTopic).toBe('privacidad')
    expect(parsePath('/visit-zibata/info/sugerir', '', BASE).infoTopic).toBe('sugerir')
    // Un tema que no existe no abre nada.
    expect(parsePath('/visit-zibata/info/loquesea', '', BASE).infoTopic).toBeNull()
    expect(
      buildPath({ ...VACIO, locale: 'es', plazaSlug: 'condesa', infoTopic: 'acerca' }, BASE),
    ).toBe('/visit-zibata/info/acerca')
  })

  it('ignora rutas desconocidas o slugs inválidos', () => {
    const vacio = { ...VACIO, locale: 'es' }
    expect(parsePath('/visit-zibata/', '', BASE)).toEqual(vacio)
    expect(parsePath('/visit-zibata/plaza/<script>', '', BASE)).toEqual(vacio)
    expect(parsePath('/visit-zibata/otra/cosa', '?categoria=A B', BASE)).toEqual(vacio)
  })

  it('construye la ruta y es reversible', () => {
    const state: UrlState = {
      ...VACIO,
      locale: 'es',
      plazaSlug: 'condesa',
      categorySlug: 'bebidas',
    }
    expect(buildPath(state, BASE)).toBe('/visit-zibata/plaza/condesa?categoria=bebidas')
    expect(parsePath('/visit-zibata/plaza/condesa', '?categoria=bebidas', BASE)).toEqual(state)
    // El lugar manda sobre la plaza: su ficha ya dice a qué plaza pertenece.
    expect(
      buildPath(
        { ...VACIO, locale: 'es', plazaSlug: 'condesa', placeSlug: 'bendito-bocado' },
        BASE,
      ),
    ).toBe('/visit-zibata/lugar/bendito-bocado')
    expect(buildPath({ ...VACIO, locale: 'es' }, BASE)).toBe('/visit-zibata/')
  })
})

describe('estado en la URL · árbol inglés', () => {
  it('usa sus propios segmentos y su propio parámetro de filtro', () => {
    expect(buildPath({ ...VACIO, locale: 'en', placeSlug: 'tomassa' }, BASE)).toBe(
      '/visit-zibata/en/place/tomassa',
    )
    expect(
      buildPath(
        { ...VACIO, locale: 'en', plazaSlug: 'condesa', categorySlug: 'breakfast-and-coffee' },
        BASE,
      ),
    ).toBe('/visit-zibata/en/area/condesa?category=breakfast-and-coffee')
    expect(buildPath({ ...VACIO, locale: 'en', infoTopic: 'privacidad' }, BASE)).toBe(
      '/visit-zibata/en/info/privacy',
    )
    expect(buildPath({ ...VACIO, locale: 'en' }, BASE)).toBe('/visit-zibata/en/')
  })

  it('la URL dice el idioma, y es reversible', () => {
    const state: UrlState = {
      ...VACIO,
      locale: 'en',
      plazaSlug: 'condesa',
      categorySlug: 'drinks',
    }
    expect(parsePath('/visit-zibata/en/area/condesa', '?category=drinks', BASE)).toEqual(state)
    expect(parsePath(buildPath(state, BASE).split('?')[0] ?? '', '?category=drinks', BASE)).toEqual(
      state,
    )
  })

  it('no mezcla árboles: los segmentos del otro idioma no se interpretan', () => {
    // "lugar" no existe en el árbol inglés, así que no abre ninguna ficha.
    expect(parsePath('/visit-zibata/en/lugar/tomassa', '', BASE).placeSlug).toBeNull()
    // Y el parámetro español tampoco filtra en el árbol inglés.
    expect(parsePath('/visit-zibata/en/', '?categoria=italiana', BASE).categorySlug).toBeNull()
  })
})

describe('enlaces antiguos con hash', () => {
  it('se traducen a su ruta equivalente, conservando el filtro', () => {
    expect(pathFromLegacyHash('#/lugar/tomassa', BASE)).toBe('/visit-zibata/lugar/tomassa')
    expect(pathFromLegacyHash('#/plaza/condesa?categoria=bebidas', BASE)).toBe(
      '/visit-zibata/plaza/condesa?categoria=bebidas',
    )
    expect(pathFromLegacyHash('#/info/privacidad', BASE)).toBe('/visit-zibata/info/privacidad')
  })

  it('lo que no es un enlace antiguo reconocible se deja en paz', () => {
    expect(pathFromLegacyHash('', BASE)).toBeNull()
    expect(pathFromLegacyHash('#seccion', BASE)).toBeNull()
    expect(pathFromLegacyHash('#/otra/cosa', BASE)).toBeNull()
    expect(pathFromLegacyHash('#/plaza/<script>', BASE)).toBeNull()
  })
})
