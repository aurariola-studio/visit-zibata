/**
 * Favoritos locales (opcional del brief): solo en este dispositivo vía localStorage.
 * Sin cuentas ni envío a servidores. Si el almacenamiento no está disponible, funciona en memoria.
 */
import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'zibata:favoritos'
const listeners = new Set<() => void>()
let cache: ReadonlySet<string> | null = null

function read(): ReadonlySet<string> {
  if (cache) return cache
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
    cache = new Set(
      Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [],
    )
  } catch {
    cache = new Set()
  }
  return cache
}

function write(next: ReadonlySet<string>): void {
  cache = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
  } catch {
    // Almacenamiento bloqueado (modo privado): se mantiene en memoria durante la sesión.
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cache = null
      listener()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

const EMPTY: ReadonlySet<string> = new Set()

export function useFavorites() {
  const ids = useSyncExternalStore(subscribe, read, () => EMPTY)
  const toggle = useCallback((placeId: string) => {
    const next = new Set(read())
    if (next.has(placeId)) next.delete(placeId)
    else next.add(placeId)
    write(next)
  }, [])
  return { ids, toggle, has: (placeId: string) => ids.has(placeId) }
}
