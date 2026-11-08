import { afterEach, describe, expect, it, vi } from 'vitest'
import categoriasJson from '../data/commercial/categories.json' with { type: 'json' }
import lugaresJson from '../data/commercial/places.json' with { type: 'json' }
import plazasJson from '../data/commercial/plazas.json' with { type: 'json' }
import { type CommercialDataset, validateRedirects } from '../src/data/relations.ts'
import {
  CategoriesFileSchema,
  PlacesFileSchema,
  PlazasFileSchema,
  type Redirect,
} from '../src/data/schemas.ts'
import { prepararBorrado } from './borrado.ts'
import { cambiarSlug, prepararCambioSlug, type TipoDireccion } from './cambio-slug.ts'
import { resolverDirecciones } from './redireccion.ts'

/*
 * Nada aquí nombra un local ni una plaza reales: se escogen del propio dataset. Cambiar o borrar uno de la
 * guía no puede poner en rojo estas pruebas.
 */
const completo: CommercialDataset = {
  categories: CategoriesFileSchema.parse(categoriasJson).categories,
  plazas: PlazasFileSchema.parse(plazasJson).plazas,
  places: PlacesFileSchema.parse(lugaresJson).places,
}
const HOY = '2026-11-08'
const activas = new Set(completo.plazas.filter((plaza) => plaza.active).map((plaza) => plaza.id))
const lugar = completo.places.find((fila) => fila.active && activas.has(fila.plazaId))
const plaza = completo.plazas.find((fila) => fila.active)
if (!lugar || !plaza) throw new Error('el dataset necesita un local y una plaza activos')
const otroLugar = completo.places.find((fila) => fila.id !== lugar.id)
const otraPlaza = completo.plazas.find((fila) => fila.id !== plaza.id)
if (!otroLugar || !otraPlaza) throw new Error('el dataset necesita al menos dos de cada')

const crudoBase = {
  categories: categoriasJson as unknown as Record<string, unknown>,
  plazas: plazasJson as unknown as Record<string, unknown>,
  places: lugaresJson as unknown as Record<string, unknown>,
}
const conRedirects = (redirects: Redirect[]) => ({
  ...crudoBase,
  redirects: { version: 1, updatedAt: '2026-11-01', redirects } as Record<string, unknown>,
})

const ENTIDADES = {
  place: {
    id: lugar.id,
    slug: lugar.slug,
    otro: otroLugar,
    clave: 'places',
    archivo: 'places.json',
  },
  plaza: {
    id: plaza.id,
    slug: plaza.slug,
    otro: otraPlaza,
    clave: 'plazas',
    archivo: 'plazas.json',
  },
} as const

describe.each(['place', 'plaza'] as TipoDireccion[])('cambiar la dirección de %s', (tipo) => {
  const e = ENTIDADES[tipo]
  const kind: Redirect['kind'] = tipo === 'place' ? 'place-slug' : 'plaza-slug'
  const preparar = (cuerpo: unknown, crudo = crudoBase, dataset = completo) =>
    prepararCambioSlug(tipo, dataset, crudo, cuerpo, HOY)

  it('la vista de impacto dice de dónde a dónde, en los dos idiomas, sin escribir nada', () => {
    const p = preparar({ id: e.id, slug: 'direccion-nueva' })
    expect(p.ok).toBe(true)
    if (!p.ok) return
    expect(p.impacto.antes).toBe(e.slug)
    expect(p.impacto.despues).toBe('direccion-nueva')
    const [es, en] = tipo === 'place' ? ['lugar', 'place'] : ['zona', 'area']
    expect(p.impacto.redirecciones).toEqual([
      { desde: `/es/${es}/${e.slug}`, hacia: `/es/${es}/direccion-nueva` },
      { desde: `/en/${en}/${e.slug}`, hacia: `/en/${en}/direccion-nueva` },
    ])
    expect(p.impacto.avisos.join(' ')).toMatch(/301/)
    expect(p.impacto.avisos.join(' ')).toMatch(/E2E/)
  })

  it('cambia solo el slug de su fila y deja el resto del archivo como estaba', () => {
    const p = preparar({ id: e.id, slug: 'direccion-nueva' })
    expect(p.ok).toBe(true)
    if (!p.ok) return
    const antes =
      (crudoBase[e.clave].valueOf() as never as Record<string, unknown[]>)[e.clave] ?? []
    const filas = p.archivo[e.clave] as Record<string, unknown>[]
    expect(filas).toHaveLength(antes.length)
    expect(p.archivo.updatedAt).toBe(HOY)
    filas.forEach((fila, i) => {
      const previa = antes[i] as Record<string, unknown>
      if (fila.id === e.id) {
        expect(fila.slug).toBe('direccion-nueva')
        expect({ ...fila, slug: previa.slug }).toEqual(previa)
        // Las claves siguen en su orden: el diff de la PR es una sola línea.
        expect(Object.keys(fila)).toEqual(Object.keys(previa))
      } else {
        expect(fila).toEqual(previa)
      }
    })
  })

  it('anota la dirección antigua con el id, y el id no cambia', () => {
    const p = preparar({ id: e.id, slug: 'direccion-nueva' })
    expect(p.ok).toBe(true)
    if (!p.ok) return
    expect(p.redirects.redirects).toEqual([{ kind, id: e.id, slug: e.slug }])
    const filas = p.archivo[e.clave] as { id: string }[]
    expect(filas.some((fila) => fila.id === e.id)).toBe(true)
  })

  it('el resultado pasa la validación de redirecciones sobre el dataset que queda', () => {
    const p = preparar({ id: e.id, slug: 'direccion-nueva' })
    expect(p.ok).toBe(true)
    if (!p.ok) return
    const despues: CommercialDataset = {
      ...completo,
      [e.clave]: (completo[e.clave] as { id: string }[]).map((fila) =>
        fila.id === e.id ? { ...fila, slug: 'direccion-nueva' } : fila,
      ),
    }
    expect(
      validateRedirects(p.redirects.redirects as Redirect[], despues).filter(
        (asunto) => asunto.level === 'error',
      ),
    ).toEqual([])
  })

  it('normaliza mayúsculas y rechaza lo que no es un slug', () => {
    const mayus = preparar({ id: e.id, slug: '  Direccion-Nueva ' })
    expect(mayus.ok && mayus.impacto.despues).toBe('direccion-nueva')
    for (const malo of [
      'con espacios',
      'guion_bajo',
      'doble--guion',
      '-empieza',
      'ñandú',
      '',
      'a/b',
    ]) {
      expect(preparar({ id: e.id, slug: malo }).ok, malo).toBe(false)
    }
  })

  it('no hay nada que cambiar si es la misma dirección', () => {
    const p = preparar({ id: e.id, slug: e.slug })
    expect(p.ok).toBe(false)
    if (p.ok) return
    expect(p.problemas.join(' ')).toMatch(/nada que cambiar/)
  })

  it('rechaza la dirección o el id de otro que sigue vivo', () => {
    for (const ajeno of [e.otro.slug, e.otro.id]) {
      const p = preparar({ id: e.id, slug: ajeno })
      expect(p.ok, ajeno).toBe(false)
    }
  })

  it('rechaza el id de otro aunque su slug sea distinto (en la guía real son iguales)', () => {
    // Con id y slug iguales, quitar la reserva del id pasaría desapercibido. Aquí el otro ya cambió.
    const ajenoRenombrado: CommercialDataset = {
      ...completo,
      [e.clave]: (completo[e.clave] as { id: string }[]).map((fila) =>
        fila.id === e.otro.id ? { ...fila, slug: 'slug-distinto-del-id' } : fila,
      ),
    }
    const porId = preparar({ id: e.id, slug: e.otro.id }, crudoBase, ajenoRenombrado)
    expect(porId.ok).toBe(false)
    const porSlug = preparar({ id: e.id, slug: 'slug-distinto-del-id' }, crudoBase, ajenoRenombrado)
    expect(porSlug.ok).toBe(false)
  })

  it('las filas de la otra familia no estorban: /lugar/x y /zona/x son direcciones distintas', () => {
    const deLaOtra: Redirect[] =
      tipo === 'place'
        ? [
            { kind: 'plaza', id: 'plaza-borrada', slug: 'comparte-nombre' },
            { kind: 'plaza-slug', id: otraPlaza.id, slug: 'comparte-antigua' },
          ]
        : [
            {
              kind: 'place',
              id: 'local-borrado',
              slug: 'comparte-nombre',
              plazaId: plaza.id,
              giros: ['g'],
            },
            { kind: 'place-slug', id: otroLugar.id, slug: 'comparte-antigua' },
          ]
    for (const libre of ['comparte-nombre', 'comparte-antigua', 'plaza-borrada', 'local-borrado']) {
      expect(preparar({ id: e.id, slug: libre }, conRedirects(deLaOtra)).ok, libre).toBe(true)
    }
  })

  it('rechaza una dirección que ya figura como redirección de un borrado', () => {
    const borrado: Redirect =
      tipo === 'place'
        ? { kind: 'place', id: 'borrado-id', slug: 'borrado-slug', plazaId: plaza.id, giros: ['g'] }
        : { kind: 'plaza', id: 'borrada-id', slug: 'borrado-slug' }
    for (const reservada of ['borrado-slug', borrado.id]) {
      const p = preparar({ id: e.id, slug: reservada }, conRedirects([borrado]))
      expect(p.ok, reservada).toBe(false)
      if (!p.ok) expect(p.problemas.join(' ')).toMatch(/ya es la dirección de otro/)
    }
  })

  it('rechaza la dirección que otra entidad abandonó: su redirección ya lleva a otro sitio', () => {
    const ajena: Redirect = { kind, id: e.otro.id, slug: 'abandonada-por-otro' }
    const p = preparar({ id: e.id, slug: 'abandonada-por-otro' }, conRedirects([ajena]))
    expect(p.ok).toBe(false)
  })

  it('volver a una dirección anterior quita su redirección en el mismo commit', () => {
    // Cambió de e.slug a "segunda", así que e.slug figura como antigua. Ahora vuelve.
    const yaCambiado: CommercialDataset = {
      ...completo,
      [e.clave]: (completo[e.clave] as { id: string }[]).map((fila) =>
        fila.id === e.id ? { ...fila, slug: 'segunda' } : fila,
      ),
    }
    const crudo = conRedirects([{ kind, id: e.id, slug: e.slug }])
    const p = preparar({ id: e.id, slug: e.slug }, crudo, yaCambiado)
    expect(p.ok).toBe(true)
    if (!p.ok) return
    expect(p.impacto.vuelveAUnaAnterior).toBe(true)
    // Ya no está e.slug como antigua (es la actual), pero sí "segunda".
    expect(p.redirects.redirects).toEqual([{ kind, id: e.id, slug: 'segunda' }])
  })

  it('una cadena deja una fila por dirección antigua y avisa de cuántas llegan a la nueva', () => {
    const yaCambiado: CommercialDataset = {
      ...completo,
      [e.clave]: (completo[e.clave] as { id: string }[]).map((fila) =>
        fila.id === e.id ? { ...fila, slug: 'segunda' } : fila,
      ),
    }
    const crudo = conRedirects([{ kind, id: e.id, slug: e.slug }])
    const p = preparar({ id: e.id, slug: 'tercera' }, crudo, yaCambiado)
    expect(p.ok).toBe(true)
    if (!p.ok) return
    expect(p.redirects.redirects).toEqual([
      { kind, id: e.id, slug: e.slug },
      { kind, id: e.id, slug: 'segunda' },
    ])
    expect(p.impacto.anterioresQueSeguiran).toBe(1)
    expect(p.impacto.avisos.join(' ')).toMatch(/1 dirección anterior/)
  })

  it('un id que no existe, o campos que no son del formulario, responden con el problema', () => {
    expect(preparar({ id: 'no-existe-nada', slug: 'otra' }).ok).toBe(false)
    expect(preparar({ id: e.id, slug: 'otra', nombre: 'x' }).ok).toBe(false)
    expect(preparar({ slug: 'otra' }).ok).toBe(false)
  })
})

describe('los dos espacios de direcciones son independientes', () => {
  it('una plaza puede tomar el slug de un local, y al revés', () => {
    const aLaPlaza = prepararCambioSlug(
      'plaza',
      completo,
      crudoBase,
      { id: plaza.id, slug: otroLugar.slug },
      HOY,
    )
    expect(aLaPlaza.ok).toBe(true)
    const alLocal = prepararCambioSlug(
      'place',
      completo,
      crudoBase,
      { id: lugar.id, slug: otraPlaza.slug },
      HOY,
    )
    expect(alLocal.ok).toBe(true)
  })
})

describe('el destino se resuelve por id en el Worker', () => {
  it('cambiar dos veces lleva las dos direcciones antiguas a la actual', () => {
    const primero = prepararCambioSlug(
      'place',
      completo,
      crudoBase,
      { id: lugar.id, slug: 'b-nuevo' },
      HOY,
    )
    if (!primero.ok) throw new Error('el primer cambio debía valer')
    const trasPrimero: CommercialDataset = {
      ...completo,
      places: completo.places.map((fila) =>
        fila.id === lugar.id ? { ...fila, slug: 'b-nuevo' } : fila,
      ),
    }
    const segundo = prepararCambioSlug(
      'place',
      trasPrimero,
      { ...crudoBase, redirects: primero.redirects },
      { id: lugar.id, slug: 'c-nuevo' },
      HOY,
    )
    expect(segundo.ok).toBe(true)
    if (!segundo.ok) return
    const filas = segundo.redirects.redirects as Redirect[]
    const finales = completo.places.map((fila) =>
      fila.id === lugar.id ? { ...fila, slug: 'c-nuevo' } : fila,
    )
    const d = resolverDirecciones(filas, completo.plazas, finales)
    expect(d.lugares.get(lugar.slug)).toEqual({ tipo: 'lugar', slug: 'c-nuevo' })
    expect(d.lugares.get('b-nuevo')).toEqual({ tipo: 'lugar', slug: 'c-nuevo' })
  })

  it('cambiar y luego borrar deja la dirección antigua en la zona donde estaba', () => {
    const cambio = prepararCambioSlug(
      'place',
      completo,
      crudoBase,
      { id: lugar.id, slug: 'b-nuevo' },
      HOY,
    )
    if (!cambio.ok) throw new Error('el cambio debía valer')
    const tras: CommercialDataset = {
      ...completo,
      places: completo.places.map((fila) =>
        fila.id === lugar.id ? { ...fila, slug: 'b-nuevo' } : fila,
      ),
    }
    const borrado = prepararBorrado(
      tras,
      { ...crudoBase, redirects: cambio.redirects },
      { id: lugar.id },
      HOY,
    )
    expect(borrado.ok).toBe(true)
    if (!borrado.ok) return
    const filas = borrado.redirects.redirects as Redirect[]
    const sin = tras.places.filter((fila) => fila.id !== lugar.id)
    const d = resolverDirecciones(filas, tras.plazas, sin)
    const zona = tras.plazas.find((fila) => fila.id === lugar.plazaId)
    const esperado = zona?.active ? { tipo: 'zona', slug: zona.slug } : null
    expect(d.lugares.get(lugar.slug)).toEqual(esperado)
    expect(d.lugares.get('b-nuevo')).toEqual(esperado)
  })
})

describe('el endpoint en desarrollo', () => {
  const entorno = { PANEL_ABIERTO: 'si' }

  it('sin confirmar solo calcula el impacto; confirmado valida y no commitea', async () => {
    const vista = await cambiarSlug(entorno, 'place', { id: lugar.id, slug: 'direccion-nueva' })
    expect(vista.ok && vista.confirmado).toBe(false)
    const hecho = await cambiarSlug(entorno, 'place', {
      id: lugar.id,
      slug: 'direccion-nueva',
      confirmar: true,
    })
    expect(hecho.ok && hecho.confirmado && hecho.seco && hecho.pr === null).toBe(true)
  })

  it('un cuerpo mal formado o un id inexistente responden con el problema y no caen', async () => {
    expect((await cambiarSlug(entorno, 'plaza', { nada: 1 })).ok).toBe(false)
    expect((await cambiarSlug(entorno, 'plaza', { id: 'no-existe', slug: 'x' })).ok).toBe(false)
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
          return json({ number: 15, html_url: 'https://github.test/pull/15' })
        }
        throw new Error(`llamada inesperada: ${metodo} ${ruta}`)
      }),
    )
    return { arboles, blobs }
  }

  afterEach(() => vi.unstubAllGlobals())

  it.each([
    ['place', 'places.json', lugar.id],
    ['plaza', 'plazas.json', plaza.id],
  ] as const)(
    'en %s manda el archivo y redirects.json en un solo commit',
    async (tipo, archivo, id) => {
      const { arboles, blobs } = montar()
      const resultado = await cambiarSlug(entorno, tipo, {
        id,
        slug: 'direccion-nueva',
        confirmar: true,
      })
      expect(resultado.ok).toBe(true)
      if (!resultado.ok) return
      expect(resultado.seco).toBe(false)
      expect(resultado.pr?.numero).toBe(15)
      expect(arboles).toHaveLength(1)
      expect(arboles[0]?.map((fila) => fila.path)).toEqual([
        `data/commercial/${archivo}`,
        'data/commercial/redirects.json',
      ])
      const redirects = JSON.parse(blobs[1] ?? '{}') as { redirects: Redirect[] }
      expect(redirects.redirects).toHaveLength(1)
      expect(redirects.redirects[0]?.kind).toBe(tipo === 'place' ? 'place-slug' : 'plaza-slug')
    },
  )

  it('sin confirmar no escribe nada en GitHub', async () => {
    const { arboles } = montar()
    const resultado = await cambiarSlug(entorno, 'place', { id: lugar.id, slug: 'direccion-nueva' })
    expect(resultado.ok && resultado.confirmado).toBe(false)
    expect(arboles).toHaveLength(0)
    const llamadas = vi.mocked(fetch).mock.calls.map(([, init]) => init?.method ?? 'GET')
    expect(llamadas.every((metodo) => metodo === 'GET')).toBe(true)
  })
})
