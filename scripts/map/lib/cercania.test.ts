import { describe, expect, it } from 'vitest'
import type { Plaza } from '../../../src/types/domain.ts'
import { conCercania } from './cercania.ts'

/** Un cuadrado de unos 100 m de lado alrededor de un centro, en grados. */
const zona = (id: string, lng: number, extra: Partial<Plaza> = {}): Plaza => ({
  id,
  slug: id,
  name: id,
  description: null,
  address: null,
  coordinates: { lat: 20.68, lng },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [lng - 0.0005, 20.6795],
        [lng + 0.0005, 20.6795],
        [lng + 0.0005, 20.6805],
        [lng - 0.0005, 20.6805],
        [lng - 0.0005, 20.6795],
      ],
    ],
  },
  active: true,
  placeIds: [],
  categories: [],
  locationConfidence: 'high',
  locationSource: 'prueba',
  ...extra,
})

const punto = (lng: number): Plaza => ({
  ...zona('punto-inventado', lng),
  geometry: undefined,
  tipo: 'punto',
})

const cercaDe = (plazas: Plaza[]) => conCercania(plazas).find((p) => p.tipo === 'punto')?.cerca

describe('cercanía de un punto de interés', () => {
  it('mide hasta el borde de la zona más cercana, redondeado a 10 m', () => {
    // El borde este de "cerca" queda a 0,0015° de longitud: unos 156 m a esta latitud.
    const cerca = cercaDe([zona('lejos', -100.33), zona('cerca', -100.32), punto(-100.318)])
    expect(cerca?.plazaId).toBe('cerca')
    expect(cerca?.metros).toBe(160)
  })

  it('no cuenta zonas apagadas, "próximamente" ni otros puntos', () => {
    const cerca = cercaDe([
      zona('apagada', -100.318, { active: false }),
      zona('pronto', -100.318, { comingSoon: true }),
      { ...punto(-100.318), id: 'otro-punto' },
      zona('abierta', -100.33),
      punto(-100.318),
    ])
    expect(cerca?.plazaId).toBe('abierta')
  })

  it('dentro del contorno no dice cero', () => {
    expect(cercaDe([zona('encima', -100.32), punto(-100.32)])?.metros).toBe(10)
  })

  it('sin zonas abiertas no dice nada y no toca las zonas', () => {
    expect(cercaDe([punto(-100.32)])).toBeUndefined()
    const sola = zona('sola', -100.32)
    expect(conCercania([sola])).toEqual([sola])
  })
})
