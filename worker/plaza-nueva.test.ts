import { afterEach, describe, expect, it, vi } from 'vitest'
import categoriasJson from '../data/commercial/categories.json' with { type: 'json' }
import lugaresJson from '../data/commercial/places.json' with { type: 'json' }
import plazasJson from '../data/commercial/plazas.json' with { type: 'json' }
import extentJson from '../data/geographic/extent.json' with { type: 'json' }
import { areaM2 } from '../src/data/geometria.ts'
import { type CommercialDataset, isInsidePlazaGeometry } from '../src/data/relations.ts'
import { CategoriesFileSchema, PlacesFileSchema, PlazasFileSchema } from '../src/data/schemas.ts'
import { crearPlaza, prepararPlazaNueva } from './plaza-nueva.ts'
import { slugDe } from './slug.ts'

/*
 * Nada aquí nombra una plaza ni un sitio reales: el punto libre se busca en el mapa con una regla (dentro de
 * Zibatá y lejos de toda plaza), y los nombres en uso se toman del propio dataset.
 */
const completo: CommercialDataset = {
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
const HOY = '2026-11-09'

const base = {
  nombre: 'Plaza de Prueba',
  lat: 0,
  lng: 0,
  fuentes: ['https://ejemplo.test/la-plaza'],
  evidencia: 'Enlace de Google Maps aportado por quien mantiene la guía.',
  confianza: 'medium' as const,
  estado: 'proximamente' as const,
}

/** Un punto libre: el primero de una rejilla sobre Zibatá en el que la creación es válida. */
const [oeste, sur, este, norte] = extentJson.areaBbox as [number, number, number, number]
function puntoLibre(): { lat: number; lng: number } {
  for (let lat = sur; lat < norte; lat += 0.0007) {
    for (let lng = oeste; lng < este; lng += 0.0007) {
      const r = prepararPlazaNueva(completo, crudo, { ...base, lat, lng }, HOY)
      if (r.ok) return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) }
    }
  }
  throw new Error('no hay un punto libre en Zibatá para crear una plaza')
}
const libre = puntoLibre()
const peticion = { ...base, ...libre }

const preparar = (cambios: Record<string, unknown> = {}, dataset = completo, c = crudo) =>
  prepararPlazaNueva(dataset, c, { ...peticion, ...cambios }, HOY)

const filaNueva = (r: ReturnType<typeof preparar>) => {
  if (!r.ok) throw new Error(`debía ser válida: ${r.problemas.join(' | ')}`)
  const filas = (r.plazas as { plazas: Record<string, unknown>[] }).plazas
  return filas[filas.length - 1] as Record<string, unknown> & {
    geometry: { coordinates: number[][][] }
    verification: { status: string; confidence: string; sources: string[]; lastVerifiedAt: string }
  }
}

describe('lo que se guarda', () => {
  it('es un registro válido para el esquema, inactivo y sin locales', () => {
    const r = preparar()
    const fila = filaNueva(r)
    expect(PlazasFileSchema.safeParse((r as { plazas: unknown }).plazas).success).toBe(true)
    // La base es una plaza próximamente: no se publica. Una activa se prueba aparte.
    expect(fila.active).toBe(false)
    expect(fila.placeIds).toEqual([])
    expect(fila.categories).toEqual([])
    expect(fila.id).toBe(slugDe(peticion.nombre))
    expect(fila.slug).toBe(fila.id)
    expect(fila.coordinates).toEqual(libre)
  })

  it('cambia solo una fila más y la fecha, y nada más del archivo', () => {
    const r = preparar()
    filaNueva(r)
    const antes = plazasJson as unknown as { plazas: Record<string, unknown>[]; updatedAt: string }
    const despues = (r as unknown as { plazas: typeof antes }).plazas
    expect(despues.updatedAt).toBe(HOY)
    const { plazas: _a, updatedAt: _b, ...restoAntes } = antes
    const { plazas: _c, updatedAt: _d, ...restoDespues } = despues
    expect(restoDespues).toEqual(restoAntes)
    expect(despues.plazas).toHaveLength(antes.plazas.length + 1)
    expect(despues.plazas.slice(0, -1)).toEqual(antes.plazas)
  })

  it('las claves van en el mismo orden que las de las demás plazas', () => {
    const completa = (plazasJson.plazas as Record<string, unknown>[]).find(
      (fila) => 'comingSoon' in fila && 'googleMapsUri' in fila,
    )
    if (!completa) throw new Error('el dataset no tiene una plaza con todas las claves')
    const orden = Object.keys(completa)
    const fila = filaNueva(
      preparar({ estado: 'proximamente', googleMapsUri: 'https://maps.app.goo.gl/ejemplo' }),
    )
    expect(Object.keys(fila)).toEqual(orden.filter((clave) => clave in fila))
  })

  it('el contorno provisional es un cuadrado de unos 3 600 m² que contiene al marcador', () => {
    const r = preparar()
    const fila = filaNueva(r)
    const anillo = fila.geometry.coordinates[0] ?? []
    expect(anillo).toHaveLength(5)
    expect(anillo[0]).toEqual(anillo[4])
    expect(areaM2(anillo)).toBeGreaterThan(3500)
    expect(areaM2(anillo)).toBeLessThan(3700)
    expect(isInsidePlazaGeometry(libre, fila.geometry as never)).toBe(true)
    if (r.ok) expect(r.resumen.areaProvisional).toBe(Math.round(areaM2(anillo)))
  })
})

describe('la procedencia: no se inventa', () => {
  it('no dice "por ajustar": solo lo que es verdad al crearla (el ajuste añade su propia cláusula)', () => {
    expect(filaNueva(preparar()).locationSource).not.toMatch(/por ajustar/)
  })

  it('guarda la evidencia que se escribió, y dice que la huella es provisional', () => {
    const fila = filaNueva(preparar({ evidencia: 'Plano del desarrollador consultado por mí' }))
    expect(fila.locationSource).toContain('Plano del desarrollador consultado por mí.')
    expect(fila.locationSource).toContain('Huella provisional')
    expect(fila.locationSource).toContain(HOY)
  })

  it('las fuentes son las URL aportadas y nada más: no hay "campo:" si no se declara', () => {
    const fila = filaNueva(preparar({ fuentes: ['https://uno.test/a', 'https://dos.test/b'] }))
    expect(fila.verification.sources).toEqual(['https://uno.test/a', 'https://dos.test/b'])
    expect(JSON.stringify(fila)).not.toContain('campo:')
  })

  it('"campo:" solo aparece si quien la crea declara que lo comprobó en el lugar', () => {
    const fila = filaNueva(preparar({ aportadoPorMi: true }))
    expect(fila.verification.sources).toEqual([...peticion.fuentes, `campo:${HOY}`])
  })

  it('la confianza es la que se eligió, en el registro y en la verificación', () => {
    for (const confianza of ['low', 'medium', 'high'] as const) {
      const fila = filaNueva(preparar({ confianza }))
      expect(fila.locationConfidence).toBe(confianza)
      expect(fila.verification.confidence).toBe(confianza)
    }
  })

  it('el estado es obligatorio: no hay un "no sé", ni uncertain, ni un valor por omisión', () => {
    const sinEstado = preparar({ estado: undefined })
    expect(sinEstado.ok).toBe(false)
    if (!sinEstado.ok) expect(sinEstado.problemas.join(' | ')).toMatch(/activa o es próximamente/)
    for (const malo of ['', 'nose', 'uncertain', 'inactiva', null, true]) {
      expect(preparar({ estado: malo }).ok, String(malo)).toBe(false)
    }
  })

  it('próximamente: confirmada y en construcción, no se publica y su estado es coming_soon', () => {
    const fila = filaNueva(preparar({ estado: 'proximamente' }))
    expect(fila.active).toBe(false)
    expect(fila.comingSoon).toBe(true)
    expect(fila.verification.status).toBe('coming_soon')
  })

  describe('activa', () => {
    /** Un nombre que no choca con ninguna plaza ni local (si no, una activa se rechaza por título repetido). */
    const nombre = 'Plaza Nueva de Prueba Unica'

    it('se publica: active, sin comingSoon, y likely_active si no se comprobó en el lugar', () => {
      const fila = filaNueva(preparar({ estado: 'activa', nombre }))
      expect(fila.active).toBe(true)
      expect('comingSoon' in fila).toBe(false)
      expect(fila.verification.status).toBe('likely_active')
    })

    it('es active solo si se declara que se comprobó en el lugar', () => {
      const fila = filaNueva(preparar({ estado: 'activa', nombre, aportadoPorMi: true }))
      expect(fila.verification.status).toBe('active')
      expect(fila.verification.sources).toContain(`campo:${HOY}`)
    })

    it('pasa lo mismo que activar una plaza que ya existe: no vale el nombre de una plaza ni de un local', () => {
      const plazaExistente = completo.plazas[0]
      const local = completo.places.find((place) => place.active)
      if (!plazaExistente || !local) throw new Error('hacen falta una plaza y un local')
      const conPlaza = preparar({ estado: 'activa', nombre: plazaExistente.name })
      expect(conPlaza.ok).toBe(false)
      if (!conPlaza.ok) expect(conPlaza.problemas.join(' | ')).toMatch(/Ya hay una plaza llamada/)
      const conLocal = preparar({ estado: 'activa', nombre: local.name })
      expect(conLocal.ok).toBe(false)
    })

    it('el nombre tiene que caber en el título de la página, pero no hace falta si es próximamente', () => {
      const largo = 'Plaza con un nombre larguísimo que no cabe en el título de una página web'
      expect(preparar({ estado: 'activa', nombre: largo }).ok).toBe(false)
      expect(preparar({ estado: 'proximamente', nombre: largo }).ok).toBe(true)
    })

    it('avisa de que se publica, con su página, y de que saldrá vacía', async () => {
      const r = preparar({ estado: 'activa', nombre })
      if (!r.ok) throw new Error('debía ser válida')
      const avisos = r.resumen.avisos.join(' ')
      expect(avisos).toMatch(/Se publica: tendrá página/)
      expect(avisos).toMatch(/saldrá vacía/)
      expect(avisos).toMatch(/cuadrado provisional/)
    })
  })

  it('no inventa descripción ni dirección: sin ellas, quedan nulas', () => {
    const fila = filaNueva(preparar())
    expect(fila.description).toBeNull()
    expect(fila.address).toBeNull()
    const con = filaNueva(
      preparar({ descripcionEs: 'Plaza de prueba.', direccion: 'Calle Falsa 1' }),
    )
    expect(con.description).toEqual({ es: 'Plaza de prueba.' })
    expect(con.address).toBe('Calle Falsa 1')
  })
})

describe('lo que se rechaza', () => {
  const rechaza = (cambios: Record<string, unknown>) => {
    const r = preparar(cambios)
    expect(r.ok).toBe(false)
    return r.ok ? '' : r.problemas.join(' | ')
  }

  it('sin fuentes no se añade', () => {
    expect(rechaza({ fuentes: [] })).toMatch(/al menos una fuente/)
    expect(rechaza({ fuentes: ['', '  '] })).toMatch(/al menos una fuente|fuente/)
  })

  it('una fuente tiene que ser una URL https, y "campo:" no se escribe a mano', () => {
    expect(rechaza({ fuentes: ['lo vi en el mapa'] })).toMatch(/no es una URL/)
    expect(rechaza({ fuentes: [`campo:${HOY}`] })).toMatch(/no se escribe a mano.*casilla/)
  })

  it('una plaza activa que solo tiene OpenStreetMap o reparto no se publica sin la casilla', () => {
    for (const fuente of ['https://www.openstreetmap.org/node/1', 'https://www.rappi.com.mx/x']) {
      expect(rechaza({ estado: 'activa', fuentes: [fuente], aportadoPorMi: false })).toMatch(
        /OpenStreetMap o de apps de reparto/,
      )
    }
    const fila = filaNueva(
      preparar({
        estado: 'activa',
        fuentes: ['https://www.openstreetmap.org/node/1'],
        aportadoPorMi: true,
      }),
    )
    expect(fila.verification.status).toBe('active')
  })

  it('una "próximamente" no se publica: cualquier fuente sirve, también OpenStreetMap', () => {
    const fila = filaNueva(
      preparar({ estado: 'proximamente', fuentes: ['https://www.openstreetmap.org/node/1'] }),
    )
    expect(fila.verification.status).toBe('coming_soon')
  })

  it('pide la frase de evidencia, y no vale una palabra suelta', () => {
    expect(rechaza({ evidencia: '' })).toMatch(/evidencia/)
    expect(rechaza({ evidencia: 'sí' })).toMatch(/evidencia/)
  })

  it('un marcador fuera de Zibatá no sirve', () => {
    expect(rechaza({ lng: libre.lng + 5 })).toMatch(/marcador|fuera/)
  })

  it('un marcador dentro de otra plaza no sirve (se solaparían)', () => {
    const otra = completo.plazas[0]
    if (!otra) throw new Error('hace falta una plaza')
    expect(rechaza({ lat: otra.coordinates.lat, lng: otra.coordinates.lng })).toMatch(
      /solapa|marcador/,
    )
  })

  it('un nombre sin letras ni números no da una dirección web', () => {
    expect(rechaza({ nombre: '!!!' })).toMatch(/letras o números/)
    expect(rechaza({ nombre: '日本語' })).toMatch(/letras o números/)
  })

  it('un enlace de Google Maps que no lo es, no', () => {
    expect(rechaza({ googleMapsUri: 'https://otro-sitio.test/x' })).toMatch(/Google Maps/)
  })

  it('campos de más, sin nombre o con una confianza inventada', () => {
    expect(rechaza({ id: 'quiero-este-id' })).toBeTruthy()
    expect(rechaza({ nombre: '   ' })).toMatch(/nombre/)
    expect(rechaza({ confianza: 'altisima' })).toBeTruthy()
    expect(prepararPlazaNueva(completo, crudo, null, HOY).ok).toBe(false)
  })
})

describe('la dirección web', () => {
  it('un nombre que ya existe recibe un número en vez de pisar la plaza de antes', () => {
    const existente = completo.plazas[0]
    if (!existente) throw new Error('hace falta una plaza')
    const fila = filaNueva(preparar({ nombre: existente.name }))
    expect(fila.id).toBe(`${slugDe(existente.name)}-2`)
    expect(fila.id).not.toBe(existente.id)
  })

  it('no hereda la dirección de una plaza que se borró y tiene su redirección', () => {
    const borrada = slugDe(peticion.nombre)
    const conRedireccion = {
      ...crudo,
      redirects: {
        redirects: [{ kind: 'plaza', id: borrada, slug: borrada, deletedAt: '2026-01-01' }],
      } as unknown as Record<string, unknown>,
    }
    const fila = filaNueva(preparar({}, completo, conRedireccion))
    expect(fila.id).toBe(`${borrada}-2`)
  })
})

describe('el endpoint en desarrollo', () => {
  const entorno = { PANEL_ABIERTO: 'si' }

  it('sin confirmar solo dice lo que se guardaría', async () => {
    const r = await crearPlaza(entorno, peticion)
    expect(r.ok && r.confirmado).toBe(false)
    if (r.ok) {
      expect(r.resumen.estado).toBe('proximamente')
      expect(r.resumen.investigacion).toBe('coming_soon')
      expect(r.resumen.avisos.join(' ')).toMatch(/Próximamente/)
    }
  })

  it('avisa de que el contorno provisional se dibuja en el mapa público', async () => {
    const r = await crearPlaza(entorno, peticion)
    if (!r.ok) throw new Error('debía ser válida')
    const avisos = r.resumen.avisos.join(' ')
    expect(avisos).toMatch(/cuadrado provisional de 60 m/)
    expect(avisos).toMatch(/se dibuja en el mapa público con esa forma/)
    expect(avisos).toMatch(/antes de fusionar la PR/)
  })

  it('al confirmar valida, pero en desarrollo no commitea', async () => {
    const r = await crearPlaza(entorno, { ...peticion, confirmar: true })
    expect(r.ok && r.confirmado && r.seco).toBe(true)
  })

  it('un cuerpo mal formado responde con el problema y no cae', async () => {
    expect((await crearPlaza(entorno, { nada: 1 })).ok).toBe(false)
    expect((await crearPlaza(entorno, null)).ok).toBe(false)
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
        if (metodo === 'POST' && ruta === '/pulls') {
          return json({ number: 9, html_url: 'https://github.test/pull/9' })
        }
        throw new Error(`llamada inesperada: ${metodo} ${ruta}`)
      }),
    )
    return { arboles, blobs }
  }

  afterEach(() => vi.unstubAllGlobals())

  it('manda solo plazas.json en un commit, con la plaza al final', async () => {
    const { arboles, blobs } = montar()
    const r = await crearPlaza(entorno, { ...peticion, confirmar: true })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.pr?.numero).toBe(9)
    expect(arboles).toHaveLength(1)
    expect(arboles[0]?.map((fila) => fila.path)).toEqual(['data/commercial/plazas.json'])
    const escrito = JSON.parse(blobs[0] ?? '{}') as { plazas: { id: string; active: boolean }[] }
    expect(escrito.plazas.at(-1)?.id).toBe(slugDe(peticion.nombre))
    expect(escrito.plazas.at(-1)?.active).toBe(false)
  })

  it('sin confirmar, o con algo inválido, no escribe nada', async () => {
    const { arboles } = montar()
    const sin = await crearPlaza(entorno, peticion)
    expect(sin.ok && sin.confirmado).toBe(false)
    const mala = await crearPlaza(entorno, { ...peticion, fuentes: [], confirmar: true })
    expect(mala.ok).toBe(false)
    expect(arboles).toHaveLength(0)
    const llamadas = vi.mocked(fetch).mock.calls.map(([, init]) => init?.method ?? 'GET')
    expect(llamadas.every((metodo) => metodo === 'GET')).toBe(true)
  })
})
