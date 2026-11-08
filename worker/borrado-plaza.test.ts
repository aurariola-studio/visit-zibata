import { afterEach, describe, expect, it, vi } from 'vitest'
import categoriasJson from '../data/commercial/categories.json' with { type: 'json' }
import lugaresJson from '../data/commercial/places.json' with { type: 'json' }
import plazasJson from '../data/commercial/plazas.json' with { type: 'json' }
import { type CommercialDataset, validateRedirects } from '../src/data/relations.ts'
import {
  CategoriesFileSchema,
  PlacesFileSchema,
  PlazasFileSchema,
  RedirectsFileSchema,
} from '../src/data/schemas.ts'
import { borrarPlaza, prepararBorradoPlaza } from './borrado-plaza.ts'

/*
 * Nada aquí nombra una plaza real: se escoge una del propio dataset y se le quitan los locales. Borrar o
 * renombrar una plaza de la guía no puede poner en rojo estas pruebas.
 */
const completo: CommercialDataset = {
  categories: CategoriesFileSchema.parse(categoriasJson).categories,
  plazas: PlazasFileSchema.parse(plazasJson).plazas,
  places: PlacesFileSchema.parse(lugaresJson).places,
}
const HOY = '2026-11-07'
const objetivo = completo.plazas.find((plaza) => plaza.active)
if (!objetivo) throw new Error('el dataset no tiene ninguna plaza activa')
const plaza = objetivo

/** El dataset sin los locales de la plaza escogida: así queda vacía y se puede borrar. */
const vacia = {
  dataset: {
    ...completo,
    places: completo.places.filter((place) => place.plazaId !== plaza.id),
    plazas: completo.plazas.map((fila) =>
      fila.id === plaza.id ? { ...fila, placeIds: [], categories: [] } : fila,
    ),
  } satisfies CommercialDataset,
}
const crudo = {
  categories: categoriasJson as unknown as Record<string, unknown>,
  plazas: {
    ...(plazasJson as unknown as Record<string, unknown>),
    plazas: (plazasJson.plazas as Record<string, unknown>[]).map((fila) =>
      fila.id === plaza.id ? { ...fila, placeIds: [], categories: [] } : fila,
    ),
  },
  places: {
    ...(lugaresJson as unknown as Record<string, unknown>),
    places: vacia.dataset.places,
  } as unknown as Record<string, unknown>,
}

describe('la vista de impacto', () => {
  it('dice a dónde van las dos direcciones de la zona, sin escribir nada', () => {
    const preparado = prepararBorradoPlaza(vacia.dataset, crudo, { id: plaza.id }, HOY)
    expect(preparado.ok).toBe(true)
    if (!preparado.ok) return
    expect(preparado.impacto.redirecciones).toEqual([
      { desde: `/es/zona/${plaza.slug}`, hacia: '/es' },
      { desde: `/en/area/${plaza.slug}`, hacia: '/en' },
    ])
    expect(preparado.impacto.teniaPagina).toBe(true)
    expect(preparado.impacto.avisos.join(' ')).toMatch(/sitemap/)
    expect(preparado.impacto.avisos.join(' ')).toMatch(/map:build/)
  })

  it('una plaza inactiva no tenía página y el impacto lo dice', () => {
    const inactiva: CommercialDataset = {
      ...vacia.dataset,
      plazas: vacia.dataset.plazas.map((fila) =>
        fila.id === plaza.id ? { ...fila, active: false } : fila,
      ),
    }
    const preparado = prepararBorradoPlaza(inactiva, crudo, { id: plaza.id }, HOY)
    expect(preparado.ok).toBe(true)
    if (!preparado.ok) return
    expect(preparado.impacto.teniaPagina).toBe(false)
    expect(preparado.impacto.avisos.join(' ')).not.toMatch(/sitemap/)
  })

  it('cuenta las direcciones de locales ya borrados que llevaban a la zona', () => {
    const conPrevias = {
      ...crudo,
      redirects: {
        version: 1,
        updatedAt: HOY,
        redirects: [
          { kind: 'place', id: 'viejo-uno', slug: 'viejo-uno', plazaId: plaza.id, giros: ['g'] },
          { kind: 'place', id: 'viejo-dos', slug: 'viejo-dos', plazaId: plaza.id, giros: ['g'] },
        ],
      },
    }
    const preparado = prepararBorradoPlaza(vacia.dataset, conPrevias, { id: plaza.id }, HOY)
    expect(preparado.ok).toBe(true)
    if (!preparado.ok) return
    expect(preparado.impacto.redireccionesDeLocales).toBe(2)
    expect(preparado.impacto.avisos.join(' ')).toMatch(/2 direcciones/)
    // Las dos huellas de locales siguen siendo válidas aunque su plaza ya no exista: la de la plaza las cubre.
    const salida = RedirectsFileSchema.parse(preparado.redirects)
    expect(salida.redirects.map((fila) => fila.kind)).toEqual(['place', 'place', 'plaza'])
  })
})

describe('borrar', () => {
  it('quita la fila cruda de la plaza y anota su redirección', () => {
    const preparado = prepararBorradoPlaza(vacia.dataset, crudo, { id: plaza.id }, HOY)
    expect(preparado.ok).toBe(true)
    if (!preparado.ok) return
    const filas = preparado.plazas.plazas as { id: string }[]
    expect(filas.some((fila) => fila.id === plaza.id)).toBe(false)
    expect(filas).toHaveLength(completo.plazas.length - 1)
    expect(preparado.plazas.updatedAt).toBe(HOY)
    expect(RedirectsFileSchema.parse(preparado.redirects).redirects).toEqual([
      { kind: 'plaza', id: plaza.id, slug: plaza.slug },
    ])
  })

  it('no toca el orden ni el contenido de las demás plazas', () => {
    const preparado = prepararBorradoPlaza(vacia.dataset, crudo, { id: plaza.id }, HOY)
    expect(preparado.ok).toBe(true)
    if (!preparado.ok) return
    const esperado = (crudo.plazas.plazas as { id: string }[]).filter(
      (fila) => fila.id !== plaza.id,
    )
    expect(preparado.plazas.plazas).toEqual(esperado)
  })

  it('con locales no se borra, ni siquiera ocultos, y dice cuántos son', () => {
    const conLocales = completo.plazas.find((fila) =>
      completo.places.some((place) => place.plazaId === fila.id),
    )
    if (!conLocales) throw new Error('el dataset necesita una plaza con locales')
    const suyos = completo.places.filter((place) => place.plazaId === conLocales.id)
    const preparado = prepararBorradoPlaza(completo, crudo, { id: conLocales.id }, HOY)
    expect(preparado.ok).toBe(false)
    if (preparado.ok) return
    expect(preparado.problemas.join(' ')).toContain(`${suyos.length} `)
    expect(preparado.problemas.join(' ')).toMatch(/solo se borra vacía/)
  })

  it('un local oculto también cuenta: la plaza no está vacía', () => {
    const oculto = completo.places.find((place) => place.plazaId === plaza.id)
    if (!oculto) throw new Error('la plaza escogida necesita un local')
    const casi: CommercialDataset = {
      ...vacia.dataset,
      places: [{ ...oculto, active: false }],
    }
    const preparado = prepararBorradoPlaza(casi, crudo, { id: plaza.id }, HOY)
    expect(preparado.ok).toBe(false)
    if (preparado.ok) return
    // Por la regla de plaza vacía, no por rebote de otra validación.
    expect(preparado.problemas.join(' ')).toMatch(/1 local \(0 visibles\)/)
  })

  it('no deja la guía sin ninguna plaza activa', () => {
    const solo: CommercialDataset = {
      ...vacia.dataset,
      places: [],
      plazas: vacia.dataset.plazas.filter((fila) => fila.id === plaza.id),
    }
    const preparado = prepararBorradoPlaza(solo, crudo, { id: plaza.id }, HOY)
    expect(preparado.ok).toBe(false)
    if (preparado.ok) return
    expect(preparado.problemas.join(' ')).toMatch(/ninguna plaza activa/)
  })

  it('una plaza que no existe responde con el problema', () => {
    const preparado = prepararBorradoPlaza(vacia.dataset, crudo, { id: 'no-existe-esta' }, HOY)
    expect(preparado.ok).toBe(false)
  })

  it('rechaza campos que no son del formulario', () => {
    const preparado = prepararBorradoPlaza(
      vacia.dataset,
      crudo,
      { id: plaza.id, slug: 'otro' },
      HOY,
    )
    expect(preparado.ok).toBe(false)
  })

  it('no permite borrarla dos veces: su huella ya está y la plaza ya no', () => {
    const primero = prepararBorradoPlaza(vacia.dataset, crudo, { id: plaza.id }, HOY)
    expect(primero.ok).toBe(true)
    if (!primero.ok) return
    const sin: CommercialDataset = {
      ...vacia.dataset,
      plazas: vacia.dataset.plazas.filter((fila) => fila.id !== plaza.id),
    }
    const segundo = prepararBorradoPlaza(
      sin,
      {
        ...crudo,
        plazas: { ...crudo.plazas, plazas: primero.plazas.plazas },
        redirects: primero.redirects,
      },
      { id: plaza.id },
      HOY,
    )
    expect(segundo.ok).toBe(false)
  })
})

describe('las redirecciones de plazas', () => {
  const huella = { kind: 'plaza' as const, id: 'plaza-vieja', slug: 'plaza-vieja' }

  it('una plaza viva con ese slug no puede tener también una redirección', () => {
    const asuntos = validateRedirects([{ kind: 'plaza', id: 'otro', slug: plaza.slug }], completo)
    expect(asuntos.map((asunto) => asunto.message).join(' ')).toMatch(/Hay una plaza con ese slug/)
  })

  it('un local y una plaza pueden compartir slug: son espacios de nombres distintos', () => {
    const asuntos = validateRedirects(
      [
        huella,
        { kind: 'place', id: 'plaza-vieja', slug: 'plaza-vieja', plazaId: huella.id, giros: ['g'] },
      ],
      completo,
    )
    expect(asuntos).toEqual([])
  })

  it('el mismo slug dos veces como plaza es un error', () => {
    const asuntos = validateRedirects([huella, huella], completo)
    expect(asuntos.map((asunto) => asunto.message)).toContain('Slug repetido')
  })

  it('un local borrado cuya plaza no existe ni se borró sigue siendo un error', () => {
    const asuntos = validateRedirects(
      [{ kind: 'place', id: 'a', slug: 'a', plazaId: 'fantasma', giros: ['g'] }],
      completo,
    )
    expect(asuntos.map((asunto) => asunto.message).join(' ')).toMatch(/no existe ni se borró/)
  })
})

describe('el endpoint en desarrollo', () => {
  const entorno = { PANEL_ABIERTO: 'si' }
  const conLocales = completo.plazas.find((fila) =>
    completo.places.some((place) => place.plazaId === fila.id),
  )

  it('con locales responde con el problema, también al confirmar', async () => {
    const resultado = await borrarPlaza(entorno, { id: conLocales?.id, confirmar: true })
    expect(resultado.ok).toBe(false)
  })

  it('un cuerpo mal formado responde con el problema y no cae', async () => {
    const resultado = await borrarPlaza(entorno, { nada: 1 })
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

  /** Un GitHub cuya plaza escogida ya no tiene locales; apunta lo que se escribe. */
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
          '/contents/data/commercial/plazas.json?ref=main': crudo.plazas,
          '/contents/data/commercial/places.json?ref=main': crudo.places,
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
          return json({ number: 9, html_url: 'https://github.test/pull/9' })
        }
        throw new Error(`llamada inesperada: ${metodo} ${ruta}`)
      }),
    )
    return { arboles, blobs }
  }

  afterEach(() => vi.unstubAllGlobals())

  it('manda plazas.json y redirects.json en un solo commit, y no toca los locales', async () => {
    const { arboles, blobs } = montar()
    const resultado = await borrarPlaza(entorno, { id: plaza.id, confirmar: true })
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    expect(resultado.seco).toBe(false)
    expect(resultado.pr?.numero).toBe(9)
    expect(arboles).toHaveLength(1)
    expect(arboles[0]?.map((fila) => fila.path).sort()).toEqual([
      'data/commercial/plazas.json',
      'data/commercial/redirects.json',
    ])
    const redirects = JSON.parse(blobs[1] ?? '{}') as {
      redirects: { slug: string; kind: string }[]
    }
    expect(redirects.redirects).toEqual([{ kind: 'plaza', id: plaza.id, slug: plaza.slug }])
  })

  it('sin confirmar no escribe nada en GitHub', async () => {
    const { arboles } = montar()
    const resultado = await borrarPlaza(entorno, { id: plaza.id })
    expect(resultado.ok && resultado.confirmado).toBe(false)
    expect(arboles).toHaveLength(0)
    const llamadas = vi.mocked(fetch).mock.calls.map(([, init]) => init?.method ?? 'GET')
    expect(llamadas.every((metodo) => metodo === 'GET')).toBe(true)
  })
})
