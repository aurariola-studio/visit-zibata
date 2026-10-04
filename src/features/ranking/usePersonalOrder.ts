import { useMemo } from 'react'
import type { Catalog, Place } from '../../types/domain.ts'
import { placeSocialStats } from '../favorites/socialStats.ts'
import { preferences } from './preferences.ts'
import { rankPlaces } from './rankPlaces.ts'

/**
 * Ordena una lista según los gustos de la persona. Las señales se leen una vez por contexto
 * (`contextKey`: plaza + filtros): marcar un favorito o calificar dentro de la lista no la reordena
 * bajo el dedo; el nuevo orden aparece la próxima vez que se abre.
 */
export function usePersonalOrder(
  places: readonly Place[],
  catalog: Catalog,
  contextKey: string,
): readonly Place[] {
  // biome-ignore lint/correctness/useExhaustiveDependencies: la foto de señales se renueva solo al cambiar de lista, a propósito.
  const signals = useMemo(() => preferences.read(), [contextKey])
  return useMemo(
    () =>
      rankPlaces(places, signals, {
        now: Date.now(),
        placeById: (id) => catalog.placeById.get(id),
        categoryOfGiro: (giro) => catalog.categoryOfGiro.get(giro)?.id,
        community: placeSocialStats,
      }),
    [places, signals, catalog],
  )
}
