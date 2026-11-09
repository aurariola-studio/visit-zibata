import { afterEach, describe, expect, it, vi } from 'vitest'
import categoriasJson from '../data/commercial/categories.json' with { type: 'json' }
import lugaresJson from '../data/commercial/places.json' with { type: 'json' }
import plazasJson from '../data/commercial/plazas.json' with { type: 'json' }
import type { AjusteEdificio } from '../src/data/ajustes-edificios.ts'
import { LIMITES } from './contenido.ts'
import { ajustarEdificio, prepararEdificio } from './edificios.ts'

const HOY = '2026-11-09'
const base = {
  categories: categoriasJson as unknown as Record<string, unknown>,
  plazas: plazasJson as unknown as Record<string, unknown>,
  places: lugaresJson as unknown as Record<string, unknown>,
}
const dentro = {
  lat: (LIMITES.south + LIMITES.north) / 2,
  lng: (LIMITES.west + LIMITES.east) / 2,
}
const conAjustes = (ajustes: unknown[]) => ({ ...base, ajustesEdificios: { ajustes } })
const sinAjustes = conAjustes([])
const existente: AjusteEdificio = {
  accion: 'ocultar',
  punto: { lat: 20.69, lng: -100.35 },
  motivo: 'Ya no existe',
  creado: '2026-11-01',
}

const ajustar = (extra: Record<string, unknown> = {}) => ({
  operacion: 'ajustar',
  accion: 'ocultar',
  punto: dentro,
  motivo: 'Demolido en 2026',
  ...extra,
})

function ok(r: ReturnType<typeof prepararEdificio>) {
  if (!r.ok) throw new Error(`debía ser válido: ${r.problemas.join(' | ')}`)
  return r
}

describe('ajustar un edificio', () => {
  it('oculta: añade un ajuste con la fecha de hoy y el punto a 6 decimales', () => {
    const r = ok(
      prepararEdificio(
        sinAjustes,
        ajustar({ punto: { lat: dentro.lat + 1e-9, lng: dentro.lng } }),
        HOY,
      ),
    )
    expect(r.archivo.ajustes).toHaveLength(1)
    expect(r.archivo.ajustes[0]).toMatchObject({
      accion: 'ocultar',
      creado: HOY,
      motivo: 'Demolido en 2026',
    })
    const decimales = String(r.archivo.ajustes[0]?.punto.lat).split('.')[1]?.length ?? 0
    expect(decimales).toBeLessThanOrEqual(6)
    expect(r.resumen.total).toBe(1)
  })

  it('fija la altura y la guarda en metros, sin redondear', () => {
    const r = ok(prepararEdificio(sinAjustes, ajustar({ accion: 'altura', alturaM: 10.5 }), HOY))
    expect(r.archivo.ajustes[0]).toMatchObject({ accion: 'altura', alturaM: 10.5 })
    expect(r.resumen.avisos.join(' ')).toMatch(/10[.,]5 m tal cual/)
  })

  it('conserva los ajustes que ya había y no toca ningún otro dato', () => {
    const r = ok(prepararEdificio(conAjustes([existente]), ajustar(), HOY))
    expect(r.archivo.ajustes).toHaveLength(2)
    expect(r.archivo.ajustes[0]).toEqual(existente)
    expect(Object.keys(r.archivo)).toEqual(['ajustes'])
  })

  it('un archivo que falta (rama anterior) cuenta como vacío', () => {
    expect(ok(prepararEdificio(base, ajustar(), HOY)).archivo.ajustes).toHaveLength(1)
  })

  it('avisa de que el build lo comprueba contra el crudo y que la PR no se fusiona si falla', () => {
    const avisos = ok(prepararEdificio(sinAjustes, ajustar(), HOY)).resumen.avisos.join(' ')
    expect(avisos).toMatch(/UNA sola huella/)
    expect(avisos).toMatch(/no se puede fusionar/)
  })

  it('rechaza lo que no vale', () => {
    const casos: Record<string, unknown> = {
      'sin acción': ajustar({ accion: undefined }),
      'altura sin metros': ajustar({ accion: 'altura' }),
      'altura absurda': ajustar({ accion: 'altura', alturaM: 500 }),
      'altura cero': ajustar({ accion: 'altura', alturaM: 0 }),
      'sin motivo': ajustar({ motivo: '' }),
      'motivo en blanco': ajustar({ motivo: '   ' }),
      'fuera del área': ajustar({ punto: { lat: 0, lng: 0 } }),
      'campo desconocido': ajustar({ nombre: 'Torre' }),
      'operación desconocida': ajustar({ operacion: 'borrar' }),
      'altura con ocultar': ajustar({ alturaM: 9 }),
      'coordenada NaN': ajustar({ punto: { lat: Number.NaN, lng: dentro.lng } }),
    }
    for (const [nombre, cuerpo] of Object.entries(casos)) {
      expect(prepararEdificio(sinAjustes, cuerpo, HOY).ok, nombre).toBe(false)
    }
  })

  it('no admite dos ajustes en el mismo punto', () => {
    const r = prepararEdificio(conAjustes([existente]), ajustar({ punto: existente.punto }), HOY)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.problemas.join(' ')).toMatch(/Ya hay un ajuste en ese punto/)
  })

  it('un archivo que no pasa el esquema no se sobrescribe', () => {
    const r = prepararEdificio(conAjustes([{ cosa: 1 }]), ajustar(), HOY)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.problemas.join(' ')).toMatch(/no pasa el esquema/)
  })

  it('con 500 ajustes ya no entra otro', () => {
    const lleno = Array.from({ length: 500 }, (_, i) => ({
      ...existente,
      punto: { lat: 20.6 + i * 1e-5, lng: -100.35 },
    }))
    expect(prepararEdificio(conAjustes(lleno), ajustar(), HOY).ok).toBe(false)
  })
})

describe('quitar un ajuste', () => {
  const quitar = (extra: Record<string, unknown> = {}) => ({
    operacion: 'quitar',
    punto: existente.punto,
    ...extra,
  })

  it('lo quita y deja los demás', () => {
    const otro = { ...existente, punto: { lat: 20.7, lng: -100.34 } }
    const r = ok(prepararEdificio(conAjustes([existente, otro]), quitar(), HOY))
    expect(r.archivo.ajustes).toEqual([otro])
    expect(r.resumen.total).toBe(1)
    expect(r.resumen.avisos.join(' ')).toMatch(/vuelve a aparecer/)
  })

  it('quitar uno que ya no está es un error', () => {
    const r = prepararEdificio(sinAjustes, quitar(), HOY)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.problemas.join(' ')).toMatch(/ya no existe/)
  })

  it('quitar no exige motivo ni acción', () => {
    expect(prepararEdificio(conAjustes([existente]), quitar(), HOY).ok).toBe(true)
  })
})

describe('en desarrollo (sin testigo)', () => {
  it('con PANEL_ABIERTO valida y no escribe', async () => {
    const entorno = { PANEL_ABIERTO: 'si' } as never
    const previo = await ajustarEdificio(entorno, ajustar())
    expect(previo.ok && previo.confirmado).toBe(false)
    const confirmado = await ajustarEdificio(entorno, ajustar({ confirmar: true }))
    expect(confirmado.ok).toBe(true)
    if (confirmado.ok) {
      expect(confirmado.confirmado).toBe(true)
      expect(confirmado.seco).toBe(true)
      expect(confirmado.pr).toBeNull()
    }
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
    const blobs: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        const ruta = String(url).replace(`https://api.github.com/repos/${REPO}`, '')
        const metodo = init?.method ?? 'GET'
        const contenido: Record<string, unknown> = {
          '/contents/data/commercial/categories.json?ref=main': base.categories,
          '/contents/data/commercial/plazas.json?ref=main': base.plazas,
          '/contents/data/commercial/places.json?ref=main': base.places,
          '/contents/data/geographic/ajustes-edificios.json?ref=main': { ajustes: [existente] },
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

  it('manda solo ajustes-edificios.json, con el ajuste nuevo al final y el viejo intacto', async () => {
    const { arboles, blobs } = montar()
    const r = await ajustarEdificio(entorno, ajustar({ confirmar: true }))
    expect(r.ok && r.pr?.numero).toBe(9)
    expect(arboles[0]?.map((fila) => fila.path)).toEqual(['data/geographic/ajustes-edificios.json'])
    const escrito = JSON.parse(blobs[0] ?? '{}') as { ajustes: AjusteEdificio[] }
    expect(escrito.ajustes).toHaveLength(2)
    expect(escrito.ajustes[0]).toEqual(existente)
    expect(blobs[0]?.endsWith('\n')).toBe(true)
  })

  it('quitar manda el archivo sin ese ajuste', async () => {
    const { blobs } = montar()
    const r = await ajustarEdificio(entorno, {
      operacion: 'quitar',
      punto: existente.punto,
      confirmar: true,
    })
    expect(r.ok).toBe(true)
    expect((JSON.parse(blobs[0] ?? '{}') as { ajustes: unknown[] }).ajustes).toEqual([])
  })

  it('sin confirmar, o con algo inválido, no escribe nada', async () => {
    const { arboles } = montar()
    const sin = await ajustarEdificio(entorno, ajustar())
    expect(sin.ok && sin.confirmado).toBe(false)
    const mala = await ajustarEdificio(entorno, ajustar({ motivo: '', confirmar: true }))
    expect(mala.ok).toBe(false)
    expect(arboles).toHaveLength(0)
    const metodos = vi.mocked(fetch).mock.calls.map(([, init]) => init?.method ?? 'GET')
    expect(metodos.every((metodo) => metodo === 'GET')).toBe(true)
  })
})
