import Papa from 'papaparse'
import { afterEach, describe, expect, it, vi } from 'vitest'
import categoriasJson from '../data/commercial/categories.json' with { type: 'json' }
import lugaresJson from '../data/commercial/places.json' with { type: 'json' }
import plazasJson from '../data/commercial/plazas.json' with { type: 'json' }
import type { CommercialDataset } from '../src/data/relations.ts'
import { CategoriesFileSchema, PlacesFileSchema, PlazasFileSchema } from '../src/data/schemas.ts'
import { atenderApi, type EntornoApi } from './api.ts'
import type { Base } from './cuenta.ts'
import { guardarImportacion, prepararImportacion, TOPE_DE_FILAS } from './importar.ts'

const dataset: CommercialDataset = {
  categories: CategoriesFileSchema.parse(categoriasJson).categories,
  plazas: PlazasFileSchema.parse(plazasJson).plazas,
  places: PlacesFileSchema.parse(lugaresJson).places,
}
const crudo = {
  categories: categoriasJson as unknown as Record<string, unknown>,
  plazas: plazasJson as unknown as Record<string, unknown>,
  places: lugaresJson as unknown as Record<string, unknown>,
}
const HOY = '2026-11-09'

const plaza = dataset.plazas.find((fila) => fila.active)
if (!plaza) throw new Error('el dataset necesita una plaza activa')
const giro = dataset.categories[0]?.giros[0]?.id ?? ''

const ENCABEZADO = 'name,plaza,giros,description,descriptionEn,active,comprobado'
const buena = (nombre: string) =>
  `${nombre},${plaza.name},${giro},Una tienda inventada llamada ${nombre}.,An invented shop called ${nombre}.,sí,sí`
const csvDe = (...filas: string[]) => [ENCABEZADO, ...filas].join('\n')

describe('prepararImportacion', () => {
  it('lee el CSV y deja los archivos listos si todas las filas pasan', () => {
    const r = prepararImportacion(dataset, crudo, csvDe(buena('Tienda Uno')), HOY)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.vista.listo).toBe(true)
    expect(r.vista.creados).toBe(1)
    expect(r.archivos).not.toBeNull()
  })

  it('una fila con error no tumba la vista: se ven todas, y no hay archivos', () => {
    const r = prepararImportacion(
      dataset,
      crudo,
      csvDe(buena('Tienda Uno'), `Mala,Plaza que no existe,${giro},x,y,sí,sí`),
      HOY,
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.vista.listo).toBe(false)
    expect(r.vista.filas.map((fila) => fila.ok)).toEqual([true, false])
    expect(r.vista.filas[1]?.problemas.join(' ')).toMatch(/Plaza no encontrada/)
    expect(r.archivos).toBeNull()
  })

  it('cada fila dice lo que afirma antes de confirmar', () => {
    const r = prepararImportacion(dataset, crudo, csvDe(buena('Tienda Uno')), HOY)
    if (!r.ok) throw new Error('no preparó')
    expect(r.vista.filas[0]?.afirma.join(' ')).toContain(`campo:${HOY}`)
  })

  it('una descripción con comas, comillas y saltos de línea entre comillas llega entera', () => {
    const texto = 'Una tienda, con "comillas"\ny dos líneas.'
    const fila = `Tienda Rara,${plaza.name},${giro},"${texto.replaceAll('"', '""')}",An invented shop.,sí,sí`
    const r = prepararImportacion(dataset, crudo, csvDe(fila), HOY)
    if (!r.ok) throw new Error(r.problemas.join(' | '))
    expect(r.vista.listo, r.vista.filas[0]?.problemas.join(' | ')).toBe(true)
    if (!r.archivos) throw new Error('no dejó archivos')
    const nuevo = (
      r.archivos.lugares.places as { name: string; description: { es: string } }[]
    ).find((place) => place.name === 'Tienda Rara')
    expect(nuevo?.description.es).toBe(texto)
  })

  it('avisa de las columnas que no conoce, y se queda con las que sí', () => {
    const r = prepararImportacion(
      dataset,
      crudo,
      `${ENCABEZADO},columna_rara\n${buena('Tienda Uno')},x`,
      HOY,
    )
    if (!r.ok) throw new Error('no preparó')
    expect(r.vista.columnasIgnoradas).toEqual(['columna_rara'])
    expect(r.vista.listo).toBe(true)
  })

  it('rechaza lo que no es un CSV de locales: sin nombre o plaza, vacío, o de más de cien filas', () => {
    const sinPlaza = prepararImportacion(dataset, crudo, 'name,giros\nX,y', HOY)
    expect(sinPlaza.ok).toBe(false)
    if (!sinPlaza.ok) expect(sinPlaza.problemas.join(' ')).toMatch(/columna "plaza"/)
    const vacio = prepararImportacion(dataset, crudo, ENCABEZADO, HOY)
    expect(vacio.ok).toBe(false)
    const filas = Array.from({ length: TOPE_DE_FILAS + 1 }, (_, i) => buena(`Tienda ${i}`))
    const largo = prepararImportacion(dataset, crudo, csvDe(...filas), HOY)
    expect(largo.ok).toBe(false)
    if (!largo.ok) expect(largo.problemas.join(' ')).toMatch(/el tope son 100/)
  })

  it('un CSV en Windows-1252 (Excel sin "CSV UTF-8") se rechaza entero, no se guarda con acentos rotos', () => {
    // Los bytes de un archivo ANSI, leídos como UTF-8 como hace el navegador con File.text().
    const ansi = new TextDecoder('utf-8').decode(Buffer.from(csvDe(buena('Café Luna')), 'latin1'))
    expect(ansi).toContain('�')
    const r = prepararImportacion(dataset, crudo, ansi, HOY)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.problemas.join(' ')).toMatch(/no está en UTF-8/)
  })

  it('varios giros separados por ; dentro de un CSV con comas se leen como giros, no como columnas', () => {
    const [uno, dos] = dataset.categories.flatMap((c) => c.giros.map((g) => g.id))
    const fila = `Tienda Giros,${plaza.name},${uno};${dos},Una tienda con dos giros.,A shop with two giros.,sí,sí`
    const r = prepararImportacion(dataset, crudo, csvDe(fila), HOY)
    expect(r.ok && r.vista.listo, r.ok ? r.vista.filas[0]?.problemas.join(' | ') : '').toBe(true)
    if (!r.ok || !r.archivos) return
    const nuevo = (r.archivos.lugares.places as { name: string; giros: string[] }[]).find(
      (p) => p.name === 'Tienda Giros',
    )
    expect(nuevo?.giros).toEqual([uno, dos])
  })

  it('un CSV que Papa no puede leer se rechaza con la fila', () => {
    const roto = `${ENCABEZADO}\n"sin cerrar,${plaza.name}`
    const leido = Papa.parse(roto, { header: true })
    expect(leido.errors.length).toBeGreaterThan(0)
    const r = prepararImportacion(dataset, crudo, roto, HOY)
    expect(r.ok).toBe(false)
  })
})

describe('guardarImportacion en desarrollo', () => {
  const entorno = { PANEL_ABIERTO: 'si' }

  it('sin confirmar solo calcula: no guarda ni abre una PR', async () => {
    const r = await guardarImportacion(entorno, { csv: csvDe(buena('Tienda Uno')) })
    expect(r.ok && r.confirmado).toBe(false)
    expect(r.ok && r.pr).toBeNull()
    expect(r.ok && r.vista.creados).toBe(1)
  })

  it('confirmado se valida en seco', async () => {
    const r = await guardarImportacion(entorno, {
      csv: csvDe(buena('Tienda Uno')),
      confirmar: true,
    })
    expect(r.ok && r.confirmado).toBe(true)
    expect(r.ok && r.seco).toBe(true)
  })

  it('confirmar con una fila mala se rechaza: todo o nada', async () => {
    const r = await guardarImportacion(entorno, {
      csv: csvDe(buena('Tienda Uno'), `Mala,Plaza que no existe,${giro},x,y,sí,sí`),
      confirmar: true,
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.problemas.join(' ')).toMatch(/todo o nada/)
  })

  it('un cuerpo con campos de más se rechaza', async () => {
    const r = await guardarImportacion(entorno, { csv: csvDe(buena('Tienda Uno')), extra: 1 })
    expect(r.ok).toBe(false)
  })
})

describe('con GitHub simulado', () => {
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

  function montar() {
    const arboles: { path: string }[][] = []
    const mensajes: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        const ruta = String(url).replace(`https://api.github.com/repos/${REPO}`, '')
        const metodo = init?.method ?? 'GET'
        const contenido: Record<string, unknown> = {
          '/contents/data/commercial/categories.json?ref=main': categoriasJson,
          '/contents/data/commercial/plazas.json?ref=main': plazasJson,
          '/contents/data/commercial/places.json?ref=main': lugaresJson,
        }
        if (metodo === 'GET' && ruta in contenido) {
          return json({ encoding: 'base64', content: enBase64(contenido[ruta]) })
        }
        if (metodo === 'GET' && ruta.startsWith('/contents/')) return json({}, 404)
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
        if (metodo === 'POST' && ruta === '/git/commits') {
          mensajes.push(JSON.parse(String(init?.body)).message)
          return json({ sha: 'commit' })
        }
        if (metodo === 'POST' && ruta === '/git/refs') return json({})
        if (metodo === 'POST' && ruta === '/pulls') {
          return json({ number: 8, html_url: 'https://github.test/pull/8' })
        }
        throw new Error(`llamada inesperada: ${metodo} ${ruta}`)
      }),
    )
    return { arboles, mensajes }
  }

  afterEach(() => vi.unstubAllGlobals())

  it('confirmado manda los dos archivos en un solo commit', async () => {
    const { arboles, mensajes } = montar()
    const r = await guardarImportacion(entorno, {
      csv: csvDe(buena('Tienda Uno'), buena('Tienda Dos')),
      confirmar: true,
    })
    expect(r.ok && r.pr?.numero).toBe(8)
    expect(arboles).toHaveLength(1)
    expect(arboles[0]?.map((fila) => fila.path).sort()).toEqual([
      'data/commercial/places.json',
      'data/commercial/plazas.json',
    ])
    expect(mensajes[0]).toContain('2 nuevos')
  })

  it('sin confirmar, o con una fila mala, no escribe nada', async () => {
    const { arboles } = montar()
    const vista = await guardarImportacion(entorno, { csv: csvDe(buena('Tienda Uno')) })
    expect(vista.ok && vista.confirmado).toBe(false)
    const mala = await guardarImportacion(entorno, {
      csv: csvDe(buena('Tienda Uno'), `Mala,Plaza que no existe,${giro},x,y,sí,sí`),
      confirmar: true,
    })
    expect(mala.ok).toBe(false)
    expect(arboles).toHaveLength(0)
  })
})

describe('la API de importar', () => {
  const entornoApi = { PANEL_ABIERTO: 'si', ANALITICA: {} as Base } as EntornoApi
  const pedir = (cuerpo: string, cabeceras: Record<string, string> = {}) =>
    atenderApi(
      new Request('http://localhost:8787/api/panel/contenido/importar', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'sec-fetch-site': 'same-origin',
          ...cabeceras,
        },
        body: cuerpo,
      }),
      entornoApi,
    )

  it('devuelve la vista de lo que pasaría', async () => {
    const respuesta = await pedir(JSON.stringify({ csv: csvDe(buena('Tienda Uno')) }))
    expect(respuesta?.status).toBe(200)
    const datos = (await respuesta?.json()) as { ok: boolean; vista: { listo: boolean } }
    expect(datos.ok && datos.vista.listo).toBe(true)
  })

  it('rechaza una petición de otro origen', async () => {
    const respuesta = await pedir(JSON.stringify({ csv: csvDe(buena('Tienda Uno')) }), {
      'sec-fetch-site': 'cross-site',
    })
    expect(respuesta?.status).toBe(403)
  })

  it('rechaza un cuerpo que pasa del tope con 413', async () => {
    const respuesta = await pedir(JSON.stringify({ csv: 'x'.repeat(600 * 1024) }))
    expect(respuesta?.status).toBe(413)
  })

  it('un CSV con filas malas responde 200 con la vista, no con un error', async () => {
    const respuesta = await pedir(
      JSON.stringify({ csv: csvDe(`Mala,Plaza que no existe,${giro},x,y,sí,sí`) }),
    )
    expect(respuesta?.status).toBe(200)
    const datos = (await respuesta?.json()) as { vista: { listo: boolean } }
    expect(datos.vista.listo).toBe(false)
  })
})
