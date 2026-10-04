/**
 * Árboles del mapa. Dos fuentes, las dos reales:
 *  - la cobertura arbórea de Overture (ESA WorldCover, 10 m), que dice dónde hay copa de árbol;
 *  - las áreas verdes de OpenStreetMap (parques, jardines, camellones, golf), que en Zibatá están
 *    arboladas y la clasificación satelital no siempre alcanza a ver.
 *
 * La fuente dice DÓNDE hay arbolado, no dónde está cada tronco: los árboles se colocan en una retícula
 * con desplazamiento determinista dentro de esas áreas, nunca sobre una vía ni encima de un edificio
 * (se descuenta el radio de la copa, no solo el punto). Cada árbol son dos volúmenes: el tronco y la
 * copa, para que parezca un árbol y no un prisma.
 */
import * as turf from '@turf/turf'
import type { Feature, LineString, MultiLineString, MultiPolygon, Polygon, Position } from 'geojson'
import { stableUnit } from './classify.ts'
import { roundPositions } from './geo.ts'

export interface TreeOptions {
  /** Separación media entre árboles (m). */
  spacingM: number
  /** Distancia mínima entre la copa y el eje de una vía, por clase (m). */
  roadClearanceM: Record<string, number>
}

export interface TreePart {
  /** `trunk` es el tronco; `crown`, la copa baja y ancha; `top`, la copa alta y estrecha. */
  part: 'crown' | 'trunk' | 'top'
  height: number
  base: number
}

const M_PER_DEG_LAT = 111_320
const CROWN_SIDES = 5
const TRUNK_SIDES = 3

/** Polígono regular (copa o tronco) de `radiusM`, con un giro estable para que no parezcan de molde. */
function disc(center: Position, radiusM: number, sides: number, seed: string, wobble = 0): Polygon {
  const [lng = 0, lat = 0] = center
  const mPerDegLng = M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180)
  const turn = stableUnit(`${seed}:giro`) * Math.PI * 2
  const ring: Position[] = []
  for (let k = 0; k < sides; k++) {
    const angle = turn + (k / sides) * Math.PI * 2
    const r = radiusM * (1 - wobble / 2 + wobble * stableUnit(`${seed}:${k}`))
    ring.push([
      lng + (Math.cos(angle) * r) / mPerDegLng,
      lat + (Math.sin(angle) * r) / M_PER_DEG_LAT,
    ])
  }
  ring.push(ring[0] as Position)
  // 5 decimales (~1 m) bastan para un árbol y hacen la tesela más ligera.
  return { type: 'Polygon', coordinates: [roundPositions(ring, 5)] }
}

/** Índice espacial mínimo (celdas de ~60 m) para no comparar cada árbol con todas las vías y casas. */
class Buckets<T> {
  private readonly cells = new Map<string, T[]>()
  private readonly sizeDeg: number
  constructor(sizeDeg: number) {
    this.sizeDeg = sizeDeg
  }
  add(bbox: number[], item: T) {
    const [w = 0, s = 0, e = 0, n = 0] = bbox
    for (let x = Math.floor(w / this.sizeDeg); x <= Math.floor(e / this.sizeDeg); x++)
      for (let y = Math.floor(s / this.sizeDeg); y <= Math.floor(n / this.sizeDeg); y++) {
        const key = `${x},${y}`
        const list = this.cells.get(key) ?? []
        list.push(item)
        this.cells.set(key, list)
      }
  }
  near([x = 0, y = 0]: Position): T[] {
    return this.cells.get(`${Math.floor(x / this.sizeDeg)},${Math.floor(y / this.sizeDeg)}`) ?? []
  }
}

export interface TreeObstacles {
  roads: Feature[]
  buildings: Feature<Polygon>[]
}

export function placeTrees(
  areas: Feature<Polygon | MultiPolygon>[],
  obstacles: TreeObstacles,
  options: TreeOptions,
): Feature<Polygon, TreePart>[] {
  const trees: Feature<Polygon, TreePart>[] = []
  if (areas.length === 0) return trees

  const cell = 60 / M_PER_DEG_LAT
  const widest = Math.max(...Object.values(options.roadClearanceM))
  const roadIndex = new Buckets<{ line: Feature<LineString>; clearance: number }>(cell)
  for (const road of obstacles.roads) {
    const roadClass = (road.properties as { class?: string }).class ?? 'street'
    const clearance = options.roadClearanceM[roadClass] ?? options.roadClearanceM.street ?? 6
    const margin = widest / M_PER_DEG_LAT
    for (const line of turf.flatten(road as Feature<LineString | MultiLineString>).features) {
      const [w = 0, s = 0, e = 0, n = 0] = turf.bbox(line)
      roadIndex.add([w - margin, s - margin, e + margin, n + margin], { line, clearance })
    }
  }
  const buildingIndex = new Buckets<Feature<Polygon>>(cell)
  for (const building of obstacles.buildings) {
    const [w = 0, s = 0, e = 0, n = 0] = turf.bbox(building)
    const margin = 6 / M_PER_DEG_LAT
    buildingIndex.add([w - margin, s - margin, e + margin, n + margin], building)
  }

  // Una sola retícula para todas las áreas, anclada al origen de coordenadas: el mismo árbol sale
  // igual en cada build y dos áreas vecinas no ponen dos árboles en el mismo sitio.
  const [, south0 = 0, , north0 = 0] = turf.bbox(turf.featureCollection(areas))
  const stepLat = options.spacingM / M_PER_DEG_LAT
  const stepLng =
    options.spacingM / (M_PER_DEG_LAT * Math.cos((((south0 + north0) / 2) * Math.PI) / 180))
  const planted = new Set<string>()

  for (const area of areas) {
    const [west = 0, south = 0, east = 0, north = 0] = turf.bbox(area)
    for (let i = Math.floor(west / stepLng); i * stepLng <= east; i++) {
      for (let j = Math.floor(south / stepLat); j * stepLat <= north; j++) {
        const id = `${i},${j}`
        if (planted.has(id)) continue
        const jitter = (axis: string) => (stableUnit(`${id}:${axis}`) - 0.5) * 0.7
        const point: Position = [(i + jitter('x')) * stepLng, (j + jitter('y')) * stepLat]
        if (!turf.booleanPointInPolygon(point, area)) continue

        const size = stableUnit(`${id}:tamaño`)
        const radius = 1.9 + size * 1.3
        const onRoad = roadIndex
          .near(point)
          .some(
            ({ line, clearance }) =>
              turf.pointToLineDistance(point, line, { units: 'meters' }) < clearance + radius,
          )
        if (onRoad) continue
        const onBuilding = buildingIndex
          .near(point)
          .some(
            (building) =>
              turf.pointToPolygonDistance(point, building, { units: 'meters' }) < radius + 1,
          )
        if (onBuilding) continue

        planted.add(id)
        const height = Math.round((5 + size * 3.5) * 2) / 2
        const trunkTop = Math.round(height * 0.32 * 2) / 2
        // Copa en dos pisos: ancha abajo y estrecha arriba. Con un solo prisma parecía un pilar.
        const waist = Math.round(((trunkTop + height) / 2) * 2) / 2
        trees.push({
          type: 'Feature',
          properties: { part: 'trunk', height: trunkTop + 0.5, base: 0 },
          geometry: disc(point, 0.45, TRUNK_SIDES, `${id}:tronco`),
        })
        trees.push({
          type: 'Feature',
          properties: { part: 'crown', height: waist, base: trunkTop },
          geometry: disc(point, radius, CROWN_SIDES, id, 0.25),
        })
        trees.push({
          type: 'Feature',
          properties: { part: 'top', height, base: waist },
          geometry: disc(point, radius * 0.62, CROWN_SIDES, `${id}:copa`, 0.25),
        })
      }
    }
  }
  return trees
}
