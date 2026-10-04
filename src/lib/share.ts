/**
 * Compartir un lugar: una sola URL por lugar, y el texto con los datos que ya publica la guía.
 *
 * La URL se arma a propósito **sin** el estado de la vista. El hash de la aplicación arrastra la
 * categoría activa (`#/lugar/tomassa?categoria=pizza`), así que compartir "lo que tengo en
 * pantalla" produciría una URL distinta por cada filtro desde el que alguien comparta el mismo
 * lugar. Que todos los enlaces entrantes apunten a la misma URL es lo único que este botón aporta
 * de verdad al SEO.
 *
 * Lo que NO aporta, para no prometerlo: las rutas viven en el hash y los rastreadores no indexan
 * fragmentos, de modo que `#/lugar/tomassa` es para Google la misma URL que la portada. Que cada
 * ficha se indexe por separado depende de mover el enrutado fuera del hash (ver docs/MARCA.md).
 */
import { SITE_URL } from '../config/site.ts'

export interface SharePayload {
  title: string
  text: string
  url: string
}

/**
 * Resultado de intentar compartir. `cancelled` es que la persona cerró la hoja del sistema: no es
 * un fallo y no debe avisar de nada.
 */
export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'unsupported'

/** Raíz pública: la de compilación si la hay, y si no la del navegador, siempre con barra final. */
function siteRoot(): string {
  const root = SITE_URL || `${window.location.origin}${window.location.pathname}`
  return root.replace(/\/?$/, '/')
}

/** La URL canónica de un lugar: la misma desde cualquier filtro, idioma o pantalla. */
export function placeUrl(slug: string): string {
  return `${siteRoot()}#/lugar/${slug}`
}

/**
 * Hay con qué compartir. Si el navegador no trae ni la hoja del sistema ni el portapapeles, el
 * botón no se dibuja: es preferible que no esté a que esté y no haga nada.
 */
export function canShare(): boolean {
  if (typeof navigator === 'undefined') return false
  return typeof navigator.share === 'function' || Boolean(navigator.clipboard)
}

/**
 * Hoja del sistema si la hay, y si no al portapapeles.
 *
 * Se llama directo desde el gesto que la dispara: `navigator.share` exige activación del usuario y
 * esperar cualquier otra cosa antes la invalidaría.
 */
export async function share(payload: SharePayload): Promise<ShareOutcome> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(payload)
      return 'shared'
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled'
      // Cualquier otro fallo (un navegador que declara la API y no la implementa, o la niega por
      // permisos) cae al portapapeles en vez de dejar al usuario sin nada.
    }
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(payload.url)
      return 'copied'
    } catch {
      return 'unsupported'
    }
  }
  return 'unsupported'
}
