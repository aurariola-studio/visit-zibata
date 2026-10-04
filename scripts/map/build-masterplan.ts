/**
 * npm run map:masterplan -- --source <captura.png> [--anchor-a x,y] [--anchor-b x,y]
 *
 * Extrae el contorno del Master Plan de Zibatá a partir de una captura de mapa en la que el polígono del
 * desarrollo está pintado en un color plano (verde azulado), y lo guarda en `data/geographic/config.json`
 * → `boundaryExtensions` para que `npm run map:build` lo una al contorno que sale de la red vial.
 *
 * Cómo se georreferencia sin dibujar nada a mano:
 *  1. Dos anclas aproximadas (el cruce de la QRO 540 con la MEX 57D y el campus Anáhuac) dan una escala y
 *     una posición iniciales.
 *  2. Se afinan buscando la escala y el desplazamiento con los que las vías principales de OpenStreetMap
 *     (ya descargadas en data/geographic/raw) caen sobre las vías grises de la captura. La coincidencia
 *     se imprime: por debajo de ~0,8 el resultado no es fiable.
 *  3. Se toma la mancha de color más grande, se cierran los huecos de rótulos e iconos y se recorre su
 *     borde; ese borde, simplificado a ~10 m, pasa a coordenadas.
 *
 * La captura NO se versiona (lleva cartografía de terceros); se versiona el polígono resultante con su
 * procedencia. Para rehacerlo basta volver a ejecutar el comando con la misma captura u otra mejor.
 */
import { parseArgs } from 'node:util'
import * as turf from '@turf/turf'
import type { Position } from 'geojson'
import sharp from 'sharp'
import { classifyRoad } from './lib/classify.ts'
import { type OverpassResponse, overpassToFeatures } from './lib/osm.ts'
import { loadConfig, paths, readJson, writeJson } from './lib/paths.ts'

const EXTENSION_NAME = 'Master Plan de Zibatá'

const { values } = parseArgs({
  options: {
    source: { type: 'string' },
    // Píxeles aproximados de las anclas en la captura (se afinan solos).
    'anchor-a': { type: 'string', default: '300,100' },
    'anchor-b': { type: 'string', default: '770,462' },
  },
})
if (!values.source) {
  console.error('✗ Falta --source <captura.png> con el polígono del Master Plan pintado.')
  process.exit(1)
}

// Anclas reales: extremo norte de la QRO 540 (donde encuentra a la MEX 57D) y el campus Anáhuac.
const ANCHOR_A = { lng: -100.34571, lat: 20.70676 }
const ANCHOR_B = { lng: -100.31302, lat: 20.68056 }

const R = 6378137
const merc = (lng: number, lat: number): [number, number] => [
  (R * lng * Math.PI) / 180,
  R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)),
]
const unmerc = (x: number, y: number): [number, number] => [
  (x / R) * (180 / Math.PI),
  (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * (180 / Math.PI),
]
const pair = (text: string) => text.split(',').map(Number) as [number, number]

const { data, info } = await sharp(values.source)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })
const W = info.width
const H = info.height
const px = (x: number, y: number) => {
  const i = (y * W + x) * 3
  return [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0] as const
}

// Máscaras: vías (grises más oscuros que el fondo) y polígono (verde azulado plano).
const road = new Uint8Array(W * H)
const fill = new Uint8Array(W * H)
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const [r, g, b] = px(x, y)
    const gray = Math.abs(r - g) < 10 && Math.abs(g - b) < 10
    if (gray && r > 110 && r < 200) road[y * W + x] = 1
    if (g - r > 80 && b - r > 60) fill[y * W + x] = 1
  }
}
const nearRoad = (x: number, y: number) => {
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx
      const ny = y + dy
      if (nx >= 0 && ny >= 0 && nx < W && ny < H && road[ny * W + nx]) return true
    }
  return false
}

// ── 1-2. Georreferencia contra las vías principales de OSM ───────────────────────────────────────
const lines = overpassToFeatures(readJson<OverpassResponse>(paths.rawOsm))
  .filter((feature) => {
    if (feature.geometry.type !== 'LineString') return false
    const kind = classifyRoad(feature.properties)?.class
    return kind === 'highway' || kind === 'primary'
  })
  .map((feature) =>
    (feature.geometry.coordinates as Position[]).map(([lng, lat]) => merc(lng ?? 0, lat ?? 0)),
  )

const [ax, ay] = merc(ANCHOR_A.lng, ANCHOR_A.lat)
const [bx, by] = merc(ANCHOR_B.lng, ANCHOR_B.lat)
const pa = pair(values['anchor-a'])
const pb = pair(values['anchor-b'])
const s0 = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) / Math.hypot(bx - ax, by - ay)

function score(s: number, ox: number, oy: number): number {
  let hits = 0
  let total = 0
  for (const line of lines) {
    for (let k = 1; k < line.length; k++) {
      const [x0, y0] = line[k - 1] as [number, number]
      const [x1, y1] = line[k] as [number, number]
      const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * s))
      for (let t = 0; t <= steps; t++) {
        const x = Math.round(ox + (x0 + ((x1 - x0) * t) / steps - ax) * s)
        const y = Math.round(oy - (y0 + ((y1 - y0) * t) / steps - ay) * s)
        if (x < 0 || y < 0 || x >= W || y >= H) continue
        total++
        if (nearRoad(x, y)) hits++
      }
    }
  }
  return total > 300 ? hits / total : 0
}

let best = { value: 0, s: s0, ox: pa[0], oy: pa[1] }
for (let i = 0; i <= 30; i++) {
  const s = s0 * (0.85 + (0.3 * i) / 30)
  for (let ox = pa[0] - 30; ox <= pa[0] + 30; ox += 3)
    for (let oy = pa[1] - 30; oy <= pa[1] + 30; oy += 3) {
      const value = score(s, ox, oy)
      if (value > best.value) best = { value, s, ox, oy }
    }
}
const coarse = best
for (let i = 0; i <= 20; i++) {
  const s = coarse.s * (0.98 + (0.04 * i) / 20)
  for (let ox = coarse.ox - 3; ox <= coarse.ox + 3; ox++)
    for (let oy = coarse.oy - 3; oy <= coarse.oy + 3; oy++) {
      const value = score(s, ox, oy)
      if (value > best.value) best = { value, s, ox, oy }
    }
}
console.log(`→ Coincidencia de vías con OSM: ${(best.value * 100).toFixed(1)} %`)
if (best.value < 0.8) {
  console.error(
    '✗ La captura no encaja con las vías de OSM: revisa las anclas (--anchor-a/--anchor-b).',
  )
  process.exit(1)
}
const toLngLat = (x: number, y: number) =>
  unmerc(ax + (x - best.ox) / best.s, ay + (best.oy - y) / best.s)

// ── 3. Mancha más grande, huecos cerrados, borde simplificado ────────────────────────────────────
const component = new Uint8Array(W * H)
{
  const seen = new Uint8Array(W * H)
  let largest: number[] = []
  for (let start = 0; start < W * H; start++) {
    if (!fill[start] || seen[start]) continue
    const members: number[] = []
    const queue = [start]
    seen[start] = 1
    while (queue.length > 0) {
      const index = queue.pop() as number
      members.push(index)
      const x = index % W
      const y = (index - x) / W
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const nx = x + dx
        const ny = y + dy
        const next = ny * W + nx
        if (nx >= 0 && ny >= 0 && nx < W && ny < H && fill[next] && !seen[next]) {
          seen[next] = 1
          queue.push(next)
        }
      }
    }
    if (members.length > largest.length) largest = members
  }
  for (const index of largest) component[index] = 1
}
// Cierre morfológico (4 px): tapa rótulos e iconos dentro del polígono sin mover su borde exterior.
const morph = (mask: Uint8Array, grow: boolean) => {
  const out = new Uint8Array(mask)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const neighbours = [
        mask[y * W + x - 1],
        mask[y * W + x + 1],
        mask[(y - 1) * W + x],
        mask[(y + 1) * W + x],
      ]
      if (grow ? neighbours.some(Boolean) : !neighbours.every(Boolean))
        out[y * W + x] = grow ? 1 : 0
    }
  return out
}
let closed = component
for (let i = 0; i < 4; i++) closed = morph(closed, true)
for (let i = 0; i < 4; i++) closed = morph(closed, false)

// Recorrido del borde exterior (vecindad de Moore).
const inside = (x: number, y: number) =>
  x >= 0 && y >= 0 && x < W && y < H && closed[y * W + x] === 1
const steps: [number, number][] = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
]
const first = closed.indexOf(1)
const start: [number, number] = [first % W, Math.floor(first / W)]
const contour: [number, number][] = [start]
let current = start
let heading = 6
for (let guard = 0; guard < W * H; guard++) {
  let moved = false
  for (let k = 0; k < 8; k++) {
    const d = (heading + 6 + k) % 8
    const [dx, dy] = steps[d] as [number, number]
    const next: [number, number] = [current[0] + dx, current[1] + dy]
    if (inside(next[0], next[1])) {
      current = next
      heading = d
      contour.push(next)
      moved = true
      break
    }
  }
  if (!moved || (current[0] === start[0] && current[1] === start[1] && contour.length > 10)) break
}

const ring = contour.map(([x, y]) => toLngLat(x, y))
ring.push(ring[0] as [number, number])
const simplified = turf.simplify(turf.polygon([ring]), { tolerance: 0.0001, highQuality: true })
const polygon = (simplified.geometry.coordinates[0] as Position[]).map(
  ([lng, lat]) => [Number(lng?.toFixed(6)), Number(lat?.toFixed(6))] as [number, number],
)

const config = loadConfig()
writeJson(paths.config, {
  ...config,
  boundaryExtensions: [
    ...config.boundaryExtensions.filter((entry) => !entry.name.startsWith('Master Plan')),
    {
      name: EXTENSION_NAME,
      source:
        'Contorno del Master Plan aportado por el propietario de la guía (captura de mapa con el ' +
        `polígono del desarrollo), georreferenciado contra las vías de OpenStreetMap con ${(best.value * 100).toFixed(0)} % ` +
        'de coincidencia y trazado automáticamente. Generado por npm run map:masterplan.',
      polygon,
    },
  ],
})
console.log(
  `✓ Master Plan: ${polygon.length} vértices, ${(turf.area(simplified) / 1e6).toFixed(2)} km². ` +
    'Ejecuta `npm run map:build` para regenerar el mapa.',
)
