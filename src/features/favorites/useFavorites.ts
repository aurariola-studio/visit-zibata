/**
 * Favoritos locales (opcional del brief): solo en este dispositivo vía localStorage.
 * Sin cuentas ni envío a servidores. Si el almacenamiento no está disponible, funciona en memoria.
 */
import { useCallback, useSyncExternalStore } from 'react'
import { createLocalStore } from '../../lib/localStore.ts'

const EMPTY: ReadonlySet<string> = new Set()

export const favoritesStore = createLocalStore<ReadonlySet<string>>(
  'zibata:favoritos',
  (raw) =>
    new Set(Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string') : []),
  (value) => [...value],
  EMPTY,
)

export function useFavorites() {
  const ids = useSyncExternalStore(
    favoritesStore.subscribe,
    favoritesStore.read,
    () => favoritesStore.empty,
  )
  const toggle = useCallback((placeId: string) => {
    const next = new Set(favoritesStore.read())
    if (next.has(placeId)) next.delete(placeId)
    else next.add(placeId)
    favoritesStore.write(next)
  }, [])
  return { ids, toggle, has: (placeId: string) => ids.has(placeId) }
}
