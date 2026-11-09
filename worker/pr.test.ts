import { afterEach, describe, expect, it, vi } from 'vitest'
import { atenderApi, type EntornoApi } from './api.ts'
import type { Base } from './cuenta.ts'
import { descartarPr, estadoDe, retirarUltimo, verPr } from './pr.ts'

const REPO = 'dueno/repositorio'
const entorno = { GITHUB_REPO: REPO, GITHUB_TOKEN: 'testigo-falso', GITHUB_RAMA: 'panel-contenido' }

const CABEZA = 'a'.repeat(40)
const PADRE = 'b'.repeat(40)
const ABUELO = 'c'.repeat(40)

const json = (datos: unknown, estado = 200) =>
  new Response(JSON.stringify(datos), {
    status: estado,
    headers: { 'content-type': 'application/json' },
  })

interface Simulacion {
  /** Hay una PR abierta (por omisión, sí). */
  pr?: boolean
  mergeable?: string | null
  /** `null` = el token no puede leer los checks (403). */
  checks?: { name: string; status: string; conclusion: string | null }[] | null
  /** La cabeza real de la rama, si no es `CABEZA`. */
  cabezaReal?: string
  /** El commit de la cabeza. */
  commit?: {
    parents?: string[]
    message?: string
    files?: string[]
  }
  aheadBy?: number
}

function montar(opciones: Simulacion = {}) {
  const llamadas: { metodo: string; ruta: string; cuerpo?: unknown }[] = []
  const conPr = opciones.pr ?? true
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const ruta = String(url).replace(`https://api.github.com/repos/${REPO}`, '')
      const metodo = init?.method ?? 'GET'
      llamadas.push({
        metodo,
        ruta,
        ...(init?.body ? { cuerpo: JSON.parse(String(init.body)) } : {}),
      })
      if (metodo === 'GET' && ruta.startsWith('/pulls?state=open')) {
        return json(conPr ? [{ number: 8, html_url: 'https://github.test/pull/8' }] : [])
      }
      if (metodo === 'GET' && ruta === '/pulls/8') {
        return json({
          title: 'Contenido desde el panel',
          html_url: 'https://github.test/pull/8',
          mergeable_state: opciones.mergeable === undefined ? 'clean' : opciones.mergeable,
          head: { sha: CABEZA },
        })
      }
      if (metodo === 'GET' && ruta === '/pulls/8/commits?per_page=100') {
        return json([
          {
            sha: PADRE,
            parents: [{ sha: ABUELO }],
            commit: {
              message: 'Panel: nuevo negocio "A"',
              author: { date: '2026-11-09T10:00:00Z' },
            },
          },
          {
            sha: CABEZA,
            parents: [{ sha: PADRE }],
            commit: {
              message: 'Panel: editar plaza "B"\n\ncuerpo',
              author: { date: '2026-11-09T11:00:00Z' },
            },
          },
        ])
      }
      if (metodo === 'GET' && ruta === `/commits/${CABEZA}/check-runs?per_page=100`) {
        if (opciones.checks === null) return json({ message: 'Resource not accessible' }, 403)
        return json({ check_runs: opciones.checks ?? [] })
      }
      if (metodo === 'GET' && ruta === '/git/ref/heads/panel-contenido') {
        return json({ object: { sha: opciones.cabezaReal ?? CABEZA } })
      }
      if (metodo === 'GET' && ruta === `/commits/${opciones.cabezaReal ?? CABEZA}`) {
        const commit = opciones.commit ?? {}
        return json({
          sha: opciones.cabezaReal ?? CABEZA,
          parents: (commit.parents ?? [PADRE]).map((sha) => ({ sha })),
          commit: { message: commit.message ?? 'Panel: editar plaza "B"' },
          files: (commit.files ?? ['data/commercial/plazas.json']).map((filename) => ({
            filename,
          })),
        })
      }
      if (metodo === 'GET' && ruta.startsWith('/compare/main...')) {
        return json({ ahead_by: opciones.aheadBy ?? 2 })
      }
      if (
        metodo === 'PATCH' &&
        (ruta === '/git/refs/heads/panel-contenido' || ruta === '/pulls/8')
      ) {
        return json({})
      }
      throw new Error(`llamada inesperada: ${metodo} ${ruta}`)
    }),
  )
  const escrituras = () => llamadas.filter((llamada) => llamada.metodo !== 'GET')
  return { llamadas, escrituras }
}

afterEach(() => vi.unstubAllGlobals())

describe('estadoDe', () => {
  const sinChecks = null
  it('los conflictos mandan sobre todo lo demás', () => {
    expect(estadoDe('dirty', { correctos: 12, pendientes: 0, fallidos: [] })).toBe('conflictos')
  })
  it('con checks: uno fallido es rojo, uno pendiente es pendiente, todos buenos es verde', () => {
    const fallo = { correctos: 3, pendientes: 1, fallidos: [{ nombre: 'e2e', url: null }] }
    expect(estadoDe('blocked', fallo)).toBe('rojo')
    expect(estadoDe('blocked', { correctos: 3, pendientes: 1, fallidos: [] })).toBe('pendiente')
    expect(estadoDe('blocked', { correctos: 12, pendientes: 0, fallidos: [] })).toBe('verde')
  })
  it('sin checks se lee mergeable_state, y lo que no entiende lo dice en vez de inventar', () => {
    expect(estadoDe('clean', sinChecks)).toBe('verde')
    expect(estadoDe('behind', sinChecks)).toBe('desactualizada')
    expect(estadoDe('unknown', sinChecks)).toBe('calculando')
    expect(estadoDe(null, sinChecks)).toBe('calculando')
    expect(estadoDe('blocked', sinChecks)).toBe('sin-clasificar')
    expect(estadoDe('unstable', sinChecks)).toBe('sin-clasificar')
  })
})

describe('verPr', () => {
  it('sin token (desarrollo) no hay PR que ver', async () => {
    const r = await verPr({ GITHUB_REPO: REPO })
    expect(r).toEqual({ ok: true, seco: true, pr: null })
  })

  it('sin PR abierta devuelve null', async () => {
    montar({ pr: false })
    const r = await verPr(entorno)
    expect(r.ok && r.pr).toBeNull()
  })

  it('lista los cambios del más reciente al más viejo, con su primera línea', async () => {
    montar({ checks: [{ name: 'lint', status: 'completed', conclusion: 'success' }] })
    const r = await verPr(entorno)
    if (!r.ok || !r.pr) throw new Error('debía haber PR')
    expect(r.pr.cambios.map((cambio) => cambio.mensaje)).toEqual([
      'Panel: editar plaza "B"',
      'Panel: nuevo negocio "A"',
    ])
    expect(r.pr.cambios.every((cambio) => cambio.delPanel)).toBe(true)
    expect(r.pr.cabeza).toBe(CABEZA)
  })

  it('con checks fallidos dice cuáles y el estado es rojo', async () => {
    montar({
      mergeable: 'blocked',
      checks: [
        { name: 'lint', status: 'completed', conclusion: 'success' },
        { name: 'E2E (desktop)', status: 'completed', conclusion: 'failure' },
        { name: 'build', status: 'in_progress', conclusion: null },
      ],
    })
    const r = await verPr(entorno)
    if (!r.ok || !r.pr) throw new Error('debía haber PR')
    expect(r.pr.estado).toBe('rojo')
    expect(r.pr.checks?.fallidos.map((fallo) => fallo.nombre)).toEqual(['E2E (desktop)'])
    expect(r.pr.checks).toMatchObject({ correctos: 1, pendientes: 1 })
  })

  it('sin permiso para leer los checks no falla: usa mergeable_state y dice que faltan', async () => {
    montar({ checks: null, mergeable: 'clean' })
    const r = await verPr(entorno)
    if (!r.ok || !r.pr) throw new Error('debía haber PR')
    expect(r.pr.checks).toBeNull()
    expect(r.pr.estado).toBe('verde')
  })

  it('conflictos con main se ven aunque los checks estén verdes', async () => {
    montar({
      mergeable: 'dirty',
      checks: [{ name: 'lint', status: 'completed', conclusion: 'success' }],
    })
    const r = await verPr(entorno)
    expect(r.ok && r.pr?.estado).toBe('conflictos')
  })
})

describe('retirarUltimo', () => {
  const pedir = (extra: Record<string, unknown> = {}) =>
    retirarUltimo(entorno, { cabeza: CABEZA, ...extra })

  it('sin confirmar enseña lo que se pierde y no escribe nada', async () => {
    const { escrituras } = montar({
      commit: { files: ['data/commercial/places.json', 'public/images/places/x/1.webp'] },
    })
    const r = await pedir()
    if (!r.ok) throw new Error(r.problemas.join(' | '))
    expect(r.confirmado).toBe(false)
    expect(r.pierde.conFoto).toBe(true)
    expect(r.pierde.archivos).toContain('data/commercial/places.json')
    expect(escrituras()).toHaveLength(0)
  })

  it('confirmado mueve la rama a su padre, con force, y solo eso', async () => {
    const { escrituras } = montar()
    const r = await pedir({ confirmar: true })
    expect(r.ok && r.confirmado).toBe(true)
    expect(escrituras()).toEqual([
      {
        metodo: 'PATCH',
        ruta: '/git/refs/heads/panel-contenido',
        cuerpo: { sha: PADRE, force: true },
      },
    ])
  })

  it('si la rama cambió desde que se vio, se rechaza: no se retira otro cambio', async () => {
    const { escrituras } = montar({ cabezaReal: 'd'.repeat(40) })
    const r = await pedir({ confirmar: true })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.problemas.join(' ')).toMatch(/La rama cambió/)
    expect(escrituras()).toHaveLength(0)
  })

  it('una fusión (dos padres) no se retira', async () => {
    const { escrituras } = montar({ commit: { parents: [PADRE, ABUELO] } })
    const r = await pedir({ confirmar: true })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.problemas.join(' ')).toMatch(/no lo hizo el panel/)
    expect(escrituras()).toHaveLength(0)
  })

  it('un commit que no es del panel no se retira', async () => {
    const { escrituras } = montar({ commit: { message: 'Arreglo a mano' } })
    const r = await pedir({ confirmar: true })
    expect(r.ok).toBe(false)
    expect(escrituras()).toHaveLength(0)
  })

  it('el único cambio de la PR se manda a "Descartar", no se deja la PR vacía', async () => {
    const { escrituras } = montar({ aheadBy: 1 })
    const r = await pedir({ confirmar: true })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.problemas.join(' ')).toMatch(/Descartar la PR/)
    expect(escrituras()).toHaveLength(0)
  })

  it('sin PR, sin token o con un cuerpo mal formado, no hace nada', async () => {
    const { escrituras } = montar({ pr: false })
    expect((await pedir({ confirmar: true })).ok).toBe(false)
    expect((await retirarUltimo({ GITHUB_REPO: REPO }, { cabeza: CABEZA })).ok).toBe(false)
    expect((await retirarUltimo(entorno, { cabeza: 'no-es-un-sha' })).ok).toBe(false)
    expect(escrituras()).toHaveLength(0)
  })
})

describe('descartarPr', () => {
  it('sin confirmar dice cuántos cambios se descartarían y no cierra nada', async () => {
    const { escrituras } = montar()
    const r = await descartarPr(entorno, { numero: 8 })
    expect(r.ok && r.confirmado).toBe(false)
    expect(r.ok && r.cambios).toBe(2)
    expect(escrituras()).toHaveLength(0)
  })

  it('confirmado cierra la PR y no toca la rama', async () => {
    const { escrituras } = montar()
    const r = await descartarPr(entorno, { numero: 8, confirmar: true })
    expect(r.ok && r.confirmado).toBe(true)
    expect(escrituras()).toEqual([
      { metodo: 'PATCH', ruta: '/pulls/8', cuerpo: { state: 'closed' } },
    ])
  })

  it('si la PR abierta ya no es la que se vio, se rechaza', async () => {
    const { escrituras } = montar()
    const r = await descartarPr(entorno, { numero: 7, confirmar: true })
    expect(r.ok).toBe(false)
    expect(escrituras()).toHaveLength(0)
  })
})

describe('la API de la PR del panel', () => {
  const entornoApi = { PANEL_ABIERTO: 'si', ANALITICA: {} as Base } as EntornoApi
  const post = (ruta: string, cuerpo: unknown, cabeceras: Record<string, string> = {}) =>
    atenderApi(
      new Request(`http://localhost:8787${ruta}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'sec-fetch-site': 'same-origin',
          ...cabeceras,
        },
        body: JSON.stringify(cuerpo),
      }),
      entornoApi,
    )

  it('GET sin token responde en seco, sin error', async () => {
    const respuesta = await atenderApi(
      new Request('http://localhost:8787/api/panel/contenido/pr'),
      entornoApi,
    )
    expect(respuesta?.status).toBe(200)
    expect(await respuesta?.json()).toEqual({ ok: true, seco: true, pr: null })
  })

  it('POST de otro origen se rechaza', async () => {
    for (const ruta of ['/api/panel/contenido/pr/retirar', '/api/panel/contenido/pr/descartar']) {
      const respuesta = await post(ruta, {}, { 'sec-fetch-site': 'cross-site' })
      expect(respuesta?.status).toBe(403)
    }
  })

  it('sin token los POST dicen por qué no pueden, con 400', async () => {
    const respuesta = await post('/api/panel/contenido/pr/descartar', { numero: 8 })
    expect(respuesta?.status).toBe(400)
  })

  it('un cuerpo que pasa del tope se rechaza con 413', async () => {
    const respuesta = await post('/api/panel/contenido/pr/retirar', { x: 'y'.repeat(8 * 1024) })
    expect(respuesta?.status).toBe(413)
  })
})
