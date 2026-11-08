import { afterEach, describe, expect, it, vi } from 'vitest'
import categoriasJson from '../data/commercial/categories.json' with { type: 'json' }
import lugaresJson from '../data/commercial/places.json' with { type: 'json' }
import plazasJson from '../data/commercial/plazas.json' with { type: 'json' }
import { type CommercialDataset, isInsidePlazaGeometry } from '../src/data/relations.ts'
import { CategoriesFileSchema, PlacesFileSchema, PlazasFileSchema } from '../src/data/schemas.ts'
import { guardarContorno, prepararContorno } from './geometria-plaza.ts'

/*
 * Nada aquí nombra una plaza ni un local reales: se escogen del propio dataset por reglas (una plaza con
 * al menos dos locales ubicados cuyo contorno, encogido, sigue siendo válido). Renombrar o mover una plaza
 * de la guía no puede poner en rojo estas pruebas.
 */
const completo: CommercialDataset = {
  categories: CategoriesFileSchema.parse(categoriasJson).categories,
  plazas: PlazasFileSchema.parse(plazasJson).plazas,
  places: PlacesFileSchema.parse(lugaresJson).places,
}
const crudo = {
  categories: categoriasJson as unknown as Record<string, unknown>,
  plazas: plazasJson as unknown as Record<string, unknown>,
  places: lugaresJson as unknown as Record<string, unknown>,
}
const HOY = '2026-11-08'

const anilloDe = (plaza: { geometry: { type: string; coordinates: unknown } }): number[][] =>
  (plaza.geometry.coordinates as number[][][])[0] ?? []

/** Escala un anillo respecto de su centro: k < 1 lo encoge, k > 1 lo agranda. */
function escalar(anillo: number[][], k: number): number[][] {
  const abierto = anillo.slice(0, -1)
  const cx = abierto.reduce((s, p) => s + (p[0] ?? 0), 0) / abierto.length
  const cy = abierto.reduce((s, p) => s + (p[1] ?? 0), 0) / abierto.length
  const nuevo = abierto.map((p) => [cx + ((p[0] ?? 0) - cx) * k, cy + ((p[1] ?? 0) - cy) * k])
  return [...nuevo, nuevo[0] ?? []]
}
const poligono = (anillo: number[][]) => ({ type: 'Polygon', coordinates: [anillo] })

const conUbicacion = (id: string) =>
  completo.places.filter((place) => place.plazaId === id && place.location)

/** La plaza de los casos: con al menos dos locales ubicados y un contorno que encogido al 90 % sigue valiendo. */
const elegida = completo.plazas.find((plaza) => {
  if (conUbicacion(plaza.id).length < 2) return false
  const preparado = prepararContorno(
    completo,
    crudo,
    { id: plaza.id, geometria: poligono(escalar(anilloDe(plaza), 0.9)) },
    HOY,
  )
  return preparado.ok
})
if (!elegida)
  throw new Error('el dataset no tiene una plaza con dos locales ubicados y contorno encogible')
const plaza = elegida
const reducida = escalar(anilloDe(plaza), 0.9)

describe('la vista de impacto', () => {
  it('dice cuántos vértices y cuánta área cambian, sin escribir nada', () => {
    const preparado = prepararContorno(
      completo,
      crudo,
      { id: plaza.id, geometria: poligono(reducida) },
      HOY,
    )
    expect(preparado.ok).toBe(true)
    if (!preparado.ok) return
    expect(preparado.impacto.vertices).toEqual({
      antes: anilloDe(plaza).length - 1,
      despues: reducida.length - 1,
    })
    const { antes, despues, cambio } = preparado.impacto.area
    expect(despues).toBeLessThan(antes)
    expect(cambio).toBe(despues - antes)
    // Un 0,9 lineal es un 0,81 de área.
    expect(despues / antes).toBeGreaterThan(0.79)
    expect(despues / antes).toBeLessThan(0.83)
  })

  it('distingue los locales que QUEDAN fuera de los que ya estaban fuera', () => {
    const [primero, segundo] = conUbicacion(plaza.id)
    if (!primero || !segundo) throw new Error('hacen falta dos locales ubicados')
    const centro = anilloDe(plaza)
      .slice(0, -1)
      .reduce(
        (c, p, _, a) => [
          (c[0] ?? 0) + (p[0] ?? 0) / a.length,
          (c[1] ?? 0) + (p[1] ?? 0) / a.length,
        ],
        [0, 0],
      )
    const vertice = anilloDe(plaza)[0] ?? [0, 0]
    // Uno pegado al borde (dentro del contorno actual, fuera del encogido) y otro lejos de los dos.
    const pegado = {
      lng: (centro[0] ?? 0) + 0.97 * ((vertice[0] ?? 0) - (centro[0] ?? 0)),
      lat: (centro[1] ?? 0) + 0.97 * ((vertice[1] ?? 0) - (centro[1] ?? 0)),
    }
    const lejos = { lng: (centro[0] ?? 0) + 0.003, lat: centro[1] ?? 0 }
    // Solo cuenta si el punto "pegado" está de verdad dentro del contorno actual; si no, la prueba no mide lo que dice.
    expect(isInsidePlazaGeometry(pegado, plaza.geometry)).toBe(true)
    const dataset: CommercialDataset = {
      ...completo,
      places: completo.places.map((place) =>
        place.id === primero.id
          ? { ...place, location: pegado }
          : place.id === segundo.id
            ? { ...place, location: lejos }
            : place,
      ),
    }
    const preparado = prepararContorno(
      dataset,
      crudo,
      { id: plaza.id, geometria: poligono(reducida) },
      HOY,
    )
    expect(preparado.ok).toBe(true)
    if (!preparado.ok) return
    expect(preparado.impacto.locales.quedanFuera.map((fila) => fila.id)).toContain(primero.id)
    expect(preparado.impacto.locales.quedanFuera.map((fila) => fila.id)).not.toContain(segundo.id)
    expect(preparado.impacto.locales.siguenFuera).toBeGreaterThanOrEqual(1)
    expect(preparado.impacto.avisos.join(' ')).toMatch(/quedan? fuera/)
  })
})

describe('lo que se guarda', () => {
  it('cambia solo la geometría de esa plaza y la fecha, y nada más del archivo', () => {
    const preparado = prepararContorno(
      completo,
      crudo,
      { id: plaza.id, geometria: poligono(reducida) },
      HOY,
    )
    expect(preparado.ok).toBe(true)
    if (!preparado.ok) return
    const antes = plazasJson as unknown as { plazas: Record<string, unknown>[]; updatedAt: string }
    const despues = preparado.plazas as unknown as {
      plazas: Record<string, unknown>[]
      updatedAt: string
    }
    expect(despues.updatedAt).toBe(HOY)
    // Todas las claves del archivo salvo la fecha y las plazas, intactas.
    const { plazas: _a, updatedAt: _b, ...restoAntes } = antes
    const { plazas: _c, updatedAt: _d, ...restoDespues } = despues
    expect(restoDespues).toEqual(restoAntes)
    expect(despues.plazas).toHaveLength(antes.plazas.length)
    despues.plazas.forEach((fila, i) => {
      const original = antes.plazas[i] ?? {}
      if (fila.id === plaza.id) {
        // La misma plaza, con la misma lista de claves: solo `geometry` es distinta.
        expect(Object.keys(fila)).toEqual(Object.keys(original))
        const { geometry: nueva, ...restoFila } = fila
        const { geometry: vieja, ...restoOriginal } = original
        expect(restoFila).toEqual(restoOriginal)
        expect(nueva).not.toEqual(vieja)
      } else {
        expect(fila).toEqual(original)
      }
    })
  })

  it('guarda las coordenadas a 6 decimales, cerradas y con el exterior antihorario', () => {
    const preparado = prepararContorno(
      completo,
      crudo,
      { id: plaza.id, geometria: poligono([...reducida].reverse()) },
      HOY,
    )
    expect(preparado.ok).toBe(true)
    if (!preparado.ok) return
    const fila = (
      preparado.plazas as unknown as {
        plazas: { id: string; geometry: { coordinates: number[][][] } }[]
      }
    ).plazas.find((f) => f.id === plaza.id)
    const anillo = fila?.geometry.coordinates[0] ?? []
    expect(anillo[0]).toEqual(anillo[anillo.length - 1])
    for (const p of anillo) {
      for (const n of p) expect(Number(n.toFixed(6))).toBe(n)
    }
    const doble = anillo.slice(0, -1).reduce((s, p, i, a) => {
      const q = a[(i + 1) % a.length] ?? p
      return s + ((p[0] ?? 0) * (q[1] ?? 0) - (q[0] ?? 0) * (p[1] ?? 0))
    }, 0)
    expect(doble).toBeGreaterThan(0)
  })
})

describe('lo que se rechaza', () => {
  const rechaza = (geometria: unknown, dataset = completo) =>
    prepararContorno(dataset, crudo, { id: plaza.id, geometria }, HOY)

  it('un contorno enredado', () => {
    const anillo = anilloDe(plaza).slice(0, -1)
    // Intercambia dos vértices no contiguos: los lados se cruzan.
    const enredado = [...anillo]
    ;[enredado[1], enredado[3]] = [enredado[3] ?? [], enredado[1] ?? []]
    const r = rechaza(poligono([...enredado, enredado[0] ?? []]))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.problemas.join(' ')).toMatch(/cruza|toca/)
  })

  it('un contorno fuera de Zibatá', () => {
    const lejos = anilloDe(plaza).map((p) => [(p[0] ?? 0) + 5, p[1] ?? 0])
    const r = rechaza(poligono(lejos))
    expect(r.ok).toBe(false)
  })

  it('un contorno diminuto', () => {
    const [x = 0, y = 0] = anilloDe(plaza)[0] ?? []
    const r = rechaza(
      poligono([
        [x, y],
        [x + 0.00001, y],
        [x + 0.00001, y + 0.00001],
        [x, y],
      ]),
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.problemas.join(' ')).toMatch(/m²/)
  })

  it('el contorno de otra plaza (se solapa y deja fuera el marcador)', () => {
    const otra = completo.plazas.find((fila) => fila.id !== plaza.id)
    if (!otra) throw new Error('hace falta otra plaza')
    const r = rechaza(otra.geometry)
    expect(r.ok).toBe(false)
  })

  it('el mismo contorno que ya tiene, porque no hay nada que guardar', () => {
    const r = rechaza(plaza.geometry)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.problemas.join(' ')).toMatch(/nada que guardar|mismo/)
  })

  it('una plaza que no existe y un cuerpo con campos de más', () => {
    expect(
      prepararContorno(completo, crudo, { id: 'no-existe', geometria: poligono(reducida) }, HOY).ok,
    ).toBe(false)
    expect(
      prepararContorno(
        completo,
        crudo,
        { id: plaza.id, geometria: poligono(reducida), nombre: 'otro' },
        HOY,
      ).ok,
    ).toBe(false)
    expect(prepararContorno(completo, crudo, { geometria: poligono(reducida) }, HOY).ok).toBe(false)
  })
})

describe('el endpoint en desarrollo', () => {
  const entorno = { PANEL_ABIERTO: 'si' }

  it('sin confirmar solo calcula el impacto', async () => {
    const r = await guardarContorno(entorno, { id: plaza.id, geometria: poligono(reducida) })
    expect(r.ok && r.confirmado).toBe(false)
  })

  it('al confirmar valida, pero en desarrollo no commitea', async () => {
    const r = await guardarContorno(entorno, {
      id: plaza.id,
      geometria: poligono(reducida),
      confirmar: true,
    })
    expect(r.ok && r.confirmado && r.seco).toBe(true)
  })

  it('un cuerpo mal formado responde con el problema y no cae', async () => {
    expect((await guardarContorno(entorno, { nada: 1 })).ok).toBe(false)
    expect((await guardarContorno(entorno, null)).ok).toBe(false)
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
          '/contents/data/commercial/categories.json?ref=main': crudo.categories,
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
        if (metodo === 'POST' && ruta === '/pulls')
          return json({ number: 9, html_url: 'https://github.test/pull/9' })
        throw new Error(`llamada inesperada: ${metodo} ${ruta}`)
      }),
    )
    return { arboles, blobs }
  }

  afterEach(() => vi.unstubAllGlobals())

  it('manda solo plazas.json en un solo commit', async () => {
    const { arboles, blobs } = montar()
    const r = await guardarContorno(entorno, {
      id: plaza.id,
      geometria: poligono(reducida),
      confirmar: true,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.seco).toBe(false)
    expect(r.pr?.numero).toBe(9)
    expect(arboles).toHaveLength(1)
    expect(arboles[0]?.map((fila) => fila.path)).toEqual(['data/commercial/plazas.json'])
    expect(blobs).toHaveLength(1)
    // Y el archivo que se sube sigue siendo un `plazas.json` válido para el esquema.
    expect(PlazasFileSchema.safeParse(JSON.parse(blobs[0] ?? '{}')).success).toBe(true)
  })

  it('sin confirmar no escribe nada en GitHub', async () => {
    const { arboles } = montar()
    const r = await guardarContorno(entorno, { id: plaza.id, geometria: poligono(reducida) })
    expect(r.ok && r.confirmado).toBe(false)
    expect(arboles).toHaveLength(0)
    const llamadas = vi.mocked(fetch).mock.calls.map(([, init]) => init?.method ?? 'GET')
    expect(llamadas.every((metodo) => metodo === 'GET')).toBe(true)
  })

  it('un contorno inválido no llega a escribir nada, ni al confirmar', async () => {
    const { arboles } = montar()
    const r = await guardarContorno(entorno, {
      id: plaza.id,
      geometria: poligono(anilloDe(plaza).map((p) => [(p[0] ?? 0) + 5, p[1] ?? 0])),
      confirmar: true,
    })
    expect(r.ok).toBe(false)
    expect(arboles).toHaveLength(0)
  })
})
