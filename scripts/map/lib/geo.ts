import * as turf from '@turf/turf'
import type { Feature, LineString, MultiPolygon, Polygon, Position } from 'geojson'

export const roundCoord = (value: number, decimals = 6) => {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function roundPositions<T>(coordinates: T, decimals = 6): T {
  if (typeof coordinates === 'number') return roundCoord(coordinates, decimals) as T
  if (Array.isArray(coordinates)) return coordinates.map((c) => roundPositions(c, decimals)) as T
  return coordinates
}

/**
 * Rectángulo orientado (en metros) centrado en un punto. `bearing` en grados desde el norte,
 * dirección del lado largo. Útil para plazas cuya huella aún no existe en los datos abiertos.
 */
export function orientedRectangle(
  center: [number, number],
  lengthM: number,
  depthM: number,
  bearing: number,
): Polygon {
  const origin = turf.point(center)
  const halfL = lengthM / 2
  const halfD = depthM / 2
  const corner = (along: number, across: number): Position => {
    const a = turf.destination(origin, along / 1000, bearing, { units: 'kilometers' })
    const b = turf.destination(a, across / 1000, bearing + 90, { units: 'kilometers' })
    return b.geometry.coordinates.map((c) => roundCoord(c)) as Position
  }
  const ring = [
    corner(-halfL, -halfD),
    corner(halfL, -halfD),
    corner(halfL, halfD),
    corner(-halfL, halfD),
  ]
  ring.push(ring[0] as Position)
  return { type: 'Polygon', coordinates: [ring] }
}

/** Rumbo (grados) del segmento de vía más cercano a un punto. */
export function nearestRoadBearing(
  point: [number, number],
  roads: Feature<LineString>[],
): { bearing: number; distanceM: number } | null {
  let best: { bearing: number; distanceM: number } | null = null
  const target = turf.point(point)
  for (const road of roads) {
    const coords = road.geometry.coordinates
    for (let i = 1; i < coords.length; i++) {
      const a = coords[i - 1] as Position
      const b = coords[i] as Position
      const segment = turf.lineString([a, b])
      const distanceM = turf.pointToLineDistance(target, segment, { units: 'meters' })
      if (!best || distanceM < best.distanceM) {
        best = { bearing: turf.bearing(turf.point(a), turf.point(b)), distanceM }
      }
    }
  }
  return best
}

export function polygonsOf(feature: Feature<Polygon | MultiPolygon>): Polygon[] {
  const { geometry } = feature
  if (geometry.type === 'Polygon') return [geometry]
  return geometry.coordinates.map((coordinates) => ({ type: 'Polygon', coordinates }))
}
