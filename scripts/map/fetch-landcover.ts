/**
 * npm run map:fetch:trees
 *
 * Descarga la cobertura arbórea (`land_cover`, subtipo `forest`) de Overture Maps para el área
 * configurada. Overture la deriva de ESA WorldCover: clasificación de imágenes Sentinel a 10 m, es
 * decir, dónde hay copa de árbol en la realidad. OpenStreetMap no tiene árboles mapeados en Zibatá
 * (ni `natural=tree` ni bosques), así que esta es la única fuente abierta que dice dónde los hay.
 *
 * Datos © ESA WorldCover (CC BY 4.0), Overture Maps Foundation.
 */
import { mkdirSync, rmSync } from 'node:fs'
import { DuckDBInstance } from '@duckdb/node-api'
import { loadConfig, paths, writeJson } from './lib/paths.ts'

const config = loadConfig()
const [west, south, east, north] = config.area.bbox
const release = config.sources.overtureRelease

mkdirSync(paths.rawDir, { recursive: true })
rmSync(paths.rawTreeCover, { force: true })

const db = await DuckDBInstance.create(':memory:')
const connection = await db.connect()
await connection.run(
  `INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial; SET s3_region='us-west-2';`,
)
const output = paths.rawTreeCover.replaceAll('\\', '/').replaceAll("'", "''")
console.log(`→ Overture ${release}: cobertura arbórea en [${config.area.bbox.join(', ')}]`)
// Solo el nivel de mayor detalle (max_zoom más alto): los demás son generalizaciones del mismo dato.
await connection.run(`
  COPY (
    SELECT id, subtype, geometry
    FROM read_parquet('s3://overturemaps-us-west-2/release/${release}/theme=base/type=land_cover/*',
                      hive_partitioning = 1)
    WHERE subtype = 'forest'
      AND cartography.max_zoom = (
        SELECT max(cartography.max_zoom)
        FROM read_parquet('s3://overturemaps-us-west-2/release/${release}/theme=base/type=land_cover/*',
                          hive_partitioning = 1)
        WHERE bbox.xmin < ${east} AND bbox.xmax > ${west} AND bbox.ymin < ${north} AND bbox.ymax > ${south}
      )
      AND bbox.xmin < ${east} AND bbox.xmax > ${west} AND bbox.ymin < ${north} AND bbox.ymax > ${south}
  ) TO '${output}' WITH (FORMAT GDAL, DRIVER 'GeoJSON');
`)
const count = await connection.runAndReadAll(
  `SELECT count(*)::INTEGER AS n FROM ST_Read('${output}')`,
)
const total = Number(count.getRowObjects()[0]?.n ?? 0)
writeJson(paths.rawTreeCoverMeta, {
  source: 'Overture Maps Foundation: theme=base, type=land_cover, subtype=forest',
  release,
  upstream: ['ESA WorldCover 10 m'],
  license: 'CC-BY-4.0',
  attribution: '© ESA WorldCover, Overture Maps Foundation',
  bbox: config.area.bbox,
  crs: 'EPSG:4326',
  fetchedAt: new Date().toISOString(),
  features: total,
})
console.log(`✓ ${total} polígonos de copa arbórea → ${paths.rawTreeCover}`)
