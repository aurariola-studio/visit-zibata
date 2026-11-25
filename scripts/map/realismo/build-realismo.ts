/**
 * npm run map:build:realismo
 *
 * Con lo que bajó `map:fetch:realismo` genera las capas de realismo que sirve la app:
 *  - suelo.webp: imagen de Sentinel-2 recortada al contorno de Zibatá, con borde suave
 *  - vias.geojson: calles principales de la región, solo fuera del contorno
 *  - descriptor.json: esquinas del suelo y de la región que cubre el relieve (lo importa el estilo del mapa)
 *
 * El monte de fuera del contorno ya no es una imagen: lo dibuja la GPU con el relieve (tinte y sombreado).
 *
 * Sentinel-2: contains modified Copernicus Sentinel data. Relieve: Copernicus DEM GLO-30.
 * Calles: © OpenStreetMap contributors (ODbL 1.0).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import * as turf from '@turf/turf'
import type { Feature, LineString, Polygon, Position } from 'geojson'
import sharp from 'sharp'
import { paths, ROOT, readJson, writeJson } from '../lib/paths.ts'
import type { SentinelMeta, Ventana } from './lib.ts'
import { anotarManifiesto, fromUtm, realismo, regionCorners, toUtm } from './lib.ts'

const extent = readJson<{ bbox: [number, number, number, number]; boundary: Polygon }>(paths.extent)
const sentinel = readJson<SentinelMeta>(paths.rawSentinelMeta)
const salida = paths.realismoDir
const DESCRIPTOR = `${ROOT}src/features/map/realismo/descriptor.json`
mkdirSync(salida, { recursive: true })

const redondear = (valor: number, decimales = 6): number =>
  Math.round(valor * 10 ** decimales) / 10 ** decimales
const esquinasLngLat = (
  v: Ventana,
  px: number,
  py: number,
  w: number,
  h: number,
): [number, number][] =>
  (
    [
      [px, py],
      [px + w, py],
      [px + w, py + h],
      [px, py + h],
    ] as const
  ).map(([i, j]) => {
    const [lng, lat] = fromUtm(v.x0 + i * v.rx, v.y0 + j * v.ry)
    return [redondear(lng), redondear(lat)]
  })

/** Máscara en escala de grises (blanco = dentro) de un polígono dibujado en píxeles de una imagen. */
async function mascara(
  width: number,
  height: number,
  anillo: [number, number][],
  desenfoque: number,
  invertida = false,
): Promise<Buffer> {
  const [fondo, relleno] = invertida ? ['white', 'black'] : ['black', 'white']
  const puntos = anillo.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${fondo}"/><polygon points="${puntos}" fill="${relleno}"/></svg>`
  return sharp(Buffer.from(svg)).blur(desenfoque).greyscale().raw().toBuffer()
}

/**
 * Imagen de suelo: Sentinel-2 a 10 m dentro del contorno y una franja alrededor (`realismo.suelo.margenM`), con alfa
 * suave en el borde. La franja existe porque la imagen de contexto, de unos 40 m por píxel, ampliada en el teléfono
 * se ve en cuadros justo al salir del contorno: ahí se ve el mismo suelo que dentro y el contexto entra más lejos.
 */
async function construirSuelo(): Promise<{ coordenadas: [number, number][]; bytes: number }> {
  const v = sentinel.zibata
  const { margenM, difuminadoM } = realismo.suelo
  const esquinas = (
    [
      [extent.bbox[0], extent.bbox[3]],
      [extent.bbox[2], extent.bbox[3]],
      [extent.bbox[2], extent.bbox[1]],
      [extent.bbox[0], extent.bbox[1]],
    ] as [number, number][]
  ).map(([lng, lat]) => toUtm(lng, lat))
  const margen = 2 + Math.ceil(margenM / Math.abs(v.rx))
  // La escena de 10 m es finita: la franja se recorta a lo que hay.
  const px0 = Math.max(
    0,
    Math.floor((Math.min(...esquinas.map((p) => p[0])) - v.x0) / v.rx) - margen,
  )
  const px1 = Math.min(
    v.width,
    Math.ceil((Math.max(...esquinas.map((p) => p[0])) - v.x0) / v.rx) + margen,
  )
  const py0 = Math.max(
    0,
    Math.floor((Math.max(...esquinas.map((p) => p[1])) - v.y0) / v.ry) - margen,
  )
  const py1 = Math.min(
    v.height,
    Math.ceil((Math.min(...esquinas.map((p) => p[1])) - v.y0) / v.ry) + margen,
  )
  const width = px1 - px0
  const height = py1 - py0
  const franja = turf.buffer(turf.feature(extent.boundary), margenM / 1000, {
    units: 'kilometers',
    steps: 8,
  })
  const anillo = (
    franja?.geometry.type === 'Polygon' ? (franja.geometry.coordinates[0] ?? []) : []
  ).map((p) => {
    const [x, y] = toUtm(p[0] ?? 0, p[1] ?? 0)
    return [(x - v.x0) / v.rx - px0, (y - v.y0) / v.ry - py0] as [number, number]
  })
  const alfa = await mascara(width, height, anillo, Math.max(2, difuminadoM / Math.abs(v.rx)))
  const rgb = await sharp(paths.rawSentinelZibata)
    .extract({ left: px0, top: py0, width, height })
    .removeAlpha()
    .raw()
    .toBuffer()
  const rgba = Buffer.alloc(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = rgb[i * 3] ?? 0
    rgba[i * 4 + 1] = rgb[i * 3 + 1] ?? 0
    rgba[i * 4 + 2] = rgb[i * 3 + 2] ?? 0
    rgba[i * 4 + 3] = alfa[i] ?? 0
  }
  const webp = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .webp({ quality: 82, alphaQuality: 80 })
    .toBuffer()
  writeFileSync(`${salida}/suelo.webp`, webp)
  return { coordenadas: esquinasLngLat(v, px0, py0, width, height), bytes: webp.length }
}

interface TramoOsm {
  tags?: { highway?: string }
  geometry?: { lat: number; lon: number }[]
}

/** Calles principales de la región, recortadas para que solo queden fuera del contorno. */
function construirVias(): { tramos: number; bytes: number } {
  const clasePorHighway = new Map<string, string>()
  for (const [clase, highways] of Object.entries(realismo.vias.clases)) {
    for (const h of highways) clasePorHighway.set(h, clase)
  }
  const dentro = turf.feature(extent.boundary)
  const { elements } = readJson<{ elements: TramoOsm[] }>(paths.rawViasContexto)
  const features: Feature<LineString>[] = []
  for (const el of elements) {
    const clase = clasePorHighway.get(el.tags?.highway ?? '')
    if (!clase || !el.geometry || el.geometry.length < 2) continue
    // A la escala del contexto (decenas de km) unos 4 m de tolerancia no se notan y quitan la mitad del peso.
    const linea = turf.simplify(
      turf.lineString(
        el.geometry.map((p) => [redondear(p.lon, 5), redondear(p.lat, 5)]),
        { clase },
      ),
      { tolerance: 0.00004 },
    )
    const partes = turf.lineSplit(linea, dentro)
    const piezas = partes.features.length ? partes.features : [linea]
    for (const pieza of piezas) {
      const [a, b] = pieza.geometry.coordinates as [Position, Position]
      const medio = turf.midpoint(turf.point(a), turf.point(b))
      if (!turf.booleanPointInPolygon(medio, dentro)) features.push(pieza as Feature<LineString>)
    }
  }
  const texto = JSON.stringify({ type: 'FeatureCollection', features })
  writeFileSync(`${salida}/vias.geojson`, texto)
  return { tramos: features.length, bytes: Buffer.byteLength(texto) }
}

const suelo = await construirSuelo()
const vias = construirVias()
writeJson(DESCRIPTOR, {
  suelo: { coordenadas: suelo.coordenadas },
  region: { coordenadas: regionCorners().map(([a, b]) => [redondear(a), redondear(b)]) },
  relieve: { zoom: realismo.relieve.zoom, x: realismo.relieve.x, y: realismo.relieve.y },
  creditos: { sentinel: sentinel.escena, anio: sentinel.anio },
})
console.log(
  `✓ suelo ${(suelo.bytes / 1024).toFixed(0)} KB · ` +
    `${vias.tramos} tramos de calles (${(vias.bytes / 1024).toFixed(0)} KB) → ${salida}`,
)

// Procedencia en el manifiesto (build-map.ts conserva esta sección al regenerar el mapa).
anotarManifiesto(
  [
    {
      id: 'sentinel-2',
      name: `Copernicus Sentinel-2 L2A, escena ${sentinel.escena}`,
      layers: ['suelo'],
      license: 'Copernicus Sentinel data licence (libre, completa y abierta)',
      attribution: `Contains modified Copernicus Sentinel data ${sentinel.anio}`,
      url: 'https://sentinels.copernicus.eu/documents/247904/690755/Sentinel_Data_Legal_Notice',
      method: 'COG público en AWS, lectura por rangos (scripts/map/realismo/fetch-realismo.ts)',
      extractedAt: sentinel.obtenidoEl,
    },
    {
      id: 'copernicus-dem-glo30',
      name: 'Copernicus DEM GLO-30 vía Mapterhorn',
      layers: ['relieve'],
      license: 'COPERNICUS full, free and open license',
      attribution:
        'Copernicus DEM GLO-30 © DLR e.V. y Airbus Defence and Space, provisto por la Unión Europea y la ESA, vía Mapterhorn',
      url: 'https://mapterhorn.com/attribution',
      method: `Teselas z${realismo.relieve.zoom} de ${realismo.relieve.fuente} (scripts/map/realismo/fetch-realismo.ts)`,
    },
    {
      id: 'osm-vias-contexto',
      name: 'OpenStreetMap: calles principales de la región',
      layers: ['vias'],
      license: 'ODbL-1.0',
      attribution: '© OpenStreetMap contributors',
      url: 'https://www.openstreetmap.org/copyright',
      method:
        'Overpass API (scripts/map/realismo/fetch-realismo.ts); archivo derivado bajo ODbL 1.0',
    },
  ],
  ['suelo.webp', 'vias.geojson'],
)
