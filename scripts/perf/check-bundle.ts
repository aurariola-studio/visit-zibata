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
 * `initialJs` subió de 120 a 122 en la v4.2.0 por el botón de compartir de la ficha, y el comentario de
 * entonces dejaba escrito qué hacer cuando el paquete volviera a crecer: partir el catálogo de i18n
 * por idioma, no subir el número. En la v4.7.1 pasó justo eso (el aviso de privacidad del conteo de
 * visitas desbordó el límite por 0,1 KB) y se hizo: cada visita baja un idioma y el paquete quedó en
 * 119,3 KB. El límite se mantiene en 122 porque ahora sí hay margen, no porque sobre.
 *
 * Si vuelve a apretar, lo siguiente ya no es esta partición. Hay que medir antes: el reparto de
 * fragmentos es sensible (ver la nota sobre `await` de nivel superior en el registro de cambios), así
 * que conviene comprobar el desglose real de `dist/index.html` en vez de suponer dónde está el peso.
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
 * De 122 a 126 en la rama del tutorial (v4.27). El tutorial pasó a montar las piezas reales de la
 * guía, y eso hace que `placeIcon`, `useVisits` y `createLucideIcon` compartan fragmento entre la
 * entrada y el tutorial diferido: 2,2 KB que son solo del troceado, porque el contenido ya estaba
 * dentro del paquete. El resto, 1,5 KB, es copia nueva: los cinco pasos y los nombres completos de
 * categoría ("Comida Italiana") en los metadatos. El código del tutorial **no** entra en el paquete
 * inicial: vive en su fragmento diferido. Medido antes de subir, 125,0 de 126.
 *
 * La partición por función sigue pendiente y es la jugada cuando esto vuelva a apretar: sacar del
 * catálogo las cadenas que solo necesita el tutorial (se cargan al abrirlo) y las que solo usa el
 * build. El costo es el mismo de la partición por idioma: el cambio de idioma y el arranque del
 * tutorial pasan a ser asíncronos.
 *
 * De 126 a 128 (2026-11-09, decisión del propietario), con el paquete medido en 125,9. Se midió antes de
 * subir, y lo que dijo la medición:
 *
 *     ~64 KB  react-dom          el marco
 *     ~24 KB  la aplicación      (filtros, paneles, tarjetas)
 *      ~8 KB  fuse.js            el buscador: `SearchIndex.search()` es síncrono y se usa en el primer pintado
 *                                y con `?q=`; diferirlo cambia esa interfaz y deja la guía sin resultados un instante
 *     ~12 KB  catálogo del idioma activo
 *     ~11 KB  iconos de categorías
 *    ~1,3 KB  runtimeValidation  capa de seguridad (enlaces, teléfonos, rutas de fotos): no se quita
 *
 * No hay código muerto: el empaquetador ya elimina lo no usado. El salto de 125,7 a 125,9 no fue código nuevo: llegó
 * al abrir el mapa del contorno en el panel (un módulo pasó a un fragmento compartido por la guía y el panel), el
 * mismo caso de "solo del troceado" de la subida anterior. Con un margen de 0,1 KB, un cambio del troceado que no
 * añade ni una línea basta para tumbar el CI. Con Brotli, que es lo que sirve Cloudflare, el paquete inicial
 * pesa 109 a 120 KB, y 2 KB más son unos 10 ms en 4G lento. Lo que siga apretando ya no se arregla subiendo el
 * número: hay que escoger entre diferir `fuse.js` y partir el catálogo por función, y las dos cambian cómo se
 * comporta la guía.
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
 * De 34 a 40 con 103 locales: la medición estaba en 33,1 y cada local nuevo suma unos 0,3 KB, así
 * que el margen se acababa con uno o dos más. 40 deja sitio para unos veinte locales con el dato tal
 * como es hoy. Si vuelve a apretar, ahora sí toca partir el paquete por idioma, que no se hace porque
 * obligaría a recargar los datos al cambiar de idioma en caliente, y medir antes de subir otra vez.
 *
 * `initialJs`: de 128 a 130 (2026-11-12, decisión del propietario). El filtro por sector, los iconos de
 * Salud y la cápsula fija dejaron el paquete en 128,1; se midió antes de subir y ya se había movido al
 * build el texto de las páginas de sector (de 128,2 a 128,1). Se sube en vez de recortar para no mezclar
 * una refactorización con la entrega del sector Salud.
 *
 * Lo que queda pendiente, y lo que debe hacerse para volver a 128: sacar del paquete inicial el texto que
 * no se necesita al abrir la guía. Medido sobre el catálogo en español (6,9 KB gzip en total):
 *
 *     ~2,7 KB  `about`       las páginas de información: solo se leen al abrirlas
 *     ~0,9 KB  `seo`         sobre todo del build
 *     ~0,9 KB  `onboarding`  el tutorial de la primera visita
 *
 * Se cargarían bajo demanda y mientras llegan se pinta un esqueleto (skeleton) del tamaño del contenido, para
 * que la página no salte. El costo es el de siempre: el texto de esos grupos pasa a ser asíncrono y el
 * cambio de idioma en caliente tiene que volver a pedirlos. Empezar por `about`, que es el grupo grande.
 *
 * Sector Fitness y Deporte (2026-11-12): sus once iconos nuevos (Tabler, Hugeicons, Material
 * Design Icons y Material Symbols) sumaban 3,4 KB y dejaban el paquete en 131,5, por encima del límite. Ningún giro del sector
 * tiene locales todavía, así que se sacaron a su propio fragmento (`iconos-deporte-*.js`, 2,8 KB), que
 * `CategoryIcon` pide la primera vez que pinta uno y mientras tanto reserva la caja del icono. El
 * paquete queda en 129,4, con los dos de Lucide de este sector también diferidos. `proteina`, de Comida y con locales hoy, se queda dentro para que no parpadee.
 * Cuando el sector tenga locales y su icono salga en el primer pintado, habrá que decidir entre
 * precargar el fragmento y volver a meterlo, y eso se mide con la cuenta de entonces.
 */
const BUDGET = {
  initialJs: 130,
  // 11 y no 10: el estilo del contenido escrito que trae cada página (v4.16) dejó la medida en 9,9
  // de 10, y un margen de cien bytes hace que el siguiente cambio honesto rompa la compilación sin
  // que haya pasado nada. El tope sigue existiendo para cazar un crecimiento descuidado, no para
  // discutir decimales.
  initialCss: 11,
  mapJs: 320,
  mapCss: 15,
  dataJs: 40,
  // 2450 y no 2100 desde que la arboleda subió de densidad (v4.27): la separación media entre
  // árboles bajó de 19 a 15 metros, de 6 800 a 11 580 árboles, y el juego entero pasó de 2 095 a
  // 2 373 KB. Se sube este tope y **no** el de `largestTile`, que es el que mide lo que el
  // navegador descarga de verdad y que se queda en 113 de 140: el conjunto solo cuida el peso del
  // despliegue. Si alguna vez hay que recortar, el primer sitio son los árboles, no el código.
  //
  // 2600 desde Overture 2026-10-21.0: trae 16 020 edificios en el mapa (antes 14 028) y el juego
  // entero pasó de 2 373 a 2 448 KB, con 2,4 KB de margen. La tesela más pesada casi no cambió
  // (93,7 KB). Son datos nuevos de verdad, no descuido; se deja ~150 KB para la siguiente versión.
  tiles: 2600,
  largestTile: 140,
  // Lo que baja quien ve el realismo, comprimido: suelo, contexto, calles de la region, las mallas de
  // edificios y arboles y una tesela de relieve. Hoy ronda 935 KB medidos con gzip (con Brotli en el CDN
  // son unos 100 KB menos); los edificios son casi dos tercios. Sube solo si cambian los datos.
  realismoDatos: 1000,
  // El código de las capas propias (edificios, árboles, respaldo): un chunk aparte que solo baja quien ve el realismo.
  realismoJs: 12,
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
/** El chunk que carga `MapView` con `import('./realismo/install.ts')`. */
const REALISMO_CHUNK = /^install-.*\.js$/

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

/** Peso comprimido de lo que siempre baja con el realismo, más la tesela de relieve más pesada. */
function medirRealismo(dir: string): number {
  const relieve = readdirSync(`${dir}/relieve/12`, { recursive: true })
    .filter((nombre): nombre is string => typeof nombre === 'string' && nombre.endsWith('.webp'))
    .map((nombre) => gz(`${dir}/relieve/12/${nombre}`))
  const fijos = ['suelo.webp', 'contexto.webp', 'vias.geojson', 'edificios.bin', 'arboles.bin'].map(
    (nombre) => gz(`${dir}/${nombre}`),
  )
  return fijos.reduce((total, peso) => total + peso, 0) + Math.max(0, ...relieve)
}

const measured = {
  initialJs: sum(referenced('.js')),
  initialCss: sum(referenced('.css')),
  mapJs: sum(matching(/^MapView-.*\.js$/)),
  mapCss: sum(matching(/^MapView-.*\.css$/)),
  dataJs: sum(matching(/^(categories|plazas|places)-.*\.js$/)),
  tiles: teselas.total,
  largestTile: teselas.mayor,
  realismoJs: sum(matching(REALISMO_CHUNK)),
  realismoDatos: medirRealismo(`${DIST}map/realismo`),
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
// Si el chunk se renombrara, la suma daría 0 y el límite pasaría sin medir nada.
if (matching(REALISMO_CHUNK).length === 0) {
  console.error('✗ No se encontró el chunk de las capas de realismo (install-*.js) en dist/assets')
  failed = true
}
process.exit(failed ? 1 : 0)
