import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Locator, Page } from '@playwright/test'

/**
 * Conteos tomados del dataset publicado, no escritos a mano: los locales cambian cada vez que se
 * verifica la guía y las pruebas no deberían romperse por una alta o una baja, solo por un fallo.
 */
const dataPath = (file: string) =>
  fileURLToPath(new URL(`../../data/commercial/${file}`, import.meta.url))
const read = <T>(file: string): T => JSON.parse(readFileSync(dataPath(file), 'utf8')) as T

interface DatasetPlace {
  id: string
  slug: string
  plazaId: string
  name: string
  giros: string[]
  googleMapsUri: string | null
  active: boolean
  description: { es: string } | null
  links: Record<string, string | null | undefined>
  hours: unknown
  phone: string | null
  location: unknown
}

interface DatasetPlaza {
  id: string
  slug: string
  name: string
  active: boolean
  coordinates: { lat: number; lng: number }
  address: string | null
  description: { es: string } | null
}

interface DatasetCategory {
  id: string
  slug: { es: string; en: string }
  label: { es: string }
  giros: { id: string }[]
}

const dataset = {
  places: read<{ places: DatasetPlace[] }>('places.json').places,
  plazas: read<{ plazas: DatasetPlaza[] }>('plazas.json').plazas,
  categories: read<{ categories: DatasetCategory[] }>('categories.json').categories,
}

/** La categoría de cada giro, que es de donde sale en qué pastillas aparece un local. */
const categoryOfGiro = new Map(
  dataset.categories.flatMap((category) =>
    category.giros.map((giro) => [giro.id, category.id] as const),
  ),
)

/** Nº de lugares publicados en una plaza, por su nombre visible. */
export function placesInPlaza(name: string): number {
  const plaza = dataset.plazas.find((candidate) => candidate.name === name)
  if (!plaza) throw new Error(`No hay ninguna plaza llamada "${name}" en el dataset`)
  return dataset.places.filter((place) => place.plazaId === plaza.id).length
}

export const activePlazas = () => dataset.plazas.filter((plaza) => plaza.active)

/** Las que aún no abrieron: en la hoja van detrás, apagadas. */
export const inactivePlazas = () => dataset.plazas.filter((plaza) => !plaza.active)

/*
 * Los ejemplares. Las pruebas no nombran un local ni una zona de la guía: borrar o cambiar la dirección de
 * uno desde el panel no puede poner en rojo la PR que abre el propio panel. Cada ejemplar sale de una
 * regla sobre el dataset, y a igualdad manda el id para que la elección sea estable entre ejecuciones.
 */
const deMenorId = <T extends { id: string }>(filas: T[]): T[] =>
  [...filas].sort((a, b) => a.id.localeCompare(b.id))
const conteoDeLocales = (plaza: DatasetPlaza) =>
  dataset.places.filter((place) => place.plazaId === plaza.id && place.active).length
const unico = <T>(valor: T | undefined, que: string): T => {
  if (valor === undefined) throw new Error(`El dataset no tiene ${que}`)
  return valor
}

/** La zona activa con más locales: la que nunca debe desaparecer del mapa ni de las listas. */
export const ZONA_GRANDE: DatasetPlaza = unico(
  deMenorId(dataset.plazas.filter((plaza) => plaza.active)).sort(
    (a, b) => conteoDeLocales(b) - conteoDeLocales(a),
  )[0],
  'ninguna zona activa',
)

/** Otra zona activa con locales, distinta de la grande: la que se abre cuando hace falta una segunda. */
export const ZONA_B: DatasetPlaza = unico(
  deMenorId(
    dataset.plazas.filter(
      (plaza) => plaza.active && plaza.id !== ZONA_GRANDE.id && conteoDeLocales(plaza) > 0,
    ),
  ).sort((a, b) => conteoDeLocales(b) - conteoDeLocales(a))[0],
  'una segunda zona activa con locales',
)

/** La tercera zona activa por número de locales. */
export const ZONA_C: DatasetPlaza = unico(
  deMenorId(
    dataset.plazas.filter(
      (plaza) =>
        plaza.active &&
        plaza.id !== ZONA_GRANDE.id &&
        plaza.id !== ZONA_B.id &&
        conteoDeLocales(plaza) > 0,
    ),
  ).sort((a, b) => conteoDeLocales(b) - conteoDeLocales(a))[0],
  'una tercera zona activa con locales',
)

/** Los locales activos de una zona, por id. */
export const localesDe = (zona: DatasetPlaza): DatasetPlace[] =>
  deMenorId(dataset.places.filter((place) => place.active && place.plazaId === zona.id))

/** Un local activo de la zona grande. */
export const LOCAL: DatasetPlace = unico(
  deMenorId(dataset.places.filter((place) => place.active && place.plazaId === ZONA_GRANDE.id))[0],
  'ningún local activo en la zona grande',
)

/** Un local activo de la segunda zona, con enlace de Google Maps (las pruebas abren "Cómo llegar"). */
export const LOCAL_B: DatasetPlace = unico(
  deMenorId(
    dataset.places.filter(
      (place) => place.active && place.plazaId === ZONA_B.id && place.googleMapsUri,
    ),
  )[0],
  'ningún local activo con enlace de Maps en la segunda zona',
)

/** El slug en español de la primera categoría de un local, para `?categoria=`. */
export const categoriaDe = (place: DatasetPlace): { id: string; slug: string; label: string } => {
  const id = unico(categoriesOf(place)[0], `categoría para ${place.id}`)
  const categoria = unico(
    dataset.categories.find((candidata) => candidata.id === id),
    `la categoría ${id}`,
  )
  return { id, slug: categoria.slug.es, label: categoria.label.es }
}

/**
 * Los locales de una categoría que dicen `palabra` en su nombre o su descripción: lo que una búsqueda de esa
 * palabra debe poner primero. La relevancia se prueba contra el dato, no contra un nombre fijo.
 */
export const queDicen = (categoriaId: string, palabra: string): DatasetPlace[] =>
  dataset.places.filter(
    (place) =>
      place.active &&
      categoriesOf(place).includes(categoriaId) &&
      new RegExp(palabra, 'i').test(`${place.name} ${place.description?.es ?? ''}`),
  )

/** Un local activo con exactamente dos giros: la frase de compartir los une con "y". */
export const LOCAL_DOS_GIROS: DatasetPlace = unico(
  deMenorId(dataset.places.filter((place) => place.active && place.giros.length === 2))[0],
  'ningún local activo con dos giros',
)

/** El local activo con más datos rellenos: el que enseña todos los bloques de la ficha. */
export const LOCAL_COMPLETO: DatasetPlace = (() => {
  const puntos = (place: DatasetPlace) =>
    [
      place.description,
      place.hours,
      place.phone,
      place.googleMapsUri,
      place.location,
      ...Object.values(place.links ?? {}),
    ].filter(Boolean).length
  return unico(
    deMenorId(dataset.places.filter((place) => place.active)).sort(
      (a, b) => puntos(b) - puntos(a),
    )[0],
    'ningún local activo',
  )
})()

/** Tres locales activos en tres zonas distintas: lo que hace falta para "has estrenado tres zonas". */
export const TRES_LOCALES: [DatasetPlace, DatasetPlace, DatasetPlace] = [
  LOCAL,
  unico(localesDe(ZONA_B)[0], 'un local en la segunda zona'),
  unico(localesDe(ZONA_C)[0], 'un local en la tercera zona'),
]

/** Un local activo con enlace de WhatsApp, y el número en la forma de `wa.me` (solo dígitos). */
export const LOCAL_CON_WHATSAPP: { place: DatasetPlace; numero: string } = (() => {
  const place = unico(
    deMenorId(
      dataset.places.filter((candidato) => candidato.active && candidato.links?.whatsapp),
    )[0],
    'ningún local activo con WhatsApp',
  )
  return { place, numero: (place.links.whatsapp ?? '').replace(/\D/g, '') }
})()

/**
 * Locales cuyo nombre lleva un carácter especial (eñe, diéresis, tilde, `&`): para comprobar que llegan
 * enteros al HTML. Uno por clase, de las que haya en la guía.
 */
export const CON_ESPECIALES: DatasetPlace[] = (() => {
  const clases = [/ñ/i, /[äëïöü]/i, /[áéíóú]/i, /&/]
  const activos = deMenorId(dataset.places.filter((place) => place.active))
  return clases.flatMap((clase) => {
    const place = activos.find((candidato) => clase.test(candidato.name))
    return place ? [place] : []
  })
})()

/** Dos locales activos con el mismo nombre en zonas distintas (una cadena): sus títulos llevan la zona. */
export const CADENA: [DatasetPlace, DatasetPlace] = (() => {
  const activos = deMenorId(dataset.places.filter((place) => place.active))
  for (const place of activos) {
    const otro = activos.find(
      (candidato) =>
        candidato.id !== place.id &&
        candidato.name === place.name &&
        candidato.plazaId !== place.plazaId,
    )
    if (otro) return [place, otro]
  }
  throw new Error('El dataset no tiene dos locales con el mismo nombre en zonas distintas')
})()

/** Un local activo cuyo nombre no se repite en toda la guía: su título es solo `{nombre} · Visit Zibatá`. */
export const LOCAL_UNICO: DatasetPlace = unico(
  deMenorId(dataset.places.filter((place) => place.active)).find(
    (place) => dataset.places.filter((otro) => otro.name === place.name).length === 1,
  ),
  'ningún local con nombre único',
)

/** Un local activo para buscar por sus tres primeras letras (nombre que empieza por letras sin símbolos). */
export const LOCAL_BUSCABLE: DatasetPlace = unico(
  deMenorId(dataset.places.filter((place) => place.active)).find((place) =>
    /^[a-z]{3}/i.test(place.name),
  ),
  'ningún local activo con nombre que empiece por tres letras',
)

/** La zona activa más cercana a otra: dos marcadores que se acercan o se alejan con la cámara. */
export const cercanaA = (zona: DatasetPlaza): DatasetPlaza => {
  const distancia = (a: DatasetPlaza, b: DatasetPlaza) =>
    Math.hypot(a.coordinates.lat - b.coordinates.lat, a.coordinates.lng - b.coordinates.lng)
  return unico(
    deMenorId(dataset.plazas.filter((plaza) => plaza.active && plaza.id !== zona.id)).sort(
      (a, b) => distancia(a, zona) - distancia(b, zona),
    )[0],
    'otra zona activa',
  )
}

/**
 * La categoría con más locales dentro de la zona grande (al menos dos, para que el recuento sea plural) y
 * uno de esos locales: lo que hace falta para filtrar una zona por una categoría que sí tiene.
 */
export const CATEGORIA_EN_ZONA: {
  id: string
  slug: string
  label: string
  local: DatasetPlace
} = (() => {
  const locales = localesDe(ZONA_GRANDE)
  const cuenta = new Map<string, number>()
  for (const place of locales) {
    for (const id of new Set(categoriesOf(place))) cuenta.set(id, (cuenta.get(id) ?? 0) + 1)
  }
  const [id] = unico(
    [...cuenta.entries()]
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0],
    'una categoría con dos locales en la zona grande',
  )
  const categoria = unico(
    dataset.categories.find((candidata) => candidata.id === id),
    `la categoría ${id}`,
  )
  const local = unico(
    locales.find((place) => categoriesOf(place).includes(id)),
    `un local de ${id}`,
  )
  return { id, slug: categoria.slug.es, label: categoria.label.es, local }
})()

/** La zona de un local. */
export const plazaDe = (place: DatasetPlace): DatasetPlaza =>
  unico(
    dataset.plazas.find((plaza) => plaza.id === place.plazaId),
    `la zona de ${place.id}`,
  )

interface CategoriaDeEjemplo {
  id: string
  slug: string
  slugEn: string
  label: string
}

/** Las categorías por número de locales activos, de más a menos (a igualdad, por id). */
const categoriasPorTamano = (): CategoriaDeEjemplo[] => {
  const conteo = (id: string) =>
    dataset.places.filter((place) => place.active && categoriesOf(place).includes(id)).length
  return [...dataset.categories]
    .sort((a, b) => conteo(b.id) - conteo(a.id) || a.id.localeCompare(b.id))
    .map((categoria) => ({
      id: categoria.id,
      slug: categoria.slug.es,
      slugEn: categoria.slug.en,
      label: categoria.label.es,
    }))
}

/** La categoría con más locales activos: la que nunca debe quedarse sin página. */
export const CATEGORIA_GRANDE: CategoriaDeEjemplo = unico(
  categoriasPorTamano()[0],
  'ninguna categoría',
)

/** La segunda categoría por tamaño: para las pruebas que pasan de una categoría a otra. */
export const CATEGORIA_B: CategoriaDeEjemplo = unico(
  categoriasPorTamano()[1],
  'una segunda categoría',
)

/** Texto literal dentro de una expresión regular. */
export const esc = (texto: string): string => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Los `n` locales de nombre más largo: el peor caso para un título que debe caber en su columna. */
export const longestPlaces = (n: number) =>
  [...dataset.places].sort((a, b) => b.name.length - a.name.length).slice(0, n)

/** Las `n` zonas activas de nombre más largo. */
export const longestPlazas = (n: number) =>
  [...activePlazas()].sort((a, b) => b.name.length - a.name.length).slice(0, n)

/** Las categorías en las que aparece un local: las de todos sus giros. */
function categoriesOf(place: DatasetPlace): string[] {
  return place.giros.map((giro) => categoryOfGiro.get(giro)).filter((id) => id !== undefined)
}

/** Nº de lugares de una categoría (opcionalmente dentro de una plaza), leído del dataset. */
export function placesInCategory(categoryId: string, plazaName?: string): number {
  const plazaId = plazaName
    ? dataset.plazas.find((plaza) => plaza.name === plazaName)?.id
    : undefined
  return dataset.places.filter(
    (place) => categoriesOf(place).includes(categoryId) && (!plazaId || place.plazaId === plazaId),
  ).length
}

/** Un local del dataset, por id: para no escribir a mano datos que cambian al verificarlos. */
export function placeById(id: string): DatasetPlace {
  const place = dataset.places.find((candidate) => candidate.id === id)
  if (!place) throw new Error(`No hay ningún local con id "${id}" en el dataset`)
  return place
}

/**
 * La ruta con el prefijo de su idioma. Las pruebas escriben el español como siempre (`zona/condesa`,
 * `lugar/tomassa?categoria=x`, vacío para la portada) y el inglés con su `en/`; el español se abre en su
 * árbol (`es/zona/condesa`). Las direcciones sin prefijo, que ahora redirige el Worker, las cubre
 * `es-ruta.spec.ts` con `page.goto` directo.
 */
export function rutaConIdioma(path: string): string {
  if (/^(?:es|en)(?:[/?]|$)/.test(path)) return path
  if (path === '') return 'es'
  return path.startsWith('?') ? `es${path}` : `es/${path}`
}

/**
 * Abre la app sin el tutorial, salvo que se pida lo contrario.
 *
 * `path` va relativo a la base (`zona/condesa`, no `/zona/condesa`), que es lo que hace que la
 * suite valga igual publicada en la raíz que en un subdirectorio.
 */
export async function openApp(page: Page, { path = '', onboarding = false } = {}): Promise<void> {
  if (!onboarding) {
    await page.addInitScript(() => window.localStorage.setItem('zibata:onboarding-visto', '1'))
  }
  await page.goto(`./${rutaConIdioma(path)}`)
}

/** Espera a que el mapa haya cargado (los marcadores de plazas solo aparecen con el mapa listo). */
export async function waitForMap(page: Page): Promise<void> {
  await page.waitForFunction(
    () => document.querySelectorAll('button[data-mode]').length > 0,
    null,
    {
      timeout: 60_000,
    },
  )
}

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 900

/**
 * Espera a que la hoja inferior deje de moverse. Su alto se anima (420 ms) y, con la máquina cargada,
 * medir o pulsar a media animación hace que el gesto caiga fuera del asa. No oculta ningún fallo del
 * producto: solo evita medir un elemento que todavía se mueve.
 */
export async function waitForSheet(page: Page): Promise<void> {
  let previous = -1
  for (let attempt = 0; attempt < 20; attempt++) {
    const height = await page.evaluate(
      () => document.querySelector('section[data-panel]')?.getBoundingClientRect().height ?? 0,
    )
    if (height > 0 && height === previous) return
    previous = height
    await page.waitForTimeout(150)
  }
}

/** El panel de lugares: lateral en escritorio, hoja inferior en móvil (misma región accesible). */
export const panel = (page: Page) =>
  page
    .getByRole('region', { name: 'Información de lugares' })
    .or(page.getByRole('complementary', { name: 'Información de lugares' }))

/**
 * Elige una zona en la lista de zonas. `null` deja "Todas las zonas".
 *
 * La lista es de la app y no un `select`: se abre con el botón y cada opción es un `option` del
 * listbox, así que se elige como cualquier otra opción y se espera a que la lista se cierre.
 */
export async function elegirZona(page: Page, nombre: string | null): Promise<void> {
  await page.getByRole('button', { name: 'Filtrar por zona' }).click()
  const lista = page.getByRole('listbox', { name: 'Filtrar por zona' })
  await lista.waitFor()
  await lista.getByRole('option', { name: nombre ?? 'Todas las zonas', exact: true }).click()
  await lista.waitFor({ state: 'detached' })
}

/** La zona que muestra el botón ahora mismo. */
export const zonaElegida = (page: Page) =>
  page.getByRole('button', { name: 'Filtrar por zona' }).innerText()

/**
 * Marcador de una zona tal como lo alcanzaría una persona. Cuando el espacio no da ni para el punto
 * (pantallas muy estrechas con la vista alejada) se acerca la cámara con el selector de zonas, igual
 * que haría alguien que la busca, y se cierra el panel para dejar el mapa como estaba.
 */
export async function plazaMarker(page: Page, name: string): Promise<Locator> {
  const marker = page.locator(`button[data-mode][aria-label^="${name}, "]`)
  await marker.waitFor({ state: 'attached' })
  for (let attempt = 0; attempt < 3; attempt++) {
    // La colocación de marcadores se estabiliza cuando termina el movimiento de la cámara.
    await page.waitForTimeout(1200)
    if ((await marker.getAttribute('data-mode')) !== 'hidden') return marker
    await elegirZona(page, name)
    await page.waitForTimeout(1500)
    await page
      .getByRole('button', { name: 'Cerrar panel' })
      .first()
      .click({ timeout: 5000 })
      .catch(() => {})
  }
  throw new Error(`La plaza "${name}" no llega a tener marcador propio`)
}

/**
 * El mapa es el realista, pero se apaga con renderizado por software, y Playwright dibuja con SwiftShader
 * (sin GPU). Para probar el realismo, la página cree que hay una GPU de verdad: el nombre del renderizador
 * es lo único que se cambia, el dibujo sigue siendo en software.
 */
export async function conGpu(page: Page): Promise<void> {
  await page.addInitScript(() => {
    for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
      const original = proto.getParameter
      proto.getParameter = function (this: WebGLRenderingContext, parametro: number) {
        // 0x9246 es UNMASKED_RENDERER_WEBGL
        return parametro === 0x9246
          ? 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11)'
          : original.call(this, parametro)
      }
    }
  })
}
