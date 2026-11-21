/**
 * Partir un local en resumen y detalle (el build) y volver a juntarlos (el navegador).
 *
 * El reparto de campos vive en `placeFields.ts`. Esto solo lo aplica: `projectSummary` y `projectDetail`
 * los usa el plugin de `vite.config.ts` para generar los dos paquetes, y `joinPlaces` los une por `id` al
 * cargarlos. Sin imports de la aplicación y solo sintaxis borrable, porque `vite.config.ts` lo carga con Node.
 */
import type { Place, PlaceDetailData, PlaceSummary } from '../types/domain.ts'
import {
  PLACE_DETAIL_KEYS,
  PLACE_SUMMARY_KEYS,
  VERIFICATION_DETAIL_KEYS,
  VERIFICATION_SUMMARY_KEYS,
} from './placeFields.ts'

const pick = (source: object, keys: readonly string[]): Record<string, unknown> =>
  Object.fromEntries(keys.filter((key) => key in source).map((key) => [key, source[key as never]]))

export function projectSummary(place: Place): PlaceSummary {
  const summary = pick(place, PLACE_SUMMARY_KEYS)
  if (place.verification) {
    summary.verification = pick(place.verification, VERIFICATION_SUMMARY_KEYS)
  }
  return summary as PlaceSummary
}

export function projectDetail(place: Place): PlaceDetailData {
  const detail = pick(place, ['id', ...PLACE_DETAIL_KEYS])
  if (place.verification) {
    detail.verification = pick(place.verification, VERIFICATION_DETAIL_KEYS)
  }
  return detail as PlaceDetailData
}

/** Lo que tiene un local sin detalle: nada que enseñar, pero un local completo para el resto de la guía. */
const NO_DETAIL: Omit<PlaceDetailData, 'id' | 'verification'> = {
  description: null,
  links: {},
  phone: null,
  googleMapsUri: null,
  googlePlaceId: null,
}

/**
 * Junta un resumen con su detalle. El estado de verificación sale siempre del resumen: es lo que decide si el
 * local se publica, y no se pierde aunque el detalle falte o venga incompleto. Las fuentes no viajan: van
 * vacías, como las dejaba el build antes de partir el paquete.
 */
export function mergePlace(summary: PlaceSummary, detail?: PlaceDetailData): Place {
  const { verification, ...rest } = summary
  const { id: _id, verification: detailVerification, ...extra } = detail ?? { id: '', ...NO_DETAIL }
  return {
    ...rest,
    ...extra,
    ...(verification && {
      verification: {
        ...verification,
        ...detailVerification,
        sources: [],
      } as Place['verification'],
    }),
  } as Place
}

/**
 * Une las dos listas por `id`. Un detalle sin resumen se descarta y un resumen sin detalle se carga vacío; las
 * dos cosas se anotan para el aviso en consola, como el resto de la carga de datos.
 */
export function joinPlaces(
  summaries: readonly PlaceSummary[],
  details: readonly PlaceDetailData[],
): { places: Place[]; notes: string[] } {
  const notes: string[] = []
  const detailById = new Map(details.map((detail) => [detail.id, detail]))
  const summaryIds = new Set(summaries.map((summary) => summary.id))
  for (const detail of details) {
    if (!summaryIds.has(detail.id)) notes.push(`detalle [${detail.id}] omitido: no tiene resumen`)
  }
  const places = summaries.map((summary) => {
    const detail = detailById.get(summary.id)
    if (!detail)
      notes.push(`local [${summary.id}]: sin detalle, se carga sin descripción ni enlaces`)
    return mergePlace(summary, detail)
  })
  return { places, notes }
}
