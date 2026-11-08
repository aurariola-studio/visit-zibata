/**
 * node scripts/images/derive-variants.ts [dist]
 *
 * Genera en `dist/` lo que una foto subida desde el panel no trae: sus variantes reducidas y el AVIF.
 *
 * El panel sube la foto ya reducida en el navegador, en un solo tamaño, porque el Worker no tiene `sharp`.
 * La guía, en cambio, pide `<picture>` con AVIF y WebP en varios anchos (`PlacePicture.tsx`), y lo deduce
 * del ancho de la foto (`variantesDe`). Este paso corre después de `vite build`, en `npm run build`, y
 * produce esos archivos sin guardarlos en git: nada que regenerar a mano, y nada que un commit del panel
 * pueda dejar a medias.
 *
 * Una foto que ya lista `variants` (la optimizó `npm run images:optimize` y sus archivos están en el
 * repositorio) no se toca. Si falta algo de lo que la página va a pedir, el build falla: un `<source>`
 * sin archivo no cae a la imagen de abajo y dejaría la foto rota.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, extname, join } from 'node:path'
import sharp from 'sharp'
import { variantesDe } from '../../src/lib/image-variants.ts'
import { ROOT } from '../data/lib/dataset.ts'

export interface FotoDeEntrada {
  placeId: string
  src: string
  width?: number
  variants?: number[]
}

/** Todo lo que la página pedirá de una foto, relativo a la raíz del sitio. */
export function archivosEsperados(foto: Pick<FotoDeEntrada, 'src' | 'width'>): string[] {
  // Sin variantes la página no pide `<source>` alguno: solo la imagen de `src`.
  if (variantesDe(foto.width).length === 0) return []
  const sinExtension = foto.src.replace(/\.[a-z0-9]+$/i, '')
  const formatos = ['webp', 'avif'] as const
  return [
    // El tamaño principal en cada formato (el de `src` ya existe si es de ese formato).
    ...formatos.map((formato) => `${sinExtension}.${formato}`),
    ...variantesDe(foto.width).flatMap((ancho) =>
      formatos.map((formato) => `${sinExtension}-${ancho}.${formato}`),
    ),
  ]
}

/** El original, si lo guardó el panel en `photos-src`, o la copia que sirve la guía. */
function origenDe(foto: FotoDeEntrada, publico: string, originales: string): string | null {
  const nombre = basename(foto.src, extname(foto.src))
  const carpeta = join(originales, foto.placeId)
  if (existsSync(carpeta)) {
    const original = readdirSync(carpeta).find(
      (archivo) => basename(archivo, extname(archivo)) === nombre,
    )
    if (original) return join(carpeta, original)
  }
  const servida = join(publico, foto.src)
  return existsSync(servida) ? servida : null
}

const CALIDAD = {
  webp: { principal: 80, variante: 78 },
  avif: { principal: 55, variante: 52 },
} as const

export interface Resultado {
  generados: string[]
  faltan: string[]
}

/** Genera lo que falta de cada foto sin `variants` y comprueba que no falte nada. */
export async function derivar(opciones: {
  fotos: FotoDeEntrada[]
  /** Donde está la copia que sirve la guía (`public/`). */
  publico: string
  /** Donde guarda el panel el original (`data/commercial/photos-src`). */
  originales: string
  /** Donde se escribe lo generado (`dist/`). */
  destino: string
}): Promise<Resultado> {
  const generados: string[] = []
  const faltan: string[] = []
  for (const foto of opciones.fotos) {
    if (foto.variants && foto.variants.length > 0) continue
    if (variantesDe(foto.width).length === 0) continue
    const sinExtension = foto.src.replace(/\.[a-z0-9]+$/i, '')
    const origen = origenDe(foto, opciones.publico, opciones.originales)
    if (!origen) {
      faltan.push(`${foto.src} (no está ni en photos-src ni en public)`)
      continue
    }
    mkdirSync(dirname(join(opciones.destino, foto.src)), { recursive: true })
    const imagen = sharp(origen).rotate()
    const { width = 0 } = await imagen.metadata()
    // Lo que el dato dice del ancho es lo que la página usará para pedir los archivos.
    const principal = Math.min(foto.width ?? width, width || Infinity)

    for (const formato of ['webp', 'avif'] as const) {
      const ruta = `${sinExtension}.${formato}`
      const salida = join(opciones.destino, ruta)
      // `src` ya se copió tal cual desde `public/`; no se vuelve a escribir.
      if (ruta === foto.src && existsSync(salida)) continue
      const ajustada = imagen.clone().resize({ width: principal, withoutEnlargement: true })
      await (formato === 'webp'
        ? ajustada.webp({ quality: CALIDAD.webp.principal })
        : ajustada.avif({ quality: CALIDAD.avif.principal })
      ).toFile(salida)
      generados.push(ruta)
    }
    for (const ancho of variantesDe(foto.width)) {
      for (const formato of ['webp', 'avif'] as const) {
        const ruta = `${sinExtension}-${ancho}.${formato}`
        const reducida = imagen.clone().resize({ width: ancho })
        await (formato === 'webp'
          ? reducida.webp({ quality: CALIDAD.webp.variante })
          : reducida.avif({ quality: CALIDAD.avif.variante })
        ).toFile(join(opciones.destino, ruta))
        generados.push(ruta)
      }
    }
    for (const esperado of archivosEsperados(foto)) {
      if (!existsSync(join(opciones.destino, esperado))) faltan.push(esperado)
    }
  }
  return { generados, faltan }
}

async function main(): Promise<void> {
  const destino = process.argv[2] ?? join(ROOT, 'dist')
  const lugares = JSON.parse(
    readFileSync(join(ROOT, 'data', 'commercial', 'places.json'), 'utf8'),
  ) as { places: { id: string; photos: Omit<FotoDeEntrada, 'placeId'>[] }[] }
  const fotos = lugares.places.flatMap((place) =>
    place.photos.map((foto) => ({ ...foto, placeId: place.id })),
  )
  const { generados, faltan } = await derivar({
    fotos,
    publico: join(ROOT, 'public'),
    originales: join(ROOT, 'data', 'commercial', 'photos-src'),
    destino,
  })
  if (faltan.length > 0) {
    console.error(`✗ Faltan archivos de fotos en ${destino}:`)
    for (const archivo of faltan) console.error(`  ${archivo}`)
    process.exit(1)
  }
  console.log(
    generados.length > 0
      ? `✓ ${generados.length} archivos de fotos generados en ${destino}`
      : '✓ Ninguna foto necesita variantes',
  )
}

// Solo como script: importarlo desde una prueba no debe construir nada.
if (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]))) await main()
