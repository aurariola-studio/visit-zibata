/**
 * Las páginas de categoría, sin plataforma: qué locales entran en cada una y cómo se dicen.
 *
 * Una categoría reúne a los locales que tienen alguno de sus giros. Es la misma regla que aplica el
 * filtro de la aplicación (`categoriesOf` en features/filters/filters.ts), a propósito: la página de
 * una categoría tiene que listar lo mismo que se ve al elegir su cápsula.
 *
 * Todo sale de los datos. No hay "abierto ahora" (el HTML se genera una vez por despliegue) ni cifras
 * de los locales que el dato no trae.
 *
 * Vive en `src/lib` y no en `scripts/build` desde que la interfaz lo necesita: el título de la
 * pestaña de una categoría se calcula en el navegador con la misma regla que el HTML servido, y dos
 * copias de esta regla acabarían diciendo cosas distintas.
 */
import type { MessageKey, TodosLosMensajes } from '../i18n/es.ts'
import type { Category, Giro, Place } from '../types/domain.ts'

/** Las categorías de un local, sin repetir y en el orden en que aparecen sus giros. */
export function categoriasDe(
  place: Place,
  categoryOfGiro: ReadonlyMap<string, Category>,
): Category[] {
  const vistas = new Set<string>()
  const resultado: Category[] = []
  for (const giro of place.giros) {
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
  [K in MessageKey]: TodosLosMensajes[K] extends string ? K : never
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

/** La etiqueta completa de la categoría, la que va en el título y en el nombre de la página. */
export function etiquetaDeCategoria(
  categoria: Category,
  idioma: 'es' | 'en',
  traducir: Traductor,
): string {
  const clave = NOMBRES[categoria.id as keyof typeof NOMBRES]
  return clave ? traducir(clave) : (categoria.label[idioma] ?? categoria.label.es)
}

/**
 * Giros que son solo el adjetivo. En el filtro se leen cortos ("Italiana"); en la descripción de una
 * ficha se leen completos ("Comida Italiana"), igual que en la página de su categoría.
 *
 * Al añadir un giro de esta clase hay que sumarlo aquí y su nombre a los dos catálogos de i18n; si
 * no, la ficha y la página de la categoría lo dirán corto.
 */
const GIROS_ADJETIVOS = {
  'cocina-italiana': 'italiana',
  'cocina-internacional': 'internacional',
  'cocina-mexicana': 'mexicana',
  'cocina-asiatica': 'asiatica',
  saludable: 'saludable',
} as const satisfies Record<string, keyof typeof NOMBRES>

/** La etiqueta de un giro para leerla en una frase: completa si es solo el adjetivo. */
export function etiquetaDeGiro(
  giro: Pick<Giro, 'id' | 'label'>,
  idioma: 'es' | 'en',
  traducir: Traductor,
): string {
  const categoria = GIROS_ADJETIVOS[giro.id as keyof typeof GIROS_ADJETIVOS]
  return categoria ? traducir(NOMBRES[categoria]) : (giro.label[idioma] ?? giro.label.es)
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
