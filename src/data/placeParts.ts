/**
 * Partir un local en resumen y detalle, en el build y en las pruebas.
 *
 * El reparto de campos vive en `placeFields.ts`. Esto solo lo aplica: el plugin de `vite.config.ts` genera con
 * `projectSummary` y `projectDetail` los dos paquetes que baja el navegador. Sin imports de la aplicación y solo
 * sintaxis borrable, porque `vite.config.ts` lo carga con Node.
 */
import type { Place, PlaceDetailData, PlaceSummary } from '../types/domain.ts'
import { PLACE_DETAIL_KEYS, PLACE_SUMMARY_KEYS, VERIFICATION_SUMMARY_KEYS } from './placeFields.ts'

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
  return pick(place, ['id', ...PLACE_DETAIL_KEYS]) as PlaceDetailData
}
