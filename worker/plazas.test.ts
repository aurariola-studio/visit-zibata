import { afterEach, describe, expect, it, vi } from 'vitest'
import categoriasJson from '../data/commercial/categories.json' with { type: 'json' }
import lugaresJson from '../data/commercial/places.json' with { type: 'json' }
import plazasJson from '../data/commercial/plazas.json' with { type: 'json' }
import type { CommercialDataset } from '../src/data/relations.ts'
import { CategoriesFileSchema, PlacesFileSchema, PlazasFileSchema } from '../src/data/schemas.ts'
import { guardarPlaza, prepararPlaza } from './plazas.ts'

/*
 * Nada aquí nombra una plaza real: se escoge una del propio dataset. Renombrar o desactivar una plaza
 * de la guía no puede poner en rojo estas pruebas.
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

const conLocales = dataset.plazas.find(
  (plaza) =>
    plaza.active && dataset.places.some((place) => place.plazaId === plaza.id && place.active),
)
if (!conLocales) throw new Error('el dataset no tiene una plaza activa con locales')
const plaza = conLocales

/** Lo que manda el formulario para dejar la plaza tal cual está. */
const igual = (extra: Record<string, unknown> = {}) => ({
  id: plaza.id,
  nombre: plaza.name,
  descripcionEs: plaza.description?.es ?? '',
  descripcionEn: plaza.description?.en ?? '',
  direccion: plaza.address ?? '',
  lat: plaza.coordinates.lat,
  lng: plaza.coordinates.lng,
  googleMapsUri: plaza.googleMapsUri ?? '',
  activa: plaza.active,
  proximamente: plaza.comingSoon ?? false,
  ...extra,
})

describe('editar una plaza', () => {
  it('dejarla igual es válido y no pide confirmación', () => {
    const preparada = prepararPlaza(dataset, crudo, igual(), HOY)
    expect(preparada.ok).toBe(true)
    if (!preparada.ok) return
    expect(preparada.requiereConfirmacion).toBe(false)
    expect(preparada.impacto.cambiaActiva).toBe(false)
  })

  it('cambia el nombre, la dirección y el marcador sin tocar el contorno ni los locales', () => {
    const preparada = prepararPlaza(
      dataset,
      crudo,
      igual({
        nombre: 'Plaza de prueba nueva',
        direccion: 'Calle Nueva 1',
        lat: plaza.coordinates.lat + 0.0001,
        lng: plaza.coordinates.lng,
      }),
      HOY,
    )
    expect(preparada.ok).toBe(true)
    if (!preparada.ok) return
    expect(preparada.requiereConfirmacion).toBe(false)
    const filas = preparada.plazas.plazas as Record<string, unknown>[]
    const fila = filas.find((otra) => otra.id === plaza.id) as Record<string, unknown>
    expect(fila.name).toBe('Plaza de prueba nueva')
    expect(fila.address).toBe('Calle Nueva 1')
    // Lo que no se edita queda como estaba.
    const original = (plazasJson.plazas as Record<string, unknown>[]).find(
      (otra) => otra.id === plaza.id,
    ) as Record<string, unknown>
    expect(fila.geometry).toEqual(original.geometry)
    expect(fila.placeIds).toEqual(original.placeIds)
    expect(fila.slug).toBe(plaza.slug)
    expect(filas).toHaveLength(dataset.plazas.length)
    expect(preparada.plazas.updatedAt).toBe(HOY)
  })

  it('guardar apunta la verificación de campo sin inventar un estado', () => {
    const preparada = prepararPlaza(dataset, crudo, igual({ direccion: 'Otra calle 2' }), HOY)
    expect(preparada.ok).toBe(true)
    if (!preparada.ok || !plaza.verification) return
    const fila = (
      preparada.plazas.plazas as { id: string; verification: typeof plaza.verification }[]
    ).find((otra) => otra.id === plaza.id)
    expect(fila?.verification?.lastVerifiedAt).toBe(HOY)
    expect(fila?.verification?.sources).toContain(`campo:${HOY}`)
    expect(fila?.verification?.status).toBe(plaza.verification.status)
  })

  it('rechaza un marcador fuera de Zibatá', () => {
    const preparada = prepararPlaza(dataset, crudo, igual({ lat: 0, lng: 0 }), HOY)
    expect(preparada.ok).toBe(false)
  })

  it('una plaza que ya no existe no se edita', () => {
    const preparada = prepararPlaza(dataset, crudo, igual({ id: 'no-existe-esta-plaza' }), HOY)
    expect(preparada).toEqual({ ok: false, problemas: ['Esa plaza ya no existe'] })
  })

  it('la descripción va en los dos idiomas o en ninguno', () => {
    const preparada = prepararPlaza(dataset, crudo, igual({ descripcionEn: '' }), HOY)
    expect(preparada.ok).toBe(false)
    const ninguna = prepararPlaza(
      dataset,
      crudo,
      igual({ descripcionEs: '', descripcionEn: '' }),
      HOY,
    )
    expect(ninguna.ok).toBe(true)
  })

  it('un "próximamente" no puede estar activo', () => {
    const preparada = prepararPlaza(
      dataset,
      crudo,
      igual({ activa: true, proximamente: true }),
      HOY,
    )
    expect(preparada.ok).toBe(false)
  })

  it('un cuerpo con campos de más se rechaza', () => {
    expect(prepararPlaza(dataset, crudo, igual({ slug: 'otro' }), HOY).ok).toBe(false)
    expect(prepararPlaza(dataset, crudo, igual({ geometry: {} }), HOY).ok).toBe(false)
  })

  it('no admite un nombre vacío', () => {
    expect(prepararPlaza(dataset, crudo, igual({ nombre: '   ' }), HOY).ok).toBe(false)
  })
})

describe('los títulos no se repiten', () => {
  it('no admite el nombre de otra plaza', () => {
    const otra = dataset.plazas.find((fila) => fila.id !== plaza.id && fila.active)
    if (!otra) throw new Error('el dataset necesita otra plaza activa')
    const preparada = prepararPlaza(dataset, crudo, igual({ nombre: otra.name }), HOY)
    expect(preparada.ok).toBe(false)
  })

  it('no admite el nombre de un local que se ve', () => {
    const local = dataset.places.find((place) => place.active && place.plazaId !== plaza.id)
    if (!local) throw new Error('el dataset necesita un local visible en otra plaza')
    const preparada = prepararPlaza(dataset, crudo, igual({ nombre: local.name }), HOY)
    expect(preparada.ok).toBe(false)
  })

  it('no admite un nombre que no cabe en el título', () => {
    const preparada = prepararPlaza(dataset, crudo, igual({ nombre: 'N'.repeat(70) }), HOY)
    expect(preparada.ok).toBe(false)
  })

  it('no admite la descripción de otra página', () => {
    const otra = dataset.plazas.find(
      (fila) => fila.id !== plaza.id && fila.active && fila.description,
    )
    if (!otra?.description) throw new Error('el dataset necesita otra plaza con descripción')
    const preparada = prepararPlaza(
      dataset,
      crudo,
      igual({ descripcionEs: otra.description.es, descripcionEn: 'Un texto propio y distinto.' }),
      HOY,
    )
    expect(preparada.ok).toBe(false)
  })
})

describe('activar una plaza que no está verificada', () => {
  // Una plaza inactiva del propio dataset a la que se le da cada estado de investigación.
  const inactiva = dataset.plazas.find((fila) => !fila.active && !fila.comingSoon)

  const activar = (estado: string) => {
    if (!inactiva) throw new Error('el dataset no tiene una plaza inactiva que no sea próximamente')
    const verification = {
      sources: ['https://ejemplo.test/x'],
      confidence: 'low',
      lastVerifiedAt: HOY,
      ...inactiva.verification,
      status: estado,
    }
    const ds: CommercialDataset = {
      ...dataset,
      plazas: dataset.plazas.map((fila) =>
        fila.id === inactiva.id ? ({ ...fila, verification } as typeof fila) : fila,
      ),
    }
    const filas = (crudo.plazas as unknown as { plazas: Record<string, unknown>[] }).plazas
    const cr = {
      ...crudo,
      plazas: {
        ...crudo.plazas,
        plazas: filas.map((f) => (f.id === inactiva.id ? { ...f, verification } : f)),
      },
    }
    return prepararPlaza(
      ds,
      cr,
      {
        id: inactiva.id,
        nombre: inactiva.name,
        descripcionEs: inactiva.description?.es ?? '',
        descripcionEn: inactiva.description?.en ?? '',
        direccion: inactiva.address ?? '',
        lat: inactiva.coordinates.lat,
        lng: inactiva.coordinates.lng,
        googleMapsUri: inactiva.googleMapsUri ?? '',
        activa: true,
        proximamente: false,
      },
      HOY,
    )
  }

  it('avisa de que se publicaría sin verificar, con su estado', () => {
    const r = activar('uncertain')
    expect(r.ok, r.ok ? '' : r.problemas.join(' | ')).toBe(true)
    if (r.ok) expect(r.impacto.avisos.join(' ')).toMatch(/"uncertain".*sin verificarla/)
  })

  it('no avisa si su estado ya es publicable', () => {
    for (const estado of ['active', 'likely_active']) {
      const r = activar(estado)
      expect(r.ok, estado).toBe(true)
      if (r.ok) expect(r.impacto.avisos.join(' '), estado).not.toMatch(/sin verificarla/)
    }
  })
})

describe('desactivar o activar una plaza', () => {
  it('desactivar una plaza con locales pide confirmación y dice qué se pierde', () => {
    const preparada = prepararPlaza(dataset, crudo, igual({ activa: false }), HOY)
    expect(preparada.ok).toBe(true)
    if (!preparada.ok) return
    expect(preparada.requiereConfirmacion).toBe(true)
    expect(preparada.impacto.cambiaActiva).toBe(true)
    expect(preparada.impacto.localesAntes).toBeGreaterThan(0)
    expect(preparada.impacto.localesDespues).toBe(0)
    expect(preparada.impacto.avisos.join(' ')).toMatch(/404/)
  })

  it('una categoría que solo vivía en esta plaza pierde su página, y se avisa', () => {
    // Un dataset con una sola plaza: desactivarla deja sin local visible a todas sus categorías.
    const sola: CommercialDataset = {
      ...dataset,
      plazas: [plaza],
      places: dataset.places.filter((place) => place.plazaId === plaza.id),
    }
    const preparada = prepararPlaza(
      sola,
      {
        ...crudo,
        plazas: { ...crudo.plazas, plazas: [plazasJson.plazas.find((p) => p.id === plaza.id)] },
      },
      igual({ activa: false }),
      HOY,
    )
    expect(preparada.ok).toBe(true)
    if (!preparada.ok) return
    expect(preparada.impacto.categoriasSinPagina.length).toBeGreaterThan(0)
  })

  it('activar una inactiva pide confirmación y dice qué empieza a verse', () => {
    // Un dataset con una sola plaza, apagada: encenderla da vista a sus locales y página a sus categorías.
    const filaCruda = (plazasJson.plazas as Record<string, unknown>[]).find(
      (otra) => otra.id === plaza.id,
    ) as Record<string, unknown>
    const apagada: CommercialDataset = {
      ...dataset,
      plazas: [{ ...plaza, active: false }],
      places: dataset.places.filter((place) => place.plazaId === plaza.id),
    }
    const preparada = prepararPlaza(
      apagada,
      { ...crudo, plazas: { ...crudo.plazas, plazas: [{ ...filaCruda, active: false }] } },
      igual({ activa: true }),
      HOY,
    )
    expect(preparada.ok).toBe(true)
    if (!preparada.ok) return
    expect(preparada.requiereConfirmacion).toBe(true)
    expect(preparada.impacto.activaAntes).toBe(false)
    expect(preparada.impacto.activaDespues).toBe(true)
    expect(preparada.impacto.localesAntes).toBe(0)
    expect(preparada.impacto.localesDespues).toBeGreaterThan(0)
    expect(preparada.impacto.categoriasNuevas.length).toBeGreaterThan(0)
    expect(preparada.impacto.avisos.join(' ')).toMatch(/se publica la página/i)
  })
})

describe('guardarPlaza en desarrollo', () => {
  const entorno = { PANEL_ABIERTO: 'si' }

  it('un cambio que no afecta a lo que se ve se valida en seco', async () => {
    const resultado = await guardarPlaza(entorno, igual({ direccion: 'Otra calle 3' }))
    expect(resultado.ok && resultado.confirmado).toBe(true)
    expect(resultado.ok && resultado.seco).toBe(true)
  })

  it('desactivar sin confirmar solo calcula el impacto', async () => {
    const resultado = await guardarPlaza(entorno, igual({ activa: false }))
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    expect(resultado.confirmado).toBe(false)
    expect(resultado.requiereConfirmacion).toBe(true)
    expect(resultado.pr).toBeNull()
  })

  it('confirmado valida y no commitea sin testigo de GitHub', async () => {
    const resultado = await guardarPlaza(entorno, igual({ activa: false, confirmar: true }))
    expect(resultado.ok && resultado.confirmado).toBe(true)
    expect(resultado.ok && resultado.seco).toBe(true)
  })

  it('un problema se devuelve tal cual', async () => {
    const resultado = await guardarPlaza(entorno, igual({ nombre: '' }))
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

  function montar() {
    const arboles: { path: string }[][] = []
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
        if (metodo === 'POST' && ruta === '/git/commits') return json({ sha: 'commit' })
        if (metodo === 'POST' && ruta === '/git/refs') return json({})
        if (metodo === 'POST' && ruta === '/pulls') {
          return json({ number: 8, html_url: 'https://github.test/pull/8' })
        }
        throw new Error(`llamada inesperada: ${metodo} ${ruta}`)
      }),
    )
    return { arboles }
  }

  afterEach(() => vi.unstubAllGlobals())

  it('manda solo plazas.json en el commit', async () => {
    const { arboles } = montar()
    const resultado = await guardarPlaza(entorno, igual({ direccion: 'Otra calle 4' }))
    expect(resultado.ok && resultado.pr?.numero).toBe(8)
    expect(arboles).toHaveLength(1)
    expect(arboles[0]?.map((fila) => fila.path)).toEqual(['data/commercial/plazas.json'])
  })

  it('un cambio de activa sin confirmar no escribe nada', async () => {
    const { arboles } = montar()
    const resultado = await guardarPlaza(entorno, igual({ activa: false }))
    expect(resultado.ok && resultado.confirmado).toBe(false)
    expect(arboles).toHaveLength(0)
  })
})
