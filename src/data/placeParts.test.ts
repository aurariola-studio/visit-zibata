import { describe, expect, it } from 'vitest'
import type { Place } from '../types/domain.ts'
import { sanitizeDataset } from './catalog.ts'
import { PLACE_DETAIL_KEYS } from './placeFields.ts'
import { joinPlaces, mergePlace, projectDetail, projectSummary } from './placeParts.ts'

const limites = { west: -101, south: 20, east: -100, north: 21 }

function lugar(id: string, extra: Partial<Place> = {}): Place {
  return {
    id,
    slug: id,
    name: `Local ${id}`,
    plazaId: 'plaza-uno',
    giros: ['giro-uno'],
    description: { es: 'Descripción inventada.', en: 'Invented description.' },
    hours: { mon: ['09:00-18:00'] },
    location: { lat: 20.5, lng: -100.5 },
    googleMapsUri: null,
    googlePlaceId: null,
    phone: null,
    photos: [],
    links: { website: 'https://example.com/' },
    active: true,
    verification: {
      status: 'active',
      confidence: 'high',
      lastVerifiedAt: '2026-11-20',
      sources: ['campo:2026-11-20'],
    },
    ...extra,
  } as Place
}

describe('proyección de un local', () => {
  it('el resumen no lleva nada del detalle y el detalle no lleva nada del resumen', () => {
    const resumen = projectSummary(lugar('uno'))
    const detalle = projectDetail(lugar('uno'))
    for (const clave of PLACE_DETAIL_KEYS) expect(resumen).not.toHaveProperty(clave)
    expect(detalle).not.toHaveProperty('hours')
    expect(detalle).not.toHaveProperty('giros')
    expect(resumen.verification).toEqual({ status: 'active' })
    expect(detalle.verification).toEqual({ confidence: 'high', lastVerifiedAt: '2026-11-20' })
  })

  it('las fuentes no viajan en ninguna de las dos piezas', () => {
    const texto = JSON.stringify([projectSummary(lugar('uno')), projectDetail(lugar('uno'))])
    expect(texto).not.toContain('sources')
    expect(texto).not.toContain('campo:')
  })

  it('un local sin verificación ni cierre no inventa esas claves', () => {
    const sinNada = lugar('dos')
    delete sinNada.verification
    expect(projectSummary(sinNada)).not.toHaveProperty('verification')
    expect(projectSummary(sinNada)).not.toHaveProperty('cierre')
    expect(projectDetail(sinNada)).not.toHaveProperty('verification')
  })

  it('un cierre temporal viaja en el resumen, que es donde lo lee la tarjeta', () => {
    const cerrado = lugar('tres', { cierre: { motivo: 'vacaciones', desde: '2026-11-01' } })
    expect(projectSummary(cerrado).cierre).toEqual({ motivo: 'vacaciones', desde: '2026-11-01' })
  })
})

describe('unir resumen y detalle', () => {
  it('juntos dan el local original, salvo las fuentes, que van vacías', () => {
    const original = lugar('uno')
    const unido = mergePlace(projectSummary(original), projectDetail(original))
    expect(unido).toEqual({
      ...original,
      verification: { ...original.verification, sources: [] },
    })
  })

  it('un detalle sin resumen se descarta con aviso', () => {
    const { places, notes } = joinPlaces(
      [projectSummary(lugar('uno'))],
      [projectDetail(lugar('uno')), projectDetail(lugar('huerfano'))],
    )
    expect(places.map((place) => place.id)).toEqual(['uno'])
    expect(notes).toEqual(['detalle [huerfano] omitido: no tiene resumen'])
  })

  it('un resumen sin detalle se carga sin descripción ni enlaces, con aviso', () => {
    const { places, notes } = joinPlaces([projectSummary(lugar('uno'))], [])
    expect(places[0]).toMatchObject({ id: 'uno', description: null, links: {}, phone: null })
    expect(places[0]?.googleMapsUri).toBeNull()
    expect(notes).toHaveLength(1)
  })

  it('el estado de verificación sale del resumen aunque el detalle falte', () => {
    const quitado = lugar('quitado', {
      verification: {
        status: 'removed',
        confidence: 'high',
        lastVerifiedAt: '2026-11-20',
        sources: [],
      },
    })
    const { places } = joinPlaces([projectSummary(quitado)], [])
    expect(places[0]?.verification?.status).toBe('removed')
  })

  it('un local marcado como no publicable sigue fuera de la guía aunque su detalle falte o venga sin verificación', () => {
    const quitado = lugar('quitado', {
      verification: {
        status: 'removed',
        confidence: 'high',
        lastVerifiedAt: '2026-11-20',
        sources: [],
      },
    })
    const bueno = lugar('bueno')
    const detalleSinVerificacion = { ...projectDetail(quitado), verification: undefined }
    const { places } = joinPlaces(
      [projectSummary(quitado), projectSummary(bueno)],
      [detalleSinVerificacion, projectDetail(bueno)],
    )
    const { dataset, notes } = sanitizeDataset(
      {
        categories: [{ id: 'cat', giros: [{ id: 'giro-uno' }] }] as never,
        plazas: [
          { id: 'plaza-uno', slug: 'plaza-uno', coordinates: { lat: 20.5, lng: -100.5 } },
        ] as never,
        places,
      },
      limites,
    )
    expect(dataset.places.map((place) => place.id)).toEqual(['bueno'])
    expect(notes.join(' ')).toContain('no publicable')
  })
})
