import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { variantesDe } from '../../src/lib/image-variants.ts'
import { archivosEsperados, derivar, type FotoDeEntrada } from './derive-variants.ts'

describe('qué variantes tiene una foto de la que solo se sabe el ancho', () => {
  it('solo las más estrechas que ella: ampliar no mejora una imagen', () => {
    expect(variantesDe(1600)).toEqual([480, 960])
    expect(variantesDe(961)).toEqual([480, 960])
    expect(variantesDe(960)).toEqual([480])
    expect(variantesDe(600)).toEqual([480])
    expect(variantesDe(480)).toEqual([])
    expect(variantesDe(100)).toEqual([])
  })

  it('una foto sin ancho no tiene variantes', () => {
    expect(variantesDe(undefined)).toEqual([])
    expect(variantesDe(0)).toEqual([])
  })
})

describe('qué archivos pide la página', () => {
  it('el tamaño principal y cada variante, en WebP y AVIF', () => {
    expect(archivosEsperados({ src: 'images/places/x/a.webp', width: 1200 }).sort()).toEqual(
      [
        'images/places/x/a.avif',
        'images/places/x/a.webp',
        'images/places/x/a-480.avif',
        'images/places/x/a-480.webp',
        'images/places/x/a-960.avif',
        'images/places/x/a-960.webp',
      ].sort(),
    )
  })

  it('una foto de otro formato pide su WebP principal, no solo el AVIF', () => {
    expect(archivosEsperados({ src: 'images/places/x/a.jpeg', width: 700 })).toContain(
      'images/places/x/a.webp',
    )
  })

  it('sin variantes no pide nada más que `src`: la página no dibuja ningún <source>', () => {
    expect(archivosEsperados({ src: 'images/places/x/a.webp', width: 300 })).toEqual([])
    expect(archivosEsperados({ src: 'images/places/x/a.webp' })).toEqual([])
  })
})

describe('derivar con una imagen de verdad', () => {
  let raiz = ''
  const publico = () => join(raiz, 'public')
  const originales = () => join(raiz, 'photos-src')
  const destino = () => join(raiz, 'dist')

  beforeAll(async () => {
    // Sin caché, sharp no deja archivos abiertos: en Windows impedirían borrar la carpeta temporal.
    sharp.cache(false)
    raiz = mkdtempSync(join(tmpdir(), 'derivar-'))
    mkdirSync(join(publico(), 'images/places/local-a'), { recursive: true })
    mkdirSync(join(publico(), 'images/places/local-b'), { recursive: true })
    mkdirSync(join(originales(), 'local-b'), { recursive: true })
    // Una foto grande (WebP, ya reducida) y una pequeña (JPEG con su original en photos-src).
    await sharp({ create: { width: 1200, height: 800, channels: 3, background: '#a33' } })
      .webp()
      .toFile(join(publico(), 'images/places/local-a/grande.webp'))
    await sharp({ create: { width: 700, height: 500, channels: 3, background: '#38a' } })
      .jpeg()
      .toFile(join(originales(), 'local-b/media.jpeg'))
    writeFileSync(join(publico(), 'images/places/local-b/media.jpeg'), 'copia que sirve la guía')
  })
  afterAll(() => rmSync(raiz, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }))

  const fotos: FotoDeEntrada[] = [
    { placeId: 'local-a', src: 'images/places/local-a/grande.webp', width: 1200 },
    { placeId: 'local-b', src: 'images/places/local-b/media.jpeg', width: 700 },
    // Ya optimizada a mano: no se toca.
    {
      placeId: 'local-c',
      src: 'images/places/local-c/vieja.webp',
      width: 1600,
      variants: [480, 960],
    },
    // Demasiado pequeña para tener variantes: tampoco.
    { placeId: 'local-d', src: 'images/places/local-d/chica.webp', width: 300 },
  ]

  it('genera todo lo que la página pide, con el ancho que dice el nombre, y no falta nada', async () => {
    // `vite build` ya habría copiado `public/` a `dist/`; aquí se copia la grande como lo haría.
    mkdirSync(join(destino(), 'images/places/local-a'), { recursive: true })
    await sharp(join(publico(), 'images/places/local-a/grande.webp')).toFile(
      join(destino(), 'images/places/local-a/grande.webp'),
    )
    const { generados, faltan } = await derivar({
      fotos,
      publico: publico(),
      originales: originales(),
      destino: destino(),
    })
    expect(faltan).toEqual([])
    for (const foto of fotos.slice(0, 2)) {
      for (const esperado of archivosEsperados(foto)) {
        expect(existsSync(join(destino(), esperado)), esperado).toBe(true)
      }
    }
    const ancho = async (ruta: string) => (await sharp(join(destino(), ruta)).metadata()).width
    expect(await ancho('images/places/local-a/grande-480.webp')).toBe(480)
    expect(await ancho('images/places/local-a/grande-960.avif')).toBe(960)
    expect(await ancho('images/places/local-a/grande.avif')).toBe(1200)
    // Sale del ORIGINAL de photos-src (la copia que sirve la guía de este ejemplo ni siquiera es una imagen).
    expect(await ancho('images/places/local-b/media-480.webp')).toBe(480)
    expect(await ancho('images/places/local-b/media.webp')).toBe(700)
    // Ni la optimizada a mano ni la pequeña generan nada.
    expect(generados.some((ruta) => ruta.includes('local-c') || ruta.includes('local-d'))).toBe(
      false,
    )
  })

  it('si falta el archivo de una foto, lo dice en vez de dejar un <source> roto', async () => {
    const { faltan } = await derivar({
      fotos: [{ placeId: 'local-x', src: 'images/places/local-x/fantasma.webp', width: 1200 }],
      publico: publico(),
      originales: originales(),
      destino: destino(),
    })
    expect(faltan.join(' ')).toContain('fantasma.webp')
  })
})
