import type { Place } from '../types/domain.ts'

/**
 * La dirección de un local: la calle y el número de su plaza más el lugar que ocupa dentro de ella, siempre en el
 * mismo orden. "Av. Paseo de las Pitahayas 55, Edificio A, Planta Baja, Locales 137 y 138".
 *
 * Es la segunda fila de la ficha (la primera es la zona), así que no repite la zona ni la localidad: ni el nombre
 * de la plaza, ni Zibatá, ni el código postal, ni el estado. La ficha, el cuerpo que se sirve sin JavaScript y el
 * marcado de Google leen esto y nada más, para que no puedan contradecirse. La calle y el número no se guardan por
 * local: son los de la plaza (`PlazaSchema.address`, que lleva solo eso).
 */

/** Solo las claves que usa este módulo, para que lo acepten a la vez la interfaz (`t`) y el build (su traductor). */
type Clave =
  | `place.unit.floor.${NonNullable<NonNullable<Place['unit']>['planta']>}`
  | 'place.unit.building'
  | 'place.unit.local'
  | 'place.unit.locales'
  | 'place.unit.island'
type Traducir = (clave: Clave) => string

/** Las partes que se añaden a la calle de la plaza: edificio, planta, locales e isla, ya en el idioma. */
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

/** La dirección completa del local. `null` si su plaza no tiene dirección. */
export function direccionDeLocal(
  direccionDePlaza: string | null | undefined,
  unit: Place['unit'],
  traducir: Traducir,
  idioma: string,
): string | null {
  if (!direccionDePlaza) return null
  return [direccionDePlaza, ...interiorDeLocal(unit, traducir, idioma)].join(', ')
}
