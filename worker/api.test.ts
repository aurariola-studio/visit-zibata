import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { atenderApi, type EntornoApi } from './api.ts'
import type { Base, Sentencia } from './cuenta.ts'
import { ALTA, CABECERA, RESOLVER } from './cuenta.ts'
import { ATENDER, GUARDAR, SIN_ATENDER, ULTIMAS } from './sugerencias.ts'

/*
 * Los manejadores de la API de punta a punta, con una base de mentira que apunta lo que se le pide.
 * La prueba de trabajo se sustituye por un interruptor: minarla de verdad son 65.000 hashes por
 * prueba y lo que se comprueba aquí es qué hace el Worker con ella, no cuánto cuesta encontrarla.
 */
const prueba = vi.hoisted(() => ({ valida: true }))
vi.mock('../src/lib/prueba-de-trabajo.ts', async (original) => ({
  ...(await original<typeof import('../src/lib/prueba-de-trabajo.ts')>()),
  cumpleLaPrueba: () => prueba.valida,
}))

interface Apunte {
  sql: string
  valores: unknown[]
}

interface Guion {
  /** Qué devuelve `first()` para una consulta. */
  primero?: (sql: string, valores: unknown[]) => unknown
  /** Qué devuelve `all()` para una consulta. */
  todos?: (sql: string, valores: unknown[]) => unknown[]
  /** Hace fallar `run()` y `batch()`, como lo haría una clave repetida. */
  falla?: boolean
}

function baseFalsa(guion: Guion = {}) {
  const lecturas: Apunte[] = []
  const escrituras: Apunte[] = []
  const base: Base = {
    prepare(sql: string): Sentencia {
      const sentencia = {
        sql,
        valores: [] as unknown[],
        bind(...valores: unknown[]) {
          this.valores = valores
          return this
        },
        async run() {
          if (guion.falla) throw new Error('UNIQUE constraint failed')
          escrituras.push({ sql, valores: this.valores })
          return {}
        },
        async first<T>() {
          lecturas.push({ sql, valores: this.valores })
          return (guion.primero?.(sql, this.valores) ?? null) as T | null
        },
        async all<T>() {
          lecturas.push({ sql, valores: this.valores })
          return { results: (guion.todos?.(sql, this.valores) ?? []) as T[] }
        },
      }
      return sentencia
    },
    async batch(sentencias: Sentencia[]) {
      if (guion.falla) throw new Error('UNIQUE constraint failed')
      for (const s of sentencias as unknown as { sql: string; valores: unknown[] }[]) {
        escrituras.push({ sql: s.sql, valores: s.valores })
      }
      return []
    },
  }
  return { base, lecturas, escrituras }
}

const SECRETO = 'a'.repeat(43)
const LOCAL = 'http://localhost:8787'
const SITIO = 'https://visitzibata.com'
const PROPIO = { 'sec-fetch-site': 'same-origin' }

const enviar = (url: string, cuerpo?: unknown, cabeceras: HeadersInit = {}) =>
  new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...cabeceras },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  })

beforeEach(() => {
  prueba.valida = true
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('POST /api/cuenta', () => {
  it('sin secreto no hay alta', async () => {
    const { base } = baseFalsa()
    const respuesta = await atenderApi(enviar(`${SITIO}/api/cuenta`), { ANALITICA: base })
    expect(respuesta?.status).toBe(400)
  })

  it('con una prueba que no cumple, 403 y nada escrito', async () => {
    prueba.valida = false
    const { base, escrituras } = baseFalsa()
    const peticion = enviar(`${SITIO}/api/cuenta`, undefined, { [CABECERA]: SECRETO })
    expect((await atenderApi(peticion, { ANALITICA: base }))?.status).toBe(403)
    expect(escrituras).toHaveLength(0)
  })

  it('con una prueba válida crea la cuenta y su credencial, guardando solo la huella', async () => {
    const { base, escrituras } = baseFalsa()
    const peticion = enviar(`${SITIO}/api/cuenta`, undefined, { [CABECERA]: SECRETO })
    expect((await atenderApi(peticion, { ANALITICA: base }))?.status).toBe(201)
    expect(escrituras.map((e) => e.sql)).toEqual([ALTA[0], ALTA[1]])
    // El secreto en claro no se guarda en ninguna columna.
    expect(JSON.stringify(escrituras)).not.toContain(SECRETO)
  })

  it('un secreto ya usado responde 409 sin decir por qué', async () => {
    const { base } = baseFalsa({ falla: true })
    const peticion = enviar(`${SITIO}/api/cuenta`, undefined, { [CABECERA]: SECRETO })
    const respuesta = await atenderApi(peticion, { ANALITICA: base })
    expect(respuesta?.status).toBe(409)
    expect(await respuesta?.text()).not.toContain('UNIQUE')
  })
})

describe('POST /api/sugerencia', () => {
  const buena = { mensaje: 'El horario está mal', lugar: 'Tomassa', sello: 'b'.repeat(43) }

  it('guarda una sugerencia con prueba válida, sin cuenta', async () => {
    const { base, escrituras } = baseFalsa()
    const respuesta = await atenderApi(enviar(`${SITIO}/api/sugerencia`, buena), {
      ANALITICA: base,
    })
    expect(respuesta?.status).toBe(201)
    expect(escrituras).toHaveLength(1)
    expect(escrituras[0]?.sql).toBe(GUARDAR)
    // Lo que se guarda es la huella del sello, nunca el sello.
    expect(JSON.stringify(escrituras)).not.toContain(buena.sello)
  })

  it('con una prueba que no cumple, 403', async () => {
    prueba.valida = false
    const { base, escrituras } = baseFalsa()
    const respuesta = await atenderApi(enviar(`${SITIO}/api/sugerencia`, buena), {
      ANALITICA: base,
    })
    expect(respuesta?.status).toBe(403)
    expect(escrituras).toHaveLength(0)
  })

  it('un cuerpo que no es una sugerencia es un 400', async () => {
    const { base } = baseFalsa()
    const respuesta = await atenderApi(enviar(`${SITIO}/api/sugerencia`, { mensaje: '' }), {
      ANALITICA: base,
    })
    expect(respuesta?.status).toBe(400)
  })

  it('un sello repetido responde 409', async () => {
    const { base } = baseFalsa({ falla: true })
    const respuesta = await atenderApi(enviar(`${SITIO}/api/sugerencia`, buena), {
      ANALITICA: base,
    })
    expect(respuesta?.status).toBe(409)
  })
})

describe('el panel y atender una sugerencia', () => {
  const id = 'A'.repeat(22)
  const filas = [
    {
      id: 'x',
      creada: '2026-11-01',
      quien: 'vecino',
      lugar: '',
      mensaje: 'hola',
      contacto: '',
      atendida: 0,
    },
  ]
  const guion: Guion = {
    todos: (sql) => (sql === ULTIMAS ? filas : []),
    primero: (sql) => (sql === SIN_ATENDER ? { total: 1 } : null),
  }

  it('sin Access y sin el flag, el panel está cerrado', async () => {
    const { base } = baseFalsa(guion)
    const respuesta = await atenderApi(new Request(`${SITIO}/api/panel`), { ANALITICA: base })
    expect(respuesta?.status).toBe(403)
  })

  it('con el flag de desarrollo en localhost, el panel lista las sugerencias', async () => {
    const { base } = baseFalsa(guion)
    const respuesta = await atenderApi(new Request(`${LOCAL}/api/panel`), {
      ANALITICA: base,
      PANEL_ABIERTO: 'si',
    })
    expect(respuesta?.status).toBe(200)
    const datos = (await respuesta?.json()) as { sugerencias: unknown[]; sinAtender: number }
    expect(datos.sugerencias).toHaveLength(1)
    expect(datos.sinAtender).toBe(1)
  })

  it('el flag no abre el panel desde un nombre que no es de esta máquina', async () => {
    const { base } = baseFalsa(guion)
    const respuesta = await atenderApi(new Request('http://rebind.example:8787/api/panel'), {
      ANALITICA: base,
      PANEL_ABIERTO: 'si',
    })
    expect(respuesta?.status).toBe(403)
  })

  it('atender exige Access, mismo origen y un identificador con la forma que se guarda', async () => {
    const { base, escrituras } = baseFalsa(guion)
    const entorno: EntornoApi = { ANALITICA: base, PANEL_ABIERTO: 'si' }
    const ruta = `${LOCAL}/api/panel/sugerencias`

    // Otra página.
    const ajeno = enviar(`${ruta}/${id}`, undefined, { 'sec-fetch-site': 'cross-site' })
    expect((await atenderApi(ajeno, entorno))?.status).toBe(403)
    // Sin nada que diga de dónde viene.
    expect((await atenderApi(enviar(`${ruta}/${id}`), entorno))?.status).toBe(403)
    // Identificador con otra forma.
    const raro = enviar(`${ruta}/corto`, undefined, PROPIO)
    expect((await atenderApi(raro, entorno))?.status).toBe(400)
    expect(escrituras).toHaveLength(0)

    const bueno = enviar(`${ruta}/${id}`, undefined, PROPIO)
    const respuesta = await atenderApi(bueno, entorno)
    expect(respuesta?.status).toBe(200)
    expect(escrituras).toEqual([{ sql: ATENDER, valores: [id] }])
  })

  it('atender sin Access, desde un host que no es local, es un 403', async () => {
    const { base, escrituras } = baseFalsa(guion)
    const peticion = enviar(`${SITIO}/api/panel/sugerencias/${id}`, undefined, PROPIO)
    const respuesta = await atenderApi(peticion, { ANALITICA: base, PANEL_ABIERTO: 'si' })
    expect(respuesta?.status).toBe(403)
    expect(escrituras).toHaveLength(0)
  })
})

describe('el flag de desarrollo junto a un token de GitHub', () => {
  const negocio = {
    nombre: 'Panadería de prueba',
    plazaId: 'paseo-zibata',
    giros: ['cafeteria'],
    descripcionEs: 'Una panadería de prueba.',
    descripcionEn: 'A test bakery.',
    activo: true,
  }
  const entorno = (base: Base): EntornoApi => ({
    ANALITICA: base,
    PANEL_ABIERTO: 'si',
    GITHUB_TOKEN: 'testigo-falso',
    GITHUB_REPO: 'o/r',
  })

  it('desde un nombre que no es local no llega a GitHub: se corta antes', async () => {
    const llamadas = vi.fn()
    vi.stubGlobal('fetch', llamadas)
    const { base } = baseFalsa()
    const peticion = enviar(
      'http://rebind.example:8787/api/panel/contenido/negocio',
      negocio,
      PROPIO,
    )
    expect((await atenderApi(peticion, entorno(base)))?.status).toBe(403)
    expect(llamadas).not.toHaveBeenCalled()
  })

  it('en localhost sí sigue el camino real, que es el que usa quien prueba commits', async () => {
    const llamadas = vi.fn(async () => new Response('{"message":"x"}', { status: 500 }))
    vi.stubGlobal('fetch', llamadas)
    const { base } = baseFalsa()
    const peticion = enviar(`${LOCAL}/api/panel/contenido/negocio`, negocio, PROPIO)
    const respuesta = await atenderApi(peticion, entorno(base))
    expect(llamadas).toHaveBeenCalled()
    // GitHub de mentira contesta 500: el Worker lo cuenta como fallo de contenido, no como éxito.
    expect(respuesta?.status).toBe(500)
  })
})

describe('GET /api/senales', () => {
  const guion = (llamadas: { n: number }): Guion => ({
    todos: (sql) => {
      llamadas.n++
      return sql.includes('favorito')
        ? [
            { lugar: 'tomassa', cuantos: 3 },
            { lugar: 'lugar-inventado', cuantos: 1 },
            { lugar: 'constructor', cuantos: 1 },
          ]
        : []
    },
  })

  it('ignora los lugares que no están en el catálogo', async () => {
    const { base } = baseFalsa(guion({ n: 0 }))
    const respuesta = await atenderApi(new Request(`${SITIO}/api/senales`), { ANALITICA: base })
    const senales = (await respuesta?.json()) as Record<string, unknown>
    expect(Object.keys(senales)).toEqual(['tomassa'])
  })

  it('repite la respuesta sin volver a la base mientras dura la guardada', async () => {
    const llamadas = { n: 0 }
    const { base } = baseFalsa(guion(llamadas))
    const entorno: EntornoApi = { ANALITICA: base }
    await atenderApi(new Request(`${SITIO}/api/senales`), entorno)
    expect(llamadas.n).toBe(2)
    const segunda = await atenderApi(new Request(`${SITIO}/api/senales`), entorno)
    expect(llamadas.n).toBe(2)
    expect(segunda?.headers.get('cache-control')).toBe('public, max-age=300')
    expect(Object.keys((await segunda?.json()) as object)).toEqual(['tomassa'])
  })

  it('otra base no comparte la respuesta guardada', async () => {
    const llamadas = { n: 0 }
    await atenderApi(new Request(`${SITIO}/api/senales`), {
      ANALITICA: baseFalsa(guion(llamadas)).base,
    })
    await atenderApi(new Request(`${SITIO}/api/senales`), {
      ANALITICA: baseFalsa(guion(llamadas)).base,
    })
    expect(llamadas.n).toBe(4)
  })
})

describe('las lecturas de una cuenta con un slug raro', () => {
  const cuenta = { primero: (sql: string) => (sql === RESOLVER ? { cuenta_id: 'c1' } : null) }

  it('GET /api/visitas no se rompe con un lugar llamado `constructor`', async () => {
    const { base } = baseFalsa({
      ...cuenta,
      todos: () => [
        { lugar_id: 'constructor', fecha: '2026-10-02' },
        { lugar_id: 'constructor', fecha: '2026-10-01' },
        { lugar_id: '__proto__', fecha: '2026-10-03' },
      ],
    })
    const peticion = new Request(`${SITIO}/api/visitas`, { headers: { [CABECERA]: SECRETO } })
    const respuesta = await atenderApi(peticion, { ANALITICA: base })
    expect(respuesta?.status).toBe(200)
    const { fechas } = (await (respuesta as Response).json()) as {
      fechas: Record<string, string[]>
    }
    expect(Object.keys(fechas).sort()).toEqual(['__proto__', 'constructor'])
    expect(fechas.constructor).toEqual(['2026-10-01', '2026-10-02'])
    // Y no se contaminó nada global.
    expect(({} as Record<string, unknown>).fecha).toBeUndefined()
  })

  it('POST /api/visitas guarda solo lugares del catálogo y fechas reales', async () => {
    const { base, escrituras } = baseFalsa(cuenta)
    const peticion = enviar(
      `${SITIO}/api/visitas`,
      { fechas: { tomassa: ['2026-10-01', '9999-99-99'], 'lugar-inventado': ['2026-10-01'] } },
      { [CABECERA]: SECRETO },
    )
    expect((await atenderApi(peticion, { ANALITICA: base }))?.status).toBe(200)
    const marcadas = escrituras.filter((e) => e.sql.startsWith('INSERT OR IGNORE'))
    expect(marcadas.map((e) => e.valores)).toEqual([['c1', 'tomassa', '2026-10-01']])
  })

  it('un cuerpo de visitas por encima del tope es un 413 antes de tocar la base', async () => {
    const { base, lecturas } = baseFalsa(cuenta)
    const gigante = new Request(`${SITIO}/api/visitas`, {
      method: 'POST',
      headers: { [CABECERA]: SECRETO },
      body: 'x'.repeat(1_400_000),
    })
    expect((await atenderApi(gigante, { ANALITICA: base }))?.status).toBe(413)
    expect(lecturas).toHaveLength(0)
  })

  it('el tope de visitas deja pasar el máximo legítimo: cien lugares de 730 fechas', async () => {
    // 100 lugares × 730 fechas ≈ 1,05 MB. Si el tope lo rechazara, la primera sincronización de quien
    // lleva dos años usando la guía fallaría en silencio.
    const lugares = [...(await import('./catalogo.ts')).LUGARES].slice(0, 100)
    const dias = Array.from({ length: 730 }, (_, i) => {
      const d = new Date(Date.UTC(2024, 10, 3 + i))
      return d.toISOString().slice(0, 10)
    })
    const cuerpo = JSON.stringify({ fechas: Object.fromEntries(lugares.map((l) => [l, dias])) })
    // Cerca del megabyte: el tope de 1,3 MB le deja un margen del 35 %.
    expect(cuerpo.length).toBeGreaterThan(900_000)
    expect(cuerpo.length).toBeLessThan(1_300_000)
    const { base } = baseFalsa(cuenta)
    const peticion = new Request(`${SITIO}/api/visitas`, {
      method: 'POST',
      headers: { [CABECERA]: SECRETO },
      body: cuerpo,
    })
    expect((await atenderApi(peticion, { ANALITICA: base }))?.status).toBe(200)
  })
})
