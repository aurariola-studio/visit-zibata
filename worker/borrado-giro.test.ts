import { afterEach, describe, expect, it, vi } from 'vitest'
import categoriasJson from '../data/commercial/categories.json' with { type: 'json' }
import lugaresJson from '../data/commercial/places.json' with { type: 'json' }
import plazasJson from '../data/commercial/plazas.json' with { type: 'json' }
import { type CommercialDataset, syncPlazaDerivedFields } from '../src/data/relations.ts'
import { CategoriesFileSchema, PlacesFileSchema, PlazasFileSchema } from '../src/data/schemas.ts'
import { borrarGiro, prepararBorradoGiro } from './borrado-giro.ts'

/*
 * Nada aquí nombra un giro real: se escoge uno del propio dataset (no general) y se le quitan los locales
 * que lo usan. Borrar o renombrar un giro de la guía no puede poner en rojo estas pruebas.
 */
const completo: CommercialDataset = {
  categories: CategoriesFileSchema.parse(categoriasJson).categories,
  sectors: CategoriesFileSchema.parse(categoriasJson).sectors,
  plazas: PlazasFileSchema.parse(plazasJson).plazas,
  places: PlacesFileSchema.parse(lugaresJson).places,
}
const HOY = '2026-11-08'
const elegido = completo.categories
  .flatMap((categoria) => categoria.giros.map((giro) => ({ categoria, giro })))
  .find(({ giro }) => !giro.general)
const general = completo.categories.flatMap((c) => c.giros).find((giro) => giro.general)
if (!elegido || !general) throw new Error('el dataset necesita un giro general y uno que no lo sea')
const { categoria, giro } = elegido

const sinLocales = completo.places.filter((place) => !place.giros.includes(giro.id))
const vacia: CommercialDataset = {
  ...completo,
  places: sinLocales,
  plazas: syncPlazaDerivedFields({ ...completo, places: sinLocales }),
}
const crudo = {
  categories: categoriasJson as unknown as Record<string, unknown>,
  plazas: plazasJson as unknown as Record<string, unknown>,
  places: lugaresJson as unknown as Record<string, unknown>,
}

describe('la vista de impacto', () => {
  it('nombra el giro y su categoría, sin escribir nada', () => {
    const p = prepararBorradoGiro(vacia, crudo, { id: giro.id }, HOY)
    expect(p.ok).toBe(true)
    if (!p.ok) return
    expect(p.impacto.giro).toEqual({ id: giro.id, nombre: giro.label.es })
    expect(p.impacto.categoria).toEqual({ id: categoria.id, nombre: categoria.label.es })
    expect(p.impacto.avisos.join(' ')).toMatch(/ninguna página cambia/)
  })

  it('cuenta los locales ya borrados que guardaban este giro', () => {
    const conPrevias = {
      ...crudo,
      redirects: {
        version: 1,
        updatedAt: HOY,
        redirects: [
          { kind: 'place', id: 'viejo', slug: 'viejo', plazaId: 'p', giros: [giro.id] },
          { kind: 'place', id: 'otro', slug: 'otro', plazaId: 'p', giros: ['no-es-de-este'] },
          { kind: 'plaza', id: 'p', slug: 'p' },
        ],
      },
    }
    const p = prepararBorradoGiro(vacia, conPrevias, { id: giro.id }, HOY)
    expect(p.ok).toBe(true)
    if (!p.ok) return
    expect(p.impacto.gustosDeLocalesBorrados).toBe(1)
    expect(p.impacto.avisos.join(' ')).toMatch(/1 local ya borrado guardaba/)
  })
})

describe('borrar', () => {
  it('quita solo ese giro de su categoría y deja el resto intacto y en su orden', () => {
    const p = prepararBorradoGiro(vacia, crudo, { id: giro.id }, HOY)
    expect(p.ok).toBe(true)
    if (!p.ok) return
    const antes = (crudo.categories.categories as { id: string; giros: { id: string }[] }[]).map(
      (fila) => ({ ...fila }),
    )
    const despues = p.categorias.categories as { id: string; giros: { id: string }[] }[]
    expect(despues).toHaveLength(antes.length)
    for (const fila of despues) {
      const previa = antes.find((otra) => otra.id === fila.id)
      const esperados = (previa?.giros ?? []).filter((otro) => otro.id !== giro.id)
      expect(fila.giros.map((otro) => otro.id)).toEqual(esperados.map((otro) => otro.id))
    }
    const suCategoria = despues.find((fila) => fila.id === categoria.id)
    expect(suCategoria?.giros.length).toBe(categoria.giros.length - 1)
    expect(p.categorias.updatedAt).toBe(HOY)
  })

  it('con locales no se borra y dice cuántos son', () => {
    const uno = completo.places[0]
    if (!uno) throw new Error('hace falta un local')
    const dos = completo.places[1] ?? uno
    const conLocales: CommercialDataset = {
      ...vacia,
      places: [
        { ...uno, giros: [giro.id], active: true },
        { ...dos, id: 'otro-local-de-prueba', slug: 'otro-local-de-prueba', giros: [giro.id] },
      ],
    }
    const p = prepararBorradoGiro(conLocales, crudo, { id: giro.id }, HOY)
    expect(p.ok).toBe(false)
    if (p.ok) return
    expect(p.problemas.join(' ')).toContain('2 locales')
    expect(p.problemas.join(' ')).toMatch(/solo se borra sin locales/)
  })

  it('un local oculto también cuenta', () => {
    const uno = completo.places.find((place) => place.giros.length > 0)
    if (!uno) throw new Error('hace falta un local')
    const casi: CommercialDataset = {
      ...vacia,
      places: [{ ...uno, giros: [giro.id], active: false }],
    }
    const p = prepararBorradoGiro(casi, crudo, { id: giro.id }, HOY)
    expect(p.ok).toBe(false)
    if (p.ok) return
    expect(p.problemas.join(' ')).toMatch(/1 local \(0 visibles\)/)
  })

  it('el giro general no se borra, aunque nadie lo use', () => {
    const p = prepararBorradoGiro(vacia, crudo, { id: general.id }, HOY)
    expect(p.ok).toBe(false)
    if (p.ok) return
    expect(p.problemas.join(' ')).toMatch(/giro general/)
  })

  it('un giro que no existe, o campos que no son del formulario, responden con el problema', () => {
    expect(prepararBorradoGiro(vacia, crudo, { id: 'no-existe-este' }, HOY).ok).toBe(false)
    expect(prepararBorradoGiro(vacia, crudo, { id: giro.id, slug: 'x' }, HOY).ok).toBe(false)
    expect(prepararBorradoGiro(vacia, crudo, {}, HOY).ok).toBe(false)
  })
})

describe('el endpoint en desarrollo', () => {
  const entorno = { PANEL_ABIERTO: 'si' }

  it('un cuerpo mal formado responde con el problema y no cae', async () => {
    expect((await borrarGiro(entorno, { nada: 1 })).ok).toBe(false)
  })

  it('el giro general responde con el problema, también al confirmar', async () => {
    expect((await borrarGiro(entorno, { id: general.id, confirmar: true })).ok).toBe(false)
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
          return json({ number: 16, html_url: 'https://github.test/pull/16' })
        }
        throw new Error(`llamada inesperada: ${metodo} ${ruta}`)
      }),
    )
    return { arboles, blobs }
  }

  afterEach(() => vi.unstubAllGlobals())

  it('manda solo categories.json en un solo commit', async () => {
    const { arboles, blobs } = montar()
    const resultado = await borrarGiro(entorno, { id: giro.id, confirmar: true })
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    expect(resultado.seco).toBe(false)
    expect(resultado.pr?.numero).toBe(16)
    expect(arboles).toHaveLength(1)
    expect(arboles[0]?.map((fila) => fila.path)).toEqual(['data/commercial/categories.json'])
    const enviado = JSON.parse(blobs[0] ?? '{}') as { categories: { giros: { id: string }[] }[] }
    expect(enviado.categories.flatMap((c) => c.giros).some((otro) => otro.id === giro.id)).toBe(
      false,
    )
  })

  it('sin confirmar no escribe nada en GitHub', async () => {
    const { arboles } = montar()
    const resultado = await borrarGiro(entorno, { id: giro.id })
    expect(resultado.ok && resultado.confirmado).toBe(false)
    expect(arboles).toHaveLength(0)
    const llamadas = vi.mocked(fetch).mock.calls.map(([, init]) => init?.method ?? 'GET')
    expect(llamadas.every((metodo) => metodo === 'GET')).toBe(true)
  })
})
