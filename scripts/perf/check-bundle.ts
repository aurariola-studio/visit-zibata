/**
 * npm run perf:budget (después de npm run build)
 *
 * Presupuesto de rendimiento: falla si el build supera los límites de peso (gzip) acordados. Lo ejecuta la
 * CI para que una dependencia nueva o un dato inflado no degraden la carga sin que nadie lo note.
 */
import { readdirSync, readFileSync } from 'node:fs'
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
 * Medición de la v4.6.0, para quien se tope con el techo: 121,7 de 122, es decir 0,3 KB de margen.
 * Son dos archivos, y el desglose dice dónde está la grasa:
 *
 *     110,9 KB  index-*.js   React 19 y la aplicación
 *      10,8 KB  i18n-*.js    los dos catálogos de idioma, de los que cada visita usa uno
 *
 * O sea que la partición de arriba sigue siendo la jugada, y ahora está medida. Su costo también:
 * `setLocale()` se llama de forma síncrona desde el efecto de layout de `useUrlSync` y desde el
 * botón de idioma, así que cargar el catálogo bajo demanda vuelve asíncrono el cambio de idioma y
 * toca la sincronización de URL. No es un cambio de una tarde, pero tampoco una reescritura.
 *
 * El número no se sube porque el paquete no ha crecido: la v4.6.0 añadió 232 páginas, un árbol de
 * rutas por idioma y las imágenes de vista previa sin mover `initialJs` ni un byte, porque todo eso
 * ocurre al compilar. El margen apretado es un problema del próximo cambio que toque el paquete
 * inicial, y entonces toca partir, no renumerar.
 *
 * `tiles` es el juego de teselas entero, que el navegador NO descarga: pide solo las que entran en
 * pantalla. Por eso el límite que de verdad afecta a la fluidez es `largestTile` (la tesela más pesada),
 * y el del conjunto cuida el peso del despliegue. Se miden **comprimidas**, que es como viajan: en
 * disco pesan el doble porque se escriben en crudo y las comprime el CDN (ver scripts/build/map-tiles.ts).
 * Hasta la v4.7.0 esto medía `dist/map/zibata.pmtiles`, un archivo único que se leía por rangos; el
 * límite se mantiene en 2100 KB porque el peso por la red no cambió al soltar las teselas.
 *
 * `dataJs` subió de 20 a 30 KB cuando el propietario verificó los
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
  tiles: 2100,
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

/** Recorre `dist/map/tiles` y mide cada tesela comprimida, que es como la recibe el navegador. */
function medirTeselas(dir: string): { total: number; mayor: number } {
  let total = 0
  let mayor = 0
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = `${dir}/${entrada.name}`
    if (entrada.isDirectory()) {
      const hijo = medirTeselas(ruta)
      total += hijo.total
      mayor = Math.max(mayor, hijo.mayor)
    } else if (entrada.name.endsWith('.pbf')) {
      const peso = gz(ruta)
      total += peso
      mayor = Math.max(mayor, peso)
    }
  }
  return { total, mayor }
}

const teselas = medirTeselas(`${DIST}map/tiles`)

const measured = {
  initialJs: sum(referenced('.js')),
  initialCss: sum(referenced('.css')),
  mapJs: sum(matching(/^MapView-.*\.js$/)),
  mapCss: sum(matching(/^MapView-.*\.css$/)),
  dataJs: sum(matching(/^(categories|plazas|places)-.*\.js$/)),
  tiles: teselas.total,
  largestTile: teselas.mayor,
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
