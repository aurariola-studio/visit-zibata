import { afterEach, describe, expect, it, vi } from 'vitest'
import categoriasJson from '../data/commercial/categories.json' with { type: 'json' }
import lugaresJson from '../data/commercial/places.json' with { type: 'json' }
import plazasJson from '../data/commercial/plazas.json' with { type: 'json' }
import { type CommercialDataset, syncPlazaDerivedFields } from '../src/data/relations.ts'
import { CategoriesFileSchema, PlacesFileSchema, PlazasFileSchema } from '../src/data/schemas.ts'
import { borrarCategoria, CATEGORIA_FIJA, prepararBorradoCategoria } from './borrado-categoria.ts'

/*
 * Nada aquí nombra una categoría real: se escoge una del propio dataset y se le quitan los locales que
 * la usan. Borrar o renombrar una categoría de la guía no puede poner en rojo estas pruebas.
 */
const completo: CommercialDataset = {
  categories: CategoriesFileSchema.parse(categoriasJson).categories,
  sectors: CategoriesFileSchema.parse(categoriasJson).sectors,
  plazas: PlazasFileSchema.parse(plazasJson).plazas,
  places: PlacesFileSchema.parse(lugaresJson).places,
}
const HOY = '2026-11-07'
const objetivo = completo.categories.find((categoria) => categoria.id !== CATEGORIA_FIJA)
if (!objetivo) throw new Error('el dataset necesita una categoría que no sea la fija')
const categoria = objetivo
const girosDe = new Set(categoria.giros.map((giro) => giro.id))

/** El dataset sin los locales que usan la categoría: así queda vacía y se puede borrar. */
const sinLocales = completo.places.filter((place) => !place.giros.some((giro) => girosDe.has(giro)))
const vacia: CommercialDataset = {
  ...completo,
  places: sinLocales,
  // Los campos derivados de las plazas siguen a los locales, como cuando se cambia un giro en el panel.
  plazas: syncPlazaDerivedFields({ ...completo, places: sinLocales }),
}
const crudo = {
  categories: categoriasJson as unknown as Record<string, unknown>,
  plazas: plazasJson as unknown as Record<string, unknown>,
  places: lugaresJson as unknown as Record<string, unknown>,
}

describe('la vista de impacto', () => {
  it('nombra la categoría y sus giros, sin escribir nada', () => {
    const preparado = prepararBorradoCategoria(vacia, crudo, { id: categoria.id }, HOY)
    expect(preparado.ok).toBe(true)
    if (!preparado.ok) return
    expect(preparado.impacto.categoria).toEqual({ id: categoria.id, nombre: categoria.label.es })
    expect(preparado.impacto.giros).toEqual(categoria.giros.map((giro) => giro.label.es))
    expect(preparado.impacto.avisos.join(' ')).toMatch(/no se pierde ninguna dirección/)
  })

  it('cuenta los locales ya borrados que guardaban uno de sus giros', () => {
    const giro = categoria.giros[0]?.id ?? ''
    const conPrevias = {
      ...crudo,
      redirects: {
        version: 1,
        updatedAt: HOY,
        redirects: [
          { kind: 'place', id: 'viejo', slug: 'viejo', plazaId: 'p', giros: [giro] },
          { kind: 'place', id: 'otro', slug: 'otro', plazaId: 'p', giros: ['no-es-de-esta'] },
          { kind: 'plaza', id: 'p', slug: 'p' },
        ],
      },
    }
    const preparado = prepararBorradoCategoria(vacia, conPrevias, { id: categoria.id }, HOY)
    expect(preparado.ok).toBe(true)
    if (!preparado.ok) return
    expect(preparado.impacto.gustosDeLocalesBorrados).toBe(1)
    expect(preparado.impacto.avisos.join(' ')).toMatch(/1 local ya borrado guardaba/)
  })
})

describe('los cambios de dirección de la categoría', () => {
  const otra = completo.categories.find((c) => c.id !== categoria.id && c.id !== CATEGORIA_FIJA)
  if (!otra) throw new Error('el dataset necesita otra categoría')
  const conCambios = (extra: Record<string, unknown>[] = []) => ({
    ...crudo,
    redirects: {
      version: 1,
      updatedAt: HOY,
      redirects: [
        { kind: 'category-slug', id: categoria.id, lang: 'es', slug: 'antiguo-es' },
        { kind: 'category-slug', id: categoria.id, lang: 'en', slug: 'antiguo-en' },
        { kind: 'category-slug', id: otra.id, lang: 'es', slug: 'otro-antiguo' },
        ...extra,
      ],
    } as Record<string, unknown>,
  })

  it('al borrarla se quitan los suyos, en el mismo commit, y los de otra categoría se quedan', () => {
    const preparado = prepararBorradoCategoria(vacia, conCambios(), { id: categoria.id }, HOY)
    expect(preparado.ok).toBe(true)
    if (!preparado.ok) return
    expect(preparado.impacto.cambiosDeDireccion).toBe(2)
    expect(preparado.impacto.avisos.join(' ')).toMatch(/2 direcciones antiguas/)
    expect(preparado.redirects?.redirects).toEqual([
      { kind: 'category-slug', id: otra.id, lang: 'es', slug: 'otro-antiguo' },
    ])
  })

  it('sin cambios de dirección no toca redirects.json', () => {
    const preparado = prepararBorradoCategoria(vacia, crudo, { id: categoria.id }, HOY)
    expect(preparado.ok && preparado.redirects).toBeNull()
    expect(preparado.ok && preparado.impacto.cambiosDeDireccion).toBe(0)
  })
})

describe('borrar', () => {
  it('quita la fila cruda de la categoría y deja el resto intacto y en su orden', () => {
    const preparado = prepararBorradoCategoria(vacia, crudo, { id: categoria.id }, HOY)
    expect(preparado.ok).toBe(true)
    if (!preparado.ok) return
    const esperado = (crudo.categories.categories as { id: string }[]).filter(
      (fila) => fila.id !== categoria.id,
    )
    expect(preparado.categorias.categories).toEqual(esperado)
    expect(preparado.categorias.updatedAt).toBe(HOY)
  })

  it('con locales no se borra, ni siquiera ocultos, y dice cuántos son', () => {
    const suyos = completo.places.filter((place) => place.giros.some((giro) => girosDe.has(giro)))
    expect(suyos.length).toBeGreaterThan(0)
    const preparado = prepararBorradoCategoria(completo, crudo, { id: categoria.id }, HOY)
    expect(preparado.ok).toBe(false)
    if (preparado.ok) return
    expect(preparado.problemas.join(' ')).toContain(`${suyos.length} locales`)
    expect(preparado.problemas.join(' ')).toMatch(/solo se borra sin locales/)
  })

  it('un local oculto también cuenta: la categoría no está vacía', () => {
    const uno = completo.places.find((place) => place.giros.some((giro) => girosDe.has(giro)))
    if (!uno) throw new Error('la categoría escogida necesita un local')
    const casi: CommercialDataset = { ...vacia, places: [{ ...uno, active: false }] }
    const preparado = prepararBorradoCategoria(casi, crudo, { id: categoria.id }, HOY)
    expect(preparado.ok).toBe(false)
    if (preparado.ok) return
    expect(preparado.problemas.join(' ')).toMatch(/1 local \(0 visibles\)/)
  })

  it('la categoría fija no se borra, aunque esté vacía', () => {
    const preparado = prepararBorradoCategoria(vacia, crudo, { id: CATEGORIA_FIJA }, HOY)
    expect(preparado.ok).toBe(false)
    if (preparado.ok) return
    expect(preparado.problemas.join(' ')).toMatch(/sin giro/)
  })

  it('una categoría que no existe responde con el problema', () => {
    const preparado = prepararBorradoCategoria(vacia, crudo, { id: 'no-existe-esta' }, HOY)
    expect(preparado.ok).toBe(false)
  })

  it('rechaza campos que no son del formulario', () => {
    const preparado = prepararBorradoCategoria(
      vacia,
      crudo,
      { id: categoria.id, slug: 'otro' },
      HOY,
    )
    expect(preparado.ok).toBe(false)
  })
})

describe('el endpoint en desarrollo', () => {
  const entorno = { PANEL_ABIERTO: 'si' }

  it('con locales responde con el problema, también al confirmar', async () => {
    const resultado = await borrarCategoria(entorno, { id: categoria.id, confirmar: true })
    expect(resultado.ok).toBe(false)
  })

  it('un cuerpo mal formado responde con el problema y no cae', async () => {
    const resultado = await borrarCategoria(entorno, { nada: 1 })
    expect(resultado.ok).toBe(false)
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
  const lugaresSin = {
    ...(lugaresJson as unknown as Record<string, unknown>),
    places: (lugaresJson.places as { id: string }[]).filter((place) =>
      sinLocales.some((otro) => otro.id === place.id),
    ),
  }
  const plazasSin = {
    ...(plazasJson as unknown as Record<string, unknown>),
    plazas: (plazasJson.plazas as Record<string, unknown>[]).map((fila, posicion) => ({
      ...fila,
      placeIds: vacia.plazas[posicion]?.placeIds ?? [],
      categories: vacia.plazas[posicion]?.categories ?? [],
    })),
  }

  /** Un GitHub donde la categoría escogida ya no tiene locales; apunta lo que se escribe. */
  function montar() {
    const arboles: { path: string; sha: string }[][] = []
    const blobs: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        const ruta = String(url).replace(`https://api.github.com/repos/${REPO}`, '')
        const metodo = init?.method ?? 'GET'
        const contenido: Record<string, unknown> = {
          '/contents/data/commercial/categories.json?ref=main': categoriasJson,
          '/contents/data/commercial/plazas.json?ref=main': plazasSin,
          '/contents/data/commercial/places.json?ref=main': lugaresSin,
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
        if (metodo === 'POST' && ruta === '/git/commits') return json({ sha: 'commit' })
        if (metodo === 'POST' && ruta === '/git/refs') return json({})
        if (metodo === 'POST' && ruta === '/pulls') {
          return json({ number: 11, html_url: 'https://github.test/pull/11' })
        }
        throw new Error(`llamada inesperada: ${metodo} ${ruta}`)
      }),
    )
    return { arboles, blobs }
  }

  afterEach(() => vi.unstubAllGlobals())

  it('manda solo categories.json en un solo commit', async () => {
    const { arboles, blobs } = montar()
    const resultado = await borrarCategoria(entorno, { id: categoria.id, confirmar: true })
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    expect(resultado.seco).toBe(false)
    expect(resultado.pr?.numero).toBe(11)
    expect(arboles).toHaveLength(1)
    expect(arboles[0]?.map((fila) => fila.path)).toEqual(['data/commercial/categories.json'])
    const enviado = JSON.parse(blobs[0] ?? '{}') as { categories: { id: string }[] }
    expect(enviado.categories.some((fila) => fila.id === categoria.id)).toBe(false)
    expect(enviado.categories).toHaveLength(completo.categories.length - 1)
  })

  it('sin confirmar no escribe nada en GitHub', async () => {
    const { arboles } = montar()
    const resultado = await borrarCategoria(entorno, { id: categoria.id })
    expect(resultado.ok && resultado.confirmado).toBe(false)
    expect(arboles).toHaveLength(0)
    const llamadas = vi.mocked(fetch).mock.calls.map(([, init]) => init?.method ?? 'GET')
    expect(llamadas.every((metodo) => metodo === 'GET')).toBe(true)
  })
})
