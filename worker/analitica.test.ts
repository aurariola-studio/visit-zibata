import { describe, expect, it } from 'vitest'
import { APUNTE, type PeticionObservada, visitaDe } from './analitica.ts'

/** Una visita normal: alguien abre una ficha desde un navegador de verdad. */
const visita = (extra: Partial<PeticionObservada> = {}): PeticionObservada => ({
  url: 'https://visitzibata.com/lugar/tomassa',
  metodo: 'GET',
  estado: 200,
  tipoDeContenido: 'text/html; charset=utf-8',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/141.0 Safari/537.36',
  ahora: new Date('2026-10-05T18:30:00Z'),
  ...extra,
})

describe('qué se cuenta', () => {
  it('una página abierta se apunta por fecha, ruta e idioma', () => {
    expect(visitaDe(visita())).toEqual({
      fecha: '2026-10-05',
      ruta: '/lugar/tomassa',
      idioma: 'es',
    })
  })

  it('el árbol inglés se apunta como inglés', () => {
    expect(visitaDe(visita({ url: 'https://visitzibata.com/en/place/tomassa' }))).toMatchObject({
      ruta: '/en/place/tomassa',
      idioma: 'en',
    })
  })

  it('el filtro no abre una fila nueva: la ruta va sin parámetros', () => {
    expect(
      visitaDe(visita({ url: 'https://visitzibata.com/zona/condesa?categoria=bebidas' })),
    ).toMatchObject({ ruta: '/zona/condesa' })
  })

  it('la misma página con y sin barra final es la misma fila', () => {
    const con = visitaDe(visita({ url: 'https://visitzibata.com/zona/condesa/' }))
    const sin = visitaDe(visita({ url: 'https://visitzibata.com/zona/condesa' }))
    expect(con).toEqual(sin)
    // Y la portada conserva la suya, que es su ruta de verdad.
    expect(visitaDe(visita({ url: 'https://visitzibata.com/' }))).toMatchObject({ ruta: '/' })
  })

  it('el día es el de Querétaro, no el de Greenwich', () => {
    // Las 00:30 UTC del 6 son todavía las 18:30 del 5 en Zibatá: esa visita es del martes de aquí.
    expect(visitaDe(visita({ ahora: new Date('2026-10-06T00:30:00Z') }))).toMatchObject({
      fecha: '2026-10-05',
    })
  })
})

describe('qué no se cuenta', () => {
  it('un robot no es una visita', () => {
    for (const agente of [
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'facebookexternalhit/1.1',
      'WhatsApp/2.23',
      'curl/8.4.0',
      'Mozilla/5.0 HeadlessChrome/141.0',
    ]) {
      expect(visitaDe(visita({ userAgent: agente }))).toBeNull()
    }
  })

  it('una página que no se entregó no es una visita', () => {
    expect(visitaDe(visita({ estado: 404 }))).toBeNull()
    expect(visitaDe(visita({ estado: 304 }))).toBeNull()
    expect(visitaDe(visita({ estado: 500 }))).toBeNull()
  })

  it('lo que no es una página no es una visita', () => {
    expect(visitaDe(visita({ tipoDeContenido: 'application/x-protobuf' }))).toBeNull()
    expect(visitaDe(visita({ tipoDeContenido: 'image/jpeg' }))).toBeNull()
    expect(visitaDe(visita({ tipoDeContenido: null }))).toBeNull()
  })

  it('solo se cuentan lecturas', () => {
    expect(visitaDe(visita({ metodo: 'POST' }))).toBeNull()
    expect(visitaDe(visita({ metodo: 'HEAD' }))).toBeNull()
  })

  it('una URL rota no tumba el conteo', () => {
    expect(visitaDe(visita({ url: 'esto no es una url' }))).toBeNull()
  })
})

describe('el apunte', () => {
  it('suma sobre la fila del día en vez de crear una nueva', () => {
    // Si esto dejara de ser un UPSERT, la tabla crecería una fila por visita y habría que purgarla.
    expect(APUNTE).toContain('ON CONFLICT(fecha, ruta, idioma) DO UPDATE SET cuenta = cuenta + 1')
  })

  it('no guarda nada de quien visita', () => {
    // La prueba que de verdad importa: lo que no está en la consulta no puede llegar a la base.
    for (const prohibido of ['ip', 'user_agent', 'cookie', 'sesion', 'visitante', 'referente']) {
      expect(APUNTE.toLowerCase()).not.toContain(prohibido)
    }
  })
})
