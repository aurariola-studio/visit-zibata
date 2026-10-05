/**
 * Extrae `public/map/zibata.pmtiles` a teselas sueltas y su TileJSON, al compilar.
 *
 * Por qué no se sirve el archivo tal cual, que era lo que hacíamos: PMTiles se lee con **peticiones
 * Range**, y el hosting actual (Cloudflare Workers con assets estáticos) no las sirve. Devuelve 200
 * con el archivo entero para cualquier `Range`, sin `Accept-Ranges`, así que la librería aborta con
 * "Check that your storage backend supports HTTP Byte Serving" y el mapa no carga. No es una opción
 * que se pueda activar: ese servidor no hace byte serving.
 *
 * Se podría haber mudado el archivo a un almacén que sí lo haga (R2, S3), que es lo que recomienda
 * Protomaps. No se hizo porque sería un segundo origen, y la guía promete y comprueba en sus pruebas
 * que **no hace ni una petición externa**.
 *
 * Y se podría haber escrito un Worker que implemente los rangos. Tampoco, porque deja el proyecto
 * atado a que el hosting haga algo especial, que es el problema de hoy con otro disfraz.
 *
 * Esto en cambio lo quita de raíz: un archivo por tesela, pedido como cualquier mapa del mundo. El
 * archivo único existe para no poner millones de teselas en un bucket; aquí son **259** (z12 a z16),
 * pesan lo mismo por la red porque dentro del archivo ya viajaban comprimidas, y el navegador baja
 * solo las que entran en pantalla. A cambio, el sitio vuelve a servirse en cualquier hosting
 * estático, sin requisitos.
 *
 * El TileJSON no es decoración: es el descriptor estándar de un juego de teselas, y es lo que
 * mantiene el aviso de "no pudimos cargar el mapa". MapLibre lo pide antes que ninguna tesela, así
 * que si falla es un error **de fuente**, que es lo que `MapView` distingue de una tesela suelta.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { PMTiles } from 'pmtiles'
import type { Plugin } from 'vite'

/** El archivo de origen vive en `public/`, con su huella en `data/geographic/manifest.json`. */
const ARCHIVO = 'public/map/zibata.pmtiles'

/** De latitud a fila de tesela, en la proyección de siempre (Web Mercator). */
const filaDe = (lat: number, n: number): number =>
  Math.floor(
    ((1 -
      Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) /
      2) *
      n,
  )

export function mapTiles(options: { base: string }): Plugin {
  return {
    name: 'zibata-map-tiles',
    apply: 'build',
    // `writeBundle` y no `generateBundle`: para entonces Vite ya ha copiado `public/` a `dist/`, y
    // estas teselas se escriben al lado sin pelearse con esa copia.
    async writeBundle(output) {
      const dist = output.dir ?? 'dist'
      const buffer = readFileSync(ARCHIVO)
      const archivo = new PMTiles({
        getKey: () => ARCHIVO,
        getBytes: async (offset, length) => ({
          data: buffer.buffer.slice(
            buffer.byteOffset + offset,
            buffer.byteOffset + offset + length,
          ),
        }),
      })

      const cabecera = await archivo.getHeader()
      const metadatos = (await archivo.getMetadata()) as Record<string, unknown>
      const destino = join(dist, 'map', 'tiles')
      let escritas = 0
      let mayor = 0

      for (let z = cabecera.minZoom; z <= cabecera.maxZoom; z++) {
        const n = 2 ** z
        const columnaDe = (lon: number) => Math.floor(((lon + 180) / 360) * n)
        for (let x = columnaDe(cabecera.minLon); x <= columnaDe(cabecera.maxLon); x++) {
          for (let y = filaDe(cabecera.maxLat, n); y <= filaDe(cabecera.minLat, n); y++) {
            const tesela = await archivo.getZxy(z, x, y)
            if (!tesela) continue
            // Se escriben descomprimidas: el CDN las comprime por tipo de contenido, y así no hace
            // falta que el hosting entienda `Content-Encoding`, que sería otro requisito más.
            const datos = Buffer.from(tesela.data)
            const ruta = join(destino, String(z), String(x), `${y}.pbf`)
            mkdirSync(dirname(ruta), { recursive: true })
            writeFileSync(ruta, datos)
            escritas++
            mayor = Math.max(mayor, datos.length)
          }
        }
      }

      const tileJson = {
        tilejson: '3.0.0',
        scheme: 'xyz',
        tiles: [`${options.base}map/tiles/{z}/{x}/{y}.pbf`],
        minzoom: cabecera.minZoom,
        maxzoom: cabecera.maxZoom,
        bounds: [cabecera.minLon, cabecera.minLat, cabecera.maxLon, cabecera.maxLat],
        center: [cabecera.centerLon, cabecera.centerLat, cabecera.centerZoom],
        name: metadatos.name,
        description: metadatos.description,
        attribution: metadatos.attribution,
        vector_layers: metadatos.vector_layers,
      }
      writeFileSync(join(dist, 'map', 'tiles.json'), `${JSON.stringify(tileJson, null, 2)}\n`)

      console.log(
        `✓ teselas: ${escritas} archivos (z${cabecera.minZoom}-z${cabecera.maxZoom}), la mayor ${Math.round(mayor / 1024)} KB`,
      )
    },
  }
}
