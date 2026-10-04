/**
 * Los giros de un local y el dibujo que le toca. Hay dos niveles: los **principales**, que definen
 * el local y llevan icono en la lista y en la ilustración redonda, y los **secundarios**, lo demás
 * que se vende ahí, que en la lista van solo como texto y enseñan su dibujo en la ficha. Para
 * filtrar, buscar y ordenar los dos niveles valen igual: el nivel es peso visual, no visibilidad.
 */
import type { Catalog, Giro, Place } from '../../types/domain.ts'

/** Los giros principales, en su orden, resueltos contra el catálogo. */
export function girosOf(place: Place, catalog: Catalog): Giro[] {
  return resolve(place.giros, catalog)
}

/** Los secundarios, en su orden. */
export function girosSecundariosOf(place: Place, catalog: Catalog): Giro[] {
  return resolve(place.secundarios, catalog)
}

/** Todos los giros, principales primero: lo que filtra, busca y ordena. */
export function allGiroIds(place: Place): string[] {
  return [...place.giros, ...place.secundarios]
}

/**
 * Icono de un lugar donde solo cabe uno: el de su primer giro principal. El giro general comparte
 * dibujo con su categoría, así que una hamburguesería enseña la hamburguesa y una parrilla que hace
 * pizzas enseña la llama, no el promedio de nada.
 */
export function placeIconName(place: Place, catalog: Catalog): string {
  return girosOf(place, catalog)[0]?.icon ?? 'utensils-crossed'
}

function resolve(ids: readonly string[], catalog: Catalog): Giro[] {
  return ids
    .map((id) => catalog.giroById.get(id))
    .filter((giro): giro is Giro => giro !== undefined)
}
