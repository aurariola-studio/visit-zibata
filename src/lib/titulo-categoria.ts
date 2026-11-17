/**
 * El título de una página de categoría, en un solo sitio.
 *
 * Lo usan el HTML servido (`scripts/build/prerender.ts`) y la pestaña del navegador cuando se navega
 * sin recargar. Tenerlo dos veces garantizaba que acabaran diciendo cosas distintas.
 *
 * Es siempre "{categoría} en Zibatá · Visit Zibatá": el nombre y dónde. Los giros ya no se nombran en el
 * título (antes, "Comida Rápida en Zibatá, hamburguesas y alitas"): la descripción cuenta el resto, y un
 * título corto es el mismo en todas las categorías.
 */
import type { Category } from '../types/domain.ts'
import { etiquetaDeCategoria, type Traductor } from './categorias.ts'

export function tituloDeCategoria(
  categoria: Category,
  idioma: 'es' | 'en',
  traducir: Traductor,
): string {
  return traducir('seo.title', {
    name: traducir('seo.category.name', {
      label: etiquetaDeCategoria(categoria, idioma, traducir),
    }),
  })
}
