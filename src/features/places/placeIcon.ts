/**
 * Los giros de un local y el dibujo que le toca, en el orden en que están escritos.
 *
 * No hay niveles: el primero es lo que define al local y decide el icono único de la ilustración
 * redonda y la cocina del marcado, y los demás suman. La tarjeta nombra los que caben con su icono y
 * cuenta el resto ("+N"), así que la posición ya dice qué manda sin una jerarquía aparte que
 * explicar.
 */
import type { Catalog, Giro, Place } from '../../types/domain.ts'

/** Los giros del local, en su orden, resueltos contra el catálogo. */
export function girosOf(place: Place, catalog: Catalog): Giro[] {
  return resolve(place.giros, catalog)
}

/** Los giros del local tal como los guarda el dato: lo que filtra, busca y ordena. */
export function allGiroIds(place: Place): string[] {
  return [...place.giros]
}

/**
 * Icono de un lugar donde solo cabe uno: el de su primer giro. El giro general comparte dibujo con su
 * categoría, así que una hamburguesería enseña la hamburguesa y una parrilla que hace pizzas enseña
 * la llama, no el promedio de nada.
 */
export function placeIconName(place: Place, catalog: Catalog): string {
  return girosOf(place, catalog)[0]?.icon ?? 'utensils-crossed'
}

function resolve(ids: readonly string[], catalog: Catalog): Giro[] {
  return ids
    .map((id) => catalog.giroById.get(id))
    .filter((giro): giro is Giro => giro !== undefined)
}
