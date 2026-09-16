/**
 * Conversión de respuestas Overpass (`out geom`) a GeoJSON.
 * Maneja vías abiertas/cerradas y relaciones multipolígono (ensamblando anillos a partir de sus vías).
 */
import type { Feature, LineString, MultiPolygon, Point, Polygon, Position } from 'geojson'

export interface OverpassPoint {
  lat: number
  lon: number
}

export interface OverpassMember {
  type: 'node' | 'way' | 'relation'
  ref: number
  role: string
  geometry?: OverpassPoint[]
}

export interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  tags?: Record<string, string>
  lat?: number
  lon?: number
  geometry?: OverpassPoint[]
  members?: OverpassMember[]
}

export interface OverpassResponse {
  osm3s?: { timestamp_osm_base?: string; copyright?: string }
  elements: OverpassElement[]
}

export type OsmTags = Record<string, string>
export type OsmFeature = Feature<
  Point | LineString | Polygon | MultiPolygon,
  OsmTags & { '@id': string }
>

const AREA_KEYS = ['building', 'landuse', 'leisure', 'natural', 'amenity', 'place', 'water', 'shop']
const LINEAR_NATURAL = new Set(['coastline', 'cliff', 'ridge', 'tree_row'])

function samePosition(a: Position | undefined, b: Position | undefined): boolean {
  return a !== undefined && b !== undefined && a[0] === b[0] && a[1] === b[1]
}

function toPositions(points: readonly OverpassPoint[]): Position[] {
  return points.map((p) => [p.lon, p.lat])
}

/** Decide si una vía cerrada representa un área (heurística estándar de OSM). */
export function isAreaWay(tags: OsmTags): boolean {
  if (tags.area === 'no') return false
  if (tags.area === 'yes') return true
  if (tags.highway || tags.barrier || tags.waterway) return false
  if (tags.natural && LINEAR_NATURAL.has(tags.natural)) return false
  return AREA_KEYS.some((key) => key in tags)
}

/** Une vías por sus extremos hasta formar anillos cerrados. Descarta los que no cierran. */
export function assembleRings(ways: readonly Position[][]): Position[][] {
  const pending = ways.filter((way) => way.length >= 2).map((way) => [...way])
  const rings: Position[][] = []

  while (pending.length > 0) {
    const ring = pending.shift() as Position[]
    let joined = true
    while (!samePosition(ring[0], ring.at(-1)) && joined) {
      joined = false
      const end = ring.at(-1)
      const index = pending.findIndex(
        (way) => samePosition(way[0], end) || samePosition(way.at(-1), end),
      )
      if (index === -1) break
      const [way] = pending.splice(index, 1) as [Position[]]
      const oriented = samePosition(way[0], end) ? way : [...way].reverse()
      ring.push(...oriented.slice(1))
      joined = true
    }
    if (ring.length >= 4 && samePosition(ring[0], ring.at(-1))) rings.push(ring)
  }
  return rings
}

function pointInRing(point: Position, ring: readonly Position[]): boolean {
  const x = point[0] ?? 0
  const y = point[1] ?? 0
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]?.[0] ?? 0
    const yi = ring[i]?.[1] ?? 0
    const xj = ring[j]?.[0] ?? 0
    const yj = ring[j]?.[1] ?? 0
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function relationToMultiPolygon(element: OverpassElement): MultiPolygon | null {
  const members = (element.members ?? []).filter((m) => m.type === 'way' && m.geometry)
  const outer = assembleRings(
    members.filter((m) => m.role !== 'inner').map((m) => toPositions(m.geometry ?? [])),
  )
  const inner = assembleRings(
    members.filter((m) => m.role === 'inner').map((m) => toPositions(m.geometry ?? [])),
  )
  if (outer.length === 0) return null

  const polygons: Position[][][] = outer.map((ring) => [ring])
  for (const hole of inner) {
    const first = hole[0]
    const owner = first
      ? polygons.find((polygon) => pointInRing(first, polygon[0] ?? []))
      : undefined
    owner?.push(hole)
  }
  return { type: 'MultiPolygon', coordinates: polygons }
}

export function elementToFeature(element: OverpassElement): OsmFeature | null {
  const tags = element.tags ?? {}
  const properties = { ...tags, '@id': `${element.type}/${element.id}` }

  if (element.type === 'node') {
    if (element.lat === undefined || element.lon === undefined) return null
    return {
      type: 'Feature',
      properties,
      geometry: { type: 'Point', coordinates: [element.lon, element.lat] },
    }
  }

  if (element.type === 'way') {
    const coordinates = toPositions(element.geometry ?? [])
    if (coordinates.length < 2) return null
    const closed = coordinates.length >= 4 && samePosition(coordinates[0], coordinates.at(-1))
    if (closed && isAreaWay(tags)) {
      return {
        type: 'Feature',
        properties,
        geometry: { type: 'Polygon', coordinates: [coordinates] },
      }
    }
    return { type: 'Feature', properties, geometry: { type: 'LineString', coordinates } }
  }

  if (tags.type === 'multipolygon' || tags.type === 'boundary') {
    const geometry = relationToMultiPolygon(element)
    return geometry ? { type: 'Feature', properties, geometry } : null
  }
  return null
}

export function overpassToFeatures(response: OverpassResponse): OsmFeature[] {
  const features: OsmFeature[] = []
  const seen = new Set<string>()
  for (const element of response.elements) {
    const key = `${element.type}/${element.id}`
    if (seen.has(key)) continue
    seen.add(key)
    const feature = elementToFeature(element)
    if (feature) features.push(feature)
  }
  return features
}
