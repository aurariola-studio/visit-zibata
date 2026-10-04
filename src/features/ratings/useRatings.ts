/**
 * Calificación en estrellas que da esta persona a un lugar, de media en media (0,5 a 5), guardada solo
 * en este dispositivo (localStorage), igual que los favoritos. Sin cuentas ni servidor.
 *
 * Las notas enteras de antes siguen siendo válidas: la escala nueva las incluye.
 *
 * Cuando el proyecto escale a cuentas, lo que hay aquí es lo que se sube una vez (ver
 * `localProfileSnapshot` en features/favorites/socialStats.ts) para no perder lo ya marcado, y la media
 * de toda la comunidad llega por la fuente de señales sociales.
 */
import { useCallback, useSyncExternalStore } from 'react'
import { createLocalStore } from '../../lib/localStore.ts'

export const RATING_VALUES = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const
export type RatingValue = (typeof RATING_VALUES)[number]

const isRating = (value: unknown): value is RatingValue =>
  typeof value === 'number' && RATING_VALUES.some((allowed) => allowed === value)

const EMPTY: ReadonlyMap<string, RatingValue> = new Map()

export const ratingsStore = createLocalStore<ReadonlyMap<string, RatingValue>>(
  'zibata:calificaciones',
  (raw) =>
    new Map(
      Object.entries((raw ?? {}) as Record<string, unknown>).filter(
        (entry): entry is [string, RatingValue] => isRating(entry[1]),
      ),
    ),
  (value) => Object.fromEntries(value),
  EMPTY,
)

export function useRatings() {
  const ratings = useSyncExternalStore(
    ratingsStore.subscribe,
    ratingsStore.read,
    () => ratingsStore.empty,
  )
  /** Volver a pulsar la misma nota la quita: se puede deshacer sin borrar nada más. */
  const rate = useCallback((placeId: string, value: RatingValue) => {
    const next = new Map(ratingsStore.read())
    if (next.get(placeId) === value) next.delete(placeId)
    else next.set(placeId, value)
    ratingsStore.write(next)
  }, [])
  return { ratings, rate, ratingOf: (placeId: string) => ratings.get(placeId) ?? null }
}
