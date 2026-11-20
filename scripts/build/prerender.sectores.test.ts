import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Category, Place, Plaza, Sector } from '../../src/types/domain.ts'
import { type Dataset, pagesFor } from './prerender.ts'

/*
 * Las páginas de sector (`/es/sector/x`, `/en/sector/x`). Salen solo cuando la barra de filtros ofrece
 * sectores, es decir con dos o más con locales: con uno solo, su página repetiría la portada. Sin esta
 * página, el enlace de la barra daba 404 al recargar o abrirlo aparte, porque el sitio no tiene reserva SPA.
 */

const leer = <T>(archivo: string): T =>
  JSON.parse(readFileSync(`data/commercial/${archivo}`, 'utf8')) as T
const archivo = leer<{ sectors: Sector[]; categories: Category[] }>('categories.json')
const plazas = leer<{ plazas: Plaza[] }>('plazas.json').plazas
const reales = leer<{ places: Place[] }>('places.json').places

// Un local ficticio de un giro de salud, copiado de uno real para que cumpla el esquema.
const conSalud = (id: string, giro: string): Place => {
  const base = reales.find((place) => place.active) as Place
  return { ...base, id, slug: id, name: `Prueba ${id}`, giros: [giro] }
}

const absoluta = (href: string) => `https://visitzibata.com${href}`
const datos = (places: Place[]): Dataset => ({
  sectors: archivo.sectors,
  categories: archivo.categories,
  plazas,
  places,
})

// Solo los de comida: lo que pasa hoy con un único sector con locales.
const soloComida = reales.filter((place) => {
  const categoria = archivo.categories.find((c) => c.giros.some((g) => g.id === place.giros[0]))
  return categoria?.sectorId === 'comida-y-bebida'
})
const dosSectores = [...soloComida, conSalud('prueba-dentista', 'dentista')]

describe('las páginas de sector', () => {
  it('con un solo sector con locales no hay página de sector', () => {
    const hrefs = pagesFor('es', datos(soloComida), '/', absoluta).map((p) => p.href)
    expect(hrefs.some((href) => href.includes('/sector/'))).toBe(false)
  })

  it.each([
    ['es', '/es/sector/salud', '/es/sector/comida-y-bebida'],
    ['en', '/en/sector/health', '/en/sector/food-and-drink'],
  ] as const)('con dos hay una por sector, en %s', (idioma, salud, comida) => {
    const hrefs = pagesFor(idioma, datos(dosSectores), '/', absoluta).map((p) => p.href)
    expect(hrefs).toContain(salud)
    expect(hrefs).toContain(comida)
  })

  it('las dos lenguas listan las páginas en el mismo orden (de ahí salen las hreflang)', () => {
    const es = pagesFor('es', datos(dosSectores), '/', absoluta)
    const en = pagesFor('en', datos(dosSectores), '/', absoluta)
    expect(en).toHaveLength(es.length)
    const posicion = (paginas: typeof es, parte: string) =>
      paginas.findIndex((p) => p.href.includes(parte))
    expect(posicion(es, '/sector/salud')).toBe(posicion(en, '/sector/health'))
  })

  it('la de Salud dice solo lo que los datos saben y lista solo sus lugares', () => {
    const pagina = pagesFor('es', datos(dosSectores), '/', absoluta).find(
      (p) => p.href === '/es/sector/salud',
    )
    expect(pagina?.title).toBe('Salud en Zibatá · Visit Zibatá')
    expect(pagina?.description).toContain('Dentistas')
    expect(pagina?.description).not.toMatch(/mejor/i)
    // Sin dos puntos ni el recuento de lugares: la descripción dice qué hay y qué trae cada ficha.
    expect(pagina?.description).not.toContain(':')
    expect(pagina?.description).not.toMatch(/lugares de la guía/i)
    expect(pagina?.description).toContain('con horario, contacto y cómo llegar')
    const ld = JSON.stringify(pagina?.jsonLd)
    expect(ld).toContain('prueba-dentista')
    expect(ld).not.toContain(soloComida[0]?.slug ?? 'no-hay')
  })

  it.each([
    ['es', '/es/sector/comida-y-bebida', 'y más, con horarios, contacto y cómo llegar.'],
    [
      'en',
      '/en/sector/food-and-drink',
      'and more, with opening hours, contact details and location.',
    ],
  ] as const)(
    'con muchas categorías nombra tres y "y más", y la descripción cabe entera en %s',
    (idioma, href, cierre) => {
      const pagina = pagesFor(idioma, datos(dosSectores), '/', absoluta).find(
        (p) => p.href === href,
      )
      expect(pagina?.description?.endsWith(cierre)).toBe(true)
      expect(pagina?.description?.length).toBeLessThanOrEqual(160)
      expect(pagina?.description).not.toContain('…')
      expect(pagina?.description).not.toContain(':')
    },
  )

  it('la portada enlaza a los sectores, para que no queden huérfanas', () => {
    const portada = pagesFor('es', datos(dosSectores), '/', absoluta)[0]
    expect(portada?.contenido).toContain('/es/sector/salud')
    expect(portada?.contenido).toContain('Sectores')
  })
})
