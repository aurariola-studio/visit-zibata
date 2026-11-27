/**
 * A cuánto queda cada punto de interés de la zona abierta más cercana: lo que la guía dice como "A 250 m de Plaza
 * Zielo". Se calcula al compilar y no se guarda en los datos, porque mover un contorno desde el panel dejaría la cifra
 * vieja. Es orientación y nada más: el punto no entra en la lista ni en el filtro de esa zona.
 *
 * La distancia es en línea recta desde la entrada del negocio (la `location` de su local, no el marcador, que va en el
 * centro del edificio) hasta el borde del contorno, redondeada a 10 m.
 */
import * as turf from '@turf/turf'
import { esPunto, esZona } from '../../../src/data/puntos.ts'
import type { Place, Plaza } from '../../../src/types/domain.ts'

const PASO_M = 10

export function conCercania(
  plazas: readonly Plaza[],
  locales: readonly Pick<Place, 'plazaId' | 'location'>[] = [],
): Plaza[] {
  const zonas = plazas.filter(esZona).filter((zona) => zona.active && !zona.comingSoon)
  return plazas.map((plaza) => {
    if (!esPunto(plaza)) return plaza
    // Sin local o sin su ubicación queda el punto del marcador.
    const entrada =
      locales.find((local) => local.plazaId === plaza.id)?.location ?? plaza.coordinates
    const aqui = turf.point([entrada.lng, entrada.lat])
    let cerca: Plaza['cerca']
    for (const zona of zonas) {
      // Negativa dentro del contorno: para la guía eso es cero.
      const metros = Math.max(
        0,
        turf.pointToPolygonDistance(aqui, turf.feature(zona.geometry), { units: 'meters' }),
      )
      if (!cerca || metros < cerca.metros) cerca = { plazaId: zona.id, metros }
    }
    if (!cerca) return plaza
    // Nunca "A 0 m": lo más cerca que se dice es un paso.
    const metros = Math.max(PASO_M, Math.round(cerca.metros / PASO_M) * PASO_M)
    return { ...plaza, cerca: { plazaId: cerca.plazaId, metros } }
  })
}
