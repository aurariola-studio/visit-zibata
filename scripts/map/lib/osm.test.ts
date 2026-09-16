// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { assembleRings, elementToFeature, isAreaWay, overpassToFeatures } from './osm.ts'

const p = (lon: number, lat: number) => ({ lon, lat })

describe('isAreaWay', () => {
  it('reconoce áreas y líneas según etiquetas', () => {
    expect(isAreaWay({ leisure: 'park' })).toBe(true)
    expect(isAreaWay({ building: 'yes' })).toBe(true)
    expect(isAreaWay({ highway: 'residential' })).toBe(false)
    expect(isAreaWay({ highway: 'pedestrian', area: 'yes' })).toBe(true)
    expect(isAreaWay({ natural: 'tree_row' })).toBe(false)
  })
})

describe('assembleRings', () => {
  it('une vías en cualquier sentido hasta cerrar el anillo', () => {
    const rings = assembleRings([
      [
        [0, 0],
        [1, 0],
      ],
      [
        [1, 1],
        [1, 0],
      ],
      [
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ])
    expect(rings).toHaveLength(1)
    expect(rings[0]).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ])
  })

  it('descarta anillos que no cierran', () => {
    expect(
      assembleRings([
        [
          [0, 0],
          [1, 0],
          [1, 1],
        ],
      ]),
    ).toEqual([])
  })
})

describe('elementToFeature', () => {
  it('convierte una vía cerrada con etiqueta de área en polígono', () => {
    const feature = elementToFeature({
      type: 'way',
      id: 1,
      tags: { leisure: 'park', name: 'Parque Jamadi' },
      geometry: [p(0, 0), p(1, 0), p(1, 1), p(0, 0)],
    })
    expect(feature?.geometry.type).toBe('Polygon')
    expect(feature?.properties['@id']).toBe('way/1')
  })

  it('mantiene una calle cerrada (glorieta) como línea', () => {
    const feature = elementToFeature({
      type: 'way',
      id: 2,
      tags: { highway: 'tertiary', junction: 'roundabout' },
      geometry: [p(0, 0), p(1, 0), p(1, 1), p(0, 0)],
    })
    expect(feature?.geometry.type).toBe('LineString')
  })

  it('ensambla un multipolígono con hueco', () => {
    const feature = elementToFeature({
      type: 'relation',
      id: 3,
      tags: { type: 'multipolygon', leisure: 'golf_course' },
      members: [
        { type: 'way', ref: 10, role: 'outer', geometry: [p(0, 0), p(10, 0), p(10, 10)] },
        { type: 'way', ref: 11, role: 'outer', geometry: [p(10, 10), p(0, 10), p(0, 0)] },
        { type: 'way', ref: 12, role: 'inner', geometry: [p(4, 4), p(6, 4), p(6, 6), p(4, 4)] },
      ],
    })
    expect(feature?.geometry.type).toBe('MultiPolygon')
    if (feature?.geometry.type !== 'MultiPolygon') throw new Error('tipo inesperado')
    expect(feature.geometry.coordinates).toHaveLength(1)
    expect(feature.geometry.coordinates[0]).toHaveLength(2)
  })
})

describe('overpassToFeatures', () => {
  it('ignora elementos repetidos', () => {
    const node = { type: 'node' as const, id: 5, lat: 20.68, lon: -100.33, tags: { name: 'X' } }
    expect(overpassToFeatures({ elements: [node, node] })).toHaveLength(1)
  })
})
