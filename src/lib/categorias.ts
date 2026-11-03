/**
 * Las páginas de categoría, sin plataforma: qué locales entran en cada una y cómo se dicen.
 *
 * Una categoría reúne a los locales cuyo giro, principal o secundario, es suyo. Es la misma regla que
 * aplica el filtro de la aplicación (`categoriesOf` en features/filters/filters.ts), a propósito: la
 * página de una categoría tiene que listar lo mismo que se ve al elegir su cápsula.
 *
 * Todo sale de los datos. No hay "abierto ahora" (el HTML se genera una vez por despliegue) ni cifras
 * de los locales que el dato no trae.
 *
 * Vive en `src/lib` y no en `scripts/build` desde que la interfaz lo necesita: el título de la
 * pestaña de una categoría se calcula en el navegador con la misma regla que el HTML servido, y dos
 * copias de esta regla acabarían diciendo cosas distintas.
 */
import type { MessageKey, Messages } from '../i18n/es.ts'
import type { Category, Place } from '../types/domain.ts'

/** Las categorías de un local, sin repetir y en el orden en que aparecen sus giros. */
export function categoriasDe(
  place: Place,
  categoryOfGiro: ReadonlyMap<string, Category>,
): Category[] {
  const vistas = new Set<string>()
  const resultado: Category[] = []
  for (const giro of [...place.giros, ...(place.secundarios ?? [])]) {
    const categoria = categoryOfGiro.get(giro)
    if (categoria && !vistas.has(categoria.id)) {
      vistas.add(categoria.id)
      resultado.push(categoria)
    }
  }
  return resultado
}

/** Los locales de cada categoría, en el orden del dataset. Una categoría sin locales no aparece. */
export function lugaresPorCategoria(
  places: readonly Place[],
  categoryOfGiro: ReadonlyMap<string, Category>,
): Map<string, Place[]> {
  const porCategoria = new Map<string, Place[]>()
  for (const place of places) {
    for (const categoria of categoriasDe(place, categoryOfGiro)) {
      const lista = porCategoria.get(categoria.id) ?? []
      lista.push(place)
      porCategoria.set(categoria.id, lista)
    }
  }
  return porCategoria
}

/** Un mensaje que puede venir en singular y plural ({one, other}) o ya como texto. */
export type Mensaje = string | { one: string; other: string }

/** Traduce una clave del catálogo, con las variables que pida el texto. */
export type Traductor = (clave: ClaveTexto, vars?: Record<string, string>) => string

/** Solo las claves que son texto: las de plural se resuelven con `conCantidad`. */
type ClaveTexto = {
  [K in MessageKey]: Messages[K] extends string ? K : never
}[MessageKey]

/**
 * Las categorías que en el filtro llevan solo el adjetivo ("Italiana", "Saludable") y en el título
 * y la descripción se leen completas ("Comida Italiana").
 */
const NOMBRES = {
  mexicana: 'seo.category.nombre.mexicana',
  italiana: 'seo.category.nombre.italiana',
  asiatica: 'seo.category.nombre.asiatica',
  saludable: 'seo.category.nombre.saludable',
  casera: 'seo.category.nombre.casera',
  internacional: 'seo.category.nombre.internacional',
} as const satisfies Record<string, MessageKey>

/** Con qué arranca la descripción: el artículo y el "mejor" que pide el género y el número. */
const GANCHOS = {
  'desayunos-y-cafe': 'seo.category.hook.desayunos-y-cafe',
  'tacos-y-antojitos': 'seo.category.hook.tacos-y-antojitos',
  mexicana: 'seo.category.hook.mexicana',
  'carnes-y-parrilla': 'seo.category.hook.carnes-y-parrilla',
  mariscos: 'seo.category.hook.mariscos',
  hamburguesas: 'seo.category.hook.hamburguesas',
  italiana: 'seo.category.hook.italiana',
  asiatica: 'seo.category.hook.asiatica',
  'entre-panes': 'seo.category.hook.entre-panes',
  saludable: 'seo.category.hook.saludable',
  'panaderia-y-reposteria': 'seo.category.hook.panaderia-y-reposteria',
  botanas: 'seo.category.hook.botanas',
  'postres-y-dulces': 'seo.category.hook.postres-y-dulces',
  bebidas: 'seo.category.hook.bebidas',
  internacional: 'seo.category.hook.internacional',
  casera: 'seo.category.hook.casera',
  bar: 'seo.category.hook.bar',
} as const satisfies Record<string, MessageKey>

/** La etiqueta completa de la categoría, la que va en el título y en el nombre de la página. */
export function etiquetaDeCategoria(
  categoria: Category,
  idioma: 'es' | 'en',
  traducir: Traductor,
): string {
  const clave = NOMBRES[categoria.id as keyof typeof NOMBRES]
  return clave ? traducir(clave) : (categoria.label[idioma] ?? categoria.label.es)
}

/** "los mejores Tacos y Antojitos", "la mejor Comida Italiana", "el mejor Bar". */
export function ganchoDeCategoria(
  categoria: Category,
  idioma: 'es' | 'en',
  traducir: Traductor,
): string {
  const clave = GANCHOS[categoria.id as keyof typeof GANCHOS]
  // Una categoría sin gancho propio se lee con el genérico, que sirve para cualquiera.
  return clave
    ? traducir(clave)
    : traducir('seo.category.hook', { nombre: etiquetaDeCategoria(categoria, idioma, traducir) })
}

export function conCantidad(mensaje: Mensaje, cantidad: number, idioma: string): string {
  const texto =
    typeof mensaje === 'string'
      ? mensaje
      : new Intl.PluralRules(idioma).select(cantidad) === 'one'
        ? mensaje.one
        : mensaje.other
  return texto.replace(/\{count\}/g, String(cantidad))
}

/** "A, B y C" / "A, B, and C", en el idioma de la página. */
export function lista(nombres: readonly string[], idioma: string): string {
  return new Intl.ListFormat(idioma, { style: 'long', type: 'conjunction' }).format(nombres)
}

/** Un giro con un solo local no representa a la categoría: no se nombra en el título. */
export const MIN_LOCALES_POR_GIRO = 2

const sinAcentos = (valor: string): string =>
  valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

/**
 * Los giros que de verdad hay en una categoría, de más a menos locales, sin los que la etiqueta ya
 * dice. Sirve para que el título nombre lo que la gente busca ("hamburguesas", "alitas") cuando la
 * etiqueta de la interfaz es más general ("Comida Rápida"). Todo sale de los datos.
 */
export function girosDeCategoria(
  categoria: Category,
  places: readonly Place[],
  idioma: 'es' | 'en',
): string[] {
  const etiqueta = sinAcentos(categoria.label[idioma] ?? categoria.label.es)
  const cuenta = new Map<string, number>()
  for (const place of places) {
    for (const giro of new Set([...place.giros, ...(place.secundarios ?? [])])) {
      cuenta.set(giro, (cuenta.get(giro) ?? 0) + 1)
    }
  }
  return categoria.giros
    .map((giro, orden) => ({
      texto: giro.label[idioma] ?? giro.label.es,
      veces: cuenta.get(giro.id) ?? 0,
      orden,
    }))
    .filter(({ texto, veces }) => {
      const normal = sinAcentos(texto)
      return (
        veces >= MIN_LOCALES_POR_GIRO && !etiqueta.includes(normal) && !normal.includes(etiqueta)
      )
    })
    .sort((a, b) => b.veces - a.veces || a.orden - b.orden)
    .map(({ texto }) => texto.toLocaleLowerCase(idioma))
}
