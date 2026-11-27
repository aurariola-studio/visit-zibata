import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { esPunto } from '../../src/data/puntos.ts'
import type { Category, Place, Plaza } from '../../src/types/domain.ts'
import { type Dataset, pagesFor } from './prerender.ts'

/*
 * Los metadatos de las 234 páginas, generados con el dataset real y las dos lenguas: lo que Google
 * lee en el `<head>` y lo que se ve al compartir un enlace. Aquí se comprueba el resultado completo
 * y no cada función por separado, porque los defectos que se corrigen (títulos repetidos, saltos de
 * línea, cortes) solo se ven mirando la lista entera.
 *
 * Esto no dice qué mostrará Google: la meta descripción es una sugerencia que Google usa cuando le
 * parece que describe mejor la página que su propio texto.
 */

const leer = <T>(archivo: string): T =>
  JSON.parse(readFileSync(`data/commercial/${archivo}`, 'utf8')) as T
const data: Dataset = {
  categories: leer<{ categories: Category[] }>('categories.json').categories,
  plazas: leer<{ plazas: Plaza[] }>('plazas.json').plazas,
  places: leer<{ places: Place[] }>('places.json').places,
}

const plazasActivas = new Set(data.plazas.filter((plaza) => plaza.active).map((plaza) => plaza.id))
const visibles = data.places.filter((place) => place.active && plazasActivas.has(place.plazaId))
/** Las que tienen página: un punto de interés no la tiene, aunque su local sí tenga ficha. */
const zonasActivas = data.plazas.filter((plaza) => plaza.active && !esPunto(plaza))

/*
 * El filtro usa la etiqueta corta ("Italiana", "Saludable"); el título, la descripción y el h1 la
 * dicen completa. Estas formas no salen de los datos y aquí quedan fijadas.
 */
const NOMBRE_LARGO: Record<Idioma, Record<string, string>> = {
  es: {
    mexicana: 'Comida Mexicana',
    italiana: 'Comida Italiana',
    asiatica: 'Comida Asiática',
    saludable: 'Comida Saludable',
    casera: 'Comida Casera',
    internacional: 'Comida Internacional',
  },
  en: {
    mexicana: 'Mexican food',
    italiana: 'Italian food',
    asiatica: 'Asian food',
    saludable: 'Healthy food',
    casera: 'Home cooking',
    internacional: 'International food',
  },
}

const absoluta = (href: string) => `https://visitzibata.com${href}`
const paginas = {
  es: pagesFor('es', data, '/', absoluta),
  en: pagesFor('en', data, '/', absoluta),
}
type Idioma = keyof typeof paginas
const idiomas: Idioma[] = ['es', 'en']

const de = (idioma: Idioma, href: string) => {
  const pagina = paginas[idioma].find((candidata) => candidata.href === href)
  if (!pagina) throw new Error(`No hay página ${href} en ${idioma}`)
  return pagina
}
const ficha = (idioma: Idioma, slug: string) =>
  de(idioma, idioma === 'es' ? `/es/lugar/${slug}` : `/en/place/${slug}`)
const textoDelDato = (place: Place, idioma: Idioma): string =>
  (idioma === 'en' ? place.description?.en : undefined) ?? place.description?.es ?? ''

/*
 * Los locales van y vienen: ninguna prueba nombra uno de verdad. Lo que una ficha concreta enseñaba
 * (un nombre con ñ, dos locales con el mismo nombre, un texto que empieza con el nombre) se reproduce
 * con locales inventados en zonas inventadas. Solo la taxonomía y la plantilla del primer local salen
 * de los datos.
 */
const plazaPrueba = (id: string, nombre: string): Plaza =>
  ({ ...(data.plazas[0] as Plaza), id, slug: id, name: nombre, active: true }) as unknown as Plaza
const ZONA = plazaPrueba('zona-prueba', 'Zona Prueba')
const lugarPrueba = (cambios: Record<string, unknown> = {}): Place =>
  ({
    ...(data.places[0] as Place),
    id: 'local-prueba',
    slug: 'local-prueba',
    name: 'Local Prueba',
    plazaId: ZONA.id,
    giros: [GIROS[0]?.id],
    description: null,
    cierre: undefined,
    ...cambios,
  }) as unknown as Place
const paginasDe = (idioma: Idioma, lugares: Place[], plazas: Plaza[] = [ZONA]) =>
  pagesFor(idioma, { ...data, plazas, places: lugares }, '/', absoluta)
const fichaDe = (idioma: Idioma, lugar: Place, plazas: Plaza[] = [ZONA]) => {
  const pagina = paginasDe(idioma, [lugar], plazas).find((candidata) =>
    candidata.href.endsWith(`/${lugar.slug}`),
  )
  if (!pagina) throw new Error(`No hay ficha de ${lugar.slug} en ${idioma}`)
  return pagina
}
/** Los giros de la taxonomía real, de uno en uno por categoría: lo que cambia con el catálogo, no con los locales. */
const GIROS = data.categories.flatMap((categoria) =>
  categoria.giros.filter((giro) => !giro.general),
)
const giroDeCada = (n: number) =>
  data.categories
    .map((c) => c.giros.find((g) => !g.general))
    .filter((g) => g !== undefined)
    .slice(0, n)

describe.each(idiomas)('metadatos de las páginas (%s)', (idioma) => {
  const todas = paginas[idioma]
  const fichas = visibles.map((place) => ficha(idioma, place.slug))

  it('genera la portada, las zonas, una página por cada categoría, las fichas y la información', () => {
    const categoriasConLocales = data.categories.filter((c) =>
      visibles.some((p) => p.giros.some((giro) => c.giros.some((g) => g.id === giro))),
    )
    expect(todas).toHaveLength(
      1 + zonasActivas.length + categoriasConLocales.length + visibles.length + 4,
    )
  })

  it('cada título y cada descripción son distintos dentro del idioma', () => {
    for (const campo of ['title', 'description'] as const) {
      const valores = todas.map((pagina) => pagina[campo].toLowerCase())
      const repetidos = valores.filter((valor, i) => valores.indexOf(valor) !== i)
      expect(repetidos, `${campo} repetidos en ${idioma}`).toEqual([])
    }
  })

  it('ningún título ni descripción está vacío ni pasa del tope', () => {
    for (const pagina of todas) {
      expect(pagina.title.length, pagina.href).toBeGreaterThan(0)
      // Unos 60; las categorías llevan además sus giros y admiten un poco más.
      const tope = /^\/(?:en\/category|es\/categoria)\//.test(pagina.href) ? 65 : 60
      expect(pagina.title.length, `título de ${pagina.href}`).toBeLessThanOrEqual(tope)
      expect(pagina.description.length, pagina.href).toBeGreaterThan(0)
      expect(pagina.description.length, `descripción de ${pagina.href}`).toBeLessThanOrEqual(160)
    }
  })

  it('sin saltos de línea, espacios dobles, texto mal codificado ni texto sin normalizar', () => {
    for (const pagina of todas) {
      for (const [campo, valor] of [
        ['title', pagina.title],
        ['description', pagina.description],
      ] as const) {
        expect(valor, `${campo} de ${pagina.href}`).not.toMatch(/[\n\r\t]|\s{2,}|^\s|\s$/)
        expect(valor, `${campo} de ${pagina.href}`).not.toMatch(/�|Ã.|â€|Â./)
        expect(valor.normalize('NFC'), `${campo} de ${pagina.href}`).toBe(valor)
      }
    }
  })

  it('ninguna descripción de ficha acaba colgada: ni ":…" ni una conjunción antes de "…"', () => {
    for (const pagina of fichas) {
      expect(pagina.description, pagina.href).not.toMatch(/[:;,]…$/)
      expect(pagina.description, pagina.href).not.toMatch(
        /\b(y|e|o|de|del|la|el|con|para|en|que|and|or|the|of|with|for|in)…$/i,
      )
    }
  })

  it('el JSON-LD sigue diciendo lo que dice el negocio, sin contexto añadido ni saltos aplanados', () => {
    for (const place of visibles) {
      const esperado = textoDelDato(place, idioma)
      const descripcion = ficha(idioma, place.slug).jsonLd?.description
      if (descripcion !== undefined) expect(descripcion, place.slug).toBe(esperado)
    }
  })

  it('todas las páginas del idioma usan su imagen social, también en el JSON-LD de las fichas', () => {
    // Una imagen por idioma, igual en todas las páginas de ese idioma: no hay imagen por local.
    const imagen = idioma === 'en' ? '/og-image-en.png' : '/og-image.png'
    for (const pagina of todas) expect(pagina.image, pagina.href).toBe(imagen)
    for (const pagina of fichas) {
      expect(pagina.jsonLd?.image, pagina.href).toBe(absoluta(imagen))
    }
  })

  it('con una base en subruta la imagen social la lleva', () => {
    const imagen = idioma === 'en' ? 'og-image-en.png' : 'og-image.png'
    for (const pagina of pagesFor(idioma, data, '/visit-zibata/', absoluta)) {
      expect(pagina.image, pagina.href).toBe(`/visit-zibata/${imagen}`)
    }
  })

  it('ni los títulos ni las descripciones dejan contenido vacío en el cuerpo servido', () => {
    for (const pagina of fichas) {
      expect(pagina.contenido, pagina.href).not.toMatch(
        /<(p|h1|h2|li|dt|dd)><\/\1>|href=""|href="\+/,
      )
    }
  })

  it('los nombres con ñ, tildes y diéresis salen enteros', () => {
    for (const name of [
      'Ñam Ñam Sushi',
      'Myköna Frozen Yogurt',
      'Birria Jáuregui',
      'Panadería Ñandú',
    ]) {
      expect(fichaDe(idioma, lugarPrueba({ name })).title).toContain(name)
    }
    // Un giro con ç o con acentos entra en una descripción compuesta sin deformarse.
    const conAcento = GIROS.find((giro) => /[áéíóúñüç]/i.test(giro.label[idioma] ?? ''))
    if (conAcento) {
      const lugar = lugarPrueba({ giros: [conAcento.id] })
      expect(fichaDe(idioma, lugar).description).toContain(conAcento.label[idioma])
    }
  })
})

describe('las fichas que antes salían iguales', () => {
  const zonaUno = plazaPrueba('zona-uno', 'Zona Uno')
  const zonaDos = plazaPrueba('zona-dos', 'Zona Dos')
  const igual = {
    name: 'Cadena Prueba',
    description: { es: 'Café de especialidad.', en: 'Specialty coffee.' },
  }
  const a = lugarPrueba({ ...igual, id: 'cadena-uno', slug: 'cadena-uno', plazaId: 'zona-uno' })
  const b = lugarPrueba({ ...igual, id: 'cadena-dos', slug: 'cadena-dos', plazaId: 'zona-dos' })

  it.each(idiomas)(
    'dos locales con el mismo nombre y el mismo texto tienen título y descripción distintos y la zona en el título (%s)',
    (idioma) => {
      const paginas = paginasDe(idioma, [a, b], [zonaUno, zonaDos])
      const [fa, fb] = ['cadena-uno', 'cadena-dos'].map((slug) =>
        paginas.find((pagina) => pagina.href.endsWith(`/${slug}`)),
      )
      expect(fa?.title).not.toBe(fb?.title)
      expect(fa?.description).not.toBe(fb?.description)
      expect(fa?.title).toContain('Zona Uno')
      expect(fb?.title).toContain('Zona Dos')
    },
  )

  it('un local cuyo nombre no se repite conserva el título de siempre', () => {
    expect(fichaDe('es', lugarPrueba({ name: 'Café Prueba' })).title).toBe(
      'Café Prueba · Visit Zibatá',
    )
  })
})

describe('lo que se comprobó en fichas concretas de la auditoría, con locales inventados', () => {
  const desc = (descripcion: string, name = 'Local Prueba') =>
    fichaDe('es', lugarPrueba({ name, description: { es: descripcion, en: descripcion } }))
      .description

  it('una descripción que empieza con el nombre lleva el contexto primero, y luego su texto', () => {
    expect(desc('LOCAL PRUEBA es una cafetería de barrio.')).toMatch(
      /^.*en Zona Prueba, Zibatá\. LOCAL PRUEBA es una cafetería/,
    )
  })

  it('una descripción que no empieza con el nombre también lleva el contexto primero', () => {
    expect(desc('Pan dulce artesanal.')).toMatch(/^.*en Zona Prueba, Zibatá\. Pan dulce artesanal/)
  })

  it('un salto que separa dos ideas se une con " · " y uno que parte una frase, con un espacio', () => {
    expect(desc('Urban Bistró\nComer rico y sentirte bien.')).toMatch(
      /^.*en Zona Prueba, Zibatá\. Urban Bistró · Comer rico y sentirte bien\./,
    )
    expect(
      desc('Creemos que todos deben disfrutar\nde una buena hamburguesa sin pagar de más'),
    ).toMatch(
      /^.*en Zona Prueba, Zibatá\. Creemos que todos deben disfrutar de una buena hamburguesa/,
    )
  })

  it('una descripción corta dice qué es y dónde está, con el contexto primero', () => {
    expect(desc('Bowl Revolution.')).toMatch(/^.*en Zona Prueba, Zibatá\. Bowl Revolution\.$/)
  })

  it('un local que ya reabrió no lleva aviso de cierre y usa la fecha de su verificación', () => {
    const base = data.places[0] as Place
    const lugar = lugarPrueba({
      verification: { ...base.verification, lastVerifiedAt: '2026-05-05' },
    })
    const pagina = fichaDe('es', lugar)
    expect(pagina.description.startsWith('Cerrado temporalmente')).toBe(false)
    expect(pagina.lastmod).toBe('2026-05-05')
  })

  it('el enlace de WhatsApp del HTML servido es una URL, no un teléfono suelto', () => {
    const base = data.places[0] as Place
    const lugar = lugarPrueba({ links: { ...base.links, whatsapp: '+524400000000' } })
    const html = fichaDe('es', lugar).contenido ?? ''
    expect(html).toContain('href="https://wa.me/524400000000"')
    expect(html).not.toContain('href="+')
  })
})

/*
 * La etiqueta de un giro es corta a propósito: es lo que cabe en una cápsula y lo que se busca
 * ("Italiana", "Saludable"). En la descripción de una ficha se dice completa ("Comida Italiana"),
 * porque ahí no compite por el espacio y "Italiana" a secas no dice qué se vende. Estas diez frases
 * fijan esa regla: si alguien añade un giro con esa forma y no lo mapea en `src/lib/categorias.ts`,
 * o cambia el texto, la prueba lo dice.
 */
describe('los giros que el filtro dice cortos se leen completos en la descripción', () => {
  const casos = [
    [
      'cocina-italiana',
      'Comida Italiana en Plaza Prueba, Zibatá.',
      'Italian food at Plaza Prueba, Zibatá.',
    ],
    [
      'cocina-mexicana',
      'Comida Mexicana en Plaza Prueba, Zibatá.',
      'Mexican food at Plaza Prueba, Zibatá.',
    ],
    [
      'cocina-asiatica',
      'Comida Asiática en Plaza Prueba, Zibatá.',
      'Asian food at Plaza Prueba, Zibatá.',
    ],
    [
      'cocina-internacional',
      'Comida Internacional en Plaza Prueba, Zibatá.',
      'International food at Plaza Prueba, Zibatá.',
    ],
    [
      'saludable',
      'Comida Saludable en Plaza Prueba, Zibatá.',
      'Healthy food at Plaza Prueba, Zibatá.',
    ],
  ] as const

  const plaza = {
    ...(data.plazas[0] as Plaza),
    id: 'plaza-prueba',
    slug: 'plaza-prueba',
    name: 'Plaza Prueba',
    active: true,
  } as unknown as Plaza
  const base = data.places[0] as Place

  const descripcionDe = (giro: string, idioma: Idioma): string => {
    const lugar = {
      ...base,
      id: 'local-prueba',
      slug: 'local-prueba',
      name: 'Local Prueba',
      plazaId: 'plaza-prueba',
      giros: [giro],
      // Sin texto del negocio, la descripción es el nombre y el contexto: el giro y la zona.
      description: null,
      cierre: undefined,
    } as unknown as Place
    const pagina = pagesFor(
      idioma,
      { ...data, plazas: [plaza], places: [lugar] },
      '/',
      absoluta,
    ).find((candidata) => candidata.href.includes('local-prueba'))
    return pagina?.description ?? ''
  }

  for (const [giro, es, en] of casos) {
    it(`${giro}: ${es}`, () => {
      expect(descripcionDe(giro, 'es')).toBe(`Local Prueba. ${es}`)
      expect(descripcionDe(giro, 'en')).toBe(`Local Prueba. ${en}`)
    })
  }
})

describe('dos fichas sin texto, de la misma zona y con los mismos giros', () => {
  const zona = plazaPrueba('zona-uno', 'Zona Uno')
  const lugares = ['uno', 'dos'].map((n) =>
    lugarPrueba({
      id: `cadena-${n}`,
      slug: `cadena-${n}`,
      name: `Cadena ${n}`,
      plazaId: 'zona-uno',
      description: null,
    }),
  )

  it.each(idiomas)('se distinguen por el nombre (%s)', (idioma) => {
    const paginas = paginasDe(idioma, lugares, [zona])
    for (const lugar of lugares) {
      const pagina = paginas.find((candidata) => candidata.href.endsWith(`/${lugar.slug}`))
      expect(pagina?.description).toMatch(new RegExp(`^${lugar.name}\. `))
    }
  })
})

describe('la descripción enumera todas las categorías del local', () => {
  const tres = giroDeCada(3)
  const lugar = lugarPrueba({ giros: tres.map((giro) => giro.id) })

  it.each(idiomas)(
    'no se queda con las dos primeras: el tercer giro también se dice (%s)',
    (idioma) => {
      const { description } = fichaDe(idioma, lugar)
      for (const giro of tres) expect(description).toContain(giro.label[idioma])
    },
  )

  it('el cuerpo servido sin JavaScript nombra los mismos giros que la descripción', () => {
    // Lo que leen los rastreadores y quien no tiene JS no puede decir menos que la descripción.
    for (const idioma of idiomas) {
      const html = fichaDe(idioma, lugar).contenido ?? ''
      for (const giro of tres) {
        expect(html).toContain((giro.label[idioma] ?? giro.label.es).replace('&', '&amp;'))
      }
    }
  })

  it('en inglés la lista usa la coma de Oxford y "and"', () => {
    expect(fichaDe('en', lugar).description).toMatch(/, and /)
  })
})

describe('la portada', () => {
  it('presenta la guía local de Zibatá, sin abrir con la marca ni reducirla a restaurantes', () => {
    for (const idioma of idiomas) {
      const portada = de(idioma, idioma === 'es' ? '/es' : '/en')
      expect(portada.title.length).toBeLessThanOrEqual(60)
      expect(portada.description.length).toBeLessThanOrEqual(160)
      for (const texto of [portada.title, portada.description]) {
        expect(texto).not.toMatch(/restaurant/i)
      }
      expect(portada.title).toContain('Zibatá')
      expect(portada.title.match(/Zibatá/g) ?? []).toHaveLength(1)
      // La marca puede ir en la descripción, pero no como primera palabra: ahí manda el beneficio.
      expect(portada.description).not.toMatch(/^Zibatá/)
    }
    expect(de('es', '/es').title).toMatch(/guía local/i)
    expect(de('es', '/es').description).toMatch(/tu próximo lugar favorito/i)
    expect(de('en', '/en').description).toMatch(/your next favourite place/i)
  })
})

describe('las zonas y la información no cambian de plantilla', () => {
  it('tienen su título "{nombre}, qué hay y cómo llegar" y su propia descripción, con la cola estándar detrás', () => {
    // Cualquier zona activa con descripción propia que quepa entera: el prerender recorta a 160.
    const zona = data.plazas.find(
      (plaza) => plaza.active && plaza.description && plaza.description.es.length <= 160,
    )
    if (!zona?.description) throw new Error('el dataset necesita una zona activa con descripción')
    const pagina = de('es', `/es/zona/${zona.slug}`)
    expect(pagina.title).toBe(`${zona.name}, qué hay y cómo llegar · Visit Zibatá`)
    // El texto de la zona va tal cual al principio; detrás, siempre la misma cola.
    expect(pagina.description.startsWith(zona.description.es)).toBe(true)
    expect(pagina.description).toMatch(/con horarios?, contacto y cómo llegar\.$/)
    expect(pagina.description.length).toBeLessThanOrEqual(160)
  })
})

describe('los enlaces entre fichas del HTML servido', () => {
  const hrefs = (contenido: string | undefined) =>
    [...(contenido ?? '').matchAll(/<a href="(\/es\/lugar\/[a-z0-9-]+)"/g)].map((m) => m[1] ?? '')

  it('casi ninguna ficha queda con un único enlace entrante: solo las que están solas en su zona', () => {
    const entrantes = new Map<string, number>()
    for (const pagina of paginas.es) {
      if (pagina.href.startsWith('/es/zona/') || pagina.href.startsWith('/es/lugar/')) {
        for (const destino of new Set(hrefs(pagina.contenido))) {
          entrantes.set(destino, (entrantes.get(destino) ?? 0) + 1)
        }
      }
    }
    const solas = data.plazas
      .map((plaza) => visibles.filter((place) => place.plazaId === plaza.id))
      .filter((locales) => locales.length === 1)
      .flat()
      .map((place) => `/es/lugar/${place.slug}`)
    const conUno = visibles
      .map((place) => `/es/lugar/${place.slug}`)
      .filter((href) => (entrantes.get(href) ?? 0) <= 1)
    // Antes del reparto eran 37: los ocho primeros de cada zona grande recibían todos los enlaces.
    expect(conUno.sort()).toEqual(solas.sort())
  })

  it('la ficha en español y la inglesa enlazan a los mismos locales', () => {
    for (const place of visibles) {
      const es = hrefs(ficha('es', place.slug).contenido).map((h) => h.replace('/es/lugar/', ''))
      const en = [
        ...(ficha('en', place.slug).contenido ?? '').matchAll(
          /<a href="\/en\/place\/([a-z0-9-]+)"/g,
        ),
      ].map((m) => m[1])
      expect(en, place.slug).toEqual(es)
    }
  })
})

describe.each(idiomas)('las páginas de categoría (%s)', (idioma) => {
  const todas = paginas[idioma]
  const ruta = (slug: string) =>
    idioma === 'es' ? `/es/categoria/${slug}` : `/en/category/${slug}`
  const deCategoria = todas.filter((p) => p.href.startsWith(ruta('')))
  const categoriaDeGiro = new Map(
    data.categories.flatMap((c) => c.giros.map((g) => [g.id, c.id] as const)),
  )
  const idsDe = (place: Place) => new Set(place.giros.map((g) => categoriaDeGiro.get(g)))
  const conLocales = data.categories.filter((c) => visibles.some((p) => idsDe(p).has(c.id)))

  it('hay una por cada categoría que tiene al menos un local', () => {
    const conLocales = data.categories.filter((c) => visibles.some((p) => idsDe(p).has(c.id)))
    expect(conLocales.length).toBeGreaterThan(0)
    expect(deCategoria.map((p) => p.href).sort()).toEqual(
      conLocales.map((c) => ruta(c.slug[idioma])).sort(),
    )
  })

  it('la descripción dice la cantidad de locales y de zonas, sin "0" ni plurales de uno', () => {
    for (const categoria of conLocales) {
      const pagina = de(idioma, ruta(categoria.slug[idioma]))
      expect(pagina.description, categoria.id).not.toMatch(
        /\b0 (zonas?|areas?)|\b1 (lugares|places|zonas|areas)\b/,
      )
      // Con un solo local la descripción habla en singular y no lleva cifra (ver crecimiento.test.ts).
      const n = visibles.filter((p) => idsDe(p).has(categoria.id)).length
      expect(pagina.description, categoria.id).toMatch(
        n === 1 ? /el lugar|find the place/i : /\b\d+ (lugares?|places?)\b/,
      )
    }
  })

  it('una categoría sin locales no tiene página', () => {
    const vacias = data.categories.filter((c) => !conLocales.includes(c))
    expect(vacias.length).toBeGreaterThan(0)
    for (const categoria of vacias) {
      expect(() => de(idioma, ruta(categoria.slug[idioma]))).toThrow()
    }
  })

  it('el título es siempre "{categoría} en Zibatá · Visit Zibatá", sin los giros', () => {
    const rapida = data.categories.find((c) => c.slug.es === 'hamburguesas')
    const pagina = de(idioma, ruta(rapida?.slug[idioma] ?? ''))
    expect(pagina.title).toBe(
      idioma === 'es'
        ? 'Comida Rápida en Zibatá · Visit Zibatá'
        : 'Fast Food in Zibatá · Visit Zibatá',
    )
    for (const p of todas.filter((x) => x.href.startsWith(ruta('')))) {
      expect(p.title, p.href).toMatch(/ (en|in) Zibatá · Visit Zibatá$/)
      expect(p.title.length, p.href).toBeLessThanOrEqual(60)
    }
  })

  it('cada una lista exactamente los locales de su categoría, con el mismo criterio que el filtro', () => {
    for (const categoria of conLocales) {
      const pagina = de(idioma, ruta(categoria.slug[idioma]))
      const enPagina = [
        ...(pagina.contenido ?? '').matchAll(/<a href="[^"]*\/(?:lugar|place)\/([a-z0-9-]+)"/g),
      ]
        .map((m) => m[1])
        .sort()
      const esperados = visibles
        .filter((p) => idsDe(p).has(categoria.id))
        .map((p) => p.slug)
        .sort()
      expect(enPagina, categoria.id).toEqual(esperados)
    }
  })

  it('título, descripción y h1 dicen la categoría; el título no se repite en el sitio', () => {
    const titulos = new Set(todas.map((p) => p.title))
    expect(titulos.size).toBe(todas.length)
    for (const categoria of conLocales) {
      const pagina = de(idioma, ruta(categoria.slug[idioma]))
      const etiqueta =
        NOMBRE_LARGO[idioma][categoria.id] ?? categoria.label[idioma] ?? categoria.label.es
      expect(pagina.title).toContain(etiqueta)
      expect(pagina.description).toContain(etiqueta)
      expect(pagina.contenido).toContain(`<h1>${etiqueta.replace(/&/g, '&amp;')}`)
      expect(pagina.description.length).toBeGreaterThan(40)
      expect(pagina.description.length).toBeLessThanOrEqual(160)
    }
  })

  it('solo dicen lo que dicen los datos: ningún "abierto ahora" ni horario', () => {
    for (const pagina of deCategoria) {
      expect(`${pagina.description} ${pagina.contenido}`).not.toMatch(
        /abiert[oa]s? ahora|open now|<dl>/i,
      )
    }
  })

  it('la cifra de la descripción es el número de locales de la lista', () => {
    for (const categoria of conLocales) {
      const pagina = de(idioma, ruta(categoria.slug[idioma]))
      const n = visibles.filter((p) => idsDe(p).has(categoria.id)).length
      // Con uno solo la descripción dice "el lugar" y no cuenta (ver crecimiento.test.ts).
      if (n === 1) continue
      expect(pagina.description).toMatch(new RegExp(`(?<![0-9])${n} (lugares|places)`))
    }
  })

  it('se llega a cada una desde la portada, desde las zonas donde hay y desde las fichas que son suyas', () => {
    const portada = de(idioma, idioma === 'es' ? '/es' : '/en')
    for (const categoria of conLocales) {
      const destino = ruta(categoria.slug[idioma])
      expect(portada.contenido, `portada -> ${destino}`).toContain(`href="${destino}"`)
    }
    // Una categoría sin locales no se enlaza desde ningún sitio: no hay a dónde llevar.
    for (const categoria of data.categories.filter((c) => !conLocales.includes(c))) {
      expect(portada.contenido).not.toContain(`href="${ruta(categoria.slug[idioma])}"`)
    }
    for (const place of visibles) {
      const pagina = ficha(idioma, place.slug)
      for (const categoria of data.categories) {
        const destino = ruta(categoria.slug[idioma])
        expect(pagina.contenido?.includes(`href="${destino}"`), `${place.slug} ${destino}`).toBe(
          idsDe(place).has(categoria.id),
        )
      }
    }
    for (const plaza of zonasActivas) {
      const pagina = de(
        idioma,
        idioma === 'es' ? `/es/zona/${plaza.slug}` : `/en/area/${plaza.slug}`,
      )
      for (const categoria of data.categories) {
        const hay = visibles.some((p) => p.plazaId === plaza.id && idsDe(p).has(categoria.id))
        expect(
          pagina.contenido?.includes(`href="${ruta(categoria.slug[idioma])}"`),
          `${plaza.slug} ${categoria.id}`,
        ).toBe(hay)
      }
    }
  })

  it('los enlaces a categorías van en un data-nosnippet: son una vía, no el contenido de la ficha', () => {
    const f = ficha(idioma, data.places[0]?.slug ?? '')
    expect(f.contenido).toMatch(
      /<div data-nosnippet><h2>[^<]+<\/h2><ul><li><a href="[^"]*\/(?:categoria|category)\//,
    )
  })
})

describe('los locales ocultos', () => {
  it('no generan ficha ni entrada en el sitemap', () => {
    const base = data.places[0]
    if (!base) throw new Error('El dataset de prueba no tiene locales')
    const oculto: Place = {
      ...base,
      id: 'oculto-de-prueba',
      slug: 'oculto-de-prueba',
      active: false,
    }
    const conOculto = { ...data, places: [...data.places, oculto] }
    const generadas = pagesFor('es', conOculto, '/', absoluta)
    expect(generadas.some((pagina) => pagina.href === '/es/lugar/oculto-de-prueba')).toBe(false)
  })

  it('tampoco cuentan en las páginas de categoría ni se enlazan desde ellas', () => {
    const visible = lugarPrueba({ id: 'visible-de-prueba', slug: 'visible-de-prueba' })
    const oculto = lugarPrueba({ id: 'oculto-de-prueba', slug: 'oculto-de-prueba', active: false })
    const paginas = paginasDe('es', [visible, oculto])
    const categoria = paginas.find((pagina) => /\/categoria\//.test(pagina.href))
    expect(categoria?.contenido).toContain('visible-de-prueba')
    expect(categoria?.contenido).not.toContain('oculto-de-prueba')
  })
})

describe('las páginas de categoría en los dos idiomas', () => {
  const conLocales = data.categories.filter((c) =>
    visibles.some((p) => p.giros.some((g) => c.giros.some((g2) => g2.id === g))),
  )

  it('ocupan la misma posición, que es lo que empareja las hreflang', () => {
    const posiciones = (idioma: Idioma) =>
      paginas[idioma]
        .map((p, i) => [p.href, i] as const)
        .filter(([href]) => /^\/(en\/category|es\/categoria)\//.test(href))
        .map(([, i]) => i)
    expect(posiciones('es')).toEqual(posiciones('en'))
    expect(posiciones('es').length).toBe(conLocales.length)
  })
})
