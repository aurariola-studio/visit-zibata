import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import categoriasJson from '../data/commercial/categories.json' with { type: 'json' }
import lugaresJson from '../data/commercial/places.json' with { type: 'json' }
import plazasJson from '../data/commercial/plazas.json' with { type: 'json' }
import volumenesJson from '../data/geographic/volumenes-plaza.json' with { type: 'json' }
import { PlazasFileSchema } from '../src/data/schemas.ts'
import { VolumenesPlazaFileSchema } from '../src/data/volumenes-plaza.ts'
import { guardarVolumen, prepararVolumen } from './volumen-plaza.ts'

const dataset = {
  categories: [],
  plazas: PlazasFileSchema.parse(plazasJson).plazas,
  places: [],
}
const PLAZA = 'plaza-luna'
const luna = dataset.plazas.find((plaza) => plaza.id === PLAZA)
if (!luna) throw new Error('la prueba necesita plaza-luna en plazas.json')

const crudo = (extra: Record<string, unknown> = {}) => ({
  categories: categoriasJson as unknown as Record<string, unknown>,
  plazas: plazasJson as unknown as Record<string, unknown>,
  places: lugaresJson as unknown as Record<string, unknown>,
  volumenesPlaza: volumenesJson as unknown as Record<string, unknown>,
  ...extra,
})
const regla = { height: 12, scale: 0.7, replaceExisting: false }
const GENERAL = volumenesJson.default

function ok(r: ReturnType<typeof prepararVolumen>) {
  if (!r.ok) throw new Error(`debía ser válido: ${r.problemas.join(' | ')}`)
  return r
}
const falla = (r: ReturnType<typeof prepararVolumen>) => {
  if (r.ok) throw new Error('debía fallar')
  return r.problemas.join(' | ')
}
const ajusteEn = (punto: { lat: number; lng: number }) => ({
  ajustes: [{ accion: 'ocultar', punto, motivo: 'Demolido', creado: '2026-11-09' }],
})

describe('guardar el volumen de una plaza', () => {
  it('guarda la regla completa de esa plaza y deja intacto todo lo demás', () => {
    const r = ok(prepararVolumen(dataset, crudo(), { id: PLAZA, ...regla }))
    const archivo = r.archivo as typeof volumenesJson
    expect((archivo.plazas as Record<string, unknown>)[PLAZA]).toEqual(regla)
    expect(archivo.default).toEqual(GENERAL)
    expect(archivo.plazas['paseo-zibata']).toEqual(volumenesJson.plazas['paseo-zibata'])
    expect(r.impacto.antes).toEqual(GENERAL)
    expect(r.impacto.despues).toEqual(regla)
  })

  it('volver a la regla general quita la entrada: la plaza hereda', () => {
    const con = crudo({
      volumenesPlaza: { ...volumenesJson, plazas: { ...volumenesJson.plazas, [PLAZA]: regla } },
    })
    const r = ok(prepararVolumen(dataset, con, { id: PLAZA, ...GENERAL }))
    expect(Object.keys((r.archivo as typeof volumenesJson).plazas)).not.toContain(PLAZA)
  })

  it('"restablecer" hace lo mismo sin mandar cifras', () => {
    const con = crudo({
      volumenesPlaza: { ...volumenesJson, plazas: { ...volumenesJson.plazas, [PLAZA]: regla } },
    })
    const r = ok(prepararVolumen(dataset, con, { id: PLAZA, restablecer: true }))
    expect(Object.keys((r.archivo as typeof volumenesJson).plazas)).not.toContain(PLAZA)
    expect(r.impacto.despues).toEqual(GENERAL)
  })

  it('no hay nada que guardar si la regla no cambia', () => {
    expect(falla(prepararVolumen(dataset, crudo(), { id: PLAZA, ...GENERAL }))).toMatch(
      /nada que guardar/,
    )
    expect(falla(prepararVolumen(dataset, crudo(), { id: PLAZA, restablecer: true }))).toMatch(
      /nada que guardar/,
    )
  })

  it('rechaza cifras fuera de rango y campos de más, en los dos extremos', () => {
    for (const cambio of [
      { height: 61 },
      { height: 0.9 },
      { scale: 0.29 },
      { scale: 1.01 },
      { generar: false },
    ]) {
      expect(prepararVolumen(dataset, crudo(), { id: PLAZA, ...regla, ...cambio }).ok).toBe(false)
    }
    expect(
      prepararVolumen(dataset, crudo(), { id: PLAZA, ...regla, height: 60, scale: 0.3 }).ok,
    ).toBe(true)
    expect(prepararVolumen(dataset, crudo(), { id: PLAZA, height: 12 }).ok).toBe(false)
  })

  it('rechaza una plaza que no existe', () => {
    expect(falla(prepararVolumen(dataset, crudo(), { id: 'no-existe', ...regla }))).toMatch(
      /ya no existe/,
    )
  })
})

describe('reemplazar las huellas reales', () => {
  const reemplaza = { id: PLAZA, ...regla, replaceExisting: true }

  it('se rechaza si hay un ajuste de edificio dentro del contorno', () => {
    const con = crudo({ ajustesEdificios: ajusteEn(luna.coordinates) })
    expect(falla(prepararVolumen(dataset, con, reemplaza))).toMatch(/1 ajuste de edificio/)
  })

  it('se acepta si los ajustes caen fuera de la plaza', () => {
    const con = crudo({ ajustesEdificios: ajusteEn({ lat: 20.5, lng: -100.5 }) })
    const r = ok(prepararVolumen(dataset, con, reemplaza))
    expect(r.impacto.avisos.join(' ')).toMatch(/descartan/)
  })

  it('no se vuelve a comprobar en una plaza que ya reemplazaba', () => {
    const con = crudo({
      volumenesPlaza: {
        ...volumenesJson,
        plazas: { ...volumenesJson.plazas, [PLAZA]: { ...regla, replaceExisting: true } },
      },
      ajustesEdificios: ajusteEn(luna.coordinates),
    })
    expect(
      prepararVolumen(dataset, con, { id: PLAZA, ...regla, height: 14, replaceExisting: true }).ok,
    ).toBe(true)
  })

  it('apagarlo es siempre posible y lo avisa en condicional', () => {
    const con = crudo({
      volumenesPlaza: {
        ...volumenesJson,
        plazas: { ...volumenesJson.plazas, [PLAZA]: { ...regla, replaceExisting: true } },
      },
    })
    const r = ok(prepararVolumen(dataset, con, { id: PLAZA, ...regla }))
    expect(r.impacto.avisos.join(' ')).toMatch(/si las tiene/)
  })
})

describe('el archivo de la rama', () => {
  it('una rama anterior al archivo lo dice y no escribe', () => {
    const { volumenesPlaza: _, ...sin } = crudo()
    expect(falla(prepararVolumen(dataset, sin, { id: PLAZA, ...regla }))).toMatch(/anterior/)
  })

  it('un archivo que no pasa el esquema no se edita', () => {
    const roto = crudo({ volumenesPlaza: { default: { height: 8 }, plazas: {} } })
    expect(falla(prepararVolumen(dataset, roto, { id: PLAZA, ...regla }))).toMatch(/esquema/)
  })

  it('se reserializa igual que el archivo del repositorio: un guardado no ensucia el diff', () => {
    const texto = readFileSync(
      new URL('../data/geographic/volumenes-plaza.json', import.meta.url),
      'utf8',
    )
    expect(`${JSON.stringify(volumenesJson, null, 2)}\n`).toBe(texto)
  })
})

describe('guardar con GitHub simulado', () => {
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

  /** Un GitHub sin PR abierta; apunta lo que se escribe. */
  function montar(extra: Record<string, unknown> = {}) {
    const arboles: { path: string; sha: string }[][] = []
    const blobs: string[] = []
    const commits: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        const ruta = String(url).replace(`https://api.github.com/repos/${REPO}`, '')
        const metodo = init?.method ?? 'GET'
        const contenido: Record<string, unknown> = {
          '/contents/data/commercial/categories.json?ref=main': categoriasJson,
          '/contents/data/commercial/plazas.json?ref=main': plazasJson,
          '/contents/data/commercial/places.json?ref=main': lugaresJson,
          '/contents/data/geographic/volumenes-plaza.json?ref=main': volumenesJson,
          ...extra,
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
        if (metodo === 'POST' && ruta === '/git/blobs') {
          blobs.push(String(JSON.parse(String(init?.body)).content))
          return json({ sha: `blob-${blobs.length}` })
        }
        if (metodo === 'POST' && ruta === '/git/trees') {
          arboles.push(JSON.parse(String(init?.body)).tree)
          return json({ sha: 'arbol' })
        }
        if (metodo === 'POST' && ruta === '/git/commits') {
          commits.push(String(JSON.parse(String(init?.body)).message))
          return json({ sha: 'commit' })
        }
        if (metodo === 'POST' && ruta === '/git/refs') return json({})
        if (metodo === 'POST' && ruta === '/pulls') {
          return json({ number: 9, html_url: 'https://github.test/pull/9' })
        }
        throw new Error(`llamada inesperada: ${metodo} ${ruta}`)
      }),
    )
    return { arboles, blobs, commits }
  }

  afterEach(() => vi.unstubAllGlobals())

  it('manda solo volumenes-plaza.json, con un archivo que pasa el esquema y un título que dice qué cambió', async () => {
    const { arboles, blobs, commits } = montar()
    const resultado = await guardarVolumen(entorno, { id: PLAZA, ...regla, confirmar: true })
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    expect(resultado.seco).toBe(false)
    expect(resultado.pr?.numero).toBe(9)
    expect(arboles).toHaveLength(1)
    expect(arboles[0]?.map((fila) => fila.path)).toEqual(['data/geographic/volumenes-plaza.json'])
    const escrito = JSON.parse(blobs[0] ?? '{}')
    expect(VolumenesPlazaFileSchema.safeParse(escrito).success).toBe(true)
    expect(escrito.plazas[PLAZA]).toEqual(regla)
    expect(escrito.plazas['paseo-zibata']).toEqual(volumenesJson.plazas['paseo-zibata'])
    expect(commits[0]).toContain('volumen de la plaza')
    expect(commits[0]).toContain('12 m, 70 %')
  })

  it('sin confirmar no escribe nada', async () => {
    const { arboles, blobs } = montar()
    const resultado = await guardarVolumen(entorno, { id: PLAZA, ...regla })
    expect(resultado.ok && resultado.confirmado).toBe(false)
    expect(arboles).toHaveLength(0)
    expect(blobs).toHaveLength(0)
  })

  it('una rama anterior al archivo no escribe: lo dice', async () => {
    const { arboles } = montar({
      '/contents/data/geographic/volumenes-plaza.json?ref=main': null,
    })
    const resultado = await guardarVolumen(entorno, { id: PLAZA, ...regla, confirmar: true })
    expect(resultado.ok).toBe(false)
    expect(arboles).toHaveLength(0)
  })
})
