import { afterEach, describe, expect, it, vi } from 'vitest'
import categoriasJson from '../data/commercial/categories.json' with { type: 'json' }
import lugaresJson from '../data/commercial/places.json' with { type: 'json' }
import plazasJson from '../data/commercial/plazas.json' with { type: 'json' }
import { type CommercialDataset, syncPlazaDerivedFields } from '../src/data/relations.ts'
import { CategoriesFileSchema, PlacesFileSchema, PlazasFileSchema } from '../src/data/schemas.ts'
import { guardarPlaza, prepararPlaza } from './plazas.ts'

// `guardarPlaza` lee las plazas del paquete: se le pone la zona apagada de prueba, que el dataset real no trae.
vi.mock('../data/commercial/plazas.json', async (original) => {
  const real = (await original()) as { default: { plazas: readonly unknown[] } }
  const { conZonaApagada: con } = await import('./zona-apagada.fixture.ts')
  return { ...real, default: con(real.default) }
})

/*
 * Nada aquí nombra una plaza real: se escoge una del propio dataset. Renombrar o desactivar una plaza
 * de la guía no puede poner en rojo estas pruebas.
 */
const dataset: CommercialDataset = {
  categories: CategoriesFileSchema.parse(categoriasJson).categories,
  sectors: CategoriesFileSchema.parse(categoriasJson).sectors,
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

/**
 * El dataset con los locales de la plaza (o de todas, sin argumento) ocultos, y lo derivado de las plazas al
 * día, tanto en el dataset como en el crudo: el Worker parte de las filas crudas de las plazas.
 */
const conLocalesOcultos = (plazaId?: string) => {
  const places = dataset.places.map((place) =>
    plazaId === undefined || place.plazaId === plazaId ? { ...place, active: false } : place,
  )
  const plazas = syncPlazaDerivedFields({ ...dataset, places })
  const filas = (crudo.plazas as unknown as { plazas: Record<string, unknown>[] }).plazas
  const derivado = new Map(plazas.map((fila) => [fila.id, fila]))
  return {
    ds: { ...dataset, places, plazas } as CommercialDataset,
    cr: {
      ...crudo,
      plazas: {
        ...crudo.plazas,
        plazas: filas.map((fila) => ({
          ...fila,
          placeIds: derivado.get(String(fila.id))?.placeIds,
          categories: derivado.get(String(fila.id))?.categories,
        })),
      },
    },
  }
}

/** Una plaza apagada del propio dataset que no es un "próximamente", y lo que manda el formulario al activarla. */
// Por regla sobre el dato, no por orden: apagada, sin ser un próximamente ni una descartada.
const apagada = dataset.plazas.find(
  (fila) => !fila.active && !fila.comingSoon && fila.verification?.status === 'uncertain',
)
if (!apagada) throw new Error('el dataset necesita una plaza inactiva con estado "uncertain"')
const activarApagada = (extra: Record<string, unknown> = {}) => ({
  id: apagada.id,
  nombre: apagada.name,
  descripcionEs: apagada.description?.es ?? '',
  descripcionEn: apagada.description?.en ?? '',
  direccion: apagada.address ?? '',
  lat: apagada.coordinates.lat,
  lng: apagada.coordinates.lng,
  googleMapsUri: apagada.googleMapsUri ?? '',
  activa: true,
  proximamente: false,
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

  it('guardar una errata no toca la verificación: ni fecha, ni fuentes, ni estado', () => {
    const preparada = prepararPlaza(dataset, crudo, igual({ direccion: 'Otra calle 2' }), HOY)
    expect(preparada.ok).toBe(true)
    if (!preparada.ok || !plaza.verification) return
    const fila = (
      preparada.plazas.plazas as { id: string; verification: typeof plaza.verification }[]
    ).find((otra) => otra.id === plaza.id)
    expect(fila?.verification).toEqual(plaza.verification)
    expect(JSON.stringify(fila?.verification)).not.toContain(`campo:${HOY}`)
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
  // Las fuentes que la plaza ya tenía: repetirlas no es evidencia nueva.
  const urlsDeLaApagada = (apagada.verification?.sources ?? []).filter(
    (fuente) => !fuente.startsWith('campo:'),
  )
  // La plaza apagada del propio dataset, con cada estado de investigación puesto a mano.
  const activar = (estado: string, extra: Record<string, unknown> = {}) => {
    const verification = {
      sources: ['https://ejemplo.test/x'],
      confidence: 'low',
      lastVerifiedAt: HOY,
      ...apagada.verification,
      status: estado,
    }
    const ds: CommercialDataset = {
      ...dataset,
      plazas: dataset.plazas.map((fila) =>
        fila.id === apagada.id ? ({ ...fila, verification } as typeof fila) : fila,
      ),
    }
    const filas = (crudo.plazas as unknown as { plazas: Record<string, unknown>[] }).plazas
    const cr = {
      ...crudo,
      plazas: {
        ...crudo.plazas,
        plazas: filas.map((f) => (f.id === apagada.id ? { ...f, verification } : f)),
      },
    }
    return prepararPlaza(ds, cr, activarApagada(extra), HOY)
  }
  const estadoEscrito = (r: ReturnType<typeof activar>) => {
    if (!r.ok) throw new Error(r.problemas.join(' | '))
    const fila = (r.plazas.plazas as { id: string; verification?: { status: string } }[]).find(
      (otra) => otra.id === apagada.id,
    )
    return fila?.verification?.status
  }

  it('lo que dice "todavía no" pasa a likely_active, lo escribe y lo avisa con la transición', () => {
    for (const estado of ['uncertain', 'coming_soon']) {
      const r = activar(estado)
      expect(r.ok, estado).toBe(true)
      expect(estadoEscrito(r), estado).toBe('likely_active')
      if (r.ok) {
        expect(r.impacto.avisos.join(' '), estado).toContain(
          `pasa de "${estado}" a "likely_active"`,
        )
      }
    }
  })

  it('lo que la investigación descartó no se activa desde el panel', () => {
    for (const estado of ['closed', 'removed', 'duplicate', 'rejected']) {
      const r = activar(estado)
      expect(r.ok, estado).toBe(false)
      if (!r.ok) expect(r.problemas.join(' '), estado).toContain(`"${estado}"`)
    }
  })

  it('lo descartado se revierte con evidencia nueva en el mismo guardado: "Lo comprobé yo" lo deja active', () => {
    for (const estado of ['closed', 'removed', 'duplicate', 'rejected']) {
      const r = activar(estado, {
        verificacion: {
          comprobadoPorMi: true,
          fuentes: ['https://ejemplo.test/x'],
          confianza: 'high',
        },
      })
      expect(r.ok, estado).toBe(true)
      expect(estadoEscrito(r), estado).toBe('active')
      if (r.ok) {
        const fila = (
          r.plazas.plazas as {
            id: string
            verification: { sources: string[]; lastVerifiedAt: string }
          }[]
        ).find((otra) => otra.id === apagada.id)
        expect(fila?.verification.sources, estado).toContain(`campo:${HOY}`)
        expect(fila?.verification.lastVerifiedAt, estado).toBe(HOY)
        // La confirmación enseña lo que se afirma: el cambio de estado y la marca en el lugar.
        const avisos = r.impacto.avisos.join(' ')
        expect(avisos, estado).toContain(`pasa de "${estado}" a "active"`)
        expect(avisos, estado).toContain(`campo:${HOY}`)
      }
    }
  })

  it('una plaza activa no puede quedar con un estado que dice "no": se desactiva también', () => {
    for (const estado of ['closed', 'removed', 'duplicate', 'rejected', 'uncertain']) {
      const r = prepararPlaza(
        dataset,
        crudo,
        igual({
          verificacion: {
            comprobadoPorMi: false,
            fuentes: (plaza.verification?.sources ?? []).filter((f) => !f.startsWith('campo:')),
            confianza: 'high',
            estado,
          },
        }),
        HOY,
      )
      expect(r.ok, estado).toBe(false)
      if (!r.ok) expect(r.problemas.join(' '), estado).toMatch(/no puede quedar como/)
    }
  })

  it('cerrar una plaza apagada es un cambio de estado sin evidencia y sin activarla', () => {
    const r = activar('uncertain', {
      activa: false,
      verificacion: {
        comprobadoPorMi: false,
        fuentes: urlsDeLaApagada,
        confianza: 'high',
        estado: 'closed',
      },
    })
    expect(r.ok, r.ok ? '' : r.problemas.join(' | ')).toBe(true)
    expect(estadoEscrito(r)).toBe('closed')
  })

  it('lo descartado también se revierte con una fuente oficial nueva y el cambio de estado', () => {
    const r = activar('removed', {
      verificacion: {
        comprobadoPorMi: false,
        fuentes: ['https://ejemplo.test/x', 'https://www.walmart.com.mx/tiendas/zibata'],
        confianza: 'medium',
        estado: 'likely_active',
      },
    })
    expect(r.ok, r.ok ? '' : r.problemas.join(' | ')).toBe(true)
    expect(estadoEscrito(r)).toBe('likely_active')
  })

  it('cambiar el estado a uno que se publica sin evidencia nueva se rechaza', () => {
    const r = activar('removed', {
      verificacion: {
        comprobadoPorMi: false,
        fuentes: urlsDeLaApagada,
        confianza: 'medium',
        estado: 'likely_active',
      },
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.problemas.join(' ')).toMatch(/evidencia nueva/)
  })

  it('una fuente que es solo OpenStreetMap no revierte un estado descartado', () => {
    const r = activar('removed', {
      verificacion: {
        comprobadoPorMi: false,
        fuentes: [...urlsDeLaApagada, 'https://www.openstreetmap.org/node/1'],
        confianza: 'medium',
        estado: 'likely_active',
      },
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.problemas.join(' ')).toMatch(/OpenStreetMap o de apps de reparto/)
  })

  it('si ya es publicable conserva su estado y no avisa de ninguna transición', () => {
    for (const estado of ['active', 'likely_active']) {
      const r = activar(estado)
      expect(r.ok, estado).toBe(true)
      expect(estadoEscrito(r), estado).toBe(estado)
      if (r.ok) expect(r.impacto.avisos.join(' '), estado).not.toMatch(/pasa de/)
    }
  })

  it('desactivar una plaza no toca su estado de investigación', () => {
    const vaciaTodo = conLocalesOcultos()
    const r = prepararPlaza(vaciaTodo.ds, vaciaTodo.cr, igual({ activa: false }), HOY)
    expect(r.ok, r.ok ? '' : r.problemas.join(' | ')).toBe(true)
    if (!r.ok) return
    const fila = (r.plazas.plazas as { id: string; verification?: { status: string } }[]).find(
      (otra) => otra.id === plaza.id,
    )
    expect(fila?.verification?.status).toBe(plaza.verification?.status)
  })
})

describe('desactivar o activar una plaza', () => {
  it('una plaza con locales visibles no se puede desactivar ni pasar a próximamente', () => {
    for (const extra of [{ activa: false }, { activa: false, proximamente: true }]) {
      const preparada = prepararPlaza(dataset, crudo, igual(extra), HOY)
      expect(preparada.ok, JSON.stringify(extra)).toBe(false)
      if (!preparada.ok) {
        expect(preparada.problemas.join(' ')).toMatch(/no puede tener locales abiertos/)
      }
    }
  })

  it('sin locales visibles se desactiva, pide confirmación y dice que su dirección da 404', () => {
    const vacia = conLocalesOcultos(plaza.id)
    const preparada = prepararPlaza(vacia.ds, vacia.cr, igual({ activa: false }), HOY)
    expect(preparada.ok, preparada.ok ? '' : preparada.problemas.join(' | ')).toBe(true)
    if (!preparada.ok) return
    expect(preparada.requiereConfirmacion).toBe(true)
    expect(preparada.impacto.cambiaActiva).toBe(true)
    expect(preparada.impacto.localesDespues).toBe(0)
    expect(preparada.impacto.avisos.join(' ')).toMatch(/404/)
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

  it('activar sin confirmar solo calcula el impacto', async () => {
    const resultado = await guardarPlaza(entorno, activarApagada())
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    expect(resultado.confirmado).toBe(false)
    expect(resultado.requiereConfirmacion).toBe(true)
    expect(resultado.pr).toBeNull()
  })

  it('confirmado valida y no commitea sin testigo de GitHub', async () => {
    const resultado = await guardarPlaza(entorno, activarApagada({ confirmar: true }))
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
    const resultado = await guardarPlaza(entorno, activarApagada())
    expect(resultado.ok && resultado.confirmado).toBe(false)
    expect(arboles).toHaveLength(0)
  })
})
