/**
 * npm run perf:budget (después de npm run build)
 *
 * Presupuesto de rendimiento: falla si el build supera los límites de peso (gzip) acordados. Lo ejecuta la
 * CI para que una dependencia nueva o un dato inflado no degraden la carga sin que nadie lo note.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { ROOT } from '../data/lib/dataset.ts'

const DIST = `${ROOT}dist/`
const KB = 1024

/**
 * Límites en KB gzip (salvo teselas, ya comprimidas). Margen de ~10 % sobre la medición de v1.0.0.
 *
 * `initialJs` subió de 120 a 122 en la v4.2.0 por el botón de compartir de la ficha: medido con y sin
 * la función, cuesta 0,7 KB gzip (119,9 → 120,6) y solo quedaban 0,1 de margen. Se midió antes si la
 * función podía pagarse sola (dibujar sus dos iconos a mano en vez de importarlos de Lucide no ahorra
 * nada) y cuál era la alternativa: partir el catálogo de i18n por idioma liberaría unos 5 KB, porque
 * hoy viajan los dos idiomas y solo se usa uno, pero obligaría a una importación dinámica al cambiar
 * de idioma en caliente. Si el paquete vuelve a crecer, esa partición es lo siguiente, no otra subida.
 *
 * `pmtiles` es el archivo completo, que el navegador NO descarga entero: se piden por rango solo las
 * teselas visibles. Por eso el límite que de verdad afecta a la fluidez es `largestTile` (la tesela más
 * pesada del archivo), y el del archivo entero cuida el peso del repositorio y del despliegue. Subió de
 * 1900 a 2100 KB al añadir el arbolado, y `dataJs` de 20 a 30 KB cuando el propietario verificó los
 * 103 locales y el dataset ganó horarios, descripciones y ubicaciones propias (v1.5.0), y de 30 a 34
 * al hacerse bilingüe la guía (v3.0.0): las etiquetas y las descripciones viajan en los dos idiomas.
 * Si el dato vuelve a crecer, antes de subir el número toca partir el paquete por idioma, que hoy no
 * se hace porque obligaría a recargar los datos al cambiar de idioma en caliente.
 */
const BUDGET = {
  initialJs: 122,
  initialCss: 10,
  mapJs: 320,
  mapCss: 15,
  dataJs: 34,
  pmtiles: 2100,
  largestTile: 140,
}

const gz = (file: string) => gzipSync(readFileSync(file)).byteLength / KB
const assets = readdirSync(`${DIST}assets`)
const html = readFileSync(`${DIST}index.html`, 'utf8')
const referenced = (ext: string) =>
  [...html.matchAll(/(?:src|href)="[^"]*assets\/([^"]+)"/g)]
    .map((match) => match[1] as string)
    .filter((name) => name.endsWith(ext))
const sum = (names: string[]) =>
  names.reduce((total, name) => total + gz(`${DIST}assets/${name}`), 0)
const matching = (pattern: RegExp) => assets.filter((name) => pattern.test(name))

const measured = {
  initialJs: sum(referenced('.js')),
  initialCss: sum(referenced('.css')),
  mapJs: sum(matching(/^MapView-.*\.js$/)),
  mapCss: sum(matching(/^MapView-.*\.css$/)),
  dataJs: sum(matching(/^(categories|plazas|places)-.*\.js$/)),
  pmtiles: statSync(`${DIST}map/zibata.pmtiles`).size / KB,
  largestTile:
    (
      JSON.parse(readFileSync(`${ROOT}data/geographic/manifest.json`, 'utf8')) as {
        outputs: { 'public/map/zibata.pmtiles': { largestTile: { bytes: number } } }
      }
    ).outputs['public/map/zibata.pmtiles'].largestTile.bytes / KB,
}

let failed = false
for (const [key, limit] of Object.entries(BUDGET) as [keyof typeof BUDGET, number][]) {
  const value = measured[key]
  const ok = value <= limit
  if (!ok) failed = true
  console.log(
    `${ok ? '✓' : '✗'} ${key.padEnd(10)} ${value.toFixed(1).padStart(8)} KB  (límite ${limit} KB)`,
  )
}
if (referenced('.js').length === 0) {
  console.error('✗ No se encontró el JS inicial en dist/index.html')
  failed = true
}
process.exit(failed ? 1 : 0)
