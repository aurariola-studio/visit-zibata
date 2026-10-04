import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * El mapa (public/map) se genera aparte del dataset (`npm run map:build`). Si se añade una plaza y no se
 * regenera, aparece en la lista pero en el mapa es un polígono plano sin volumen (Plaza Luna, 2026-09).
 */
const read = <T>(path: string): T =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as T
const plazas = read<{ plazas: { id: string }[] }>('../../data/commercial/plazas.json')

describe('mapa generado al día con el dataset', () => {
  const buildings = read<{ features: { properties: { plazaId: string } }[] }>(
    '../../public/map/plaza-buildings.geojson',
  )
  const withVolume = new Set(buildings.features.map((feature) => feature.properties.plazaId))

  it('cada plaza tiene volumen en el mapa (real o generado)', () => {
    const missing = plazas.plazas.filter((plaza) => !withVolume.has(plaza.id)).map((p) => p.id)
    expect(missing, 'ejecuta `npm run map:build`').toEqual([])
  })

  it('el mapa no conserva plazas que ya no existen en el dataset', () => {
    const ids = new Set(plazas.plazas.map((plaza) => plaza.id))
    expect([...withVolume].filter((id) => !ids.has(id))).toEqual([])
  })
})
