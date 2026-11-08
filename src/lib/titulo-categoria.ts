/**
 * El título de una página de categoría, en un solo sitio.
 *
 * Lo usan el HTML servido (`scripts/build/prerender.ts`) y la pestaña del navegador cuando se navega
 * sin recargar. Tenerlo dos veces garantizaba que acabaran diciendo cosas distintas.
 */
import type { Locale } from '../i18n/index.ts'
import type { Category, Place } from '../types/domain.ts'
import { etiquetaDeCategoria, girosDeCategoria, lista, type Traductor } from './categorias.ts'

/** Por encima de este largo, el buscador corta el título. */
export const TOPE_TITULO = 65

export function tituloDeCategoria(
  categoria: Category,
  lugares: readonly Place[],
  idioma: Locale,
  traducir: Traductor,
): string {
  const etiqueta = etiquetaDeCategoria(categoria, idioma, traducir)
  const giros = girosDeCategoria(categoria, lugares, idioma).slice(0, 2)
  const conGiros = traducir('seo.title', {
    name: traducir('seo.category.title', { label: etiqueta, giros: lista(giros, idioma) }),
  })
  const sinGiros = traducir('seo.title', {
    name: traducir('seo.category.name', { label: etiqueta }),
  })
  // Solo si caben: cortado a media palabra sería peor que corto.
  return giros.length >= 2 && conGiros.length <= TOPE_TITULO ? conGiros : sinGiros
}
