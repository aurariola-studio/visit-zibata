import { afterEach, describe, expect, it, vi } from 'vitest'
import categoriasJson from '../data/commercial/categories.json' with { type: 'json' }
import lugaresJson from '../data/commercial/places.json' with { type: 'json' }
import plazasJson from '../data/commercial/plazas.json' with { type: 'json' }
import type { CommercialDataset } from '../src/data/relations.ts'
import { CategoriesFileSchema, PlacesFileSchema, PlazasFileSchema } from '../src/data/schemas.ts'
import { archivosDeFoto, guardarNegocio, prepararNegocio } from './contenido.ts'

/*
 * Nada aquí nombra un local real: se escoge uno del propio dataset y se le inventan dos fotos bajo su
 * carpeta. Borrar o cambiar de dirección un local de la guía no puede poner en rojo estas pruebas.
 */
const completo: CommercialDataset = {
  categories: CategoriesFileSchema.parse(categoriasJson).categories,
  sectors: CategoriesFileSchema.parse(categoriasJson).sectors,
  plazas: PlazasFileSchema.parse(plazasJson).plazas,
  places: PlacesFileSchema.parse(lugaresJson).places,
}
const HOY = '2026-11-08'
const base = completo.places.find((fila) => fila.active && fila.description?.en)
if (!base) throw new Error('el dataset necesita un local activo con descripción en inglés')

const foto = (nombre: string) => ({
  src: `images/places/${base.id}/${nombre}.webp`,
  alt: nombre,
  width: 1200,
  height: 800,
  placeholder: '#aabbcc',
})
const conFotos = { ...base, photos: [foto('portada'), foto('terraza')] }
const dataset: CommercialDataset = {
  ...completo,
  places: completo.places.map((fila) => (fila.id === base.id ? conFotos : fila)),
}
const crudo = (() => {
  const lugares = structuredClone(lugaresJson) as unknown as { places: Record<string, unknown>[] }
  const fila = lugares.places.find((otra) => otra.id === base.id)
  if (fila) fila.photos = conFotos.photos
  return {
    categories: categoriasJson as unknown as Record<string, unknown>,
    plazas: plazasJson as unknown as Record<string, unknown>,
    places: lugares as unknown as Record<string, unknown>,
  }
})()

const formulario = (fotos: { src: string; alt: string }[]) => ({
  id: base.id,
  nombre: base.name,
  plazaId: base.plazaId,
  giros: base.giros,
  descripcionEs: base.description?.es ?? 'Texto',
  descripcionEn: base.description?.en ?? 'Text',
  activo: true,
  fotos,
})

describe('qué archivos puede tener una foto', () => {
  it('la copia que sirve la guía, el original del panel, el AVIF y las variantes', () => {
    const archivos = archivosDeFoto(base.id, { src: `images/places/${base.id}/portada.webp` })
    expect(archivos).toEqual(
      expect.arrayContaining([
        `public/images/places/${base.id}/portada.webp`,
        `data/commercial/photos-src/${base.id}/portada.webp`,
        `public/images/places/${base.id}/portada.avif`,
        `public/images/places/${base.id}/portada-480.webp`,
        `public/images/places/${base.id}/portada-960.avif`,
      ]),
    )
    expect(new Set(archivos).size).toBe(archivos.length)
  })

  it('una foto de otro formato también cuenta su WebP', () => {
    expect(archivosDeFoto(base.id, { src: `images/places/${base.id}/otra.jpeg` })).toContain(
      `public/images/places/${base.id}/otra.webp`,
    )
  })

  it('nada que no cuelgue de la carpeta del propio local: no es nuestro', () => {
    expect(archivosDeFoto(base.id, { src: 'images/places/otro-local/portada.webp' })).toEqual([])
    expect(archivosDeFoto(base.id, { src: 'images/otra-cosa/portada.webp' })).toEqual([])
    expect(archivosDeFoto(base.id, { src: `images/places/${base.id}/sub/portada.webp` })).toEqual(
      [],
    )
    expect(archivosDeFoto(base.id, { src: `images/places/${base.id}-otro/portada.webp` })).toEqual(
      [],
    )
  })
})

describe('qué fotos se quitan al guardar', () => {
  it('las que estaban en la galería y ya no', () => {
    const preparado = prepararNegocio(
      dataset,
      crudo,
      formulario([{ src: foto('terraza').src, alt: 'x' }]),
      HOY,
    )
    if (!preparado.ok) throw new Error(preparado.problemas.join(' '))
    expect(preparado.fotosQuitadas.map((otra) => otra.src)).toEqual([foto('portada').src])
  })

  it('ninguna si se conservan todas, aunque cambie el orden', () => {
    const preparado = prepararNegocio(
      dataset,
      crudo,
      formulario([
        { src: foto('terraza').src, alt: 'x' },
        { src: foto('portada').src, alt: 'y' },
      ]),
      HOY,
    )
    if (!preparado.ok) throw new Error(preparado.problemas.join(' '))
    expect(preparado.fotosQuitadas).toEqual([])
  })

  it('un formulario sin galería no quita nada', () => {
    const { fotos: _fotos, ...sinGaleria } = formulario([])
    const preparado = prepararNegocio(dataset, crudo, sinGaleria, HOY)
    if (!preparado.ok) throw new Error(preparado.problemas.join(' '))
    expect(preparado.fotosQuitadas).toEqual([])
  })
})

describe('guardar quitando una foto, con GitHub simulado', () => {
  const REPO = 'dueno/repositorio'
  const entorno = {
    GITHUB_REPO: REPO,
    GITHUB_TOKEN: 'testigo-falso',
    GITHUB_RAMA: 'panel-contenido',
  }
  const json = (datos: unknown, estado = 200) =>
    new Response(JSON.stringify(datos), {
      status: estado,
      headers: { 'content-type': 'application/json' },
    })
  const enBase64 = (datos: unknown) => Buffer.from(JSON.stringify(datos)).toString('base64')
  const lugaresConFotos = crudo.places

  /** Un GitHub donde solo existen los archivos de la lista (más los JSON de datos). */
  function montar(existentes: string[]) {
    const arboles: { path: string; sha: string | null }[][] = []
    const consultadas: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        const ruta = String(url).replace(`https://api.github.com/repos/${REPO}`, '')
        const metodo = init?.method ?? 'GET'
        const datos: Record<string, unknown> = {
          '/contents/data/commercial/categories.json?ref=main': categoriasJson,
          '/contents/data/commercial/plazas.json?ref=main': plazasJson,
          '/contents/data/commercial/places.json?ref=main': lugaresConFotos,
        }
        if (metodo === 'GET' && ruta in datos) {
          return json({ encoding: 'base64', content: enBase64(datos[ruta]) })
        }
        if (metodo === 'GET' && ruta.startsWith('/contents/')) {
          const archivo = decodeURIComponent(ruta.slice('/contents/'.length).split('?')[0] ?? '')
          consultadas.push(archivo)
          return existentes.includes(archivo) ? json({ type: 'file' }) : json({}, 404)
        }
        if (metodo === 'GET' && ruta === '/git/ref/heads/main')
          return json({ object: { sha: 'm' } })
        if (metodo === 'GET' && ruta === '/git/ref/heads/panel-contenido') return json({}, 404)
        if (metodo === 'GET' && ruta.startsWith('/pulls?state=open')) return json([])
        if (metodo === 'GET' && ruta === '/git/commits/m') return json({ tree: { sha: 'tm' } })
        if (metodo === 'POST' && ruta === '/git/blobs') return json({ sha: 'blob' })
        if (metodo === 'POST' && ruta === '/git/trees') {
          arboles.push(JSON.parse(String(init?.body)).tree)
          return json({ sha: 'arbol' })
        }
        if (metodo === 'POST' && ruta === '/git/commits') return json({ sha: 'commit' })
        if (metodo === 'POST' && ruta === '/git/refs') return json({})
        if (metodo === 'POST' && ruta === '/pulls') {
          return json({ number: 17, html_url: 'https://github.test/pull/17' })
        }
        throw new Error(`llamada inesperada: ${metodo} ${ruta}`)
      }),
    )
    return { arboles, consultadas }
  }

  afterEach(() => vi.unstubAllGlobals())

  it('borra en el mismo commit solo los archivos que existen, y lo dice', async () => {
    const portada = foto('portada').src
    const existentes = [`public/${portada}`, `data/commercial/photos-src/${base.id}/portada.webp`]
    const { arboles } = montar(existentes)
    const resultado = await guardarNegocio(
      entorno,
      formulario([{ src: foto('terraza').src, alt: 'x' }]),
    )
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    expect(arboles).toHaveLength(1)
    const borrados = arboles[0]?.filter((fila) => fila.sha === null).map((fila) => fila.path)
    expect(borrados?.sort()).toEqual([...existentes].sort())
    // Los JSON van como siempre.
    expect(arboles[0]?.filter((fila) => fila.sha !== null).map((fila) => fila.path)).toEqual([
      'data/commercial/places.json',
      'data/commercial/plazas.json',
    ])
    expect(resultado.avisos.join(' ')).toMatch(/Se borraron 2 archivos/)
  })

  it('si no quitó ninguna foto, no pregunta por archivos ni borra nada', async () => {
    const { arboles, consultadas } = montar([])
    const resultado = await guardarNegocio(
      entorno,
      formulario([
        { src: foto('portada').src, alt: 'x' },
        { src: foto('terraza').src, alt: 'y' },
      ]),
    )
    expect(resultado.ok).toBe(true)
    expect(
      consultadas.filter((ruta) => ruta.startsWith('public/') || ruta.includes('photos-src')),
    ).toEqual([])
    expect(arboles[0]?.some((fila) => fila.sha === null)).toBe(false)
  })

  it('si ninguno de los archivos existe, guarda igual y no borra nada', async () => {
    const { arboles } = montar([])
    const resultado = await guardarNegocio(
      entorno,
      formulario([{ src: foto('terraza').src, alt: 'x' }]),
    )
    expect(resultado.ok).toBe(true)
    expect(arboles[0]?.some((fila) => fila.sha === null)).toBe(false)
    if (resultado.ok) expect(resultado.avisos.join(' ')).not.toMatch(/Se borraron/)
  })
})
