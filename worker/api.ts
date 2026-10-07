/**
 * La API de la guía. Hoy solo da identidad; los datos vienen después (ver docs/CUENTAS.md).
 *
 * Todo lo que sale de aquí es `Cache-Control: no-store`: son respuestas de una persona concreta y no
 * tienen nada que hacer en una caché compartida.
 *
 * Dos cosas que no hay y que conviene que se note: no hay endpoint de lectura de nada ajeno, y no
 * hay cookies. La identidad viaja en una cabecera que el navegador manda a propósito, no en algo que
 * se adjunte solo a cada petición.
 */
import { base64url, cumpleLaPrueba, digestDe } from '../src/lib/prueba-de-trabajo.ts'
import { ALTA, type Base, huella, nuevaCuenta, RESOLVER, secretoDe } from './cuenta.ts'
import {
  ANADIR,
  CONTEO,
  CUANTOS_TIENE,
  cambioDe,
  EDAD_MINIMA_MS,
  MAXIMO_POR_CUENTA,
  MIOS,
  QUITAR,
  UMBRAL,
} from './favoritos.ts'

export interface EntornoApi {
  ANALITICA?: Base
}

const json = (datos: unknown, estado = 200, cache = 'no-store'): Response =>
  new Response(JSON.stringify(datos), {
    status: estado,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cache },
  })

/** La cuenta de quien hace esta petición, o `null` si no trae una credencial que exista. */
export async function cuentaDe(peticion: Request, base: Base): Promise<string | null> {
  const secreto = secretoDe(peticion.headers)
  if (!secreto) return null
  const fila = await base
    .prepare(RESOLVER)
    .bind('dispositivo', await huella(secreto))
    .first<{ cuenta_id: string }>()
  return fila?.cuenta_id ?? null
}

/**
 * Atiende `/api/*`, o devuelve `null` si la ruta no es suya (y entonces se sirve el archivo).
 *
 * Devolver `null` en vez de un 404 es lo que deja convivir la API con los 232 archivos del sitio sin
 * que ninguna de las dos tenga que saber de la otra.
 */
export async function atenderApi(peticion: Request, entorno: EntornoApi): Promise<Response | null> {
  const ruta = new URL(peticion.url).pathname
  if (!ruta.startsWith('/api/')) return null

  // Sin base no hay identidad posible. Se dice, en vez de fallar de una forma rara.
  if (!entorno.ANALITICA) return json({ error: 'sin base de datos' }, 503)

  /*
   * El alta. El secreto lo trae el navegador, no lo reparte el servidor, porque es él quien tuvo que
   * buscarlo hasta que su huella empezó por ceros (ver src/lib/prueba-de-trabajo.ts). Aquí solo se
   * comprueba, que es un hash.
   *
   * Que cada prueba valga una sola vez sale gratis: la huella es la clave primaria de `credencial`,
   * así que repetir un secreto ya usado choca contra el índice y no crea nada. Sin tabla de sellos,
   * sin caducidades y sin limpieza periódica.
   */
  if (ruta === '/api/cuenta' && peticion.method === 'POST') {
    const secreto = secretoDe(peticion.headers)
    if (!secreto) return json({ error: 'falta el secreto' }, 400)
    const digest = await digestDe(secreto)
    if (!cumpleLaPrueba(digest)) return json({ error: 'prueba de trabajo no válida' }, 403)
    const sujeto = base64url(digest)
    const id = nuevaCuenta()
    const ahora = new Date().toISOString()
    try {
      await entorno.ANALITICA.batch([
        entorno.ANALITICA.prepare(ALTA[0]).bind(id, ahora),
        entorno.ANALITICA.prepare(ALTA[1]).bind('dispositivo', sujeto, id, ahora),
      ])
    } catch {
      // Casi siempre es la huella repetida, que es la prueba reutilizada. No se distingue a propósito:
      // decir cuál de los dos fue solo le sirve a quien lo está intentando.
      return json({ error: 'no se pudo crear la cuenta' }, 409)
    }
    return json({ ok: true }, 201)
  }

  if (ruta === '/api/cuenta' && peticion.method === 'GET') {
    const cuenta = await cuentaDe(peticion, entorno.ANALITICA)
    return cuenta ? json({ cuenta }) : json({ error: 'sin cuenta' }, 401)
  }

  /*
   * El conteo público. Es lo único de esta API que no lleva identidad y lo único que se cachea: lo
   * pide cada visita y cambia despacio, así que cinco minutos de caché en el navegador ahorran casi
   * todas las consultas sin que nadie note el retraso.
   *
   * Sin `caches.default`: es una extensión de Cloudflare que obligaría a traer sus tipos enteros, y
   * a esta escala una consulta por visita a D1 no se nota (el plan gratuito da millones al día).
   */
  if (ruta === '/api/corazones' && peticion.method === 'GET') {
    const limite = new Date(Date.now() - EDAD_MINIMA_MS).toISOString()
    const filas = await entorno.ANALITICA.prepare(CONTEO)
      .bind(limite, UMBRAL)
      .all<{ lugar: string; cuantos: number }>()
    const conteo: Record<string, number> = {}
    for (const fila of filas.results ?? []) conteo[fila.lugar] = fila.cuantos

    return json(conteo, 200, 'public, max-age=300')
  }

  // A partir de aquí hace falta cuenta.
  const cuenta = await cuentaDe(peticion, entorno.ANALITICA)

  if (ruta === '/api/favoritos' && peticion.method === 'GET') {
    if (!cuenta) return json({ lugares: [] })
    const filas = await entorno.ANALITICA.prepare(MIOS).bind(cuenta).all<{ lugar_id: string }>()
    return json({ lugares: (filas.results ?? []).map((fila) => fila.lugar_id) })
  }

  if (ruta === '/api/favoritos' && peticion.method === 'POST') {
    if (!cuenta) return json({ error: 'sin cuenta' }, 401)
    let cuerpo: unknown
    try {
      cuerpo = await peticion.json()
    } catch {
      return json({ error: 'cuerpo no válido' }, 400)
    }
    const cambio = cambioDe(cuerpo)
    if (!cambio) return json({ error: 'cambio no válido' }, 400)

    if (cambio.anadir.length > 0) {
      const tiene = await entorno.ANALITICA.prepare(CUANTOS_TIENE)
        .bind(cuenta)
        .first<{ total: number }>()
      if ((tiene?.total ?? 0) + cambio.anadir.length > MAXIMO_POR_CUENTA) {
        return json({ error: 'demasiados favoritos' }, 409)
      }
    }

    const ahora = new Date().toISOString()
    try {
      await entorno.ANALITICA.batch([
        ...cambio.anadir.map((lugar) =>
          (entorno.ANALITICA as Base).prepare(ANADIR).bind(cuenta, lugar, ahora),
        ),
        ...cambio.quitar.map((lugar) =>
          (entorno.ANALITICA as Base).prepare(QUITAR).bind(cuenta, lugar),
        ),
      ])
    } catch {
      return json({ error: 'no se pudo guardar' }, 500)
    }
    return json({ ok: true })
  }

  return json({ error: 'no existe' }, 404)
}
