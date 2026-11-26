/** "A 250 m de Plaza Zielo": lo que una tarjeta o una ficha dicen de un punto de interés en vez de su zona. */
import type { Catalog, Plaza } from '../types/domain.ts'

export function distancia(metros: number, locale: 'es' | 'en'): string {
  if (metros < 1000) return `${metros} m`
  const km = new Intl.NumberFormat(locale === 'es' ? 'es-MX' : 'en-US', {
    maximumFractionDigits: 1,
  }).format(metros / 1000)
  return `${km} km`
}

/** Las dos piezas de la frase, o nada si no hay zona abierta cerca o ya no existe. */
export function cercaniaDe(
  plaza: Plaza,
  catalog: Pick<Catalog, 'plazaById'>,
  locale: 'es' | 'en',
): { distancia: string; plaza: string } | null {
  const zona = plaza.cerca ? catalog.plazaById.get(plaza.cerca.plazaId) : undefined
  return plaza.cerca && zona
    ? { distancia: distancia(plaza.cerca.metros, locale), plaza: zona.name }
    : null
}
