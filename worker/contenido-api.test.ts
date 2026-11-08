import { describe, expect, it } from 'vitest'
import { atenderApi, type EntornoApi } from './api.ts'
import type { Base } from './cuenta.ts'

/*
 * En desarrollo `PANEL_ABIERTO` salta Access y no hay testigo de GitHub, así que el contenido se
 * valida contra los datos del bundle y no se commitea. Es justo el camino que se puede probar sin
 * red ni credenciales.
 */
const entorno = { PANEL_ABIERTO: 'si', ANALITICA: {} as Base } as EntornoApi

const pedir = (ruta: string, init?: RequestInit) =>
  atenderApi(new Request(`http://localhost:8787${ruta}`, init), entorno)

const negocio = {
  nombre: 'Panadería de prueba',
  plazaId: 'paseo-zibata',
  giros: ['cafeteria'],
  descripcionEs: 'Una panadería de prueba.',
  descripcionEn: 'A test bakery.',
  activo: true,
}

describe('la API de contenido', () => {
  it('devuelve el catálogo para el formulario', async () => {
    const respuesta = await pedir('/api/panel/contenido')
    expect(respuesta?.status).toBe(200)
    const datos = (await respuesta?.json()) as { seco: boolean; places: unknown[] }
    expect(datos.seco).toBe(true)
    expect(datos.places.length).toBeGreaterThan(0)
  })

  it('acepta un negocio válido y lo deja en seco en desarrollo', async () => {
    const respuesta = await pedir('/api/panel/contenido/negocio', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' },
      body: JSON.stringify(negocio),
    })
    expect(respuesta?.status).toBe(200)
    const datos = (await respuesta?.json()) as {
      ok: boolean
      seco: boolean
      negocio: { id: string }
    }
    expect(datos.ok).toBe(true)
    expect(datos.seco).toBe(true)
    expect(datos.negocio.id).toBe('panaderia-de-prueba')
  })

  it('rechaza un negocio inválido sin tocar GitHub', async () => {
    const respuesta = await pedir('/api/panel/contenido/negocio', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' },
      body: JSON.stringify({ ...negocio, giros: [] }),
    })
    expect(respuesta?.status).toBe(400)
  })

  it('la escritura exige que la petición salga del propio sitio', async () => {
    const respuesta = await pedir('/api/panel/contenido/negocio', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': 'cross-site' },
      body: JSON.stringify(negocio),
    })
    expect(respuesta?.status).toBe(403)
  })

  it('sin la puerta de Access no se lee el contenido', async () => {
    const respuesta = await atenderApi(new Request('https://visitzibata.com/api/panel/contenido'), {
      ANALITICA: {} as Base,
    })
    expect(respuesta?.status).toBe(403)
  })
})

describe('la API de categorías', () => {
  const categorias = async () => {
    const respuesta = await pedir('/api/panel/contenido')
    const datos = (await respuesta?.json()) as { categories: Record<string, unknown>[] }
    return datos.categories
  }

  it('acepta una taxonomía válida y contesta con su impacto', async () => {
    const lista = await categorias()
    const respuesta = await pedir('/api/panel/contenido/categorias', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' },
      body: JSON.stringify({ categories: lista }),
    })
    expect(respuesta?.status).toBe(200)
    const datos = (await respuesta?.json()) as {
      ok: boolean
      seco: boolean
      afectados: { locales: number; plazas: number }
    }
    expect(datos.ok).toBe(true)
    expect(datos.seco).toBe(true)
    expect(datos.afectados).toEqual({ locales: 0, plazas: 0 })
  })

  it('rechaza una categoría sin tono', async () => {
    const lista = await categorias()
    const primera = lista.find((categoria) => categoria.id !== 'otros')
    if (!primera) throw new Error('sin categoría')
    primera.hue = null
    const respuesta = await pedir('/api/panel/contenido/categorias', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' },
      body: JSON.stringify({ categories: lista }),
    })
    expect(respuesta?.status).toBe(400)
  })

  it('la escritura exige que la petición salga del propio sitio', async () => {
    const respuesta = await pedir('/api/panel/contenido/categorias', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': 'cross-site' },
      body: JSON.stringify({ categories: [] }),
    })
    expect(respuesta?.status).toBe(403)
  })
})

describe('la API de fotos', () => {
  const CABECERA = Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]).toString('base64')
  const foto = {
    id: 'tomassa',
    archivo: 'Terraza Principal.webp',
    alt: 'Terraza',
    ancho: 1200,
    alto: 800,
    placeholder: '#aabbcc',
    datos: CABECERA,
  }
  const subir = (cuerpo: Record<string, unknown>, sitio = 'same-origin') =>
    pedir('/api/panel/contenido/foto', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': sitio },
      body: JSON.stringify(cuerpo),
    })

  it('valida una foto y la deja en seco en desarrollo', async () => {
    const respuesta = await subir(foto)
    expect(respuesta?.status).toBe(200)
    const datos = (await respuesta?.json()) as { ok: boolean; seco: boolean; foto: unknown }
    expect(datos.ok).toBe(true)
    expect(datos.seco).toBe(true)
    expect(datos.foto).toBeNull()
  })

  it('rechaza lo que no es una imagen', async () => {
    const respuesta = await subir({
      ...foto,
      datos: Buffer.from('no soy una imagen').toString('base64'),
    })
    expect(respuesta?.status).toBe(400)
  })

  it('rechaza una foto que llega de otra página', async () => {
    const respuesta = await subir(foto, 'cross-site')
    expect(respuesta?.status).toBe(403)
  })
})

describe('borrar un negocio', () => {
  const borrar = (cuerpo: unknown, sitio = 'same-origin', extra: Record<string, string> = {}) =>
    pedir('/api/panel/contenido/negocio/borrar', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': sitio, ...extra },
      body: JSON.stringify(cuerpo),
    })

  /** Un id cualquiera de la guía: la prueba no nombra ningún local. */
  const unId = async (): Promise<string> => {
    const datos = (await (await pedir('/api/panel/contenido'))?.json()) as {
      places: { id: string }[]
    }
    return datos.places[0]?.id ?? ''
  }

  it('sin confirmar responde con el impacto y no guarda', async () => {
    const respuesta = await borrar({ id: await unId() })
    expect(respuesta?.status).toBe(200)
    const datos = (await respuesta?.json()) as {
      ok: boolean
      confirmado: boolean
      impacto: { redirecciones: unknown[] }
    }
    expect(datos.ok).toBe(true)
    expect(datos.confirmado).toBe(false)
    expect(datos.impacto.redirecciones).toHaveLength(2)
  })

  it('un id que no existe es un 400 con el problema', async () => {
    const respuesta = await borrar({ id: 'no-existe-este-local' })
    expect(respuesta?.status).toBe(400)
  })

  it('exige que la petición salga del propio sitio, antes de leer el cuerpo', async () => {
    const respuesta = await borrar({ id: await unId(), confirmar: true }, 'cross-site')
    expect(respuesta?.status).toBe(403)
  })

  it('un cuerpo por encima del tope no se lee', async () => {
    const respuesta = await borrar({ id: 'x'.repeat(6000) })
    expect(respuesta?.status).toBe(413)
  })

  it('un JSON roto es un 400 y no una caída', async () => {
    const respuesta = await pedir('/api/panel/contenido/negocio/borrar', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' },
      body: '{no es json',
    })
    expect(respuesta?.status).toBe(400)
  })
})

describe('borrar una plaza', () => {
  const borrar = (cuerpo: unknown, sitio = 'same-origin') =>
    pedir('/api/panel/contenido/plaza/borrar', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': sitio },
      body: JSON.stringify(cuerpo),
    })

  /** Una plaza con locales: la prueba no nombra ninguna. */
  const conLocales = async (): Promise<string> => {
    const datos = (await (await pedir('/api/panel/contenido'))?.json()) as {
      places: { plazaId: string }[]
    }
    return datos.places[0]?.plazaId ?? ''
  }

  it('una plaza con locales es un 400 que dice por qué, aunque se confirme', async () => {
    const respuesta = await borrar({ id: await conLocales(), confirmar: true })
    expect(respuesta?.status).toBe(400)
    const datos = (await respuesta?.json()) as { problemas: string[] }
    expect(datos.problemas.join(' ')).toMatch(/solo se borra vacía/)
  })

  it('exige que la petición salga del propio sitio, antes de leer el cuerpo', async () => {
    const respuesta = await borrar({ id: await conLocales(), confirmar: true }, 'cross-site')
    expect(respuesta?.status).toBe(403)
  })

  it('un cuerpo por encima del tope no se lee', async () => {
    const respuesta = await borrar({ id: 'x'.repeat(6000) })
    expect(respuesta?.status).toBe(413)
  })

  it('un JSON roto es un 400 y no una caída', async () => {
    const respuesta = await pedir('/api/panel/contenido/plaza/borrar', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' },
      body: '{no es json',
    })
    expect(respuesta?.status).toBe(400)
  })
})

describe('el contorno de una plaza', () => {
  const guardar = (cuerpo: unknown, sitio = 'same-origin') =>
    pedir('/api/panel/contenido/plaza/contorno', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': sitio },
      body: JSON.stringify(cuerpo),
    })

  /** Una plaza cualquiera del dataset: la prueba no nombra ninguna. */
  const unaPlaza = async () => {
    const datos = (await (await pedir('/api/panel/contenido'))?.json()) as {
      plazas: { id: string; geometry: unknown }[]
    }
    return datos.plazas[0] ?? { id: '', geometry: null }
  }

  it('un contorno que no cumple las reglas es un 400 que dice cuáles, aunque se confirme', async () => {
    const plaza = await unaPlaza()
    const respuesta = await guardar({
      id: plaza.id,
      geometria: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 0],
          ],
        ],
      },
      confirmar: true,
    })
    expect(respuesta?.status).toBe(400)
    const datos = (await respuesta?.json()) as { problemas: string[] }
    expect(datos.problemas.length).toBeGreaterThan(0)
  })

  it('exige que la petición salga del propio sitio, antes de leer el cuerpo', async () => {
    const plaza = await unaPlaza()
    const respuesta = await guardar(
      { id: plaza.id, geometria: plaza.geometry, confirmar: true },
      'cross-site',
    )
    expect(respuesta?.status).toBe(403)
  })

  it('un cuerpo por encima del tope no se lee', async () => {
    const respuesta = await guardar({ id: 'x'.repeat(20_000), geometria: null })
    expect(respuesta?.status).toBe(413)
  })

  it('un JSON roto es un 400 y no una caída', async () => {
    const respuesta = await pedir('/api/panel/contenido/plaza/contorno', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' },
      body: '{no es json',
    })
    expect(respuesta?.status).toBe(400)
  })
})

describe('borrar una categoría', () => {
  const borrar = (cuerpo: unknown, sitio = 'same-origin') =>
    pedir('/api/panel/contenido/categoria/borrar', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': sitio },
      body: JSON.stringify(cuerpo),
    })

  /** Una categoría que usan locales: la prueba no nombra ninguna. */
  const conLocales = async (): Promise<string> => {
    const datos = (await (await pedir('/api/panel/contenido'))?.json()) as {
      categories: { id: string; giros: { id: string }[] }[]
      places: { giros: string[] }[]
    }
    const usados = new Set(datos.places.flatMap((place) => place.giros))
    return datos.categories.find((c) => c.giros.some((g) => usados.has(g.id)))?.id ?? ''
  }

  it('una categoría con locales es un 400 que dice por qué, aunque se confirme', async () => {
    const respuesta = await borrar({ id: await conLocales(), confirmar: true })
    expect(respuesta?.status).toBe(400)
    const datos = (await respuesta?.json()) as { problemas: string[] }
    expect(datos.problemas.join(' ')).toMatch(/solo se borra sin locales/)
  })

  it('exige que la petición salga del propio sitio, antes de leer el cuerpo', async () => {
    const respuesta = await borrar({ id: await conLocales(), confirmar: true }, 'cross-site')
    expect(respuesta?.status).toBe(403)
  })

  it('un cuerpo por encima del tope no se lee', async () => {
    const respuesta = await borrar({ id: 'x'.repeat(6000) })
    expect(respuesta?.status).toBe(413)
  })

  it('un JSON roto es un 400 y no una caída', async () => {
    const respuesta = await pedir('/api/panel/contenido/categoria/borrar', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' },
      body: '{no es json',
    })
    expect(respuesta?.status).toBe(400)
  })
})

describe.each([
  ['negocio', 'places'],
  ['plaza', 'plazas'],
] as const)('cambiar la dirección de un %s', (tipo, clave) => {
  const ruta = `/api/panel/contenido/${tipo}/slug`
  const cambiar = (cuerpo: unknown, sitio = 'same-origin') =>
    pedir(ruta, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': sitio },
      body: JSON.stringify(cuerpo),
    })

  /** El primero de la guía: la prueba no nombra ninguno. */
  const primero = async (): Promise<{ id: string; slug: string }> => {
    const datos = (await (await pedir('/api/panel/contenido'))?.json()) as Record<
      string,
      { id: string; slug: string }[]
    >
    const fila = datos[clave]?.[0]
    if (!fila) throw new Error('sin datos')
    return fila
  }

  it('sin confirmar responde con el impacto y no guarda', async () => {
    const { id } = await primero()
    const respuesta = await cambiar({ id, slug: 'direccion-nueva-de-prueba' })
    expect(respuesta?.status).toBe(200)
    const datos = (await respuesta?.json()) as {
      ok: boolean
      confirmado: boolean
      impacto: { despues: string }
    }
    expect(datos.ok).toBe(true)
    expect(datos.confirmado).toBe(false)
    expect(datos.impacto.despues).toBe('direccion-nueva-de-prueba')
  })

  it('la misma dirección es un 400 que dice que no hay nada que cambiar', async () => {
    const { id, slug } = await primero()
    const respuesta = await cambiar({ id, slug, confirmar: true })
    expect(respuesta?.status).toBe(400)
    const datos = (await respuesta?.json()) as { problemas: string[] }
    expect(datos.problemas.join(' ')).toMatch(/nada que cambiar/)
  })

  it('exige que la petición salga del propio sitio, antes de leer el cuerpo', async () => {
    const { id } = await primero()
    const respuesta = await cambiar({ id, slug: 'direccion-nueva', confirmar: true }, 'cross-site')
    expect(respuesta?.status).toBe(403)
  })

  it('un cuerpo por encima del tope no se lee', async () => {
    const respuesta = await cambiar({ id: 'x'.repeat(6000), slug: 'a' })
    expect(respuesta?.status).toBe(413)
  })

  it('un JSON roto es un 400 y no una caída', async () => {
    const respuesta = await pedir(ruta, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' },
      body: '{no es json',
    })
    expect(respuesta?.status).toBe(400)
  })
})

describe('cambiar el slug de una categoría', () => {
  const ruta = '/api/panel/contenido/categoria/slug'
  const cambiar = (cuerpo: unknown, sitio = 'same-origin') =>
    pedir(ruta, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': sitio },
      body: JSON.stringify(cuerpo),
    })
  const primera = async (): Promise<{ id: string; slug: { es: string; en: string } }> => {
    const datos = (await (await pedir('/api/panel/contenido'))?.json()) as {
      categories: { id: string; slug: { es: string; en: string } }[]
    }
    const fila = datos.categories[0]
    if (!fila) throw new Error('sin categorías')
    return fila
  }

  it('sin confirmar responde con el impacto del idioma pedido', async () => {
    const { id } = await primera()
    const respuesta = await cambiar({ id, slug: 'direccion-nueva-de-prueba', lang: 'en' })
    expect(respuesta?.status).toBe(200)
    const datos = (await respuesta?.json()) as {
      impacto: { lang: string; redirecciones: { hacia: string }[] }
    }
    expect(datos.impacto.lang).toBe('en')
    expect(datos.impacto.redirecciones[0]?.hacia).toBe('/en/category/direccion-nueva-de-prueba')
  })

  it('sin idioma es un 400 que lo dice', async () => {
    const { id } = await primera()
    const respuesta = await cambiar({ id, slug: 'direccion-nueva-de-prueba' })
    expect(respuesta?.status).toBe(400)
    const datos = (await respuesta?.json()) as { problemas: string[] }
    expect(datos.problemas.join(' ')).toMatch(/idioma/)
  })

  it('exige el propio sitio y respeta el tope de cuerpo', async () => {
    const { id } = await primera()
    expect((await cambiar({ id, slug: 'x-nuevo', lang: 'es' }, 'cross-site'))?.status).toBe(403)
    expect((await cambiar({ id: 'x'.repeat(6000), slug: 'a', lang: 'es' }))?.status).toBe(413)
  })
})

describe('borrar un giro', () => {
  const borrar = (cuerpo: unknown, sitio = 'same-origin') =>
    pedir('/api/panel/contenido/giro/borrar', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': sitio },
      body: JSON.stringify(cuerpo),
    })
  const idDelGeneral = async (): Promise<string> => {
    const datos = (await (await pedir('/api/panel/contenido'))?.json()) as {
      categories: { giros: { id: string; general?: boolean }[] }[]
    }
    return datos.categories.flatMap((c) => c.giros).find((g) => g.general)?.id ?? ''
  }

  it('el giro general es un 400 que dice por qué, aunque se confirme', async () => {
    const respuesta = await borrar({ id: await idDelGeneral(), confirmar: true })
    expect(respuesta?.status).toBe(400)
    const datos = (await respuesta?.json()) as { problemas: string[] }
    expect(datos.problemas.join(' ')).toMatch(/giro general/)
  })

  it('exige que la petición salga del propio sitio, antes de leer el cuerpo', async () => {
    expect(
      (await borrar({ id: await idDelGeneral(), confirmar: true }, 'cross-site'))?.status,
    ).toBe(403)
  })

  it('un cuerpo por encima del tope no se lee, y un JSON roto es un 400', async () => {
    expect((await borrar({ id: 'x'.repeat(6000) }))?.status).toBe(413)
    const roto = await pedir('/api/panel/contenido/giro/borrar', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' },
      body: '{no es json',
    })
    expect(roto?.status).toBe(400)
  })
})

describe('editar una plaza', () => {
  const editar = (cuerpo: unknown, sitio = 'same-origin') =>
    pedir('/api/panel/contenido/plaza', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': sitio },
      body: JSON.stringify(cuerpo),
    })

  /** Los datos de la primera plaza de la guía, tal como los manda el formulario. */
  const formulario = async () => {
    const datos = (await (await pedir('/api/panel/contenido'))?.json()) as {
      plazas: {
        id: string
        name: string
        description: { es: string; en: string } | null
        address: string | null
        coordinates: { lat: number; lng: number }
        googleMapsUri?: string
        active: boolean
        comingSoon?: boolean
      }[]
    }
    const plaza = datos.plazas[0]
    if (!plaza) throw new Error('sin plazas')
    return {
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
    }
  }

  it('el catálogo trae lo que el formulario necesita', async () => {
    const datos = (await (await pedir('/api/panel/contenido'))?.json()) as {
      plazas: { slug?: string; coordinates?: unknown }[]
    }
    expect(datos.plazas[0]?.slug).toBeTruthy()
    expect(datos.plazas[0]?.coordinates).toBeTruthy()
  })

  it('un cambio sin consecuencias queda en seco en desarrollo', async () => {
    const respuesta = await editar({ ...(await formulario()), direccion: 'Calle de prueba 1' })
    expect(respuesta?.status).toBe(200)
    const datos = (await respuesta?.json()) as { ok: boolean; confirmado: boolean; seco: boolean }
    expect(datos).toMatchObject({ ok: true, confirmado: true, seco: true })
  })

  it('desactivarla pide confirmación', async () => {
    const respuesta = await editar({ ...(await formulario()), activa: false })
    const datos = (await respuesta?.json()) as {
      confirmado: boolean
      requiereConfirmacion: boolean
    }
    expect(datos).toMatchObject({ confirmado: false, requiereConfirmacion: true })
  })

  it('exige que la petición salga del propio sitio, antes de leer el cuerpo', async () => {
    const respuesta = await editar(await formulario(), 'cross-site')
    expect(respuesta?.status).toBe(403)
  })

  it('un cuerpo por encima del tope no se lee', async () => {
    const respuesta = await editar({ ...(await formulario()), direccion: 'x'.repeat(20_000) })
    expect(respuesta?.status).toBe(413)
  })

  it('un campo que no se edita se rechaza', async () => {
    const respuesta = await editar({ ...(await formulario()), slug: 'otro' })
    expect(respuesta?.status).toBe(400)
  })
})
