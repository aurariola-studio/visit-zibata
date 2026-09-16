/**
 * npm run map:fetch:buildings
 *
 * Descarga las huellas de edificios de Overture Maps (GeoParquet público en S3, sin credenciales)
 * para el área configurada, usando DuckDB. OSM casi no tiene edificios en Zibatá; Overture combina
 * OSM + Microsoft ML Buildings + Google Open Buildings. Tarda ~15 min: DuckDB debe leer los índices
 * de todos los archivos Parquet del tema.
 *
 * Datos © OpenStreetMap contributors, Overture Maps Foundation — licencia ODbL 1.0.
 */
import { mkdirSync, rmSync } from 'node:fs'
import { DuckDBInstance } from '@duckdb/node-api'
import { loadConfig, paths, writeJson } from './lib/paths.ts'

const config = loadConfig()
const [west, south, east, north] = config.area.bbox
const release = config.sources.overtureRelease
const started = Date.now()

mkdirSync(paths.rawDir, { recursive: true })
rmSync(paths.rawBuildings, { force: true })

const db = await DuckDBInstance.create(':memory:')
const connection = await db.connect()
await connection.run(
  `INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial; SET s3_region='us-west-2';`,
)

const output = paths.rawBuildings.replaceAll('\\', '/').replaceAll("'", "''")
console.log(
  `→ Overture ${release}: edificios en [${config.area.bbox.join(', ')}] (paciencia, ~15 min)`,
)
await connection.run(`
  COPY (
    SELECT id, subtype, class, height, num_floors, min_height, names.primary AS name,
           array_to_string(list_transform(sources, s -> s.dataset), ',') AS src,
           geometry
    FROM read_parquet('s3://overturemaps-us-west-2/release/${release}/theme=buildings/type=building/*',
                      hive_partitioning = 1)
    WHERE bbox.xmin > ${west} AND bbox.xmax < ${east} AND bbox.ymin > ${south} AND bbox.ymax < ${north}
  ) TO '${output}' WITH (FORMAT GDAL, DRIVER 'GeoJSON');
`)

const count = await connection.runAndReadAll(
  `SELECT count(*)::INTEGER AS n FROM ST_Read('${output}')`,
)
const total = Number(count.getRowObjects()[0]?.n ?? 0)

writeJson(paths.rawBuildingsMeta, {
  source: 'Overture Maps Foundation — theme=buildings',
  release,
  license: 'ODbL-1.0',
  attribution: '© OpenStreetMap contributors, Overture Maps Foundation',
  upstream: ['OpenStreetMap', 'Microsoft ML Buildings', 'Google Open Buildings'],
  bbox: config.area.bbox,
  crs: 'EPSG:4326',
  fetchedAt: new Date().toISOString(),
  features: total,
})
console.log(
  `✓ ${total} edificios → ${paths.rawBuildings} (${Math.round((Date.now() - started) / 1000)} s)`,
)
