/**
 * npm run map:fetch:osm
 *
 * Descarga de OpenStreetMap (vía Overpass API) las vialidades, usos de suelo, áreas verdes, agua
 * y elementos con nombre del área configurada. Se ejecuta solo al preparar/actualizar el mapa:
 * la app publicada nunca consulta servidores de OSM.
 *
 * Datos © OpenStreetMap contributors, licencia ODbL 1.0.
 */
import { loadConfig, paths, writeJson } from './lib/paths.ts'

const config = loadConfig()
const [west, south, east, north] = config.area.bbox
const bbox = `${south},${west},${north},${east}`

const query = `[out:json][timeout:180][maxsize:268435456];
(
  way["highway"](${bbox});
  way["building"](${bbox});
  relation["building"](${bbox});
  way["landuse"](${bbox});
  relation["landuse"](${bbox});
  way["leisure"](${bbox});
  relation["leisure"](${bbox});
  way["natural"](${bbox});
  relation["natural"](${bbox});
  way["waterway"](${bbox});
  way["amenity"](${bbox});
  relation["amenity"](${bbox});
  node["amenity"](${bbox});
  node["shop"](${bbox});
  way["shop"](${bbox});
  node["name"](${bbox});
  way["place"](${bbox});
  relation["place"](${bbox});
);
out geom;`

interface OverpassResult {
  endpoint: string
  data: { elements: unknown[]; osm3s?: { timestamp_osm_base?: string } }
  baseTime: number
}

/** Los espejos de Overpass pueden ir meses atrasados: se acepta uno con datos de ≤ 7 días. */
const MAX_STALENESS_MS = 7 * 24 * 60 * 60 * 1000

async function fetchFreshest(): Promise<OverpassResult> {
  const attempts = 3
  let freshest: OverpassResult | null = null
  for (let attempt = 1; attempt <= attempts; attempt++) {
    for (const endpoint of config.sources.overpassEndpoints) {
      try {
        console.log(`→ Overpass (${attempt}/${attempts}): ${endpoint}`)
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'user-agent': 'visit-zibata/map-pipeline (preparación de datos estáticos)',
          },
          body: new URLSearchParams({ data: query }),
          signal: AbortSignal.timeout(280_000),
        })
        const body = await response.text()
        if (!response.ok || !body.trimStart().startsWith('{')) {
          console.warn(`  respuesta ${response.status}; se intenta el siguiente servidor`)
          continue
        }
        const data = JSON.parse(body) as OverpassResult['data']
        const baseTime = Date.parse(data.osm3s?.timestamp_osm_base ?? '') || 0
        console.log(`  datos OSM al ${data.osm3s?.timestamp_osm_base ?? 'desconocido'}`)
        const result = { endpoint, data, baseTime }
        if (!freshest || baseTime > freshest.baseTime) freshest = result
        if (Date.now() - baseTime <= MAX_STALENESS_MS) return result
      } catch (error) {
        console.warn(`  error: ${(error as Error).message}`)
      }
    }
    if (freshest) break
    await new Promise((resolve) => setTimeout(resolve, 15_000 * attempt))
  }
  if (!freshest) throw new Error('No fue posible descargar datos de Overpass. Inténtalo más tarde.')
  console.warn('⚠ Ningún servidor tenía datos de la última semana; se usa el más reciente.')
  return freshest
}

const { data, endpoint } = await fetchFreshest()
writeJson(paths.rawOsm, data, false)
writeJson(paths.rawOsmMeta, {
  source: 'OpenStreetMap',
  license: 'ODbL-1.0',
  attribution: '© OpenStreetMap contributors',
  endpoint,
  bbox: config.area.bbox,
  crs: 'EPSG:4326',
  fetchedAt: new Date().toISOString(),
  osmBaseTimestamp: data.osm3s?.timestamp_osm_base ?? null,
  elements: data.elements.length,
})
console.log(`✓ ${data.elements.length} elementos OSM → ${paths.rawOsm}`)
