/**
 * npm run map:suggest-plaza -- --lat=20.6793 --lng=-100.3150 [--radius 40] [--min-area 250]
 *                                [--buffer 12] [--length 90 --depth 35 --bearing auto]
 *
 * Sugiere la geometría (`geometry`) de una plaza para data/commercial/plazas.json:
 *  - Si hay huellas de edificios comerciales cerca del punto: envolvente convexa + margen.
 *  - Si no (plaza nueva que aún no aparece en los datos abiertos): rectángulo orientado según la
 *    vialidad más cercana, con las dimensiones indicadas.
 * Revisa siempre el resultado (p. ej. en geojson.io) antes de guardarlo.
 */
import { parseArgs } from 'node:util'
import * as turf from '@turf/turf'
import type { Feature, FeatureCollection, LineString, MultiPolygon, Polygon } from 'geojson'
import { classifyRoad } from './lib/classify.ts'
import { nearestRoadBearing, orientedRectangle, polygonsOf, roundPositions } from './lib/geo.ts'
import { type OverpassResponse, overpassToFeatures } from './lib/osm.ts'
import { paths, readJson } from './lib/paths.ts'

const { values } = parseArgs({
  options: {
    lat: { type: 'string' },
    lng: { type: 'string' },
    radius: { type: 'string', default: '40' },
    'min-area': { type: 'string', default: '250' },
    buffer: { type: 'string', default: '12' },
    length: { type: 'string', default: '80' },
    depth: { type: 'string', default: '30' },
    bearing: { type: 'string', default: 'auto' },
    buildings: { type: 'string', default: paths.rawBuildings },
    'force-rectangle': { type: 'boolean', default: false },
  },
})

const lat = Number(values.lat)
const lng = Number(values.lng)
if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
  console.error('Uso: npm run map:suggest-plaza -- --lat=<lat> --lng=<lng> [opciones]')
  process.exit(1)
}

const center = turf.point([lng, lat])
/** Distancia del punto del enlace al frente del rectángulo cuando hay que sacarlo de la calle. */
const SETBACK_M = 8

/** Metros de vía que cruza el polígono + m² de edificios ajenos que pisa: 0 = sitio limpio. */
function conflictsOf(
  polygon: Polygon,
  roads: Feature<LineString>[],
  footprints: Feature<Polygon | MultiPolygon>[],
): number {
  const shape = turf.feature(polygon)
  let score = 0
  for (const road of roads) {
    if (!turf.booleanIntersects(shape, road)) continue
    const split = turf.lineSplit(road, shape)
    for (const piece of split.features.length > 0 ? split.features : [road]) {
      const mid = turf.along(piece, turf.length(piece) / 2)
      if (turf.booleanPointInPolygon(mid, shape)) score += turf.length(piece, { units: 'meters' })
    }
  }
  for (const footprint of footprints) {
    for (const part of polygonsOf(footprint)) {
      const overlap = turf.intersect(turf.featureCollection([shape, turf.feature(part)]))
      if (overlap) score += turf.area(overlap)
    }
  }
  return score
}
const radiusM = Number(values.radius)
const minArea = Number(values['min-area'])

const buildings = readJson<FeatureCollection<Polygon | MultiPolygon>>(values.buildings)
const selected: Polygon[] = []
if (!values['force-rectangle']) {
  for (const feature of buildings.features) {
    for (const polygon of polygonsOf(feature)) {
      const area = turf.area(polygon)
      if (area < minArea) continue
      // Distancia al borde del edificio (negativa si el punto queda dentro).
      const distance = turf.pointToPolygonDistance(center, polygon, { units: 'meters' })
      if (distance <= radiusM) selected.push(polygon)
    }
  }
}

let geometry: Polygon
let summary: string
if (selected.length > 0) {
  const points = turf.featureCollection(
    selected.flatMap((polygon) => (polygon.coordinates[0] ?? []).map((p) => turf.point(p))),
  )
  const hull = turf.convex(points)
  if (!hull) throw new Error('No se pudo calcular la envolvente')
  const buffered = turf.buffer(hull, Number(values.buffer), { units: 'meters' }) as Feature<Polygon>
  const simplified = turf.simplify(buffered, { tolerance: 0.00002, highQuality: true })
  geometry = { type: 'Polygon', coordinates: roundPositions(simplified.geometry.coordinates) }
  const footprint = Math.round(selected.reduce((sum, polygon) => sum + turf.area(polygon), 0))
  summary = `${selected.length} huella(s) de edificio, ${footprint} m² construidos en planta`
} else {
  const osm = readJson<OverpassResponse>(paths.rawOsm)
  const roads = overpassToFeatures(osm).filter(
    (f) => f.geometry.type === 'LineString' && classifyRoad(f.properties) !== null,
  ) as Feature<LineString>[]
  let bearing = Number(values.bearing)
  if (values.bearing === 'auto') {
    const nearest = nearestRoadBearing([lng, lat], roads)
    bearing = nearest?.bearing ?? 0
    summary = `rectángulo orientado a la vialidad más cercana (${nearest?.distanceM.toFixed(0)} m, rumbo ${bearing.toFixed(0)}°)`
  } else {
    summary = `rectángulo con rumbo ${bearing}°`
  }
  // El punto de un enlace de Maps suele caer en la banqueta o en la calle de acceso: un rectángulo
  // centrado en él cruzaría la vía. Se coloca a un lado de la calle (el que menos choca con vías y
  // edificios), con su frente a SETBACK_M del punto.
  const length = Number(values.length)
  const depth = Number(values.depth)
  const candidates = [0, 1, -1].map((side) => {
    const shifted =
      side === 0
        ? center
        : turf.destination(center, (depth / 2 + SETBACK_M) / 1000, bearing + 90 * side, {
            units: 'kilometers',
          })
    const polygon = orientedRectangle(
      shifted.geometry.coordinates as [number, number],
      length,
      depth,
      bearing,
    )
    return { side, polygon, conflicts: conflictsOf(polygon, roads, buildings.features) }
  })
  const best = candidates.reduce((a, b) => (b.conflicts < a.conflicts ? b : a))
  geometry = best.polygon
  if (best.side !== 0) summary += `, desplazado ${depth / 2 + SETBACK_M} m al lado libre de la vía`
  if (best.conflicts > 0)
    summary += `: AVISO: aún cruza vías o edificios (${best.conflicts.toFixed(0)})`
}

const areaM2 = Math.round(turf.area(geometry))
console.error(`Sugerencia: ${summary}. Superficie de la plaza: ${areaM2} m²`)
console.log(JSON.stringify(geometry))
