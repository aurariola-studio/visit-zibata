/**
 * Los edificios sueltos (`sueltos` de `data/geographic/volumenes-propios.json`): los que el mapa dibuja sin que
 * sean una zona. Funciones puras sobre polígonos, como `ajustes.ts`: `build-map.ts` las llama antes de
 * emitirlos y `data:validate` llama a las mismas, así que la regla no vive en dos sitios.
 *
 * Dos guardas, y las dos fallan el build en vez de avisar:
 *
 *  - **Una huella abierta lo cubre.** Es la regla "se retira cuando entre en Overture", puesta en código: si el
 *    edificio ya está en los datos abiertos, dibujarlo otra vez lo duplicaría. Salta al refrescar el mapa
 *    (`map:fetch`), que es justo cuando hay que enterarse.
 *  - **Su centro cae dentro del contorno de una zona.** Si el edificio pasa a ser una zona, se mueve: no se dibuja
 *    dos veces. Y mientras tanto, un volumen de zona lleva sus piezas en `plazas`, no aquí.
 */
import * as turf from '@turf/turf'
import type { Feature, LineString, MultiLineString, MultiPolygon, Polygon } from 'geojson'
import type { Suelto, VolumenesPropiosFile } from '../../../src/data/volumenes-propios.ts'

/** Qué parte del edificio suelto tiene que cubrir una huella abierta para darlo por duplicado. */
export const UMBRAL_DE_DUPLICADO = 0.3

export interface Contexto {
  /** Las huellas abiertas (Overture) del crudo. Sin ellas solo se comprueba lo que no las necesita. */
  huellas?: readonly Feature<Polygon | MultiPolygon, { id?: string }>[]
  /** El contorno de cada zona. */
  zonas: readonly { id: string; shape: Feature<Polygon | MultiPolygon> }[]
}

const cerrado = (anillo: Suelto['anillo']): boolean => {
  const [a, b] = [anillo[0], anillo[anillo.length - 1]]
  return Boolean(a && b && a[0] === b[0] && a[1] === b[1])
}

/** Los motivos por los que estos edificios no se pueden dibujar; vacío si todo está bien. */
export function problemasDeSueltos(sueltos: readonly Suelto[], contexto: Contexto): string[] {
  const problemas: string[] = []
  const vistos = new Set<string>()
  for (const suelto of sueltos) {
    const nombre = `"${suelto.id}"`
    if (vistos.has(suelto.id)) problemas.push(`${nombre}: el identificador está repetido`)
    vistos.add(suelto.id)
    if (!cerrado(suelto.anillo)) {
      problemas.push(
        `${nombre}: el anillo no está cerrado (la última posición debe repetir la primera)`,
      )
      continue
    }
    const poligono = turf.polygon([suelto.anillo])
    const area = turf.area(poligono)
    if (area < 12) {
      problemas.push(
        `${nombre}: el contorno mide ${Math.round(area)} m², demasiado pequeño para ser un edificio`,
      )
      continue
    }
    const centro = turf.centroid(poligono)
    const zona = contexto.zonas.find(({ shape }) => turf.booleanPointInPolygon(centro, shape))
    if (zona) {
      problemas.push(
        `${nombre}: su centro cae dentro de la zona "${zona.id}". Un edificio de una zona va en \`plazas\`, no en \`sueltos\``,
      )
    }
    for (const huella of contexto.huellas ?? []) {
      const [w1, s1, e1, n1] = turf.bbox(poligono)
      const [w2, s2, e2, n2] = turf.bbox(huella)
      if (e1 < w2 || e2 < w1 || n1 < s2 || n2 < s1) continue
      for (const parte of partes(huella)) {
        const cruce = turf.intersect(turf.featureCollection([poligono, parte]))
        if (cruce && turf.area(cruce) / area > UMBRAL_DE_DUPLICADO) {
          problemas.push(
            `${nombre}: los datos abiertos ya traen su huella (${huella.properties?.id ?? 'sin id'}). Retira el edificio de \`sueltos\` en volumenes-propios.json`,
          )
          break
        }
      }
    }
  }
  return problemas
}

function partes(huella: Feature<Polygon | MultiPolygon>): Feature<Polygon>[] {
  return huella.geometry.type === 'Polygon'
    ? [turf.feature(huella.geometry)]
    : huella.geometry.coordinates.map((coordinates) => turf.polygon(coordinates))
}

/**
 * Las calles y canchas a mano que OpenStreetMap ya trae: hay que retirarlas o se dibujan dos veces. Es un aviso y no
 * un fallo, porque un trazo parecido no estorba como un edificio duplicado.
 */
export function trazosRepetidos(
  propios: Pick<VolumenesPropiosFile, 'vias' | 'canchas'>,
  calles: readonly Feature<LineString | MultiLineString>[],
  canchas: readonly Feature<Polygon | MultiPolygon>[],
): string[] {
  const lineas = calles.flatMap((calle) => turf.flatten(calle).features)
  const avisos: string[] = []
  for (const via of propios.vias ?? []) {
    const propia = turf.lineString(via.linea)
    const largo = turf.length(propia, { units: 'meters' })
    const puntos = Array.from({ length: Math.floor(largo / 5) + 1 }, (_, i) =>
      turf.along(propia, i * 5, { units: 'meters' }),
    )
    const cubiertos = puntos.filter((punto) =>
      lineas.some((linea) => turf.pointToLineDistance(punto, linea, { units: 'meters' }) < 8),
    )
    if (cubiertos.length / puntos.length > 0.6) {
      avisos.push(
        `"${via.id}": OpenStreetMap ya trae esa calle. Retírala de volumenes-propios.json`,
      )
    }
  }
  for (const cancha of propios.canchas ?? []) {
    const propia = turf.polygon([cancha.anillo])
    const repetida = canchas.flatMap(partes).some((otra) => {
      const cruce = turf.intersect(turf.featureCollection([propia, otra]))
      return cruce !== null && turf.area(cruce) / turf.area(propia) > UMBRAL_DE_DUPLICADO
    })
    if (repetida) {
      avisos.push(
        `"${cancha.id}": OpenStreetMap ya trae esa cancha. Retírala de volumenes-propios.json`,
      )
    }
  }
  return avisos
}

/**
 * A cuántos metros queda un lugar del centro de superficie del edificio que tiene debajo, o `null` sin edificio. Un
 * punto de interés va en ese centro.
 */
export function metrosAlCentro(
  lugar: [number, number],
  edificios: readonly Feature<Polygon | MultiPolygon>[],
): number | null {
  // shortcut: en un edificio en L o en U el centro puede caer fuera; medir contra un punto interior si llega uno así.
  const debajo = edificios.find((edificio) => turf.booleanPointInPolygon(lugar, edificio))
  return debajo ? turf.distance(lugar, turf.centerOfMass(debajo), { units: 'meters' }) : null
}

/** El polígono de un edificio suelto, con el sentido de los anillos que esperan las teselas. */
export function poligonoDe(suelto: Suelto): Polygon {
  return turf.rewind(turf.polygon([suelto.anillo]).geometry) as Polygon
}
