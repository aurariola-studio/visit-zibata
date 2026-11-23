import type { Place } from '../types/domain.ts'

/**
 * La dirección de un local: la de su plaza más el lugar que ocupa dentro de ella, siempre en el mismo orden.
 * "Av. Paseo de las Pitahayas 55, Edificio A, Planta Baja, Locales 137 y 138, Zibatá".
 *
 * La ficha, el cuerpo que se sirve sin JavaScript y el marcado de Google leen esto y nada más, para que no
 * puedan contradecirse. La calle y el número no se guardan por local: son los de la plaza
 * (`PlazaSchema.address`, que termina en ", Zibatá" y una prueba lo vigila).
 */
const LOCALIDAD = ', Zibatá'

/** Solo las claves que usa este módulo, para que lo acepten a la vez la interfaz (`t`) y el build (su traductor). */
type Clave =
  | `place.unit.floor.${NonNullable<NonNullable<Place['unit']>['planta']>}`
  | 'place.unit.building'
  | 'place.unit.local'
  | 'place.unit.locales'
  | 'place.unit.island'
type Traducir = (clave: Clave) => string

/** Las partes que se añaden a la calle de la plaza: edificio, planta y locales, ya en el idioma. */
export function interiorDeLocal(unit: Place['unit'], traducir: Traducir, idioma: string): string[] {
  if (!unit) return []
  const partes: string[] = []
  if (unit.edificio) partes.push(`${traducir('place.unit.building')} ${unit.edificio}`)
  if (unit.planta) partes.push(traducir(`place.unit.floor.${unit.planta}`))
  if (unit.locales?.length) {
    const lista = new Intl.ListFormat(idioma, { style: 'long', type: 'conjunction' })
    const palabra = traducir(unit.locales.length > 1 ? 'place.unit.locales' : 'place.unit.local')
    partes.push(`${palabra} ${lista.format(unit.locales)}`)
  }
  if (unit.isla) {
    const isla = traducir('place.unit.island')
    partes.push(unit.isla === true ? isla : `${isla} ${unit.isla}`)
  }
  return partes
}

/** La calle y el número de la plaza, sin la localidad. `null` si la plaza no tiene dirección. */
export function calleDeLaPlaza(direccionDePlaza: string | null | undefined): string | null {
  if (!direccionDePlaza) return null
  return direccionDePlaza.endsWith(LOCALIDAD)
    ? direccionDePlaza.slice(0, -LOCALIDAD.length)
    : direccionDePlaza
}

/**
 * La calle de la plaza y el interior del local, sin la localidad: lo que espera `streetAddress` del marcado, que
 * ya lleva `addressLocality` aparte. `null` si la plaza no tiene dirección.
 */
export function calleYInterior(
  direccionDePlaza: string | null | undefined,
  unit: Place['unit'],
  traducir: Traducir,
  idioma: string,
): string | null {
  const calle = calleDeLaPlaza(direccionDePlaza)
  return calle ? [calle, ...interiorDeLocal(unit, traducir, idioma)].join(', ') : null
}

/** La dirección completa, con la localidad al final, para la ficha y el cuerpo sin JavaScript. */
export function direccionDeLocal(
  direccionDePlaza: string | null | undefined,
  unit: Place['unit'],
  traducir: Traducir,
  idioma: string,
): string | null {
  const interior = calleYInterior(direccionDePlaza, unit, traducir, idioma)
  return interior ? `${interior}${LOCALIDAD}` : null
}
