import { afterEach, describe, expect, it, vi } from 'vitest'
import categoriasJson from '../data/commercial/categories.json' with { type: 'json' }
import lugaresJson from '../data/commercial/places.json' with { type: 'json' }
import plazasJson from '../data/commercial/plazas.json' with { type: 'json' }
import {
  type CommercialDataset,
  syncPlazaDerivedFields,
  validateRedirects,
} from '../src/data/relations.ts'
import { CategoriesFileSchema, PlacesFileSchema, PlazasFileSchema } from '../src/data/schemas.ts'
import { borrarNegocio, prepararBorrado } from './borrado.ts'
import { prepararNegocio } from './contenido.ts'

/*
 * Nada aquí nombra un local real: se escoge uno del propio dataset. Borrar o renombrar un local de la
 * guía no puede poner en rojo estas pruebas.
 */
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
const HOY = '2026-11-07'
const visible = dataset.places.find((fila) => {
  const plaza = dataset.plazas.find((p) => p.id === fila.plazaId)
  return fila.active && plaza?.active
})
if (!visible) throw new Error('el dataset no tiene ningún local visible')
const objetivo = visible

describe('la vista de impacto', () => {
  it('dice qué direcciones cambian y a dónde van, sin escribir nada', () => {
    const preparado = prepararBorrado(dataset, crudo, { id: objetivo.id }, HOY)
    expect(preparado.ok).toBe(true)
    if (!preparado.ok) return
    const plaza = dataset.plazas.find((fila) => fila.id === objetivo.plazaId)
    expect(preparado.impacto.redirecciones).toEqual([
      { desde: `/es/lugar/${objetivo.slug}`, hacia: `/es/zona/${plaza?.slug}` },
      { desde: `/en/place/${objetivo.slug}`, hacia: `/en/area/${plaza?.slug}` },
    ])
    expect(preparado.impacto.fotos).toBe(objetivo.photos.length)
    expect(preparado.impacto.avisos.join(' ')).toMatch(/sitemap/)
  })

  it('si la plaza no está activa, la dirección antigua va a la portada y el impacto lo dice', () => {
    const inactiva: CommercialDataset = {
      ...dataset,
      plazas: dataset.plazas.map((fila) =>
        fila.id === objetivo.plazaId ? { ...fila, active: false } : fila,
      ),
    }
    const preparado = prepararBorrado(inactiva, crudo, { id: objetivo.id }, HOY)
    expect(preparado.ok).toBe(true)
    if (!preparado.ok) return
    expect(preparado.impacto.destinoEsPortada).toBe(true)
    expect(preparado.impacto.redirecciones.map((fila) => fila.hacia)).toEqual(['/es', '/en'])
  })

  it('una categoría que se queda sin ningún local visible pierde su página, y se avisa', () => {
    // Un dataset de un solo local: borrarlo deja vacías todas sus categorías.
    const solo: CommercialDataset = { ...dataset, places: [objetivo] }
    const conPlazas = { ...solo, plazas: syncPlazaDerivedFields(solo) }
    const preparado = prepararBorrado(
      conPlazas,
      {
        ...crudo,
        places: { ...crudo.places, places: [objetivo] },
        plazas: { ...crudo.plazas, plazas: conPlazas.plazas },
      },
      { id: objetivo.id },
      HOY,
    )
    expect(preparado.ok).toBe(true)
    if (!preparado.ok) return
    expect(preparado.impacto.categoriasSinPagina.length).toBeGreaterThan(0)
  })

  it('un local que ya estaba oculto no dice que saldrá del sitemap', () => {
    const oculto = { ...objetivo, active: false }
    const casi: CommercialDataset = {
      ...dataset,
      places: dataset.places.map((fila) => (fila.id === objetivo.id ? oculto : fila)),
    }
    const preparado = prepararBorrado(casi, crudo, { id: objetivo.id }, HOY)
    expect(preparado.ok).toBe(true)
    if (!preparado.ok) return
    expect(preparado.impacto.avisos.join(' ')).not.toMatch(/sitemap/)
  })
})

describe('borrar', () => {
  it('quita el local, recalcula su plaza y anota la redirección', () => {
    const preparado = prepararBorrado(dataset, crudo, { id: objetivo.id, confirmar: true }, HOY)
    expect(preparado.ok).toBe(true)
    if (!preparado.ok) return

    const lugares = preparado.lugares.places as { id: string }[]
    expect(lugares.some((fila) => fila.id === objetivo.id)).toBe(false)
    expect(lugares).toHaveLength(dataset.places.length - 1)

    const plazas = preparado.plazas.plazas as { id: string; placeIds: string[] }[]
    expect(plazas.find((fila) => fila.id === objetivo.plazaId)?.placeIds).not.toContain(objetivo.id)

    // Guarda su id y sus giros: quien lo marcó sigue teniendo ese gusto aunque el local ya no esté.
    expect(preparado.redirects.redirects).toEqual([
      {
        kind: 'place',
        id: objetivo.id,
        slug: objetivo.slug,
        plazaId: objetivo.plazaId,
        giros: objetivo.giros,
      },
    ])
    expect(preparado.redirects.updatedAt).toBe(HOY)
  })

  it('el archivo de redirecciones que sale valida con su esquema', () => {
    const preparado = prepararBorrado(dataset, crudo, { id: objetivo.id }, HOY)
    expect(preparado.ok).toBe(true)
    if (!preparado.ok) return
    expect(preparado.redirects.version).toBe(1)
  })

  it('un local que ya no existe no se borra otra vez', () => {
    const preparado = prepararBorrado(dataset, crudo, { id: 'no-existe-este-local' }, HOY)
    expect(preparado).toEqual({ ok: false, problemas: ['Ese negocio ya no existe'] })
  })

  it('un cuerpo con campos de más se rechaza', () => {
    const preparado = prepararBorrado(dataset, crudo, { id: objetivo.id, plazaId: 'otra' }, HOY)
    expect(preparado.ok).toBe(false)
  })

  it('no acepta un id vacío', () => {
    expect(prepararBorrado(dataset, crudo, { id: '  ' }, HOY).ok).toBe(false)
  })
})

describe('un slug borrado no vuelve', () => {
  it('un local nuevo con el mismo nombre recibe otro slug', () => {
    const conRedireccion = {
      ...crudo,
      redirects: {
        version: 1,
        redirects: [
          {
            kind: 'place',
            id: 'panaderia-vieja',
            slug: 'panaderia-vieja',
            plazaId: objetivo.plazaId,
            giros: ['x'],
          },
        ],
      },
    }
    const preparado = prepararNegocio(
      dataset,
      conRedireccion,
      {
        nombre: 'Panadería Vieja',
        plazaId: objetivo.plazaId,
        giros: objetivo.giros.slice(0, 1),
        descripcionEs: 'Una panadería de prueba.',
        descripcionEn: 'A test bakery.',
        activo: true,
      },
      HOY,
    )
    expect(preparado.ok).toBe(true)
    if (!preparado.ok) return
    expect(preparado.place.slug).not.toBe('panaderia-vieja')
  })

  it('tampoco vuelve su id: heredaría los favoritos y las notas del que se borró', () => {
    const conRedireccion = {
      ...crudo,
      redirects: {
        version: 1,
        redirects: [
          {
            kind: 'place',
            id: 'panaderia-con-id',
            slug: 'otro-slug',
            plazaId: objetivo.plazaId,
            giros: ['x'],
          },
        ],
      },
    }
    const preparado = prepararNegocio(
      dataset,
      conRedireccion,
      {
        nombre: 'Panadería Con Id',
        plazaId: objetivo.plazaId,
        giros: objetivo.giros.slice(0, 1),
        descripcionEs: 'Una panadería de prueba.',
        descripcionEn: 'A test bakery.',
        activo: true,
      },
      HOY,
    )
    expect(preparado.ok).toBe(true)
    if (!preparado.ok) return
    expect(preparado.place.id).not.toBe('panaderia-con-id')
  })

  it('la validación rechaza un slug vivo, un slug repetido y una plaza que no existe', () => {
    const asuntos = validateRedirects(
      [
        { slug: objetivo.slug, plazaId: objetivo.plazaId },
        { slug: 'otro', plazaId: 'plaza-inexistente' },
        { slug: 'otro', plazaId: objetivo.plazaId },
      ],
      dataset,
    )
    const mensajes = asuntos.map((asunto) => asunto.message).join(' | ')
    expect(mensajes).toMatch(/Hay un local con ese slug/)
    expect(mensajes).toMatch(/ya no existe/)
    expect(mensajes).toMatch(/repetido/)
  })

  it('sin redirecciones no hay nada que reprochar', () => {
    expect(validateRedirects([], dataset)).toEqual([])
  })
})

describe('el endpoint en desarrollo', () => {
  const entorno = { PANEL_ABIERTO: 'si' }

  it('sin confirmar solo calcula el impacto', async () => {
    const resultado = await borrarNegocio(entorno, { id: objetivo.id })
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    expect(resultado.confirmado).toBe(false)
    expect(resultado.pr).toBeNull()
  })

  it('confirmado valida y no commitea sin testigo de GitHub', async () => {
    const resultado = await borrarNegocio(entorno, { id: objetivo.id, confirmar: true })
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    expect(resultado.confirmado).toBe(true)
    expect(resultado.seco).toBe(true)
    expect(resultado.pr).toBeNull()
  })

  it('con un id inexistente responde con el problema', async () => {
    const resultado = await borrarNegocio(entorno, { id: 'no-existe-este-local' })
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

  /** Un GitHub que sirve los datos del repositorio, sin `redirects.json`, y apunta lo que se escribe. */
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
          return json({ number: 7, html_url: 'https://github.test/pull/7' })
        }
        throw new Error(`llamada inesperada: ${metodo} ${ruta}`)
      }),
    )
    return { arboles, blobs }
  }

  afterEach(() => vi.unstubAllGlobals())

  it('manda los tres archivos en un solo commit, aunque la rama no tuviera redirects.json', async () => {
    const { arboles, blobs } = montar()
    const resultado = await borrarNegocio(entorno, { id: objetivo.id, confirmar: true })
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    expect(resultado.seco).toBe(false)
    expect(resultado.pr?.numero).toBe(7)

    expect(arboles).toHaveLength(1)
    expect(arboles[0]?.map((fila) => fila.path).sort()).toEqual([
      'data/commercial/places.json',
      'data/commercial/plazas.json',
      'data/commercial/redirects.json',
    ])
    const redirects = JSON.parse(blobs[2] ?? '{}') as { redirects: { slug: string }[] }
    expect(redirects.redirects.map((fila) => fila.slug)).toEqual([objetivo.slug])
  })

  it('sin confirmar no escribe nada en GitHub', async () => {
    const { arboles } = montar()
    const resultado = await borrarNegocio(entorno, { id: objetivo.id })
    expect(resultado.ok && resultado.confirmado).toBe(false)
    expect(arboles).toHaveLength(0)
    const llamadas = vi.mocked(fetch).mock.calls.map(([, init]) => init?.method ?? 'GET')
    expect(llamadas.every((metodo) => metodo === 'GET')).toBe(true)
  })
})
