/** Lo que esta persona lleva marcado en este dispositivo: favoritos, notas, visitas y fichas abiertas. */
import { useSyncExternalStore } from 'react'
import { useFavorites } from '../favorites/useFavorites.ts'
import { interactionsStore } from '../ranking/preferences.ts'
import { useRatings } from '../ratings/useRatings.ts'
import { useVisits } from '../visits/useVisits.ts'

export function useMarks() {
  const favorites = useFavorites()
  const { ratings } = useRatings()
  const { visits } = useVisits()
  const interactions = useSyncExternalStore(
    interactionsStore.subscribe,
    interactionsStore.read,
    () => interactionsStore.empty,
  )
  return { favorites: favorites.ids, ratings, visits, interactions }
}

export type Marks = ReturnType<typeof useMarks>
