import { describe, expect, it } from 'vitest'
import type { Place } from '../types/domain.ts'
import { sanitizeDataset } from './catalog.ts'
import { PLACE_DETAIL_KEYS } from './placeFields.ts'
import { projectDetail, projectSummary } from './placeParts.ts'

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
    for (const clave of ['hours', 'giros', 'location', 'photos', 'verification']) {
      expect(detalle).not.toHaveProperty(clave)
    }
    expect(Object.keys(detalle).sort()).toEqual(['id', ...PLACE_DETAIL_KEYS].sort())
  })

  it('de verification solo viajan el estado y la fecha de revisión', () => {
    expect(projectSummary(lugar('uno')).verification).toEqual({
      status: 'active',
      lastVerifiedAt: '2026-11-20',
    })
  })

  it('las fuentes y la confianza no viajan en ninguna de las dos piezas', () => {
    const texto = JSON.stringify([projectSummary(lugar('uno')), projectDetail(lugar('uno'))])
    expect(texto).not.toContain('sources')
    expect(texto).not.toContain('campo:')
    expect(texto).not.toContain('confidence')
  })

  it('un local sin verificación ni cierre no inventa esas claves', () => {
    const sinNada = lugar('dos')
    delete sinNada.verification
    expect(projectSummary(sinNada)).not.toHaveProperty('verification')
    expect(projectSummary(sinNada)).not.toHaveProperty('cierre')
  })

  it('un cierre temporal viaja en el resumen, que es donde lo lee la tarjeta', () => {
    const cerrado = lugar('tres', { cierre: { motivo: 'vacaciones', desde: '2026-11-01' } })
    expect(projectSummary(cerrado).cierre).toEqual({ motivo: 'vacaciones', desde: '2026-11-01' })
  })

  it('un local no publicable sigue fuera de la guía solo con su resumen: el estado viaja ahí', () => {
    const quitado = lugar('quitado', {
      verification: {
        status: 'removed',
        confidence: 'high',
        lastVerifiedAt: '2026-11-20',
        sources: [],
      },
    })
    const { dataset, notes } = sanitizeDataset(
      {
        categories: [{ id: 'cat', giros: [{ id: 'giro-uno' }] }] as never,
        plazas: [
          { id: 'plaza-uno', slug: 'plaza-uno', coordinates: { lat: 20.5, lng: -100.5 } },
        ] as never,
        places: [projectSummary(quitado), projectSummary(lugar('bueno'))],
      },
      limites,
    )
    expect(dataset.places.map((place) => place.id)).toEqual(['bueno'])
    expect(notes.join(' ')).toContain('no publicable')
  })
})
