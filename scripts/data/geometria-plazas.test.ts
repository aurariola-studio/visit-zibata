import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { validarContornoDePlaza } from '../../src/data/geometria.ts'

/**
 * El guardián: las reglas son bloqueantes porque las 15 plazas que hay hoy las cumplen todas. Si una
 * regla nueva rechaza una plaza real, la regla está mal (o el dato) y se decide aquí, no en producción.
 */
describe('las plazas reales cumplen las reglas', () => {
  const plazas = (
    JSON.parse(readFileSync('data/commercial/plazas.json', 'utf8')) as {
      plazas: {
        id: string
        geometry: { type: string; coordinates: number[][][] }
        coordinates: { lat: number; lng: number }
      }[]
    }
  ).plazas
  const extent = JSON.parse(readFileSync('data/geographic/extent.json', 'utf8')) as {
    boundary: { coordinates: number[][][] }
  }
  const contorno = extent.boundary.coordinates[0] ?? []

  it('hay plazas que comprobar', () => {
    expect(plazas.length).toBeGreaterThan(10)
  })

  for (const plaza of plazas) {
    it(`${plaza.id}`, () => {
      const otras = plazas
        .filter((otra) => otra.id !== plaza.id)
        .map((otra) => ({ id: otra.id, anillo: otra.geometry.coordinates[0] ?? [] }))
      expect(
        validarContornoDePlaza(plaza.geometry, { contorno, marcador: plaza.coordinates, otras }),
      ).toEqual([])
    })
  }
})
