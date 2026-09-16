/**
 * npm run map:georef [-- --source data/geographic/reference/plano-zibata.png]
 *
 * Georreferencia el plano del cliente comparándolo con la red vial real de OSM: rasteriza las
 * vialidades para distintas escalas y desplazamientos (proyección Web Mercator, norte arriba) y elige
 * el ajuste con mayor coincidencia de píxeles de calle. Genera:
 *  - data/geographic/reference/plano-zibata.webp          versión ligera para la superposición
 *  - data/geographic/reference/plano-zibata.georef.json   esquinas [lng, lat], escala y puntuación
 * El modo depuración del mapa (?debug) permite superponerlo con opacidad variable para verificar la
 * fidelidad. Si llega un plano de mayor resolución, basta con reemplazar el PNG y volver a ejecutar.
 */
import { writeFileSync } from 'node:fs'
import { basename } from 'node:path'
import { parseArgs } from 'node:util'
import sharp from 'sharp'
import { classifyRoad } from './lib/classify.ts'
import { type OverpassResponse, overpassToFeatures } from './lib/osm.ts'
import { paths, readJson } from './lib/paths.ts'

const { values } = parseArgs({
  options: {
    source: { type: 'string', default: paths.planoSource },
    /** Coordenada aproximada del centro del plano (terraink la imprime en el póster). */
    'center-lat': { type: 'string', default: '20.6701' },
    'center-lng': { type: 'string', default: '-100.3401' },
    /** Fracción inferior del póster ocupada por textos, excluida del ajuste. */
    'text-band': { type: 'string', default: '0.22' },
  },
})

const WORK_WIDTH = 640
const EARTH = 6378137
const toMercator = (lng: number, lat: number): [number, number] => [
  (EARTH * lng * Math.PI) / 180,
  EARTH * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)),
]
const toLngLat = (x: number, y: number): [number, number] => [
  (x / EARTH) * (180 / Math.PI),
  (2 * Math.atan(Math.exp(y / EARTH)) - Math.PI / 2) * (180 / Math.PI),
]

// ── Máscara de calles del plano ──────────────────────────────────────────────────────────────────
const source = sharp(values.source)
const meta = await source.metadata()
if (!meta.width || !meta.height) throw new Error('No se pudo leer el plano')
const scaleDown = WORK_WIDTH / meta.width
const { data: pixels, info } = await source
  .clone()
  .resize(WORK_WIDTH)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })
const W = info.width
const H = info.height
const textTop = Math.floor(H * (1 - Number(values['text-band'])))
const planoMask = new Uint8Array(W * H)
for (let y = 0; y < textTop; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3
    const luminance =
      0.2126 * (pixels[i] ?? 255) +
      0.7152 * (pixels[i + 1] ?? 255) +
      0.0722 * (pixels[i + 2] ?? 255)
    if (luminance < 228) planoMask[y * W + x] = 1
  }
}
// Dilatación de 1 px: tolera el grosor distinto de las líneas.
const dilated = new Uint8Array(planoMask)
for (let y = 1; y < H - 1; y++) {
  for (let x = 1; x < W - 1; x++) {
    if (planoMask[y * W + x]) {
      dilated[y * W + x - 1] = 1
      dilated[y * W + x + 1] = 1
      dilated[(y - 1) * W + x] = 1
      dilated[(y + 1) * W + x] = 1
    }
  }
}

// ── Vértices de vialidades en Mercator ──────────────────────────────────────────────────────────
const roads = overpassToFeatures(readJson<OverpassResponse>(paths.rawOsm))
  .filter((f) => f.geometry.type === 'LineString' && classifyRoad(f.properties)?.class !== 'path')
  .map((f) =>
    f.geometry.type === 'LineString'
      ? f.geometry.coordinates.map(([lng, lat]) => toMercator(lng ?? 0, lat ?? 0))
      : [],
  )

const [centerX, centerY] = toMercator(Number(values['center-lng']), Number(values['center-lat']))

/** Píxeles (en la imagen de trabajo) de las calles para una escala dada (m/px del plano original). */
function rasterize(metersPerPixel: number): Int32Array {
  const workMpp = metersPerPixel / scaleDown
  const out: number[] = []
  for (const line of roads) {
    for (let k = 1; k < line.length; k++) {
      const [ax, ay] = line[k - 1] as [number, number]
      const [bx, by] = line[k] as [number, number]
      const x0 = W / 2 + (ax - centerX) / workMpp
      const y0 = H / 2 - (ay - centerY) / workMpp
      const x1 = W / 2 + (bx - centerX) / workMpp
      const y1 = H / 2 - (by - centerY) / workMpp
      const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)))
      for (let s = 0; s <= steps; s++) {
        out.push(Math.round(x0 + ((x1 - x0) * s) / steps), Math.round(y0 + ((y1 - y0) * s) / steps))
      }
    }
  }
  return Int32Array.from(out)
}

function score(points: Int32Array, dx: number, dy: number): number {
  let hits = 0
  let total = 0
  for (let i = 0; i < points.length; i += 2) {
    const x = (points[i] ?? 0) + dx
    const y = (points[i + 1] ?? 0) + dy
    if (x < 0 || y < 0 || x >= W || y >= textTop) continue
    total++
    hits += dilated[y * W + x] ?? 0
  }
  return total > 500 ? hits / total : 0
}

let best = { mpp: 0, dx: 0, dy: 0, score: 0 }
function search(mpps: number[], offsets: number[]) {
  for (const mpp of mpps) {
    const points = rasterize(mpp)
    for (const dx of offsets) {
      for (const dy of offsets) {
        const s = score(points, dx, dy)
        if (s > best.score) best = { mpp, dx, dy, score: s }
      }
    }
  }
}

const range = (from: number, to: number, step: number) =>
  Array.from({ length: Math.round((to - from) / step) + 1 }, (_, i) =>
    Number((from + i * step).toFixed(4)),
  )

console.log('→ Búsqueda gruesa de escala y desplazamiento…')
search(range(1.5, 5, 0.1), range(-60, 60, 4))
console.log(
  `  ${best.mpp} m/px, desplazamiento (${best.dx}, ${best.dy}) px, coincidencia ${(best.score * 100).toFixed(1)} %`,
)
const coarse = best
search(
  range(coarse.mpp - 0.1, coarse.mpp + 0.1, 0.01),
  range(-6, 6, 1).map((o) => o),
)
search([best.mpp], range(best.dx - 5, best.dx + 5, 1))
console.log(
  `→ Ajuste fino: ${best.mpp} m/px, (${best.dx}, ${best.dy}) px, coincidencia ${(best.score * 100).toFixed(1)} %`,
)

// Refinamiento de desplazamiento alrededor del mejor resultado en ambos ejes.
{
  const points = rasterize(best.mpp)
  for (const dx of range(best.dx - 4, best.dx + 4, 1)) {
    for (const dy of range(best.dy - 4, best.dy + 4, 1)) {
      const s = score(points, dx, dy)
      if (s > best.score) best = { ...best, dx, dy, score: s }
    }
  }
}

// ── Esquinas del plano original ──────────────────────────────────────────────────────────────────
// Un desplazamiento (dx, dy) de las calles equivale a mover el centro del plano en sentido opuesto.
const workMpp = best.mpp / scaleDown
const planoCenterX = centerX - best.dx * workMpp
const planoCenterY = centerY + best.dy * workMpp
const halfWidthM = (meta.width / 2) * best.mpp
const halfHeightM = (meta.height / 2) * best.mpp
const corner = (sx: number, sy: number) =>
  toLngLat(planoCenterX + sx * halfWidthM, planoCenterY + sy * halfHeightM).map((v) =>
    Number(v.toFixed(6)),
  ) as [number, number]

const webpPath = values.source.replace(/\.png$/i, '.webp')
await sharp(values.source).resize(1800).webp({ quality: 78 }).toFile(webpPath)

const georef = {
  $comment:
    'Generado por scripts/map/georef-plano.ts. Esquinas en orden: arriba-izq, arriba-der, abajo-der, abajo-izq.',
  source: basename(values.source),
  image: basename(webpPath),
  projection: 'EPSG:3857 (Web Mercator), norte arriba',
  metersPerPixel: best.mpp,
  matchScore: Number(best.score.toFixed(3)),
  coordinates: [corner(-1, 1), corner(1, 1), corner(1, -1), corner(-1, -1)],
}
writeFileSync(paths.planoGeoref, `${JSON.stringify(georef, null, 2)}\n`)
console.log(`✓ ${paths.planoGeoref}`)
if (best.score < 0.5) {
  console.warn(
    '⚠ Coincidencia baja: revisa el resultado en el modo depuración (?debug) antes de confiar en él.',
  )
}
