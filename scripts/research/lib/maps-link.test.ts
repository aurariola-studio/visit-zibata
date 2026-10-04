import { describe, expect, it } from 'vitest'
import { coordinatesFromMapsUrl } from './maps-link.ts'

describe('coordinatesFromMapsUrl', () => {
  it('prefiere el pin del lugar al centro de la vista', () => {
    const url =
      'https://www.google.com/maps/place/Smoothie+Lab/@20.6853,-100.3260,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d20.6851989!4d-100.3253168'
    expect(coordinatesFromMapsUrl(url)).toEqual({ lat: 20.685199, lng: -100.325317 })
  })

  it('usa el centro si no hay pin y devuelve null si no hay coordenadas', () => {
    expect(coordinatesFromMapsUrl('https://www.google.com/maps/@20.68,-100.32,15z')).toEqual({
      lat: 20.68,
      lng: -100.32,
    })
    expect(coordinatesFromMapsUrl('https://maps.app.goo.gl/abc')).toBeNull()
  })
})
